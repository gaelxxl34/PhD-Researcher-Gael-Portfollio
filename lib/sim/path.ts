import type { City } from './city';

/**
 * A* over the street graph. Cost per edge is length scaled by live congestion,
 * plus penalties for hazard zones, known closures, and the pointer disturbance.
 * This is the *actual* decision procedure agents use — the candidate paths
 * shown in the "decide" state are real alternative routes produced by
 * re-running the search with the previous route penalized.
 */

export interface CostOptions {
  /** multiplier applied to congestion density (0 disables congestion cost) */
  congestionK: number;
  /** flat penalty added to hazard edges */
  hazardPenalty: number;
  /** treat closed edges as impassable (informed agents only) */
  avoidClosed: boolean;
  /** world-space pointer disturbance: edges near it get costlier */
  pointer?: { x: number; y: number; r: number; k: number } | null;
  /** per-edge extra multiplier (used for k-alternative generation) */
  penalized?: Set<number> | null;
}

const defaultOpts: CostOptions = {
  congestionK: 1.6,
  hazardPenalty: 220,
  avoidClosed: false,
  pointer: null,
  penalized: null,
};

export function edgeCost(city: City, edgeId: number, opts: CostOptions): number {
  const e = city.edges[edgeId];
  if (e.a < 0) return Infinity;
  if (e.closed && opts.avoidClosed) return Infinity;
  let cost = e.len * (1 + opts.congestionK * e.congestion);
  if (e.hazard) cost += opts.hazardPenalty;
  if (opts.pointer) {
    const na = city.nodes[e.a];
    const nb = city.nodes[e.b];
    const mx = (na.x + nb.x) / 2;
    const my = (na.y + nb.y) / 2;
    const d = Math.hypot(mx - opts.pointer.x, my - opts.pointer.y);
    if (d < opts.pointer.r) cost += opts.pointer.k * (1 - d / opts.pointer.r);
  }
  if (opts.penalized && opts.penalized.has(edgeId)) cost *= 2.4;
  // slight preference for avenues keeps the majors visibly busier
  if (e.major) cost *= 0.85;
  return cost;
}

/**
 * Binary-heap A*. Returns node ids from `start` to `goal` inclusive, or null
 * if unreachable under the given costs.
 */
export function findPath(
  city: City,
  start: number,
  goal: number,
  options?: Partial<CostOptions>
): number[] | null {
  const opts: CostOptions = { ...defaultOpts, ...options };
  const nodes = city.nodes;
  const n = nodes.length;
  const gx = nodes[goal].x;
  const gy = nodes[goal].y;

  const g = new Float64Array(n).fill(Infinity);
  const from = new Int32Array(n).fill(-1);
  const closed = new Uint8Array(n);

  // simple binary heap of [f, node]
  const heap: number[] = [];
  const hf: number[] = [];
  const push = (node: number, f: number) => {
    let i = heap.length;
    heap.push(node);
    hf.push(f);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (hf[p] <= hf[i]) break;
      [heap[p], heap[i]] = [heap[i], heap[p]];
      [hf[p], hf[i]] = [hf[i], hf[p]];
      i = p;
    }
  };
  const pop = (): number => {
    const top = heap[0];
    const lastN = heap.pop()!;
    const lastF = hf.pop()!;
    if (heap.length) {
      heap[0] = lastN;
      hf[0] = lastF;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < heap.length && hf[l] < hf[m]) m = l;
        if (r < heap.length && hf[r] < hf[m]) m = r;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i], heap[m]];
        [hf[m], hf[i]] = [hf[i], hf[m]];
        i = m;
      }
    }
    return top;
  };

  g[start] = 0;
  push(start, Math.hypot(nodes[start].x - gx, nodes[start].y - gy));

  while (heap.length) {
    const u = pop();
    if (closed[u]) continue;
    closed[u] = 1;
    if (u === goal) {
      const path: number[] = [];
      for (let v = goal; v !== -1; v = from[v]) path.push(v);
      path.reverse();
      return path;
    }
    for (const eid of nodes[u].edges) {
      const e = city.edges[eid];
      const v = e.a === u ? e.b : e.a;
      if (closed[v]) continue;
      const w = edgeCost(city, eid, opts);
      if (!isFinite(w)) continue;
      const cand = g[u] + w;
      if (cand < g[v]) {
        g[v] = cand;
        from[v] = u;
        push(v, cand + Math.hypot(nodes[v].x - gx, nodes[v].y - gy));
      }
    }
  }
  return null;
}

/** Total cost of a node path under the given options. */
export function pathCost(city: City, path: number[], options?: Partial<CostOptions>): number {
  const opts: CostOptions = { ...defaultOpts, ...options };
  let total = 0;
  for (let i = 0; i + 1 < path.length; i++) {
    const eid = edgeBetween(city, path[i], path[i + 1]);
    if (eid < 0) return Infinity;
    total += edgeCost(city, eid, opts);
  }
  return total;
}

export function edgeBetween(city: City, a: number, b: number): number {
  for (const eid of city.nodes[a].edges) {
    const e = city.edges[eid];
    if (e.a === b || e.b === b) return eid;
  }
  return -1;
}

export interface Candidate {
  path: number[];
  cost: number;
}

/**
 * Up to k genuinely distinct routes, best first, via iterative edge
 * penalization. The first entry is the optimal path; the chosen route in the
 * decide state is always the minimum-cost member of this list.
 */
export function alternativePaths(
  city: City,
  start: number,
  goal: number,
  k: number,
  options?: Partial<CostOptions>
): Candidate[] {
  const out: Candidate[] = [];
  const penalized = new Set<number>();
  for (let i = 0; i < k; i++) {
    const path = findPath(city, start, goal, { ...options, penalized });
    if (!path) break;
    // true cost without the artificial penalty
    const cost = pathCost(city, path, options);
    if (out.some((c) => samePath(c.path, path))) break;
    out.push({ path, cost });
    for (let j = 0; j + 1 < path.length; j++) penalized.add(edgeBetween(city, path[j], path[j + 1]));
  }
  out.sort((a, b) => a.cost - b.cost);
  return out;
}

function samePath(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

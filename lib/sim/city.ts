import { mulberry32, range, int, type Rng } from './rng';

/**
 * Procedural city district: a jittered street grid with some edges removed to
 * form irregular blocks, two open plazas, and a few "major" avenues. The
 * result is an undirected graph — agents live on edges and route over nodes.
 */

export interface CityNode {
  id: number;
  x: number;
  y: number;
  /** ids of incident edges */
  edges: number[];
}

export interface CityEdge {
  id: number;
  a: number;
  b: number;
  len: number;
  /** unit direction a -> b */
  ux: number;
  uy: number;
  major: boolean;
  /** static hazard zone on this segment (state 1) */
  hazard: boolean;
  /** closed by the state-4 disruption */
  closed: boolean;
  /** smoothed occupancy density, used as congestion cost + heat rendering */
  congestion: number;
  /** transient agent count, rebuilt each tick */
  occupancy: number;
}

export interface Plaza {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface City {
  width: number;
  height: number;
  nodes: CityNode[];
  edges: CityEdge[];
  plazas: Plaza[];
  /** node at the middle of the "decide" neighborhood (degree >= 3, hazard nearby) */
  focusNode: number;
  hazardEdges: number[];
}

export const WORLD_W = 1200;
export const WORLD_H = 750;

function connected(nodes: CityNode[], edges: CityEdge[], skipEdge: number): boolean {
  const n = nodes.length;
  if (n === 0) return true;
  const seen = new Uint8Array(n);
  const stack = [0];
  seen[0] = 1;
  let count = 1;
  while (stack.length) {
    const u = stack.pop()!;
    for (const eid of nodes[u].edges) {
      if (eid === skipEdge) continue;
      const e = edges[eid];
      if (e.a < 0) continue; // removed
      const v = e.a === u ? e.b : e.a;
      if (!seen[v]) {
        seen[v] = 1;
        count++;
        stack.push(v);
      }
    }
  }
  return count === n;
}

export function buildCity(seed = 20260811): City {
  const rng: Rng = mulberry32(seed);

  // 1. jittered grid lines
  const xs: number[] = [];
  const ys: number[] = [];
  for (let x = 48; x < WORLD_W - 36; x += range(rng, 72, 116)) xs.push(x);
  for (let y = 44; y < WORLD_H - 30; y += range(rng, 64, 102)) ys.push(y);

  const cols = xs.length;
  const rows = ys.length;
  const nodes: CityNode[] = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      nodes.push({
        id: j * cols + i,
        x: xs[i] + range(rng, -9, 9),
        y: ys[j] + range(rng, -8, 8),
        edges: [],
      });
    }
  }

  // 2. major avenues: one central column, one central row
  const majorCol = int(rng, Math.max(1, cols - 4)) + 2;
  const majorRow = int(rng, Math.max(1, rows - 4)) + 2;

  const edges: CityEdge[] = [];
  const addEdge = (a: number, b: number, major: boolean) => {
    const na = nodes[a];
    const nb = nodes[b];
    const len = Math.hypot(nb.x - na.x, nb.y - na.y);
    const e: CityEdge = {
      id: edges.length,
      a,
      b,
      len,
      ux: (nb.x - na.x) / len,
      uy: (nb.y - na.y) / len,
      major,
      hazard: false,
      closed: false,
      congestion: 0,
      occupancy: 0,
    };
    edges.push(e);
    na.edges.push(e.id);
    nb.edges.push(e.id);
  };

  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const id = j * cols + i;
      if (i + 1 < cols) addEdge(id, id + 1, j === majorRow);
      if (j + 1 < rows) addEdge(id, id + cols, i === majorCol);
    }
  }

  // 3. carve two plazas: remove edges strictly inside each rect (keep graph connected)
  const plazas: Plaza[] = [];
  const plazaSpots = [
    { i: Math.max(1, ((cols * 0.22) | 0)), j: Math.max(1, ((rows * 0.55) | 0)) },
    { i: Math.min(cols - 3, ((cols * 0.68) | 0)), j: Math.max(1, ((rows * 0.2) | 0)) },
  ];
  for (const spot of plazaSpots) {
    const x0 = xs[spot.i] - 14;
    const y0 = ys[spot.j] - 12;
    const x1 = xs[Math.min(cols - 1, spot.i + 2)] + 14;
    const y1 = ys[Math.min(rows - 1, spot.j + 2)] + 12;
    plazas.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
    for (const e of edges) {
      if (e.a < 0 || e.major) continue;
      const ax = nodes[e.a].x;
      const ay = nodes[e.a].y;
      const bx = nodes[e.b].x;
      const by = nodes[e.b].y;
      const mx = (ax + bx) / 2;
      const my = (ay + by) / 2;
      // only interior edges (midpoint well inside, both ends inside)
      const inside = (x: number, y: number) => x > x0 && x < x1 && y > y0 && y < y1;
      if (inside(mx, my) && inside(ax, ay) && inside(bx, by)) {
        if (connected(nodes, edges, e.id)) removeEdge(e);
      }
    }
  }

  // 4. thin the grid: remove ~18% of minor edges without disconnecting
  const candidates = edges.filter((e) => e.a >= 0 && !e.major).map((e) => e.id);
  // Fisher-Yates with the seeded rng
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = int(rng, i + 1);
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  let removed = 0;
  const removeTarget = (candidates.length * 0.18) | 0;
  for (const eid of candidates) {
    if (removed >= removeTarget) break;
    const e = edges[eid];
    if (e.a < 0) continue;
    // keep intersections from degrading to degree < 2 (dead-end stubs are fine sparsely)
    if (nodes[e.a].edges.length <= 2 || nodes[e.b].edges.length <= 2) continue;
    if (connected(nodes, edges, e.id)) {
      removeEdge(e);
      removed++;
    }
  }

  function removeEdge(e: CityEdge) {
    nodes[e.a].edges.splice(nodes[e.a].edges.indexOf(e.id), 1);
    nodes[e.b].edges.splice(nodes[e.b].edges.indexOf(e.id), 1);
    e.a = -1;
    e.b = -1;
  }

  // 5. hazards: 3 minor edges spread across the map, one near the centre so the
  //    "decide" neighborhood has something worth deciding about
  const live = edges.filter((e) => e.a >= 0 && !e.major);
  const cx = WORLD_W / 2;
  const cy = WORLD_H / 2;
  const midDist = (e: CityEdge) => {
    const mx = (nodes[e.a].x + nodes[e.b].x) / 2;
    const my = (nodes[e.a].y + nodes[e.b].y) / 2;
    return Math.hypot(mx - cx, my - cy);
  };
  const sorted = [...live].sort((a, b) => midDist(a) - midDist(b));
  const hazardEdges: number[] = [];
  const pickHazard = (e: CityEdge | undefined) => {
    if (e && !e.hazard) {
      e.hazard = true;
      hazardEdges.push(e.id);
    }
  };
  pickHazard(sorted[int(rng, Math.min(8, sorted.length))]); // central
  pickHazard(sorted[sorted.length - 1 - int(rng, 10)]); // far out
  pickHazard(sorted[(sorted.length / 2) | 0]); // mid-ring

  // 6. focus node for the decide state: highest-degree node near the central hazard
  const hz = edges[hazardEdges[0]];
  const hx = (nodes[hz.a].x + nodes[hz.b].x) / 2;
  const hy = (nodes[hz.a].y + nodes[hz.b].y) / 2;
  let focusNode = 0;
  let bestScore = -Infinity;
  for (const n of nodes) {
    if (n.edges.length < 3) continue;
    // the decide-state camera zooms here — keep it away from empty plazas
    let nearPlaza = false;
    for (const pz of plazas) {
      if (
        n.x > pz.x - 90 &&
        n.x < pz.x + pz.w + 90 &&
        n.y > pz.y - 90 &&
        n.y < pz.y + pz.h + 90
      ) {
        nearPlaza = true;
        break;
      }
    }
    if (nearPlaza) continue;
    const d = Math.hypot(n.x - hx, n.y - hy);
    const score = n.edges.length * 40 - d;
    if (d > 40 && d < 300 && score > bestScore) {
      bestScore = score;
      focusNode = n.id;
    }
  }

  return { width: WORLD_W, height: WORLD_H, nodes, edges, plazas, focusNode, hazardEdges };
}

/** Live (non-removed) edges only. */
export function liveEdges(city: City): CityEdge[] {
  return city.edges.filter((e) => e.a >= 0);
}

export function edgeMid(city: City, e: CityEdge): { x: number; y: number } {
  return {
    x: (city.nodes[e.a].x + city.nodes[e.b].x) / 2,
    y: (city.nodes[e.a].y + city.nodes[e.b].y) / 2,
  };
}

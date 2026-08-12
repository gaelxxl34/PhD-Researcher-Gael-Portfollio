import { buildCity, edgeMid, liveEdges, type City, type CityEdge } from './city';
import { SpatialHash } from './hash';
import { alternativePaths, edgeBetween, findPath, type Candidate } from './path';
import { mulberry32, range, int, type Rng } from './rng';

/**
 * The multi-agent simulation behind the "watch it work" section.
 *
 * - fixed-timestep tick (TICK_HZ), decoupled from rendering
 * - agents route over the street graph with A* (congestion + hazard costs)
 * - car-following on edges gives real congestion, not a shader effect
 * - state weights (perceive/decide/act/cooperate) modulate population,
 *   speed, and which subsystems run — the sim itself never restarts
 *
 * No DOM access anywhere in this module: it runs identically under Node
 * (see selftest.ts) and in the browser.
 */

export const TICK_HZ = 30;
export const TICK_DT = 1 / TICK_HZ;
/** display conversion: world units -> meters (city block ~ 55 m) */
export const METERS_PER_UNIT = 0.5;

export const TRAIL_N = 6;

export interface StateWeights {
  perceive: number;
  decide: number;
  act: number;
  cooperate: number;
}

export interface Agent {
  id: number;
  alive: boolean;
  /** fading out before being recycled */
  dying: boolean;
  x: number;
  y: number;
  px: number;
  py: number;
  /** node we came from / node we head to */
  from: number;
  to: number;
  edge: number;
  /** distance travelled along the current edge */
  s: number;
  laneOff: number;
  /** resting lane offset the agent returns to after a disturbance */
  laneBase: number;
  baseSpeed: number;
  speed: number;
  path: number[];
  /** index in `path` of the node we're heading to */
  pathI: number;
  goal: number;
  alpha: number;
  senseFlash: number;
  lastNear: number;
  hazardNear: boolean;
  nodeFlashed: boolean;
  knowsClosure: boolean;
  informed: boolean;
  informedAt: number;
  /** id of the last broadcast wave this agent relayed */
  pulseSeq: number;
  nextRepath: number;
  inDecision: boolean;
  trail: Float32Array;
  trailHead: number;
  trailLen: number;
}

export interface Decision {
  agent: number;
  node: number;
  cands: Candidate[];
  /** index into cands of the committed route, -1 while deliberating */
  chosen: number;
  /** seconds since the decision appeared */
  t: number;
  done: boolean;
}

export interface Transmission {
  from: number;
  to: number;
  t: number;
}

export interface Metrics {
  agents: number;
  avgSpeedMs: number;
  ticksPerSec: number;
  reroutes: number;
  congestion: number;
  congestionTrend: 'rising' | 'falling' | 'steady';
  eco: boolean;
}

const SENSE_R = 42;
const COMM_R = 78;
const POINTER_R = 88;
const SPAWN_FRACTION = 0.025;

export class Simulation {
  readonly city: City;
  readonly agents: Agent[] = [];
  readonly decisions: Decision[] = [];
  readonly transmissions: Transmission[] = [];
  readonly hash: SpatialHash;

  weights: StateWeights = { perceive: 1, decide: 0, act: 0, cooperate: 0 };
  pointer = { x: 0, y: 0, active: false };
  /** closed edge id, or -1 */
  closure = -1;
  closureAt = 0;
  reroutes = 0;
  tickCount = 0;
  time = 0;
  eco = false;

  private maxAgents: number;
  private rng: Rng;
  private free: number[] = [];
  private aliveCount = 0;
  private acc = 0;
  private lastNow = -1;
  private tickTimes: number[] = [];
  private edgeDir: number[][][] = [];
  private touchedEdges: number[] = [];
  private hazardMids: { x: number; y: number; r: number }[] = [];
  private congSamples: number[] = [];
  private lastCongSample = 0;
  private decisionCooldown = 0;
  private avgSpeed = 0;
  private pulseSeq = 0;
  private lastPulse = 0;

  constructor(opts?: { seed?: number; maxAgents?: number }) {
    const seed = opts?.seed ?? 20260811;
    this.maxAgents = opts?.maxAgents ?? 1200;
    this.rng = mulberry32(seed ^ 0x9e3779b9);
    this.city = buildCity(seed);
    this.hash = new SpatialHash(this.city.width, this.city.height, 48);
    for (let i = 0; i < this.city.edges.length; i++) this.edgeDir.push([[], []]);
    for (const eid of this.city.hazardEdges) {
      const e = this.city.edges[eid];
      const m = edgeMid(this.city, e);
      this.hazardMids.push({ x: m.x, y: m.y, r: e.len / 2 + 16 });
    }
  }

  get population(): number {
    return this.aliveCount;
  }

  setMaxAgents(n: number, eco = false): void {
    this.maxAgents = n;
    this.eco = eco;
  }

  getMaxAgents(): number {
    return this.maxAgents;
  }

  setWeights(w: StateWeights): void {
    this.weights = w;
  }

  setPointer(x: number, y: number, active: boolean): void {
    this.pointer.x = x;
    this.pointer.y = y;
    this.pointer.active = active;
  }

  /**
   * Advance the simulation to `nowMs` using fixed steps.
   * Returns the interpolation alpha in [0,1] for rendering between the
   * previous and current tick positions.
   */
  update(nowMs: number): number {
    if (this.lastNow < 0) this.lastNow = nowMs;
    this.acc += Math.min(0.15, (nowMs - this.lastNow) / 1000);
    this.lastNow = nowMs;
    while (this.acc >= TICK_DT) {
      this.acc -= TICK_DT;
      this.tick(TICK_DT);
      this.tickTimes.push(nowMs);
    }
    while (this.tickTimes.length && this.tickTimes[0] < nowMs - 1000) this.tickTimes.shift();
    return this.acc / TICK_DT;
  }

  /** One fixed step. Public so the headless selftest can drive it directly. */
  tick(dt: number): void {
    this.tickCount++;
    this.time += dt;
    const w = this.weights;
    const city = this.city;

    // -- population control ------------------------------------------------
    const popFactor =
      0.4 * w.perceive + 0.5 * w.decide + 1.0 * w.act + 1.0 * w.cooperate;
    const target = Math.round(this.maxAgents * Math.min(1, Math.max(0.05, popFactor)));
    const burst = Math.max(1, (this.maxAgents * SPAWN_FRACTION) | 0);
    if (this.aliveCount < target) {
      for (let i = 0; i < burst && this.aliveCount < target; i++) this.spawn();
    } else if (this.aliveCount > target + burst) {
      let toKill = Math.min(burst, this.aliveCount - target);
      for (let i = 0; i < this.agents.length && toKill > 0; i++) {
        const a = this.agents[i];
        if (a.alive && !a.dying && !a.inDecision) {
          a.dying = true;
          toKill--;
        }
      }
    }

    // -- disruption lifecycle ---------------------------------------------
    if (w.cooperate > 0.5 && this.closure < 0) this.activateClosure();
    else if (w.cooperate < 0.15 && this.closure >= 0) this.clearClosure();

    // -- rebuild spatial hash + per-edge direction lists -------------------
    this.hash.clear();
    for (const eid of this.touchedEdges) {
      this.edgeDir[eid][0].length = 0;
      this.edgeDir[eid][1].length = 0;
      city.edges[eid].occupancy = 0;
    }
    this.touchedEdges.length = 0;
    for (const a of this.agents) {
      if (!a.alive) continue;
      this.hash.insert(a.id, a.x, a.y);
      const dir = a.to === city.edges[a.edge].b ? 0 : 1;
      const list = this.edgeDir[a.edge][dir];
      if (list.length === 0 && this.edgeDir[a.edge][1 - dir].length === 0)
        this.touchedEdges.push(a.edge);
      list.push(a.id);
      city.edges[a.edge].occupancy++;
    }
    for (const eid of this.touchedEdges) {
      this.edgeDir[eid][0].sort((i, j) => this.agents[i].s - this.agents[j].s);
      this.edgeDir[eid][1].sort((i, j) => this.agents[i].s - this.agents[j].s);
    }
    // congestion EMA on every live edge (decays back to 0 when empty).
    // density 1.0 ≈ an agent every 7 units over the edge — visibly queued.
    for (const e of city.edges) {
      if (e.a < 0) continue;
      const density = (e.occupancy * 7) / Math.max(7, e.len);
      e.congestion += (density - e.congestion) * 0.06;
    }

    // -- global speed factor from state blend ------------------------------
    const speedFactor =
      0.45 * w.perceive + 0.6 * w.decide + 1.0 * w.act + 0.95 * w.cooperate;

    // -- decide-state choreography ----------------------------------------
    this.stepDecisions(dt, w.decide);

    // -- move agents -------------------------------------------------------
    let speedSum = 0;
    for (const a of this.agents) {
      if (!a.alive) continue;
      a.px = a.x;
      a.py = a.y;

      // fade in/out
      if (a.dying) {
        a.alpha -= dt * 2.2;
        if (a.alpha <= 0) {
          this.despawn(a);
          continue;
        }
      } else if (a.alpha < 1) {
        a.alpha = Math.min(1, a.alpha + dt * 1.8);
      }

      const e = city.edges[a.edge];
      let desired = a.baseSpeed * speedFactor;
      if (e.hazard) desired *= 0.55;
      if (e.closed) desired *= 0.4;

      // pointer disturbance: slow + drift away + notice it
      if (this.pointer.active) {
        const pdx = a.x - this.pointer.x;
        const pdy = a.y - this.pointer.y;
        const pd2 = pdx * pdx + pdy * pdy;
        if (pd2 < POINTER_R * POINTER_R) {
          const pd = Math.sqrt(pd2) || 1;
          const f = 1 - pd / POINTER_R;
          desired *= 1 - 0.55 * f;
          a.laneOff = clamp(a.laneOff + (pdx * e.uy - pdy * e.ux > 0 ? 1 : -1) * f * 14 * dt, -6, 6);
          if (a.senseFlash < 0.35) a.senseFlash = 0.6 * f + 0.2;
        } else {
          a.laneOff += (a.laneBase - a.laneOff) * 0.04;
        }
      } else if (Math.abs(a.laneOff - a.laneBase) > 0.05) {
        a.laneOff += (a.laneBase - a.laneOff) * 0.04;
      }

      // car following: nearest leader on the same edge & direction
      const dir = a.to === e.b ? 0 : 1;
      const lane = this.edgeDir[a.edge][dir];
      if (lane.length > 1) {
        let leader: Agent | null = null;
        // lists are sorted by s ascending
        for (let i = 0; i < lane.length; i++) {
          if (lane[i] === a.id) {
            if (i + 1 < lane.length) leader = this.agents[lane[i + 1]];
            break;
          }
        }
        if (leader) {
          const gap = leader.s - a.s;
          const headway = 9;
          if (gap < headway) desired = Math.min(desired, Math.max(0, (gap - 3.2) * 3.2));
        }
      }

      a.speed += (desired - a.speed) * Math.min(1, 4.5 * dt);
      a.s += a.speed * dt;
      speedSum += a.speed;

      // arrive at node
      if (a.s >= e.len) {
        this.advance(a);
      }
      this.place(a);

      // trail: record every third tick (~0.6 s of motion history)
      if ((this.tickCount + a.id) % 3 === 0) {
        a.trailHead = (a.trailHead + 1) % TRAIL_N;
        a.trail[a.trailHead * 2] = a.x;
        a.trail[a.trailHead * 2 + 1] = a.y;
        if (a.trailLen < TRAIL_N) a.trailLen++;
      }

      a.senseFlash = Math.max(0, a.senseFlash - dt * 1.8);
    }
    this.avgSpeed = this.aliveCount ? speedSum / this.aliveCount : 0;

    // -- perception (staggered: each agent every 6 ticks) ------------------
    for (const a of this.agents) {
      if (!a.alive || (this.tickCount + a.id) % 6 !== 0) continue;
      this.perceive(a);
    }

    // -- communication wave ------------------------------------------------
    if (this.closure >= 0 && w.cooperate > 0.2) this.stepCommWave();
    for (let i = this.transmissions.length - 1; i >= 0; i--) {
      const tr = this.transmissions[i];
      tr.t += dt * 2.6;
      if (tr.t >= 1) this.transmissions.splice(i, 1);
    }

    // -- congestion trend sampling ----------------------------------------
    if (this.time - this.lastCongSample > 0.5) {
      this.lastCongSample = this.time;
      this.congSamples.push(this.congestionAvg());
      if (this.congSamples.length > 10) this.congSamples.shift();
    }
  }

  metrics(): Metrics {
    const s = this.congSamples;
    let trend: Metrics['congestionTrend'] = 'steady';
    if (s.length >= 6) {
      const a = (s[s.length - 6] + s[s.length - 5] + s[s.length - 4]) / 3;
      const b = (s[s.length - 3] + s[s.length - 2] + s[s.length - 1]) / 3;
      if (b < a - 0.004) trend = 'falling';
      else if (b > a + 0.004) trend = 'rising';
    }
    return {
      agents: this.aliveCount,
      avgSpeedMs: this.avgSpeed * METERS_PER_UNIT,
      ticksPerSec: this.tickTimes.length,
      reroutes: this.reroutes,
      congestion: this.congestionAvg(),
      congestionTrend: trend,
      eco: this.eco,
    };
  }

  congestionAvg(): number {
    let sum = 0;
    let n = 0;
    for (const e of this.city.edges) {
      if (e.a < 0) continue;
      sum += e.congestion;
      n++;
    }
    return n ? sum / n : 0;
  }

  /** deterministic digest of agent positions — used by the selftest */
  checksum(): number {
    let h = 0;
    for (const a of this.agents) {
      if (!a.alive) continue;
      h = (h + a.x * 31 + a.y * 17 + a.id) % 1e9;
    }
    return h;
  }

  // ---------------------------------------------------------------------
  // internals
  // ---------------------------------------------------------------------

  private spawn(): void {
    const city = this.city;
    let idx: number;
    if (this.free.length) {
      idx = this.free.pop()!;
    } else {
      idx = this.agents.length;
      this.agents.push(newAgent(idx));
    }
    const a = this.agents[idx];
    // random node with at least one live edge
    let node = -1;
    for (let tries = 0; tries < 20; tries++) {
      const n = int(this.rng, city.nodes.length);
      if (city.nodes[n].edges.length > 0) {
        node = n;
        break;
      }
    }
    if (node < 0) return;
    const goal = this.pickGoal(node);
    const path = findPath(city, node, goal, { avoidClosed: false });
    if (!path || path.length < 2) return;

    a.alive = true;
    a.dying = false;
    a.path = path;
    a.pathI = 1;
    a.goal = goal;
    a.from = path[0];
    a.to = path[1];
    a.edge = edgeBetween(city, a.from, a.to);
    a.s = range(this.rng, 0, city.edges[a.edge].len * 0.8);
    a.baseSpeed = range(this.rng, 21, 34);
    a.speed = a.baseSpeed * 0.4;
    a.laneOff = range(this.rng, 1.4, 3.4);
    a.laneBase = a.laneOff;
    a.alpha = 0;
    a.senseFlash = 0;
    a.lastNear = 0;
    a.hazardNear = false;
    a.nodeFlashed = false;
    a.knowsClosure = false;
    a.informed = false;
    a.informedAt = 0;
    a.pulseSeq = 0;
    a.inDecision = false;
    a.nextRepath = this.tickCount + 90 + int(this.rng, 120);
    a.trailLen = 0;
    a.trailHead = 0;
    this.place(a);
    a.px = a.x;
    a.py = a.y;
    this.aliveCount++;
  }

  private despawn(a: Agent): void {
    a.alive = false;
    a.dying = false;
    a.inDecision = false;
    this.free.push(a.id);
    this.aliveCount--;
  }

  private pickGoal(fromNode: number): number {
    const city = this.city;
    const f = city.nodes[fromNode];
    for (let tries = 0; tries < 24; tries++) {
      const n = int(this.rng, city.nodes.length);
      const cand = city.nodes[n];
      if (cand.edges.length === 0 || n === fromNode) continue;
      if (Math.hypot(cand.x - f.x, cand.y - f.y) > 260) return n;
    }
    return fromNode;
  }

  private place(a: Agent): void {
    const e = this.city.edges[a.edge];
    const na = this.city.nodes[a.from];
    const s = Math.min(a.s, e.len);
    const sign = a.to === e.b ? 1 : -1;
    const dx = e.ux * sign;
    const dy = e.uy * sign;
    // right-hand side of travel direction
    a.x = na.x + dx * s + -dy * a.laneOff;
    a.y = na.y + dy * s + dx * a.laneOff;
  }

  private advance(a: Agent): void {
    const city = this.city;
    a.s = 0;
    a.nodeFlashed = false;
    if (a.pathI + 1 < a.path.length) {
      a.pathI++;
      a.from = a.path[a.pathI - 1];
      a.to = a.path[a.pathI];
      const eid = edgeBetween(city, a.from, a.to);
      if (eid < 0) {
        // path got invalidated (e.g. debug edits); recover with a fresh route
        this.repath(a);
        return;
      }
      a.edge = eid;
      // scheduled congestion-aware repath at junctions
      if (this.tickCount >= a.nextRepath && a.path.length - a.pathI > 2 && !a.inDecision) {
        a.nextRepath = this.tickCount + 110 + int(this.rng, 140);
        this.repath(a, true);
      }
      return;
    }
    // reached goal: pick a new one
    const start = a.to;
    a.goal = this.pickGoal(start);
    const path = findPath(city, start, a.goal, {
      avoidClosed: a.knowsClosure,
      pointer: this.pointerCost(),
    });
    if (!path || path.length < 2) {
      a.dying = true;
      return;
    }
    a.path = path;
    a.pathI = 1;
    a.from = path[0];
    a.to = path[1];
    a.edge = edgeBetween(city, a.from, a.to);
  }

  private repath(a: Agent, silent = false): void {
    const path = findPath(this.city, a.to, a.goal, {
      avoidClosed: a.knowsClosure,
      pointer: this.pointerCost(),
    });
    if (!path || path.length < 2) return;
    a.path = a.path.slice(0, a.pathI + 1).concat(path.slice(1));
    if (!silent) this.reroutes++;
  }

  private pointerCost() {
    return this.pointer.active
      ? { x: this.pointer.x, y: this.pointer.y, r: POINTER_R * 1.35, k: 240 }
      : null;
  }

  /** true if a FUTURE segment of the plan uses the edge (the edge currently
   *  being crossed is excluded — an agent mid-segment cannot teleport off it) */
  private pathUsesEdge(a: Agent, eid: number): boolean {
    for (let i = a.pathI; i + 1 < a.path.length; i++) {
      if (edgeBetween(this.city, a.path[i], a.path[i + 1]) === eid) return true;
    }
    return false;
  }

  private perceive(a: Agent): void {
    // neighbor count within sensing radius
    let near = 0;
    this.hash.query(a.x, a.y, SENSE_R, (id) => {
      if (id === a.id) return;
      const b = this.agents[id];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      if (dx * dx + dy * dy < SENSE_R * SENSE_R) near++;
    });
    if (near > a.lastNear && a.senseFlash < 0.3) a.senseFlash = 0.45;
    a.lastNear = near;

    // hazards entering the radius
    let hz = false;
    for (const m of this.hazardMids) {
      const d = Math.hypot(a.x - m.x, a.y - m.y);
      if (d < SENSE_R + m.r) {
        hz = true;
        break;
      }
    }
    if (hz && !a.hazardNear) a.senseFlash = 1;
    a.hazardNear = hz;

    // junction ahead
    if (!a.nodeFlashed) {
      const e = this.city.edges[a.edge];
      if (e.len - a.s < SENSE_R * 0.7 && this.city.nodes[a.to].edges.length >= 3) {
        a.nodeFlashed = true;
        if (a.senseFlash < 0.25) a.senseFlash = 0.35;
      }
    }

    // direct perception of the closure (uninformed agents only)
    if (this.closure >= 0 && !a.knowsClosure) {
      const e = this.city.edges[this.closure];
      const m = edgeMid(this.city, e);
      if (Math.hypot(a.x - m.x, a.y - m.y) < SENSE_R + e.len / 2) {
        a.knowsClosure = true;
        a.senseFlash = 1;
        if (this.pathUsesEdge(a, this.closure)) {
          this.repath(a);
        }
      }
    }
  }

  private activateClosure(): void {
    const city = this.city;
    let best: CityEdge | null = null;
    let bestScore = -Infinity;
    for (const e of liveEdges(city)) {
      if (!e.major || e.hazard) continue;
      const m = edgeMid(city, e);
      if (m.x < city.width * 0.22 || m.x > city.width * 0.78) continue;
      if (m.y < city.height * 0.22 || m.y > city.height * 0.78) continue;
      const score = e.congestion * 100 + e.occupancy;
      if (score > bestScore) {
        bestScore = score;
        best = e;
      }
    }
    if (!best) return;
    best.closed = true;
    this.closure = best.id;
    this.closureAt = this.tickCount;
    this.reroutes = 0;
    // stepCommWave seeds the first broadcast pulse from the incident
    this.pulseSeq = 0;
  }

  private clearClosure(): void {
    if (this.closure >= 0) this.city.edges[this.closure].closed = false;
    this.closure = -1;
    this.transmissions.length = 0;
    this.pulseSeq = 0;
    this.lastPulse = 0;
    for (const a of this.agents) {
      a.informed = false;
      a.knowsClosure = false;
      a.pulseSeq = 0;
    }
  }

  private stepCommWave(): void {
    // Gossip broadcast: a wavefront expands hop-by-hop from the incident.
    // The first wave is what informs agents (they reroute on receipt); after
    // that the closure re-broadcasts every ~6.5 s — a keep-alive gossip pulse
    // that relays over the same local links, so the "information wave" stays
    // observable for as long as the disruption lasts.
    const city = this.city;
    if (this.tickCount - this.lastPulse > TICK_HZ * 6.5 || this.pulseSeq === 0) {
      this.pulseSeq++;
      this.lastPulse = this.tickCount;
      const e = city.edges[this.closure];
      const m = edgeMid(city, e);
      for (const a of this.agents) {
        if (!a.alive) continue;
        if (Math.hypot(a.x - m.x, a.y - m.y) < COMM_R * 1.15) {
          a.pulseSeq = this.pulseSeq;
          a.informedAt = this.tickCount;
          if (!a.informed) {
            a.informed = true;
            a.knowsClosure = true;
            if (this.pathUsesEdge(a, this.closure)) this.repath(a);
          }
        }
      }
    }

    const waveTicks = TICK_HZ * 3.2;
    const cap = 150;
    for (const a of this.agents) {
      if (!a.alive || a.pulseSeq !== this.pulseSeq) continue;
      if (this.tickCount - a.informedAt > waveTicks) continue;
      this.hash.query(a.x, a.y, COMM_R, (id) => {
        if (id === a.id) return;
        const b = this.agents[id];
        if (!b.alive || b.pulseSeq === this.pulseSeq) return;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        if (dx * dx + dy * dy > COMM_R * COMM_R) return;
        // stochastic relay spreads the wave over ~2s instead of one tick
        if (this.rng() > 0.3) return;
        b.pulseSeq = this.pulseSeq;
        b.informedAt = this.tickCount;
        if (this.transmissions.length < cap) this.transmissions.push({ from: a.id, to: b.id, t: 0 });
        if (!b.informed) {
          b.informed = true;
          b.knowsClosure = true;
          if (this.pathUsesEdge(b, this.closure)) this.repath(b);
        }
      });
    }
  }

  private stepDecisions(dt: number, decideW: number): void {
    const city = this.city;
    // advance active decisions
    for (let i = this.decisions.length - 1; i >= 0; i--) {
      const d = this.decisions[i];
      d.t += dt;
      const a = this.agents[d.agent];
      const stillValid = a.alive && !a.dying;
      // commit after the deliberation beat (or early if the agent arrives)
      if (d.chosen < 0 && stillValid && (d.t > 1.45 || a.to !== d.node || a.s > city.edges[a.edge].len - 6)) {
        // cands are sorted by true cost — index 0 is the genuine optimum
        d.chosen = 0;
        const chosen = d.cands[0];
        a.path = a.path.slice(0, a.pathI + 1).concat(chosen.path.slice(1));
      }
      if (d.t > 3.1 || !stillValid) {
        if (stillValid) a.inDecision = false;
        d.done = true;
        this.decisions.splice(i, 1);
      }
    }

    if (decideW < 0.3) return;
    this.decisionCooldown -= dt;
    if (this.decisionCooldown > 0 || this.decisions.length >= 6) return;

    // recruit a focus agent approaching a junction near the focus node
    const focus = city.nodes[city.focusNode];
    const FOCUS_R = 240;
    for (const a of this.agents) {
      if (!a.alive || a.dying || a.inDecision || a.alpha < 0.9) continue;
      if (Math.hypot(a.x - focus.x, a.y - focus.y) > FOCUS_R) continue;
      const junction = a.to;
      if (city.nodes[junction].edges.length < 3) continue;
      const e = city.edges[a.edge];
      const remaining = e.len - a.s;
      if (remaining < 26 || remaining > 70) continue;
      if (junction === a.goal) continue;
      const cands = alternativePaths(city, junction, a.goal, 3, {
        avoidClosed: a.knowsClosure,
        pointer: this.pointerCost(),
      });
      if (cands.length < 2) continue;
      a.inDecision = true;
      this.decisions.push({ agent: a.id, node: junction, cands, chosen: -1, t: 0, done: false });
      this.decisionCooldown = 0.55;
      break;
    }
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function newAgent(id: number): Agent {
  return {
    id,
    alive: false,
    dying: false,
    x: 0,
    y: 0,
    px: 0,
    py: 0,
    from: 0,
    to: 0,
    edge: 0,
    s: 0,
    laneOff: 2,
    laneBase: 2,
    baseSpeed: 26,
    speed: 0,
    path: [],
    pathI: 1,
    goal: 0,
    alpha: 0,
    senseFlash: 0,
    lastNear: 0,
    hazardNear: false,
    nodeFlashed: false,
    knowsClosure: false,
    informed: false,
    informedAt: 0,
    pulseSeq: 0,
    nextRepath: 0,
    inDecision: false,
    trail: new Float32Array(TRAIL_N * 2),
    trailHead: 0,
    trailLen: 0,
  };
}

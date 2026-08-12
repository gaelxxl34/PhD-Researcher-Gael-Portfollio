import type { City } from './city';
import { edgeMid } from './city';
import type { Simulation, StateWeights } from './sim';
import { TRAIL_N } from './sim';

/**
 * Canvas 2D renderer for the simulation. This is the only module that touches
 * a canvas — the sim core stays DOM-free. Everything is drawn in world space
 * under a camera transform; batching by style keeps 1,200 agents + trails +
 * radii inside the frame budget without WebGL. Glow is layered alpha, never
 * shadowBlur (which would wreck fill-rate on mobile).
 *
 * Palette: tokens sampled from the site's stylesheet — brand green #1a3a2a
 * (theme-color) for the instrument bed, slate #6b7a88 / paper #f4f2ee
 * (existing accent + card tones) for agents, bronze #a8743a (the palette's
 * warmest accent) reserved for hazards and the disruption.
 */

export const SIM_COLORS = {
  bg: '#081209',
  bgTop: '#0a1810',
  plaza: 'rgba(26, 58, 42, 0.28)',
  streetMinor: 'rgba(134, 178, 152, 0.14)',
  streetMajor: 'rgba(158, 200, 174, 0.30)',
  sense: '134, 178, 152',
  agentGlow: '143, 160, 176',
  agentCore: '244, 242, 238',
  informedGlow: '244, 242, 238',
  hazard: '176, 127, 73',
  hazardBright: '224, 164, 98',
  candidate: '160, 175, 188',
  chosen: '244, 242, 238',
  link: '244, 242, 238',
} as const;

export interface Camera {
  cx: number;
  cy: number;
  scale: number;
}

export interface ViewOpts {
  w: number;
  h: number;
  weights: StateWeights;
  /** interpolation alpha between the last two ticks */
  alpha: number;
  mobile: boolean;
  /** 0..1 expanding tap ripple, <0 when idle */
  rippleT: number;
}

export function computeCamera(sim: Simulation, w: number, h: number): Camera {
  const city = sim.city;
  const cover = Math.max(w / city.width, h / city.height);
  const zoomW = sim.weights.decide;
  const scale = cover * (1 + 0.62 * zoomW);
  const focus = city.nodes[city.focusNode];
  let cx = city.width / 2 + (focus.x - city.width / 2) * zoomW;
  let cy = city.height / 2 + (focus.y - city.height / 2) * zoomW;
  const halfW = w / (2 * scale);
  const halfH = h / (2 * scale);
  cx = Math.min(city.width - halfW, Math.max(halfW, cx));
  cy = Math.min(city.height - halfH, Math.max(halfH, cy));
  return { cx, cy, scale };
}

const streetPaths = new WeakMap<City, { minor: Path2D; major: Path2D; plazas: Path2D }>();

function getStreetPaths(city: City) {
  let paths = streetPaths.get(city);
  if (!paths) {
    const minor = new Path2D();
    const major = new Path2D();
    for (const e of city.edges) {
      if (e.a < 0) continue;
      const p = e.major ? major : minor;
      p.moveTo(city.nodes[e.a].x, city.nodes[e.a].y);
      p.lineTo(city.nodes[e.b].x, city.nodes[e.b].y);
    }
    const plazas = new Path2D();
    for (const pz of city.plazas) plazas.rect(pz.x, pz.y, pz.w, pz.h);
    paths = { minor, major, plazas };
    streetPaths.set(city, paths);
  }
  return paths;
}

const ax = (a: { px: number; x: number }, t: number) => a.px + (a.x - a.px) * t;
const ay = (a: { py: number; y: number }, t: number) => a.py + (a.y - a.py) * t;

export function render(ctx: CanvasRenderingContext2D, sim: Simulation, view: ViewOpts): Camera {
  const { w, h, weights: wt, alpha, mobile } = view;
  const city = sim.city;
  const cam = computeCamera(sim, w, h);
  const time = sim.time;

  // background (screen space)
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, SIM_COLORS.bgTop);
  grad.addColorStop(1, SIM_COLORS.bg);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.scale(cam.scale, cam.scale);
  ctx.translate(-cam.cx, -cam.cy);
  const px = (n: number) => n / cam.scale; // n screen pixels in world units
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const paths = getStreetPaths(city);

  // plazas: quiet open blocks, outlined so they read as places not glitches
  ctx.fillStyle = 'rgba(26, 58, 42, 0.16)';
  ctx.fill(paths.plazas);
  ctx.strokeStyle = 'rgba(134, 178, 152, 0.10)';
  ctx.lineWidth = px(1);
  ctx.stroke(paths.plazas);

  // streets
  ctx.strokeStyle = SIM_COLORS.streetMinor;
  ctx.lineWidth = px(1);
  ctx.stroke(paths.minor);
  ctx.strokeStyle = SIM_COLORS.streetMajor;
  ctx.lineWidth = px(2);
  ctx.stroke(paths.major);

  // congestion heat: only genuinely queued streets glow warm (act + cooperate)
  const heatW = wt.act + wt.cooperate * 0.9;
  if (heatW > 0.04) {
    for (let bucket = 0; bucket < 3; bucket++) {
      const lo = 0.55 + bucket * 0.35;
      const hi = lo + 0.35;
      ctx.beginPath();
      let any = false;
      for (const e of city.edges) {
        if (e.a < 0 || e.congestion < lo || (bucket < 2 && e.congestion >= hi)) continue;
        ctx.moveTo(city.nodes[e.a].x, city.nodes[e.a].y);
        ctx.lineTo(city.nodes[e.b].x, city.nodes[e.b].y);
        any = true;
      }
      if (!any) continue;
      ctx.strokeStyle = `rgba(${SIM_COLORS.hazard}, ${(0.12 + bucket * 0.11) * heatW})`;
      ctx.lineWidth = px(2 + bucket);
      ctx.stroke();
    }
  }

  // hazard zones (strongest while perceiving/deciding)
  const hzW = wt.perceive + wt.decide * 0.75 + (wt.act + wt.cooperate) * 0.3;
  if (hzW > 0.03) {
    const pulse = 0.5 + 0.5 * Math.sin(time * 2.1);
    for (const eid of city.hazardEdges) {
      const e = city.edges[eid];
      if (e.a < 0) continue;
      ctx.strokeStyle = `rgba(${SIM_COLORS.hazard}, ${0.5 * hzW})`;
      ctx.lineWidth = px(5);
      ctx.beginPath();
      ctx.moveTo(city.nodes[e.a].x, city.nodes[e.a].y);
      ctx.lineTo(city.nodes[e.b].x, city.nodes[e.b].y);
      ctx.stroke();
      const m = edgeMid(city, e);
      const r = e.len / 2 + 10 + pulse * 5;
      ctx.strokeStyle = `rgba(${SIM_COLORS.hazard}, ${(0.24 + 0.14 * pulse) * hzW})`;
      ctx.lineWidth = px(1);
      ctx.beginPath();
      ctx.arc(m.x, m.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // the state-4 closure: unmistakably shut
  if (sim.closure >= 0) {
    const e = city.edges[sim.closure];
    const na = city.nodes[e.a];
    const nb = city.nodes[e.b];
    const pulse = 0.5 + 0.5 * Math.sin(time * 3.4);
    ctx.strokeStyle = `rgba(${SIM_COLORS.hazardBright}, ${0.5 + 0.3 * pulse})`;
    ctx.lineWidth = px(3);
    ctx.setLineDash([px(7), px(6)]);
    ctx.beginPath();
    ctx.moveTo(na.x, na.y);
    ctx.lineTo(nb.x, nb.y);
    ctx.stroke();
    ctx.setLineDash([]);
    // barrier ticks across each end
    for (const n of [na, nb]) {
      ctx.strokeStyle = `rgba(${SIM_COLORS.hazardBright}, 0.9)`;
      ctx.lineWidth = px(2.5);
      ctx.beginPath();
      ctx.moveTo(n.x - e.uy * 8, n.y + e.ux * 8);
      ctx.lineTo(n.x + e.uy * 8, n.y - e.ux * 8);
      ctx.stroke();
    }
    const m = edgeMid(city, e);
    ctx.strokeStyle = `rgba(${SIM_COLORS.hazardBright}, ${0.2 * pulse + 0.08})`;
    ctx.lineWidth = px(1.2);
    ctx.beginPath();
    ctx.arc(m.x, m.y, e.len / 2 + 14 + pulse * 8, 0, Math.PI * 2);
    ctx.stroke();
  }

  const agents = sim.agents;
  const SENSE_R = 42;

  // sensing radii (the whole point of state 1)
  if (wt.perceive > 0.03) {
    const step = mobile ? 2 : 1;
    for (let bucket = 0; bucket < 3; bucket++) {
      ctx.beginPath();
      let any = false;
      for (let i = 0; i < agents.length; i += step) {
        const a = agents[i];
        if (!a.alive || a.alpha < 0.4) continue;
        const fb = a.senseFlash > 0.55 ? 2 : a.senseFlash > 0.12 ? 1 : 0;
        if (fb !== bucket) continue;
        const x = ax(a, alpha);
        const y = ay(a, alpha);
        ctx.moveTo(x + SENSE_R, y);
        ctx.arc(x, y, SENSE_R, 0, Math.PI * 2);
        any = true;
      }
      if (!any) continue;
      const strokeA = (0.05 + bucket * 0.1) * wt.perceive;
      ctx.strokeStyle = `rgba(${SIM_COLORS.sense}, ${strokeA})`;
      ctx.lineWidth = px(1);
      ctx.stroke();
      if (!mobile) {
        ctx.fillStyle = `rgba(${SIM_COLORS.sense}, ${(0.012 + bucket * 0.016) * wt.perceive})`;
        ctx.fill();
      }
    }
  }

  // trails
  const trailW = 0.35 * wt.perceive + 0.4 * wt.decide + 1 * wt.act + 0.9 * wt.cooperate;
  if (trailW > 0.05) {
    const segs = mobile ? 3 : TRAIL_N - 1;
    for (let k = 1; k <= segs; k++) {
      // k = 1 is oldest of the drawn window; draw newest last & brightest
      const age = segs - k; // 0 = newest
      const aFrac = 1 - age / segs;
      ctx.beginPath();
      let any = false;
      for (const a of agents) {
        if (!a.alive || a.trailLen < 2 || a.alpha < 0.25) continue;
        const n = Math.min(a.trailLen, segs + 1);
        if (age + 1 >= n) continue;
        const i0 = (a.trailHead - age - 1 + TRAIL_N * 2) % TRAIL_N;
        const i1 = (a.trailHead - age + TRAIL_N * 2) % TRAIL_N;
        ctx.moveTo(a.trail[i0 * 2], a.trail[i0 * 2 + 1]);
        if (age === 0) ctx.lineTo(ax(a, alpha), ay(a, alpha));
        else ctx.lineTo(a.trail[i1 * 2], a.trail[i1 * 2 + 1]);
        any = true;
      }
      if (!any) continue;
      ctx.strokeStyle = `rgba(${SIM_COLORS.agentGlow}, ${(0.1 + 0.32 * aFrac * aFrac) * trailW})`;
      ctx.lineWidth = px(1.5);
      ctx.stroke();
    }
  }

  // communication wave (state 4)
  if (sim.transmissions.length) {
    ctx.lineWidth = px(0.8);
    for (const tr of sim.transmissions) {
      const a = agents[tr.from];
      const b = agents[tr.to];
      if (!a?.alive || !b?.alive) continue;
      const fade = Math.sin(tr.t * Math.PI);
      ctx.strokeStyle = `rgba(${SIM_COLORS.link}, ${0.34 * fade})`;
      ctx.beginPath();
      ctx.moveTo(ax(a, alpha), ay(a, alpha));
      ctx.lineTo(ax(b, alpha), ay(b, alpha));
      ctx.stroke();
      // the packet
      const t = tr.t;
      const mx2 = ax(a, alpha) + (ax(b, alpha) - ax(a, alpha)) * t;
      const my2 = ay(a, alpha) + (ay(b, alpha) - ay(a, alpha)) * t;
      ctx.fillStyle = `rgba(${SIM_COLORS.hazardBright}, ${0.85 * fade})`;
      ctx.beginPath();
      ctx.arc(mx2, my2, px(2.2), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // decide-state candidate paths
  if (wt.decide > 0.02 && sim.decisions.length) {
    const labelBudget = 1; // decisions that get weight chips at once
    let labeled = 0;
    const labels: { x: number; y: number; text: string; bright: boolean }[] = [];
    for (const d of sim.decisions) {
      const agent = agents[d.agent];
      if (!agent?.alive) continue;
      const reveal = Math.min(1, d.t / 0.4);
      const invCosts = d.cands.map((c) => 1 / c.cost);
      const invSum = invCosts.reduce((s, v) => s + v, 0);
      const takeLabels = d.chosen < 0 && labeled < labelBudget;
      for (let ci = 0; ci < d.cands.length; ci++) {
        const cand = d.cands[ci];
        let a: number;
        let width = 1.1;
        if (d.chosen < 0) {
          a = 0.34 * reveal;
        } else if (ci === d.chosen) {
          a = Math.min(0.68, 0.34 + (d.t - 1.45) * 1.1);
          width = 1.5;
        } else {
          a = Math.max(0, 0.34 - (d.t - 1.45) * 0.9);
        }
        if (a <= 0.01) continue;
        const chosenNow = d.chosen >= 0 && ci === d.chosen;
        ctx.strokeStyle = chosenNow
          ? `rgba(${SIM_COLORS.chosen}, ${a * wt.decide})`
          : `rgba(${SIM_COLORS.candidate}, ${a * wt.decide})`;
        ctx.lineWidth = px(width);
        ctx.setLineDash(chosenNow ? [] : [px(5), px(4)]);
        ctx.beginPath();
        ctx.moveTo(ax(agent, alpha), ay(agent, alpha));
        const maxNodes = Math.min(cand.path.length, 3);
        for (let ni = 0; ni < maxNodes; ni++) {
          const n = city.nodes[cand.path[ni]];
          ctx.lineTo(n.x, n.y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        // normalized weight chip where the branches have visibly diverged
        if (takeLabels && cand.path.length > 1) {
          const i0 = Math.min(1, cand.path.length - 2);
          const n0 = city.nodes[cand.path[i0]];
          const n1 = city.nodes[cand.path[i0 + 1]];
          labels.push({
            x: n0.x + (n1.x - n0.x) * 0.45,
            y: n0.y + (n1.y - n0.y) * 0.45,
            text: (invCosts[ci] / invSum).toFixed(2),
            bright: ci === 0,
          });
        }
      }
      if (takeLabels) labeled++;
      // ring on the junction while deliberating
      const jn = city.nodes[d.node];
      const ringA = d.chosen < 0 ? 0.4 * reveal : Math.max(0, 0.4 - (d.t - 1.45));
      if (ringA > 0.01) {
        ctx.strokeStyle = `rgba(${SIM_COLORS.chosen}, ${ringA * wt.decide})`;
        ctx.lineWidth = px(1);
        ctx.beginPath();
        ctx.arc(jn.x, jn.y, 7 + 2 * Math.sin(time * 5 + d.node), 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    // stash labels; they're drawn in screen space after ctx.restore()
    if (labels.length) (view as ViewOpts & { _labels?: typeof labels })._labels = labels;
  }

  // agents: glow pass then core pass, split by informed status
  const glowR = mobile ? 3.6 : 4.4;
  const coreR = 1.7;
  for (let informedPass = 0; informedPass < 2; informedPass++) {
    ctx.beginPath();
    let any = false;
    for (const a of agents) {
      if (!a.alive || (a.informed ? 1 : 0) !== informedPass) continue;
      const x = ax(a, alpha);
      const y = ay(a, alpha);
      ctx.moveTo(x + glowR, y);
      ctx.arc(x, y, glowR, 0, Math.PI * 2);
      any = true;
    }
    if (any) {
      ctx.fillStyle =
        informedPass === 1
          ? `rgba(${SIM_COLORS.informedGlow}, 0.34)`
          : `rgba(${SIM_COLORS.agentGlow}, 0.22)`;
      ctx.fill();
    }
    ctx.beginPath();
    any = false;
    for (const a of agents) {
      if (!a.alive || (a.informed ? 1 : 0) !== informedPass) continue;
      const x = ax(a, alpha);
      const y = ay(a, alpha);
      ctx.moveTo(x + coreR, y);
      ctx.arc(x, y, coreR, 0, Math.PI * 2);
      any = true;
    }
    if (any) {
      ctx.fillStyle = `rgba(${SIM_COLORS.agentCore}, ${informedPass === 1 ? 1 : 0.82})`;
      ctx.fill();
    }
  }

  // perception flash rings — meaningful while sensing/cooperating, noise at
  // full flow, so they fade out of the act state
  const flashW = wt.perceive + wt.decide * 0.5 + wt.cooperate * 0.45;
  ctx.lineWidth = px(1.1);
  ctx.beginPath();
  let anyFlash = false;
  for (const a of agents) {
    if (flashW < 0.05) break;
    if (!a.alive || a.senseFlash < 0.15) continue;
    const x = ax(a, alpha);
    const y = ay(a, alpha);
    const r = 4 + (1 - a.senseFlash) * 7;
    ctx.moveTo(x + r, y);
    ctx.arc(x, y, r, 0, Math.PI * 2);
    anyFlash = true;
  }
  if (anyFlash) {
    ctx.strokeStyle = `rgba(${SIM_COLORS.agentCore}, ${0.4 * flashW})`;
    ctx.stroke();
  }

  // pointer disturbance
  if (sim.pointer.active) {
    const R = 88;
    ctx.strokeStyle = `rgba(${SIM_COLORS.sense}, 0.34)`;
    ctx.lineWidth = px(1.2);
    ctx.beginPath();
    ctx.arc(sim.pointer.x, sim.pointer.y, R, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = `rgba(${SIM_COLORS.sense}, 0.05)`;
    ctx.fill();
  }
  if (view.rippleT >= 0 && view.rippleT <= 1) {
    const t = view.rippleT;
    ctx.strokeStyle = `rgba(${SIM_COLORS.sense}, ${0.5 * (1 - t)})`;
    ctx.lineWidth = px(1.5);
    ctx.beginPath();
    ctx.arc(sim.pointer.x, sim.pointer.y, 20 + t * 130, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();

  // screen-space decision labels (crisp text regardless of zoom)
  const labels = (view as ViewOpts & { _labels?: { x: number; y: number; text: string; bright: boolean }[] })
    ._labels;
  if (labels?.length) {
    ctx.font = '10px "DM Mono", ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const drawn: { x: number; y: number }[] = [];
    for (const l of labels) {
      const sx = (l.x - cam.cx) * cam.scale + w / 2;
      let sy = (l.y - cam.cy) * cam.scale + h / 2 - 10;
      // de-overlap chips that share a street
      for (const p of drawn) {
        if (Math.abs(p.x - sx) < 34 && Math.abs(p.y - sy) < 13) sy = p.y + 15;
      }
      drawn.push({ x: sx, y: sy });
      if (sx < 20 || sx > w - 20 || sy < 12 || sy > h - 12) continue;
      const tw = ctx.measureText(l.text).width + 8;
      ctx.fillStyle = 'rgba(8, 18, 9, 0.72)';
      ctx.fillRect(sx - tw / 2, sy - 7, tw, 14);
      ctx.fillStyle = l.bright
        ? `rgba(${SIM_COLORS.agentCore}, ${0.95 * wt.decide})`
        : `rgba(${SIM_COLORS.candidate}, ${0.9 * wt.decide})`;
      ctx.fillText(l.text, sx, sy);
    }
    delete (view as ViewOpts & { _labels?: unknown })._labels;
  }

  return cam;
}

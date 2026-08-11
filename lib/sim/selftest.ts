/**
 * Headless invariant checks for the simulation core. Runs under Node with no
 * DOM: `npx tsx lib/sim/selftest.ts`. Exits non-zero on any failure.
 *
 * This is the "debug render" stage of the build: before any canvas exists,
 * prove that agents move, stay on the graph, decide with real path scoring,
 * and reroute ahead of a closure when informed.
 */
import { Simulation, TICK_DT, TICK_HZ } from './sim';
import { edgeBetween, liveEdges } from './index';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  if (ok) console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ''}`);
  else {
    failures++;
    console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function run(weights: Parameters<Simulation['setWeights']>[0], seconds: number, sim: Simulation) {
  sim.setWeights(weights);
  for (let i = 0; i < seconds * TICK_HZ; i++) sim.tick(TICK_DT);
}

console.log('== city generation ==');
const sim = new Simulation({ seed: 20260811, maxAgents: 1200 });
const city = sim.city;
const edges = liveEdges(city);
check('nodes generated', city.nodes.length > 60, `${city.nodes.length} nodes`);
check('edges generated', edges.length > 100, `${edges.length} edges`);
check('plazas carved', city.plazas.length === 2);
check('hazards placed', city.hazardEdges.length >= 2, `${city.hazardEdges.length} hazards`);
check(
  'focus node is a junction',
  city.nodes[city.focusNode].edges.length >= 3,
  `degree ${city.nodes[city.focusNode].edges.length}`
);
{
  // connectivity: BFS from node 0 reaches every node that has edges
  const seen = new Set<number>([city.nodes.find((n) => n.edges.length > 0)!.id]);
  const stack = [...seen];
  while (stack.length) {
    const u = stack.pop()!;
    for (const eid of city.nodes[u].edges) {
      const e = city.edges[eid];
      const v = e.a === u ? e.b : e.a;
      if (!seen.has(v)) {
        seen.add(v);
        stack.push(v);
      }
    }
  }
  const connected = city.nodes.filter((n) => n.edges.length > 0).every((n) => seen.has(n.id));
  check('street graph fully connected', connected);
}

console.log('== state 1: perceive ==');
run({ perceive: 1, decide: 0, act: 0, cooperate: 0 }, 12, sim);
const m1 = sim.metrics();
check('population ramped to ~40% of max', m1.agents > 380 && m1.agents < 560, `${m1.agents} agents`);
check('agents are moving', m1.avgSpeedMs > 1, `${m1.avgSpeedMs.toFixed(1)} m/s avg`);
{
  let onGraph = true;
  let inBounds = true;
  for (const a of sim.agents) {
    if (!a.alive) continue;
    const e = city.edges[a.edge];
    if (e.a < 0 || (e.a !== a.from && e.b !== a.from) || (e.a !== a.to && e.b !== a.to))
      onGraph = false;
    if (a.x < -20 || a.x > city.width + 20 || a.y < -20 || a.y > city.height + 20)
      inBounds = false;
  }
  check('every agent sits on a live graph edge', onGraph);
  check('every agent inside world bounds', inBounds);
  const flashing = sim.agents.filter((a) => a.alive && a.senseFlash > 0).length;
  check('perception ticks firing', flashing > 5, `${flashing} agents flashing`);
}

console.log('== state 2: decide ==');
run({ perceive: 0, decide: 1, act: 0, cooperate: 0 }, 10, sim);
{
  const seenDecisions = sim.decisions.length;
  check('decisions active near focus node', seenDecisions > 0, `${seenDecisions} in flight`);
  let sortedOk = true;
  let multi = false;
  for (const d of sim.decisions) {
    if (d.cands.length >= 2) multi = true;
    for (let i = 0; i + 1 < d.cands.length; i++)
      if (d.cands[i].cost > d.cands[i + 1].cost + 1e-9) sortedOk = false;
  }
  check('candidates carry real scores, best first', sortedOk && multi);
  // run further; committed decisions must splice the chosen path into the agent
  run({ perceive: 0, decide: 1, act: 0, cooperate: 0 }, 3, sim);
  let pathsValid = true;
  for (const a of sim.agents) {
    if (!a.alive) continue;
    for (let i = a.pathI - 1; i + 1 < a.path.length; i++) {
      if (edgeBetween(city, a.path[i], a.path[i + 1]) < 0) pathsValid = false;
    }
  }
  check('all agent paths are valid adjacent-node chains', pathsValid);
}

console.log('== state 3: act ==');
run({ perceive: 0, decide: 0, act: 1, cooperate: 0 }, 25, sim);
const m3 = sim.metrics();
check('population ramped to max', m3.agents > 1100, `${m3.agents} agents`);
check('ticks counted', sim.tickCount > 1000, `${sim.tickCount} ticks`);
check('congestion is nonzero under load', m3.congestion > 0.005, m3.congestion.toFixed(4));
{
  const congested = edges.filter((e) => e.congestion > 0.25).length;
  check('some streets congested (car-following works)', congested > 0, `${congested} edges hot`);
}

console.log('== state 4: cooperate ==');
run({ perceive: 0, decide: 0, act: 0, cooperate: 1 }, 2, sim);
check('closure activated', sim.closure >= 0, `edge ${sim.closure}`);
check('closed edge flagged', sim.closure >= 0 && city.edges[sim.closure].closed);
run({ perceive: 0, decide: 0, act: 0, cooperate: 1 }, 6, sim);
{
  const informed = sim.agents.filter((a) => a.alive && a.informed).length;
  check('information wave propagated', informed > 30, `${informed} informed`);
  check('reroutes happened', sim.reroutes > 5, `${sim.reroutes} reroutes`);
  // THE core claim: no informed agent still PLANS a future segment through the
  // closed edge (agents caught mid-crossing when it closed finish that segment)
  let informedThroughClosure = 0;
  for (const a of sim.agents) {
    if (!a.alive || !a.knowsClosure) continue;
    for (let i = a.pathI; i + 1 < a.path.length; i++) {
      if (edgeBetween(city, a.path[i], a.path[i + 1]) === sim.closure) informedThroughClosure++;
    }
  }
  check('no informed agent plans through the closure', informedThroughClosure === 0);
}

console.log('== scroll-back: closure clears ==');
run({ perceive: 0, decide: 0, act: 1, cooperate: 0 }, 2, sim);
check('closure cleared when leaving state 4', sim.closure === -1);

console.log('== determinism ==');
{
  const mk = () => {
    const s = new Simulation({ seed: 7, maxAgents: 400 });
    s.setWeights({ perceive: 0.5, decide: 0, act: 0.5, cooperate: 0 });
    for (let i = 0; i < 600; i++) s.tick(TICK_DT);
    return s.checksum();
  };
  const c1 = mk();
  const c2 = mk();
  check('same seed reproduces the same world state', c1 === c2, `checksum ${c1.toFixed(2)}`);
}

console.log('== tick throughput (headless) ==');
{
  const s = new Simulation({ seed: 3, maxAgents: 1200 });
  s.setWeights({ perceive: 0, decide: 0, act: 1, cooperate: 0 });
  for (let i = 0; i < 20 * TICK_HZ; i++) s.tick(TICK_DT); // warm to full population
  const t0 = performance.now();
  const N = 300;
  for (let i = 0; i < N; i++) s.tick(TICK_DT);
  const per = (performance.now() - t0) / N;
  check('tick under 4ms at 1200 agents', per < 4, `${per.toFixed(2)} ms/tick`);
}

if (failures) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log('\nall checks passed');

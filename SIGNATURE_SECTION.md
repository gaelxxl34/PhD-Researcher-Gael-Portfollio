# The Signature Section: a live multi-agent simulation, loop-engineered

The "Watch it work — keep scrolling" section no longer illustrates multi-agent
research — it **runs** it. Two cartoon robots composited on a stock city photo
were deleted and replaced by a real-time simulation of up to **1,200
autonomous agents** navigating a procedurally generated city district on a
single pinned canvas. Scrolling doesn't swap scenes; it morphs a weight vector
over four states of the *same running simulation*: **perceive → decide → act →
cooperate**. A live HUD (`agents 1,200 · v 8.5 m/s · 30 ticks/s`) reads real
numbers out of the sim — the quiet proof that nothing on screen is a video.

Everything below was built and verified autonomously in a
build → screenshot → self-critique → fix loop. **Five verification iterations**
were needed before every exit criterion passed.

---

## Architecture

All simulation logic lives in **`lib/sim/`** — pure TypeScript, no DOM
imports, identical under Node and the browser (that's what makes the headless
selftest and the reduced-motion frames possible).

| Module | What it does |
|---|---|
| `city.ts` | Seeded procedural district: jittered street grid → graph (96 nodes / 129 edges), ~18% of minor edges removed (connectivity-checked via BFS before every removal), two carved plazas, two major avenues, three hazard zones, and a "focus junction" for the decide state chosen away from plazas. |
| `hash.ts` | Uniform-grid spatial hash, rebuilt each tick; O(1) neighbor queries for perception, the communication wave, and the pointer disturbance. |
| `path.ts` | Binary-heap A* over the street graph. Edge cost = length × (1 + congestion) + hazard penalty + pointer-disturbance penalty; closed edges are impassable *only for agents that know about the closure*. `alternativePaths()` produces k genuinely distinct routes by iterative edge penalization — these are the candidate paths drawn in the decide state, and the chosen one is always the true cost minimum. |
| `sim.ts` | The `Simulation`: fixed-timestep tick (30 Hz) decoupled from rendering with interpolation alpha for rAF; car-following on edges (leaders/headway per direction) which *produces* congestion rather than faking it; staggered congestion-aware repathing; decision choreography; disruption + gossip broadcast; live metrics. |
| `render.ts` | The only canvas-touching module. World-space camera (cover-fit, decide-state zoom toward the focus junction, cooperate-state drift toward the closure), cached `Path2D` streets, style-batched draws, glow via layered alpha — **no shadowBlur, no per-agent save/restore**. |
| `selftest.ts` | 26 invariant checks run headless under Node (`npx tsx lib/sim/selftest.ts`): graph connectivity, population ramps, agents-on-graph, real sorted decision scores, wave propagation, *no informed agent plans through the closure*, determinism (same seed ⇒ same checksum), and tick throughput. |

The React side is one component, `components/AgentCity.tsx`: canvas host,
scroll→weight mapping, HUD, pointer interaction, IntersectionObserver +
visibility pausing, eco-mode watchdog, reduced-motion mode.

### The four states (one simulation, no scene swaps)

Scroll progress maps to smooth-stepped weights over the same boundaries the
caption system uses (0.22 / 0.47 / 0.74), so visuals and copy stay in sync
while population, speed, camera, and layer emphasis interpolate continuously.

1. **Perceive** — 40% population at low speed; every agent draws its sensing
   radius; radii flare when another agent, a junction, or a hazard enters
   range; hazard segments pulse in the palette's warm bronze.
2. **Decide** — camera zooms ~1.6× into a junction-dense neighborhood. Agents
   approaching a junction display 2–3 dashed candidate routes with normalized
   weight chips (e.g. `0.41` vs `0.23`) computed from real A* costs; after a
   deliberation beat the genuine minimum-cost route brightens and is spliced
   into the agent's actual plan. This repeats organically.
3. **Act** — zoom out, population ramps to max (1,200 desktop / 250 mobile),
   trails lengthen, and streets whose *measured* car-following density crosses
   thresholds glow warm. HUD shows agents / mean speed / ticks per second /
   congestion index — all live.
4. **Cooperate** — the busiest central avenue segment closes (bright dashed
   bronze barrier). Agents within communication range of the incident start a
   gossip broadcast: hop-by-hop relays drawn as thin links with packet dots,
   expanding as a visible information wave (it re-broadcasts every ~4.5 s so
   the behavior stays observable). **Informed agents reroute before ever
   reaching the barrier; uninformed agents react only on direct perception.**
   The HUD flips to `reroutes N · congestion ↓ falling`.

**Interaction** — the cursor (or a tap) is a disturbance in the world: agents
inside its radius slow, drift to the far lane, and notice it; route costs near
it rise so replanning avoids it. In screenshots this shows up as a visible
void in the flow around the pointer ring.

### Accessibility

- `prefers-reduced-motion`: the live loop never starts. Instead the same
  simulation is run headlessly at mount to produce **four static frames**
  (the cooperate frame is captured mid-wave), crossfaded ~320 ms on state
  change only. Verified: canvas pixels byte-identical one second apart in all
  four states.
- The canvas has a meaningful `aria-label` describing the simulation; the
  step copy remains ordinary DOM text and the source of truth for screen
  readers; HUD and step indicator are `aria-hidden` decorations of it.
- HUD text is `#f4f2ee` on a `rgba(8,18,9,.68)` pill over the near-black
  green bed — far above AA. Axe: **0 violations of any severity** on the full
  page.

### Performance engineering

- Fixed 30 Hz sim tick, decoupled from rendering; rendering interpolates
  between ticks. Sim cost measured headless: **0.26 ms/tick at 1,200 agents**.
- Spatial hash for all neighbor queries; per-edge direction lists for
  car-following; A* staggered across agents (repaths happen at junctions on
  a jittered schedule, plus event-driven on closure/inform/pointer).
- Rendering batches by style bucket (trails by age, radii by flash intensity,
  heat by congestion band, agents by informed status) — a handful of
  `stroke()`/`fill()` calls per layer regardless of agent count.
- Pauses fully when the canvas is off-screen (IntersectionObserver) or the
  tab is hidden.
- **Eco mode**: if 110 *consecutive* frames exceed 17.5 ms, agent cap steps
  down 30% (repeatable ×3) and the HUD appends `mode eco`. Consecutive-frame
  counting matters: rAF gaps from tab throttling or GC must not trigger
  degradation (that bug was caught in iteration 1).
- Mobile (<768 px): 250-agent cap, DPR capped at 2, thinned radii and
  shortened trails.

### Palette (all sampled from the existing site, no new aesthetic)

Instrument bed `#081209`–`#0a1810` derived from the brand theme-color
`#1a3a2a`; streets in lightened brand green; agents in slate `#6b7a88` glow /
paper `#f4f2ee` cores (both existing site tones); hazards, congestion heat and
the closure reserved for the palette's warmest accent, bronze `#a8743a` /
`#e0a462`. HUD and step labels use the site's DM Mono caps/tracking utility
style.

---

## Measured numbers

Frame times are rAF-to-rAF deltas recorded by the component itself
(`window.__simPerf`) in **state 3 at full load**, read by
`scripts/verify/perf.mjs`:

| Environment | Agents | avg | p50 | p95 |
|---|---|---|---|---|
| Chrome + GPU (M-series), 1440×900 @2x | 1,200 | **8.33 ms** | 8.30 ms | 9.10 ms |
| Chrome + GPU, 375×812 @2x mobile emulation | 250 | **8.37 ms** | 8.30 ms | 9.20 ms |
| Headless shell (SwiftShader software raster), 1440×900 @2x | 1,200 | 14.76 ms | 16.60 ms | 17.30 ms |
| Headless shell, 375×812 @2x | 250 | 8.33 ms | 8.30 ms | 8.70 ms |

The GPU numbers are vsync-locked on a 120 Hz display — the sim is
display-limited, not compute-limited. Even under pure software rasterization
the desktop worst case stays inside the 16.7 ms budget on average. Headless
sim throughput: 0.26 ms/tick at 1,200 agents, ~64 edges congested under full
load, deterministic checksum across runs.

Cooperate-state assertion (from `interact.mjs`, live page): closure active,
**231 reroutes**, `informedPlanning = 0` — not a single informed agent had a
future path segment through the closed edge. The selftest proves the same
invariant headlessly every run.

Canvas 2D was sufficient; WebGL was never needed. First-load JS for the whole
page went from 114 kB (robot version pulled a further 283 kB `model-viewer` on
approach) to **122 kB total with the entire simulation included** — the sim
core + renderer is ~8 kB gzipped and there are zero new runtime dependencies.

---

## The verification loop

Every iteration ran: `npm run build` → `node scripts/verify/shoot.mjs`
(4 states × 375/768/1440 = 12 screenshots) → my own critique of the images →
fixes → reshoot. Perf, interaction, reduced-motion and axe harnesses joined
from iteration 3.

1. **Iteration 1** — sim proved live on canvas, but: eco mode false-triggered
   (wall-clock watchdog counted rAF gaps), the decide camera zoomed into an
   empty plaza, chosen paths washed across the whole viewport, congestion heat
   saturated every street ("congestion 101%"), weight chips overlapped.
   *Fixes:* consecutive-frame watchdog; plaza-aware focus scoring; capped/
   dimmed candidate polylines; congestion normalized to per-edge capacity.
2. **Iteration 2** — act state legible, decide composed on a real junction;
   chips de-overlapped into a detached column; flash rings cluttered act;
   trails too faint. *Fixes:* one labeled decision at a time with chips on
   the diverging segment; flash rings weighted out of act; trail alpha/width
   up; `?noeco` flag so software-rendered screenshot runs show true
   populations.
3. **Iteration 3** — full 1,200 agents on screen; cooperate state's closure
   was buried under agent queues and the 6.5 s wave interval dodged every
   screenshot. *Fixes:* closure drawn above agents with barrier ticks;
   camera drifts toward the incident in state 4; 4.5 s re-broadcast; longer-
   lived, brighter links; heat de-emphasized in state 4 so states 3/4 read
   differently.
4. **Iteration 4** — interaction + wave capture: script polls the sim and
   screenshots *while transmissions are in flight*; got the information wave
   mid-propagation and the pointer void. Reduced-motion and axe passes green.
5. **Iteration 5** — final 12-shot sweep found one defect: the mobile HUD
   overflowed its pill at 375 px. Trimmed compact HUD content, added an
   ellipsis guard, reshot: clean.

### Final screenshot critique (exit criterion 1)

All in `docs/screenshots/sim/`:

- `sim-1-perceive-1440.jpg` / `-375.jpg` — sensing radii everywhere, three
  bronze hazard pulses, dim streets: reads as "sensing" at a glance.
- `sim-2-decide-1440.jpg` / `-768.jpg` — zoomed junction, dashed candidates
  with weight chips (`0.41` vs `0.23`), one route committed bright: branching
  futures collapsing into a choice.
- `sim-3-act-1440.jpg` — 1,200 agents queued and flowing, selective warm
  congestion, HUD at full load: scale and motion.
- `sim-4-cooperate-1440.jpg` / `-375.jpg` — bronze dashed barrier, the closed
  segment visibly empty while cross-streets carry rerouted flow, reroute
  counter live: coordination without a controller.
- `sim-coop-seq-1/2/3.jpg` — the proof sequence: closure appears → gossip wave
  mid-propagation (links + packet dots radiating outward) → traffic
  reorganized, closed street empty, `reroutes 231 · congestion ↓ falling`.
- `sim-interaction-hover.jpg` — the cursor's soft-avoid ring with a visible
  void in the flow around it.
- `sim-reduced-motion-s4.jpg` — static preview frame, HUD reading
  `static preview · agents 700 · reduced motion`.

### Exit criteria

| Criterion | Result |
|---|---|
| 4 states distinct & self-explanatory at 375/768/1440 | ✅ critique above |
| Desktop state 3 ≤ 16.7 ms avg at max agents | ✅ 8.33 ms GPU (14.76 ms even in software raster) |
| Mobile emulation ≤ 16.7 ms at cap | ✅ 8.37 ms |
| HUD shows real, changing sim metrics | ✅ read from the sim each 250 ms; ticks/s is measured, not asserted |
| Cooperation reroutes informed agents before the blockage | ✅ sequence captured + `informedPlanning = 0` assertion + selftest invariant |
| Reduced-motion verified | ✅ 4 static frames, pixel-identical over 1 s |
| Axe clean | ✅ 0 violations (any severity) |
| Build clean | ✅ `next build` green; tsc clean |
| No stock photo / robot mascots in the section | ✅ grep-verified; assets left on disk, unreferenced (`TODO(gael)` note in `AgentShowcase.tsx`) |

### Reproduce it

```bash
npx tsx lib/sim/selftest.ts          # 26 headless invariants
npm run build && npx next start -p 3100
node scripts/verify/shoot.mjs out    # 12 state screenshots
node scripts/verify/perf.mjs --headed
node scripts/verify/interact.mjs out # pointer + wave proof, sim assertions
node scripts/verify/reduced.mjs out  # static-frame proof
node scripts/verify/axe.mjs
```

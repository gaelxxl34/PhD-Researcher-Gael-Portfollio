// Prove the pointer disturbance and the cooperate-state reroute sequence.
// usage: node scripts/verify/interact.mjs <outdir>
import { chromium } from 'playwright';

const OUT = process.argv[2] || 'shots';
const BASE = 'http://localhost:3100/?noeco=1';

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();
await page.goto(BASE, { waitUntil: 'networkidle' });

const scrollToScrub = (t) =>
  page.evaluate(async (frac) => {
    const s = document.getElementById('showcase');
    const r = s.getBoundingClientRect();
    const top = r.top + window.scrollY;
    const y = Math.round(top + frac * (r.height - window.innerHeight));
    let cur = window.scrollY;
    while (Math.abs(cur - y) > 400) {
      cur += Math.sign(y - cur) * 400;
      window.scrollTo(0, cur);
      await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
    }
    window.scrollTo(0, y);
  }, t);

// --- pointer disturbance in state 3 ---------------------------------------
await scrollToScrub(0.6);
await page.waitForTimeout(5000);
const canvas = page.locator('.sim-canvas');
const box = await canvas.boundingBox();
const cx = box.x + box.width * 0.55;
const cy = box.y + box.height * 0.5;
await page.mouse.move(cx, cy, { steps: 12 });
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/hover-1.png` });
await page.waitForTimeout(1600);
await page.screenshot({ path: `${OUT}/hover-2.png` });
console.log('pointer disturbance captured');

// --- cooperate: catch the info wave + reroute sequence --------------------
await page.mouse.move(10, 10);
await scrollToScrub(0.9);
// closure activates when cooperate weight crosses 0.5; the first broadcast
// pulse follows within a tick, spreading over ~2s
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/coop-1.png` });
// the gossip wave re-broadcasts every ~4.5s; poll the sim and shoot while a
// wave is actually mid-propagation (transmissions in flight)
await page.waitForFunction(() => window.__sim.transmissions.length > 25, null, {
  timeout: 15000,
  polling: 60,
});
await page.screenshot({ path: `${OUT}/coop-2.png` });
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/coop-3.png` });
const m = await page.evaluate(() => {
  const sim = window.__sim;
  const closed = sim.closure;
  let informedPlanning = 0;
  let uninformedPlanning = 0;
  for (const a of sim.agents) {
    if (!a.alive) continue;
    for (let i = a.pathI; i + 1 < a.path.length; i++) {
      const na = sim.city.nodes[a.path[i]];
      for (const eid of na.edges) {
        const e = sim.city.edges[eid];
        if (eid === closed && (e.a === a.path[i + 1] || e.b === a.path[i + 1])) {
          if (a.knowsClosure) informedPlanning++;
          else uninformedPlanning++;
        }
      }
    }
  }
  return { closure: closed, reroutes: sim.reroutes, informedPlanning, uninformedPlanning };
});
console.log('cooperate metrics:', JSON.stringify(m));
await ctx.close();
await browser.close();

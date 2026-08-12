// Measure real frame times in state 3 (max load) from the sim's own perf
// buffer (window.__simPerf, rAF-to-rAF deltas while visible and running).
// usage: node scripts/verify/perf.mjs [--headed]
import { chromium } from 'playwright';

const HEADED = process.argv.includes('--headed');
const BASE = 'http://localhost:3100/?noeco=1';

const CASES = [
  { name: 'desktop 1440 (1,200 agents)', width: 1440, height: 900, mobile: false, dpr: 2 },
  { name: 'mobile 375 (250 agents)', width: 375, height: 812, mobile: true, dpr: 2 },
];

const browser = await chromium.launch(
  HEADED ? { headless: false, channel: 'chrome' } : {}
);

for (const c of CASES) {
  const ctx = await browser.newContext({
    viewport: { width: c.width, height: c.height },
    deviceScaleFactor: c.dpr,
    isMobile: c.mobile,
    hasTouch: c.mobile,
  });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  // scroll into state 3 stepwise
  await page.evaluate(async () => {
    const s = document.getElementById('showcase');
    const r = s.getBoundingClientRect();
    const top = r.top + window.scrollY;
    const y = Math.round(top + 0.6 * (r.height - window.innerHeight));
    let cur = window.scrollY;
    while (Math.abs(cur - y) > 400) {
      cur += Math.sign(y - cur) * 400;
      window.scrollTo(0, cur);
      await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
    }
    window.scrollTo(0, y);
  });
  // let population ramp to full, then measure a clean window
  await page.waitForTimeout(6000);
  await page.evaluate(() => (window.__simPerf.length = 0));
  await page.waitForTimeout(5000);
  const stats = await page.evaluate(() => {
    const a = window.__simPerf.slice();
    a.sort((x, y) => x - y);
    const avg = a.reduce((s, v) => s + v, 0) / a.length;
    const p = (q) => a[Math.min(a.length - 1, Math.floor(q * a.length))];
    const agents = window.__sim ? window.__sim.population : -1;
    return { n: a.length, avg, p50: p(0.5), p95: p(0.95), agents };
  });
  console.log(
    `${c.name}: agents=${stats.agents} frames=${stats.n} ` +
      `avg=${stats.avg.toFixed(2)}ms p50=${stats.p50.toFixed(2)}ms p95=${stats.p95.toFixed(2)}ms`
  );
  await ctx.close();
}
await browser.close();

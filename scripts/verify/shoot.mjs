// Screenshot the four sim states at three breakpoints.
// usage: node shoot.mjs [outdir] [--reduced]
import { chromium } from 'playwright';

const OUT = process.argv[2] || 'shots';
const REDUCED = process.argv.includes('--reduced');
// ?noeco keeps the eco watchdog out of software-rendered headless runs so
// screenshots show the real per-state populations
const BASE = 'http://localhost:3100/?noeco=1';

const VIEWPORTS = [
  { name: '375', width: 375, height: 812, mobile: true },
  { name: '768', width: 768, height: 1024, mobile: true },
  { name: '1440', width: 1440, height: 900, mobile: false },
];
// scrub targets inside each stage bucket (bounds .22/.47/.74)
const STAGES = [0.1, 0.34, 0.6, 0.9];

const browser = await chromium.launch();
for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 2,
    isMobile: vp.mobile,
    hasTouch: vp.mobile,
    reducedMotion: REDUCED ? 'reduce' : 'no-preference',
  });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });

  const geom = await page.evaluate(() => {
    const s = document.getElementById('showcase');
    const r = s.getBoundingClientRect();
    return { top: r.top + window.scrollY, height: r.height };
  });

  for (let st = 0; st < 4; st++) {
    const target = Math.round(geom.top + STAGES[st] * (geom.height - vp.height));
    // scroll stepwise so MotionDirector's one-stage-at-a-time logic advances
    await page.evaluate(async (y) => {
      const step = 400;
      let cur = window.scrollY;
      while (Math.abs(cur - y) > step) {
        cur += Math.sign(y - cur) * step;
        window.scrollTo(0, cur);
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      }
      window.scrollTo(0, y);
    }, target);
    // let population/state settle
    await page.waitForTimeout(REDUCED ? 700 : 3500);
    const stage = await page.evaluate(
      () => document.getElementById('showcase').dataset.stage
    );
    await page.screenshot({ path: `${OUT}/s${st}-${vp.name}.png` });
    console.log(`${OUT}/s${st}-${vp.name}.png  data-stage=${stage}`);
  }
  await ctx.close();
}
await browser.close();
console.log('done');

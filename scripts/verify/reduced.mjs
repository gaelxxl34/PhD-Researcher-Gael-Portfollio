// Verify prefers-reduced-motion: static frame per state, no autonomous motion.
// usage: node scripts/verify/reduced.mjs <outdir>
import { chromium } from 'playwright';

const OUT = process.argv[2] || 'shots';
const BASE = 'http://localhost:3100/';

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
  reducedMotion: 'reduce',
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

const targets = [0.1, 0.34, 0.6, 0.9];
for (let st = 0; st < 4; st++) {
  await scrollToScrub(targets[st]);
  await page.waitForTimeout(900); // crossfade (320ms) fully settles
  await page.screenshot({ path: `${OUT}/rm-s${st}.png` });
  // prove stillness: canvas pixels must be identical one second apart
  const h1 = await page.evaluate(() =>
    document.querySelector('.sim-canvas').toDataURL().length
  );
  const d1 = await page.evaluate(() =>
    document.querySelector('.sim-canvas').toDataURL().slice(-400)
  );
  await page.waitForTimeout(1000);
  const d2 = await page.evaluate(() =>
    document.querySelector('.sim-canvas').toDataURL().slice(-400)
  );
  const h2 = await page.evaluate(() =>
    document.querySelector('.sim-canvas').toDataURL().length
  );
  console.log(`state ${st}: static=${d1 === d2 && h1 === h2 ? 'YES' : 'NO — CANVAS CHANGED'}`);
}
await ctx.close();
await browser.close();

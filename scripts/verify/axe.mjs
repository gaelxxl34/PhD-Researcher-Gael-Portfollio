// Axe accessibility scan — fail on serious/critical violations.
// usage: node scripts/verify/axe.mjs
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto('http://localhost:3100/', { waitUntil: 'networkidle' });
// scroll through so lazy content mounts
await page.evaluate(async () => {
  for (let y = 0; y < document.body.scrollHeight; y += 600) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 40));
  }
  window.scrollTo(0, 0);
});
const results = await new AxeBuilder({ page }).analyze();
const serious = results.violations.filter((v) => ['serious', 'critical'].includes(v.impact));
for (const v of results.violations) {
  console.log(`${v.impact}: ${v.id} — ${v.help} (${v.nodes.length} nodes)`);
  for (const n of v.nodes.slice(0, 3)) console.log(`   ${n.target}`);
}
console.log(`total violations: ${results.violations.length}, serious/critical: ${serious.length}`);
process.exit(serious.length ? 1 : 0);

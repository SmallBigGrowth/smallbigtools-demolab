// "web" demo: Datawrapper builds a chart from its own example data, no account needed.
// Every web script records into out/ (Playwright writes a .webm; the workflow converts it to out/demo.mp4).
import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2, recordVideo: { dir: 'out', size: { width: 860, height: 1864 } } });
const p = await ctx.newPage();
const pause = (ms) => p.waitForTimeout(ms);
await p.goto('https://app.datawrapper.de/create/chart', { waitUntil: 'networkidle', timeout: 60000 });
await pause(800);
await p.getByRole('button', { name: 'Reject non-essential' }).click().catch(() => {});
await pause(800);
const sel = p.locator('select').first();
await sel.scrollIntoViewIfNeeded(); await pause(600);
await sel.selectOption({ index: 1 }); await pause(1500);
await p.getByRole('button', { name: 'Proceed' }).first().click(); await p.waitForLoadState('networkidle'); await pause(2000);
await p.getByRole('button', { name: /Proceed/ }).first().click(); await p.waitForLoadState('networkidle'); await pause(2500);
// Scroll down to the finished chart and hold on it
for (let i = 0; i < 6; i++) { await p.mouse.wheel(0, 300); await pause(250); }
await pause(3000);
await ctx.close(); await b.close();

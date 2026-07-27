// Frame-exact capture of .intro.html -> PNG sequence (deterministic, no dropped frames)
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const FPS = 30;
const DURATION_MS = 15760;   // song is 14.785 s; hold ~1 s after the final kick
const FRAMES = Math.round((DURATION_MS / 1000) * FPS);
const VERT = !!process.env.VERT;              // VERT=1 -> 1080x1920 for Reels
const W = VERT ? 1080 : 1920, H = VERT ? 1920 : 1080;

const HERE = process.cwd();
const FRAMEDIR = process.env.FRAMEDIR || (VERT ? '/tmp/voltdrop-frames-v' : '/tmp/voltdrop-frames');
fs.rmSync(FRAMEDIR, { recursive: true, force: true });
fs.mkdirSync(FRAMEDIR, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const page = await ctx.newPage();

const url = 'file://' + encodeURI(path.join(HERE, '.intro.html')) + (VERT ? '?v=1' : '');
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__ready === true);
// make sure the logo bitmap is decoded before frame 0
await page.evaluate(() => Promise.all([...document.images].map(i => i.decode().catch(() => {}))));

for (let f = 0; f < FRAMES; f++) {
  const t = (f / FPS) * 1000;
  await page.evaluate((ms) => window.__render(ms), t);
  await page.screenshot({
    path: path.join(FRAMEDIR, String(f).padStart(4, '0') + '.png'),
    animations: 'disabled',
  });
  if (f % 30 === 0) console.log(`frame ${f}/${FRAMES}`);
}

await browser.close();
console.log(`done: ${FRAMES} frames in ${FRAMEDIR}`);

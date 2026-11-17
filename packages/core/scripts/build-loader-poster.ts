/**
 * pnpm poster: first frame of the 3D map, without any interface, for the loading screen (#258).
 * Builds the app, serves it, opens it with the initial view (`homePose3D`) and saves two WebP
 * posters, wide (1440 x 900 at 2x) and tall (390 x 844 at 3x), in src/assets/loader-poster-{wide,tall}.webp.
 * Also writes src/assets/loader-poster.json with the South Pole's place on the screen, in percent,
 * where the colour of the poster starts to grow. Run it again when the initial view, the relief or
 * the painted style change (docs/diseno/pantalla-carga.md).
 *
 * The browser is Chromium drawing WebGL with SwiftShader (CPU): slower, but the same on every machine.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { INTRO_KEY } from '../src/storage.ts';

const assets = fileURLToPath(new URL('../src/assets/', import.meta.url));
const appDir = fileURLToPath(new URL('../../../apps/dibujado/', import.meta.url));
const PORT = Number(process.env.POSTER_PORT) || 5123;
const MAX_BYTES = 450 * 1024;

const VARIANTS = [
  { name: 'wide', viewport: { width: 1440, height: 900 }, scale: 2 },
  { name: 'tall', viewport: { width: 390, height: 844 }, scale: 3 },
] as const;

const chromiumPath =
  process.env.CHROMIUM_PATH ?? ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome'].find(existsSync);

/** Shrinks the quality until the file fits; a still too big one is saved at the lowest quality. */
async function toWebp(png: Buffer): Promise<Buffer> {
  let out = png;
  for (const quality of [92, 88, 84, 80, 76, 72, 66]) {
    out = await sharp(png).webp({ quality, effort: 6 }).toBuffer();
    if (out.length <= MAX_BYTES) return out;
  }
  return out;
}

async function main() {
  const built = spawnSync('pnpm', ['build'], { cwd: appDir, stdio: 'inherit' });
  if (built.status !== 0) throw new Error('build failed');
  const server = spawn('pnpm', ['preview', '--port', String(PORT), '--strictPort'], { cwd: appDir, stdio: 'ignore', detached: true });
  const stop = () => {
    try { process.kill(-server.pid!, 'SIGTERM'); } catch { /* already gone */ }
  };
  const url = `http://localhost:${PORT}/`;
  const browser = await chromium.launch({ executablePath: chromiumPath });
  try {
    for (let i = 0; ; i++) {
      try { if ((await fetch(url)).ok) break; } catch { /* not up yet */ }
      if (i > 100) throw new Error(`preview did not start on ${url}`);
      await new Promise((r) => setTimeout(r, 200));
    }
    const pole: Record<string, { x: number; y: number }> = {};
    for (const v of VARIANTS) {
      const context = await browser.newContext({ viewport: v.viewport, deviceScaleFactor: v.scale, reducedMotion: 'reduce' });
      await context.addInitScript((key) => localStorage.setItem(key, '1'), INTRO_KEY);
      const page = await context.newPage();
      await page.goto(url);
      await page.waitForFunction(() => Boolean((window as unknown as { __cameraControls?: unknown }).__cameraControls), null, { timeout: 90_000 });
      await page.locator('.ld').waitFor({ state: 'detached', timeout: 90_000 });
      await page.waitForTimeout(3000);
      const at = await page.evaluate(() => {
        const el = document.querySelector('.vp [data-key="polo"]');
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: ((r.left + r.width / 2) / innerWidth) * 100, y: ((r.top + r.height / 2) / innerHeight) * 100 };
      });
      if (!at) throw new Error(`${v.name}: the South Pole marker is not on the screen`);
      pole[v.name] = { x: Math.round(at.x * 10) / 10, y: Math.round(at.y * 10) / 10 };
      // Only the canvas stays: a hidden parent does not hide a child that sets `visibility: visible`.
      await page.addStyleTag({ content: '* { visibility: hidden !important } canvas { visibility: visible !important }' });
      const webp = await toWebp(await page.screenshot({ type: 'png' }));
      writeFileSync(`${assets}loader-poster-${v.name}.webp`, webp);
      console.log(`${v.name}: ${(webp.length / 1024).toFixed(0)} KB, pole at ${pole[v.name]!.x}% ${pole[v.name]!.y}%`);
      await context.close();
    }
    writeFileSync(`${assets}loader-poster.json`, `${JSON.stringify(pole, null, 2)}\n`);
  } finally {
    await browser.close();
    stop();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

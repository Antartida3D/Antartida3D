import { defineConfig, devices } from '@playwright/test';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromiumPath } from './browser.ts';
import { GPU_ARGS } from './gpu.ts';
import { APPS, type AppName } from './ports.ts';
import { welcomeSeen } from './storage.ts';

// Run from an app folder (`pnpm e2e`) or repository root: default to `dibujado`.
const folder = basename(process.cwd());
const app: AppName = (folder in APPS ? folder : 'dibujado') as AppName;
const appDir = folder in APPS ? process.cwd() : resolve(process.cwd(), 'apps', app);
// Optional, for local runs (#87). Unset, nothing changes: SwiftShader, one worker, the app port.
// E2E_PORT: another port, so a `pnpm dev` of another branch on the default port is not reused by mistake.
const port = Number(process.env.E2E_PORT) || APPS[app];
// E2E_GPU=1: draw WebGL with the real GPU instead of SwiftShader (CPU).
const gpu = process.env.E2E_GPU === '1';
// E2E_WORKERS: parallel workers, only with E2E_GPU=1: each SwiftShader worker takes 7 to 9 cores and with 4
// of them the 3D map drag test runs out of time.
const workers = Number(process.env.E2E_WORKERS) || 1;

export default defineConfig({
  testDir: fileURLToPath(new URL('./tests', import.meta.url)),
  outputDir: `${appDir}/test-results`,
  fullyParallel: false,
  workers,
  globalSetup: gpu ? fileURLToPath(new URL('./gpu-check.ts', import.meta.url)) : undefined,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${port}`,
    // The first-visit flow (#256, #258) already seen: tests start from the overview of the map.
    storageState: welcomeSeen(`http://localhost:${port}`),
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    launchOptions: { executablePath: chromiumPath, args: gpu ? GPU_ARGS : [] },
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    {
      name: 'mobile-compact',
      testMatch: /(orcadas.*|expedition-order)\.spec\.ts/,
      use: { ...devices['Pixel 7'], viewport: { width: 360, height: 740 } },
    },
    {
      name: 'mobile-landscape',
      testMatch: /(orcadas.*|expedition-order)\.spec\.ts/,
      use: { ...devices['Pixel 7'], viewport: { width: 844, height: 390 } },
    },
  ],
  webServer: {
    command: `pnpm build && pnpm preview --port ${port}`,
    cwd: appDir,
    url: `http://localhost:${port}`,
    reuseExistingServer: true,
    timeout: 180_000,
  },
});

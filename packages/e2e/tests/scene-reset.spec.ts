import { expect, test, type Page } from '@playwright/test';
import { LIST_BUTTON_LABEL } from '../../core/src/content/points.ts';
import { THWAITES_SCENE } from '../../core/src/content/thwaites-scene.ts';
import { SCENE_START_LABEL } from '../../core/src/scene-points.ts';
import { clearStorage } from '../storage.ts';
import { show3D } from './map-helpers.ts';
import { openOrcadasFromMap } from './orcadas-helpers.ts';
import { mockOpenMeteo } from './weather-helpers.ts';

// #333: after a tap on a point of interest the camera flies to it; «Vista general» brings it back.

type CameraGlobal = '__orcadasCamera' | '__marambioCamera' | '__scenePointCamera';
const RESET = 'Vista general';

let consoleErrors: string[] = [];

test.beforeEach(async ({ page }) => {
  consoleErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => consoleErrors.push(e.message));
  await mockOpenMeteo(page);
  await page.goto('/');
  await clearStorage(page);
  await page.reload();
});

test.afterEach(() => {
  expect(consoleErrors, 'console errors').toEqual([]);
});

const target = (page: Page, cam: CameraGlobal) =>
  page.evaluate((name) => {
    const t = (window as unknown as Record<string, { getTarget: () => { x: number; y: number; z: number } }>)[name].getTarget();
    return [t.x, t.y, t.z];
  }, cam);

// The scenes render on demand, so the controls may never report rest: wait until the target stops changing.
async function settledTarget(page: Page, cam: CameraGlobal) {
  let last = JSON.stringify(await target(page, cam));
  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(150);
    const now = JSON.stringify(await target(page, cam));
    if (now === last) return JSON.parse(now) as number[];
    last = now;
  }
  throw new Error(`${cam} never settled`);
}

const gap = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

async function expectResetBringsBack(page: Page, cam: CameraGlobal, dot: string) {
  const entry = await settledTarget(page, cam);
  await page.getByRole('button', { name: `Punto de interés: ${dot}` }).click();
  const near = await settledTarget(page, cam);
  expect(gap(near, entry), 'the tap moved the camera to the point').toBeGreaterThan(1);

  const reset = page.getByRole('button', { name: RESET });
  await expect(reset).toBeVisible();
  await reset.click();
  const back = await settledTarget(page, cam);
  expect(gap(back, entry), 'the camera is back on the entry view').toBeLessThan(0.05);
  // The page never scrolls sideways.
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

test('Orcadas: after tapping the Abrigo, «Vista general» brings the camera back', async ({ page }) => {
  await openOrcadasFromMap(page);
  await page.waitForFunction(
    () => (window as unknown as { __orcadasArrival?: { done: boolean } }).__orcadasArrival?.done === true
  );
  await expectResetBringsBack(page, '__orcadasCamera', 'Abrigo meteorológico');
});

test('Marambio: after tapping a point, «Vista general» shows the whole base again', async ({ page }) => {
  await page.getByRole('button', { name: LIST_BUTTON_LABEL }).click();
  await page.getByRole('dialog', { name: 'Todos los puntos' }).getByRole('button', { name: /Base Marambio/ }).click();
  await page.getByRole('button', { name: 'Comenzar expedición' }).click();
  await page.waitForFunction(() => (window as unknown as { __marambioReady?: boolean }).__marambioReady === true);
  await expectResetBringsBack(page, '__marambioCamera', 'Hércules C-130');
  // The panel stays on the tapped point.
  await expect(page.locator('.mar').getByRole('heading', { level: 2, name: 'Hércules C-130' })).toBeVisible();
});

test('A scene point: after tapping a spot, «Vista general» goes back to the opening view', async ({ page }) => {
  await show3D(page);
  await page.getByRole('button', { name: LIST_BUTTON_LABEL }).click();
  await page.getByRole('dialog', { name: 'Todos los puntos' }).getByRole('button', { name: new RegExp(THWAITES_SCENE.title) }).click();
  await page.getByRole('button', { name: SCENE_START_LABEL }).click();
  await page.waitForFunction(() => (window as unknown as { __scenePointReady?: boolean }).__scenePointReady === true);
  await expectResetBringsBack(page, '__scenePointCamera', THWAITES_SCENE.spots[1].label);
});

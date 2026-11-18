import { expect, test, type Page } from '@playwright/test';
import { clearStorage } from '../storage.ts';
import { mockOpenMeteo } from './weather-helpers.ts';
import { show3D } from './map-helpers.ts';
import { LIST_BUTTON_LABEL, PONCHO_POINT } from '../../core/src/content/points.ts';

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
  expect(consoleErrors, 'console errors (hydration mismatches, exceptions)').toEqual([]);
});

/** Distance of the camera once it stopped moving. */
async function settledDistance(page: Page) {
  await page.waitForFunction(
    () => {
      (window as any).__invalidate();
      return !(window as any).__cameraControls.active;
    },
    null,
    { timeout: 10_000 },
  );
  return page.evaluate(() => (window as any).__cameraControls.distance as number);
}

test('while travelling the camera cannot back off as far as the overview, and can again after the trip (#167)', async ({ page, isMobile }) => {
  test.setTimeout(90_000);
  await show3D(page);
  await page.waitForFunction(() => (window as any).__cameraControls && (window as any).__invalidate);
  const overview = await settledDistance(page);

  await page.getByRole('button', { name: LIST_BUTTON_LABEL }).click();
  await page.getByRole('dialog', { name: 'Todos los puntos' }).getByRole('button', { name: /Desde Ushuaia/ }).click();
  await page.getByRole('group', { name: 'Medio de transporte' }).getByRole('button', { name: /Irízar/ }).click();
  await page.getByRole('button', { name: 'Zarpar' }).click();
  await page.getByRole('button', { name: 'Próximo hito', exact: true }).click();

  // The trip's farthest zoom (voyageMaxDistance3D, unit-tested in core): far less than the overview.
  const far = await page.evaluate(() => (window as any).__cameraControls.maxDistance as number);
  expect(far).toBeLessThan(overview / 3);

  const map = page.getByRole('application', { name: /Mapa en relieve 3D/ });
  const box = (await map.boundingBox())!;
  // The keys stop at the trip's farthest zoom.
  await map.focus();
  for (let i = 0; i < 8; i++) await page.keyboard.press('-');
  expect(await settledDistance(page)).toBeCloseTo(far, 0);

  // So does the wheel. On the phone layout the rings of the animals near the ship take it.
  if (!isMobile) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 3);
    for (let i = 0; i < 30; i++) await page.mouse.wheel(0, 400);
    expect(await settledDistance(page)).toBeCloseTo(far, 0);
  }

  // After the trip the whole map can be seen again.
  await page.getByRole('button', { name: 'Salir del viaje' }).click();
  await expect(page.getByRole('button', { name: 'Próximo hito', exact: true })).toHaveCount(0);
  await map.focus();
  for (let i = 0; i < 8; i++) await page.keyboard.press('-');
  expect(await settledDistance(page)).toBeGreaterThan(far * 2);
});

test('leaving a trip puts the camera back on the overview of the whole map, not on the ship', async ({ page }) => {
  test.setTimeout(90_000);
  await show3D(page);
  await page.waitForFunction(() => (window as any).__cameraControls && (window as any).__invalidate);
  const overview = await settledDistance(page);

  await page.getByRole('button', { name: LIST_BUTTON_LABEL }).click();
  await page.getByRole('dialog', { name: 'Todos los puntos' }).getByRole('button', { name: /Desde Ushuaia/ }).click();
  await page.getByRole('group', { name: 'Medio de transporte' }).getByRole('button', { name: /Irízar/ }).click();
  await page.getByRole('button', { name: 'Zarpar' }).click();
  await page.getByRole('button', { name: 'Próximo hito', exact: true }).click();
  // The camera followed the ship down.
  expect(await settledDistance(page)).toBeLessThan(overview / 3);

  await page.getByRole('button', { name: 'Salir del viaje' }).click();
  await expect(page.getByRole('button', { name: 'Próximo hito', exact: true })).toHaveCount(0);
  // The camera starts moving after the trip closes, so poll instead of reading once.
  await expect.poll(async () => settledDistance(page), { timeout: 15_000 }).toBeGreaterThan(overview * 0.9);
});

test('opening Poncho brings the camera down to Base Esperanza, where the trip leaves from (#255)', async ({ page }) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.reload();
  await show3D(page);
  await page.waitForFunction(() => (window as any).__cameraControls && (window as any).__invalidate);
  await settledDistance(page);

  await page.getByRole('button', { name: LIST_BUTTON_LABEL }).click();
  await page.getByRole('dialog', { name: 'Todos los puntos' }).getByRole('button', { name: /Poncho/ }).click();
  await expect(page.getByRole('heading', { name: 'Poncho, perro polar argentino' })).toBeVisible();

  // The point looked at, in map units: Base Esperanza, not the middle of the map the overview looked at.
  await settledDistance(page);
  const target = await page.evaluate(() => {
    const cc = (window as any).__cameraControls;
    const t = cc.getTarget(new cc.camera.position.constructor());
    return { x: t.x + 500, y: t.z + 500 };
  });
  expect(Math.hypot(target.x - PONCHO_POINT.x, target.y - PONCHO_POINT.y)).toBeLessThan(15);
});

test('with motion, setting off the camera comes all the way down to the ship, past the farthest zoom of the trip (#181)', async ({ page }) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.reload();
  await show3D(page);
  await page.waitForFunction(() => (window as any).__cameraControls && (window as any).__invalidate);
  await settledDistance(page);

  await page.getByRole('button', { name: LIST_BUTTON_LABEL }).click();
  await page.getByRole('dialog', { name: 'Todos los puntos' }).getByRole('button', { name: /Desde Ushuaia/ }).click();
  await page.getByRole('group', { name: 'Medio de transporte' }).getByRole('button', { name: /Irízar/ }).click();
  await page.getByRole('button', { name: 'Zarpar' }).click();

  // The departure view, close and low over the Beagle Channel: once there it is far closer than the trip's limit.
  await expect(async () => {
    const d = await settledDistance(page);
    expect(d).toBeLessThan(30);
  }).toPass({ timeout: 20_000 });
});

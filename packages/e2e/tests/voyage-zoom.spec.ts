import { expect, test, type Page } from '@playwright/test';
import { clearStorage } from '../storage.ts';

let consoleErrors: string[] = [];

test.beforeEach(async ({ page }) => {
  consoleErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => consoleErrors.push(e.message));
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
  const relief = page.getByRole('group', { name: 'Modo de vista' }).getByRole('button', { name: 'Relieve 3D' });
  if ((await relief.getAttribute('aria-pressed')) !== 'true') await relief.click();
  await page.waitForFunction(() => (window as any).__cameraControls && (window as any).__invalidate);
  const overview = await settledDistance(page);

  await page.getByRole('button', { name: 'Ver como lista' }).click();
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

test('with motion, setting off the camera comes all the way down to the ship, past the farthest zoom of the trip (#181)', async ({ page }) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.reload();
  const relief = page.getByRole('group', { name: 'Modo de vista' }).getByRole('button', { name: 'Relieve 3D' });
  if ((await relief.getAttribute('aria-pressed')) !== 'true') await relief.click();
  await page.waitForFunction(() => (window as any).__cameraControls && (window as any).__invalidate);
  await settledDistance(page);

  await page.getByRole('button', { name: 'Ver como lista' }).click();
  await page.getByRole('dialog', { name: 'Todos los puntos' }).getByRole('button', { name: /Desde Ushuaia/ }).click();
  await page.getByRole('group', { name: 'Medio de transporte' }).getByRole('button', { name: /Irízar/ }).click();
  await page.getByRole('button', { name: 'Zarpar' }).click();

  // The departure view, close and low over the Beagle Channel: once there it is far closer than the trip's limit.
  await expect(async () => {
    const d = await settledDistance(page);
    expect(d).toBeLessThan(30);
  }).toPass({ timeout: 20_000 });
});

import { expect, test } from '@playwright/test';
import { clearStorage } from '../storage.ts';
import { mockOpenMeteo } from './weather-helpers.ts';
import { show3D } from './map-helpers.ts';

let consoleErrors: string[] = [];

test.beforeEach(async ({ page }) => {
  consoleErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => consoleErrors.push(e.message));
  await mockOpenMeteo(page);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await clearStorage(page);
  await page.reload();
});

test.afterEach(() => {
  expect(consoleErrors, 'console errors (hydration mismatches, exceptions)').toEqual([]);
});

test('holding «avanzar» the trip picks up speed little by little up to ×4, and lets it go when released (#166)', async ({ page }) => {
  test.setTimeout(90_000);
  await show3D(page);
  await expect(page.locator('canvas').first()).toBeVisible();
  await page.getByRole('button', { name: 'Ver como lista' }).click();
  await page.getByRole('dialog', { name: 'Todos los puntos' }).getByRole('button', { name: /Desde Ushuaia/ }).click();
  await page.getByRole('group', { name: 'Medio de transporte' }).getByRole('button', { name: /Irízar/ }).click();
  await page.getByRole('button', { name: 'Zarpar' }).click();

  const hold = page.getByRole('button', { name: 'Mantené para avanzar' });
  const badge = hold.locator('.vgear');
  // The old tip about tapping twice is gone: nothing to learn to go faster.
  await expect(page.getByText(/Tocá el botón dos veces/)).toHaveCount(0);
  await expect(badge).toBeHidden();

  await hold.hover();
  await page.mouse.down();
  // It sets off at ×1, with no badge, and climbs by half steps.
  await expect(badge).toBeVisible({ timeout: 10_000 });
  await expect(badge).toHaveText(/^×(1,5|2|2,5|3|3,5|4)$/);
  await expect(badge).toHaveText('×4', { timeout: 15_000 });
  await page.mouse.up();
  await expect(badge).toBeHidden();
});

test('from farther the trip goes faster, so it does not crawl on the screen (#168)', async ({ page }) => {
  test.setTimeout(90_000);
  await show3D(page);
  await expect(page.locator('canvas').first()).toBeVisible();
  await page.getByRole('button', { name: 'Ver como lista' }).click();
  await page.getByRole('dialog', { name: 'Todos los puntos' }).getByRole('button', { name: /Desde Ushuaia/ }).click();
  await page.getByRole('group', { name: 'Medio de transporte' }).getByRole('button', { name: /Irízar/ }).click();
  await page.getByRole('button', { name: 'Zarpar' }).click();

  const hold = page.getByRole('button', { name: 'Mantené para avanzar' });
  const trip = page.locator('.vtrip');
  /** Camera distance once it stopped moving. */
  const settled = async () => {
    await page.waitForFunction(() => {
      (window as any).__invalidate();
      return !(window as any).__cameraControls.active;
    }, null, { timeout: 10_000 });
    return page.evaluate(() => (window as any).__cameraControls.distance as number);
  };
  const km = async () => Number((/≈ ([\d.]+) de/.exec((await trip.textContent()) ?? '') ?? ['', '0'])[1].replace(/\./g, ''));
  /** Km travelled holding «avanzar» a second and a half, once the vehicle came to rest. */
  const leg = async () => {
    const before = await km();
    await hold.hover();
    await page.mouse.down();
    await page.waitForTimeout(1500);
    await page.mouse.up();
    // Let it coast to a stop.
    await page.waitForTimeout(1500);
    return (await km()) - before;
  };

  // Up close: zoomed all the way in on the ship.
  await page.waitForFunction(() => (window as any).__cameraControls && (window as any).__invalidate);
  const map = page.getByRole('application', { name: /Mapa en relieve 3D/ });
  await map.focus();
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('+');
    await settled();
  }
  const close = await settled();
  const near = await leg();
  expect(near).toBeGreaterThan(0);

  // Far away: the same press goes several times as far.
  await map.focus();
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('-');
    await settled();
  }
  expect(await settled()).toBeGreaterThan(close * 4);
  const far = await leg();
  expect(far).toBeGreaterThan(near * 2);
});

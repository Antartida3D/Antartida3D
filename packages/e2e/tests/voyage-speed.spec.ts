import { expect, test } from '@playwright/test';
import { clearStorage } from '../storage.ts';
import { mockOpenMeteo } from './weather-helpers.ts';

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
  const relief = page.getByRole('group', { name: 'Modo de vista' }).getByRole('button', { name: 'Relieve 3D' });
  if ((await relief.getAttribute('aria-pressed')) !== 'true') await relief.click();
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

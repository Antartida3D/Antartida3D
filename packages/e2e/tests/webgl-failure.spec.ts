import { expect, test, type Page } from '@playwright/test';
import { mockOpenMeteo } from './weather-helpers.ts';

// No check of console errors here: three.js and React both report the failure this file forces.

/**
 * WebGL passes the check of the start, done on a canvas out of the page, and fails on every canvas
 * of the page. It is what a browser does when it refuses a context after the app started (#242).
 */
async function failCanvasWebGL(page: Page) {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      if (/webgl/.test(type) && this.isConnected) return null;
      return (original as (...a: unknown[]) => unknown).call(this, type, ...rest);
    } as typeof original;
  });
}

test.beforeEach(async ({ page }) => {
  await mockOpenMeteo(page);
  await failCanvasWebGL(page);
});

const notice = (page: Page) => page.getByRole('alert').filter({ hasText: 'No pudimos mostrar el 3D en este dispositivo' });

test('a 3D map that cannot create its canvas leaves a notice and a usable app, not a blank page (#242)', async ({ page }) => {
  await page.goto('/');

  const alert = notice(page);
  await expect(alert).toBeVisible({ timeout: 15_000 });
  await expect(alert).toContainText('Recargá la página');
  await expect(alert).toContainText('otro navegador');
  // The notice does not go out of the screen.
  const box = (await alert.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);

  // The rest of the app is there: the header and the map, with the button that tells the 3D relief is off.
  // On a phone the title is there for a screen reader only, so the exploration log stands for the header.
  await expect(page.getByRole('heading', { level: 1, name: 'Antártida por descubrir' })).toHaveCount(1);
  await expect(page.locator('.top .reg')).toBeVisible();
  await expect(page.locator('.stage:not(.m3d)')).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Relieve 3D apagado: ver cómo activarlo' })).toBeVisible();

  // The keyboard reaches its buttons: the main one, to reload, is the last.
  await expect(alert.getByRole('button')).toHaveText(['Entendido', 'Recargar la página']);
  await alert.getByRole('button', { name: 'Entendido' }).focus();
  // With the focus in the notice, Escape closes it, like «Entendido».
  await page.keyboard.press('Escape');
  await expect(alert).toHaveCount(0);

  // The app goes on working.
  await page.getByRole('button', { name: 'Ver como lista' }).click();
  await expect(page.getByRole('dialog', { name: 'Todos los puntos' })).toBeVisible();
});

test('«Recargar la página» of the notice reloads the app (#242)', async ({ page }) => {
  await page.goto('/');
  const alert = notice(page);
  await expect(alert).toBeVisible({ timeout: 15_000 });
  await Promise.all([page.waitForEvent('load'), alert.getByRole('button', { name: 'Recargar la página' }).click()]);
  // The forced failure is still there after the reload, so the notice comes back.
  await expect(notice(page)).toBeVisible({ timeout: 15_000 });
});

test('a 3D scene of an expedition that cannot create its canvas shows its fallback and the notice (#242)', async ({ page }) => {
  await page.goto('/?expedicion=fosiles');

  await expect(notice(page)).toBeVisible({ timeout: 15_000 });
  // The expedition goes on in photographs, with its panel.
  await expect(page.locator('.fossil-fallback img')).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Siguiente', exact: true })).toBeVisible();
});

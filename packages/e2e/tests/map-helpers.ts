import { expect, type Page } from '@playwright/test';
import { MAP_2D_ENABLED } from '../../core/src/view-mode.ts';

export { MAP_2D_ENABLED };

/** Reason shown for the tests of the 2D map while it is turned off. */
export const NO_2D = 'El mapa 2D está deshabilitado (#227)';

/**
 * Waits until the 3D relief is on screen with the loading screen closed. While the 2D map is on
 * (MAP_2D_ENABLED), the app may start in 2D, so it picks «Relieve 3D» in the view toggle first.
 */
export async function show3D(page: Page) {
  if (MAP_2D_ENABLED) {
    await page.getByRole('group', { name: 'Modo de vista' }).getByRole('button', { name: 'Relieve 3D' }).click();
  }
  await expect(page.locator('section.ld')).toHaveCount(0, { timeout: 60_000 });
  await expect(page.locator('.stage.m3d canvas')).toBeVisible();
}

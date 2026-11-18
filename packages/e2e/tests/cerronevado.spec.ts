import { expect, test } from '@playwright/test';
import { CERRO_NEVADO_SOURCES, CERRO_NEVADO_SPOTS, CERRO_NEVADO_TITLE, cerroNevadoFacts } from '../../core/src/content/cerro-nevado.ts';
import { AVAILABLE_COUNT, LIST_BUTTON_LABEL } from '../../core/src/content/points.ts';
import { SCENE_START_LABEL } from '../../core/src/scene-points.ts';
import { clearStorage } from '../storage.ts';
import { show3D } from './map-helpers.ts';
import { mockOpenMeteo } from './weather-helpers.ts';

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

test('the emperors of Cerro Nevado open a scene of their own on the common screen, and leaving it does not count as an expedition (#206, #310)', async ({ page }) => {
  await show3D(page);
  await page.getByRole('button', { name: LIST_BUTTON_LABEL }).click();
  await page.getByRole('dialog', { name: 'Todos los puntos' }).getByRole('button', { name: new RegExp(CERRO_NEVADO_TITLE) }).click();
  // A point of interest, not an expedition (#280).
  await expect(page.getByRole('button', { name: 'Comenzar expedición' })).toHaveCount(0);
  await page.getByRole('button', { name: SCENE_START_LABEL }).click();
  const scene = page.getByRole('region', { name: CERRO_NEVADO_TITLE });
  await expect(scene).toBeVisible({ timeout: 30_000 });
  // The current temperature, as in every scene of a point of interest (#285).
  await expect(scene.locator('.orc-panel .sheet-temp')).toContainText(/°C/);

  for (const [i, spot] of CERRO_NEVADO_SPOTS.entries()) {
    await expect(scene.getByRole('heading', { level: 2, name: spot.label })).toBeVisible();
    for (const fact of cerroNevadoFacts(spot.id)) await expect(scene.locator('.orc-panel')).toContainText(fact.text);
    if (i < CERRO_NEVADO_SPOTS.length - 1) await scene.getByRole('button', { name: 'Siguiente' }).click();
  }

  // A citation opens the sources, which list every one.
  await scene.locator('.orc-panel .vref').first().click();
  const sources = page.getByRole('dialog', { name: 'Fuentes' });
  for (const s of Object.values(CERRO_NEVADO_SOURCES)) await expect(sources).toContainText(s.label);
  await page.keyboard.press('Escape');

  // A point of the scene opens it; it may be out of the current view, so it is pressed without aiming.
  await scene.getByRole('button', { name: 'Punto de interés: La guardería' }).evaluate((b: HTMLElement) => b.click());
  await expect(scene.getByRole('heading', { level: 2, name: 'La guardería' })).toBeVisible();

  await scene.getByRole('button', { name: 'Volver al mapa' }).first().click();
  await expect(scene).toHaveCount(0);
  await expect(page.locator('.reg')).toContainText(`0/${AVAILABLE_COUNT}`);
  await expect(page.getByRole('button', { name: /^Continuar/ })).toHaveCount(0);
});

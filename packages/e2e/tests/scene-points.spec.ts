import { expect, test } from '@playwright/test';
import { THWAITES_SCENE } from '../../core/src/content/thwaites-scene.ts';
import { VOSTOK_SCENE } from '../../core/src/content/vostok-scene.ts';
import { POLO_SCENE } from '../../core/src/content/polo-scene.ts';
import { BELGRANO_SCENE } from '../../core/src/content/belgrano-scene.ts';
import { TESTIGOS_SCENE } from '../../core/src/content/testigos-scene.ts';
import { sceneFacts } from '../../core/src/content/scene-point.ts';
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

for (const SCENE of [THWAITES_SCENE, VOSTOK_SCENE, POLO_SCENE, BELGRANO_SCENE, TESTIGOS_SCENE]) {
  test(`${SCENE.title} opens a scene of its own, with every fact and source, and leaving it does not count as an expedition (#280, #281, #285, #286, #287, #288)`, async ({ page }) => {
    await show3D(page);
    await page.getByRole('button', { name: LIST_BUTTON_LABEL }).click();
    await page.getByRole('dialog', { name: 'Todos los puntos' }).getByRole('button', { name: new RegExp(SCENE.title) }).click();
    // A point of interest, not an expedition (#280).
    await expect(page.getByRole('button', { name: 'Comenzar expedición' })).toHaveCount(0);
    await page.getByRole('button', { name: SCENE_START_LABEL }).click();
    const scene = page.getByRole('region', { name: SCENE.title });
    await expect(scene).toBeVisible({ timeout: 30_000 });
    // The current temperature of the card, as a model estimate (#22, #285).
    const temp = scene.locator('.orc-panel .sheet-temp');
    await expect(temp).toContainText(/°C/);
    await expect(temp).toContainText('Estimación de modelo (Open-Meteo)');

    for (const [i, spot] of SCENE.spots.entries()) {
      await expect(scene.getByRole('heading', { level: 2, name: spot.label })).toBeVisible();
      for (const fact of sceneFacts(SCENE, spot.id)) await expect(scene.locator('.orc-panel')).toContainText(fact.text);
      if (i < SCENE.spots.length - 1) await scene.getByRole('button', { name: 'Siguiente' }).click();
    }

    await scene.locator('.orc-panel .vref').first().click();
    const sources = page.getByRole('dialog', { name: 'Fuentes' });
    for (const s of SCENE.cited) await expect(sources).toContainText(s.title);
    await page.keyboard.press('Escape');

    await scene.getByRole('button', { name: `Punto de interés: ${SCENE.spots[1].label}` }).evaluate((b: HTMLElement) => b.click());
    await expect(scene.getByRole('heading', { level: 2, name: SCENE.spots[1].label })).toBeVisible();

    await scene.getByRole('button', { name: 'Volver al mapa' }).first().click();
    await expect(scene).toHaveCount(0);
    await expect(page.locator('.reg')).toContainText(`0/${AVAILABLE_COUNT}`);
    await expect(page.getByRole('button', { name: /^Continuar/ })).toHaveCount(0);
  });
}

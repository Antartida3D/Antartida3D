import { expect, test } from '@playwright/test';
import { CERRO_NEVADO_TITLE } from '../../core/src/content/cerro-nevado.ts';
import { AVAILABLE_COUNT, LIST_BUTTON_LABEL, PTS } from '../../core/src/content/points.ts';
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

test('Pingüinos de Cerro Nevado opens a standard info PointSheet and does not count as an expedition', async ({ page }) => {
  const point = PTS.find((p) => p.id === 'cerronevado')!;
  await show3D(page);
  await page.getByRole('button', { name: LIST_BUTTON_LABEL }).click();
  await page.getByRole('dialog', { name: 'Todos los puntos' }).getByRole('button', { name: new RegExp(CERRO_NEVADO_TITLE) }).click();

  const sheet = page.getByRole('dialog', { name: CERRO_NEVADO_TITLE });
  await expect(sheet).toBeVisible();
  await expect(sheet).toContainText('Punto de interés');
  await expect(sheet).toContainText(point.q);
  await expect(sheet).toContainText(point.desc!);
  await expect(sheet.getByRole('button', { name: 'Comenzar expedición' })).toHaveCount(0);
  await expect(sheet.getByRole('button', { name: /^Fuente / }).first()).toBeVisible();

  await sheet.getByRole('button', { name: 'Volver al mapa' }).click();
  await expect(sheet).toHaveCount(0);
  await expect(page.locator('.reg')).toContainText(`0/${AVAILABLE_COUNT}`);
  await expect(page.getByRole('button', { name: /^Continuar/ })).toHaveCount(0);
});

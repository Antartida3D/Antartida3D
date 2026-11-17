import { expect, test } from '@playwright/test';
import { LIST_BUTTON_LABEL, PTS } from '../../core/src/content/points.ts';
import { clearStorage } from '../storage.ts';
import { show3D } from './map-helpers.ts';
import { mockOpenMeteo } from './weather-helpers.ts';

const POINT = PTS.find((p) => p.id === 'cerronevado')!;

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

test('the emperors of Cerro Nevado have their card, sources and illustration note (#206)', async ({ page }) => {
  // On the 3D map the camera goes down to the colony, where an emperor waves; the card shows no small model.
  await show3D(page);
  await page.getByRole('button', { name: LIST_BUTTON_LABEL }).click();
  await page.getByRole('dialog', { name: 'Todos los puntos' }).getByRole('button', { name: /Pingüinos de Cerro Nevado/ }).click();
  const sheet = page.getByRole('dialog', { name: POINT.title });
  await expect(sheet).toContainText(POINT.q);
  await expect(sheet).toContainText(POINT.desc!);
  await expect(sheet).toContainText('el saludo con la aleta es un recurso del dibujo');
  const sources = sheet.getByRole('button', { name: /^Fuentes verificadas/ });
  await sources.click();
  for (const s of POINT.sources!) await expect(sheet.getByRole('link', { name: s.label })).toHaveAttribute('href', s.url);
  await expect(sheet.locator('.vpreview')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(sheet).toHaveCount(0);
});

import { expect, test, type Page } from '@playwright/test';
import { clearStorage } from '../storage.ts';
import { mockOpenMeteo } from './weather-helpers.ts';
import { LIST_BUTTON_LABEL } from '../../core/src/content/points.ts';

let consoleErrors: string[] = [];
let ignoreOpenMeteoAbortLog = false;

test.beforeEach(async ({ page }) => {
  consoleErrors = [];
  ignoreOpenMeteoAbortLog = false;
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    if (
      ignoreOpenMeteoAbortLog &&
      m.location().url.startsWith('https://api.open-meteo.com/') &&
      m.text() === 'Failed to load resource: net::ERR_FAILED'
    ) {
      return;
    }
    consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => consoleErrors.push(e.message));
});

test.afterEach(() => {
  expect(consoleErrors, 'console errors').toEqual([]);
});

async function openPointFromList(page: Page, buttonName: RegExp, sheetName: string) {
  await page.getByRole('button', { name: LIST_BUTTON_LABEL, exact: true }).click();
  await page.getByRole('dialog', { name: 'Todos los puntos' }).getByRole('button', { name: buttonName }).click();
  const sheet = page.getByRole('dialog', { name: sheetName });
  await expect(sheet).toBeVisible();
  return sheet;
}

test('no requests to open-meteo before opening a point sheet', async ({ page }) => {
  const mock = await mockOpenMeteo(page);
  await page.goto('/');
  await clearStorage(page);
  await page.reload();
  await expect(page.getByRole('button', { name: LIST_BUTTON_LABEL, exact: true })).toBeVisible();
  expect(mock.getRequestCount()).toBe(0);
});

test('mocked response shows temperature with unit, model label, and attribution, and caches across multiple sheets', async ({ page }) => {
  const mock = await mockOpenMeteo(page);
  await page.goto('/');
  await clearStorage(page);
  await page.reload();

  const erebus = await openPointFromList(page, /Volcán en el hielo/, 'Volcán en el hielo');
  const tempLine = erebus.locator('.sheet-temp');
  await expect(tempLine).toContainText(/°C/);
  await expect(tempLine).toContainText('Estimación de modelo');
  await expect(erebus.locator('.sheet-temp')).toContainText('Open-Meteo');
  expect(mock.getRequestCount()).toBe(1);

  await page.keyboard.press('Escape');
  await expect(erebus).toHaveCount(0);

  const vostok = await openPointFromList(page, /Un lago bajo el hielo/, 'Un lago bajo el hielo');
  await expect(vostok.locator('.sheet-temp')).toContainText(/°C/);
  await expect(vostok.locator('.sheet-temp')).toContainText('Estimación de modelo');
  expect(mock.getRequestCount()).toBe(1);
});

test('aborted route shows unavailable message with zero console errors', async ({ page }) => {
  ignoreOpenMeteoAbortLog = true;
  await mockOpenMeteo(page, { abort: true });
  await page.goto('/');
  await clearStorage(page);
  await page.reload();

  const erebus = await openPointFromList(page, /Volcán en el hielo/, 'Volcán en el hielo');
  await expect(erebus.locator('.sheet-temp')).toHaveText('Temperatura no disponible ahora');
});

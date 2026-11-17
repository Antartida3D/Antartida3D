import { expect, test, type Page } from '@playwright/test';
import { clearStorage } from '../storage.ts';
import { clickOrcadasMarker } from './orcadas-helpers.ts';
import { mockOpenMeteo } from './weather-helpers.ts';
import { LIST_BUTTON_LABEL } from '../../core/src/content/points.ts';

let consoleErrors: string[] = [];

test.beforeEach(async ({ page }) => {
  consoleErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => consoleErrors.push(e.message));
  await mockOpenMeteo(page);
  // A page before the app, so «back» has somewhere to go and leaving the app shows.
  await page.goto('about:blank');
  await page.goto('/');
  await clearStorage(page);
  await page.reload();
});

test.afterEach(() => {
  expect(consoleErrors, 'console errors (hydration mismatches, exceptions)').toEqual([]);
});

const openList = (page: Page) => page.getByRole('button', { name: LIST_BUTTON_LABEL }).click();
const list = (page: Page) => page.getByRole('dialog', { name: 'Todos los puntos' });
const stillInApp = async (page: Page) => {
  expect(page.url()).not.toBe('about:blank');
  await expect(page.getByRole('button', { name: LIST_BUTTON_LABEL })).toBeVisible();
};
/** Waits until the app has dropped its own history entry after a close done by the interface. */
const historySettled = (page: Page) => page.waitForFunction(() => history.state === null);

test('back closes the list view and stays in the app (#185)', async ({ page }) => {
  await openList(page);
  await expect(list(page)).toBeVisible();
  await page.goBack();
  await expect(list(page)).toBeHidden();
  await stillInApp(page);
});

test('back closes a point sheet opened from the list, not the whole app (#185)', async ({ page }) => {
  await openList(page);
  await list(page).getByRole('button', { name: /Volcán en el hielo/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Volcán en el hielo' });
  await expect(sheet).toBeVisible();
  await page.goBack();
  await expect(sheet).toBeHidden();
  await stillInApp(page);
});

test('back leaves an expedition for the map (#185)', async ({ page }) => {
  await openList(page);
  await list(page).getByRole('button', { name: /Base Marambio/ }).click();
  await expect(page.locator('.mar')).toBeVisible();
  await page.goBack();
  await expect(page.locator('.mar')).toHaveCount(0);
  await stillInApp(page);
});

test('back closes the trip picker of Desde Ushuaia (#185)', async ({ page }) => {
  await openList(page);
  await list(page).getByRole('button', { name: /Desde Ushuaia/ }).click();
  const picker = page.getByRole('group', { name: 'Medio de transporte' });
  await expect(picker).toBeVisible();
  await page.goBack();
  await expect(picker).toBeHidden();
  await stillInApp(page);
});

test('back closes the Orcadas intro (#185)', async ({ page }) => {
  await clickOrcadasMarker(page);
  const intro = page.getByRole('dialog', { name: 'Estación Orcadas' });
  await expect(intro).toBeVisible();
  await page.goBack();
  await expect(intro).toBeHidden();
  await stillInApp(page);
});

test('closing a layer with Escape leaves no stale entry: the next back leaves the app (#185)', async ({ page }) => {
  await openList(page);
  await page.keyboard.press('Escape');
  await expect(list(page)).toBeHidden();
  await historySettled(page);
  await page.goBack();
  await expect.poll(() => page.url()).toBe('about:blank');
});

test('on the map with nothing open, back leaves the app as usual (#185)', async ({ page }) => {
  await page.goBack();
  await expect.poll(() => page.url()).toBe('about:blank');
});

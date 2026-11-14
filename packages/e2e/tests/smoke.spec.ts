import { expect, test, type Page } from '@playwright/test';
import { ORCADAS_GUIDING_QUESTION } from '../../core/src/content/orcadas.ts';

/**
 * Smoke suite (`pnpm e2e:smoke`, #131): each view loads and each expedition starts, with no console
 * errors. It runs before every PR; the full suite (`pnpm e2e`) checks the details before merging.
 */

let consoleErrors: string[] = [];

test.beforeEach(async ({ page }) => {
  consoleErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => consoleErrors.push(e.message));
  await page.goto('/');
});

test.afterEach(() => {
  expect(consoleErrors, 'console errors (exceptions, shader compile errors)').toEqual([]);
});

const viewMode = (page: Page) => page.getByRole('group', { name: 'Modo de vista' });
const list = (page: Page) => page.getByRole('dialog', { name: 'Todos los puntos' });

test('the 2D map loads with its markers', async ({ page }) => {
  await expect(viewMode(page).getByRole('button', { name: 'Mapa 2D' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.vp .mk').first()).toBeVisible();
});

test('the 3D relief loads and draws', async ({ page }) => {
  await viewMode(page).getByRole('button', { name: 'Relieve 3D' }).click();
  await expect(viewMode(page).getByRole('button', { name: 'Relieve 3D' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('canvas')).toBeVisible();
  await page.waitForFunction(() => ((window as unknown as { __frames?: number }).__frames ?? 0) > 0);
  await expect(page.locator('.vp .mk').first()).toBeVisible();
});

test('the list of points and a point sheet open', async ({ page }) => {
  await page.getByRole('button', { name: 'Ver como lista' }).click();
  await expect(list(page)).toBeVisible();
  await list(page).getByRole('button', { name: /Volcán en el hielo/ }).click();
  await expect(page.getByRole('dialog', { name: 'Volcán en el hielo' })).toBeVisible();
});

test('the «Desde Ushuaia» expedition starts', async ({ page }) => {
  await page.getByRole('button', { name: 'Ver como lista' }).click();
  await list(page).getByRole('button', { name: /Desde Ushuaia.*Empezar expedición/ }).click();
  await page.getByRole('group', { name: 'Medio de transporte' }).getByRole('button', { name: /Hércules C-130/ }).click();
  await page.getByRole('button', { name: 'Despegar' }).click();
  await expect(page.locator('.vstep')).toHaveText(/^Hito 1 de/);
});

test('the «Estación Orcadas» expedition starts', async ({ page }) => {
  await page.getByRole('button', { name: 'Ver como lista' }).click();
  await list(page).getByRole('button', { name: /Estación Orcadas.*Empezar expedición/ }).click();
  await expect(page.getByRole('heading', { level: 2, name: ORCADAS_GUIDING_QUESTION })).toBeVisible();
  await page.waitForFunction(() => (window as unknown as { __orcadasReady?: boolean }).__orcadasReady === true);
});

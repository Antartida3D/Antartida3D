import { expect, test, type Page } from '@playwright/test';
import { AVAILABLE_COUNT, LIST_BUTTON_LABEL } from '../../core/src/content/points.ts';
import { MARINE_STOPS } from '../../core/src/content/marine.ts';
import { clearStorage } from '../storage.ts';

const log = (page: Page) => page.locator('.reg');
const expedition = (page: Page) => page.getByRole('region', { name: 'Expedición Océano' });
const next = (page: Page) => page.locator('.marine-next');

let consoleErrors: string[] = [];

test.beforeEach(async ({ page }) => {
  consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push(e.message));
});

test.afterEach(() => {
  expect(consoleErrors, 'console errors (hydration mismatches, exceptions)').toEqual([]);
});

async function openFromList(page: Page) {
  await page.goto('/');
  await clearStorage(page);
  await page.reload();
  await expect(log(page)).toContainText(`0/${AVAILABLE_COUNT}`);
  await page.getByRole('button', { name: LIST_BUTTON_LABEL }).click();
  await page.getByRole('dialog', { name: 'Todos los puntos' }).getByRole('button', { name: /Océano/ }).click();
  await page.getByRole('button', { name: 'Comenzar expedición' }).click();
  await expect(expedition(page)).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: MARINE_STOPS[0].title })).toBeVisible();
}

test('opens Océano from the map, does every observation and completes it', async ({ page }) => {
  await openFromList(page);
  const act = (name: string) => page.getByRole('button', { name, exact: true }).click();
  const status = page.getByRole('status').filter({ hasNotText: /Bajando/ });

  await act('Mirar bajo el hielo');
  await expect(page.locator('.marine-location')).toContainText('Bajo el hielo marino');
  await next(page).click();

  await act('Ampliar lo diminuto');
  await expect(page.locator('.marine-found')).toContainText('Aumento esquemático');
  await next(page).click();

  await act('Resaltar sus conexiones');
  await expect(status).toContainText('jorobada, minke antártica, pingüino emperador y foca leopardo');
  await next(page).click();

  await act('Ver cómo filtra');
  await expect(status).toContainText('entre las barbas');
  await expect(page.locator('.marine-found')).toHaveText('Filtra con barbas');
  await next(page).click();

  await act('Seguir a la minke');
  await expect(page.getByRole('button', { name: 'Dejar de seguirla' })).toHaveAttribute('aria-pressed', 'true');
  await next(page).click();

  await act('Mirar bajo el agua');
  await next(page).click();
  await act('Seguir una inmersión');
  await expect(status).toContainText('vuelve a subir a respirar');
  await next(page).click();

  await expect(page.getByRole('list', { name: 'Alimentos de la foca leopardo en el esquema' })).toContainText('Krill antártico');
  await expect(page.getByRole('list', { name: 'Alimentos de la foca leopardo en el esquema' })).toContainText('Otros pingüinos y focas');
  await next(page).click();

  await act('Comparar barbas y dientes');
  await expect(status).toContainText('tres puntas');
  await next(page).click();

  await act('Ver un ejemplo documentado');
  await expect(status).toContainText('focas de Weddell');
  await next(page).click();

  // The krill highlighted at «Encontrar el krill» is still selected when the web opens.
  await expect(page.getByRole('button', { name: 'Krill antártico', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const links = page.getByRole('list', { name: 'Conexiones de Krill antártico' });
  await expect(links).toContainText('Krill antártico sirve de alimento a jorobada.');
  await expect(links).toContainText('Fitoplancton y algas del hielo sirven de alimento a krill antártico.');
  await act('Orca');
  await expect(page.getByRole('list', { name: 'Conexiones de Orca' })).toContainText('Depende del grupo');
  await next(page).click();

  const checklist = page.getByRole('list', { name: 'Tu registro de la expedición' });
  await expect(checklist).toContainText('Viste filtrar a la jorobada con sus barbas');
  await expect(checklist).toContainText('Seguiste las conexiones de 2 organismos');
  await expect(checklist).toContainText(`Recorriste ${MARINE_STOPS.length} de ${MARINE_STOPS.length} paradas`);
  await page.getByRole('button', { name: /Terminar expedición/ }).click();

  await expect(expedition(page)).toHaveCount(0);
  await expect(log(page)).toContainText(`1/${AVAILABLE_COUNT}`);
  await expect(page.locator('.next-card .next-done')).toHaveText(`Océano quedó explorado. Registro de exploración: 1/${AVAILABLE_COUNT}`);
});

test('the keyboard alone walks every stop, and the sources open and close with Escape', async ({ page }) => {
  await openFromList(page);
  await expect(page.getByRole('heading', { name: MARINE_STOPS[0].title })).toBeFocused();
  for (let i = 1; i < MARINE_STOPS.length; i++) {
    await next(page).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { level: 2, name: MARINE_STOPS[i].title })).toBeFocused();
  }
  await expect(next(page)).toHaveText(/Terminar expedición/);

  const sources = page.getByRole('button', { name: 'Fuentes', exact: true });
  await sources.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Fuentes' });
  await expect(dialog).toContainText('Pitman y Durban');
  await expect(dialog).toContainText('Leído en su resumen');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(sources).toBeFocused();
});

test('leaving with Mapa does not complete the expedition', async ({ page }) => {
  await openFromList(page);
  await next(page).click();
  await page.getByRole('button', { name: 'Volver al mapa' }).click();
  await expect(expedition(page)).toHaveCount(0);
  await expect(log(page)).toContainText(`0/${AVAILABLE_COUNT}`);
});

test('with reduced motion the scene draws and each observation has a still result', async ({ page }) => {
  await page.goto('/?expedicion=oceano');
  await expect(page.locator('.marine-stage canvas[data-ready="true"]')).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Ballenas' }).click();
  await page.getByRole('button', { name: 'Ver cómo filtra', exact: true }).click();
  await expect(page.locator('.marine-steps')).toBeVisible();
  await expect(page.locator('.marine-stage canvas')).toBeVisible();
});

test.describe('with motion allowed', () => {
  test.use({ reducedMotion: 'no-preference' });
  test('the scene keeps animating without errors', async ({ page }) => {
    await page.goto('/?expedicion=oceano');
    await expect(page.locator('.marine-stage canvas[data-ready="true"]')).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: 'Orcas' }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Una familia, distintas dietas' })).toBeVisible();
    await page.waitForTimeout(1500);
  });
});

test('without WebGL the tour and its interactions work in words and a drawn web', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      return /webgl/.test(type) ? null : (original as (...a: unknown[]) => unknown).call(this, type, ...rest);
    } as typeof original;
  });
  await openFromList(page);
  await expect(page.locator('.marine-stage canvas')).toHaveCount(0);
  await expect(page.locator('.marine-fallback')).toContainText('Témpanos de hielo marino');
  await page.getByRole('button', { name: 'Conectar' }).click();
  await expect(page.getByRole('img', { name: /Esquema de la red alimentaria/ })).toBeVisible();
  await page.getByRole('button', { name: 'Foca leopardo', exact: true }).click();
  await expect(page.getByRole('list', { name: 'Conexiones de Foca leopardo' })).toContainText('Peces sirven de alimento a foca leopardo.');
  await next(page).click();
  await page.getByRole('button', { name: /Terminar expedición/ }).click();
  await expect(log(page)).toContainText(`1/${AVAILABLE_COUNT}`);
});

test('has no horizontal scroll inside the expedition', async ({ page }) => {
  await page.goto('/?expedicion=oceano');
  await expect(expedition(page)).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

import { expect, test, type Page } from '@playwright/test';
import { AVAILABLE_COUNT, LIST_BUTTON_LABEL } from '../../core/src/content/points.ts';
import { MARINE_CHAPTERS, MARINE_STOPS } from '../../core/src/content/marine.ts';
import { clearStorage } from '../storage.ts';

const log = (page: Page) => page.locator('.reg');
const expedition = (page: Page) => page.getByRole('region', { name: 'Expedición Océano' });
const next = (page: Page) => page.locator('.marine-next');

/** From the opening stop, goes to a chapter: by its button on a wide screen; a phone has no chapter bar and walks there with «Siguiente». */
async function toChapter(page: Page, label: string) {
  const button = page.getByRole('button', { name: label });
  if (await button.isVisible()) return button.click();
  const chapter = MARINE_CHAPTERS.find((c) => c.label === label)!.id;
  // One more press than stops: the first one looks under the ice.
  for (let i = 0; i <= MARINE_STOPS.findIndex((s) => s.chapter === chapter); i++) await next(page).click();
}

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

  // The first «Siguiente» looks under the ice; the next one goes on.
  await next(page).click();
  await expect(page.locator('.marine-location')).toContainText('Bajo el hielo marino');
  await next(page).click();

  await act('Aumentar tamaño');
  await expect(page.locator('.marine-found')).toContainText('Aumento esquemático');
  await next(page).click();

  // The krill stop says who eats it, with no button.
  await expect(expedition(page)).toContainText('jorobada, minke antártica, pingüino emperador y foca leopardo');
  await next(page).click();

  // The humpback filters as soon as its stop opens.
  await expect(page.locator('.marine-steps')).toContainText('entre las barbas');
  await expect(page.locator('.marine-found')).toHaveText('Filtra con barbas');
  await next(page).click();

  // The camera follows the minke with no button.
  await expect(page.getByRole('button', { name: /Seguir a la minke|Dejar de seguirla/ })).toHaveCount(0);
  await next(page).click();

  // As in the first stop, the first «Siguiente» of the emperor stop looks under the water.
  await expect(next(page)).toHaveText('Mirar bajo el agua');
  await next(page).click();
  await expect(page.locator('.marine-location')).toContainText('Bajo el hielo marino');
  await next(page).click();
  // The camera follows the dive with no button.
  await expect(page.getByRole('button', { name: /Seguir una inmersión/ })).toHaveCount(0);
  await expect(page.locator('.marine-observation')).toContainText('vuelve a subir a respirar');
  await next(page).click();

  await expect(page.getByRole('list', { name: 'Alimentos de la foca leopardo en el esquema' })).toContainText('Krill antártico');
  await expect(page.getByRole('list', { name: 'Alimentos de la foca leopardo en el esquema' })).toContainText('Otros pingüinos y focas');
  await next(page).click();

  // The teeth stop has no comparison button any more.
  await expect(page.getByRole('button', { name: 'Comparar barbas y dientes' })).toHaveCount(0);
  await next(page).click();

  // The first «Siguiente» of the orca stop shows the documented example.
  await expect(next(page)).toHaveText('Ver un ejemplo documentado');
  await next(page).click();
  await expect(status).toContainText('focas de Weddell');
  await next(page).click();

  // Nothing is chosen when the web opens: the krill stop has no button to highlight it any more.
  await act('Krill antártico');
  await expect(page.getByRole('button', { name: 'Krill antártico', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const links = page.getByRole('list', { name: 'Conexiones de Krill antártico' });
  await expect(links).toContainText('Krill antártico sirve de alimento a jorobada.');
  await expect(links).toContainText('Fitoplancton y algas del hielo sirven de alimento a krill antártico.');
  await act('Orca');
  await expect(page.getByRole('list', { name: 'Conexiones de Orca' })).toContainText('Depende del grupo');
  await next(page).click();

  const checklist = page.getByRole('list', { name: 'Tu registro de la expedición' });
  await expect(checklist).toContainText('Seguiste las conexiones de 2 organismos');
  await expect(checklist).toContainText(`Recorriste ${MARINE_STOPS.length} de ${MARINE_STOPS.length} paradas`);
  await page.getByRole('button', { name: /Terminar expedición/ }).click();

  await expect(expedition(page)).toHaveCount(0);
  await expect(log(page)).toContainText(`1/${AVAILABLE_COUNT}`);
  await expect(page.locator('.next-card .next-done')).toHaveText(`Océano quedó explorado. Registro de exploración: 1/${AVAILABLE_COUNT}`);
});

test('the keyboard alone walks every stop, and the sources open from a [N] and close with Escape', async ({ page }) => {
  await openFromList(page);
  await expect(page.getByRole('heading', { name: MARINE_STOPS[0].title })).toBeFocused();
  // The opening stop goes under the ice first.
  await next(page).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.marine-location')).toContainText('Bajo el hielo marino');
  for (let i = 1; i < MARINE_STOPS.length; i++) {
    await next(page).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { level: 2, name: MARINE_STOPS[i].title })).toBeFocused();
  }
  await expect(next(page)).toHaveText(/Terminar expedición/);

  // The sources open from a [N] of the text: the top bar has no button for them.
  const sources = page.locator('.marine-line').getByRole('button', { name: /^Fuente / }).first();
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
  await toChapter(page, 'Ballenas');
  await expect(page.locator('.marine-steps')).toBeVisible();
  await expect(page.locator('.marine-stage canvas')).toBeVisible();
});

test.describe('with motion allowed', () => {
  test.use({ reducedMotion: 'no-preference' });
  test('the scene keeps animating without errors', async ({ page }) => {
    await page.goto('/?expedicion=oceano');
    await expect(page.locator('.marine-stage canvas[data-ready="true"]')).toBeVisible({ timeout: 30_000 });
    await toChapter(page, 'Orcas');
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
  await toChapter(page, 'Conectar');
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

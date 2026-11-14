import { expect, test, type Page } from '@playwright/test';
import { clearStorage } from '../storage.ts';
import { MARAMBIO_SPOTS, marambioFacts } from '../../core/src/content/marambio.ts';

const log = (page: Page) => page.locator('.reg');
const primary = (page: Page) => page.locator('.mar .ebar .btn.primary');
const heading = (page: Page, name: string) => page.locator('.mar').getByRole('heading', { level: 2, name });

async function openMarambio(page: Page) {
  await page.getByRole('button', { name: 'Ver como lista' }).click();
  const list = page.getByRole('dialog', { name: 'Todos los puntos' });
  await list.getByRole('button', { name: /Base Marambio/ }).click();
  await expect(heading(page, MARAMBIO_SPOTS[0].label)).toBeVisible();
  await page.waitForFunction(() => (window as unknown as { __marambioReady?: boolean }).__marambioReady === true);
}

let consoleErrors: string[] = [];

test.beforeEach(async ({ page }) => {
  consoleErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => consoleErrors.push(e.message));
});

test.afterEach(() => {
  expect(consoleErrors, 'console errors (hydration mismatches, exceptions)').toEqual([]);
});

test.describe('with WebGL', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearStorage(page);
    await page.reload();
    await expect(log(page)).toContainText('0/3');
  });

  test('walks every point of the base, shows its sources, and updates the log', async ({ page }) => {
    await openMarambio(page);
    const section = page.getByRole('region', { name: 'Expedición Base Marambio' });
    await expect(section.locator('canvas')).toBeVisible();
    // The scene is labelled as a reconstruction, and the label explains itself.
    await expect(section.locator('.orc-scene-badge')).toContainText('Reconstrucción ilustrada');
    await section.getByRole('button', { name: 'Ayuda sobre la reconstrucción ilustrada' }).click();
    await expect(section.getByRole('note')).toContainText(marambioFacts('scene')[0].text);
    await section.getByRole('button', { name: 'Ayuda sobre la reconstrucción ilustrada' }).click();

    for (const [i, spot] of MARAMBIO_SPOTS.entries()) {
      await expect(heading(page, spot.label)).toBeVisible();
      await expect(section.locator('.orc-kicker')).toHaveText(`Punto ${i + 1} de ${MARAMBIO_SPOTS.length}`);
      for (const fact of marambioFacts(spot.id)) await expect(section.locator('.orc-panel')).toContainText(fact.text);
      await expect(section.getByRole('button', { name: `Punto de interés: ${spot.label}` })).toHaveAttribute('aria-pressed', 'true');
      if (i < MARAMBIO_SPOTS.length - 1) {
        await expect(primary(page)).toHaveText('Siguiente');
        await primary(page).click();
      }
    }

    // A source link under a fact opens the list of sources, and the list goes back to the base.
    await section.locator('.orc-src-link').first().click();
    await expect(heading(page, 'De dónde sale cada dato')).toBeFocused();
    await expect(section.locator('.mar-source.is-highlight')).toHaveCount(1);
    await expect(section.locator('.mar-sources')).toContainText('OpenStreetMap');
    await expect(section.locator('.mar-sources')).toContainText('Consultado el');
    await page.keyboard.press('Escape');
    await expect(heading(page, MARAMBIO_SPOTS[MARAMBIO_SPOTS.length - 1].label)).toBeVisible();

    await expect(primary(page)).toHaveText('Terminar la visita');
    await primary(page).click();
    await expect(log(page)).toContainText('1/3');
    await expect(page.locator('.toast')).toHaveText('Base Marambio quedó explorado. Registro de exploración: 1/3');
  });

  test('a dot on the scene opens its point, and «Mapa» leaves without marking the base as explored', async ({ page }) => {
    await openMarambio(page);
    const section = page.getByRole('region', { name: 'Expedición Base Marambio' });
    const dot = section.getByRole('button', { name: 'Punto de interés: Hércules C-130' });
    await expect(dot).toBeVisible();
    await dot.click();
    await expect(heading(page, 'Hércules C-130')).toBeFocused();
    await expect(dot).toHaveAttribute('aria-pressed', 'true');
    await section.getByRole('button', { name: 'Atrás' }).click();
    await expect(heading(page, MARAMBIO_SPOTS[1].label)).toBeVisible();

    // The page never scrolls sideways.
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    await section.getByRole('button', { name: 'Volver al mapa' }).click();
    await expect(log(page)).toContainText('0/3');
    await expect(page.locator('.toast')).toHaveCount(0);
  });
});

test('without WebGL the base shows its drawing and the visit still works', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      return /webgl/.test(type) ? null : (original as (...a: unknown[]) => unknown).call(this, type, ...rest);
    } as typeof original;
  });
  await page.goto('/');
  await openMarambio(page);
  const section = page.getByRole('region', { name: 'Expedición Base Marambio' });
  await expect(section.getByRole('img', { name: /Ilustración de la Base Marambio/ })).toBeVisible();
  await expect(section.locator('canvas')).toHaveCount(0);
  await section.getByRole('button', { name: 'Punto de interés: La pista' }).click();
  await expect(heading(page, 'La pista')).toBeVisible();
});

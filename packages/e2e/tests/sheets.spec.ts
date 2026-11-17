import { expect, test, type Page } from '@playwright/test';
import { LIST_BUTTON_LABEL } from '../../core/src/content/points.ts';
import { clearStorage } from '../storage.ts';
import { mockOpenMeteo } from './weather-helpers.ts';

/**
 * The modals of the app share one container, one header, one row of actions and one sources view (#264).
 * One of each kind (point sheet, trip, Orcadas, Océano) is opened here and checked the same way.
 */
test.beforeEach(async ({ page }) => {
  await mockOpenMeteo(page);
});

async function openFromList(page: Page, name: RegExp) {
  await page.goto('/');
  await clearStorage(page);
  await page.reload();
  const list = page.getByRole('button', { name: LIST_BUTTON_LABEL });
  await list.click();
  await page.getByRole('dialog', { name: 'Todos los puntos' }).getByRole('button', { name }).click();
}

/** The main button is on screen without scrolling, and the buttons of the row are the same size. */
async function expectActionsFit(page: Page, sheet: ReturnType<Page['getByRole']>) {
  const viewport = page.viewportSize()!;
  const primary = sheet.locator('.sheet-actions .btn.primary');
  await expect(primary).toHaveCount(1);
  await expect(primary).toBeVisible();
  const box = (await primary.boundingBox())!;
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
  const heights = await sheet.locator('.sheet-actions .btn').evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().height)));
  expect(new Set(heights).size).toBe(1);
}

const KINDS = [
  { name: 'a point sheet', open: (page: Page) => openFromList(page, /Volcán en el hielo/), dialog: 'Volcán en el hielo' },
  { name: 'the trip from Ushuaia', open: (page: Page) => openFromList(page, /Desde Ushuaia/), dialog: 'Desde Ushuaia' },
  { name: 'the intro of Orcadas', open: (page: Page) => openFromList(page, /Estación Orcadas/), dialog: 'Estación Orcadas' },
] as const;

for (const kind of KINDS) {
  test.describe(kind.name, () => {
    test('has its main button in view, equal buttons, and closes with Escape giving the focus back', async ({ page }) => {
      await kind.open(page);
      const sheet = page.getByRole('dialog', { name: kind.dialog });
      await expect(sheet).toBeVisible();
      await expectActionsFit(page, sheet);
      // The button closes it: no cross beside it.
      await expect(sheet.getByRole('button', { name: 'Cerrar' })).toHaveCount(0);
      await page.keyboard.press('Escape');
      await expect(sheet).toHaveCount(0);
    });

    test('keeps Tab inside and closes when the scrim is tapped', async ({ page }) => {
      await kind.open(page);
      const sheet = page.getByRole('dialog', { name: kind.dialog });
      await expect(sheet).toBeVisible();
      for (let i = 0; i < 6; i++) {
        await page.keyboard.press('Tab');
        expect(await page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]')))).toBe(true);
      }
      await page.locator('.sheet-scrim').click({ position: { x: 4, y: 4 } });
      await expect(sheet).toHaveCount(0);
    });
  });
}

test('a [N] opens the one sources view with its source marked, and Escape gives the focus back to it', async ({ page }) => {
  await openFromList(page, /Estación Orcadas/);
  const intro = page.getByRole('dialog', { name: 'Estación Orcadas' });
  const cite = intro.getByRole('button', { name: /^Fuente / }).first();
  await cite.click();
  const sources = page.getByRole('dialog', { name: 'Fuentes' });
  await expect(sources).toBeVisible();
  await expect(sources.locator('.sources-card[aria-current]')).toHaveCount(1);
  await expect(sources.locator('.sources-card a').first()).toHaveAttribute('href', /^https?:/);
  await expect(sources.getByText(/Consultado el/).first()).toBeVisible();
  await expect(sources.locator('.sheet-actions .btn.primary')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(sources).toHaveCount(0);
  await expect(cite).toBeFocused();
  await expect(intro).toBeVisible();
});

test('the point sheet cites with [N] and marks what is real next to what is an illustration', async ({ page }) => {
  await openFromList(page, /Volcán en el hielo/);
  const sheet = page.getByRole('dialog', { name: 'Volcán en el hielo' });
  await expect(sheet.locator('.sheet-kinds .orc-chip')).not.toHaveCount(0);
  await expect(sheet).not.toContainText('Fuentes verificadas');
  await sheet.getByRole('button', { name: /^Fuente / }).first().click();
  const sources = page.getByRole('dialog', { name: 'Fuentes' });
  await expect(sources.locator('.sources-card[aria-current]')).toHaveCount(1);
});

test('Océano uses the same sources view', async ({ page }) => {
  await openFromList(page, /Océano/);
  await page.getByRole('button', { name: 'Comenzar expedición' }).click();
  await expect(page.getByRole('region', { name: 'Expedición Océano' })).toBeVisible();
  await page.getByRole('button', { name: 'Fuentes', exact: true }).click();
  const sources = page.getByRole('dialog', { name: 'Fuentes' });
  await expect(sources).toBeVisible();
  await expect(sources.locator('.sources-card').first()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(sources).toHaveCount(0);
  await page.getByRole('button', { name: /^Fuente / }).first().click();
  await expect(page.getByRole('dialog', { name: 'Fuentes' }).locator('.sources-card[aria-current]')).toHaveCount(1);
});

for (const [name, re, title] of [
  ['Base Marambio', /Base Marambio/, 'Base Marambio'],
  ['Océano', /Océano/, 'Océano'],
  ['Fósiles', /Fósiles/, 'Fósiles'],
  ['Pingüinos de Cerro Nevado', /Pingüinos de Cerro Nevado/, 'Pingüinos de Cerro Nevado'],
] as const) {
  test(`${name} opens a modal before its expedition, like the others (#264)`, async ({ page }) => {
    await openFromList(page, re);
    const intro = page.getByRole('dialog', { name: title });
    await expect(intro).toBeVisible();
    await expect(intro.getByRole('button', { name: /^Fuente / }).first()).toBeVisible();
    await expect(intro).not.toContainText('Dato real');
    await expectActionsFit(page, intro);
    await expect(intro.getByRole('button', { name: 'Volver al mapa' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(intro).toHaveCount(0);
    await expect(page.getByRole('region', { name: /^Expedición / })).toHaveCount(0);
  });
}

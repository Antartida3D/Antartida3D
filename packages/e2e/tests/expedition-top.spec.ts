import { expect, test, type Page } from '@playwright/test';
import { LIST_BUTTON_LABEL } from '../../core/src/content/points.ts';
import { clearStorage } from '../storage.ts';
import { show3D } from './map-helpers.ts';
import { gotoOrcadasChapter, openOrcadasFromMap } from './orcadas-helpers.ts';
import { mockOpenMeteo } from './weather-helpers.ts';

// The shared header of the expeditions (#297): no bar, no title, chapters only where they fit,
// the month chip in the row of «Mapa», and a lone button as wide as its container.

let consoleErrors: string[] = [];

test.beforeEach(async ({ page }) => {
  consoleErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => consoleErrors.push(e.message));
  await mockOpenMeteo(page);
});

test.afterEach(() => {
  expect(consoleErrors, 'console errors').toEqual([]);
});

const isPhonePortrait = (page: Page) => {
  const vp = page.viewportSize() ?? { width: 1440, height: 900 };
  return vp.width < 900 && vp.height > 500;
};

async function openFromUrl(page: Page, id: 'fosiles' | 'oceano') {
  await page.goto(`/?expedicion=${id}`);
  await expect(page.locator('.orc-top')).toBeVisible();
}

async function openMarambio(page: Page) {
  await page.goto('/');
  await clearStorage(page);
  await page.reload();
  await page.getByRole('button', { name: LIST_BUTTON_LABEL }).click();
  await page.getByRole('dialog', { name: 'Todos los puntos' }).getByRole('button', { name: /Base Marambio/ }).click();
  await page.getByRole('button', { name: 'Comenzar expedición' }).click();
  await page.waitForFunction(() => (window as unknown as { __marambioReady?: boolean }).__marambioReady === true);
}

async function openOrcadas(page: Page) {
  await page.goto('/');
  await clearStorage(page);
  await page.reload();
  await openOrcadasFromMap(page);
}

const OPENERS = {
  Océano: (page: Page) => openFromUrl(page, 'oceano'),
  Fósiles: (page: Page) => openFromUrl(page, 'fosiles'),
  Orcadas: openOrcadas,
  Marambio: openMarambio,
} as const;
const WITH_CHAPTERS = ['Océano', 'Fósiles', 'Orcadas'];

for (const [name, open] of Object.entries(OPENERS)) {
  test(`${name}: the header has no bar and no title, and shows chapters only where they fit`, async ({ page }) => {
    await open(page);
    const top = page.locator('.orc-top');
    const style = await top.evaluate((el) => {
      const s = getComputedStyle(el);
      return { bg: s.backgroundColor, border: s.borderBottomWidth, shadow: s.boxShadow };
    });
    expect(style).toEqual({ bg: 'rgba(0, 0, 0, 0)', border: '0px', shadow: 'none' });
    await expect(top.locator('.orc-top-title')).toHaveCount(0);

    const nav = top.locator('.orc-steps-nav');
    if (WITH_CHAPTERS.includes(name) && !isPhonePortrait(page)) await expect(nav).toBeVisible();
    else await expect(nav).not.toBeVisible();
  });
}

for (const name of ['Orcadas', 'Marambio'] as const) {
  test(`${name}: the month chip is in the row of «Mapa» and its popover stays on screen`, async ({ page }) => {
    await OPENERS[name](page);
    const row = page.locator('.orc-top .orc-top-r1');
    const chip = row.locator('.orc-month-chip');
    await expect(chip).toBeVisible();
    await expect(row.getByRole('button', { name: 'Volver al mapa' })).toBeVisible();
    await chip.click();
    const popover = page.locator('#orc-month-popover');
    await expect(popover).toBeVisible();
    const vp = page.viewportSize()!;
    const box = (await popover.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(vp.width);
    expect(box.y + box.height).toBeLessThanOrEqual(vp.height);
  });
}

/**
 * Every visible `.btn` that is alone in its row of actions spans the width of that row (95 %).
 * Returns the offenders, so a test can print them.
 */
async function loneButtonsNotFull(page: Page) {
  return page.evaluate(() => {
    const CONTAINERS = '.row, .sheet-actions, .ld-actions, .wn-actions, .fossil-interaction, [class*="orc-obs-"]';
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
    };
    const bad: string[] = [];
    for (const btn of document.querySelectorAll<HTMLElement>('.btn')) {
      if (!visible(btn)) continue;
      const box = btn.closest(CONTAINERS);
      if (!box) continue;
      const mates = [...box.querySelectorAll('.btn')].filter(visible);
      if (mates.length !== 1) continue;
      const cs = getComputedStyle(box);
      const inner = box.getBoundingClientRect().width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const w = btn.getBoundingClientRect().width;
      if (w < inner * 0.95) bad.push(`${btn.textContent?.trim()} (${Math.round(w)} de ${Math.round(inner)} px)`);
    }
    return bad;
  });
}

test('a lone button fills its container in Fósiles and Océano', async ({ page }) => {
  await openFromUrl(page, 'fosiles');
  expect(await loneButtonsNotFull(page)).toEqual([]);
  await openFromUrl(page, 'oceano');
  expect(await loneButtonsNotFull(page)).toEqual([]);
});

test('a lone button fills its container in Orcadas and Marambio', async ({ page }) => {
  await openOrcadas(page);
  expect(await loneButtonsNotFull(page)).toEqual([]);
  await openMarambio(page);
  expect(await loneButtonsNotFull(page)).toEqual([]);
});

test('a lone button fills its container on the loading screen', async ({ page }) => {
  await page.goto('/');
  await clearStorage(page);
  await page.reload();
  expect(await loneButtonsNotFull(page)).toEqual([]);
});

test('«Saltar viaje» fills its row on the voyage to Isla Laurie', async ({ page }) => {
  test.setTimeout(90000);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await show3D(page);
  await page.waitForFunction(() => (window as unknown as { __cameraControls?: unknown }).__cameraControls);
  const marker = page.locator('.ov [data-key*="orcadas"] button');
  await expect(marker).toBeVisible();
  await marker.click();
  const intro = page.getByRole('dialog', { name: 'Estación Orcadas' });
  const orcadasBtn = page.getByRole('button', { name: /Estación Orcadas.*Expedición disponible/ });
  if (!(await intro.isVisible()) && (await orcadasBtn.isVisible())) await orcadasBtn.click();
  await intro.getByRole('button', { name: /Irízar y Zodiac/ }).click();
  await intro.getByRole('button', { name: 'Comenzar expedición' }).click();
  await expect(page.getByRole('button', { name: 'Saltar viaje' })).toBeVisible();
  expect(await loneButtonsNotFull(page)).toEqual([]);
});

// «Continuar» keeps the whole step readable on a narrow phone, in two lines if it must (#297).
for (const width of [360, 390]) {
  test.describe(`«Continuar» at ${width} px`, () => {
    test.use({ viewport: { width, height: 740 } });

    test('fits inside its button and inside the screen', async ({ page }, info) => {
      test.skip(info.project.name !== 'mobile', 'One phone project is enough: the viewport is set here');
      await page.goto('/');
      await clearStorage(page);
      await page.reload();
      await page.getByRole('button', { name: LIST_BUTTON_LABEL }).click();
      await page.getByRole('dialog', { name: 'Todos los puntos' }).getByRole('button', { name: /Estación Orcadas/ }).click();
      await page.getByRole('button', { name: 'Comenzar' }).click();
      await gotoOrcadasChapter(page, /Observar/);
      await page.getByRole('region', { name: 'Expedición Estación Orcadas' }).getByRole('button', { name: 'Volver al mapa' }).click();

      const resume = page.locator('.btn.resume:not(.next-btn)').first();
      await expect(resume).toBeVisible();
      const fit = await resume.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return { inner: el.scrollWidth <= el.clientWidth, left: r.left, right: r.right, screen: window.innerWidth };
      });
      expect(fit.inner).toBe(true);
      expect(fit.left).toBeGreaterThanOrEqual(0);
      expect(fit.right).toBeLessThanOrEqual(fit.screen);
    });
  });
}

// No scene label with its «?» and no «Fuentes» in the header (#327): the sources open from the [N] citations.
async function expectNoBadgeNorSources(page: Page) {
  await expect(page.locator('.orc-top')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ayuda sobre la reconstrucción ilustrada' })).toHaveCount(0);
  await expect(page.locator('.orc-top').getByRole('button', { name: 'Fuentes' })).toHaveCount(0);
  // Wide, the location sits down in the corner: nothing under it to leave room for (#327).
  const vp = page.viewportSize()!;
  const location = page.locator('.scene-location');
  if (vp.width >= 900 && vp.height > 500 && (await location.count()) > 0) {
    const box = (await location.boundingBox())!;
    expect(vp.height - (box.y + box.height), 'gap under the location').toBeLessThanOrEqual(32);
  }
}

for (const name of ['Océano', 'Fósiles', 'Orcadas', 'Marambio'] as const) {
  test(`${name}: no scene label and no «Fuentes» in the header`, async ({ page }) => {
    await OPENERS[name](page);
    await expectNoBadgeNorSources(page);
  });
}

test('the trip from Ushuaia shows no scene label', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/');
  await clearStorage(page);
  await page.reload();
  await show3D(page);
  await page.getByRole('button', { name: LIST_BUTTON_LABEL }).click();
  await page.getByRole('dialog', { name: 'Todos los puntos' }).getByRole('button', { name: /Desde Ushuaia/ }).click();
  await page.getByRole('group', { name: 'Medio de transporte' }).getByRole('button', { name: /Irízar/ }).click();
  await page.getByRole('button', { name: 'Zarpar' }).click();
  await expect(page.getByRole('group', { name: 'Controles del viaje' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ayuda sobre la reconstrucción ilustrada' })).toHaveCount(0);
});

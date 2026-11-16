import { expect, test, type Locator, type Page } from '@playwright/test';
import { FOSSIL_CLEAN_STEPS } from '../../core/src/fossils.ts';
import { mockOpenMeteo } from './weather-helpers.ts';

async function appearance(control: Locator) {
  return control.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      background: style.backgroundColor,
      color: style.color,
      border: style.borderColor,
      shadow: style.boxShadow,
      opacity: style.opacity,
    };
  });
}

async function shape(control: Locator) {
  return control.evaluate((element) => {
    const style = getComputedStyle(element);
    const { x, y, width, height } = element.getBoundingClientRect();
    return { x, y, width, height, radius: style.borderRadius };
  });
}

async function openMap(page: Page) {
  await page.goto('/');
  await expect(page.locator('.ld')).toHaveCount(0, { timeout: 30_000 });
  await expect(page.locator('.stage.m3d canvas')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

async function openPoleSheet(page: Page) {
  await page.getByRole('button', { name: 'Ver como lista', exact: true }).click();
  await page.getByRole('dialog', { name: 'Todos los puntos' }).getByRole('button', { name: /^El Polo Sur/ }).click();
  const sheet = page.getByRole('dialog', { name: 'El Polo Sur', exact: true });
  await expect(sheet).toBeVisible();
  return sheet;
}

test.beforeEach(async ({ page }) => {
  await mockOpenMeteo(page);
});

test('map zoom and legend acknowledge hover without moving or changing shape', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Hover feedback applies to a fine pointer, not touch.');
  await openMap(page);

  for (const name of ['Acercar', 'Leyenda']) {
    const control = page.getByRole('button', { name, exact: true });
    await page.mouse.move(0, 0);
    const before = await appearance(control);
    const geometry = await shape(control);
    await control.hover();
    await expect.poll(() => appearance(control)).not.toEqual(before);
    expect(await shape(control)).toEqual(geometry);
    await page.mouse.move(0, 0);
    await expect.poll(() => appearance(control)).toEqual(before);
  }
});

test('point sheet keyboard focus keeps the action shape and return navigation works', async ({ page }) => {
  test.setTimeout(60_000);
  await openMap(page);
  const sheet = await openPoleSheet(page);
  const action = sheet.getByRole('button', { name: 'Ver reclamos territoriales', exact: true });
  const back = sheet.getByRole('button', { name: 'Volver al mapa', exact: true });
  await action.scrollIntoViewIfNeeded();
  const before = await shape(action);

  await action.focus();
  await page.keyboard.press('Tab');
  await expect(back).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(action).toBeFocused();
  await expect.poll(() => action.evaluate((element) => element.matches(':focus-visible'))).toBe(true);
  const focused = await shape(action);
  expect(focused.radius).toBe(before.radius);
  expect(focused.width).toBe(before.width);
  expect(focused.height).toBe(before.height);

  await page.keyboard.press('Tab');
  await expect(back).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(sheet).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Ver como lista', exact: true })).toBeVisible();
});

test('hovering a claim country stays distinct from selection and never changes it', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Hover feedback applies to a fine pointer, not touch.');
  test.setTimeout(60_000);
  await openMap(page);
  const sheet = await openPoleSheet(page);
  await sheet.getByRole('button', { name: 'Ver reclamos territoriales', exact: true }).click();
  const countries = page.getByRole('region', { name: 'Reclamos antárticos' }).getByRole('group', { name: 'País reclamante' });
  const selected = countries.getByRole('button', { name: 'Argentina', exact: true });
  const other = countries.getByRole('button', { name: 'Chile', exact: true });
  await selected.click();
  await expect(selected).toHaveAttribute('aria-pressed', 'true');
  await page.mouse.move(0, 0);
  const selectedBackground = (await appearance(selected)).background;

  await other.hover();
  await expect.poll(async () => (await appearance(other)).background).not.toBe(selectedBackground);
  await expect(other).toHaveAttribute('aria-pressed', 'false');
  await expect(selected).toHaveAttribute('aria-pressed', 'true');
  expect((await appearance(selected)).background).toBe(selectedBackground);

  await selected.hover();
  await expect(selected).toHaveAttribute('aria-pressed', 'true');
  expect((await appearance(selected)).background).toBe(selectedBackground);
});

test('a completed fossil action remains disabled and ignores hover', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Hover feedback applies to a fine pointer, not touch.');
  await page.goto('/?expedicion=fosiles');
  await expect(page.getByRole('heading', { name: 'Las rocas recuerdan' })).toBeVisible();
  await page.getByRole('navigation', { name: 'Capítulos de Fósiles' }).getByRole('button', { name: /Amonites/ }).click();
  for (let step = 0; step < FOSSIL_CLEAN_STEPS; step++) {
    await page.getByRole('button', { name: 'Limpiar el sedimento', exact: true }).click();
  }
  const completed = page.getByRole('button', { name: 'Ya se ve la espiral', exact: true });
  await expect(completed).toBeDisabled();
  await page.mouse.move(0, 0);
  const before = await appearance(completed);
  const geometry = await shape(completed);
  await completed.hover();
  await expect(completed).toBeDisabled();
  expect(await appearance(completed)).toEqual(before);
  expect(await shape(completed)).toEqual(geometry);
});

test('a read voyage milestone keeps its state colors while acknowledging hover', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Hover feedback applies to a fine pointer, not touch.');
  await openMap(page);
  await page.getByRole('button', { name: 'Ver como lista', exact: true }).click();
  await page.getByRole('dialog', { name: 'Todos los puntos' }).getByRole('button', { name: /Desde Ushuaia/ }).click();
  await page.getByRole('group', { name: 'Medio de transporte' }).getByRole('button', { name: /Irízar/ }).click();
  await page.getByRole('button', { name: 'Zarpar', exact: true }).click();
  const offer = page.getByRole('group', { name: 'Hito por el que pasás' });
  await offer.getByRole('button', { name: 'Leer el hito: Ushuaia y el Canal Beagle', exact: true }).click();
  const card = page.getByRole('dialog', { name: 'Ushuaia y el Canal Beagle', exact: true });
  await card.getByRole('button', { name: 'Seguir viaje', exact: true }).click();
  await expect(card).toHaveCount(0);

  const read = offer.getByRole('button', { name: 'Volver a leer el hito: Ushuaia y el Canal Beagle', exact: true });
  await expect(read).toBeEnabled();
  await page.mouse.move(0, 0);
  const before = await appearance(read);
  await read.hover();
  await expect.poll(async () => (await appearance(read)).shadow).not.toBe(before.shadow);
  const hovered = await appearance(read);
  expect(hovered.background).toBe(before.background);
  expect(hovered.color).toBe(before.color);
  expect(hovered.border).toBe(before.border);
  await expect(read).toBeEnabled();
  await expect(read).toHaveAccessibleName('Volver a leer el hito: Ushuaia y el Canal Beagle');
});

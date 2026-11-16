import { expect, test, type Page } from '@playwright/test';
import { mockOpenMeteo } from './weather-helpers.ts';

async function openMap(page: Page, { fallback2D = false }: { fallback2D?: boolean } = {}) {
  if (fallback2D) {
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
        return /webgl/.test(type) ? null : (original as (...args: unknown[]) => unknown).call(this, type, ...rest);
      } as typeof original;
    });
  }
  await page.goto('/');
  await expect(page.locator('.ld')).toHaveCount(0, { timeout: 30_000 });
  await expect(page.locator('.vp')).toBeVisible();
  if (fallback2D) await expect(page.locator('.stage:not(.m3d) .layer')).toBeVisible();
  else await expect(page.locator('.stage.m3d canvas')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

test.beforeEach(async ({ page }) => {
  await mockOpenMeteo(page);
});

test('the mobile HUD leaves the handwritten hint and register inside their surfaces', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await openMap(page);

  const brand = page.locator('.brand');
  const hint = page.locator('.hint').first();
  const register = page.locator('.reg');
  const boxes = await Promise.all([
    brand.boundingBox(),
    hint.boundingBox(),
    register.evaluate((element) => ({ clientWidth: element.clientWidth, scrollWidth: element.scrollWidth })),
  ]);
  expect(boxes[0]).not.toBeNull();
  expect(boxes[1]).not.toBeNull();
  expect(boxes[1]!.y).toBeGreaterThanOrEqual(boxes[0]!.y + boxes[0]!.height - 1);
  expect(boxes[2].scrollWidth).toBeLessThanOrEqual(boxes[2].clientWidth);
});

test('a small transport picker keeps its options clear of the action row', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 225 });
  await openMap(page);
  await page.getByRole('button', { name: 'Ver como lista', exact: true }).click();
  await page.getByRole('dialog', { name: 'Todos los puntos' }).getByRole('button', { name: /Desde Ushuaia/ }).click();

  const picker = page.getByRole('dialog', { name: 'Desde Ushuaia', exact: true });
  const option = picker.getByRole('button', { name: /Irízar/ });
  const actions = picker.locator('.vactions');
  const optionBox = await option.boundingBox();
  const actionBox = await actions.boundingBox();
  expect(optionBox).not.toBeNull();
  expect(actionBox).not.toBeNull();
  const overlap = optionBox!.x < actionBox!.x + actionBox!.width
    && optionBox!.x + optionBox!.width > actionBox!.x
    && optionBox!.y < actionBox!.y + actionBox!.height
    && optionBox!.y + optionBox!.height > actionBox!.y;
  expect(overlap).toBe(false);

  await option.click();
  await expect(option).toHaveAttribute('aria-pressed', 'true');
});

test('a short HUD separates its header from a scrollable control zone', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 225 });
  await openMap(page);

  const header = await page.locator('.top').boundingBox();
  const controls = await page.locator('.bottom').boundingBox();
  const hint = page.locator('.hint').first();
  const hintBox = await hint.boundingBox();
  expect(header).not.toBeNull();
  expect(controls).not.toBeNull();
  expect(hintBox).not.toBeNull();
  await expect(hint).toBeVisible();
  expect(hintBox!.y).toBeGreaterThanOrEqual(header!.y - 1);
  expect(hintBox!.y + hintBox!.height).toBeLessThanOrEqual(header!.y + header!.height + 1);
  expect(controls!.y).toBeGreaterThanOrEqual(header!.y + header!.height - 1);
  expect(controls!.height).toBeGreaterThanOrEqual(48);

  const scroll = await page.locator('.bottom').evaluate((element) => ({
    overflowY: getComputedStyle(element).overflowY,
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }));
  expect(scroll.overflowY).toBe('auto');
  expect(scroll.scrollHeight).toBeGreaterThan(scroll.clientHeight);
  const legend = await page.getByRole('button', { name: 'Leyenda', exact: true }).boundingBox();
  expect(legend).not.toBeNull();
  expect(legend!.y).toBeGreaterThanOrEqual(controls!.y - 1);

  const home = page.getByRole('button', { name: 'Ver todo el continente', exact: true });
  await page.locator('.bottom').evaluate((element) => { element.scrollTop = element.scrollHeight; });
  await expect(home).toBeInViewport();
  await home.click();
});

test('forced colors keep the chosen transport and map focus visible', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await openMap(page, { fallback2D: true });

  const map = page.locator('.vp');
  await map.focus();
  await expect.poll(() => map.evaluate((element) => getComputedStyle(element).outlineOffset)).toBe('-3px');

  await page.getByRole('button', { name: 'Ver como lista', exact: true }).click();
  await page.getByRole('dialog', { name: 'Todos los puntos' }).getByRole('button', { name: /Desde Ushuaia/ }).click();
  const picker = page.getByRole('dialog', { name: 'Desde Ushuaia', exact: true });
  const option = picker.getByRole('button', { name: /Irízar/ });
  await option.click();
  await picker.getByRole('button', { name: 'Volver al mapa', exact: true }).focus();
  await expect(option).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => option.evaluate((element) => getComputedStyle(element).outlineOffset)).toBe('-6px');
});

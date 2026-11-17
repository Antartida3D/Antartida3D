import { expect, test, type Page } from '@playwright/test';
import { EXPLORED_KEY, INTRO_KEY, LAST_EXPEDITION_KEY, VIEW_MODE_KEY } from '@antartida/core/storage';
import { mockOpenMeteo } from './weather-helpers.ts';

// A real first visit: no saved state, unlike every other spec (see playwright.config.ts).
test.use({ storageState: { cookies: [], origins: [] } });

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

const dialog = (page: Page) => page.getByRole('dialog', { name: 'Antártida por descubrir' });
const card = (page: Page) => page.getByRole('status').filter({ hasText: 'Empezá acá' });
const VOYAGE_ID = 'campana';
const pin = (page: Page, id = VOYAGE_ID) => page.locator(`.vp [data-key="${id}"] .mk`);
// Same cut as the app (NARROW_PX).
const NARROW_PX = 820;
// The letter waits for the page to load and settle (SETTLE_MAX_MS after `load` at most).
const SETTLE_WAIT = 15_000;
const narrow = (page: Page) => page.viewportSize()!.width < NARROW_PX;
const seen = (page: Page) => page.evaluate((k) => localStorage.getItem(k), INTRO_KEY);

/** On a phone, goes to the last of the three pages, where the two actions are. */
async function toActions(page: Page) {
  if (!narrow(page)) return;
  await dialog(page).getByRole('button', { name: 'Siguiente', exact: true }).click();
  await dialog(page).getByRole('button', { name: 'Siguiente', exact: true }).click();
}

async function openLetter(page: Page) {
  await page.goto('/');
  await expect(dialog(page)).toBeVisible({ timeout: SETTLE_WAIT });
}

async function dragMap(page: Page) {
  const box = (await page.locator('.vp').boundingBox())!;
  const [x, y] = [box.x + box.width / 2, box.y + box.height * 0.3];
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 80, y + 20, { steps: 5 });
  await page.mouse.up();
}

test('a first visit opens the letter as a modal dialog with the focus inside (#256)', async ({ page }) => {
  await openLetter(page);
  await expect(dialog(page)).toHaveAttribute('aria-modal', 'true');
  expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(true);
});

test('desktop shows the three steps in one sheet; a phone pages through them (#256)', async ({ page }) => {
  await openLetter(page);
  if (!narrow(page)) {
    await expect(dialog(page).getByText('Completá el registro')).toBeVisible();
    return;
  }
  await expect(dialog(page).getByText('1 de 3')).toBeVisible();
  await dialog(page).getByRole('button', { name: 'Siguiente', exact: true }).click();
  await expect(dialog(page).getByText('2 de 3')).toBeVisible();
  await expect(dialog(page).getByText('«Actividades» muestra todo sin el mapa.')).toBeVisible();
  await dialog(page).getByRole('button', { name: 'Atrás' }).click();
  await expect(dialog(page).getByText('1 de 3')).toBeVisible();
  await toActions(page);
  await expect(dialog(page).getByText('3 de 3')).toBeVisible();
  await expect(dialog(page).getByRole('button', { name: 'Explorar por mi cuenta' })).toBeVisible();
  await expect(dialog(page).getByRole('button', { name: /Empezar en Ushuaia/ })).toBeVisible();
});

test('«Empezar en Ushuaia» closes the letter and shows «Empezá acá» under the pin; «Entendido» closes it (#256)', async ({ page }) => {
  await openLetter(page);
  await toActions(page);
  await page.getByRole('button', { name: /Empezar en Ushuaia/ }).click();
  await expect(dialog(page)).toHaveCount(0);
  await expect(card(page)).toBeVisible({ timeout: SETTLE_WAIT });
  await expect(pin(page)).toHaveClass(/\bshown\b/);
  const vw = page.viewportSize()!;
  await expect.poll(async () => {
    const c = (await card(page).boundingBox())!;
    const p = (await pin(page).boundingBox())!;
    return c.y > p.y && c.x >= 0 && c.x + c.width <= vw.width && c.y + c.height <= vw.height;
  }).toBe(true);
  expect(await seen(page)).toBe('1');
  await card(page).getByRole('button', { name: 'Entendido' }).click();
  await expect(card(page)).toHaveCount(0);
});

test('touching the pin with the card open starts the trip and the card goes (#256)', async ({ page, isMobile }) => {
  await openLetter(page);
  await toActions(page);
  await page.getByRole('button', { name: /Empezar en Ushuaia/ }).click();
  await expect(card(page)).toBeVisible({ timeout: SETTLE_WAIT });
  if (isMobile) await pin(page).tap();
  else await pin(page).click();
  await expect(page.locator('.sheet.voyage')).toBeVisible();
  await expect(card(page)).toHaveCount(0);
});

test('dragging the map closes the card (#256)', async ({ page }) => {
  await openLetter(page);
  await toActions(page);
  await page.getByRole('button', { name: /Empezar en Ushuaia/ }).click();
  await expect(card(page)).toBeVisible({ timeout: SETTLE_WAIT });
  await dragMap(page);
  await expect(card(page)).toHaveCount(0);
});

for (const way of ['explorar', 'cerrar', 'escape', 'saltar'] as const) {
  test(`leaving by «${way}» saves it: the next visit has no letter and suggests Ushuaia (#256)`, async ({ page }) => {
    await openLetter(page);
    if (way === 'saltar') {
      test.skip(!narrow(page), 'only a phone has «Saltar»');
      await dialog(page).getByRole('button', { name: 'Saltar' }).click();
    } else if (way === 'escape') await page.keyboard.press('Escape');
    else if (way === 'cerrar') await dialog(page).getByRole('button', { name: 'Cerrar' }).click();
    else {
      await toActions(page);
      await dialog(page).getByRole('button', { name: 'Explorar por mi cuenta' }).click();
    }
    await expect(dialog(page)).toHaveCount(0);
    expect(await seen(page)).toBe('1');
    // The history entry the letter used is dropped by a «back»; a reload while it is pending is aborted.
    await page.waitForFunction(() => !(history.state as { antartida?: number } | null)?.antartida);
    await page.reload();
    await expect(page.getByRole('button', { name: /Siguiente: Desde Ushuaia/ })).toBeVisible({ timeout: SETTLE_WAIT });
    await expect(dialog(page)).toHaveCount(0);
  });
}

test('Tab stays inside the dialog and Escape gives the focus back outside it (#256)', async ({ page }) => {
  await openLetter(page);
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toHaveCount(0);
  expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(false);
});

test('«?» opens the letter again without moving the camera, and it is not there during a trip (#256)', async ({ page, isMobile }) => {
  await page.addInitScript((k) => localStorage.setItem(k, '1'), INTRO_KEY);
  await page.addInitScript((k) => localStorage.setItem(k, '3d'), VIEW_MODE_KEY);
  await page.goto('/');
  const help = page.getByRole('button', { name: 'Cómo se usa el mapa' });
  await expect(help).toBeVisible();
  // Wait for the camera to stop (the box is the same on three reads, 250 ms apart), then compare.
  const read = async () => JSON.stringify(await pin(page, 'orcadas').boundingBox());
  let before = '';
  await expect.poll(async () => {
    const reads: string[] = [];
    for (let i = 0; i < 3; i++) {
      reads.push(await read());
      await page.waitForTimeout(250);
    }
    before = reads[2];
    return reads[0] === reads[1] && reads[1] === reads[2] && reads[0] !== 'null';
  }, { timeout: SETTLE_WAIT }).toBe(true);
  await help.click();
  await expect(dialog(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toHaveCount(0);
  const [a0, b0] = [JSON.parse(await read()), JSON.parse(before)];
  expect(Math.abs(a0.x - b0.x)).toBeLessThan(1);
  expect(Math.abs(a0.y - b0.y)).toBeLessThan(1);
  await expect(help).toBeFocused();
  // A trip hides it.
  await page.goto('/');
  // By keyboard: on a phone the overview leaves the pin off the screen.
  await pin(page).focus();
  await page.keyboard.press('Enter');
  // A touch screen shows the label first and opens on the second press.
  if (isMobile) await page.keyboard.press('Enter');
  await expect(page.locator('.sheet.voyage')).toBeVisible();
  await expect(help).toBeHidden();
});

test('the letter also comes out to someone with a «Continuar» pending, who still sees it after (#256)', async ({ page }) => {
  await page.addInitScript((k) => localStorage.setItem(k, JSON.stringify({ id: 'orcadas', step: 1 })), LAST_EXPEDITION_KEY);
  await openLetter(page);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: /^Continuar/ })).toBeVisible();
});

test('once Ushuaia is done the primary action goes to another expedition (#256)', async ({ page }) => {
  await page.addInitScript((k) => localStorage.setItem(k, JSON.stringify(['campana'])), EXPLORED_KEY);
  await openLetter(page);
  await toActions(page);
  await dialog(page).getByRole('button', { name: /^Empezar en (?!Ushuaia)/ }).click();
  await expect(card(page)).toBeVisible({ timeout: SETTLE_WAIT });
  await expect(card(page)).not.toContainText('Desde Ushuaia');
  await expect(card(page)).toContainText('Tocá el punto para empezar la expedición.');
});

test('with the six expeditions done the letter has only «Explorar por mi cuenta» (#256)', async ({ page }) => {
  const all = ['marambio', 'fosiles', 'oceano', 'poncho', 'campana', 'orcadas'];
  await page.addInitScript((v) => localStorage.setItem(v.k, JSON.stringify(v.all)), { k: EXPLORED_KEY, all });
  await openLetter(page);
  await toActions(page);
  await expect(dialog(page).getByRole('button', { name: 'Explorar por mi cuenta' })).toBeVisible();
  await expect(dialog(page).getByRole('button', { name: /Empezar en/ })).toHaveCount(0);
});

test('the letter waits for the 3D loading screen to close, which would cover it (#190)', async ({ page }) => {
  // The loading screen paces its steps and stays long enough to check only without reduced motion.
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript((key) => localStorage.setItem(key, '3d'), VIEW_MODE_KEY);
  // Longer than SETTLE_MAX_MS: the page settles while the loading screen is still up.
  await page.route(/terrain-mesh-.*\.bin/, async (route) => {
    await new Promise((r) => setTimeout(r, 6000));
    await route.continue();
  });
  await page.goto('/');
  const loader = page.locator('[data-loading-variant="map3d"]');
  await expect(loader).toBeVisible();
  // Checked in the page, on every frame: the letter must never be on while the loading screen is.
  await page.evaluate(() => {
    const w = window as unknown as { __covered?: boolean };
    w.__covered = false;
    const watch = () => {
      const loading = document.querySelector('[data-loading-variant="map3d"]');
      if (loading && document.querySelector('[role="dialog"]')) w.__covered = true;
      if (loading) requestAnimationFrame(watch);
    };
    watch();
  });
  await expect(loader).toBeHidden({ timeout: 30_000 });
  expect(await page.evaluate(() => (window as unknown as { __covered?: boolean }).__covered)).toBe(false);
  await expect(dialog(page)).toBeVisible({ timeout: SETTLE_WAIT });
});

test('with reduced motion the sheet has no animation (#256)', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openLetter(page);
  expect(await dialog(page).evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
});

test('on a short landscape phone the letter fits and its primary action can be reached (#256)', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'one profile is enough');
  await page.setViewportSize({ width: 844, height: 390 });
  await openLetter(page);
  const box = (await dialog(page).boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(390);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const primary = dialog(page).locator('.btn.primary');
  await primary.scrollIntoViewIfNeeded();
  await expect(primary).toBeInViewport();
});

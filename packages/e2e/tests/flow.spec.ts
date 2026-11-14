import { expect, test, type CDPSession, type Locator, type Page } from '@playwright/test';
import { clearStorage } from '../storage.ts';

const log = (page: Page) => page.locator('.reg');

/** One finger drags from the middle of `from` by (dx, dy) px, in eight steps. */
async function touchDrag(cdp: CDPSession, from: Locator, dx: number, dy: number) {
  const box = (await from.boundingBox())!;
  const [x, y] = [box.x + box.width / 2, box.y + box.height / 2];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let i = 1; i <= 8; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + (dx * i) / 8, y: y + (dy * i) / 8 }] });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

/** Presses Tab until the focused element's accessible name matches. */
async function tabTo(page: Page, name: RegExp, max = 60) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab');
    const label = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      return el ? (el.getAttribute('aria-label') ?? el.textContent ?? '').trim() : '';
    });
    if (name.test(label)) return;
  }
  throw new Error(`Could not reach ${name} with Tab`);
}

const focusedName = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    return el ? (el.getAttribute('aria-label') ?? el.textContent ?? '').trim() : '';
  });

let consoleErrors: string[] = [];

/** Focus moves in an effect, which some runtimes (Preact, Svelte) flush after paint: poll. */
const expectFocused = (page: Page, name: string) => expect.poll(() => focusedName(page)).toBe(name);

test.beforeEach(async ({ page }) => {
  consoleErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => consoleErrors.push(e.message));
  await page.goto('/');
  await clearStorage(page);
  await page.reload();
  await expect(log(page)).toContainText('0/3');
});

test.afterEach(() => {
  expect(consoleErrors, 'console errors (hydration mismatches, exceptions)').toEqual([]);
});

test('dialogs close with Escape and return focus to their trigger', async ({ page }) => {
  await tabTo(page, /^Ver como lista$/);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Todos los puntos' })).toBeVisible();
  await expectFocused(page, 'Ver mapa');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expectFocused(page, 'Ver como lista');

  await page.keyboard.press('Enter');
  await expectFocused(page, 'Ver mapa');
  await tabTo(page, /^Océano/);
  await page.keyboard.press('Enter');
  const sheet = page.getByRole('dialog', { name: 'Océano' });
  await expect(sheet.getByRole('heading', { name: 'Fuentes verificadas' })).toBeVisible();
  await expect(sheet).not.toContainText('[Contenido provisional]');
  await expectFocused(page, 'Cerrar ficha');
  await page.keyboard.press('Escape');
  await expect(sheet).toHaveCount(0);
  await expectFocused(page, 'Ver como lista');
});

test('Océano is displayed as Ampliación prevista and opens its point sheet', async ({ page }) => {
  await tabTo(page, /^Ver como lista$/);
  await page.keyboard.press('Enter');
  const oceanoBtn = page.getByRole('dialog', { name: 'Todos los puntos' }).getByRole('button', { name: /Océano/ });
  await expect(oceanoBtn).toBeVisible();
  await oceanoBtn.click();
  const sheet = page.getByRole('dialog', { name: 'Océano' });
  await expect(sheet).toBeVisible();
  await expect(sheet.locator('.tag.tb')).toHaveText('Ampliación prevista');
  await page.keyboard.press('Escape');
  await expect(sheet).toHaveCount(0);
});

test('a point with verified content shows its sources; Poncho stays provisional', async ({ page }) => {
  await page.getByRole('button', { name: 'Ver como lista' }).click();
  await page.getByRole('dialog', { name: 'Todos los puntos' }).getByRole('button', { name: /Volcán en el hielo/ }).click();
  const erebus = page.getByRole('dialog', { name: 'Volcán en el hielo' });
  // Sources start folded so they do not push the sheet's actions out of view.
  const toggle = erebus.getByRole('button', { name: /^Fuentes verificadas/ });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(erebus.getByRole('link', { name: 'Erebus Breaks Through' })).toHaveCount(0);
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(erebus.getByRole('link', { name: 'Erebus Breaks Through' })).toHaveAttribute('href', /^https:\/\/science\.nasa\.gov\//);
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Ver como lista' }).click();
  await page.getByRole('dialog', { name: 'Todos los puntos' }).getByRole('button', { name: /Poncho/ }).click();
  const poncho = page.getByRole('dialog', { name: 'Poncho' });
  await expect(poncho).toContainText('[Contenido provisional]');
  await expect(poncho.getByRole('heading', { name: 'Fuentes verificadas' })).toHaveCount(0);
});

test('on a phone a point sheet closes when dragged down, like the other sheets', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'a phone gesture; on wide screens the sheet is a card');
  await page.getByRole('button', { name: 'Ver como lista' }).click();
  await page.getByRole('dialog', { name: 'Todos los puntos' }).getByRole('button', { name: /Volcán en el hielo/ }).click();
  const erebus = page.getByRole('dialog', { name: 'Volcán en el hielo' });
  await expect(erebus).toBeVisible();
  const cdp = await page.context().newCDPSession(page);
  await touchDrag(cdp, erebus.getByRole('heading', { name: 'Volcán en el hielo' }), 0, 200);
  await expect(erebus).toBeHidden();
});

test('has no horizontal scroll', async ({ page }) => {
  const overflow = () =>
    page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(await overflow()).toBeLessThanOrEqual(0);
});

test('on a phone the trip picker grows when its handle is dragged up, shrinks back and closes when dragged down', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'the handle belongs to the phone layout; on wide screens the sheet is a card');
  await page.getByRole('button', { name: 'Ver como lista' }).click();
  await page.getByRole('dialog', { name: 'Todos los puntos' }).getByRole('button', { name: /Desde Ushuaia/ }).click();
  const sheet = page.locator('.sheet.voyage');
  const handle = page.locator('.sheet-handle');
  await expect(handle).toBeVisible();
  await expect(handle).toHaveAttribute('aria-expanded', 'false');
  const height = () => sheet.evaluate((el) => el.getBoundingClientRect().height);
  const small = await height();

  const cdp = await page.context().newCDPSession(page);
  /** One finger drags the handle, or another part of the sheet, by `dy` px. */
  const drag = async (dy: number, from = handle) => {
    const box = (await from.boundingBox())!;
    const [x, y] = [box.x + box.width / 2, box.y + box.height / 2];
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + (dy * i) / 8 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };

  await drag(-250);
  await expect(handle).toHaveAttribute('aria-expanded', 'true');
  await expect.poll(height).toBeGreaterThan(small + 150);

  await drag(200);
  await expect(handle).toHaveAttribute('aria-expanded', 'false');
  await expect.poll(height).toBeCloseTo(small, 0);

  // With the keyboard, Enter on the handle switches sizes.
  await handle.focus();
  await page.keyboard.press('Enter');
  await expect(handle).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Enter');
  await expect(handle).toHaveAttribute('aria-expanded', 'false');

  // The sheet itself is dragged too, not only its handle: up from its title, down from its text.
  await drag(-250, page.locator('#voyage-title'));
  await expect(handle).toHaveAttribute('aria-expanded', 'true');
  await expect.poll(height).toBeGreaterThan(small + 150);
  await drag(200, page.locator('.sheet.voyage .place'));
  await expect(handle).toHaveAttribute('aria-expanded', 'false');

  // Dragged down from its small size it closes and the map is back. The drag starts on the
  // button that starts the trip: a drag is not a press, so the trip does not start.
  await drag(200, page.getByRole('button', { name: 'Zarpar' }));
  await expect(sheet).toHaveCount(0);
  await expect(page.locator('.vbar')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Ver como lista' })).toBeVisible();
});

test('on a phone the legend starts closed, and a swipe left or down closes it (#114)', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'on wide screens the legend starts open (next test)');
  const button = page.getByRole('button', { name: /Leyenda/ });
  const legend = page.locator('.legend');
  await expect(button).toHaveAttribute('aria-expanded', 'false');
  await expect(legend.locator('ul')).toHaveCount(0);

  const cdp = await page.context().newCDPSession(page);
  const swipe = (dx: number, dy: number) => touchDrag(cdp, button, dx, dy);

  // Left and down both close it. The swipe starts on the button: it must not press it and open
  // the legend again.
  for (const [dx, dy] of [[-60, 0], [0, 100]] as const) {
    await button.tap();
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await swipe(dx, dy);
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(legend.locator('ul')).toHaveCount(0);
  }

  // A short swipe, or one to the right, leaves it open and back in its place.
  await button.tap();
  await swipe(-20, 0);
  await swipe(80, 0);
  await expect(button).toHaveAttribute('aria-expanded', 'true');
  await expect(legend).not.toHaveAttribute('style', /translate/);
});

test('on a short phone screen the 3D legend notes scroll under the finger, and a pull down from their top closes it (#114)', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'a phone gesture');
  // Short enough that the open notes outgrow the height the 3D legend gives its lists (painted.css).
  await page.setViewportSize({ width: 390, height: 560 });
  await page.getByRole('button', { name: 'Relieve 3D', exact: true }).click();
  const button = page.getByRole('button', { name: 'Leyenda', exact: true });
  await button.tap();
  await page.locator('.legend summary').tap();
  const notes = page.getByRole('list', { name: 'Fuentes y aclaraciones' });
  const scrollTop = () => notes.evaluate((el) => el.scrollTop);
  expect(await notes.evaluate((el) => el.scrollHeight - el.clientHeight)).toBeGreaterThan(10);

  const cdp = await page.context().newCDPSession(page);
  // Finger up: the notes scroll, the legend stays open.
  await touchDrag(cdp, notes, 0, -80);
  await expect.poll(scrollTop).toBeGreaterThan(0);
  await expect(button).toHaveAttribute('aria-expanded', 'true');

  // Finger down while they are scrolled: they scroll back, the legend stays open.
  const scrolled = await scrollTop();
  await touchDrag(cdp, notes, 0, 40);
  await expect.poll(scrollTop).toBeLessThan(scrolled);
  await expect(button).toHaveAttribute('aria-expanded', 'true');

  // From their top, a pull down closes the legend.
  await notes.evaluate((el) => (el.scrollTop = 0));
  await touchDrag(cdp, notes, 0, 80);
  await expect(button).toHaveAttribute('aria-expanded', 'false');
});

test('on a wide screen the legend starts open, with its sources and notes folded (#114)', async ({ page, isMobile }) => {
  test.skip(isMobile, 'on a phone it starts closed (previous test)');
  await expect(page.getByRole('button', { name: /Leyenda/ })).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.legend').getByText('Expedición disponible')).toBeVisible();

  // What is only an illustration stays one tap away, not off the screen.
  const note = page.locator('.legend').getByText(/símbolo ilustrativo/);
  await expect(note).toBeHidden();
  await page.locator('.legend summary', { hasText: 'Fuentes y aclaraciones' }).click();
  await expect(note).toBeVisible();
});

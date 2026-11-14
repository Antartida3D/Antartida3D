import { expect, test, type Page } from '@playwright/test';
import { EXPLORED_KEY, VIEW_MODE_KEY } from '@antartida/core/storage';

// A real first visit: no saved state, unlike every other spec (see playwright.config.ts).
test.use({ storageState: { cookies: [], origins: [] } });

let consoleErrors: string[] = [];

test.beforeEach(async ({ page }) => {
  consoleErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => consoleErrors.push(e.message));
});

test.afterEach(() => {
  expect(consoleErrors, 'console errors').toEqual([]);
});

const ushuaia = (page: Page) => page.getByRole('button', { name: /^Desde Ushuaia, Ushuaia/ });
const hint = (page: Page) => page.locator('.hint');
const WELCOME = 'Tocá Desde Ushuaia para empezar';
// The welcome waits for the page to load and settle (SETTLE_MAX_MS after `load` at most).
const SETTLE_WAIT = 15_000;

/** The welcome is on: Ushuaia well inside the screen, its label open and the hint saying to start there. */
async function expectWelcome(page: Page) {
  await expect(hint(page)).toHaveText(WELCOME, { timeout: SETTLE_WAIT });
  const marker = ushuaia(page);
  await expect(marker).toBeVisible();
  await expect(marker).toHaveClass(/\bshown\b/);
  // Away from the left edge, with room for its label (on a phone the overview leaves it at the edge,
  // or off it in 3D). The 2D map eases there, so wait for it.
  await expect.poll(async () => (await marker.boundingBox())!.x).toBeGreaterThan(page.viewportSize()!.width * 0.15);
}

test('a first visit comes close to «Desde Ushuaia», opens its label, and one more touch starts the trip (#115)', async ({ page, isMobile }) => {
  await page.goto('/');
  await expectWelcome(page);
  if (isMobile) await ushuaia(page).tap();
  else await ushuaia(page).click();
  await expect(page.locator('.sheet.voyage')).toBeVisible();
  await expect(hint(page)).toHaveCount(0);
});

test('the welcome also comes close to Ushuaia on the 3D map, where a phone overview leaves it off the screen (#115)', async ({ page }) => {
  await page.addInitScript((key) => localStorage.setItem(key, '3d'), VIEW_MODE_KEY);
  await page.goto('/');
  await page.locator('.stage.m3d canvas').waitFor();
  await expectWelcome(page);
});

test('the welcome shows once: the next visit starts from the overview (#115)', async ({ page }) => {
  await page.goto('/');
  await expect(hint(page)).toHaveText(WELCOME, { timeout: SETTLE_WAIT });
  await page.reload();
  await expect(hint(page)).toHaveText('arrastrá para mover · pellizcá para acercar');
  await expect(ushuaia(page)).not.toHaveClass(/\bshown\b/);
});

test('dragging the map ends the welcome (#115)', async ({ page }) => {
  await page.goto('/');
  await expect(hint(page)).toHaveText(WELCOME, { timeout: SETTLE_WAIT });
  const box = (await page.locator('.vp').boundingBox())!;
  const [x, y] = [box.x + box.width / 2, box.y + box.height * 0.3];
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 80, y + 20, { steps: 5 });
  await page.mouse.up();
  await expect(hint(page)).toHaveCount(0);
});

test('no welcome once the trip from Ushuaia is done (#115)', async ({ page }) => {
  await page.addInitScript((key) => localStorage.setItem(key, JSON.stringify(['campana'])), EXPLORED_KEY);
  await page.goto('/');
  await expect(hint(page)).toHaveText('arrastrá para mover · pellizcá para acercar');
  await expect(ushuaia(page)).not.toHaveClass(/\bshown\b/);
});

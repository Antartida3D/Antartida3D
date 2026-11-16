import { expect, test, type Page } from '@playwright/test';
import { EXPLORED_KEY, VIEW_MODE_KEY } from '@antartida/core/storage';
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

test('the welcome waits for the 3D loading screen to close, which would cover it (#190)', async ({ page }) => {
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
  // Checked in the page, on every frame: the welcome must never be on while the loading screen is.
  await page.evaluate((text) => {
    const w = window as unknown as { __covered?: boolean };
    w.__covered = false;
    const watch = () => {
      const loading = document.querySelector('[data-loading-variant="map3d"]');
      if (loading && document.querySelector('.hint')?.textContent === text) w.__covered = true;
      if (loading) requestAnimationFrame(watch);
    };
    watch();
  }, WELCOME);
  await expect(loader).toBeHidden({ timeout: 30_000 });
  expect(await page.evaluate(() => (window as unknown as { __covered?: boolean }).__covered)).toBe(false);
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

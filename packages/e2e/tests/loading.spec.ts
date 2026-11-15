import { expect, test } from '@playwright/test';

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

test.describe('Loading screen', () => {
  for (const vp of [
    { name: 'desktop', width: 1440, height: 900, compact: false },
    { name: 'mobile', width: 390, height: 844, compact: true },
  ]) {
    test(`map3d loader shows centered illustration, progress and dismisses automatically (${vp.name})`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.setViewportSize({ width: vp.width, height: vp.height });

      await page.route(/terrain-mesh-.*\.bin/, async (route) => {
        await new Promise((r) => setTimeout(r, 3000));
        await route.continue();
      });

      await page.goto('/');

      const loader = page.locator('[data-loading-variant="map3d"]');
      await expect(loader).toBeVisible();
      await expect(loader.getByRole('progressbar')).toBeVisible();
      await expect(loader.locator('[aria-live="polite"]')).toBeAttached();
      await expect(loader.getByText('Desplegando la carta austral')).toBeVisible();

      // Antarctica SVG container should be centered horizontally.
      const camBox = await loader.locator('.ld-cam-map').boundingBox();
      expect(camBox).not.toBeNull();
      const camCenterX = camBox!.x + camBox!.width / 2;
      expect(Math.abs(camCenterX - vp.width / 2)).toBeLessThan(10);

      // Screen-reader live region must be visually clipped (1x1px), not rendered on screen.
      const srBox = await loader.locator('.ld-sr-only').boundingBox();
      expect(srBox).not.toBeNull();
      expect(srBox!.width).toBeLessThanOrEqual(2);
      expect(srBox!.height).toBeLessThanOrEqual(2);

      if (vp.compact) {
        await expect(loader.locator('.ld-compact')).toBeVisible();
      } else {
        await expect(loader.locator('.ld-desktop-progress')).toBeVisible();
      }

      await expect(loader).toBeHidden({ timeout: 20000 });
      await page.waitForFunction(() => Boolean((window as unknown as { __cameraControls?: unknown }).__cameraControls));
      await expect(page.locator('.stage.m3d canvas')).toBeVisible();
    });
  }

  test('map3d loader allows switching to 2D map mid-load', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.route(/terrain-mesh-.*\.bin/, async (route) => {
      await new Promise((r) => setTimeout(r, 3000));
      await route.continue();
    });

    await page.goto('/');

    const loader = page.locator('[data-loading-variant="map3d"]');
    await expect(loader).toBeVisible();
    await loader.getByRole('button', { name: 'Ver mapa 2D' }).click();

    await expect(loader).toBeHidden();
    await expect(page.getByRole('group', { name: 'Modo de vista' }).getByRole('button', { name: 'Mapa 2D' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  test('map3d loader respects prefers-reduced-motion when toggling 3D', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.route(/terrain-mesh-.*\.bin/, async (route) => {
      await new Promise((r) => setTimeout(r, 350));
      await route.continue();
    });

    await page.goto('/');
    await page.getByRole('group', { name: 'Modo de vista' }).getByRole('button', { name: 'Relieve 3D' }).click();

    const loader = page.locator('[data-loading-variant="map3d"]');
    await expect(loader).toBeVisible();
    await expect(loader.locator('.ld-pulse')).toHaveCount(0);
    await expect(loader).toBeHidden({ timeout: 20000 });
  });
});

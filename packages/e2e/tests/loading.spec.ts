import { expect, test, type Locator } from '@playwright/test';
import { MAP_2D_ENABLED, NO_2D } from './map-helpers.ts';

let consoleErrors: string[] = [];

test.beforeEach(async ({ page }) => {
  consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
});

test.afterEach(() => {
  expect(consoleErrors, 'console errors').toEqual([]);
});

const terrainAsset = /terrain-mesh-.*\.bin/;

interface LoadingRun {
  readonly variant: string;
  readonly mountedAt: number;
  readonly leavingAt: number;
  readonly removedAt: number;
}

function deferred() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

async function installLoadingTimingObserver(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    const key = '__loading_test_runs__';
    let tracked: Element | null = null;
    let run: Partial<LoadingRun> = {};

    const readRuns = (): LoadingRun[] => {
      try {
        return JSON.parse(sessionStorage.getItem(key) ?? '[]') as LoadingRun[];
      } catch {
        return [];
      }
    };
    const writeRun = (completed: LoadingRun) => {
      try {
        sessionStorage.setItem(key, JSON.stringify([...readRuns(), completed]));
      } catch {
        // The test still has the live DOM assertion if storage is unavailable.
      }
    };

    new MutationObserver(() => {
      const now = performance.now();
      const loader = document.querySelector('.ld');

      if (tracked && !document.contains(tracked)) {
        if (run.mountedAt !== undefined && run.leavingAt !== undefined) {
          writeRun({
            variant: run.variant ?? '',
            mountedAt: run.mountedAt,
            leavingAt: run.leavingAt,
            removedAt: now,
          });
        }
        tracked = null;
        run = {};
      }

      if (!tracked && loader) {
        tracked = loader;
        run = { mountedAt: now, variant: loader.getAttribute('data-loading-variant') ?? '' };
      }

      if (tracked && loader === tracked) {
        run.variant = loader.getAttribute('data-loading-variant') ?? run.variant;
      }
      if (tracked?.getAttribute('data-leaving') === 'true' && run.leavingAt === undefined) {
        run.leavingAt = now;
      }
    }).observe(document, {
      attributes: true,
      attributeFilter: ['data-leaving', 'data-loading-variant'],
      childList: true,
      subtree: true,
    });
  });
}

async function loadingRuns(page: import('@playwright/test').Page): Promise<LoadingRun[]> {
  return page.evaluate(() => {
    try {
      return JSON.parse(sessionStorage.getItem('__loading_test_runs__') ?? '[]') as LoadingRun[];
    } catch {
      return [];
    }
  });
}

function expectReadableTiming(run: LoadingRun) {
  expect(run.leavingAt - run.mountedAt).toBeGreaterThanOrEqual(1_750);
  expect(run.removedAt - run.leavingAt).toBeGreaterThanOrEqual(500);
}

async function expectPaperFixed(loader: Locator) {
  const colors = await loader.evaluate((element: HTMLElement) => {
    const loaderStyle = getComputedStyle(element);
    const probe = document.createElement('div');
    probe.style.backgroundColor = 'var(--paper)';
    probe.style.position = 'absolute';
    document.body.append(probe);
    const paperColor = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return {
      position: loaderStyle.position,
      backgroundColor: loaderStyle.backgroundColor,
      paperColor,
    };
  });

  expect(colors.position).toBe('fixed');
  expect(colors.backgroundColor).toBe(colors.paperColor);
}

test.describe('Loading screen', () => {
  test('map3d loader keeps the progressive map over one centered card', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await installLoadingTimingObserver(page);
    const terrain = deferred();
    await page.route(terrainAsset, async (route) => {
      await terrain.promise;
      await route.continue();
    });
    try {
      await page.goto('/', { waitUntil: 'domcontentloaded' });

      const loader = page.locator('[data-loading-variant="map3d"]');
      await expect(loader).toBeVisible();
      await expect(loader.getByRole('progressbar')).toBeVisible();
      await expect(loader.locator('[aria-live="polite"]')).toBeAttached();
      await expect(loader.getByText('Desplegando la carta austral')).toBeVisible();
      await expect(loader.locator('.ld-step')).toHaveCount(5);
      await expect(loader.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '5');

      const cards = loader.locator('.ld-card');
      await expect(cards).toHaveCount(1);
      await expect(loader.locator('.ld-desktop-progress, .ld-desktop-fact, .ld-compact')).toHaveCount(0);
      await expect(loader.locator('.ld-cam-map svg')).toBeAttached();
      await expect(loader.locator('.ld-cam-map .ld-reveal')).toBeAttached();
      await expectPaperFixed(loader);

      const camBox = await loader.locator('.ld-cam-map').boundingBox();
      const cardBox = await cards.boundingBox();
      expect(camBox).not.toBeNull();
      expect(cardBox).not.toBeNull();
      expect(Math.abs(camBox!.x + camBox!.width / 2 - (cardBox!.x + cardBox!.width / 2))).toBeLessThan(24);
      expect(camBox!.y + camBox!.height).toBeLessThanOrEqual(cardBox!.y + 2);

      // Release only after the structural assertions: the gate keeps the loader mounted.
      terrain.release();
      await expect(page.locator('.ld')).toHaveCount(0, { timeout: 10_000 });
      await expect.poll(async () => (await loadingRuns(page)).length).toBeGreaterThanOrEqual(1);
      expectReadableTiming((await loadingRuns(page))[0]!);
      await page.waitForFunction(() => Boolean((window as unknown as { __cameraControls?: unknown }).__cameraControls));
      await expect(page.locator('.stage.m3d canvas')).toBeVisible();
    } finally {
      terrain.release();
    }
  });

  test('a fast cache load survives F5 in the same browser context', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await installLoadingTimingObserver(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('.ld')).toHaveCount(0, { timeout: 10_000 });
    await expect.poll(async () => (await loadingRuns(page)).length).toBeGreaterThanOrEqual(1);

    // Deliberately do not add a route: this exercises the browser cache on a real reload.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('.ld')).toHaveCount(0, { timeout: 10_000 });
    await expect.poll(async () => (await loadingRuns(page)).length).toBeGreaterThanOrEqual(2);
    const runs = await loadingRuns(page);
    expect(runs[0]!.variant).toBe('map3d');
    expect(runs[1]!.variant).toBe('map3d');
    expectReadableTiming(runs[0]!);
    expectReadableTiming(runs[1]!);
  });

  test('saved 2D mode finishes with the base and ink milestones without waiting for 3D', async ({ page }) => {
    test.skip(!MAP_2D_ENABLED, NO_2D);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const terrain = deferred();
    await page.route(terrainAsset, async (route) => {
      await terrain.promise;
      await route.continue();
    });
    await page.addInitScript(() => localStorage.setItem('antartida:view', '2d'));
    try {
      await page.goto('/', { waitUntil: 'domcontentloaded' });

      const loader = page.locator('[data-loading-variant="map2d"]');
      await expect(loader).toBeVisible();
      await expect(loader.locator('.ld-step')).toHaveCount(2);
      await expect(loader.locator('.ld-step').filter({ hasText: /Inicialización/i })).toBeVisible();
      await expect(loader.locator('.ld-step').filter({ hasText: /Carta\s*2D/i })).toBeVisible();
      await expect(loader.locator('.ld-step').filter({ hasText: /Mapa base y trazos/i })).toBeVisible();
      await expect(loader.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '2');

      // The 2D view is usable even while the idle 3D preload remains behind the gate.
      await expect(page.locator('.ld')).toHaveCount(0, { timeout: 10_000 });
      await expect(page.locator('.stage:not(.m3d)')).toBeVisible();
    } finally {
      terrain.release();
    }
  });

  test('a slow 3D request is controlled by a route gate, and the user can leave for 2D', async ({ page }) => {
    test.skip(!MAP_2D_ENABLED, NO_2D);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const terrain = deferred();
    await page.route(terrainAsset, async (route) => {
      await terrain.promise;
      await route.continue();
    });
    try {
      await page.goto('/', { waitUntil: 'domcontentloaded' });

      const loader = page.locator('[data-loading-variant="map3d"]');
      await expect(loader).toBeVisible();
      await expect(loader.locator('.ld-step')).toHaveCount(5);
      await loader.getByRole('button', { name: 'Ver mapa 2D' }).click();

      // Switching is an explicit escape hatch; it does not wait for the gated 3D request.
      await expect(page.locator('.ld')).toHaveCount(0, { timeout: 10_000 });
      await expect(page.locator('.stage:not(.m3d)')).toBeVisible();
    } finally {
      terrain.release();
    }
  });

  test('with the 2D map off a slow 3D load offers no way out to 2D, and a failed one switches to it alone (#227)', async ({ page }) => {
    test.skip(MAP_2D_ENABLED, 'Solo con el mapa 2D deshabilitado');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const terrain = deferred();
    await page.route(terrainAsset, async (route) => {
      await terrain.promise;
      // An empty mesh cannot be read: the 3D map reports a load error.
      await route.fulfill({ status: 200, contentType: 'application/octet-stream', body: '' });
    });
    try {
      await page.goto('/', { waitUntil: 'domcontentloaded' });

      const loader = page.locator('[data-loading-variant="map3d"]');
      await expect(loader).toBeVisible();
      await expect(loader.locator('.ld-step')).toHaveCount(5);
      await expect(page.getByRole('button', { name: 'Ver mapa 2D' })).toHaveCount(0);
    } finally {
      terrain.release();
    }

    await expect(page.locator('.ld')).toHaveCount(0, { timeout: 10_000 });
    await expect(page.locator('.stage:not(.m3d)')).toBeVisible();
    const off = page.getByRole('button', { name: 'Relieve 3D apagado: ver cómo activarlo' });
    await expect(off).toBeVisible();
    await expect(page.getByRole('button', { name: 'Mapa 2D' })).toHaveCount(0);
    await off.click();
    const note = page.getByRole('dialog', { name: 'No pudimos cargar el relieve 3D' });
    await expect(note).toContainText('No pudimos cargar la malla del relieve.');
    await note.getByRole('button', { name: 'Entendido' }).click();
    await expect(note).toHaveCount(0);
  });

  test('reduced motion removes the loader animation while keeping the 3D contract', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const terrain = deferred();
    await page.route(terrainAsset, async (route) => {
      await terrain.promise;
      await route.continue();
    });

    try {
      await page.goto('/', { waitUntil: 'domcontentloaded' });

      if (MAP_2D_ENABLED) {
        // With the 2D map on, reduced motion starts in 2D.
        await expect(page.locator('.ld')).toHaveCount(0, { timeout: 10_000 });
        await page.getByRole('group', { name: 'Modo de vista' }).getByRole('button', { name: 'Relieve 3D' }).click();
      }

      const map3dLoader = page.locator('[data-loading-variant="map3d"]');
      await expect(map3dLoader).toBeVisible();
      await expect(map3dLoader.locator('.ld-pulse')).toHaveCount(0);
      terrain.release();
      await expect(page.locator('.ld')).toHaveCount(0, { timeout: 10_000 });
    } finally {
      terrain.release();
    }
  });
});

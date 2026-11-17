import { expect, test, type Locator, type Page } from '@playwright/test';
import { MAX_K, MIN_K } from '../../core/src/viewport.ts';
import { show3D } from './map-helpers.ts';
import { mockOpenMeteo } from './weather-helpers.ts';
import { LIST_BUTTON_LABEL } from '../../core/src/content/points.ts';

const zoomButton = (page: Page, name: 'Acercar' | 'Alejar') =>
  page.getByRole('button', { name, exact: true, includeHidden: true });

const cameraRange = (page: Page) => page.evaluate(() => {
  const cc = (window as any).__cameraControls;
  return { distance: cc.getSpherical(undefined, false).radius as number, min: cc.minDistance as number, max: cc.maxDistance as number };
});

/** Wait for the rendered distance, including the tail after camera-controls emits `rest`. */
async function settled3D(page: Page) {
  await page.waitForFunction(() => {
    const cc = (window as any).__cameraControls;
    (window as any).__invalidate();
    return !cc.active && Math.abs(cc.getSpherical(undefined, false).radius - cc.getSpherical().radius) < 1e-4;
  }, null, { timeout: 15_000 });
}

const layerScale = (page: Page) => page.locator('.vp .layer').evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a);

async function settled2D(page: Page) {
  await expect.poll(() => page.locator('.vp .layer').evaluate((el) => {
    const rendered = new DOMMatrix(getComputedStyle(el).transform).a;
    const target = new DOMMatrix((el as HTMLElement).style.transform).a;
    return Math.abs(rendered - target);
  })).toBeLessThan(1e-4);
}

/** Bounded clicks, waiting for each command to take effect before reading its final position. */
async function clickToLimit(
  button: Locator,
  read: () => Promise<{ value: number; limit: number }>,
  settle: () => Promise<void>,
) {
  await expect(button).toBeVisible();
  for (let clicks = 0; clicks < 24; clicks++) {
    const before = await read();
    // React may not have applied visibility yet. The actual limit decides whether to stop.
    if (Math.abs(before.value - before.limit) <= 0.01) break;
    await button.focus();
    await button.click();
    await expect.poll(async () => Math.abs((await read()).value - before.value), { timeout: 15_000 }).toBeGreaterThan(1e-6);
    await settle();
  }
  await expect(button).toBeHidden();
  await expect(button).toBeDisabled();
}

const clickTo3DLimit = (page: Page, name: 'Acercar' | 'Alejar') => clickToLimit(zoomButton(page, name), async () => {
  const range = await cameraRange(page);
  return { value: range.distance, limit: name === 'Acercar' ? range.min : range.max };
}, () => settled3D(page));

const clickTo2DLimit = (page: Page, name: 'Acercar' | 'Alejar') => clickToLimit(zoomButton(page, name), async () => ({
  value: await layerScale(page), limit: name === 'Acercar' ? MAX_K : MIN_K,
}), () => settled2D(page));

/** The hidden button keeps its space so the remaining controls do not jump under the pointer. */
const rawControlRects = (page: Page) => page.locator('.zoom button').evaluateAll((buttons) => buttons.map((button) => {
  const { x, y, width, height } = button.getBoundingClientRect();
  return { x, y, width, height };
}));

/** The rects once the controls stopped sliding in: two reads a moment apart agree (#267). */
async function controlRects(page: Page) {
  let last = await rawControlRects(page);
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(250);
    const now = await rawControlRects(page);
    if (JSON.stringify(now) === JSON.stringify(last)) return now;
    last = now;
  }
  return last;
}

async function wheelOnMap(page: Page, deltaY: number) {
  const map = page.getByRole('application', { name: /Mapa.*Antártida/ });
  const spot = await map.evaluate((el) => {
    const box = el.getBoundingClientRect();
    // Markers have their own pointer handlers. Find an exposed point near the map centre.
    for (const x of [0.5, 0.35, 0.65]) for (const y of [0.45, 0.35, 0.55]) {
      const point = { x: box.left + box.width * x, y: box.top + box.height * y };
      const hit = document.elementFromPoint(point.x, point.y);
      if (hit && el.contains(hit) && !hit.closest('button')) return point;
    }
    return null;
  });
  expect(spot, 'a part of the map without a marker').not.toBeNull();
  await page.mouse.move(spot!.x, spot!.y);
  await page.mouse.wheel(0, deltaY);
}

/** Two real touch contacts move towards each other, backing away from the near limit. */
async function pinchFarther(page: Page) {
  const map = page.getByRole('application', { name: /Mapa en relieve 3D/ });
  const centre = await map.evaluate((el) => {
    const box = el.getBoundingClientRect();
    for (const y of [0.3, 0.4, 0.5]) {
      const point = { x: box.left + box.width / 2, y: box.top + box.height * y };
      const gaps = Array.from({ length: 11 }, (_, step) => 70 - 35 * step / 10);
      if (gaps.every((gap) => [-1, 1].every((side) =>
        document.elementFromPoint(point.x + side * gap, point.y)?.tagName === 'CANVAS'
      ))) return point;
    }
    return null;
  });
  expect(centre, 'an exposed part of the canvas for both fingers').not.toBeNull();
  const cdp = await page.context().newCDPSession(page);
  const points = (u: number) => [-1, 1].map((side, id) => ({
    id, x: centre!.x + side * (70 - 35 * u), y: centre!.y,
  }));
  try {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points(0) });
    for (let step = 1; step <= 10; step++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: points(step / 10) });
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } finally {
    await cdp.detach();
  }
}

test.beforeEach(async ({ page }) => {
  await mockOpenMeteo(page);
});

for (const reducedMotion of ['reduce', 'no-preference'] as const) {
  test.describe(`zoom limits with motion: ${reducedMotion}`, () => {
    test.use({ reducedMotion });

    test('3D hides each limit, preserves the controls and restores zoom through keys, wheel and pinch (#237)', async ({ page, isMobile }, testInfo) => {
      test.setTimeout(120_000);
      await page.goto('/');
      await show3D(page);
      await page.waitForFunction(() => (window as any).__cameraControls && (window as any).__invalidate);
      // A clear ice plateau avoids models and the different Tierra del Fuego minimum.
      await page.evaluate(() => {
        const cc = (window as any).__cameraControls;
        cc.moveTo(-50, 0, 0, false);
        cc.dollyTo(cc.maxDistance, false);
        (window as any).__invalidate();
      });
      await settled3D(page);
      const closer = zoomButton(page, 'Acercar');
      const farther = zoomButton(page, 'Alejar');
      const map = page.getByRole('application', { name: /Mapa en relieve 3D/ });
      await expect(farther).toBeHidden();
      await expect(farther).toBeDisabled();
      await expect(closer).toBeVisible();
      const positions = await controlRects(page);

      await clickTo3DLimit(page, 'Acercar');
      const near = await cameraRange(page);
      expect(near.distance).toBeCloseTo(near.min, 2);
      await expect(farther).toBeFocused();
      expect(await controlRects(page)).toEqual(positions);
      await page.screenshot({ path: testInfo.outputPath('zoom-closest.png') });

      await map.focus();
      const usePinch = isMobile && reducedMotion === 'reduce';
      if (usePinch) await pinchFarther(page);
      else await page.keyboard.press('-');
      await expect(closer).toBeVisible();
      await expect(closer).toBeEnabled();
      if (!usePinch) await expect(map).toBeFocused();
      await settled3D(page);
      expect((await cameraRange(page)).distance).toBeGreaterThan(near.distance);

      await clickTo3DLimit(page, 'Alejar');
      const far = await cameraRange(page);
      expect(far.distance).toBeCloseTo(far.max, 2);
      await expect(closer).toBeFocused();
      expect(await controlRects(page)).toEqual(positions);
      await page.screenshot({ path: testInfo.outputPath('zoom-farthest.png') });

      await wheelOnMap(page, -150);
      await expect(farther).toBeVisible();
      await expect(farther).toBeEnabled();
      await settled3D(page);
      expect((await cameraRange(page)).distance).toBeLessThan(far.distance);
    });

    test('2D fallback hides both limits and restores zoom through keys and wheel (#237)', async ({ page }, testInfo) => {
      await page.addInitScript(() => {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind: string, ...args: unknown[]) {
          return /webgl/.test(kind) ? null : (original as (...a: unknown[]) => unknown).call(this, kind, ...args);
        } as typeof original;
      });
      await page.goto('/');
      await expect(page.locator('section.ld')).toHaveCount(0);
      await expect(page.locator('.vp .layer')).toBeVisible();
      await expect(page.locator('canvas')).toHaveCount(0);
      const closer = zoomButton(page, 'Acercar');
      const farther = zoomButton(page, 'Alejar');
      const map = page.getByRole('application', { name: /Mapa de la Antártida/ });
      await expect(farther).toBeHidden();
      await expect(farther).toBeDisabled();
      expect(await layerScale(page)).toBeCloseTo(MIN_K, 3);
      const positions = await controlRects(page);

      await clickTo2DLimit(page, 'Acercar');
      expect(await layerScale(page)).toBeCloseTo(MAX_K, 3);
      await expect(farther).toBeFocused();
      expect(await controlRects(page)).toEqual(positions);
      await page.screenshot({ path: testInfo.outputPath('zoom-closest.png') });

      await map.focus();
      await page.keyboard.press('-');
      await expect(closer).toBeVisible();
      await expect(closer).toBeEnabled();
      await expect(map).toBeFocused();
      await settled2D(page);

      await clickTo2DLimit(page, 'Alejar');
      expect(await layerScale(page)).toBeCloseTo(MIN_K, 3);
      await expect(closer).toBeFocused();
      expect(await controlRects(page)).toEqual(positions);
      await page.screenshot({ path: testInfo.outputPath('zoom-farthest.png') });

      await wheelOnMap(page, -150);
      await expect(farther).toBeVisible();
      await expect(farther).toBeEnabled();
      await settled2D(page);
      expect(await layerScale(page)).toBeGreaterThan(MIN_K);
    });
  });
}

test('3D updates the far limit after resizing and during a voyage (#237)', async ({ page, isMobile }) => {
  test.setTimeout(120_000);
  await page.goto('/');
  await show3D(page);
  await page.waitForFunction(() => (window as any).__cameraControls && (window as any).__invalidate);
  await settled3D(page);
  const farther = zoomButton(page, 'Alejar');
  const map = page.getByRole('application', { name: /Mapa en relieve 3D/ });
  await expect(farther).toBeHidden();
  const original = page.viewportSize()!;
  const overview = await cameraRange(page);

  await page.setViewportSize({ width: isMobile ? 320 : 390, height: original.height });
  await expect.poll(async () => (await cameraRange(page)).max).toBeGreaterThan(overview.max);
  await expect(farther).toBeVisible();
  await clickTo3DLimit(page, 'Alejar');
  await page.setViewportSize(original);
  await expect.poll(async () => (await cameraRange(page)).max).toBeCloseTo(overview.max, 2);
  await settled3D(page);
  await expect(farther).toBeHidden();

  // The existing phone voyage layout hides the whole zoom group, independently of its limits.
  if (isMobile) return;
  await page.getByRole('button', { name: LIST_BUTTON_LABEL }).click();
  await page.getByRole('dialog', { name: 'Todos los puntos' }).getByRole('button', { name: /Desde Ushuaia/ }).click();
  await page.getByRole('group', { name: 'Medio de transporte' }).getByRole('button', { name: /Irízar/ }).click();
  await page.getByRole('button', { name: 'Zarpar' }).click();
  await page.getByRole('button', { name: 'Próximo hito', exact: true }).click();
  await settled3D(page);
  await expect.poll(async () => (await cameraRange(page)).max).toBeLessThan(overview.max / 3);
  await expect(farther).toBeVisible();
  await clickTo3DLimit(page, 'Alejar');
  const trip = await cameraRange(page);
  expect(trip.distance).toBeCloseTo(trip.max, 2);

  await map.focus();
  await page.keyboard.press('+');
  await expect(farther).toBeVisible();
  await page.getByRole('button', { name: 'Salir del viaje' }).click();
  await expect.poll(async () => (await cameraRange(page)).max).toBeCloseTo(overview.max, 2);
  await settled3D(page);
  // The viewport can move farther away again when the trip releases its smaller maximum.
  await expect(farther).toBeVisible();
  await expect(farther).toBeEnabled();
});

test('3D updates zoom buttons within four frames of the wheel destination, before motion rests (#237)', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await show3D(page);
  await page.waitForFunction(() => (window as any).__cameraControls && (window as any).__invalidate);

  type Response = { frames: number; distance: number; destination: number; limit: number };
  const results: Array<Response & { button: string; hidden: boolean }> = [];
  const measureResponse = async (name: 'Acercar' | 'Alejar', hidden: boolean, deltaY: number): Promise<Response> => {
    await page.evaluate(({ name, hidden }) => {
      const cc = (window as any).__cameraControls;
      const button = document.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`)!;
      const probe = { frame: 0, destinationFrame: -1, result: null as Response | null, lastSample: null as unknown, raf: 0 };
      (window as any).__zoomLimitResponse = probe;
      const sample = () => {
        const destination = cc.getSpherical(undefined, true).radius;
        const distance = cc.getSpherical(undefined, false).radius;
        const limit = name === 'Acercar' ? cc.minDistance : cc.maxDistance;
        const atLimit = Math.abs(destination - limit) <= 0.01;
        if (probe.destinationFrame < 0 && atLimit === hidden) probe.destinationFrame = probe.frame;
        const stateMatches = hidden
          ? getComputedStyle(button).visibility === 'hidden' && button.disabled
          : getComputedStyle(button).visibility === 'visible' && !button.disabled;
        probe.lastSample = {
          frame: probe.frame, destinationFrame: probe.destinationFrame, distance, destination, limit,
          target: cc.getTarget().toArray(), visibility: getComputedStyle(button).visibility, disabled: button.disabled,
        };
        if (probe.destinationFrame >= 0 && stateMatches) {
          probe.result = { frames: probe.frame - probe.destinationFrame, distance, destination, limit };
          return;
        }
        probe.frame++;
        probe.raf = requestAnimationFrame(sample);
      };
      probe.raf = requestAnimationFrame(sample);
    }, { name, hidden });
    try {
      // The pointer stays on the canvas throughout: no hovering or clicking the zoom buttons.
      await page.mouse.wheel(0, deltaY);
      await page.waitForFunction(() => (window as any).__zoomLimitResponse.result !== null, null, { timeout: 10_000 });
      return await page.evaluate(() => (window as any).__zoomLimitResponse.result as Response);
    } catch (error) {
      const lastSample = await page.evaluate(() => (window as any).__zoomLimitResponse.lastSample);
      await testInfo.attach(`zoom-response-timeout-${name}-${hidden ? 'hidden' : 'visible'}.json`, {
        body: JSON.stringify(lastSample, null, 2), contentType: 'application/json',
      });
      throw error;
    } finally {
      await page.evaluate(() => cancelAnimationFrame((window as any).__zoomLimitResponse.raf));
    }
  };

  try {
    for (const name of ['Acercar', 'Alejar'] as const) {
      await page.evaluate((name) => {
        const cc = (window as any).__cameraControls;
        const distance = name === 'Acercar' ? cc.minDistance * 1.1 : cc.maxDistance / 1.1;
        const component = distance / Math.sqrt(2);
        // Reset both target and orientation so the preceding reversed gesture cannot alter the setup.
        cc.setLookAt(-50, component, component, -50, 0, 0, false);
        cc.dollyTo(distance, false);
        (window as any).__invalidate();
      }, name);
      await settled3D(page);
      await expect(zoomButton(page, 'Acercar')).toBeVisible();
      await expect(zoomButton(page, 'Alejar')).toBeVisible();
      const spot = await page.locator('.stage.m3d canvas').evaluate((canvas) => {
        const rect = canvas.getBoundingClientRect();
        // At the vertical centre dollyToCursor does not lift or sink the target, which would
        // invoke ground correction and change the destination before this probe can read it.
        for (const x of [0.5, 0.35, 0.65]) {
          const point = { x: rect.left + rect.width * x, y: rect.top + rect.height / 2 };
          if (document.elementFromPoint(point.x, point.y) === canvas) return point;
        }
        return null;
      });
      expect(spot, 'an exposed canvas point for the wheel').not.toBeNull();
      await page.mouse.move(spot!.x, spot!.y);

      const deltaY = name === 'Acercar' ? -150 : 150;
      const hidden = await measureResponse(name, true, deltaY);
      results.push({ button: name, hidden: true, ...hidden });
      // Reverse immediately while the camera is still travelling; do not wait for `rest`.
      const visible = await measureResponse(name, false, -deltaY);
      results.push({ button: name, hidden: false, ...visible });
      expect.soft(hidden.frames, `${name} hides as soon as its destination reaches the limit`).toBeLessThanOrEqual(4);
      expect.soft(Math.abs(hidden.distance - hidden.destination), `${name} hides before the camera arrives`).toBeGreaterThan(0.01);
      expect.soft(visible.frames, `${name} reappears as soon as its destination leaves the limit`).toBeLessThanOrEqual(4);
      expect.soft(Math.abs(visible.distance - visible.destination), `${name} reappears during the reverse motion`).toBeGreaterThan(0.01);
    }
  } finally {
    await testInfo.attach('zoom-response-frames.json', { body: JSON.stringify(results, null, 2), contentType: 'application/json' });
  }
});

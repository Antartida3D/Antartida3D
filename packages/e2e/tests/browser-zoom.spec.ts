import { expect, test, type Page } from '@playwright/test';
import { openOrcadasFromMap } from './orcadas-helpers.ts';

type ZoomKey = { key: string; code: string; shiftKey?: boolean };

async function dispatchCtrlZoomKey(page: Page, selector: string, key: ZoomKey) {
  return page.locator(selector).evaluate((el, key) => {
    const event = new KeyboardEvent('keydown', {
      key: key.key,
      code: key.code,
      ctrlKey: true,
      shiftKey: key.shiftKey,
      bubbles: true,
      cancelable: true,
    });
    el.dispatchEvent(event);
    return event.defaultPrevented;
  }, key);
}

async function dispatchWheelAtCenter(page: Page, selector: string, deltaY: number) {
  return page.locator(selector).evaluate((el, deltaY) => {
    const target = el.querySelector('canvas') ?? el;
    const rect = target.getBoundingClientRect();
    const event = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
      deltaY,
      deltaMode: 0,
    });
    target.dispatchEvent(event);
    return event.defaultPrevented;
  }, deltaY);
}

async function dispatchWheelAt(
  page: Page,
  selector: string,
  options: { deltaY: number; ctrlKey?: boolean; deltaX?: number; deltaZ?: number; deltaMode?: number },
) {
  return page.locator(selector).evaluate((el, options) => {
    const target = el.querySelector('canvas') ?? el;
    const rect = target.getBoundingClientRect();
    const event = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      clientX: rect.left + rect.width * 0.31,
      // Keep the pointer off centre while avoiding the relief's ground-target correction band.
      clientY: rect.top + rect.height * 0.5,
      deltaX: options.deltaX ?? 0,
      deltaY: options.deltaY,
      deltaZ: options.deltaZ ?? 0,
      deltaMode: options.deltaMode ?? 0,
      ctrlKey: options.ctrlKey ?? false,
      altKey: true,
      shiftKey: true,
      metaKey: false,
    });
    target.dispatchEvent(event);
    return event.defaultPrevented;
  }, options);
}

async function cameraState(page: Page, name: '__cameraControls' | '__orcadasCamera') {
  return page.evaluate((key) => {
    const controls = (window as any)[key];
    return {
      position: controls.getPosition().toArray(),
      target: controls.getTarget().toArray(),
      distance: controls.distance as number,
      zoom: controls.camera.zoom as number,
    };
  }, name);
}

async function moveToMiddleDistance(page: Page, name: '__cameraControls' | '__orcadasCamera') {
  const middle = await page.evaluate((key) => {
    const controls = (window as any)[key];
    const distance = (controls.minDistance + controls.maxDistance) / 2;
    controls.dollyTo(distance, false);
    (window as any).__invalidate?.();
    return distance;
  }, name);
  await page.waitForFunction(([key, distance]: readonly [string, number]) => {
    const controls = (window as any)[key];
    return Math.abs(controls.distance - distance) < 0.001;
  }, [name, middle] as const);
  await syncCameraFrame(page, name);
}

async function syncCameraFrame(page: Page, name: '__cameraControls' | '__orcadasCamera') {
  await page.evaluate(async (key) => {
    const controls = (window as any)[key];
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    controls.update(0);
    (window as any).__invalidate?.();
  }, name);
}

async function waitCameraSettled(page: Page, name: '__cameraControls' | '__orcadasCamera', beforeDistance: number) {
  await page.waitForFunction(([key, before]: readonly [string, number]) => {
    const controls = (window as any)[key];
    (window as any).__invalidate?.();
    return Math.abs(controls.distance - before) > 0.001;
  }, [name, beforeDistance] as const);
  await page.waitForFunction((key) => {
    const controls = (window as any)[key];
    (window as any).__invalidate?.();
    const now = controls.getSpherical(undefined, false);
    const end = controls.getSpherical();
    const target = controls.getTarget(undefined, false);
    const targetEnd = controls.getTarget();
    const close = (a: number, b: number) => Math.abs(a - b) < 1e-4;
    return !controls.active && close(now.theta, end.theta) && close(now.phi, end.phi) &&
      close(now.radius, end.radius) && target.distanceTo(targetEnd) < 1e-4;
  }, name);
}

async function waitCameraSettledWithoutDistance(page: Page, name: '__cameraControls' | '__orcadasCamera') {
  await page.waitForFunction((key) => {
    const controls = (window as any)[key];
    (window as any).__invalidate?.();
    const now = controls.getSpherical(undefined, false);
    const end = controls.getSpherical();
    const target = controls.getTarget(undefined, false);
    const targetEnd = controls.getTarget();
    const close = (a: number, b: number) => Math.abs(a - b) < 1e-4;
    return !controls.active && close(now.theta, end.theta) && close(now.phi, end.phi) &&
      close(now.radius, end.radius) && target.distanceTo(targetEnd) < 1e-4;
  }, name);
}

function expectSameCamera(actual: Awaited<ReturnType<typeof cameraState>>, expected: Awaited<ReturnType<typeof cameraState>>) {
  expect(actual.distance).toBeCloseTo(expected.distance, 3);
  for (let i = 0; i < actual.position.length; i++) expect(actual.position[i]).toBeCloseTo(expected.position[i], 3);
  for (let i = 0; i < actual.target.length; i++) expect(actual.target[i]).toBeCloseTo(expected.target[i], 3);
  expect(actual.zoom).toBe(expected.zoom);
}

async function restoreCamera(page: Page, name: '__cameraControls' | '__orcadasCamera', state: Awaited<ReturnType<typeof cameraState>>) {
  await page.evaluate(({ key, state }) => {
    const controls = (window as any)[key];
    void controls.setLookAt(...state.position, ...state.target, false);
    void controls.zoomTo(state.zoom, false);
    (window as any).__invalidate?.();
  }, { key: name, state });
  await syncCameraFrame(page, name);
}

test.beforeEach(async ({ page }) => {
  page.on('pageerror', (error) => { throw error; });
  page.on('console', (message) => {
    if (message.type() === 'error') throw new Error(message.text());
  });
  await page.goto('/');
});

test('2D map: Ctrl zoom keys match a centred normal wheel in both directions', async ({ page }) => {
  const map = page.locator('.vp');
  const cases: Array<{ key: ZoomKey; deltaY: number }> = [
    { key: { key: '=', code: 'Equal' }, deltaY: -100 },
    { key: { key: '+', code: 'Equal', shiftKey: true }, deltaY: -100 },
    { key: { key: '-', code: 'Minus' }, deltaY: 100 },
    { key: { key: 'Add', code: 'NumpadAdd' }, deltaY: -100 },
    { key: { key: 'Subtract', code: 'NumpadSubtract' }, deltaY: 100 },
  ];
  for (const { key, deltaY } of cases) {
    await page.reload();
    await expect(map).toBeVisible();
    await map.focus();
    // Start both comparisons from the same non-boundary view; a second wheel below is the
    // reference action, so the keyboard event cannot inherit the previous case's transform.
    const seed = await map.locator('..').evaluate((el) => (el.querySelector<HTMLElement>('.layer')?.style.transform ?? ''));
    expect(await dispatchWheelAtCenter(page, '.vp', -100)).toBe(true);
    await expect.poll(() => map.locator('..').evaluate((el) => el.querySelector<HTMLElement>('.layer')?.style.transform ?? '')).not.toBe(seed);
    const before = await map.locator('..').evaluate((el) => el.querySelector<HTMLElement>('.layer')?.style.transform ?? '');
    expect(await dispatchCtrlZoomKey(page, '.vp', key)).toBe(true);
    await expect.poll(() => map.locator('..').evaluate((el) => el.querySelector<HTMLElement>('.layer')?.style.transform ?? '')).not.toBe(before);
    const keyboardStyle = await map.locator('..').evaluate((el) => el.querySelector<HTMLElement>('.layer')?.style.transform ?? '');

    await page.reload();
    await expect(map).toBeVisible();
    const wheelSeed = await map.locator('..').evaluate((el) => el.querySelector<HTMLElement>('.layer')?.style.transform ?? '');
    expect(await dispatchWheelAtCenter(page, '.vp', -100)).toBe(true);
    await expect.poll(() => map.locator('..').evaluate((el) => el.querySelector<HTMLElement>('.layer')?.style.transform ?? '')).not.toBe(wheelSeed);
    const wheelBefore = await map.locator('..').evaluate((el) => el.querySelector<HTMLElement>('.layer')?.style.transform ?? '');
    expect(await dispatchWheelAtCenter(page, '.vp', deltaY)).toBe(true);
    await expect.poll(() => map.locator('..').evaluate((el) => el.querySelector<HTMLElement>('.layer')?.style.transform ?? '')).not.toBe(wheelBefore);
    const wheelStyle = await map.locator('..').evaluate((el) => el.querySelector<HTMLElement>('.layer')?.style.transform ?? '');
    expect(keyboardStyle).toBe(wheelStyle);
  }
});

test('3D relief: Ctrl zoom keys match a centred normal wheel and preserve camera.zoom', async ({ page }) => {
  const cases = [
    { press: 'Control+Equal', deltaY: -100 },
    { press: 'Control+Minus', deltaY: 100 },
  ];
  await page.getByRole('button', { name: 'Relieve 3D', exact: true }).click();
  await page.waitForFunction(() => Boolean((window as any).__cameraControls));
  const map = page.locator('.vp');
  for (const { press, deltaY } of cases) {
    await moveToMiddleDistance(page, '__cameraControls');
    await map.focus();
    const before = await cameraState(page, '__cameraControls');
    await page.keyboard.press(press);
    await waitCameraSettled(page, '__cameraControls', before.distance);
    const keyboard = await cameraState(page, '__cameraControls');

    await restoreCamera(page, '__cameraControls', before);
    const wheelBefore = await cameraState(page, '__cameraControls');
    expect(await dispatchWheelAtCenter(page, '.vp', deltaY)).toBe(true);
    await waitCameraSettled(page, '__cameraControls', wheelBefore.distance);
    const wheel = await cameraState(page, '__cameraControls');
    expectSameCamera(keyboard, wheel);
    expect(keyboard.zoom).toBe(before.zoom);
    expect(wheel.zoom).toBe(wheelBefore.zoom);
  }
});

test('3D relief: Ctrl wheel keeps optical zoom and follows the normal off-centre wheel', async ({ page }) => {
  await page.getByRole('button', { name: 'Relieve 3D', exact: true }).click();
  await page.waitForFunction(() => Boolean((window as any).__cameraControls));
  const map = page.locator('.vp');
  for (const deltaY of [-37, 53]) {
    await moveToMiddleDistance(page, '__cameraControls');
    const before = await cameraState(page, '__cameraControls');
    expect(await dispatchWheelAt(page, '.vp', { deltaY, ctrlKey: true, deltaX: 4, deltaZ: 2 })).toBe(true);
    await waitCameraSettledWithoutDistance(page, '__cameraControls');
    const ctrl = await cameraState(page, '__cameraControls');
    expect(ctrl.zoom).toBe(before.zoom);

    await restoreCamera(page, '__cameraControls', before);
    expect(await dispatchWheelAt(page, '.vp', { deltaY, deltaX: 4, deltaZ: 2 })).toBe(true);
    await waitCameraSettled(page, '__cameraControls', before.distance);
    const normal = await cameraState(page, '__cameraControls');
    expectSameCamera(ctrl, normal);
    await expect(map).toBeVisible();
  }
});

test('Orcadas: Ctrl zoom keys match a centred normal wheel in both directions', async ({ page }) => {
  for (const { press, deltaY } of [
    { press: 'Control+Equal', deltaY: -100 },
    { press: 'Control+Minus', deltaY: 100 },
  ]) {
    await page.reload();
    await openOrcadasFromMap(page);
    await page.waitForFunction(() => (window as any).__orcadasReady === true);
    await moveToMiddleDistance(page, '__orcadasCamera');
    const middle = await cameraState(page, '__orcadasCamera');
    await page.keyboard.press(press);
    await waitCameraSettled(page, '__orcadasCamera', middle.distance);
    const keyboard = await cameraState(page, '__orcadasCamera');

    await page.reload();
    await openOrcadasFromMap(page);
    await page.waitForFunction(() => (window as any).__orcadasReady === true);
    await moveToMiddleDistance(page, '__orcadasCamera');
    const wheelBefore = await cameraState(page, '__orcadasCamera');
    expect(await dispatchWheelAtCenter(page, '.orc', deltaY)).toBe(true);
    await waitCameraSettled(page, '__orcadasCamera', wheelBefore.distance);
    const wheel = await cameraState(page, '__orcadasCamera');
    expectSameCamera(keyboard, wheel);
    expect(keyboard.zoom).toBe(middle.zoom);
    expect(wheel.zoom).toBe(wheelBefore.zoom);
  }
});

test('Orcadas: Ctrl wheel keeps optical zoom and follows the normal off-centre wheel', async ({ page }) => {
  for (const deltaY of [-37, 53]) {
    await page.reload();
    await openOrcadasFromMap(page);
    await page.waitForFunction(() => (window as any).__orcadasReady === true);
    await moveToMiddleDistance(page, '__orcadasCamera');
    const before = await cameraState(page, '__orcadasCamera');
    expect(await dispatchWheelAt(page, '.orc', { deltaY, ctrlKey: true, deltaX: 4, deltaZ: 2 })).toBe(true);
    await waitCameraSettledWithoutDistance(page, '__orcadasCamera');
    const ctrl = await cameraState(page, '__orcadasCamera');
    expect(ctrl.zoom).toBe(before.zoom);

    await restoreCamera(page, '__orcadasCamera', before);
    expect(await dispatchWheelAt(page, '.orc', { deltaY, deltaX: 4, deltaZ: 2 })).toBe(true);
    await waitCameraSettled(page, '__orcadasCamera', before.distance);
    const normal = await cameraState(page, '__orcadasCamera');
    expectSameCamera(ctrl, normal);
  }
});

test('Observation slider: modified browser zoom keys pass through without recording a reading', async ({ page }) => {
  await openOrcadasFromMap(page);
  await page
    .getByRole('navigation', { name: 'Capítulos de la expedición' })
    .getByRole('button', { name: /Observar/ })
    .click();
  await expect(page.getByRole('heading', { level: 2, name: 'Observación del día' })).toBeVisible();
  await page.locator('details.orc-obs-more > summary').click();
  const pressureTab = page.getByRole('tab', { name: /^Presión atmosférica/ });
  await pressureTab.click();
  const slider = page.getByRole('slider', { name: 'Deslizador de Presión atmosférica' });
  await slider.focus();
  const before = await slider.getAttribute('aria-valuenow');

  for (const modifier of ['ctrlKey', 'metaKey', 'altKey'] as const) {
    for (const key of ['-', '0']) {
      expect(await page.locator('[role="slider"][aria-label="Deslizador de Presión atmosférica"]').evaluate((el, { modifier, key }) => {
        const event = new KeyboardEvent('keydown', { key, [modifier]: true, bubbles: true, cancelable: true });
        el.dispatchEvent(event);
        return event.defaultPrevented;
      }, { modifier, key })).toBe(false);
    }
  }
  expect(await slider.getAttribute('aria-valuenow')).toBe(before);
  await expect(pressureTab).not.toContainText('✓');
});

test('compact view fits the viewport and keeps the expanded 3D legend scrollable', async ({ page }) => {
  for (const viewport of [{ width: 720, height: 450 }, { width: 390, height: 360 }]) {
    await page.setViewportSize(viewport);
    await expect.poll(() => page.locator('.app').evaluate((el) => el.getBoundingClientRect().height)).toBe(viewport.height);
    await expect.poll(() => page.locator('.vp').evaluate((el) => el.getBoundingClientRect().height)).toBe(viewport.height);
    await expect(page.getByRole('button', { name: 'Acercar', exact: true })).toBeInViewport({ ratio: 1 });
    await expect(page.getByRole('button', { name: 'Ver todo el continente', exact: true })).toBeInViewport({ ratio: 1 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }

  await page.getByRole('button', { name: 'Relieve 3D', exact: true }).click();
  await page.waitForFunction(() => Boolean((window as any).__cameraControls));
  const legendButton = page.getByRole('button', { name: 'Leyenda', exact: true });
  if (await legendButton.getAttribute('aria-expanded') === 'false') await legendButton.click();
  const legend = page.locator('.legend');
  await expect(legend).toBeInViewport({ ratio: 1 });
  await legend.locator('summary').click();
  const sources = page.getByRole('list', { name: 'Fuentes y aclaraciones' });
  await expect(sources).toBeVisible();
  expect(await legend.evaluate((el) => el.scrollHeight - el.clientHeight)).toBeGreaterThan(0);
  await legend.focus();
  await page.keyboard.press('End');
  await expect(sources.locator('li').last()).toBeInViewport({ ratio: 1 });
  const compactLayout = await page.evaluate(() => {
    const rect = (selector: string) => document.querySelector(selector)?.getBoundingClientRect();
    const legendRect = rect('.legend');
    const topRect = rect('.top');
    const bottomRect = rect('.bottom');
    return {
      legendTop: legendRect?.top ?? NaN,
      topBottom: topRect?.bottom ?? NaN,
      bottomTop: bottomRect?.top ?? NaN,
      viewportBottom: innerHeight,
    };
  });
  expect(compactLayout.legendTop).toBeGreaterThanOrEqual(compactLayout.topBottom);
  expect(compactLayout.bottomTop).toBeLessThanOrEqual(compactLayout.viewportBottom);
  await expect(page.locator('.brand')).toBeInViewport({ ratio: 1 });
  await expect(page.getByRole('button', { name: 'Ver como lista', exact: true })).toBeInViewport({ ratio: 1 });
  await expect(page.getByRole('button', { name: 'Relieve 3D', exact: true })).toBeInViewport({ ratio: 1 });
  await expect(page.getByRole('button', { name: 'Acercar', exact: true })).toBeInViewport({ ratio: 1 });
});

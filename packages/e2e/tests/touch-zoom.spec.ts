import { expect, test, type CDPSession, type Page } from '@playwright/test';
import { MAP_2D_ENABLED, NO_2D, show3D } from './map-helpers.ts';

/**
 * One-finger zoom on a phone (#165): a double tap zooms in one step around the tapped point, and
 * the second touch of a double tap dragged up or down zooms in or out. The 3D camera has its own
 * tests in map3d.spec.ts; here the 2D map, and the markers in both views.
 */

type Point = { x: number; y: number };

let consoleErrors: string[] = [];

test.beforeEach(async ({ page, isMobile }) => {
  test.skip(!isMobile, 'touch gestures belong to the phone layout');
  consoleErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => consoleErrors.push(e.message));
});

test.afterEach(() => {
  expect(consoleErrors, 'console errors (hydration mismatches, exceptions)').toEqual([]);
});

const touch = (cdp: CDPSession, type: 'touchStart' | 'touchMove' | 'touchEnd', p?: Point) =>
  cdp.send('Input.dispatchTouchEvent', { type, touchPoints: p ? [p] : [] });
const tap = async (cdp: CDPSession, p: Point) => {
  await touch(cdp, 'touchStart', p);
  await touch(cdp, 'touchEnd');
};
/** A double tap whose second touch moves `dy` px down in ten steps before it lifts. */
const tapDrag = async (cdp: CDPSession, p: Point, dy: number) => {
  await tap(cdp, p);
  await touch(cdp, 'touchStart', p);
  for (let i = 1; i <= 10; i++) await touch(cdp, 'touchMove', { x: p.x, y: p.y + (dy * i) / 10 });
  await touch(cdp, 'touchEnd');
};
/** Past the double tap time, so the next gesture starts over. */
const pause = (page: Page) => page.waitForTimeout(400);

/** Scale and offset of the 2D map layer, from its transform. */
const layer = (page: Page) =>
  page.evaluate(() => {
    const el = document.querySelector<HTMLElement>('.vp .layer')!;
    const m = new DOMMatrix(getComputedStyle(el).transform);
    const vp = document.querySelector('.vp')!.getBoundingClientRect();
    return { k: m.a, x: vp.left + m.e, y: vp.top + m.f, transition: el.style.transition };
  });

/** A spot of the 2D map with no marker over it, near the middle of the screen. */
const mapSpot = (page: Page) => {
  const vp = page.viewportSize()!;
  return page.evaluate(([cx, cy]) => {
    for (let ring = 0; ring < 12; ring++)
      for (let i = 0; i < 16; i++) {
        const x = cx + ring * 12 * Math.cos((i * Math.PI) / 8);
        const y = cy + ring * 12 * Math.sin((i * Math.PI) / 8);
        const el = document.elementFromPoint(x, y);
        if (el?.closest('.vp .layer')) return { x, y };
      }
    return null;
  }, [vp.width / 2 + 40, vp.height * 0.45]);
};

const open2D = async (page: Page) => {
  await page.goto('/');
  const toggle = page.getByRole('group', { name: 'Modo de vista' });
  await toggle.getByRole('button', { name: 'Mapa 2D' }).click();
  await expect(toggle.getByRole('button', { name: 'Mapa 2D' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.vp .layer')).toBeVisible();
};

test('on the 2D map a double tap zooms in one step around the tapped point, and the second touch dragged zooms (#165)', async ({ page }) => {
  test.skip(!MAP_2D_ENABLED, NO_2D);
  await open2D(page);
  await expect.poll(() => mapSpot(page), { message: 'a spot of the map with no marker' }).not.toBeNull();
  const spot = await mapSpot(page);
  const cdp = await page.context().newCDPSession(page);
  // The map point under the finger, in layer px, and where it is on screen now.
  const under = (l: { k: number; x: number; y: number }, p: Point) => ({ u: (p.x - l.x) / l.k, v: (p.y - l.y) / l.k });
  const at = (l: { k: number; x: number; y: number }, m: { u: number; v: number }) => ({ x: l.x + m.u * l.k, y: l.y + m.v * l.k });

  // Double tap: twice the scale, with no glide under reduced motion (the test default).
  let start = await layer(page);
  const point = under(start, spot!);
  await tap(cdp, spot!);
  await tap(cdp, spot!);
  await expect.poll(async () => (await layer(page)).k).toBeCloseTo(start.k * 2, 2);
  let end = await layer(page);
  expect(end.transition).toBe('none');
  let now = at(end, point);
  expect(Math.abs(now.x - spot!.x)).toBeLessThan(2);
  expect(Math.abs(now.y - spot!.y)).toBeLessThan(2);
  await pause(page);

  // Second touch dragged down 75 px: back out by the square root of two, around the same point, no pan.
  start = end;
  await tapDrag(cdp, spot!, 75);
  end = await layer(page);
  expect(end.k).toBeCloseTo(start.k / Math.SQRT2, 2);
  now = at(end, point);
  expect(Math.abs(now.x - spot!.x)).toBeLessThan(2);
  expect(Math.abs(now.y - spot!.y)).toBeLessThan(2);
  await pause(page);

  // Dragged up 150 px: twice the scale.
  start = end;
  await tapDrag(cdp, spot!, -150);
  end = await layer(page);
  expect(end.k).toBeCloseTo(start.k * 2, 2);
  await pause(page);

  // Far up: it stops at the closest zoom (MAX_K = 5).
  await tapDrag(cdp, spot!, -400);
  end = await layer(page);
  expect(end.k).toBeCloseTo(5, 2);
  await pause(page);

  // Two separate taps, or a drag with one finger, do not zoom: the drag pans.
  start = end;
  await tap(cdp, spot!);
  await pause(page);
  await tap(cdp, spot!);
  await pause(page);
  await touch(cdp, 'touchStart', spot!);
  for (let i = 1; i <= 10; i++) await touch(cdp, 'touchMove', { x: spot!.x, y: spot!.y - 8 * i });
  await touch(cdp, 'touchEnd');
  end = await layer(page);
  expect(end.k).toBeCloseTo(start.k, 3);
  expect(end.y).toBeLessThan(start.y - 40);
});

test('on the 2D map without reduced motion a double tap glides (#165)', async ({ page }) => {
  test.skip(!MAP_2D_ENABLED, NO_2D);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await open2D(page);
  await expect.poll(() => mapSpot(page), { message: 'a spot of the map with no marker' }).not.toBeNull();
  const spot = await mapSpot(page);
  const cdp = await page.context().newCDPSession(page);
  const start = await layer(page);
  await tap(cdp, spot!);
  await tap(cdp, spot!);
  await expect.poll(async () => (await layer(page)).transition).not.toBe('none');
  await expect.poll(async () => (await layer(page)).k).toBeCloseTo(start.k * 2, 2);
});

for (const mode of ['Mapa 2D', 'Relieve 3D'] as const) {
  test(`a quick second tap on a marker still opens it, and a double tap beside it opens nothing (${mode}, #54, #165)`, async ({ page }) => {
    test.skip(mode === 'Mapa 2D' && !MAP_2D_ENABLED, NO_2D);
    await page.goto('/');
    if (MAP_2D_ENABLED) {
      const toggle = page.getByRole('group', { name: 'Modo de vista' });
      await toggle.getByRole('button', { name: mode }).click();
      await expect(toggle.getByRole('button', { name: mode })).toHaveAttribute('aria-pressed', 'true');
    } else {
      await show3D(page);
    }
    // A point marker free to tap, other than the trip from Ushuaia (it opens its own panel, not a sheet).
    const freeMarker = () =>
      page.evaluate(() => {
        for (const el of document.querySelectorAll('.vp .mk:not(.cluster)')) {
          if (/Ushuaia|Orcadas/.test(el.getAttribute('aria-label') ?? '')) continue;
          const r = el.getBoundingClientRect();
          const x = r.left + r.width / 2;
          const y = r.top + r.height / 2;
          if (r.width > 0 && el.contains(document.elementFromPoint(x, y))) return { x, y, label: el.getAttribute('aria-label')! };
        }
        return null;
      });
    // 3D markers are placed once the camera settles: wait for one that is free to tap.
    await expect.poll(freeMarker, { message: 'a marker free to tap' }).not.toBeNull();
    const marker = (await freeMarker())!;
    const cdp = await page.context().newCDPSession(page);
    const dialogs = page.getByRole('dialog');

    // Beside the marker, off it: a double tap zooms but neither shows its label nor opens it. Not
    // too close: the browser sends a touch a little off a button to the button (touch adjustment),
    // and then it is a tap on the marker.
    const beside = await page.evaluate(({ x, y }) => {
      for (let r = 60; r <= 96; r += 6)
        for (let i = 0; i < 16; i++) {
          const p = { x: x + r * Math.cos((i * Math.PI) / 8), y: y + r * Math.sin((i * Math.PI) / 8) };
          const el = document.elementFromPoint(p.x, p.y);
          if (el && el.closest('.vp') && !el.closest('.mk')) return p;
        }
      return null;
    }, marker);
    expect(beside, 'a spot of the map beside the marker').not.toBeNull();
    // How close the view is: the 2D scale, or the 3D camera distance it is heading to.
    const zoom = () =>
      mode === 'Mapa 2D' ? layer(page).then((l) => l.k) : page.evaluate(() => (window as any).__cameraControls.getSpherical().radius as number);
    const far = await zoom();
    await tap(cdp, beside!);
    await tap(cdp, beside!);
    await pause(page);
    expect(await zoom()).not.toBeCloseTo(far, 1);
    await expect(page.locator('.vp .mk.shown')).toHaveCount(0);
    await expect(dialogs).toHaveCount(0);

    // Zooming moved the marker: find it again, then tap it twice quickly (#54).
    const again = await page.evaluate((label) => {
      for (const el of document.querySelectorAll('.vp .mk')) {
        if (el.getAttribute('aria-label') !== label) continue;
        const r = el.getBoundingClientRect();
        const p = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        if (el.contains(document.elementFromPoint(p.x, p.y))) return p;
      }
      return null;
    }, marker.label);
    // After the zoom the point may have left the screen or another marker may cover it; then use the first spot.
    const target = again ?? (await freeMarker())!;
    await tap(cdp, target);
    await tap(cdp, target);
    await expect(dialogs.first()).toBeVisible();
  });
}

// A phone answers a double tap or a held touch by selecting the text nearby, and an iPhone by
// opening its magnifier too: over the map those touches zoom, so nothing there may be selected (#190).
test('the map and what lies over it cannot be selected, and what is there to read still can (#190)', async ({ page }) => {
  await page.goto('/');
  if (!MAP_2D_ENABLED) await show3D(page);
  const selectable = (selector: string) =>
    page.evaluate((s) => {
      const style = getComputedStyle(document.querySelector(s)!);
      return style.userSelect || style.getPropertyValue('-webkit-user-select');
    }, selector);
  for (const selector of ['.vp', '.brand h1', '.hint', '.mk']) expect(await selectable(selector), selector).toBe('none');
  await page.getByRole('button', { name: 'Ver como lista' }).click();
  expect(await selectable('.listview .inner')).toBe('text');
});

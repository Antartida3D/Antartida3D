import { expect, test, type Page } from '@playwright/test';
import { ORCADAS_GUIDING_QUESTION } from '../../core/src/content/orcadas.ts';
import { FUEGIA_MIN_DISTANCE, GROUND_TARGET_MAX, GROUND_TARGET_MIN, ICE_MIN_DISTANCE } from '../../core/src/fuegia.ts';
import { project } from '../../core/src/projection.ts';
import { MAP_2D_ENABLED, NO_2D, show3D } from './map-helpers.ts';

/**
 * Waits until the camera has reached where it was heading. `active` turns false as soon as the
 * camera is within `restThreshold` (0.01) of its end, and how close it is by then depends on the
 * frame rate: drawing with a real GPU a twist read at that moment came out 0.0085 rad short (#87).
 */
const cameraSettled = (page: Page) =>
  page.waitForFunction(() => {
    (window as any).__invalidate();
    const cc = (window as any).__cameraControls;
    if (cc.active) return false;
    const [now, end] = [cc.getSpherical(undefined, false), cc.getSpherical()];
    const close = (a: number, b: number) => Math.abs(a - b) < 1e-4;
    return (
      close(now.theta, end.theta) &&
      close(now.phi, end.phi) &&
      close(now.radius, end.radius) &&
      cc.getTarget(undefined, false).distanceTo(cc.getTarget()) < 1e-4
    );
  });

let consoleErrors: string[] = [];

test.beforeEach(async ({ page }) => {
  consoleErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => consoleErrors.push(e.message));
});

test.afterEach(() => {
  expect(consoleErrors, 'console errors (hydration mismatches, exceptions)').toEqual([]);
});

test.describe('3D relief view', () => {
  test('with the 2D map off there is no toggle and the map starts in 3D, even with 2D saved (#227)', async ({ page }) => {
    test.skip(MAP_2D_ENABLED, 'Solo con el mapa 2D deshabilitado');
    // reducedMotion: 'reduce' (playwright.config) and a saved 2D used to start in 2D.
    await page.addInitScript(() => {
      try {
        localStorage.setItem('antartida:view', '2d');
      } catch {}
    });
    await page.goto('/');
    await expect(page.locator('section.ld')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ver mapa 2D' })).toHaveCount(0);
    await show3D(page);
    await expect(page.getByRole('group', { name: 'Modo de vista' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Mapa 2D' })).toHaveCount(0);
    // The 2D map never mounted, not even behind the loading screen.
    expect(await page.evaluate(() => document.querySelector('.layer') === null)).toBe(true);
  });

  test('toggle switches between 2D and 3D and renders canvas', async ({ page }) => {
    test.skip(!MAP_2D_ENABLED, NO_2D);
    await page.goto('/');
    const toggle = page.getByRole('group', { name: 'Modo de vista' });
    await expect(toggle).toBeVisible();

    // Default under reducedMotion: 'reduce' is 2D
    await expect(toggle.getByRole('button', { name: 'Mapa 2D' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.layer')).toBeVisible();

    // Switch to 3D
    await show3D(page);
    await expect(toggle.getByRole('button', { name: 'Relieve 3D' })).toHaveAttribute('aria-pressed', 'true');
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    // Reload preserves the choice
    await page.reload();
    await expect(toggle.getByRole('button', { name: 'Relieve 3D' })).toHaveAttribute('aria-pressed', 'true');
    await expect(canvas).toBeVisible();

    // Switch back to 2D
    await toggle.getByRole('button', { name: 'Mapa 2D' }).click();
    await expect(toggle.getByRole('button', { name: 'Mapa 2D' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('markers are focusable in 3D and Orcadas opens the expedition', async ({ page }) => {
    await page.goto('/');
    await show3D(page);

    const marker = page.locator('.ov [data-key*="orcadas"] button');
    await expect(marker).toBeVisible();
    await marker.click();

    const intro = page.getByRole('dialog', { name: 'Estación Orcadas' });
    // In 3D the intro shows the turning model of the chosen arrival vehicle, labelled as an illustration.
    await expect(intro.locator('.vpreview')).toBeVisible();
    await expect(intro.getByText('Reconstrucción ilustrada')).toBeVisible();
    await intro.getByRole('button', { name: 'Comenzar expedición' }).click();

    await expect(page.getByRole('heading', { level: 2, name: ORCADAS_GUIDING_QUESTION })).toBeVisible({ timeout: 10000 });
  });

  test('wheel, buttons and keys all stop at the same closest distance over the ice (#127)', async ({ page }) => {
    test.setTimeout(120000);
    await page.goto('/');
    await show3D(page);
    await page.waitForFunction(() => (window as any).__cameraControls && (window as any).__invalidate);
    const map = page.getByRole('application', { name: /Mapa en relieve 3D/ });

    // Over the open plateau, far from Tierra del Fuego and from any point with a model.
    const reset = () =>
      page.evaluate(() => {
        const cc = (window as any).__cameraControls;
        cc.moveTo(-50, 0, 0, false);
        cc.dollyTo(300, false);
        (window as any).__invalidate();
      });
    const closest = async () => {
      // Let the camera settle, then read where it stopped.
      await page.waitForFunction(
        () => {
          (window as any).__invalidate();
          return !(window as any).__cameraControls.active;
        },
        null,
        { timeout: 10000 },
      );
      return page.evaluate(() => (window as any).__cameraControls.distance as number);
    };

    await reset();
    const box = (await map.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    for (let i = 0; i < 40; i++) await page.mouse.wheel(0, -200);
    expect(await closest()).toBeCloseTo(ICE_MIN_DISTANCE, 0);

    await reset();
    const closer = page.getByRole('button', { name: 'Acercar', exact: true, includeHidden: true });
    await expect(closer).toBeVisible();
    for (let i = 0; i < 12; i++) {
      const before = await page.evaluate(() => {
        const cc = (window as any).__cameraControls;
        return { distance: cc.distance as number, min: cc.minDistance as number };
      });
      if (before.distance <= before.min + 0.01) break;
      await closer.click();
      await expect.poll(async () => {
        const distance = await page.evaluate(() => (window as any).__cameraControls.distance as number);
        return Math.abs(distance - before.distance);
      }, { timeout: 15_000 }).toBeGreaterThan(1e-6);
      await closest();
    }
    await expect(closer).toBeHidden();
    expect(await closest()).toBeCloseTo(ICE_MIN_DISTANCE, 0);

    await reset();
    await map.focus();
    for (let i = 0; i < 12; i++) await page.keyboard.press('+');
    expect(await closest()).toBeCloseTo(ICE_MIN_DISTANCE, 0);

    // With the cursor low on the screen, zooming towards it used to sink the target under the map
    // and take the camera in after it. It stays on the ground, and the camera above the plateau.
    await page.evaluate(() => {
      const cc = (window as any).__cameraControls;
      cc.setLookAt(-159.6, 150, 250, -159.6, 0, -12.3, false);
      (window as any).__invalidate();
    });
    await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.7);
    for (let i = 0; i < 40; i++) await page.mouse.wheel(0, -250);
    expect(await closest()).toBeCloseTo(ICE_MIN_DISTANCE, 0);
    const heights = await page.evaluate(() => {
      const cc = (window as any).__cameraControls;
      return { target: cc.getTarget().y as number, camera: cc.getPosition().y as number };
    });
    expect(heights.target).toBeGreaterThanOrEqual(GROUND_TARGET_MIN - 0.01);
    expect(heights.target).toBeLessThanOrEqual(GROUND_TARGET_MAX);
    expect(heights.camera - heights.target).toBeGreaterThan(ICE_MIN_DISTANCE / 2 - 0.1);
  });

  test('zoom buttons move the orbit camera from where it is, without resetting it', async ({ page }) => {
    await page.goto('/');
    await show3D(page);
    await page.waitForFunction(() => (window as any).__cameraControls);

    type Cam = { d: number; polar: number; az: number; tx: number; tz: number };
    const cam = () =>
      page.evaluate((): Cam => {
        const cc = (window as any).__cameraControls;
        const t = cc.getTarget();
        return { d: cc.distance, polar: cc.polarAngle, az: cc.azimuthAngle, tx: t.x, tz: t.z };
      });

    // The user orbits and moves somewhere (reduced motion: no transitions).
    await page.evaluate(() => {
      const cc = (window as any).__cameraControls;
      cc.rotateTo(0.6, 0.5, false);
      cc.moveTo(-150, 0, -80, false);
    });
    const before = await cam();

    // "+" must get closer (it used to move away from the overview on desktop) and keep the orbit.
    await page.getByRole('button', { name: 'Acercar', exact: true }).click();
    const zoomedIn = await cam();
    expect(zoomedIn.d).toBeLessThan(before.d * 0.7);
    expect(zoomedIn.polar).toBeCloseTo(before.polar, 3);
    expect(zoomedIn.az).toBeCloseTo(before.az, 3);
    expect(zoomedIn.tx).toBeCloseTo(before.tx, 1);
    expect(zoomedIn.tz).toBeCloseTo(before.tz, 1);

    // "-" goes back out from there, not to the overview.
    await page.getByRole('button', { name: 'Alejar', exact: true }).click();
    const zoomedOut = await cam();
    expect(zoomedOut.d).toBeCloseTo(before.d, 0);
    expect(zoomedOut.tx).toBeCloseTo(before.tx, 1);

    // Unrelated UI state (the legend) must not remount the scene and reset the camera.
    await page.getByRole('button', { name: /Leyenda/ }).click();
    const afterLegend = await cam();
    expect(afterLegend.d).toBeCloseTo(zoomedOut.d, 0);
    expect(afterLegend.tx).toBeCloseTo(before.tx, 1);

    // The camera gets closer than the old limit of 120; the farthest view is the overview it starts at.
    const range = await page.evaluate(() => {
      const cc = (window as any).__cameraControls;
      return { min: cc.minDistance, max: cc.maxDistance };
    });
    expect(range.min).toBeLessThan(120);
    expect(range.max).toBeCloseTo(before.d, 0);
  });

  test('the farthest view is the overview and the sea reaches the top of the screen, with no paper', async ({ page }) => {
    await page.goto('/');
    await show3D(page);
    await page.waitForFunction(() => (window as any).__cameraControls);
    const overview = await page.evaluate(() => (window as any).__cameraControls.distance as number);

    // As far and as tilted as the camera goes, from a corner of the pan area looking out over the Pacific.
    await page.evaluate(() => {
      const cc = (window as any).__cameraControls;
      cc.moveTo(-800, 0, 800, false);
      cc.rotateTo((135 * Math.PI) / 180, Math.PI / 2, false);
      cc.dollyTo(1e6, false);
      (window as any).__invalidate();
    });
    expect(await page.evaluate(() => (window as any).__cameraControls.distance as number)).toBeCloseTo(overview, 0);

    // Top of the canvas, left of the middle: sea up to the edge, crossed at most by a few far
    // islands and coasts. It used to be all paper.
    const sea = () =>
      page.evaluate(() => {
        (window as any).__invalidate();
        const c = document.querySelector('canvas')!;
        const c2d = document.createElement('canvas');
        c2d.width = c.width;
        c2d.height = 1;
        const ctx = c2d.getContext('2d')!;
        ctx.drawImage(c, 0, Math.round(c.height * 0.02), c.width, 1, 0, 0, c.width, 1);
        const row = ctx.getImageData(0, 0, c.width, 1).data;
        let blue = 0;
        let total = 0;
        for (let x = Math.round(c.width * 0.05); x < c.width * 0.6; x += 4) {
          total++;
          if (row[x * 4 + 2] > row[x * 4] + 25 && row[x * 4] < 130) blue++;
        }
        return blue / total;
      });
    await expect.poll(sea, { timeout: 15000 }).toBeGreaterThan(0.9);
  });

  test('dragging moves over the map and the right button turns the camera', async ({ page }) => {
    await page.goto('/');
    await show3D(page);
    await page.waitForFunction(() => (window as any).__cameraControls);

    // Open sea in the South Pacific, away from every marker; the camera is south of its target, looking north.
    await page.evaluate(() => {
      const cc = (window as any).__cameraControls;
      cc.moveTo(500, 0, 500, false);
      cc.dollyTo(300, false);
      (window as any).__invalidate();
    });
    type Cam = { d: number; polar: number; az: number; tx: number; tz: number };
    const cam = () =>
      page.evaluate((): Cam => {
        const cc = (window as any).__cameraControls;
        const t = cc.getTarget();
        return { d: cc.distance, polar: cc.polarAngle, az: cc.azimuthAngle, tx: t.x, tz: t.z };
      });
    const vp = page.viewportSize()!;
    const from = { x: vp.width / 2, y: vp.height * 0.3 };
    const drag = async (button: 'left' | 'right', dx: number, dy: number) => {
      await page.mouse.move(from.x, from.y);
      await page.mouse.down({ button });
      await page.mouse.move(from.x + dx, from.y + dy, { steps: 8 });
      await page.mouse.up({ button });
      // The camera eases to where the drag left it.
      await page.waitForTimeout(150);
      await cameraSettled(page);
    };

    // Dragging to the right pulls the map with the pointer: the target goes to the camera's left.
    const start = await cam();
    await drag('left', 120, 0);
    const right = await cam();
    expect(right.tx).toBeLessThan(start.tx - 10);
    expect(right.tz).toBeCloseTo(start.tz, 0);
    expect(right.az).toBeCloseTo(start.az, 3);
    expect(right.polar).toBeCloseTo(start.polar, 3);
    expect(right.d).toBeCloseTo(start.d, 1);

    // Dragging down pulls the map down: the target goes forward, away from the camera.
    await drag('left', 0, 120);
    const down = await cam();
    expect(down.tz).toBeLessThan(right.tz - 10);
    expect(down.tx).toBeCloseTo(right.tx, 0);
    expect(down.polar).toBeCloseTo(start.polar, 3);

    // The right button turns the camera around the same target.
    await drag('right', 120, 0);
    const turned = await cam();
    expect(Math.abs(turned.az - down.az)).toBeGreaterThan(0.1);
    expect(turned.tx).toBeCloseTo(down.tx, 0);
    expect(turned.tz).toBeCloseTo(down.tz, 0);
    expect(turned.d).toBeCloseTo(down.d, 1);
  });

  test('on a touch screen one finger moves over the map', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'touch gestures belong to the phone layout');
    await page.goto('/');
    await show3D(page);
    await page.waitForFunction(() => (window as any).__cameraControls);
    await page.evaluate(() => {
      const cc = (window as any).__cameraControls;
      cc.moveTo(500, 0, 500, false);
      cc.dollyTo(300, false);
      (window as any).__invalidate();
    });
    const cam = () =>
      page.evaluate(() => {
        const cc = (window as any).__cameraControls;
        return { az: cc.azimuthAngle as number, polar: cc.polarAngle as number, tx: cc.getTarget().x as number };
      });
    const start = await cam();

    const vp = page.viewportSize()!;
    const y = vp.height * 0.3;
    const cdp = await page.context().newCDPSession(page);
    const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', x: number) =>
      cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
    await touch('touchStart', vp.width * 0.3);
    for (let i = 1; i <= 8; i++) await touch('touchMove', vp.width * 0.3 + i * 15);
    await touch('touchEnd', 0);
    await page.waitForTimeout(150);
    await cameraSettled(page);

    const end = await cam();
    expect(end.tx).toBeLessThan(start.tx - 10);
    expect(end.az).toBeCloseTo(start.az, 3);
    expect(end.polar).toBeCloseTo(start.polar, 3);
  });

  test('on a touch screen two fingers zoom by pinching, turn by twisting and tilt by dragging up', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'touch gestures belong to the phone layout');
    await page.goto('/');
    await show3D(page);
    await page.waitForFunction(() => (window as any).__cameraControls);
    const reset = () =>
      page.evaluate(() => {
        const cc = (window as any).__cameraControls;
        cc.moveTo(0, 0, 0, false);
        cc.dollyTo(600, false);
        cc.rotateTo(0, 0.5, false);
        (window as any).__invalidate();
      });
    const cam = () =>
      page.evaluate(() => {
        const cc = (window as any).__cameraControls;
        // Where a point east of the target is drawn, as an angle around the target on screen.
        const centre = cc.getTarget().clone().project(cc.camera);
        const east = cc.getTarget().clone();
        east.x += 50;
        east.project(cc.camera);
        return {
          az: cc.azimuthAngle as number,
          polar: cc.polarAngle as number,
          d: cc.distance as number,
          tx: cc.getTarget().x as number,
          // Screen y grows down, so this grows clockwise.
          eastOnScreen: Math.atan2(-(east.y - centre.y), east.x - centre.x),
        };
      });
    const vp = page.viewportSize()!;
    const [cx, cy] = [vp.width / 2, vp.height * 0.3];
    const cdp = await page.context().newCDPSession(page);
    type Pair = [{ x: number; y: number }, { x: number; y: number }];
    /** Two fingers go from `from` to `to` in ten moves; `to` gets the step 0..1. */
    const gesture = async (at: (u: number) => Pair) => {
      const points = (u: number) => at(u).map((p, id) => ({ ...p, id }));
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points(0) });
      for (let i = 1; i <= 10; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: points(i / 10) });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await page.waitForTimeout(150);
      await cameraSettled(page);
    };

    // Spreading the fingers to twice the gap halves the distance; nothing else moves.
    await reset();
    let start = await cam();
    await gesture((u) => [{ x: cx - 40 - 40 * u, y: cy }, { x: cx + 40 + 40 * u, y: cy }]);
    let end = await cam();
    expect(end.d).toBeCloseTo(start.d / 2, 0);
    expect(end.az).toBeCloseTo(start.az, 3);
    expect(end.polar).toBeCloseTo(start.polar, 3);
    expect(end.tx).toBeCloseTo(start.tx, 1);

    // Twisting the fingers clockwise turns the map clockwise with them, by the same angle.
    await reset();
    start = await cam();
    const turn = Math.PI / 4;
    await gesture((u) => [
      { x: cx - 60 * Math.cos(turn * u), y: cy - 60 * Math.sin(turn * u) },
      { x: cx + 60 * Math.cos(turn * u), y: cy + 60 * Math.sin(turn * u) },
    ]);
    end = await cam();
    expect(Math.abs(end.az - start.az)).toBeCloseTo(turn, 2);
    expect(end.eastOnScreen).toBeGreaterThan(start.eastOnScreen);
    expect(end.polar).toBeCloseTo(start.polar, 3);
    expect(end.d).toBeCloseTo(start.d, 1);

    // Dragging both fingers up tilts the view towards the horizon; it does not zoom or turn.
    await reset();
    start = await cam();
    await gesture((u) => [{ x: cx - 40, y: cy + 60 - 120 * u }, { x: cx + 40, y: cy + 60 - 120 * u }]);
    end = await cam();
    expect(end.polar).toBeGreaterThan(start.polar + 0.2);
    expect(end.az).toBeCloseTo(start.az, 3);
    expect(end.d).toBeCloseTo(start.d, 1);
  });

  /** A spot of the 3D map with no marker over it, near the middle and a little below the top bar. */
  const canvasSpot = (page: Page) => {
    const vp = page.viewportSize()!;
    return page.evaluate(([cx, cy]) => {
      for (let ring = 0; ring < 12; ring++)
        for (let i = 0; i < 16; i++) {
          const x = cx + ring * 12 * Math.cos((i * Math.PI) / 8);
          const y = cy + ring * 12 * Math.sin((i * Math.PI) / 8);
          if (document.elementFromPoint(x, y)?.tagName === 'CANVAS') return { x, y };
        }
      return null;
    }, [vp.width / 2 + 50, vp.height * 0.4]);
  };

  test('on a touch screen a double tap zooms in one step around the tapped point, and the second touch dragged up or down zooms (#165)', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'touch gestures belong to the phone layout');
    await page.goto('/');
    await show3D(page);
    await page.waitForFunction(() => (window as any).__cameraControls);
    const reset = async (d: number, x = 0) => {
      await page.evaluate(([d, x]) => {
        const cc = (window as any).__cameraControls;
        cc.moveTo(x, 0, 0, false);
        cc.dollyTo(d, false);
        cc.rotateTo(0, 0.5, false);
        (window as any).__invalidate();
      }, [d, x]);
      await cameraSettled(page);
    };
    const cam = () =>
      page.evaluate(() => {
        const cc = (window as any).__cameraControls;
        return { az: cc.azimuthAngle as number, polar: cc.polarAngle as number, d: cc.distance as number, min: cc.minDistance as number };
      });
    // The ground under a screen point, and where a ground point is on screen now.
    const ground = (x: number, y: number) =>
      page.evaluate(([x, y]) => {
        const cc = (window as any).__cameraControls;
        const cam = cc.camera;
        cam.updateMatrixWorld();
        const r = document.querySelector('.vp canvas')!.getBoundingClientRect();
        const far = cc.getTarget().clone().set(((x - r.left) / r.width) * 2 - 1, 1 - ((y - r.top) / r.height) * 2, 0.5).unproject(cam);
        const dir = far.sub(cam.position).normalize();
        const p = cam.position.clone().add(dir.multiplyScalar((cc.getTarget().y - cam.position.y) / dir.y));
        return [p.x, p.y, p.z] as [number, number, number];
      }, [x, y]);
    const onScreen = (p: [number, number, number]) =>
      page.evaluate((p) => {
        const cc = (window as any).__cameraControls;
        cc.camera.updateMatrixWorld();
        const r = document.querySelector('.vp canvas')!.getBoundingClientRect();
        const v = cc.getTarget().clone().set(...p).project(cc.camera);
        return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
      }, p);

    // Off the markers: on them, a first touch shows the label and a second opens the point (#54).
    await reset(600);
    // The canvas shows once the relief has loaded.
    await expect.poll(() => canvasSpot(page), { message: 'a spot of the map with no marker' }).not.toBeNull();
    const spot = await canvasSpot(page);
    const { x, y } = spot!;
    const cdp = await page.context().newCDPSession(page);
    const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', p?: { x: number; y: number }) =>
      cdp.send('Input.dispatchTouchEvent', { type, touchPoints: p ? [p] : [] });
    const tap = async () => {
      await touch('touchStart', { x, y });
      await touch('touchEnd');
    };
    /** A double tap whose second touch moves `dy` px down in ten steps before it lifts. */
    const tapDrag = async (dy: number) => {
      await tap();
      await touch('touchStart', { x, y });
      for (let i = 1; i <= 10; i++) await touch('touchMove', { x, y: y + (dy * i) / 10 });
      await touch('touchEnd');
      await page.waitForTimeout(400); // past the double tap time, so the next gesture starts over
      await cameraSettled(page);
    };

    // A double tap: half the distance, the ground under the finger stays under it, nothing turns.
    // Under reduced motion (the test default) it is there at once, with no glide.
    let start = await cam();
    const under = await ground(x, y);
    await tap();
    await tap();
    const atOnce = await page.evaluate(() => {
      const cc = (window as any).__cameraControls;
      return Math.abs(cc.getSpherical(undefined, false).radius - cc.getSpherical().radius);
    });
    expect(atOnce).toBeLessThan(0.01);
    await page.waitForTimeout(400);
    await cameraSettled(page);
    let end = await cam();
    expect(end.d).toBeCloseTo(start.d / 2, 0);
    expect(end.az).toBeCloseTo(start.az, 3);
    expect(end.polar).toBeCloseTo(start.polar, 3);
    let moved = await onScreen(under);
    expect(Math.abs(moved.x - x)).toBeLessThan(2);
    expect(Math.abs(moved.y - y)).toBeLessThan(2);

    // Second touch dragged up 150 px: twice as close, and it does not pan.
    await reset(600);
    start = await cam();
    await tapDrag(-150);
    end = await cam();
    expect(end.d).toBeCloseTo(start.d / 2, 0);
    expect(end.az).toBeCloseTo(start.az, 3);
    expect(end.polar).toBeCloseTo(start.polar, 3);
    moved = await onScreen(under);
    expect(Math.abs(moved.x - x)).toBeLessThan(2);
    expect(Math.abs(moved.y - y)).toBeLessThan(2);

    // Dragged down 150 px: twice as far.
    await reset(300);
    start = await cam();
    await tapDrag(150);
    end = await cam();
    expect(end.d).toBeCloseTo(start.d * 2, 0);

    // Over the open plateau it stops at the closest distance over the ice, like the wheel and the
    // pinch (#127). Near the pole its model lets the camera come closer (#58).
    await reset(60, -50);
    await tapDrag(-300);
    end = await cam();
    expect(end.min).toBeCloseTo(ICE_MIN_DISTANCE, 0);
    expect(end.d).toBeCloseTo(end.min, 1);

    // A one-finger drag that is not a double tap still pans and does not zoom.
    await reset(600);
    start = await cam();
    await touch('touchStart', { x, y });
    for (let i = 1; i <= 10; i++) await touch('touchMove', { x, y: y - 15 * i });
    await touch('touchEnd');
    await page.waitForTimeout(150);
    await cameraSettled(page);
    end = await cam();
    expect(end.d).toBeCloseTo(start.d, 1);
    moved = await onScreen(under);
    expect(moved.y).toBeLessThan(y - 100);
  });

  test('without reduced motion a double tap glides one step closer (#165)', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'touch gestures belong to the phone layout');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    await show3D(page);
    await page.waitForFunction(() => (window as any).__cameraControls);
    await page.evaluate(() => {
      const cc = (window as any).__cameraControls;
      cc.moveTo(0, 0, 0, false);
      cc.dollyTo(600, false);
      cc.rotateTo(0, 0.5, false);
      (window as any).__invalidate();
    });
    await cameraSettled(page);
    // The canvas shows once the relief has loaded.
    await expect.poll(() => canvasSpot(page), { message: 'a spot of the map with no marker' }).not.toBeNull();
    const spot = await canvasSpot(page);
    const cdp = await page.context().newCDPSession(page);
    for (let i = 0; i < 2; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [spot!] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    }
    const gap = await page.evaluate(() => {
      const cc = (window as any).__cameraControls;
      return { now: cc.getSpherical(undefined, false).radius as number, end: cc.getSpherical().radius as number };
    });
    expect(gap.end).toBeCloseTo(300, 0);
    expect(gap.now).toBeGreaterThan(gap.end + 1);
    await cameraSettled(page);
  });

  test('terrain is rendered and South Pole pixel is not ocean color', async ({ page }) => {
    await page.goto('/');
    await show3D(page);
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    // Wait for terrain textures and mesh to settle
    await page.waitForTimeout(1200);

    const isTerrainVisible = await page.evaluate(() => {
      const c = document.querySelector('canvas');
      if (!c) return false;
      const c2d = document.createElement('canvas');
      c2d.width = 1;
      c2d.height = 1;
      const ctx = c2d.getContext('2d');
      if (!ctx) return false;
      ctx.drawImage(c, c.width / 2, c.height / 2, 1, 1, 0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      // Ocean color #3F6F94 is r:63, g:111, b:148.
      // Terrain at South Pole is bright snow/relief (r > 130).
      const isOcean = r < 100 && g < 135 && b > 100;
      return !isOcean && (r > 120 || g > 120);
    });

    expect(isTerrainVisible).toBe(true);
  });

  test('Tierra del Fuego has relief and the camera gets closer there than over Antarctica', async ({ page }) => {
    await page.goto('/');
    await show3D(page);
    await page.waitForFunction(() => (window as any).__cameraControls);

    // Look at Ushuaia (map 31.5, 313.6 -> world -468.5, -186.4).
    await page.evaluate(() => {
      (window as any).__cameraControls.setLookAt(-455, 40, -170, -468.5, 0, -186.4, false);
      (window as any).__invalidate();
    });

    // The regional mesh is fetched once the camera is near and carries a land/water attribute.
    await page.waitForFunction(
      () => {
        let found = false;
        (window as any).__scene.traverse((o: any) => {
          if (o.isMesh && o.geometry?.attributes?.aLand) found = true;
        });
        (window as any).__invalidate();
        return found;
      },
      null,
      { timeout: 20000 },
    );

    const distance = () => page.evaluate(() => (window as any).__cameraControls.distance as number);
    const settle = (check: string) =>
      page.waitForFunction(
        (c) => {
          (window as any).__invalidate();
          const cc = (window as any).__cameraControls;
          return new Function('cc', `return ${c}`)(cc);
        },
        check,
        { timeout: 10000 },
      );

    // Around Ushuaia the camera may go well below the closest distance over the ice.
    await settle(`cc.minDistance < ${ICE_MIN_DISTANCE}`);
    await page.evaluate(() => void (window as any).__cameraControls.dollyTo(1, false));
    await settle('cc.distance < 20');
    const minHere = await page.evaluate(() => (window as any).__cameraControls.minDistance as number);
    // Closer, but not without end (#127).
    expect(minHere).toBe(FUEGIA_MIN_DISTANCE);
    expect(await distance()).toBeCloseTo(FUEGIA_MIN_DISTANCE, 1);

    // Moving the target to the open plateau pushes it back out. Not the South Pole itself: a point
    // with a model lets the camera come down to it (#58).
    await page.evaluate(() => void (window as any).__cameraControls.moveTo(-50, 0, 0, false));
    await settle(`cc.minDistance === ${ICE_MIN_DISTANCE} && cc.distance >= ${ICE_MIN_DISTANCE - 0.1}`);
  });

  test('with PointSheet open, elementFromPoint at sheet center returns an element inside the sheet', async ({ page }) => {
    await page.goto('/');
    await show3D(page);
    await page.waitForSelector('canvas');
    await page.waitForTimeout(1000);

    // Open PointSheet for a sea marker
    const seaMarker = page.locator('.ov [data-key^="sea-"] button').first();
    await expect(seaMarker).toBeVisible();
    // A point marker can stand over this one (it goes behind them): open the card without aiming at it.
    await seaMarker.evaluate((b: HTMLElement) => b.click());
    const sheet = page.locator('.sheet[role="dialog"]');
    await expect(sheet).toBeVisible();

    // Verify center of sheet points to a node inside the sheet
    const hitInside = await page.evaluate(() => {
      const el = document.querySelector('.sheet[role="dialog"]');
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const hit = document.elementFromPoint(cx, cy);
      return el.contains(hit);
    });

    expect(hitInside).toBe(true);
  });

  test('sea cards show the block model of their point, and the Drake card shows none (#50)', async ({ page }) => {
    await page.goto('/');
    await show3D(page);
    await page.waitForSelector('canvas');
    await page.waitForTimeout(1000);

    const sheet = page.locator('.sheet[role="dialog"]');
    const open = async (key: string) => {
      // Markers can sit under another one or off screen: open the card without aiming at it.
      await page.locator(`[data-key="${key}"] button`).evaluate((b: HTMLElement) => b.click());
      await expect(sheet).toBeVisible();
    };
    // The minke whale and the leopard seal are drawn only on wide screens.
    const wide = (page.viewportSize()?.width ?? 0) > 820;
    const drawn = ['sea-ballena', 'sea-pinguino', 'sea-irizar', 'sea-tempano', 'sea-orca', ...(wide ? ['sea-minke', 'sea-leopardo'] : [])];
    for (const key of drawn) {
      await open(key);
      await expect(sheet.locator('.vpreview canvas')).toHaveCount(1);
      await page.keyboard.press('Escape');
      await expect(sheet).not.toBeVisible();
    }
    await open('sea-drake');
    await expect(sheet.locator('.vpreview')).toHaveCount(0);
  });

  test('markers stay locked to their 3D world point while the camera moves (#152)', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    await show3D(page);
    await page.waitForSelector('canvas');
    await page.waitForFunction(() => Boolean((window as any).__cameraControls));

    const gw = project(0, -57);
    const wPos = { x: gw.x - 500, y: 0.2, z: gw.y - 500 };
    await expect(page.locator('.ov [data-graticule="greenwich"]')).toBeVisible();

    const samples: Array<{ frame: number; wf: number; sx: number; sy: number; ex: number; ey: number; drift: number }> = [];
    const collect = page.evaluate(
      (targetWorld) =>
        new Promise<Array<{ frame: number; wf: number; sx: number; sy: number; ex: number; ey: number; drift: number }>>((resolve) => {
          const cc = (window as any).__cameraControls;
          const rect = document.querySelector('canvas')!.getBoundingClientRect();
          const div = document.querySelector<HTMLElement>('.ov [data-graticule="greenwich"]')!;
          const out: Array<{ frame: number; wf: number; sx: number; sy: number; ex: number; ey: number; drift: number }> = [];
          let frames = 0;

          const sample = () => {
            setTimeout(() => {
              const match = /translate3d\(([-\d.]+)px,\s*([-\d.]+)px/.exec(div.style.transform);
              if (match && div.style.display !== 'none') {
                const sx = Number(match[1]);
                const sy = Number(match[2]);
                const cam = cc.camera;
                const v = cam.position.clone().set(targetWorld.x, targetWorld.y, targetWorld.z);
                v.project(cam);
                const ex = ((v.x + 1) * rect.width) / 2;
                const ey = ((-v.y + 1) * rect.height) / 2;
                out.push({
                  frame: frames,
                  wf: (window as any).__frames,
                  camX: cam.position.x,
                  sx,
                  sy,
                  ex,
                  ey,
                  drift: Math.hypot(sx - ex, sy - ey),
                });
              }
              frames++;
              if (frames < 35) requestAnimationFrame(sample);
              else resolve(out);
            }, 0);
          };
          requestAnimationFrame(sample);
        }),
      wPos
    );

    const box = (await page.locator('canvas').boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.5 + 120, box.y + box.height * 0.5 + 60, { steps: 10 });
    await page.mouse.up();
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
    await page.mouse.down({ button: 'right' });
    await page.mouse.move(box.x + box.width * 0.5 + 150, box.y + box.height * 0.5 - 80, { steps: 10 });
    await page.mouse.up({ button: 'right' });
    await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.8);
    await page.mouse.wheel(0, -300);

    samples.push(...(await collect));
    const maxDrift = Math.max(...samples.map((s) => s.drift));
    const totalMove = Math.hypot(
      samples[samples.length - 1].ex - samples[0].ex,
      samples[samples.length - 1].ey - samples[0].ey
    );
    expect(samples.length).toBeGreaterThan(2);
    expect(totalMove, `samples=${JSON.stringify(samples.slice(0, 3))}`).toBeGreaterThan(20);
    expect(maxDrift, `bad=${JSON.stringify(samples.filter((s) => s.drift > 0.5).slice(0, 8))}`).toBeLessThan(0.5);
  });

  test('closing a close-up PointSheet with Volver al mapa restores the previous 3D camera pose', async ({ page }) => {
    await page.goto('/');
    await show3D(page);
    await page.waitForFunction(() => Boolean((window as any).__cameraControls));
    await cameraSettled(page);

    const before = await page.evaluate(() => {
      const cc = (window as any).__cameraControls;
      return {
        distance: cc.distance as number,
        pos: cc.getPosition().toArray() as number[],
        target: cc.getTarget().toArray() as number[],
      };
    });

    // The points with a model open their own scene (#288, #310): Erebus is the point with a close-up sheet.
    await page.locator('[data-key="erebus"] button').evaluate((b: HTMLElement) => b.click());
    const sheet = page.getByRole('dialog', { name: 'Volcán en el hielo' });
    await expect(sheet).toBeVisible();
    await cameraSettled(page);

    const zoomedIn = await page.evaluate(() => (window as any).__cameraControls.distance as number);
    expect(zoomedIn).toBeLessThan(10);

    await sheet.getByRole('button', { name: 'Volver al mapa' }).click();
    await expect(sheet).not.toBeVisible();
    await cameraSettled(page);

    const after = await page.evaluate(() => {
      const cc = (window as any).__cameraControls;
      return {
        distance: cc.distance as number,
        pos: cc.getPosition().toArray() as number[],
        target: cc.getTarget().toArray() as number[],
      };
    });

    expect(after.distance).toBeCloseTo(before.distance, 1);
    before.pos.forEach((v, i) => expect(after.pos[i]).toBeCloseTo(v, 1));
    before.target.forEach((v, i) => expect(after.target[i]).toBeCloseTo(v, 1));

    // Also preserves an arbitrary mid-zoom/pan pose when reopening and closing with Escape.
    await page.evaluate(() => {
      const cc = (window as any).__cameraControls;
      cc.moveTo(-20, 0, 15, false);
      cc.dollyTo(180, false);
      (window as any).__invalidate();
    });
    await cameraSettled(page);
    const customBefore = await page.evaluate(() => {
      const cc = (window as any).__cameraControls;
      return {
        distance: cc.distance as number,
        pos: cc.getPosition().toArray() as number[],
        target: cc.getTarget().toArray() as number[],
      };
    });

    await page.locator('[data-key="erebus"] button').evaluate((b: HTMLElement) => b.click());
    await expect(sheet).toBeVisible();
    await cameraSettled(page);
    expect(await page.evaluate(() => (window as any).__cameraControls.distance as number)).toBeLessThan(10);

    await page.keyboard.press('Escape');
    await expect(sheet).not.toBeVisible();
    await cameraSettled(page);
    const customAfter = await page.evaluate(() => {
      const cc = (window as any).__cameraControls;
      return {
        distance: cc.distance as number,
        pos: cc.getPosition().toArray() as number[],
        target: cc.getTarget().toArray() as number[],
      };
    });
    expect(customAfter.distance).toBeCloseTo(customBefore.distance, 1);
    customBefore.pos.forEach((v, i) => expect(customAfter.pos[i]).toBeCloseTo(v, 1));
    customBefore.target.forEach((v, i) => expect(customAfter.target[i]).toBeCloseTo(v, 1));
  });
});

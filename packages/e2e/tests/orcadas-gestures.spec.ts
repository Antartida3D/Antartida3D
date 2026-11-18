import { expect, test } from '@playwright/test';
import { clearStorage } from '../storage.ts';
import { openOrcadasFromMap } from './orcadas-helpers.ts';

let consoleErrors: string[] = [];

test.beforeEach(async ({ page }) => {
  consoleErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => consoleErrors.push(e.message));
  await page.goto('/');
  await clearStorage(page);
  await page.reload();
});

test.afterEach(() => {
  expect(consoleErrors, 'console errors (hydration mismatches, exceptions)').toEqual([]);
});

test('on mobile touch, one finger pans target without tilting and two-finger pinch changes distance', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile project only');

  await openOrcadasFromMap(page);

  const cam = () =>
    page.evaluate(() => {
      const cc = (window as unknown as { __orcadasCamera: any }).__orcadasCamera;
      const t = cc.getTarget();
      return {
        d: cc.distance as number,
        polar: cc.polarAngle as number,
        az: cc.azimuthAngle as number,
        tx: t.x as number,
        tz: t.z as number,
      };
    });

  // The diorama renders on demand, so CameraControls may never report rest: wait until the pose stops changing.
  const waitRest = async () => {
    let last = JSON.stringify(await cam());
    for (let i = 0; i < 40; i++) {
      await page.waitForTimeout(150);
      const now = JSON.stringify(await cam());
      if (now === last) return;
      last = now;
    }
  };

  // Pick a y-row on the visible canvas clear of the header strip, bottom sheet, and hotspot buttons.
  const findCanvasY = (xOffsets: number[]) =>
    page.evaluate((offsets) => {
      const strip = document.querySelector('.orc-top')?.getBoundingClientRect();
      const panel = document.querySelector('.orc-panel')?.getBoundingClientRect();
      const minY = Math.round((strip?.bottom ?? 100) + 24);
      const maxY = Math.round((panel?.top ?? window.innerHeight * 0.5) - 24);
      const cx = Math.round(window.innerWidth / 2);
      for (let y = Math.round((minY + maxY) / 2); y <= maxY; y += 12) {
        if (offsets.every((dx) => document.elementFromPoint(cx + dx, y)?.tagName === 'CANVAS')) {
          return { x: cx, y };
        }
      }
      for (let y = minY; y <= maxY; y += 12) {
        if (offsets.every((dx) => document.elementFromPoint(cx + dx, y)?.tagName === 'CANVAS')) {
          return { x: cx, y };
        }
      }
      return { x: cx, y: Math.round((minY + maxY) / 2) };
    }, xOffsets);

  const cdp = await page.context().newCDPSession(page);

  // One finger drag pans the target over the diorama without changing polar angle.
  const panPoint = await findCanvasY([-40, 0, 40]);
  const beforePan = await cam();
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: panPoint.x - 40, y: panPoint.y }],
  });
  for (let i = 1; i <= 8; i++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: panPoint.x - 40 + i * 12, y: panPoint.y }],
    });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await waitRest();

  const afterPan = await cam();
  expect(Math.hypot(afterPan.tx - beforePan.tx, afterPan.tz - beforePan.tz)).toBeGreaterThan(0.5);
  expect(afterPan.polar).toBeCloseTo(beforePan.polar, 3);
  expect(afterPan.az).toBeCloseTo(beforePan.az, 3);

  // Two-finger spread (pinch out) brings the camera closer.
  const pinchPoint = await findCanvasY([-35, 35]);
  const beforePinch = await cam();
  const pinchPoints = (u: number) => [
    { x: pinchPoint.x - 35 - 45 * u, y: pinchPoint.y, id: 0 },
    { x: pinchPoint.x + 35 + 45 * u, y: pinchPoint.y, id: 1 },
  ];
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: pinchPoints(0),
  });
  for (let i = 1; i <= 10; i++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: pinchPoints(i / 10),
    });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await waitRest();

  const afterPinch = await cam();
  expect(afterPinch.d).toBeLessThan(beforePinch.d * 0.7);
});

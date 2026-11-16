import { expect, test } from '@playwright/test';
import { mockOpenMeteo } from './weather-helpers.ts';

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
  expect(consoleErrors, 'console errors (hydration mismatches, exceptions)').toEqual([]);
});

type Page = import('@playwright/test').Page;

/** Where the drawn camera looks over the ground (world x, z), from the three.js camera itself, not the controls' goal. */
const drawnTarget = (page: Page) =>
  page.evaluate(() => {
    const cc = (window as any).__cameraControls;
    const cam = cc.camera;
    const dir = cam.getWorldDirection(cam.position.clone());
    // The controls keep the target at `distance` in front of the camera.
    const at = cam.position.clone().addScaledVector(dir, cc.distance);
    return { x: at.x as number, z: at.z as number };
  });

/**
 * Ground position (world x, z) of the pin of milestone `n` (1-based; the first one, the departure, has none).
 * A pin stands where the camera goes: on the path, or at the far place of the milestone (Cabo de Hornos).
 */
const pinOf = (page: Page, n: number) =>
  page.evaluate((n) => {
    const pins: { x: number; z: number }[] = [];
    (window as any).__scene.traverse((o: any) => {
      const order = o.children.map((c: any) => c.renderOrder).join();
      // A pin passed also holds the button that opens it.
      if (o.type === 'Group' && order.startsWith('1001,1000,1002')) pins.push({ x: o.position.x, z: o.position.z });
    });
    return pins[n - 2];
  }, n);

// Under reduced motion "Próximo hito" jumps the vehicle without animation, and the canvas draws on
// demand: the camera must still land on the vehicle, or on the far place of the milestone (#76).
for (const [name, kind, start] of [['Hércules C-130', 'plane', 'Despegar'], ['ARA Almirante Irízar', 'ship', 'Zarpar']] as const) {
  test(`with reduced motion, each milestone jump of the ${kind} takes the camera there`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/');
    await page.getByRole('group', { name: 'Modo de vista' }).getByRole('button', { name: 'Relieve 3D' }).click();
    await page.waitForFunction(() => (window as any).__cameraControls);
    await page.getByRole('button', { name: 'Ver como lista' }).click();
    await page.getByRole('button', { name: /Desde Ushuaia.*Empezar expedición/ }).click();
    await page.getByRole('group', { name: 'Medio de transporte' }).getByRole('button', { name: new RegExp(name) }).click();
    await page.getByRole('button', { name: start }).click();

    // Up to the Drake Passage, opening each milestone from the bar: the trip does not open them (#157).
    // The ship goes by Cabo de Hornos, a place off its path, on the way.
    for (let n = 1; ; n++) {
      if (n > 1) await page.getByRole('button', { name: 'Próximo hito' }).click();
      await page.getByRole('group', { name: 'Hito por el que pasás' }).getByRole('button', { name: /^Leer el hito: / }).click();
      await expect(page.locator('.vstep')).toHaveText(new RegExp(`^Hito ${n} de`));
      if (n > 1) {
        const want = (await pinOf(page, n))!;
        const title = await page.locator('#voyage-title').textContent();
        await expect
          .poll(async () => {
            const got = await drawnTarget(page);
            return Math.hypot(got.x - want.x, got.z - want.z);
          }, { message: `camera over «${title}»` })
          .toBeLessThan(0.5);
      }
      if (await page.getByRole('heading', { level: 2, name: 'Pasaje de Drake' }).isVisible()) break;
      await page.getByRole('button', { name: 'Seguir viaje' }).click();
    }

    // With the camera there, the canvas rests: following a vehicle that stands still draws no frames,
    // even after something else asks for one.
    const frames = () => page.evaluate(() => (window as any).__gl.info.render.frame as number);
    await page.evaluate(() => (window as any).__invalidate());
    await expect
      .poll(async () => {
        const before = await frames();
        await page.waitForTimeout(500);
        return (await frames()) - before;
      }, { message: 'frames drawn in 500 ms while the trip waits' })
      .toBe(0);
  });
}

// Opening the trip brings the camera down to Ushuaia before a vehicle is picked: it used to come
// close around whatever it was looking at (#190).
test('opening «Desde Ushuaia» on the 3D map brings the camera down to Ushuaia, beside the panel', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('group', { name: 'Modo de vista' }).getByRole('button', { name: 'Relieve 3D' }).click();
  await page.waitForFunction(() => (window as any).__cameraControls);
  await page.getByRole('button', { name: 'Ver como lista' }).click();
  await page.getByRole('button', { name: /Desde Ushuaia.*Empezar expedición/ }).click();
  await expect(page.getByRole('group', { name: 'Medio de transporte' })).toBeVisible();

  // Where the Irízar leaves from (voyageAt('ship', 0)), in world units.
  const departure = { x: 32.54 - 500, z: 312.78 - 500 };
  const pose = () => page.evaluate(() => {
    const cc = (window as any).__cameraControls;
    const cam = cc.camera;
    // Where the departure point is drawn, as a fraction of the screen width.
    const p = cam.position.clone().set(32.54 - 500, 0, 312.78 - 500).project(cam);
    return { distance: cc.distance as number, screenX: (p.x + 1) / 2 };
  });
  await expect.poll(async () => (await pose()).distance, { message: 'camera close to the ground' }).toBeLessThan(20);
  const got = await drawnTarget(page);
  // Within a few units of the port: the target is beside it on a wide screen, to clear the panel.
  expect(Math.hypot(got.x - departure.x, got.z - departure.z)).toBeLessThan(12);
  const { screenX } = await pose();
  const { width } = page.viewportSize()!;
  if (width > 820) {
    // In the middle of the part the panel leaves free (480 px wide, 88 px from the right edge).
    expect(Math.abs(screenX * width - (width - 568) / 2)).toBeLessThan(30);
  } else {
    expect(Math.abs(screenX - 0.5)).toBeLessThan(0.05);
  }
});

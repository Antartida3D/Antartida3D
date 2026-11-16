import { expect, test, type Page } from '@playwright/test';
import { AVAILABLE_COUNT } from '../../core/src/content/points.ts';
import { clearStorage } from '../storage.ts';
import { MARAMBIO_SPOTS, marambioFacts } from '../../core/src/content/marambio.ts';
import { ORCADAS_GUIDING_QUESTION } from '../../core/src/content/orcadas.ts';
import { mockOpenMeteo } from './weather-helpers.ts';

const log = (page: Page) => page.locator('.reg');
const primary = (page: Page) => page.locator('.mar .ebar .btn.primary');
const heading = (page: Page, name: string) => page.locator('.mar').getByRole('heading', { level: 2, name });

async function openMarambio(page: Page) {
  await page.getByRole('button', { name: 'Ver como lista' }).click();
  const list = page.getByRole('dialog', { name: 'Todos los puntos' });
  await list.getByRole('button', { name: /Base Marambio/ }).click();
  await expect(heading(page, MARAMBIO_SPOTS[0].label)).toBeVisible();
  await page.waitForFunction(() => (window as unknown as { __marambioReady?: boolean }).__marambioReady === true);
}

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

test.describe('with WebGL', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearStorage(page);
    await page.reload();
    await expect(log(page)).toContainText(`0/${AVAILABLE_COUNT}`);
  });

  test('walks every point of the base, shows its sources, and updates the log', async ({ page }) => {
    await openMarambio(page);
    const section = page.getByRole('region', { name: 'Expedición Base Marambio' });
    await expect(section.locator('canvas')).toBeVisible();
    // The scene is labelled as a reconstruction, and the label explains itself.
    await expect(section.locator('.orc-scene-badge')).toContainText('Reconstrucción ilustrada');
    await section.getByRole('button', { name: 'Ayuda sobre la reconstrucción ilustrada' }).click();
    await expect(section.getByRole('note')).toContainText(marambioFacts('scene')[0].text);
    await section.getByRole('button', { name: 'Ayuda sobre la reconstrucción ilustrada' }).click();

    for (const [i, spot] of MARAMBIO_SPOTS.entries()) {
      await expect(heading(page, spot.label)).toBeVisible();
      await expect(section.locator('.orc-kicker')).toHaveText(`Punto ${i + 1} de ${MARAMBIO_SPOTS.length}`);
      for (const fact of marambioFacts(spot.id)) await expect(section.locator('.orc-panel')).toContainText(fact.text);
      await expect(section.getByRole('button', { name: `Punto de interés: ${spot.label}` })).toHaveAttribute('aria-pressed', 'true');
      if (i < MARAMBIO_SPOTS.length - 1) {
        await expect(primary(page)).toHaveText('Siguiente');
        await primary(page).click();
      }
    }

    // A source link under a fact opens the list of sources, and the list goes back to the base.
    await section.locator('.orc-panel .orc-src-link').first().click();
    await expect(heading(page, 'De dónde sale cada dato')).toBeFocused();
    await expect(section.locator('.mar-source.is-highlight')).toHaveCount(1);
    await expect(section.locator('.mar-sources')).toContainText('OpenStreetMap');
    await expect(section.locator('.mar-sources')).toContainText('Consultado el');
    await page.keyboard.press('Escape');
    await expect(heading(page, MARAMBIO_SPOTS[MARAMBIO_SPOTS.length - 1].label)).toBeVisible();

    await expect(primary(page)).toHaveText('Terminar la visita');
    await primary(page).click();
    await expect(log(page)).toContainText(`1/${AVAILABLE_COUNT}`);
    await expect(page.locator('.toast')).toHaveText(`Base Marambio quedó explorado. Registro de exploración: 1/${AVAILABLE_COUNT}`);
  });

  test('a dot on the scene opens its point, and «Mapa» leaves without marking the base as explored', async ({ page }) => {
    await openMarambio(page);
    const section = page.getByRole('region', { name: 'Expedición Base Marambio' });
    const dot = section.getByRole('button', { name: 'Punto de interés: Hércules C-130' });
    await expect(dot).toBeVisible();
    await dot.click();
    await expect(heading(page, 'Hércules C-130')).toBeFocused();
    await expect(dot).toHaveAttribute('aria-pressed', 'true');
    await section.getByRole('button', { name: 'Atrás' }).click();
    await expect(heading(page, MARAMBIO_SPOTS[1].label)).toBeVisible();

    // The page never scrolls sideways.
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    await section.getByRole('button', { name: 'Volver al mapa' }).click();
    await expect(log(page)).toContainText(`0/${AVAILABLE_COUNT}`);
    await expect(page.locator('.toast')).toHaveCount(0);
  });

  test('the Irízar at sea offers the trip to Orcadas, and the trip opens Orcadas', async ({ page }) => {
    await openMarambio(page);
    const section = page.getByRole('region', { name: 'Expedición Base Marambio' });
    const ship = section.getByRole('button', { name: 'El Irízar: viajar a la Estación Orcadas' });
    await expect(ship).toBeVisible();

    // Staying in Marambio closes the question and gives the focus back to the ship.
    await ship.click();
    const dialog = page.getByRole('dialog', { name: '¿Querés empezar el viaje a la Estación Orcadas?' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Viajar a Orcadas' })).toBeFocused();
    await expect(dialog).toContainText('Recorrido ilustrativo');
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(ship).toBeFocused();
    await ship.click();
    await dialog.getByRole('button', { name: 'Seguir en Marambio' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(heading(page, MARAMBIO_SPOTS[0].label)).toBeVisible();

    // Sailing leaves Marambio, without marking it explored before its visit was done, and opens Orcadas.
    await ship.click();
    await dialog.getByRole('button', { name: 'Viajar a Orcadas' }).click();
    await expect(page.getByRole('heading', { level: 2, name: ORCADAS_GUIDING_QUESTION })).toBeVisible({ timeout: 20_000 });
    await page.waitForFunction(() => (window as unknown as { __orcadasReady?: boolean }).__orcadasReady === true);
    await page.getByRole('button', { name: 'Volver al mapa' }).click();
    await expect(log(page)).toContainText('0/3');
  });

  test('the strip of months shows the days of ventisca of each month with their source', async ({ page }) => {
    await openMarambio(page);
    const strip = page.getByRole('complementary', { name: 'Control estacional de la base' });
    // A phone shows a chip that opens the strip; a wide screen shows the strip.
    const chip = strip.getByRole('button', { name: /^Mes: .*Cambiar mes$/ });
    if (await chip.isVisible()) await chip.click();
    await strip.getByRole('group', { name: 'Mes en la base' }).getByRole('button', { name: 'julio' }).click();
    if (await chip.isVisible()) await expect(chip).toHaveAccessibleName('Mes: julio. Cambiar mes');
    if (await chip.isVisible()) await chip.click();
    await strip.getByText('Saber más').click();
    await expect(strip).toContainText('En julio: 12,2 días con ventisca alta y -14,9 °C de temperatura media (SMN, 1991-2020).');
    for (const fact of marambioFacts('months')) await expect(strip).toContainText(fact.text);
    // The scene keeps drawing in the month with most blizzards.
    await expect(page.locator('.mar canvas')).toBeVisible();
    // The source link of a month fact opens the list of sources on the SMN normals.
    await strip.getByRole('button', { name: 'SMN, normales 1991-2020' }).first().click();
    await expect(page.locator('.mar-source.is-highlight')).toContainText('Estadísticas Climatológicas Normales');
  });

  test.describe('the diorama moves with the same gestures as the map', () => {
    const cam = (page: Page) =>
      page.evaluate(() => {
        const cc = (window as unknown as { __marambioCamera: any }).__marambioCamera;
        const t = cc.getTarget();
        return { d: cc.distance as number, polar: cc.polarAngle as number, az: cc.azimuthAngle as number, tx: t.x as number, tz: t.z as number };
      });
    // The scene draws on demand: wait until the pose stops changing.
    const waitRest = async (page: Page) => {
      let last = JSON.stringify(await cam(page));
      for (let i = 0; i < 40; i++) {
        await page.waitForTimeout(150);
        const now = JSON.stringify(await cam(page));
        if (now === last) return;
        last = now;
      }
    };
    /** A point of the scene clear of the top bar, the panel and the dots, with room around it. */
    const freePoint = (page: Page, reach: number) =>
      page.evaluate((r) => {
        const panel = document.querySelector('.mar .orc-panel')?.getBoundingClientRect();
        const maxX = panel && panel.left > window.innerWidth / 3 ? panel.left - r - 10 : window.innerWidth - r - 10;
        const maxY = panel && panel.top > window.innerHeight / 3 ? panel.top - r - 10 : window.innerHeight - r - 10;
        const clear = (x: number, y: number) =>
          [-r, 0, r].every((dx) => [-r, 0, r].every((dy) => document.elementFromPoint(x + dx, y + dy)?.tagName === 'CANVAS'));
        for (let y = 140 + r; y <= maxY; y += 16) for (let x = r + 10; x <= maxX; x += 16) if (clear(x, y)) return { x, y };
        throw new Error('no free point on the scene');
      }, reach);

    test('on a computer, the left button moves over the ground and the right one turns', async ({ page, isMobile }) => {
      test.skip(isMobile, 'mouse gestures belong to the desktop layout');
      await openMarambio(page);
      await waitRest(page);
      const drag = async (button: 'left' | 'right', dx: number) => {
        const p = await freePoint(page, 70);
        await page.mouse.move(p.x - dx / 2, p.y);
        await page.mouse.down({ button });
        await page.mouse.move(p.x + dx / 2, p.y, { steps: 10 });
        await page.mouse.up({ button });
        await waitRest(page);
      };

      const before = await cam(page);
      await drag('left', 120);
      const panned = await cam(page);
      expect(Math.hypot(panned.tx - before.tx, panned.tz - before.tz)).toBeGreaterThan(0.5);
      expect(panned.az).toBeCloseTo(before.az, 3);
      expect(panned.polar).toBeCloseTo(before.polar, 3);

      await drag('right', 120);
      const turned = await cam(page);
      expect(Math.abs(turned.az - panned.az)).toBeGreaterThan(0.05);
      expect(Math.hypot(turned.tx - panned.tx, turned.tz - panned.tz)).toBeLessThan(0.01);
    });

    test('on a phone, one finger moves over the ground and two fingers pinch to come closer', async ({ page, isMobile }) => {
      test.skip(!isMobile, 'touch gestures belong to the phone layout');
      await openMarambio(page);
      await waitRest(page);
      const cdp = await page.context().newCDPSession(page);

      const p = await freePoint(page, 50);
      const before = await cam(page);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p.x - 40, y: p.y }] });
      for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p.x - 40 + i * 10, y: p.y }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await waitRest(page);
      const panned = await cam(page);
      expect(Math.hypot(panned.tx - before.tx, panned.tz - before.tz)).toBeGreaterThan(0.5);
      expect(panned.polar).toBeCloseTo(before.polar, 3);
      expect(panned.az).toBeCloseTo(before.az, 3);

      const q = await freePoint(page, 50);
      const fingers = (u: number) => [
        { x: q.x - 20 - 30 * u, y: q.y, id: 0 },
        { x: q.x + 20 + 30 * u, y: q.y, id: 1 },
      ];
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: fingers(0) });
      for (let i = 1; i <= 10; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: fingers(i / 10) });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await waitRest(page);
      expect((await cam(page)).d).toBeLessThan(panned.d * 0.8);
    });

    test('on a phone, a double tap comes closer and the second touch dragged down goes back out (#165)', async ({ page, isMobile }) => {
      test.skip(!isMobile, 'touch gestures belong to the phone layout');
      await openMarambio(page);
      await waitRest(page);
      const cdp = await page.context().newCDPSession(page);
      const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', p?: { x: number; y: number }) =>
        cdp.send('Input.dispatchTouchEvent', { type, touchPoints: p ? [p] : [] });
      const tap = async (p: { x: number; y: number }) => {
        await touch('touchStart', p);
        await touch('touchEnd');
      };

      // Clear of the dots: tapping one opens its point.
      const p = await freePoint(page, 80);
      const before = await cam(page);
      await tap(p);
      await tap(p);
      await waitRest(page);
      const closer = await cam(page);
      expect(closer.d).toBeLessThan(before.d * 0.8);
      expect(closer.polar).toBeCloseTo(before.polar, 3);
      expect(closer.az).toBeCloseTo(before.az, 3);

      await page.waitForTimeout(400); // past the double tap time
      await tap(p);
      await touch('touchStart', p);
      for (let i = 1; i <= 10; i++) await touch('touchMove', { x: p.x, y: p.y + 8 * i });
      await touch('touchEnd');
      await waitRest(page);
      const out = await cam(page);
      expect(out.d).toBeGreaterThan(closer.d * 1.2);
      // Never past the diorama's own farthest view.
      expect(out.d).toBeLessThanOrEqual(await page.evaluate(() => (window as any).__marambioCamera.maxDistance + 0.01));
    });
  });
});

test('without WebGL the base shows its drawing and the visit still works', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      return /webgl/.test(type) ? null : (original as (...a: unknown[]) => unknown).call(this, type, ...rest);
    } as typeof original;
  });
  await page.goto('/');
  await openMarambio(page);
  const section = page.getByRole('region', { name: 'Expedición Base Marambio' });
  await expect(section.getByRole('img', { name: /Ilustración de la Base Marambio/ })).toBeVisible();
  await expect(section.locator('canvas')).toHaveCount(0);
  await section.getByRole('button', { name: 'Punto de interés: La pista' }).click();
  await expect(heading(page, 'La pista')).toBeVisible();
});

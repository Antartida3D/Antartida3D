import { expect, test, type CDPSession, type Locator, type Page } from '@playwright/test';
import { MARAMBIO_SPOTS } from '../../core/src/content/marambio.ts';
import { ORCADAS_GUIDING_QUESTION } from '../../core/src/content/orcadas.ts';
import { AVAILABLE_COUNT, LIST_BUTTON_LABEL } from '../../core/src/content/points.ts';
import { EXPLORED_KEY } from '../../core/src/storage.ts';
import { clearStorage } from '../storage.ts';
import { mockOpenMeteo } from './weather-helpers.ts';
import { show3D } from './map-helpers.ts';

let consoleErrors: string[] = [];

async function seedExplored(page: Page, ids: readonly string[]) {
  await page.evaluate(
    ({ key, value }) => {
      localStorage.setItem(key, JSON.stringify(value));
    },
    { key: EXPLORED_KEY, value: ids },
  );
  await page.reload();
}

async function touchDrag(cdp: CDPSession, from: Locator, dx: number, dy: number) {
  const box = (await from.boundingBox())!;
  const [x, y] = [box.x + box.width / 2, box.y + box.height / 2];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let i = 1; i <= 8; i++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: x + (dx * i) / 8, y: y + (dy * i) / 8 }],
    });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

async function completeFossilsFromList(page: Page) {
  await page.getByRole('button', { name: LIST_BUTTON_LABEL }).click();
  await page.getByRole('dialog', { name: 'Todos los puntos' }).getByRole('button', { name: /Fósiles/ }).click();
  await page.getByRole('button', { name: 'Comenzar expedición' }).click();
  await expect(page.getByRole('heading', { name: 'Las rocas recuerdan' })).toBeVisible();
  for (let i = 0; i < 13; i++) {
    await page.locator('.fossil-next').click();
  }
  await page.getByRole('button', { name: 'Terminar expedición' }).click();
  await expect(page.locator('.next-sheet')).toBeVisible();
}

async function completeMarambioFromList(page: Page) {
  await page.getByRole('button', { name: LIST_BUTTON_LABEL }).click();
  await page.getByRole('dialog', { name: 'Todos los puntos' }).getByRole('button', { name: /Base Marambio/ }).click();
  await page.getByRole('button', { name: 'Comenzar expedición' }).click();
  await expect(page.locator('.mar').getByRole('heading', { level: 2, name: MARAMBIO_SPOTS[0].label })).toBeVisible();
  await page.waitForFunction(() => (window as unknown as { __marambioReady?: boolean }).__marambioReady === true);
  const primary = page.locator('.mar .sheet-actions .btn.primary');
  for (let i = 0; i < MARAMBIO_SPOTS.length - 1; i++) {
    await primary.click();
  }
  await expect(primary).toHaveText('Terminar expedición');
  await primary.click();
  await expect(page.locator('.next-sheet')).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  consoleErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => consoleErrors.push(e.message));
  await mockOpenMeteo(page);
  await page.goto('about:blank');
  await page.goto('/');
  await clearStorage(page);
  await page.reload();
});

test.afterEach(() => {
  expect(consoleErrors, 'console errors (hydration mismatches, exceptions)').toEqual([]);
});

test('with nothing explored, shows Siguiente: Desde Ushuaia and marks its marker as suggested', async ({ page }) => {
  await expect(page.locator('.btn.next-btn')).toHaveText('Siguiente: Desde Ushuaia');
  const marker = page.locator('.vp .mk.next');
  await expect(marker).toHaveCount(1);
  await expect(marker).toHaveAttribute('aria-label', /Desde Ushuaia.*Expedición sugerida para seguir\. Empezar\./);
  // No «Siguiente» tag over it (it crowded the fan): the halo and its name say it.
  await expect(marker.locator('.mnext')).toHaveCount(0);
  await expect(marker.locator('.dot')).toHaveCSS('box-shadow', /rgb/);
});

test('the exploration log drops down the six expeditions with their state and opens the one chosen (#235)', async ({ page }) => {
  await seedExplored(page, ['campana']);
  const log = page.getByRole('button', { name: /Registro de exploración/ });
  await expect(log).toHaveAttribute('aria-expanded', 'false');
  // Narrower than 820 px (a phone held upright) it stays a small «1/6» pill (#249).
  if (page.viewportSize()!.width < 820) await expect(page.locator('.reg .unit')).toBeHidden();

  await log.click();
  await expect(log).toHaveAttribute('aria-expanded', 'true');
  const items = page.getByRole('list', { name: 'Expediciones' }).getByRole('button');
  await expect(items).toHaveCount(AVAILABLE_COUNT);
  // Explored: a tick instead of its number and its title struck through, said in its name.
  await expect(items.nth(0)).toHaveAccessibleName('Desde Ushuaia, explorada');
  await expect(items.nth(0).locator('.num svg')).toBeVisible();
  await expect(items.nth(0).locator('strong')).toHaveCSS('text-decoration-line', 'line-through');
  // The suggested next one keeps its tag; the rest show only number and title.
  await expect(items.nth(1)).toHaveAccessibleName('Base Marambio, siguiente sugerida');
  await expect(items.nth(1)).toContainText('Siguiente sugerida');
  await expect(items.nth(1).locator('.num')).toHaveText('2');
  await expect(items.nth(1).locator('strong')).toHaveCSS('text-decoration-line', 'none');
  await expect(items.nth(2)).toHaveAccessibleName('Fósiles');
  await expect(items.nth(2)).not.toContainText('Empezar expedición');
  // Only expeditions: no point of interest.
  await expect(page.locator('.reg-menu')).not.toContainText('Volcán');

  await page.keyboard.press('Escape');
  await expect(page.locator('.reg-menu')).toHaveCount(0);
  await expect(log).toBeFocused();

  await log.click();
  await items.filter({ hasText: 'Fósiles' }).click();
  await page.getByRole('button', { name: 'Comenzar expedición' }).click();
  await expect(page.getByRole('heading', { name: 'Las rocas recuerdan' })).toBeVisible();
});

test('with campana explored, suggests Base Marambio and tags its own marker', async ({ page }) => {
  await seedExplored(page, ['campana']);
  await expect(page.locator('.btn.next-btn')).toHaveText('Siguiente: Base Marambio');
  const marker = page.locator('.vp .mk.next');
  await expect(marker).toHaveCount(1);
  await expect(marker).toHaveAttribute('aria-label', /^Base Marambio, .*Expedición sugerida para seguir\. Empezar\.$/);
  // No «Siguiente» tag over it (it crowded the fan): the halo and its name say it.
  await expect(marker.locator('.mnext')).toHaveCount(0);
  await expect(marker.locator('.dot')).toHaveCSS('box-shadow', /rgb/);
});

test('in 3D relief, the suggested marker carries the next class', async ({ page }) => {
  await show3D(page);
  await expect(page.locator('.ld')).toHaveCount(0, { timeout: 10_000 });
  const marker = page.locator('.vp .mk.next');
  await expect(marker).toHaveCount(1);
  // No «Siguiente» tag over it (it crowded the fan): the halo and its name say it.
  await expect(marker.locator('.mnext')).toHaveCount(0);
  await expect(marker.locator('.dot')).toHaveCSS('box-shadow', /rgb/);
});

test('finishing Fósiles opens the next card with log count and starts the Poncho voyage', async ({ page }) => {
  await seedExplored(page, ['campana', 'marambio']);
  await completeFossilsFromList(page);
  const card = page.locator('.next-sheet');
  await expect(card.locator('#next-title')).toHaveText(`Fósiles quedó explorado. Registro de exploración: 3/${AVAILABLE_COUNT}`);
  const startBtn = card.locator('.btn.primary');
  await expect(startBtn).toHaveText('Poncho');
  await startBtn.click();
  await expect(card).toHaveCount(0);
  await expect(page.locator('.ld')).toHaveCount(0, { timeout: 10_000 });
  await expect(page.getByRole('dialog', { name: 'Poncho, perro polar argentino' })).toBeVisible();
});

test('finishing Marambio offers the Irízar voyage to Orcadas', async ({ page }) => {
  await seedExplored(page, ['campana']);
  await completeMarambioFromList(page);
  const card = page.locator('.next-sheet');
  await expect(card.locator('.btn.primary')).toHaveText('Fósiles');
  const irizar = card.getByRole('button', { name: 'Viajar a Orcadas en el Irízar' });
  await expect(irizar).toBeVisible();
  await irizar.click();
  await expect(page.getByRole('heading', { level: 2, name: ORCADAS_GUIDING_QUESTION })).toBeVisible({ timeout: 20_000 });
});

test('finishing Marambio makes the Irízar voyage primary when Fósiles and Poncho are done', async ({ page }) => {
  await seedExplored(page, ['campana', 'fosiles', 'poncho']);
  await completeMarambioFromList(page);
  const card = page.locator('.next-sheet');
  await expect(card.locator('.btn.primary')).toHaveText('Viajar a Orcadas en el Irízar');
  await expect(card.locator('.next-irizar')).toHaveCount(0);
});

test('with all six explored, shows completion message and no suggested next', async ({ page }) => {
  await seedExplored(page, ['campana', 'marambio', 'poncho', 'orcadas', 'oceano']);
  await completeFossilsFromList(page);
  const card = page.locator('.next-sheet');
  await expect(card.locator('#next-title')).toHaveText(`Fósiles quedó explorado. Registro de exploración: ${AVAILABLE_COUNT}/${AVAILABLE_COUNT}`);
  await expect(card).toContainText('Exploraste las seis expediciones');
  await expect(card.locator('.btn.primary')).toHaveCount(0);
  await card.getByRole('button', { name: 'Cerrar' }).click();
  await expect(card).toHaveCount(0);
  await expect(page.locator('.btn.next-btn')).toHaveCount(0);
  await expect(page.locator('.vp .mk.next, .vp .mk.has-next')).toHaveCount(0);
});

test('next card does not overlap or intercept clicks on the suggested marker, and fits compact height at 844x390', async ({ page }) => {
  await seedExplored(page, ['campana', 'marambio']);
  await completeFossilsFromList(page);
  const card = page.locator('.next-sheet');
  const marker = page.locator('.vp .mk.next, .vp .mk.has-next').first();
  await expect(marker).toBeVisible();
  // Let framing and sheet entrance settle before measuring boxes (the 3D camera eases into place).
  await page.waitForTimeout(200);
  await expect
    .poll(() =>
      marker.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return Boolean(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.closest('.mk.next, .mk.has-next'));
      }),
    )
    .toBe(true);

  const cardBox = (await card.boundingBox())!;
  const markerBox = (await marker.boundingBox())!;
  const vp = page.viewportSize()!;

  const overlaps =
    markerBox.x < cardBox.x + cardBox.width &&
    markerBox.x + markerBox.width > cardBox.x &&
    markerBox.y < cardBox.y + cardBox.height &&
    markerBox.y + markerBox.height > cardBox.y;
  expect(overlaps, 'marker and next card bounding boxes must not overlap').toBe(false);

  const cx = markerBox.x + markerBox.width / 2;
  const cy = markerBox.y + markerBox.height / 2;
  const hit = await page.evaluate(
    ({ x, y }) => {
      const el = document.elementFromPoint(x, y);
      return {
        ok: Boolean(el?.closest('.mk.next, .mk.has-next')),
        tag: el ? `${el.tagName.toLowerCase()}.${el.className}` : 'null',
      };
    },
    { x: cx, y: cy },
  );
  expect(hit.ok, `elementFromPoint(${cx.toFixed(1)}, ${cy.toFixed(1)}) hit ${hit.tag} instead of suggested marker`).toBe(true);

  if (vp.width === 844 && vp.height === 390) {
    expect(cardBox.height).toBeLessThanOrEqual(vp.height / 2 + 1);
  }
});

test('keyboard focuses Empezar on open, Escape closes the card and returns focus to the map', async ({ page }) => {
  await completeFossilsFromList(page);
  const card = page.locator('.next-sheet');
  await expect(card.locator('.btn.primary')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(card).toHaveCount(0);
  await expect(page.locator('.vp')).toBeFocused();
});

test('on narrow phone screens, dragging the next card down 200px closes it while a short drag leaves it open', async ({ page }) => {
  test.skip(page.viewportSize()!.width >= 820, 'bottom-sheet drag applies only below 820px');
  await completeFossilsFromList(page);
  const card = page.locator('.next-sheet');
  const handle = card.locator('.sheet-handle');
  await expect(handle).toBeVisible();
  const cdp = await page.context().newCDPSession(page);

  await touchDrag(cdp, handle, 0, 20);
  await expect(card).toBeVisible();

  await touchDrag(cdp, handle, 0, 200);
  await expect(card).toHaveCount(0);
});

test('browser back closes the next card and keeps the app on the map', async ({ page }) => {
  await completeFossilsFromList(page);
  const card = page.locator('.next-sheet');
  await expect(card).toBeVisible();
  await page.goBack();
  await expect(card).toHaveCount(0);
  expect(page.url()).not.toBe('about:blank');
  await expect(page.getByRole('button', { name: LIST_BUTTON_LABEL })).toBeVisible();
});

test('dragging the map moves it while the next card stays open', async ({ page }) => {
  await completeFossilsFromList(page);
  const card = page.locator('.next-sheet');
  await expect(card).toBeVisible();
  const vp = page.locator('.vp');
  const marker = page.locator('.vp .mk.next, .vp .mk.has-next').first();
  await expect(page.locator('section.ld')).toHaveCount(0);
  await expect(vp).toBeVisible();
  await expect(marker).toBeVisible();
  // Framing waits for ten stable frames before it may pan again. Twelve consecutive samples
  // of the visible marker and settled camera avoid measuring the temporary pose before that pan.
  await page.waitForFunction(() => {
    const el = document.querySelector<HTMLElement>('.vp .mk.next, .vp .mk.has-next');
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    const cc = document.querySelector('.stage.m3d') ? (window as any).__cameraControls : null;
    (window as any).__invalidate?.();
    const cameraStill = !cc || (!cc.active &&
      cc.getPosition(undefined, false).distanceTo(cc.getPosition(undefined, true)) < 1e-4 &&
      cc.getTarget(undefined, false).distanceTo(cc.getTarget(undefined, true)) < 1e-4);
    const state = (window as any).__nextCardDragReady ??= { x: NaN, y: NaN, frames: 0 };
    const stable = rect.width > 0 && rect.height > 0 && hit?.closest('.mk.next, .mk.has-next') === el &&
      cameraStill && Math.abs(rect.x - state.x) + Math.abs(rect.y - state.y) < 0.5;
    state.frames = stable ? state.frames + 1 : 0;
    state.x = rect.x;
    state.y = rect.y;
    if (state.frames < 12) return false;
    delete (window as any).__nextCardDragReady;
    return true;
  }, null, { polling: 'raf', timeout: 15_000 });
  const before = await marker.boundingBox();
  expect(before).not.toBeNull();

  const start = await vp.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    for (const y of [0.2, 0.3, 0.4, 0.5, 0.6]) for (const x of [0.15, 0.3, 0.45, 0.6]) {
      const point = { x: rect.x + rect.width * x, y: rect.y + rect.height * y };
      const free = Array.from({ length: 7 }, (_, step) => {
        const hit = document.elementFromPoint(point.x + 100 * step / 6, point.y + 50 * step / 6);
        return hit && el.contains(hit) && !hit.closest('button') && (hit.tagName === 'CANVAS' || hit.closest('.layer'));
      }).every(Boolean);
      if (free) return point;
    }
    return null;
  });
  expect(start, 'the complete drag path is on the map, clear of cards and markers').not.toBeNull();
  await page.mouse.move(start!.x, start!.y);
  await page.mouse.down();
  await page.mouse.move(start!.x + 100, start!.y + 50, { steps: 6 });
  await page.mouse.up();

  // The 3D camera eases into place after the drag: wait for the marker to follow.
  await expect
    .poll(async () => {
      const after = await marker.boundingBox();
      return after ? Math.hypot(after.x - before!.x, after.y - before!.y) : 0;
    })
    .toBeGreaterThan(30);
  await expect(card).toBeVisible();
});

test('list view shows expeditions ordered 1 to 6 and labels the next suggested one', async ({ page }) => {
  await seedExplored(page, ['campana']);
  await page.getByRole('button', { name: LIST_BUTTON_LABEL }).click();
  const dialog = page.getByRole('dialog', { name: 'Todos los puntos' });
  const section = dialog.locator('section', { has: page.locator('#g-a') });
  await expect(section.locator('h3')).toContainText('Expediciones · orden sugerido');
  const items = section.locator('ol > li');
  await expect(items).toHaveCount(6);

  const expectedTitles = ['Desde Ushuaia', 'Base Marambio', 'Fósiles', 'Poncho', 'Estación Orcadas', 'Océano'];
  for (let i = 0; i < expectedTitles.length; i++) {
    await expect(items.nth(i).locator('.num')).toHaveText(String(i + 1));
    await expect(items.nth(i).locator('strong')).toHaveText(expectedTitles[i]);
  }
  await expect(items.nth(0).locator('.go')).toHaveText('Explorado · volver a entrar');
  await expect(items.nth(1).locator('.go.next')).toHaveText('Siguiente sugerida');
  await expect(items.nth(2).locator('.go')).toHaveText('Empezar expedición');
});

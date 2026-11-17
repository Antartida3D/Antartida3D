import { expect, test, type Page } from '@playwright/test';
import { mockOpenMeteo } from './weather-helpers.ts';
import { MAP_2D_ENABLED, show3D } from './map-helpers.ts';
import { LIST_BUTTON_LABEL } from '../../core/src/content/points.ts';

/**
 * Hides the claims details (#148). On a phone they are a sheet over the bottom half, over their own
 * button too: they hide dragged down, like the point sheets. On a wide screen, with their button.
 */
async function hideDetails(page: Page, isMobile: boolean) {
  const panel = page.getByRole('region', { name: 'Reclamos antárticos' });
  if (!isMobile) return page.getByRole('button', { name: 'Detalles de reclamos', exact: true }).click();
  const box = (await panel.getByRole('heading', { name: 'Reclamos antárticos' }).boundingBox())!;
  const [x, y] = [box.x + box.width / 2, box.y + box.height / 2];
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + 25 * i }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(panel).toHaveCount(0);
}

test.beforeEach(async ({ page }) => {
  await mockOpenMeteo(page);
});

/** The claims layer has no control in the map menu while off: it opens from the South Pole sheet (#128). */
async function openFromPole(page: Page, key = false, beforeAction?: () => Promise<void>) {
  await page.getByRole('button', { name: LIST_BUTTON_LABEL, exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: /^El Polo Sur/ }).click();
  await beforeAction?.();
  const action = page.getByRole('dialog').getByRole('button', { name: 'Ver reclamos territoriales', exact: true });
  if (key) {
    await action.focus();
    await page.keyboard.press('Space');
  } else await action.click();
}

test('claims start off, toggle areas and flags together, and keep the map camera', async ({ page, isMobile }, testInfo) => {
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await show3D(page);
  const toggle = page.getByRole('switch', { name: 'Reclamos territoriales' });
  await page.waitForFunction(() => (window as any).__scene);
  await expect(toggle).toHaveCount(0);
  expect(await page.evaluate(() => !!(window as any).__scene.getObjectByName('antarctic-claims'))).toBe(false);
  const sceneId = await page.evaluate(() => (window as any).__scene.uuid);
  const distance = () => page.evaluate(() => (window as any).__cameraControls.distance as number);
  const homeDistance = await distance();

  // The pole sheet zooms in; showing the claims pulls back to the whole continent.
  await openFromPole(page, true, () => expect.poll(distance, { timeout: 10_000 }).toBeLessThan(homeDistance * .5));
  await expect.poll(distance, { timeout: 10_000 }).toBeGreaterThan(homeDistance * .95);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await expect(toggle).toBeFocused();
  await expect(page.getByLabel('Superficie visible')).toHaveValue('sectors');
  await expect(page.getByRole('region', { name: 'Reclamos antárticos' }).getByRole('status')).toContainText('Elegí un país');
  await page.waitForFunction(() => (window as any).__scene.getObjectByName('claim-ar')?.children.length > 0);
  const content = await page.evaluate(() => {
    const layer = (window as any).__scene.getObjectByName('antarctic-claims');
    const flags: string[] = [];
    const areas: { vertices: number; transparent: boolean; opacity: number }[] = [];
    const volumes: string[] = [];
    const borders: { dashed: boolean; dash: number; gap: number; distances: number; vertices: number }[] = [];
    const seaHeights: number[] = [];
    layer.traverse((object: any) => {
      if (object.name.startsWith('claim-flag-')) flags.push(object.name);
      if (object.name.startsWith('claim-area-')) areas.push({
        vertices: object.geometry.attributes.position.count,
        transparent: object.material.transparent, opacity: object.material.opacity,
      });
      if (object.name.startsWith('claim-walls-') || object.name.startsWith('claim-floor-')) volumes.push(object.name);
      if (object.name.startsWith('claim-border-')) borders.push({
        dashed: object.material.isLineDashedMaterial, dash: object.material.dashSize, gap: object.material.gapSize,
        distances: object.geometry.attributes.lineDistance?.count ?? 0, vertices: object.geometry.attributes.position.count,
      });
      if (object.name.startsWith('claim-area-') && object.name.endsWith('-0')) {
        const p = object.geometry.attributes.position;
        for (let i = 0; i < p.count; i++) seaHeights.push(p.getY(i));
      }
    });
    return { countries: layer.children.length, flags, areas, volumes, borders, seaHeights };
  });
  expect(content.countries).toBe(7);
  expect(content.flags).toHaveLength(9);
  expect(new Set(content.flags).size).toBe(7);
  expect(content.flags.filter((name) => name === 'claim-flag-no')).toHaveLength(2);
  expect(content.flags.filter((name) => name === 'claim-flag-au')).toHaveLength(2);
  expect(content.areas).toHaveLength(15);
  expect(content.areas.every((area) => area.vertices > 0 && area.transparent && area.opacity > 0 && area.opacity < .5)).toBe(true);
  expect(content.volumes).toHaveLength(0);
  expect(content.borders).toHaveLength(15);
  expect(content.borders.every((border) => border.dashed && border.dash > 0 && border.gap > border.dash && border.distances === border.vertices && border.vertices > 0)).toBe(true);
  expect(content.seaHeights.every((height) => height > -.05 && height < 0)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('claims-all.png') });
  // The sheet has no close button (#148).
  await hideDetails(page, isMobile);
  await page.screenshot({ path: testInfo.outputPath('claims-map.png') });
  await page.getByRole('button', { name: 'Detalles de reclamos', exact: true }).click();

  const countries = page.getByRole('group', { name: 'País reclamante' });
  await countries.getByRole('button', { name: 'Argentina', exact: true }).click();
  await expect(countries.getByRole('button', { name: 'Argentina', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => page.evaluate(() => (window as any).__scene.getObjectByName('antarctic-claims')
    .children.filter((group: any) => group.visible).map((group: any) => group.name))).toEqual(['claim-ar']);
  await expect(page.getByRole('region', { name: 'Reclamos antárticos' }).getByRole('button', { name: /^Fuente .*Ministerio/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('region', { name: 'Reclamos antárticos' })).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Detalles de reclamos', exact: true })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  const cameraPosition = await page.evaluate(() => (window as any).__cameraControls.camera.position.toArray());
  await toggle.click();
  await expect(toggle).toHaveCount(0);
  await expect(page.getByRole('application')).toBeFocused();
  await expect.poll(() => page.evaluate(() => !!(window as any).__scene.getObjectByName('antarctic-claims'))).toBe(false);
  expect(await page.evaluate(() => (window as any).__scene.uuid)).toBe(sceneId);
  const afterPosition = await page.evaluate(() => (window as any).__cameraControls.camera.position.toArray());
  afterPosition.forEach((coordinate: number, index: number) => expect(coordinate).toBeCloseTo(cameraPosition[index], 3));
  await openFromPole(page);
  await expect(page.getByRole('region', { name: 'Reclamos antárticos' }).getByRole('status')).toContainText('Sector Antártico Argentino');
  await page.reload();
  await expect(page.getByRole('switch', { name: 'Reclamos territoriales' })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('claims offer sea sectors and land coverage, with the full ocean extent', async ({ page }) => {
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await show3D(page);
  await openFromPole(page);
  const panel = page.getByRole('region', { name: 'Reclamos antárticos' });
  // This test enables the overlay during the initial high-resolution WebGL load.
  await expect(panel.getByRole('status')).toContainText('Elegí un país', { timeout: 20_000 });
  const radius = () => page.evaluate(() => {
    const p = (window as any).__scene.getObjectByName('claim-area-no-0').geometry.attributes.position;
    let maximum = 0;
    for (let i = 0; i < p.count; i++) maximum = Math.max(maximum, Math.hypot(p.getX(i), p.getZ(i)));
    return maximum;
  });
  await expect(page.getByLabel('Superficie visible').locator('option')).toHaveText(['Sectores con mar', 'Solo tierra y hielo']);
  const seaRadius = await radius();
  expect(seaRadius).toBeGreaterThan(425);
  await page.getByLabel('Superficie visible').selectOption('land');
  await expect.poll(radius).toBeLessThan(400);
  await page.getByLabel('Superficie visible').selectOption('sectors');
  await expect.poll(radius).toBeCloseTo(seaRadius, 3);

  expect(errors).toEqual([]);
});

test('claims controls fit the viewport and preserve selection when changing view mode', async ({ page, isMobile }) => {
  test.setTimeout(60_000);
  await page.goto('/');
  await show3D(page);
  await openFromPole(page);
  await page.getByRole('group', { name: 'País reclamante' }).getByRole('button', { name: 'Noruega', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Reclamos antárticos' }).getByRole('status')).toContainText('isla Pedro I');
  const bounds = await page.getByRole('region', { name: 'Reclamos antárticos' }).boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  // The sheet has no close button (#148).
  await hideDetails(page, isMobile);
  await page.getByRole('button', { name: 'Leyenda', exact: true }).click();
  await page.getByRole('button', { name: 'Detalles de reclamos', exact: true }).click();
  const withLegend = await page.getByRole('region', { name: 'Reclamos antárticos' }).boundingBox();
  expect(withLegend!.y).toBeGreaterThanOrEqual(0);
  // On a phone the details cover the view buttons: hidden first, shown again in 3D below.
  if (isMobile) await hideDetails(page, isMobile);
  if (MAP_2D_ENABLED) {
    await page.getByRole('button', { name: 'Mapa 2D', exact: true }).click();
    await expect(page.getByRole('switch', { name: 'Reclamos territoriales' })).toHaveCount(0);
    // The 2D map has no claims layer, so the South Pole sheet does not offer it.
    await page.getByRole('button', { name: LIST_BUTTON_LABEL, exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: /^El Polo Sur/ }).click();
    await expect(page.getByRole('dialog').getByRole('button', { name: /reclamos/i })).toHaveCount(0);
    await page.getByRole('dialog').getByRole('button', { name: 'Volver al mapa', exact: true }).click();
    await show3D(page);
  }
  await expect(page.getByRole('switch', { name: 'Reclamos territoriales' })).toHaveAttribute('aria-checked', 'true');
  if (isMobile) await page.getByRole('button', { name: 'Detalles de reclamos', exact: true }).click();
  await expect(page.getByRole('group', { name: 'País reclamante' }).getByRole('button', { name: 'Noruega', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

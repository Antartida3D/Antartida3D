import { expect, test } from '@playwright/test';
import { PONCHO_MILESTONES } from '../../core/src/content/poncho.ts';

let consoleErrors: string[] = [];

test.beforeEach(async ({ page }) => {
  consoleErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => consoleErrors.push(e.message));
});

test.afterEach(() => {
  expect(consoleErrors, 'console errors').toEqual([]);
});

// #211: the panel of a stop has the layout of the stops of Fósiles: one sentence at a time, «Saber más» that unfolds, arrows below.
test('the panel tells one sentence at a time with arrows, and «Saber más» unfolds in place', async ({ page }) => {
  const stop = PONCHO_MILESTONES[0];
  await page.goto('/');
  await page.getByRole('button', { name: 'Ver como lista' }).click();
  await page.getByRole('dialog', { name: 'Todos los puntos' }).getByRole('button', { name: /Poncho/ }).click();
  await page.getByRole('button', { name: 'Comenzar' }).click();

  const panel = page.locator('.poncho-panel');
  await expect(panel.getByRole('heading', { name: stop.title })).toBeVisible();
  await expect(panel.locator('.orc-kicker')).toHaveText(`Acto 1 · hito 1 de ${PONCHO_MILESTONES.length}`);
  // The scene is under the panel's side or above its sheet, never behind it: the panel is inside the screen.
  const [box, view] = await Promise.all([panel.boundingBox(), page.evaluate(() => ({ w: innerWidth, h: innerHeight }))]);
  expect(box && box.x >= 0 && box.x + box.width <= view.w + 1 && box.y >= 0 && box.y + box.height <= view.h + 1, 'the panel is inside the screen').toBe(true);

  // One sentence at a time, in the order of the story; «Atrás» is not there at the very first one.
  const line = panel.locator('.poncho-line');
  await expect(panel.getByRole('button', { name: 'Atrás' })).toHaveCount(0);
  await expect(line).toContainText('nace Poncho el 10 de abril de 1961');
  await expect(line).not.toContainText('cachorro más juguetón');
  await expect(panel.locator('.poncho-eyebrow')).toHaveText('1 de 3');
  await panel.getByRole('button', { name: 'Siguiente' }).click();
  await expect(line).toContainText('cachorro más juguetón');
  await expect(line).not.toContainText('nace Poncho el 10 de abril');
  await panel.getByRole('button', { name: 'Atrás' }).click();
  await expect(line).toContainText('nace Poncho el 10 de abril de 1961');

  // The arrow keys do the same as the arrows.
  await page.locator('.pdio').focus();
  await page.keyboard.press('ArrowRight');
  await expect(line).toContainText('cachorro más juguetón');
  await page.keyboard.press('ArrowRight');
  await expect(line).toContainText('los hombres instruyen a los perros');
  // The hook waits for the last one, and the last arrow leaves for the trip.
  await expect(panel).toContainText(stop.hook ?? '');
  await expect(panel.getByRole('button', { name: 'Seguir con Poncho' })).toBeVisible();

  // «Saber más» unfolds in the panel, with no modal in the middle.
  const more = panel.locator('details.poncho-more');
  await expect(more).not.toHaveAttribute('open', '');
  await more.locator('summary').click();
  await expect(more).toHaveAttribute('open', '');
  await expect(more).toContainText('Sus padres se llamaban Coca y Flecha');
  await expect(page.locator('dialog[open]')).toHaveCount(0);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test('the photograph of a stop opens in a modal and Escape closes it without leaving the stop', async ({ page }) => {
  test.setTimeout(90_000);
  const stop = PONCHO_MILESTONES.find((m) => m.id === 'poncho-perro-guia')!;
  await page.goto('/');
  await page.getByRole('button', { name: 'Ver como lista' }).click();
  await page.getByRole('dialog', { name: 'Todos los puntos' }).getByRole('button', { name: /Poncho/ }).click();
  await page.getByRole('button', { name: 'Comenzar' }).click();
  const panel = page.locator('.poncho-panel');
  // Read the stops that come before, one at a time, until the one with the photograph.
  const bar = page.getByRole('group', { name: 'Controles del viaje' });
  while (!(await panel.getByRole('heading', { name: stop.title }).isVisible())) {
    while (!(await panel.getByRole('button', { name: 'Seguir con Poncho' }).isVisible())) await panel.getByRole('button', { name: 'Siguiente' }).click();
    await panel.getByRole('button', { name: 'Seguir con Poncho' }).click();
    await expect(page.locator('.pdio')).toHaveCount(0);
    await bar.getByRole('button', { name: 'Próximo hito', exact: true }).click();
    await expect(panel).toBeVisible();
  }
  await expect(panel.getByRole('heading', { name: stop.title })).toBeVisible();
  const archive = panel.getByRole('button', { name: 'Abrir fotografía del archivo' });
  await archive.click();
  const modal = page.getByRole('dialog', { name: 'Archivo fotográfico' });
  await expect(modal).toBeVisible();
  await expect(modal.getByRole('link', { name: 'Fundación Marambio' })).toHaveAttribute('href', /^https:\/\//);
  await page.keyboard.press('Escape');
  await expect(modal).toHaveCount(0);
  await expect(panel.getByRole('heading', { name: stop.title })).toBeVisible();
  await expect(archive).toBeFocused();
});

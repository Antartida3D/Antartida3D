import { expect, test } from '@playwright/test';
import { LIST_BUTTON_LABEL } from '../../core/src/content/points.ts';
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

// #214: from the diorama of a stop one can go back to the map, and resume the trip inside the same stop.
test('«Volver al mapa» leaves the diorama for the map and the trip resumes inside that stop', async ({ page }) => {
  const first = PONCHO_MILESTONES[0];
  await page.goto('/');
  await page.getByRole('button', { name: LIST_BUTTON_LABEL }).click();
  await page.getByRole('dialog', { name: 'Todos los puntos' }).getByRole('button', { name: /Poncho/ }).click();
  await page.getByRole('button', { name: 'Comenzar' }).click();

  const diorama = page.locator('.pdio');
  await expect(diorama.getByRole('heading', { name: first.title })).toBeVisible();

  // The button is the first thing the keyboard reaches and it does not hide the notice of illustration.
  const back = diorama.getByRole('button', { name: 'Volver al mapa' });
  await expect(back).toBeVisible();
  const notice = diorama.locator('.pdio-badge');
  const [a, b] = await Promise.all([back.boundingBox(), notice.boundingBox()]);
  expect(a && b && a.y + a.height <= b.y + 1, 'the button sits above the notice').toBe(true);

  await back.click();
  await expect(page.locator('.pdio')).toHaveCount(0);
  const resume = page.getByRole('button', { name: /^Continuar: Poncho/ });
  await expect(resume).toBeVisible();

  // Left from inside a stop, the trip comes back into it: its scene and its panel.
  await resume.click();
  await expect(page.locator('.pdio').getByRole('heading', { name: first.title })).toBeVisible();
});

// #214: in the story the arrows go back to the stop before, whole, and forward again.
test('the arrows go back into the stop before, at its last sentence, and forward again; the bar goes back into the stop too', async ({ page }) => {
  const [first, second] = PONCHO_MILESTONES;
  await page.goto('/');
  await page.getByRole('button', { name: LIST_BUTTON_LABEL }).click();
  await page.getByRole('dialog', { name: 'Todos los puntos' }).getByRole('button', { name: /Poncho/ }).click();
  await page.getByRole('button', { name: 'Comenzar' }).click();

  const panel = page.locator('.poncho-panel');
  const controls = page.getByRole('group', { name: 'Controles del viaje' });
  // The stop is read to its end, and the trip goes on.
  await expect(panel.getByRole('heading', { name: first.title })).toBeVisible();
  while (!(await panel.getByRole('button', { name: 'Seguir con Poncho' }).isVisible())) await panel.getByRole('button', { name: 'Siguiente' }).click();
  await panel.getByRole('button', { name: 'Seguir con Poncho' }).click();
  await expect(page.locator('.pdio')).toHaveCount(0);

  // The bar goes back into the stop the team is at (whole: scene and panel), with no text apart.
  await expect(controls.getByRole('button', { name: `Volver al hito: ${first.title}` })).toBeVisible();
  await expect(controls.locator('.vsuggest')).toHaveCount(0);
  await controls.getByRole('button', { name: 'Próximo hito', exact: true }).click();

  // The second stop opens at its first sentence; «Atrás» goes back into the first, at its last sentence.
  await expect(panel.getByRole('heading', { name: second.title })).toBeVisible();
  await panel.getByRole('button', { name: 'Atrás' }).click();
  await expect(panel.getByRole('heading', { name: first.title })).toBeVisible();
  await expect(panel.locator('.poncho-line')).toContainText('los hombres instruyen a los perros');
  await expect(panel.locator('details.poncho-more')).toBeVisible();
  // From its last sentence the arrow goes forward into the second stop, which was already read: at its first sentence.
  await panel.getByRole('button', { name: 'Siguiente' }).click();
  await expect(panel.getByRole('heading', { name: second.title })).toBeVisible();
  await expect(panel.locator('.poncho-line .vfact')).toHaveCount(1);
});

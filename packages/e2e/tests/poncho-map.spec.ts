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

// #214: from the diorama of a stop one can go back to the map, and resume the trip from there.
test('«Volver al mapa» leaves the diorama for the map and the trip resumes after that stop', async ({ page }) => {
  const first = PONCHO_MILESTONES[0];
  await page.goto('/');
  await page.getByRole('button', { name: 'Ver como lista' }).click();
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

  // The trip comes back where it was left: the first stop reached. (Reading it again is the next part of #214.)
  await resume.click();
  const controls = page.getByRole('group', { name: 'Controles del viaje' });
  await expect(controls.locator('.vtrip')).toHaveText(`1 de ${PONCHO_MILESTONES.length} hitos de su historia`);
});

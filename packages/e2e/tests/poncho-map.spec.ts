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

// #214: in the story one can go back to read a stop that went by, and forward again.
test('the card of a stop goes back to the one before and forward again, and the bar offers the stop to read it again', async ({ page }) => {
  const [first, second] = PONCHO_MILESTONES;
  await page.goto('/');
  await page.getByRole('button', { name: 'Ver como lista' }).click();
  await page.getByRole('dialog', { name: 'Todos los puntos' }).getByRole('button', { name: /Poncho/ }).click();
  await page.getByRole('button', { name: 'Comenzar' }).click();

  const diorama = page.locator('.pdio');
  const leave = async () => {
    // The sentences go one by one (until #211 changes it), then the main button leaves.
    const nextSentence = diorama.getByRole('button', { name: 'Siguiente' });
    while (await nextSentence.isVisible()) await nextSentence.click();
    await diorama.getByRole('button', { name: /^Seguir con Poncho$/ }).click();
    await expect(diorama).toHaveCount(0);
  };
  await expect(diorama.getByRole('heading', { name: first.title })).toBeVisible();
  // The first stop has nothing before it, and nothing after it yet.
  await expect(diorama.getByRole('button', { name: /^Hito anterior/ })).toHaveCount(0);
  await expect(diorama.getByRole('button', { name: /^Hito siguiente/ })).toHaveCount(0);
  await leave();

  // The bar offers the stop the team is at, to read it again.
  const controls = page.getByRole('group', { name: 'Controles del viaje' });
  await expect(controls.getByRole('button', { name: `Volver a leer el hito: ${first.title}` })).toBeVisible();
  await controls.getByRole('button', { name: 'Próximo hito', exact: true }).click();

  await expect(diorama.getByRole('heading', { name: second.title })).toBeVisible();
  await expect(diorama.getByRole('button', { name: /^Hito siguiente/ })).toHaveCount(0);
  await diorama.getByRole('button', { name: `Hito anterior: ${first.title}` }).click();
  await expect(diorama.getByRole('heading', { name: first.title })).toBeVisible();
  await diorama.getByRole('button', { name: `Hito siguiente: ${second.title}` }).click();
  await expect(diorama.getByRole('heading', { name: second.title })).toBeVisible();
});

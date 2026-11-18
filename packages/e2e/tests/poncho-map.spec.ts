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
  const notice = diorama.locator('.orc-scene-badge');
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
  // It reads two stops, goes back and forward, and reads one again from the chip: longer than one stop.
  test.setTimeout(90_000);
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

  // The bar offers the stop the team is at as a chip, read, as in the trips from Ushuaia (#309): no «‹ Hito N» of its own.
  const chip = controls.getByRole('button', { name: `Volver a leer el hito: ${first.title}` });
  await expect(chip).toBeVisible();
  await expect(chip).toContainText('Leído');
  await expect(controls.getByRole('button', { name: /^Volver al hito/ })).toHaveCount(0);
  // The chip reads it again in its card, beside the map, without its scene (#309); its button goes back to the trip
  // («Partir» at the first stop, «Continuar» at the others).
  await chip.click();
  await expect(page.locator('.pdio')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: first.title })).toBeVisible();
  await page.getByRole('button', { name: /^(Partir|Continuar)$/ }).click();
  await expect(page.getByRole('heading', { name: first.title })).toHaveCount(0);
  await controls.getByRole('button', { name: 'Próximo hito', exact: true }).click();

  // The second stop opens at its first sentence; «Atrás» goes back into the first, at its last sentence.
  await expect(panel.getByRole('heading', { name: second.title })).toBeVisible();
  await panel.getByRole('button', { name: 'Atrás' }).click();
  await expect(panel.getByRole('heading', { name: first.title })).toBeVisible();
  await expect(panel.locator('.poncho-line')).toContainText('los hombres instruyen a los perros');
  await expect(panel.locator('details.sheet-more')).toBeVisible();
  // From its last sentence the arrow goes forward into the second stop, which was already read: at its first sentence.
  await panel.getByRole('button', { name: 'Siguiente' }).click();
  await expect(panel.getByRole('heading', { name: second.title })).toBeVisible();
  await expect(panel.locator('.poncho-line .vfact')).toHaveCount(1);
});

// #309: the pin of a stop already told goes back into it whole, scene and panel (the chip of the bar shows its card).
test('the pin of a stop already told goes back into its scene', async ({ page }) => {
  test.setTimeout(120_000);
  const second = PONCHO_MILESTONES[1];
  await page.goto('/');
  await page.getByRole('button', { name: LIST_BUTTON_LABEL }).click();
  await page.getByRole('dialog', { name: 'Todos los puntos' }).getByRole('button', { name: /Poncho/ }).click();
  await page.getByRole('button', { name: /Comenzar/ }).click();
  const panel = page.locator('.poncho-panel');
  const bar = page.getByRole('group', { name: 'Controles del viaje' });
  // Two stops told, and the trip goes on past the second.
  for (let k = 0; k < 3; k++) {
    while (!(await panel.getByRole('button', { name: 'Seguir con Poncho' }).isVisible())) await panel.getByRole('button', { name: 'Siguiente' }).click();
    await panel.getByRole('button', { name: 'Seguir con Poncho' }).click();
    await expect(page.locator('.pdio')).toHaveCount(0);
    if (k < 2) await bar.getByRole('button', { name: 'Próximo hito', exact: true }).click();
  }
  // The pin may be out of the view of the map: it is a real button, pressed as a click on it.
  await page.getByRole('button', { name: `Hito: ${second.title}. Tocá para leerlo.` }).evaluate((el: HTMLElement) => el.click());
  await expect(page.locator('.pdio')).toHaveCount(1);
  await expect(panel.getByRole('heading', { name: second.title })).toBeVisible();
});

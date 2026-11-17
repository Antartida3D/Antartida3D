import { expect, test, type Page } from '@playwright/test';
import { clearStorage } from '../storage.ts';
import { mockOpenMeteo } from './weather-helpers.ts';
import { show3D } from './map-helpers.ts';
import { LIST_BUTTON_LABEL } from '../../core/src/content/points.ts';

let consoleErrors: string[] = [];

test.beforeEach(async ({ page }) => {
  consoleErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => consoleErrors.push(e.message));
  await mockOpenMeteo(page);
  await page.goto('/');
  await clearStorage(page);
  await page.reload();
});

test.afterEach(() => {
  expect(consoleErrors, 'console errors (hydration mismatches, exceptions)').toEqual([]);
});

const startTrip = async (page: Page, transport: RegExp) => {
  await page.getByRole('button', { name: LIST_BUTTON_LABEL }).click();
  // The button of the list, not the marker of the map behind it.
  await page.getByRole('dialog', { name: 'Todos los puntos' }).getByRole('button', { name: /Desde Ushuaia/ }).click();
  await page.getByRole('group', { name: 'Medio de transporte' }).getByRole('button', { name: transport }).click();
  await page.getByRole('button', { name: /^(Zarpar|Despegar)$/ }).click();
};

test('a quotation in a fact and the title of a source go between “ ” and in italics (#190)', async ({ page }) => {
  await page.getByRole('button', { name: LIST_BUTTON_LABEL }).click();
  await page.getByRole('dialog', { name: 'Todos los puntos' }).getByRole('button', { name: /Desde Ushuaia/ }).click();
  await page.getByRole('group', { name: 'Medio de transporte' }).getByRole('button', { name: /Irízar/ }).click();

  const quote = page.locator('.vfact em', { hasText: 'el buque insignia' });
  await expect(quote).toHaveText('“el buque insignia del Comando Conjunto Antártico”');
  await expect(quote).toHaveCSS('font-style', 'italic');
  await expect(page.locator('.vfacts')).not.toContainText(/[«»]/);

  await page.locator('.vfact', { hasText: 'el buque insignia' }).getByRole('button', { name: /^Fuente / }).click();
  const sources = page.getByRole('dialog', { name: 'Fuentes' });
  const title = sources.locator('[data-source-id="U4"] em');
  await expect(title).toHaveText('“La evolución del turismo antártico y su relación con las políticas públicas nacionales y provinciales”');
  await expect(title).toHaveCSS('font-style', 'italic');
  await expect(sources).not.toContainText(/[«»]/);
});

/**
 * Starts the trip from Ushuaia on a transport and goes to the card of Base Marambio, jumping from
 * milestone to milestone without opening any: they are optional (#157). Only the arrival opens.
 */
async function arriveAtMarambio(page: Page, transport: RegExp) {
  await startTrip(page, transport);
  return travelToMarambio(page);
}

/**
 * From wherever the trip is, goes to the card of Base Marambio. Step by step it jumps milestone by
 * milestone. With motion there is no jumping ahead (#190): holding «avanzar» goes all the way, and
 * only the arrival stops the trip.
 */
async function travelToMarambio(page: Page) {
  const arrival = page.getByRole('dialog', { name: 'Base Marambio' });
  const skip = page.getByRole('button', { name: 'Próximo hito', exact: true });
  const next = page.locator('.vnext strong');
  await expect(next).toBeVisible();
  const hold = page.getByRole('button', { name: 'Mantené para avanzar' });
  if (await hold.isVisible()) {
    await expect(skip).toHaveCount(0);
    await hold.hover();
    await page.mouse.down();
    await expect(arrival).toBeVisible({ timeout: 180_000 });
    await page.mouse.up();
    return arrival;
  }
  for (let i = 0; i < 12; i++) {
    if (await arrival.isVisible()) break;
    // A milestone passed by does not open its card.
    await expect(page.locator('section.sheet.voyage')).toHaveCount(0);
    const before = await next.textContent();
    await skip.click();
    // With motion the trip travels to the milestone, the bar in view: it is there once the next one changes.
    await expect(async () => {
      expect((await arrival.isVisible()) || (await next.textContent()) !== before).toBe(true);
    }).toPass({ timeout: 30_000 });
  }
  await expect(arrival).toBeVisible();
  return arrival;
}

test.describe('arrival at Base Marambio on the trip from Ushuaia', () => {
  // A ship opens eight milestones on its way: on a wide screen, without a GPU, the walk takes close to 30 s.
  test.describe.configure({ timeout: 90_000 });

  test('on the Irízar it asks how people and cargo reach the base, and tells it after the answer', async ({ page }) => {
    const card = await arriveAtMarambio(page, /Irízar/);
    const quiz = card.getByRole('group', { name: /¿Cómo pasan del Irízar a la base las personas y la carga\?/ });
    // On arrival the question is asked at once, without a button to open it.
    await expect(card.getByRole('button', { name: 'Responder una pregunta' })).toHaveCount(0);
    await expect(quiz.getByRole('button')).toHaveText(['Por un puente', 'En botes', 'En helicóptero']);
    await expect(card.getByText(/no respondiste ninguna de las 3/)).toBeVisible();
    // The notes answer the question: they wait for it.
    await expect(card.getByText(/un Sea King va y viene/)).toHaveCount(0);

    await quiz.getByRole('button', { name: 'En helicóptero' }).click();
    await expect(quiz.getByRole('status')).toHaveText('Correcto.');
    await expect(card.getByText(/un Sea King va y viene/)).toBeVisible();
    // Where the ship waits is a drawing, and the card says so.
    await expect(card.getByText(/frente a la isla es ilustrativo/)).toBeVisible();
    await expect(card.getByText(/respondiste 1 de 3 y acertaste 1/)).toBeVisible();
    // The helicopter hop is an animation of the 3D map: with reduced motion the card ends the trip at once.
    await expect(card.getByRole('button', { name: 'Terminar expedición' })).toBeVisible();
    await expect(card.getByRole('button', { name: 'Continuar' })).toHaveCount(0);
  });

  test('with motion, on the Irízar «Continuar» always plays the helicopter hop, which cannot be skipped', async ({ page }) => {
    // The trip travels to each milestone and the hop lasts 6 s: slow without a GPU.
    test.setTimeout(240_000);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.reload();
    await show3D(page);
    await expect(page.locator('canvas').first()).toBeVisible();

    const card = await arriveAtMarambio(page, /Irízar/);
    // Before the hop the card asks its question and has one way on: «Continuar». No summary yet.
    await expect(card.getByRole('group', { name: /¿Cómo pasan del Irízar a la base/ })).toBeVisible();
    await expect(card.locator('.sheet-actions').getByRole('button')).toHaveText(['Continuar']);
    await expect(card.getByText('Hitos del viaje')).toHaveCount(0);
    await expect(card.getByRole('button', { name: 'Continuar' })).toBeFocused();
    // Left unanswered: the hop shows the answer.
    await card.getByRole('button', { name: 'Continuar' }).click();

    // The card steps aside. The bar says what the hop is and that it is a drawing, with nothing to skip it.
    const bar = page.getByRole('group', { name: 'Del Irízar a la base' });
    await expect(bar.getByText(/Sea King lleva la carga y el personal/)).toBeVisible();
    await expect(bar.getByText(/La animación es ilustrativa/)).toBeVisible();
    // Its only button is the source of the fact.
    await expect(bar.getByRole('button')).toHaveText(['[18]']);
    await expect(card).toBeHidden();

    // The helicopter lands by itself and the card comes back: the notes tell the answer, and the summary is there.
    await expect(card).toBeVisible({ timeout: 90_000 });
    await expect(card.getByText(/un Sea King va y viene/)).toBeVisible();
    await expect(card.locator('fieldset')).toHaveCount(0);
    await expect(card.getByText('Hitos del viaje')).toBeVisible();
    await expect(card.getByRole('button', { name: 'Terminar expedición' })).toBeFocused();
    await expect(card.getByRole('button', { name: 'Continuar' })).toHaveCount(0);
  });

  test('on the Hércules it asks nothing: the plane lands on the runway of the base', async ({ page }) => {
    const card = await arriveAtMarambio(page, /Hércules/);
    await expect(card.locator('fieldset')).toHaveCount(0);
    await expect(card.getByText(/La pista mide 1\.200 m/)).toBeVisible();
    await expect(card.getByText(/frente a la isla/)).toHaveCount(0);
    await expect(card.getByText(/no respondiste ninguna de las 2/)).toBeVisible();
  });

  test('on the Puerto Argentino it asks nothing and owns up that where the ship waits is a drawing', async ({ page }) => {
    const card = await arriveAtMarambio(page, /Puerto Argentino/);
    await expect(card.locator('fieldset')).toHaveCount(0);
    await expect(card.getByText(/frente a la isla es ilustrativo/)).toBeVisible();
    await expect(card.getByText(/Sea King/)).toHaveCount(0);
    await expect(card.getByText(/no respondiste ninguna de las 2/)).toBeVisible();
  });
});

test.describe('optional milestones on the trip from Ushuaia (#157)', () => {
  test.describe.configure({ timeout: 90_000 });

  test('a milestone passed by is offered, opens only if touched, and its question too', async ({ page }) => {
    await startTrip(page, /Irízar/);
    // The departure is offered at once, closed: the trip sets off without a card.
    await expect(page.locator('section.sheet.voyage')).toHaveCount(0);
    const offer = page.getByRole('group', { name: 'Hito por el que pasás' });
    await offer.getByRole('button', { name: 'Leer el hito: Ushuaia y el Canal Beagle' }).click();
    const card = page.getByRole('dialog', { name: 'Ushuaia y el Canal Beagle' });
    await expect(card.getByRole('button', { name: 'Responder una pregunta' })).toBeVisible();
    // One way on: the card had two «Seguir viaje», and it tells all it has at once, with no «Saber más» (#190).
    await expect(card.locator('.sheet-actions').getByRole('button')).toHaveText(['Seguir viaje']);
    await card.getByRole('button', { name: 'Seguir viaje' }).click();
    await expect(card).toHaveCount(0);
    // Read once, it says so, and it can be read again.
    await expect(offer.getByRole('button', { name: 'Volver a leer el hito: Ushuaia y el Canal Beagle' })).toBeVisible();

    // Its question opens the card with the question shown.
    await offer.getByRole('button', { name: 'Responder la pregunta del hito: Ushuaia y el Canal Beagle' }).click();
    await expect(card.locator('fieldset.vquiz')).toBeVisible();
    await card.locator('fieldset.vquiz .btn').first().click();
    await card.getByRole('button', { name: 'Seguir viaje' }).click();
    // Answered, the question is no longer offered.
    await expect(offer.getByRole('button', { name: /Responder la pregunta/ })).toHaveCount(0);

    await page.getByRole('button', { name: 'Próximo hito', exact: true }).click();
    await expect(offer.getByRole('button', { name: /^Leer el hito: / })).toBeVisible();
  });

  test('on arrival it lists the milestones opened and the ones not, and every one opens from there', async ({ page }) => {
    await startTrip(page, /Hércules/);
    await page.getByRole('group', { name: 'Hito por el que pasás' }).getByRole('button', { name: /^Leer el hito: / }).click();
    await page.getByRole('button', { name: 'Seguir viaje' }).click();
    const card = await travelToMarambio(page);
    const log = card.locator('.vnotebook').filter({ hasText: 'Hitos del viaje' });
    await expect(log).toContainText(/abriste 1 de \d+/);
    // Every milestone of the list has the pin of the map beside its name (#233).
    await expect(log.locator('.vnote .vpinicon')).toHaveCount(await log.locator('.vnote').count());
    await expect(log.getByRole('button', { name: /, abierto\./ })).toHaveCount(1);
    const missed = log.getByRole('button', { name: /, sin abrir\./ });
    await expect(missed.first()).toBeVisible();
    const before = await missed.count();

    // A milestone not opened opens from the list, and closing it goes back to the arrival.
    await missed.first().click();
    await page.getByRole('button', { name: 'Volver a la llegada' }).click();
    await expect(card).toBeVisible();
    await expect(log.getByRole('button', { name: /, sin abrir\./ })).toHaveCount(before - 1);
    await expect(log).toContainText(/abriste 2 de \d+/);
  });
});

import { expect, test, type Page } from '@playwright/test';
import { ORCADAS_GUIDING_QUESTION } from '../../core/src/content/orcadas.ts';
import { clickOrcadasMarker } from './orcadas-helpers.ts';
import { show3D } from './map-helpers.ts';

type ArrivalState = { arrival: 'ship' | 'helicopter'; done: boolean };

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

const intro = (page: Page) => page.getByRole('dialog', { name: 'Estación Orcadas' });

/** Opens the Orcadas intro on the 3D relief map. */
async function openIntro3D(page: Page) {
  await page.goto('/');
  await show3D(page);
  await page.waitForFunction(() => (window as any).__cameraControls);
  const marker = page.locator('.ov [data-key*="orcadas"] button');
  await expect(marker).toBeVisible();
  await marker.click();
  const orcadasBtn = page.getByRole('button', { name: /Estación Orcadas.*Expedición disponible/ });
  if (!(await intro(page).isVisible()) && (await orcadasBtn.isVisible())) await orcadasBtn.click();
  await expect(intro(page)).toBeVisible();
}

const arrivalState = (page: Page) =>
  page.evaluate(() => (window as unknown as { __orcadasArrival?: ArrivalState }).__orcadasArrival ?? null);

test('the arrival picker is chosen with the keyboard and keeps focus inside the intro', async ({ page }) => {
  await page.goto('/');
  await clickOrcadasMarker(page);
  const sheet = intro(page);
  await expect(sheet).toBeVisible();
  const group = sheet.getByRole('group', { name: 'Cómo llegar a Orcadas' });
  const ship = group.getByRole('button', { name: /Irízar y Zodiac/ });
  const heli = group.getByRole('button', { name: /Helicóptero/ });
  await expect(ship).toHaveAttribute('aria-pressed', 'true');
  await expect(heli).toHaveAttribute('aria-pressed', 'false');
  await expect(sheet.getByText(/La expedición arranca en (noviembre|diciembre|enero|febrero|marzo)/)).toBeVisible();

  await heli.focus();
  await page.keyboard.press('Enter');
  await expect(heli).toHaveAttribute('aria-pressed', 'true');
  await expect(ship).toHaveAttribute('aria-pressed', 'false');
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Enter');
  await expect(ship).toHaveAttribute('aria-pressed', 'true');

  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    expect(
      await page.evaluate(() => Boolean(document.activeElement?.closest('[aria-labelledby="orcadas-intro-title"]')))
    ).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(sheet).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Estación Orcadas, Islas Orcadas del Sur/ })).toBeFocused();
});

test('with reduced motion the expedition starts directly with the chosen transport already in place', async ({
  page,
}) => {
  await openIntro3D(page);
  await intro(page).getByRole('button', { name: /Helicóptero/ }).click();
  await intro(page).getByRole('button', { name: 'Comenzar expedición' }).click();
  await expect(page.getByRole('button', { name: 'Saltar viaje' })).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 2, name: ORCADAS_GUIDING_QUESTION })).toBeVisible({ timeout: 10000 });
  await page.waitForFunction(() => (window as any).__orcadasReady === true);
  expect(await arrivalState(page)).toEqual({ arrival: 'helicopter', done: true });
});

for (const [arrival, label] of [
  ['ship', /Irízar y Zodiac/],
  ['helicopter', /Helicóptero/],
] as const) {
  test(`the ${arrival} trip plays on the map, can be skipped, and lands in the diorama`, async ({ page }) => {
    test.setTimeout(90000);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await openIntro3D(page);
    await intro(page).getByRole('button', { name: label }).click();
    await intro(page).getByRole('button', { name: 'Comenzar expedición' }).click();

    const skip = page.getByRole('button', { name: 'Saltar viaje' });
    await expect(skip).toBeVisible();
    await skip.focus();
    await page.keyboard.press('Enter');
    await expect(skip).toHaveCount(0);

    await expect(page.getByRole('heading', { level: 2, name: ORCADAS_GUIDING_QUESTION })).toBeVisible({
      timeout: 20000,
    });
    await page.waitForFunction(() => (window as any).__orcadasReady === true);
    await page.waitForFunction(
      (id) => {
        const s = (window as unknown as { __orcadasArrival?: ArrivalState }).__orcadasArrival;
        return s?.arrival === id && s.done;
      },
      arrival,
      { timeout: 20000 }
    );
  });
}

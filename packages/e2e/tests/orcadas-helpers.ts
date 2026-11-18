import { expect, type Page } from '@playwright/test';
import { ORCADAS_GUIDING_QUESTION } from '../../core/src/content/orcadas.ts';

/** Clicks the Estación Orcadas marker on the map. */
export async function clickOrcadasMarker(page: Page) {
  const marker = page.getByRole('button', { name: /^Estación Orcadas, Islas Orcadas del Sur/ });
  // The 3D map shows its markers once the loading screen closes. If the camera left the islands out
  // of view (for example after the window shrank), show the whole continent.
  if (!(await marker.waitFor({ timeout: 15_000 }).then(() => true, () => false))) {
    await page.getByRole('button', { name: 'Ver todo el continente' }).click();
    await marker.waitFor();
  }
  await marker.click();
}

/** Confirms the Estación Orcadas intro modal and waits until the expedition scene is ready. */
export async function startOrcadasFromIntro(page: Page) {
  await page
    .getByRole('dialog', { name: 'Estación Orcadas' })
    .getByRole('button', { name: 'Comenzar expedición' })
    .click();
  await expect(page.getByRole('heading', { level: 2, name: ORCADAS_GUIDING_QUESTION })).toBeVisible();
  await page.waitForFunction(
    () => (window as unknown as { __orcadasReady?: boolean }).__orcadasReady === true
  );
}

/** Opens Estación Orcadas from the map marker through the intro modal and waits for the scene. */
export async function openOrcadasFromMap(page: Page) {
  await clickOrcadasMarker(page);
  await startOrcadasFromIntro(page);
}

/**
 * Goes to a chapter of Orcadas. Where the chapters are shown (a wide screen or a phone on its side) it
 * taps the chapter; on an upright phone the chapters are hidden (#297), so it walks the panel's main button.
 */
export async function gotoOrcadasChapter(page: Page, name: RegExp) {
  const nav = page.getByRole('navigation', { name: 'Capítulos de la expedición' });
  if (await nav.isVisible()) {
    await nav.getByRole('button', { name }).click();
    return;
  }
  const kicker = page.locator('.orc-kicker').first();
  for (let i = 0; i < 40; i++) {
    if (name.test((await kicker.innerText()).split('·').pop() ?? '')) return;
    await page.locator('.sheet-actions .btn.primary').click();
  }
  throw new Error(`Chapter ${name} not reached`);
}

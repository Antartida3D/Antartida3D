import { expect, type Page } from '@playwright/test';
import { ORCADAS_GUIDING_QUESTION } from '../../core/src/content/orcadas.ts';

/** Clicks the Estación Orcadas marker on the map, expanding its cluster first if needed. */
export async function clickOrcadasMarker(page: Page) {
  const cluster = page.getByRole('button', { name: /Grupo de .*Estación Orcadas/ });
  if (await cluster.isVisible()) await cluster.click();
  await page.getByRole('button', { name: /^Estación Orcadas, Islas Orcadas del Sur/ }).click();
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

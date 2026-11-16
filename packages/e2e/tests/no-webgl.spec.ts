import { expect, test } from '@playwright/test';
import { ORCADAS_GUIDING_QUESTION } from '../../core/src/content/orcadas.ts';
import { mockOpenMeteo } from './weather-helpers.ts';

let consoleErrors: string[] = [];

test.beforeEach(async ({ page }) => {
  consoleErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => consoleErrors.push(e.message));
  await mockOpenMeteo(page);
});

test.afterEach(() => {
  expect(consoleErrors, 'console errors (hydration mismatches, exceptions)').toEqual([]);
});

test('without WebGL the app falls back cleanly to 2D and «Relieve 3D» says how to turn it on (#123)', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      return /webgl/.test(type) ? null : (original as (...a: unknown[]) => unknown).call(this, type, ...rest);
    } as typeof original;
  });

  await page.goto('/');

  // The toggle stays: «Relieve 3D» is marked as off and explains how to turn it on (#123).
  const toggle = page.getByRole('group', { name: 'Modo de vista' });
  await expect(toggle).toBeVisible();
  await expect(toggle.getByRole('button', { name: 'Mapa 2D' })).toHaveAttribute('aria-pressed', 'true');
  const off = toggle.getByRole('button', { name: 'Relieve 3D apagado: ver cómo activarlo' });
  await expect(off).toHaveText('Relieve 3D · apagado');
  await expect(off).toHaveAttribute('aria-expanded', 'false');

  const note = page.getByRole('dialog', { name: 'El relieve 3D está apagado en este navegador' });
  await off.click();
  await expect(note).toBeVisible();
  await expect(note).toContainText('aceleración por hardware');
  // What the browser's settings say is a quotation: “ ” and italics (#190).
  await expect(note.locator('em').first()).toHaveText('“aceleración por hardware”');
  await expect(off).toHaveAttribute('aria-expanded', 'true');
  // Escape closes it and focus goes back to the button.
  await page.keyboard.press('Escape');
  await expect(note).toHaveCount(0);
  await expect(off).toBeFocused();
  // «Entendido» closes it too; the map stays in 2D.
  await off.click();
  await note.getByRole('button', { name: 'Entendido' }).click();
  await expect(note).toHaveCount(0);
  await expect(toggle.getByRole('button', { name: 'Mapa 2D' })).toHaveAttribute('aria-pressed', 'true');

  // 2D layer should be present, and NO canvas
  await expect(page.locator('.layer')).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);

  // Flow still works: opening an expedition shows its fallback scene without WebGL
  await page.getByRole('button', { name: 'Ver como lista' }).click();
  const dialog = page.getByRole('dialog', { name: 'Todos los puntos' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: /Estación Orcadas/ }).click();
  await page.getByRole('dialog', { name: 'Estación Orcadas' }).getByRole('button', { name: 'Comenzar expedición' }).click();
  await expect(page.getByRole('heading', { level: 2, name: ORCADAS_GUIDING_QUESTION })).toBeVisible();
});

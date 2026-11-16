import { expect, test, type Page } from '@playwright/test';
import { AVAILABLE_COUNT } from '../../core/src/content/points.ts';

let errors: string[] = [];
test.beforeEach(async ({ page }) => {
  errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
});
test.afterEach(() => expect(errors).toEqual([]));

async function open(page: Page) {
  await page.goto('/?expedicion=fosiles');
  await expect(page.getByRole('heading', { name: 'Las rocas recuerdan' })).toBeVisible();
}

test('explores the four fossils and three habitats, opens sources and records completion', async ({ page }) => {
  await open(page);
  const chapters = page.getByRole('navigation', { name: 'Capítulos de Fósiles' });
  // The geological time line lights each find as its chapter is reached.
  const timeline = page.locator('.fossil-timeline');
  await expect(timeline).toContainText('0 de 4 hallazgos');
  await expect(timeline).toContainText('Amonites: Cretácico tardío, por descubrir.');
  await expect(page.locator('.fossil-stage canvas')).toBeVisible();
  await expect(page.locator('.fossil-stage canvas')).toHaveAttribute('data-ready', 'true');
  await chapters.getByRole('button', { name: /Amonites/ }).click();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Limpiar el sedimento' }).click();
  await expect(page.getByRole('button', { name: 'Ya se ve la espiral' })).toBeDisabled();
  await page.getByRole('button', { name: /Seguir explorando/ }).click();
  await expect(page.getByRole('heading', { name: 'Amonites gigantes', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Abrir fotografía: Corte pulido/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('img')).toHaveAttribute('alt', /amonite cortado/i);
  await expect(dialog).toContainText('Archivo E. B. Olivero');
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();

  await expect(timeline).toContainText('1 de 4 hallazgos');
  await expect(timeline).toContainText('Amonites: Cretácico tardío, encontrado, en este capítulo.');
  await chapters.getByRole('button', { name: /Plesiosaurio/ }).click();
  await page.getByRole('button', { name: 'Seguir la columna' }).click();
  await expect(page.getByRole('button', { name: 'Siguiendo la columna' })).toHaveAttribute('aria-pressed', 'true');

  await chapters.getByRole('button', { name: /Dinosaurio/ }).click();
  // The tooth is examined on its own stop, not on the find before it.
  await expect(page.getByRole('heading', { name: 'Algo asomaba de la roca' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Examinar el diente' })).toHaveCount(0);
  // The note with the anecdote of 1986 opens from this stop, with its credit, and closes with Escape.
  await page.getByRole('button', { name: 'Abrir nota: El desvío de 1986' }).click();
  const note = page.getByRole('dialog', { name: 'El desvío de 1986' });
  await expect(note).toContainText('veo un pedacito de huesos saliendo de una roca');
  await expect(note).toContainText('Las frases entre comillas son textuales');
  // What he said goes between “ ” and in italics (#190).
  const said = note.locator('em', { hasText: 'Lo ocultamos' });
  await expect(said).toHaveText('“Lo ocultamos hasta tenerlo publicado.”');
  await expect(said).toHaveCSS('font-style', 'italic');
  await expect(note).not.toContainText(/[«»]/);
  await expect(note.getByRole('link', { name: /Eduardo Olivero cuenta el hallazgo/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(note).not.toBeVisible();
  await page.locator('.fossil-next').click();
  await expect(page.getByRole('heading', { name: 'Una pista muy pequeña' })).toBeVisible();
  await page.getByRole('button', { name: 'Examinar el diente' }).click();
  await expect(page.getByRole('button', { name: 'El diente, más cerca' })).toHaveAttribute('aria-pressed', 'true');
  for (let i = 0; i < 2; i++) await page.getByRole('button', { name: /Seguir explorando/ }).click();
  // Arriving, the animal is already shown, as on the other animals' stops; the button compares with the remains.
  await expect(page.getByRole('heading', { name: 'De los restos al animal' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ver los restos' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Ver los restos' }).click();
  await expect(page.getByRole('button', { name: 'Ver el animal completo' })).toHaveAttribute('aria-pressed', 'false');

  await page.getByRole('button', { name: /Seguir a Estrellas/ }).click();
  await expect(timeline).toContainText('4 de 4 hallazgos');
  await expect(timeline).toContainText('Estrellas de mar: Eoceno medio tardío, encontrado');
  await page.getByRole('button', { name: 'Medir una estrella' }).click();
  await expect(page.getByRole('button', { name: 'Estrella medida' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('status').filter({ hasText: '17 mm' })).toBeVisible();
  await page.getByRole('button', { name: /Seguir explorando/ }).click();
  await page.getByRole('button', { name: /Seguir a El pasado/ }).click();
  for (const habitat of [/La tierra del dinosaurio/, /El fondo de las estrellas/, /El mar de los amonites/]) {
    await page.getByRole('button', { name: habitat }).click();
    await expect(page.getByRole('button', { name: habitat })).toHaveAttribute('aria-pressed', 'true');
  }
  await page.getByRole('button', { name: /Abrir fotografía: Bosque actual/ }).click();
  await expect(dialog).toContainText('no la Antártida del pasado');
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Fuentes', exact: true }).click();
  await expect(dialog).toContainText('Consultado: 14/11/2026');
  await expect(dialog).toContainText('López Cabrera');
  await expect(dialog).toContainText('Raffi');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Fuentes', exact: true })).toBeFocused();
  await page.getByRole('button', { name: /Seguir explorando/ }).click();
  const log = page.getByRole('list', { name: 'Tu registro de la expedición' });
  await expect(log).toContainText('Seguiste la columna');
  await expect(log).toContainText('Observaste el diente');
  await expect(log).toContainText('Mediste una estrella');
  await page.getByRole('button', { name: 'Terminar expedición' }).click();
  await expect(page.locator('.reg')).toContainText(`1/${AVAILABLE_COUNT}`);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('antartida:explored') ?? '[]'))).toContain('fosiles');
});

test('the entire tour works with keyboard and without WebGL', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind: string, ...args: unknown[]) {
      return /webgl/.test(kind) ? null : (original as (...args: unknown[]) => unknown).call(this, kind, ...args);
    } as typeof original;
  });
  await open(page);
  await expect(page.locator('.fossil-fallback')).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
  for (let i = 0; i < 13; i++) {
    await expect(page.locator('#fossil-title')).toBeFocused();
    await page.locator('.fossil-next').focus();
    await page.keyboard.press('Enter');
  }
  await expect(page.getByRole('list', { name: 'Tu registro de la expedición' })).toContainText('14 de 14');
  await page.getByRole('button', { name: 'Terminar expedición' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.reg')).toContainText(`1/${AVAILABLE_COUNT}`);
});

test('fits the screen and the phone panel can expand and return to peek', async ({ page, isMobile }) => {
  await open(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (isMobile) {
    const handle = page.locator('.fossil-panel .sheet-handle');
    await handle.focus();
    await page.keyboard.press('Enter');
    await expect(handle).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Enter');
    await expect(handle).toHaveAttribute('aria-expanded', 'false');
  }
  await page.getByRole('button', { name: 'Volver al mapa' }).click();
  await expect(page.locator('.reg')).toContainText(`0/${AVAILABLE_COUNT}`);
});

test('on the 2D map Fósiles and Base Marambio stay in one group, and tapping it lets you pick Fósiles', async ({ page }) => {
  await page.goto('/');
  const toggle = page.getByRole('group', { name: 'Modo de vista' });
  await toggle.getByRole('button', { name: 'Mapa 2D' }).click();
  await expect(toggle.getByRole('button', { name: 'Mapa 2D' })).toHaveAttribute('aria-pressed', 'true');
  // Closer each tap, until the group is only the two of them and zooming no longer separates them.
  const group = page.locator('.vp .mk.cluster[aria-label*="Fósiles"]');
  for (let i = 0; i < 6; i++) {
    await expect(group).toHaveCount(1);
    const label = (await group.getAttribute('aria-label')) ?? '';
    if (label.includes('Tocá para elegir uno.')) break;
    await group.click();
    await expect(group).not.toHaveAttribute('aria-label', label);
  }
  // Two points on a wide screen; on a phone Poncho (Base Esperanza) stays with them too.
  await expect(group).toHaveAttribute('aria-label', /^Grupo de [23] puntos: Base Marambio, Fósiles(, Poncho)?\. Tocá para elegir uno\.$/);
  await group.click();
  const picker = page.getByRole('dialog', { name: 'Puntos en este lugar' });
  await expect(picker.getByRole('button', { name: /Base Marambio/ })).toBeVisible();
  // A small window over the map, not a whole screen: the map stays in view around it.
  const box = (await picker.boundingBox())!;
  expect(box.height).toBeLessThan(page.viewportSize()!.height * 0.8);
  // The browser «back» closes the window and stays on the map (#185); the group opens it again.
  await page.goBack();
  await expect(picker).toBeHidden();
  await expect(page.getByRole('button', { name: 'Ver como lista' })).toBeVisible();
  await group.click();
  await expect(picker).toBeVisible();
  await picker.getByRole('button', { name: /Fósiles/ }).click();
  await expect(page.getByRole('region', { name: 'Expedición Fósiles' })).toBeVisible();
});

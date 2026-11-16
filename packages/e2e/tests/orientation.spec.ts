import { expect, test } from '@playwright/test';
import { FOSSIL_STOPS } from '../../core/src/content/fossils.ts';
import { MARAMBIO_SPOTS } from '../../core/src/content/marambio.ts';
import { MARINE_STOPS } from '../../core/src/content/marine.ts';
import { PONCHO_MILESTONES } from '../../core/src/content/poncho.ts';
import { MILESTONES } from '../../core/src/content/ushuaia.ts';
import { CHAPTERS } from '../../core/src/orcadas.ts';

const PLANE_MILESTONES = MILESTONES.filter((m) => m.kinds.includes('plane'));

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

test.describe('3D header at 844x390', () => {
  test.use({ viewport: { width: 844, height: 390 } });

  test('in 3D relief at 844x390 the Orcadas marker center is not intercepted by header.top .brand', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('group', { name: 'Modo de vista' }).getByRole('button', { name: 'Relieve 3D' }).click();
    await page.waitForFunction(() => (window as unknown as { __cameraControls?: unknown }).__cameraControls);

    const clusterOrMarker = page.locator('.ov [data-key*="orcadas"] button');
    await expect(clusterOrMarker).toBeVisible();
    await clusterOrMarker.click();

    const orcadasBtn = page.getByRole('button', { name: /Estación Orcadas.*Expedición disponible/ });
    await expect(orcadasBtn).toBeVisible();
    // Wait for zoom transition to settle before measuring boundingBox.
    await page.waitForTimeout(600);

    const box = await orcadasBtn.boundingBox();
    expect(box).not.toBeNull();
    const cx = box!.x + box!.width / 2;
    const cy = box!.y + box!.height / 2;

    const hit = await page.evaluate(
      ({ x, y }) => {
        const el = document.elementFromPoint(x, y);
        return {
          inBrand: Boolean(el?.closest('header.top .brand')),
          inMarker: Boolean(el?.closest('[data-key*="orcadas"] button')),
        };
      },
      { x: cx, y: cy }
    );

    expect(hit.inBrand).toBe(false);
    expect(hit.inMarker).toBe(true);
  });
});

test.describe('resume last expedition', () => {
  test('resumes Marambio at exact spot, reloads, and clears on completion', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Ver como lista' }).click();
    await page.getByRole('dialog', { name: 'Todos los puntos' }).getByRole('button', { name: /Base Marambio/ }).click();

    const section = page.getByRole('region', { name: 'Expedición Base Marambio' });
    await expect(section).toBeVisible();

    const nextBtn = section.getByRole('button', { name: 'Siguiente' });
    await nextBtn.click();
    await nextBtn.click();
    await expect(section).toContainText(`Punto 3 de ${MARAMBIO_SPOTS.length}`);

    await section.getByRole('button', { name: 'Volver al mapa' }).click();
    await expect(page.getByRole('button', { name: 'Ver como lista' })).toBeVisible();

    const resumeBtn = page.getByRole('button', {
      name: `Continuar: Base Marambio · punto 3 de ${MARAMBIO_SPOTS.length}`,
    });
    await expect(resumeBtn).toBeVisible();

    await page.reload();
    await expect(resumeBtn).toBeVisible();
    await resumeBtn.click();

    await expect(section).toBeVisible();
    await expect(section).toContainText(`Punto 3 de ${MARAMBIO_SPOTS.length}`);

    const primary = section.locator('.ebar .btn.primary');
    for (let i = 2; i < MARAMBIO_SPOTS.length; i++) {
      await primary.click();
    }

    await expect(page.getByRole('button', { name: 'Ver como lista' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Continuar:/ })).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('antartida:last'))).toBeNull();
  });

  test('resumes Fósiles at exact stop after reload', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Ver como lista' }).click();
    await page.getByRole('dialog', { name: 'Todos los puntos' }).getByRole('button', { name: /Fósiles/ }).click();

    const section = page.getByRole('region', { name: 'Expedición Fósiles' });
    await expect(section).toBeVisible();

    const nextBtn = section.locator('.fossil-next');
    await nextBtn.click();
    await nextBtn.click();
    await expect(section).toContainText(`parada 3 de ${FOSSIL_STOPS.length}`);

    await section.getByRole('button', { name: 'Volver al mapa' }).click();
    const resumeBtn = page.getByRole('button', {
      name: `Continuar: Fósiles · parada 3 de ${FOSSIL_STOPS.length}`,
    });
    await expect(resumeBtn).toBeVisible();

    await page.reload();
    await expect(resumeBtn).toBeVisible();
    await resumeBtn.click();

    await expect(section).toBeVisible();
    await expect(section).toContainText(`parada 3 de ${FOSSIL_STOPS.length}`);
  });

  test('resumes Orcadas at exact chapter after reload', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Ver como lista' }).click();
    await page.getByRole('dialog', { name: 'Todos los puntos' }).getByRole('button', { name: /Estación Orcadas/ }).click();
    await page.getByRole('button', { name: 'Comenzar' }).click();

    const section = page.getByRole('region', { name: 'Expedición Estación Orcadas' });
    await expect(section).toBeVisible();

    const chaptersNav = section.getByRole('navigation', { name: 'Capítulos de la expedición' });
    await chaptersNav.getByRole('button').nth(1).click();
    await expect(chaptersNav.getByRole('button').nth(1)).toHaveAttribute('aria-current', 'step');

    await section.getByRole('button', { name: 'Volver al mapa' }).click();
    const resumeBtn = page.getByRole('button', {
      name: `Continuar: Estación Orcadas · capítulo 2 de ${CHAPTERS.length}`,
    });
    await expect(resumeBtn).toBeVisible();

    await page.reload();
    await expect(resumeBtn).toBeVisible();
    await resumeBtn.click();

    await expect(section).toBeVisible();
    await expect(chaptersNav.getByRole('button').nth(1)).toHaveAttribute('aria-current', 'step');
  });

  test('resumes Océano at exact stop after reload', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Ver como lista' }).click();
    await page.getByRole('dialog', { name: 'Todos los puntos' }).getByRole('button', { name: /Océano/ }).click();

    const section = page.getByRole('region', { name: 'Expedición Océano' });
    await expect(section).toBeVisible();

    const nextBtn = section.locator('.marine-next');
    await nextBtn.click();
    await nextBtn.click();
    await expect(section).toContainText(`parada 3 de ${MARINE_STOPS.length}`);

    await section.getByRole('button', { name: 'Volver al mapa' }).click();
    const resumeBtn = page.getByRole('button', {
      name: `Continuar: Océano · parada 3 de ${MARINE_STOPS.length}`,
    });
    await expect(resumeBtn).toBeVisible();

    await page.reload();
    await expect(resumeBtn).toBeVisible();
    await resumeBtn.click();

    await expect(section).toBeVisible();
    await expect(section).toContainText(`parada 3 de ${MARINE_STOPS.length}`);
    await expect(section.getByRole('heading', { level: 2, name: MARINE_STOPS[2].title })).toBeVisible();
  });

  test('resumes Desde Ushuaia at exact milestone with same transport after reload', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Ver como lista' }).click();
    await page.getByRole('dialog', { name: 'Todos los puntos' }).getByRole('button', { name: /Desde Ushuaia/ }).click();
    await page.getByRole('group', { name: 'Medio de transporte' }).getByRole('button', { name: /Hércules/ }).click();
    await page.getByRole('button', { name: 'Despegar' }).click();

    const controls = page.getByRole('group', { name: 'Controles del viaje' });
    await expect(controls).toBeVisible();
    await controls.getByRole('button', { name: 'Próximo hito', exact: true }).click();
    await expect(controls.locator('.vnext strong')).toHaveText(PLANE_MILESTONES[2].title);
    await expect(controls.locator('.vtrip')).toContainText('de vuelo');

    await page.getByRole('button', { name: 'Salir del viaje' }).click();
    const resumeBtn = page.getByRole('button', {
      name: `Continuar: Desde Ushuaia · hito 2 de ${PLANE_MILESTONES.length}`,
    });
    await expect(resumeBtn).toBeVisible();

    await page.reload();
    await expect(resumeBtn).toBeVisible();
    await resumeBtn.click();

    await expect(page.getByRole('group', { name: 'Medio de transporte' })).toHaveCount(0);
    await expect(controls).toBeVisible();
    await expect(controls.locator('.vnext strong')).toHaveText(PLANE_MILESTONES[2].title);
    await expect(controls.locator('.vtrip')).toContainText('de vuelo');
    await expect(
      controls.getByRole('button', { name: `Leer el hito: ${PLANE_MILESTONES[1].title}` })
    ).toBeVisible();
  });

  test('resumes Poncho at exact milestone after reload', async ({ page }) => {
    // It reloads the page and reads two stops on a software renderer: it takes more than the default 30 s.
    test.setTimeout(90_000);
    await page.goto('/');
    await page.getByRole('button', { name: 'Ver como lista' }).click();
    await page.getByRole('dialog', { name: 'Todos los puntos' }).getByRole('button', { name: /Poncho/ }).click();
    await page.getByRole('button', { name: 'Comenzar' }).click();

    const closeCard = async () => {
      const dialog = page.locator('.poncho-panel, section.sheet.voyage');
      await expect(dialog).toBeVisible();
      const nextSentence = dialog.getByRole('button', { name: 'Siguiente' });
      while (await nextSentence.isVisible()) {
        await nextSentence.click();
      }
      await dialog.getByRole('button', { name: /^(Partir|Continuar|Seguir con Poncho)$/ }).click();
      await expect(dialog).toHaveCount(0);
    };

    await closeCard();
    const controls = page.getByRole('group', { name: 'Controles del viaje' });
    await expect(controls).toBeVisible();
    await controls.getByRole('button', { name: 'Próximo hito', exact: true }).click();
    await closeCard();

    await expect(controls).toBeVisible();
    await expect(controls.locator('.vtrip')).toHaveText(`2 de ${PONCHO_MILESTONES.length} hitos de su historia`);

    await page.getByRole('button', { name: 'Salir del viaje' }).click();
    const resumeBtn = page.getByRole('button', {
      name: `Continuar: Poncho · hito 2 de ${PONCHO_MILESTONES.length}`,
    });
    await expect(resumeBtn).toBeVisible();

    await page.reload();
    await expect(resumeBtn).toBeVisible();
    await resumeBtn.click();

    await expect(page.getByRole('heading', { name: 'Poncho, perro polar argentino' })).toHaveCount(0);
    await expect(page.locator('section.sheet.voyage')).toHaveCount(0);
    await expect(controls).toBeVisible();
    await expect(controls.locator('.vtrip')).toHaveText(`2 de ${PONCHO_MILESTONES.length} hitos de su historia`);
    await expect(controls.locator('.vnext strong')).toHaveText(PONCHO_MILESTONES[2].title);
  });

  test('resumes Desde Ushuaia without WebGL (2D step-by-step)', async ({ page }) => {
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
        return /webgl/.test(type) ? null : (original as (...a: unknown[]) => unknown).call(this, type, ...rest);
      } as typeof original;
    });

    await page.goto('/');
    await page.getByRole('button', { name: 'Ver como lista' }).click();
    await page.getByRole('dialog', { name: 'Todos los puntos' }).getByRole('button', { name: /Desde Ushuaia/ }).click();
    await page.getByRole('group', { name: 'Medio de transporte' }).getByRole('button', { name: /Hércules/ }).click();
    await page.getByRole('button', { name: 'Despegar' }).click();

    const controls = page.getByRole('group', { name: 'Controles del viaje' });
    await controls.getByRole('button', { name: 'Próximo hito', exact: true }).click();
    await page.getByRole('button', { name: 'Salir del viaje' }).click();

    const resumeBtn = page.getByRole('button', {
      name: `Continuar: Desde Ushuaia · hito 2 de ${PLANE_MILESTONES.length}`,
    });
    await expect(resumeBtn).toBeVisible();
    await page.reload();
    await expect(resumeBtn).toBeVisible();
    await resumeBtn.click();

    await expect(page.locator('canvas')).toHaveCount(0);
    await expect(controls).toBeVisible();
    await expect(controls.locator('.vnext strong')).toHaveText(PLANE_MILESTONES[2].title);
    await expect(controls.locator('.vtrip')).toContainText('de vuelo');
  });

  test('does not log console errors when localStorage throws', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new Error('blocked');
        },
      });
    });
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Ver como lista' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Continuar:/ })).toHaveCount(0);
  });
});

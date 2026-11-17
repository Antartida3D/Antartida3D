import { expect, test, type Page } from '@playwright/test';
import { EXPLORED_KEY, INTRO_KEY, LAST_EXPEDITION_KEY, VIEW_MODE_KEY } from '@antartida/core/storage';
import { mockOpenMeteo } from './weather-helpers.ts';

// A real first visit (#256, #258): no saved state, unlike other specs (see playwright.config.ts).
test.use({ storageState: { cookies: [], origins: [] } });

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
  expect(consoleErrors, 'console errors').toEqual([]);
});

const VOYAGE_ID = 'campana';
const LOAD_WAIT = 30_000;
const loader = (page: Page) => page.locator('.ld');
const guide = (page: Page) => page.locator('.guidecard');
const exploreBtn = (page: Page) => page.getByRole('button', { name: /Exploración guiada/ });
const pin = (page: Page, id = VOYAGE_ID) => page.locator(`.vp [data-key="${id}"] .mk`);
const seen = (page: Page) => page.evaluate((k) => localStorage.getItem(k), INTRO_KEY);
const insideGuide = (page: Page) => page.evaluate(() => !!document.activeElement?.closest('.guidecard'));
const NARROW_PX = 820;

/** First visit up to the «Mapa listo» card. */
async function readyCard(page: Page) {
  await page.goto('/');
  await expect(exploreBtn(page)).toBeVisible({ timeout: LOAD_WAIT });
}

/** «Explorar el mapa»: the guide at step 1. */
async function openGuide(page: Page) {
  await readyCard(page);
  await exploreBtn(page).click();
  await expect(guide(page)).toBeVisible();
  await expect(guide(page).locator('.guide-kicker')).toContainText('1 de');
}

/** The back-button entry of a closed layer is dropped by a `back`: a reload while it is pending aborts. */
const historySettled = (page: Page) => page.waitForFunction(() => !(history.state as { antartida?: number } | null)?.antartida);

async function nextStep(page: Page) {
  await guide(page).getByRole('button', { name: 'Siguiente', exact: true }).click();
}

test('ready card: the loader card waits for the person and puts the focus on «Exploración guiada» (#258, #276)', async ({ page }) => {
  await readyCard(page);
  await expect(loader(page).locator('.ld-status')).toHaveCount(0);
  await expect(loader(page).getByText('Mapa listo')).toHaveCount(0);
  await expect(loader(page).getByRole('heading', { level: 1 })).toHaveText('Desplegando la carta austral');
  await expect(loader(page).getByRole('heading', { name: 'Un mapa para recorrer la Antártida desde adentro' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sin guía' })).toBeVisible();
  await expect(exploreBtn(page)).toBeFocused();
  // It does not close by itself.
  await page.waitForTimeout(2_000);
  await expect(loader(page)).toBeVisible();
  expect(await seen(page)).toBeNull();
});

for (const way of ['button', 'escape'] as const) {
  test(`«Sin guía» (${way}) closes the loader, saves the visit and leaves the overview; it does not come back (#258)`, async ({ page }) => {
    await readyCard(page);
    if (way === 'button') await page.getByRole('button', { name: 'Sin guía' }).click();
    else await page.keyboard.press('Escape');
    await expect(loader(page)).toHaveCount(0);
    await expect(guide(page)).toHaveCount(0);
    expect(await seen(page)).toBe('1');
    await expect(page.locator('.hint')).toBeVisible();

    await page.reload();
    // Later visits: no «Mapa listo» and no guide; the loader goes by itself.
    await expect(loader(page)).toHaveCount(0, { timeout: LOAD_WAIT });
    await expect(guide(page)).toHaveCount(0);
    await expect(exploreBtn(page)).toHaveCount(0);
  });
}

test('the guide has three steps: the pin, the registry and the orange button, ending in the first expedition (#256)', async ({ page }) => {
  await openGuide(page);
  const g = guide(page);
  await expect(g).toHaveAttribute('role', 'dialog');
  await expect(g.getByRole('heading', { name: 'Tocá un punto para viajar' })).toBeFocused();
  await expect(page.getByRole('button', { name: /^Siguiente: / })).toHaveCount(0);

  // Step 1: the card is below the pin of Desde Ushuaia, which has the label open.
  await expect(pin(page)).toHaveClass(/\bshown\b/);
  await expect.poll(async () => {
    const c = (await g.boundingBox())!;
    const p = (await pin(page).boundingBox())!;
    const vw = page.viewportSize()!;
    return c.y > p.y && c.x >= 0 && c.x + c.width <= vw.width && c.y + c.height <= vw.height;
  }).toBe(true);
  expect(await seen(page)).toBeNull();

  // Step 2: below the registry.
  await nextStep(page);
  await expect(g.locator('.guide-kicker')).toContainText('2 de 3');
  await expect(g.getByRole('heading', { name: 'Tu registro de exploración' })).toBeFocused();
  await expect(g).toContainText(page.viewportSize()!.width < NARROW_PX ? 'en este celular' : 'en este navegador');
  const reg = page.locator('.reg-wrap');
  await expect.poll(async () => {
    const c = (await g.boundingBox())!;
    const r = (await reg.boundingBox())!;
    return c.y >= r.y + r.height - 1;
  }).toBe(true);
  await expect(page.getByRole('button', { name: /^Siguiente: / })).toHaveCount(0);

  // Step 3: above the orange button, which shows up now.
  await nextStep(page);
  await expect(g.locator('.guide-kicker')).toContainText('3 de 3');
  await expect(g.getByRole('heading', { name: 'Tu próxima expedición' })).toBeFocused();
  await expect(g).toContainText('Siguiente: Desde Ushuaia');
  await expect(g).toContainText('Continuar');
  const orange = page.getByRole('button', { name: /^Siguiente: Desde Ushuaia/ });
  await expect(orange).toBeVisible();
  await expect.poll(async () => {
    const c = (await g.boundingBox())!;
    const b = (await orange.boundingBox())!;
    return c.y + c.height <= b.y + 1;
  }).toBe(true);

  // The primary action opens the expedition and saves the visit.
  await g.getByRole('button', { name: 'Empezar en Ushuaia' }).click();
  await expect(page.locator('.sheet.voyage')).toBeVisible();
  await expect(g).toHaveCount(0);
  expect(await seen(page)).toBe('1');
});

for (const steps of [0, 1, 2]) {
  test(`Escape closes the guide at step ${steps + 1} and saves the visit; the focus leaves the card (#256)`, async ({ page }) => {
    await openGuide(page);
    for (let i = 0; i < steps; i++) await nextStep(page);
    await page.keyboard.press('Escape');
    await expect(guide(page)).toHaveCount(0);
    expect(await seen(page)).toBe('1');
    expect(await insideGuide(page)).toBe(false);
  });
}

test('«Saltar guía» and the browser back button close it and save the visit (#256)', async ({ page }) => {
  await openGuide(page);
  await guide(page).getByRole('button', { name: 'Saltar guía' }).click();
  await expect(guide(page)).toHaveCount(0);
  expect(await seen(page)).toBe('1');
  await historySettled(page);
  await page.reload();
  await expect(loader(page)).toHaveCount(0, { timeout: LOAD_WAIT });
  await page.getByRole('button', { name: 'Cómo se usa el mapa' }).click();
  await expect(guide(page)).toBeVisible();
  await page.goBack();
  await expect(guide(page)).toHaveCount(0);
});

test('Tab stays inside the guide, and the map still answers to the pointer (#256)', async ({ page }) => {
  await openGuide(page);
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab');
    expect(await insideGuide(page)).toBe(true);
  }
  // During step 1 the map can be moved: it is what the step teaches.
  const box = (await page.locator('.vp').boundingBox())!;
  const [x, y] = [box.x + box.width / 2, box.y + box.height * 0.3];
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 80, y + 20, { steps: 5 });
  await page.mouse.up();
  await expect(guide(page)).toBeVisible();
});

test('touching the pin during step 1 opens the trip and the guide goes (#256)', async ({ page, isMobile }) => {
  await openGuide(page);
  if (isMobile) await pin(page).tap();
  else await pin(page).click();
  await expect(page.locator('.sheet.voyage')).toBeVisible();
  await expect(guide(page)).toHaveCount(0);
});

test('«?» opens the guide again at step 1, and it is not there during a trip (#256)', async ({ page }) => {
  await page.addInitScript((k) => localStorage.setItem(k, '1'), INTRO_KEY);
  await page.addInitScript((k) => localStorage.setItem(k, '3d'), VIEW_MODE_KEY);
  await page.goto('/');
  const help = page.getByRole('button', { name: 'Cómo se usa el mapa' });
  await expect(help).toBeVisible({ timeout: LOAD_WAIT });
  await help.click();
  await expect(guide(page)).toBeVisible();
  await expect(guide(page).locator('.guide-kicker')).toContainText('1 de 3');
  // The camera goes to the suggested pin (the spec of #258), and it stays on screen.
  await expect.poll(async () => {
    const p = await pin(page).boundingBox();
    const vw = page.viewportSize()!;
    return !!p && p.x >= 0 && p.x <= vw.width && p.y >= 0 && p.y <= vw.height;
  }).toBe(true);
  // «?» does not bring back the «Mapa listo» card.
  await expect(exploreBtn(page)).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(guide(page)).toHaveCount(0);
  await expect(help).toBeFocused();

  // A trip hides it.
  await historySettled(page);
  await page.goto('/');
  // On a phone the pin of Ushuaia can be out of the first view of the camera (#267): the suggestion button opens it from anywhere.
  await page.getByRole('button', { name: /^Siguiente: / }).click();
  await expect(page.locator('.sheet.voyage')).toBeVisible();
  await expect(help).toBeHidden();
});

test('with Ushuaia done the guide points at the next expedition (#256)', async ({ page }) => {
  await page.addInitScript((k) => localStorage.setItem(k, JSON.stringify(['campana'])), EXPLORED_KEY);
  await openGuide(page);
  await expect(guide(page)).not.toContainText('Desde Ushuaia');
  await expect(guide(page)).toContainText('Esta es la sugerida');
  await nextStep(page);
  await nextStep(page);
  await expect(guide(page).getByRole('button', { name: /^Empezar en (?!Ushuaia)/ })).toBeVisible();
});

test('with six expeditions done there is no third step and the only action is «Explorar por mi cuenta» (#256)', async ({ page }) => {
  const all = ['marambio', 'fosiles', 'oceano', 'poncho', 'campana', 'orcadas'];
  await page.addInitScript((v) => localStorage.setItem(v.k, JSON.stringify(v.all)), { k: EXPLORED_KEY, all });
  await readyCard(page);
  await exploreBtn(page).click();
  await expect(guide(page).locator('.guide-kicker')).toContainText('1 de 2');
  await nextStep(page);
  await expect(guide(page).locator('.guide-kicker')).toContainText('2 de 2');
  await expect(guide(page).getByRole('button', { name: /Empezar en/ })).toHaveCount(0);
  await guide(page).getByRole('button', { name: 'Explorar por mi cuenta' }).click();
  await expect(guide(page)).toHaveCount(0);
  expect(await seen(page)).toBe('1');
});

test('with «Continuar» pending, step 3 points at it (#256)', async ({ page }) => {
  await page.addInitScript((k) => localStorage.setItem(k, JSON.stringify({ id: 'orcadas', step: 1 })), LAST_EXPEDITION_KEY);
  await openGuide(page);
  await expect(page.getByRole('button', { name: /^Continuar/ })).toHaveCount(0);
  await nextStep(page);
  await nextStep(page);
  const resume = page.getByRole('button', { name: /^Continuar/ });
  await expect(resume).toBeVisible();
  await expect(guide(page)).toContainText('Continuar');
  await expect.poll(async () => {
    const c = (await guide(page).boundingBox())!;
    const b = (await resume.boundingBox())!;
    return c.y + c.height <= b.y + 1;
  }).toBe(true);
});

test('on a short landscape phone the guide fits and its last step has no anchor (#256)', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'one profile is enough');
  await page.setViewportSize({ width: 844, height: 390 });
  await openGuide(page);
  await nextStep(page);
  await nextStep(page);
  const box = (await guide(page).boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(390);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(guide(page).getByRole('button', { name: 'Empezar en Ushuaia' })).toBeInViewport();
});

import type { Page } from '@playwright/test';
import { WELCOME_KEY } from '@antartida/core/storage';

/**
 * Saved state with the first-visit welcome (#115) already seen. A first visit zooms the map to
 * «Desde Ushuaia»; tests that are not about the welcome start from the overview instead.
 * `playwright.config.ts` gives it to every test; `welcome.spec.ts` starts from empty storage.
 */
export function welcomeSeen(origin: string) {
  return { cookies: [], origins: [{ origin, localStorage: [{ name: WELCOME_KEY, value: '1' }] }] };
}

/** Clears what the app saved, as on a first visit, but keeps the welcome seen (see welcomeSeen). */
export async function clearStorage(page: Page): Promise<void> {
  await page.evaluate((key) => {
    localStorage.clear();
    localStorage.setItem(key, '1');
  }, WELCOME_KEY);
}

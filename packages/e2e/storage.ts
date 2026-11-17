import type { Page } from '@playwright/test';
import { INTRO_KEY } from '@antartida/core/storage';

/**
 * Saved state with the first-visit intro letter (#256) already seen. A first visit opens the letter;
 * tests that are not about it start without it. `playwright.config.ts` gives it to every test;
 * `intro.spec.ts` starts from empty storage.
 */
export function welcomeSeen(origin: string) {
  return { cookies: [], origins: [{ origin, localStorage: [{ name: INTRO_KEY, value: '1' }] }] };
}

/** Clears what the app saved, as on a first visit, but keeps the intro seen (see welcomeSeen). */
export async function clearStorage(page: Page): Promise<void> {
  await page.evaluate((key) => {
    localStorage.clear();
    localStorage.setItem(key, '1');
  }, INTRO_KEY);
}

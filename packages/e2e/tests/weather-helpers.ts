import type { Page } from '@playwright/test';

const OPEN_METEO_ROUTE = 'https://api.open-meteo.com/**';

export interface RecordedTemperatureEntry {
  current: {
    time: string;
    interval: 900;
    temperature_2m: number;
  };
}

/** Recorded Open-Meteo batch response (12 entries); the mock repeats them for as many places as the request asks (forRequest). */
export const RECORDED_TEMPERATURES: RecordedTemperatureEntry[] = [
  -5.4, -0.1, -38.8, -44.0, -12.3, -2.5, -18.7, -8.2, -15.6, -24.1, -6.0, 4.3,
].map((temperature_2m) => ({
  current: {
    time: '2026-11-11T19:45',
    interval: 900,
    temperature_2m,
  },
}));

/**
 * One entry per place of the request, as the API answers: the batch asks for every point of the map
 * (`PTS`), and it grows when a point is added (#310).
 */
function forRequest(url: string): RecordedTemperatureEntry[] {
  const places = (new URL(url).searchParams.get('latitude') ?? '').split(',').filter(Boolean).length;
  return Array.from({ length: places }, (_, i) => RECORDED_TEMPERATURES[i % RECORDED_TEMPERATURES.length]);
}

export interface OpenMeteoMock {
  getRequestCount: () => number;
}

/**
 * Intercepts `api.open-meteo.com` requests on `page` so E2E tests never hit the real network.
 * Calling it again replaces any previous Open-Meteo route on the same page.
 */
export async function mockOpenMeteo(
  page: Page,
  options: { abort?: boolean } = {},
): Promise<OpenMeteoMock> {
  let requestCount = 0;
  await page.unroute(OPEN_METEO_ROUTE);
  await page.route(OPEN_METEO_ROUTE, async (route) => {
    requestCount += 1;
    if (options.abort) {
      await route.abort();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(forRequest(route.request().url())),
    });
  });
  return { getRequestCount: () => requestCount };
}

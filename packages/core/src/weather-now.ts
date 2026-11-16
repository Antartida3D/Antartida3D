import { PTS, type MapPoint } from './content/points.ts';
import { unproject } from './projection.ts';

export interface CurrentTemperature {
  celsius: number;
  time: string;
}

export type TemperatureLocale = 'es' | 'en';

export const OPEN_METEO_FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

function roundCoord(value: number): number {
  return Math.round(value * 1e4) / 1e4;
}

/** Build a single Open-Meteo batch URL for the given map points (always requested in Celsius). */
export function buildCurrentTemperatureUrl(
  points: readonly Pick<MapPoint, 'x' | 'y'>[] = PTS,
): string {
  const latitudes: number[] = [];
  const longitudes: number[] = [];
  for (const point of points) {
    const { lat, lon } = unproject(point.x, point.y);
    latitudes.push(roundCoord(lat));
    longitudes.push(roundCoord(lon));
  }
  return `${OPEN_METEO_FORECAST_URL}?latitude=${latitudes.join(',')}&longitude=${longitudes.join(',')}&current=temperature_2m`;
}

function parseEntry(entry: unknown): CurrentTemperature | null {
  if (typeof entry !== 'object' || entry === null) return null;
  const current = (entry as Record<string, unknown>).current;
  if (typeof current !== 'object' || current === null) return null;
  const { temperature_2m: celsius, time } = current as Record<string, unknown>;
  if (typeof celsius !== 'number' || !Number.isFinite(celsius)) return null;
  if (typeof time !== 'string' || time.length === 0) return null;
  return { celsius, time };
}

/**
 * Validate an Open-Meteo current temperature response at the boundary.
 * Handles both multi-point arrays and single-point objects; invalid entries become null.
 */
export function parseCurrentTemperature(
  json: unknown,
  count: number,
): (CurrentTemperature | null)[] {
  if (count <= 0) return [];
  if (typeof json !== 'object' || json === null) {
    return Array.from({ length: count }, () => null);
  }
  const entries = Array.isArray(json) ? json : [json];
  return Array.from({ length: count }, (_, index) => parseEntry(entries[index]));
}

export function celsiusToFahrenheit(celsius: number): number {
  return (celsius * 9) / 5 + 32;
}

/** Format a Celsius temperature for display using Unicode minus (U+2212) and one decimal place. */
export function formatTemperature(celsius: number, locale: TemperatureLocale = 'es'): string {
  const value = locale === 'en' ? celsiusToFahrenheit(celsius) : celsius;
  const rounded = Math.round(value * 10) / 10;
  const normalized = rounded === 0 ? 0 : rounded;
  const sign = normalized < 0 ? '\u2212' : '';
  const absFixed = Math.abs(normalized).toFixed(1);
  if (locale === 'es') {
    return `${sign}${absFixed.replace('.', ',')} °C`;
  }
  return `${sign}${absFixed} °F`;
}

const ONE_HOUR_MINUTES = 60;

/**
 * Format an Open-Meteo timestamp (UTC without a trailing Z) as a relative Spanish age.
 * Falls back to the UTC timestamp when it is in the future or at least one hour old, and to the raw input when invalid.
 */
export function formatTemperatureAge(time: string, nowMs: number = Date.now()): string {
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(time);
  const parsedMs = Date.parse(hasZone ? time : `${time}Z`);
  if (!Number.isFinite(parsedMs)) return time;

  const diffMinutes = Math.floor((nowMs - parsedMs) / 60_000);
  if (diffMinutes < 0 || diffMinutes >= ONE_HOUR_MINUTES) return `${time.replace('T', ' ')} UTC`;
  if (diffMinutes === 0) return 'hace menos de 1 min';
  return `hace ${diffMinutes} min`;
}

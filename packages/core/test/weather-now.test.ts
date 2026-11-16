import { describe, expect, it } from 'vitest';
import { PTS } from '../src/content/points.ts';
import { unproject } from '../src/projection.ts';
import {
  OPEN_METEO_FORECAST_URL,
  buildCurrentTemperatureUrl,
  celsiusToFahrenheit,
  formatTemperature,
  formatTemperatureAge,
  parseCurrentTemperature,
} from '../src/weather-now.ts';

describe('buildCurrentTemperatureUrl', () => {
  it('builds a batch Open-Meteo URL with 12 lat/lon pairs in PTS order', () => {
    const url = new URL(buildCurrentTemperatureUrl(PTS));
    expect(`${url.origin}${url.pathname}`).toBe(OPEN_METEO_FORECAST_URL);
    expect(url.searchParams.get('current')).toBe('temperature_2m');

    const lats = url.searchParams.get('latitude')!.split(',').map(Number);
    const lons = url.searchParams.get('longitude')!.split(',').map(Number);
    expect(lats).toHaveLength(12);
    expect(lons).toHaveLength(12);

    PTS.forEach((point, index) => {
      const expected = unproject(point.x, point.y);
      expect(lats[index]).toBeCloseTo(expected.lat, 4);
      expect(lons[index]).toBeCloseTo(expected.lon, 4);
    });
  });
});

describe('parseCurrentTemperature', () => {
  it('parses recorded multi-point responses for Marambio, Orcadas, South Pole and Dome C', () => {
    const recorded = [
      { latitude: -64.24, longitude: -56.62, current: { time: '2026-11-11T19:45', interval: 900, temperature_2m: -5.4 } },
      { latitude: -60.74, longitude: -44.74, current: { time: '2026-11-11T19:45', interval: 900, temperature_2m: -0.1 } },
      { latitude: -90, longitude: 0, current: { time: '2026-11-11T19:45', interval: 900, temperature_2m: -38.8 } },
      { latitude: -75.1, longitude: 123.35, current: { time: '2026-11-11T19:45', interval: 900, temperature_2m: -44.0 } },
    ];

    expect(parseCurrentTemperature(recorded, 4)).toEqual([
      { celsius: -5.4, time: '2026-11-11T19:45' },
      { celsius: -0.1, time: '2026-11-11T19:45' },
      { celsius: -38.8, time: '2026-11-11T19:45' },
      { celsius: -44.0, time: '2026-11-11T19:45' },
    ]);
  });

  it('handles a single-point object response', () => {
    const single = {
      latitude: -64.24,
      longitude: -56.62,
      current: { time: '2026-11-11T19:45', interval: 900, temperature_2m: -5.4 },
    };

    expect(parseCurrentTemperature(single, 1)).toEqual([
      { celsius: -5.4, time: '2026-11-11T19:45' },
    ]);
  });

  it('returns null for broken entries without breaking valid siblings', () => {
    const partial = [
      { current: { time: '2026-11-11T19:45', temperature_2m: -5.4 } },
      { current: { time: '2026-11-11T19:45', temperature_2m: 'N/A' } },
      { current: { time: '', temperature_2m: -38.8 } },
      null,
    ];

    expect(parseCurrentTemperature(partial, 5)).toEqual([
      { celsius: -5.4, time: '2026-11-11T19:45' },
      null,
      null,
      null,
      null,
    ]);
  });

  it('returns all nulls when root payload is invalid', () => {
    expect(parseCurrentTemperature(null, 3)).toEqual([null, null, null]);
    expect(parseCurrentTemperature('error', 2)).toEqual([null, null]);
  });
});

describe('celsiusToFahrenheit and formatTemperature', () => {
  it('converts Celsius to Fahrenheit accurately', () => {
    expect(celsiusToFahrenheit(0)).toBe(32);
    expect(celsiusToFahrenheit(-40)).toBe(-40);
    expect(celsiusToFahrenheit(-5.4)).toBeCloseTo(22.28, 5);
  });

  it('formats Spanish temperatures in °C with comma decimal and Unicode minus', () => {
    expect(formatTemperature(-5.4, 'es')).toBe('\u22125,4 °C');
    expect(formatTemperature(-0.1, 'es')).toBe('\u22120,1 °C');
    expect(formatTemperature(-38.8, 'es')).toBe('\u221238,8 °C');
    expect(formatTemperature(-44.0, 'es')).toBe('\u221244,0 °C');
    expect(formatTemperature(-0.04, 'es')).toBe('0,0 °C');
    expect(formatTemperature(3.25, 'es')).toBe('3,3 °C');
  });

  it('formats English temperatures in °F with dot decimal and Unicode minus', () => {
    expect(formatTemperature(-5.4, 'en')).toBe('22.3 °F');
    expect(formatTemperature(-40, 'en')).toBe('\u221240.0 °F');
    expect(formatTemperature(-38.8, 'en')).toBe('\u221237.8 °F');
  });
});

describe('formatTemperatureAge', () => {
  it('treats Open-Meteo timestamps without Z as UTC', () => {
    const now = Date.parse('2026-11-11T19:57:00Z');
    expect(formatTemperatureAge('2026-11-11T19:45', now)).toBe('hace 12 min');
    expect(formatTemperatureAge('2026-11-11T19:45Z', now)).toBe('hace 12 min');
  });

  it('handles sub-minute ages, >= 1h ages, future timestamps and invalid input', () => {
    const now = Date.parse('2026-11-11T19:45:30Z');
    expect(formatTemperatureAge('2026-11-11T19:45', now)).toBe('hace menos de 1 min');
    expect(formatTemperatureAge('2026-11-11T18:45', now)).toBe('2026-11-11 18:45 UTC');
    expect(formatTemperatureAge('2026-11-11T20:00', now)).toBe('2026-11-11 20:00 UTC');
    expect(formatTemperatureAge('not-a-date', now)).toBe('not-a-date');
  });
});

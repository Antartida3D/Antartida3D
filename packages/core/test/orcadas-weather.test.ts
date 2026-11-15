import { describe, expect, it } from 'vitest';
import {
  SNOW_MAX_PARTICLES,
  snowDensityForMonth,
  snowParticleCount,
} from '../src/orcadas-weather.ts';

describe('snowDensityForMonth and snowParticleCount', () => {
  it('returns 0 in warm summer months and peaks in mid-winter', () => {
    expect(snowDensityForMonth(1)).toBe(0);
    expect(snowDensityForMonth(2)).toBe(0);
    expect(snowDensityForMonth(3)).toBe(0);
    expect(snowDensityForMonth(12)).toBe(0);

    expect(snowDensityForMonth(7)).toBe(1);
    expect(snowDensityForMonth(6)).toBeGreaterThan(0.8);
    expect(snowDensityForMonth(8)).toBeGreaterThan(0.8);
  });

  it('orders seasonal coldness monotonically from transition months to July', () => {
    expect(snowDensityForMonth(11)).toBeGreaterThan(0);
    expect(snowDensityForMonth(4)).toBeGreaterThan(snowDensityForMonth(11));
    expect(snowDensityForMonth(10)).toBeGreaterThan(snowDensityForMonth(4));
    expect(snowDensityForMonth(5)).toBeGreaterThan(snowDensityForMonth(10));
    expect(snowDensityForMonth(7)).toBeGreaterThan(snowDensityForMonth(5));

    // Wraps out-of-range months modulo 12
    expect(snowDensityForMonth(19)).toBe(snowDensityForMonth(7));
    expect(snowDensityForMonth(0)).toBe(snowDensityForMonth(12));
  });

  it('scales particle count by density and turns snow completely off under reduced motion', () => {
    expect(snowParticleCount(7, SNOW_MAX_PARTICLES, false)).toBe(SNOW_MAX_PARTICLES);
    expect(snowParticleCount(1, SNOW_MAX_PARTICLES, false)).toBe(0);
    expect(snowParticleCount(11, SNOW_MAX_PARTICLES, false)).toBeGreaterThan(0);
    expect(snowParticleCount(11, SNOW_MAX_PARTICLES, false)).toBeLessThan(SNOW_MAX_PARTICLES);

    expect(snowParticleCount(7, SNOW_MAX_PARTICLES, true)).toBe(0);
    expect(snowParticleCount(5, SNOW_MAX_PARTICLES, true)).toBe(0);
  });
});

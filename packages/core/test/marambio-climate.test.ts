import { describe, expect, it } from 'vitest';
import {
  MARAMBIO_BLIZZARD_HIGH_YEAR,
  MARAMBIO_BLIZZARD_LOW_YEAR,
  MARAMBIO_CLIMATE,
  marambioBlizzard,
  marambioClimate,
} from '../src/index.ts';

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

describe('Marambio monthly climate (SMN normals 1991-2020)', () => {
  it('has twelve months whose blizzard days add up to the annual totals of the SMN', () => {
    expect(MARAMBIO_CLIMATE).toHaveLength(12);
    expect(sum(MARAMBIO_CLIMATE.map((m) => m.blizzardHighDays))).toBeCloseTo(MARAMBIO_BLIZZARD_HIGH_YEAR, 1);
    // The SMN rounds each month: the sum may differ from its annual figure by a tenth.
    expect(Math.abs(sum(MARAMBIO_CLIMATE.map((m) => m.blizzardLowDays)) - MARAMBIO_BLIZZARD_LOW_YEAR)).toBeLessThanOrEqual(0.15);
  });

  it('is coldest and has most blizzard days in winter, fewest in summer', () => {
    expect(marambioClimate(7).tempMeanC).toBeLessThan(marambioClimate(1).tempMeanC);
    expect(marambioBlizzard(7)).toBe(1);
    expect(marambioBlizzard(1)).toBeLessThan(0.2);
    for (const m of [6, 7, 8]) expect(marambioBlizzard(m)).toBeGreaterThan(0.9);
    for (const m of [12, 1, 2]) expect(marambioBlizzard(m)).toBeLessThan(0.3);
  });

  it('wraps months and keeps the intensity between 0 and 1', () => {
    expect(marambioClimate(13)).toEqual(marambioClimate(1));
    expect(marambioClimate(0)).toEqual(marambioClimate(12));
    for (let m = 1; m <= 12; m++) {
      expect(marambioBlizzard(m)).toBeGreaterThan(0);
      expect(marambioBlizzard(m)).toBeLessThanOrEqual(1);
    }
  });
});

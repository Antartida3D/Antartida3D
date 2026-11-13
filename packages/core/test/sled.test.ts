import { describe, expect, it } from 'vitest';
import { SLED_MARGIN, SLED_MAX_PITCH, easeToward, sledPitch, sledRideHeight, sledTrot, trotRate } from '../src/index.ts';

describe('sled over the relief', () => {
  it('rides on the ground with a margin proportional to its size, and at 0 on the sea level', () => {
    expect(sledRideHeight(2, 0.5)).toBeCloseTo(2 + 0.5 * SLED_MARGIN);
    expect(sledRideHeight(2, 1)).toBeGreaterThan(sledRideHeight(2, 0.5));
    expect(sledRideHeight(0, 0.5)).toBe(0);
    expect(sledRideHeight(-1, 0.5)).toBe(0);
  });

  it('tilts with the slope, limited, and level without a run', () => {
    expect(sledPitch(1, 1, 0.5)).toBe(0);
    expect(sledPitch(1, 1.1, 0.5)).toBeGreaterThan(0);
    expect(sledPitch(1.1, 1, 0.5)).toBeLessThan(0);
    expect(sledPitch(0, 50, 0.5)).toBe(SLED_MAX_PITCH);
    expect(sledPitch(50, 0, 0.5)).toBe(-SLED_MAX_PITCH);
    expect(sledPitch(0, 1, 0)).toBe(0);
  });

  it('trots faster with more pace and not at all when paused or with reduced motion', () => {
    expect(trotRate(0)).toBe(0);
    expect(trotRate(5)).toBeGreaterThan(trotRate(3));
    expect(trotRate(1000)).toBeLessThanOrEqual(9);
    expect(sledTrot(1.2, 1, 0, false)).toBe(0);
    expect(sledTrot(1.2, 1, 4, true)).toBe(0);
    expect(sledTrot(1.2, 1, 4, false)).toBeGreaterThan(0);
    expect(sledTrot(1.2, 2, 4, false)).toBeCloseTo(2 * sledTrot(1.2, 1, 4, false));
  });

  it('eases without overshooting', () => {
    expect(easeToward(0, 10, 0, 8)).toBe(0);
    const mid = easeToward(0, 10, 0.1, 8);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(10);
    expect(easeToward(0, 10, 100, 8)).toBeCloseTo(10);
  });
});

import { describe, expect, it } from 'vitest';
import { POLY_MIN_COLORS, POLY_MIN_TRIS } from '../src/voyage/lowPoly.ts';
import { ponchoDogTris } from '../src/voyage/ponchoDog.ts';

describe('low-poly dog of Poncho', () => {
  const tris = ponchoDogTris();
  it('meets the least detail of a low-poly model', () => {
    expect(tris.length).toBeGreaterThanOrEqual(POLY_MIN_TRIS);
    expect(new Set(tris.map((t) => t[3])).size).toBeGreaterThanOrEqual(POLY_MIN_COLORS);
  });
  it('is about one unit long with its paws on y = 0', () => {
    const xs = tris.flatMap(([a, b, c]) => [a[0], b[0], c[0]]);
    const ys = tris.flatMap(([a, b, c]) => [a[1], b[1], c[1]]);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(0.9);
    expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(1.1);
    expect(Math.min(...ys)).toBeCloseTo(0, 1);
  });
});

describe('dog in pieces and its trot', () => {
  it('puts the pieces back together as the same dog', async () => {
    const { ponchoDogParts, DOG_LEGS } = await import('../src/voyage/ponchoDog.ts');
    const parts = ponchoDogParts();
    const count = parts.body.length + DOG_LEGS.reduce((n, leg) => n + parts.legs[leg].length, 0);
    expect(count).toBe(ponchoDogTris().length);
  });
  it('has each leg hanging down from its own pivot, with the paw at the ground', async () => {
    const { ponchoDogParts, DOG_LEGS, DOG_LEG_PIVOT } = await import('../src/voyage/ponchoDog.ts');
    const parts = ponchoDogParts();
    for (const leg of DOG_LEGS) {
      const ys = parts.legs[leg].flatMap(([a, b, c]) => [a[1], b[1], c[1]]);
      expect(Math.max(...ys)).toBeLessThanOrEqual(0.01);
      expect(Math.min(...ys)).toBeCloseTo(-DOG_LEG_PIVOT[leg][1], 1);
    }
  });
  it('trots in diagonal pairs, never past the swing, and stands still when it does not move', async () => {
    const { dogLegSwing, DOG_SWING } = await import('../src/voyage/ponchoDog.ts');
    for (const phase of [0.3, 1.2, 2.5, 4, 5.9]) {
      const s = dogLegSwing(phase, true);
      expect(s.frontLeft).toBeCloseTo(s.hindRight);
      expect(s.frontRight).toBeCloseTo(s.hindLeft);
      expect(s.frontLeft).toBeCloseTo(-s.frontRight);
      expect(Math.abs(s.frontLeft)).toBeLessThanOrEqual(DOG_SWING);
    }
    expect(dogLegSwing(1.2, false)).toEqual({ frontLeft: 0, frontRight: 0, hindLeft: 0, hindRight: 0 });
  });
});

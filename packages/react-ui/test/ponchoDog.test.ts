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
    const count = parts.body.length + parts.head.length + DOG_LEGS.reduce((n, leg) => n + parts.legs[leg].length, 0);
    expect(count).toBe(ponchoDogTris().length);
  });
  it('has the head hanging from the neck pivot, so it can bob without leaving the neck', async () => {
    const { ponchoDogParts, DOG_HEAD_PIVOT } = await import('../src/voyage/ponchoDog.ts');
    const parts = ponchoDogParts();
    const xs = parts.head.flatMap(([a, b, c]) => [a[0], b[0], c[0]]);
    // The snout is ahead of the pivot and the back of the head sits right at it: the neck stays joined.
    expect(Math.max(...xs)).toBeGreaterThan(0.25);
    expect(Math.min(...xs)).toBeLessThan(0.05);
    expect(DOG_HEAD_PIVOT[1]).toBeGreaterThan(0.5);
  });
  it('bobs the head only while it sniffs, nose down and back to level, never past the limit', async () => {
    const { dogHeadPitch, DOG_SNIFF_DOWN } = await import('../src/voyage/ponchoDog.ts');
    for (const t of [0, 0.4, 1.1, 2.3, 5]) expect(dogHeadPitch(t, false)).toBe(0);
    const pitches = [0, 0.3, 0.7, 1.2, 1.9, 2.6, 3.3].map((t) => dogHeadPitch(t, true));
    expect(Math.min(...pitches)).toBeGreaterThanOrEqual(-DOG_SNIFF_DOWN - 1e-9);
    expect(Math.max(...pitches)).toBeLessThanOrEqual(1e-9);
    expect(Math.min(...pitches)).toBeLessThan(-DOG_SNIFF_DOWN / 2);
    expect(Math.max(...pitches)).toBeGreaterThan(-DOG_SNIFF_DOWN / 2);
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

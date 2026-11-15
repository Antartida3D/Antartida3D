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

import { describe, expect, it } from 'vitest';
import { buildPolyGeometry, normalOf, POLY_MIN_COLORS, POLY_MIN_TRIS } from '../src/voyage/lowPoly.ts';
import { SEA_LION_POLY } from '../src/voyage/poly/seaLionPoly.ts';

describe('low-poly sea lion on its rock', () => {
  const tris = SEA_LION_POLY;
  const ys = tris.flatMap(([a, b, c]) => [a[1], b[1], c[1]]);
  const xs = tris.flatMap(([a, b, c]) => [a[0], b[0], c[0]]);

  it('meets the low-poly detail floor', () => {
    expect(tris.length).toBeGreaterThanOrEqual(POLY_MIN_TRIS);
    expect(new Set(tris.map((t) => t[3])).size).toBeGreaterThanOrEqual(POLY_MIN_COLORS);
  });

  it('has no degenerate faces', () => {
    expect(tris.filter((t) => normalOf(t).every((v) => v === 0)).length).toBe(0);
  });

  it('rests on y = 0 and is about one unit long, as the block model', () => {
    expect(Math.min(...ys)).toBeCloseTo(0, 3);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(0.9);
    expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(1.1);
  });

  it('sits up: the head rises well above the rock', () => {
    expect(Math.max(...ys)).toBeGreaterThan(0.4);
  });

  it('builds a geometry', () => {
    const geometry = buildPolyGeometry(tris);
    expect(geometry.getAttribute('position').count).toBe(tris.length * 3);
  });
});

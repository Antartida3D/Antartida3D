import { describe, expect, it } from 'vitest';
import { buildPolyGeometry, normalOf, POLY_MIN_COLORS, POLY_MIN_TRIS } from '../src/voyage/lowPoly.ts';
import { CRABEATER_SEAL_POLY } from '../src/voyage/poly/crabeaterSealPoly.ts';

/** CREAM of sightingModels.ts: the coat of the crabeater. */
const CREAM = 0xf1e6c8;
/** Dark greys of the Weddell and leopard seals, which the crabeater must not share. */
const OTHER_SEAL_GREYS = [0x4f5a63, 0x3d4852, 0x56626c, 0x6f7f8c];

describe('low-poly crabeater seal on its floe', () => {
  const tris = CRABEATER_SEAL_POLY;
  const xs = tris.flatMap(([a, b, c]) => [a[0], b[0], c[0]]);
  const ys = tris.flatMap(([a, b, c]) => [a[1], b[1], c[1]]);
  const colors = new Set(tris.map((t) => t[3]));

  it('meets the low-poly detail floor', () => {
    expect(tris.length).toBeGreaterThanOrEqual(POLY_MIN_TRIS);
    expect(colors.size).toBeGreaterThanOrEqual(POLY_MIN_COLORS);
  });

  it('has no degenerate faces', () => {
    expect(tris.filter((t) => normalOf(t).every((v) => v === 0)).length).toBe(0);
  });

  it('rests on y = 0 and is about one unit long, as the block model', () => {
    expect(Math.min(...ys)).toBeCloseTo(0, 3);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(0.9);
    expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(1.15);
    expect(Math.max(...ys)).toBeGreaterThan(0.25);
  });

  it('is cream, not grey like the Weddell or leopard seal', () => {
    expect(colors.has(CREAM)).toBe(true);
    for (const grey of OTHER_SEAL_GREYS) expect(colors.has(grey)).toBe(false);
  });

  it('builds a geometry', () => {
    const geometry = buildPolyGeometry(tris);
    expect(geometry.getAttribute('position').count).toBe(tris.length * 3);
  });
});

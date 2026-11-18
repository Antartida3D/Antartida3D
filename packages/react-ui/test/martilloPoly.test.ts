import { describe, expect, it } from 'vitest';
import { buildPolyGeometry, normalOf, POLY_MIN_COLORS, POLY_MIN_TRIS } from '../src/voyage/lowPoly.ts';
import { BLACK, WHITE } from '../src/voyage/sightingModels.ts';
import { MARTILLO_POLY } from '../src/voyage/poly/martilloPoly.ts';

const corners = MARTILLO_POLY.flatMap(([a, b, c]) => [a, b, c]);
const min = (k: number) => Math.min(...corners.map((p) => p[k]));
const max = (k: number) => Math.max(...corners.map((p) => p[k]));
const midY = ([a, b, c]: (typeof MARTILLO_POLY)[number]) => (a[1] + b[1] + c[1]) / 3;

describe('Isla Martillo low-poly colony', () => {
  it('meets the low-poly detail floor', () => {
    expect(MARTILLO_POLY.length).toBeGreaterThanOrEqual(POLY_MIN_TRIS);
    expect(new Set(MARTILLO_POLY.map((t) => t[3])).size).toBeGreaterThanOrEqual(POLY_MIN_COLORS);
  });

  it('has no degenerate faces', () => {
    expect(MARTILLO_POLY.filter((t) => Math.hypot(...normalOf(t)) === 0)).toHaveLength(0);
  });

  it('rests on y = 0 with the footprint of the block COLONY', () => {
    expect(min(1)).toBeCloseTo(0, 6);
    expect(max(1)).toBeGreaterThan(0.3);
    expect(max(1)).toBeLessThan(0.45);
    expect(max(0) - min(0)).toBeGreaterThan(1);
    expect(max(0) - min(0)).toBeLessThan(1.2);
    expect(max(2) - min(2)).toBeGreaterThan(0.7);
    expect(max(2) - min(2)).toBeLessThan(0.85);
  });

  it('has black and white penguins standing above the island top', () => {
    expect(MARTILLO_POLY.filter((t) => t[3] === BLACK && midY(t) > 0.1).length).toBeGreaterThan(100);
    expect(MARTILLO_POLY.filter((t) => t[3] === WHITE && midY(t) > 0.1).length).toBeGreaterThan(60);
  });

  it('builds a geometry', () => {
    const g = buildPolyGeometry(MARTILLO_POLY);
    expect(g.getAttribute('position').count).toBe(MARTILLO_POLY.length * 3);
  });
});

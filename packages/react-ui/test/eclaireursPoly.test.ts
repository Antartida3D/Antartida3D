import { describe, expect, it } from 'vitest';
import { buildPolyGeometry, normalOf, POLY_MIN_COLORS, POLY_MIN_TRIS } from '../src/voyage/lowPoly.ts';
import { ECLAIREURS_POLY } from '../src/voyage/poly/eclaireursPoly.ts';
import { LAMP, RED, WHITE } from '../src/voyage/sightingModels.ts';

const points = ECLAIREURS_POLY.flatMap(([a, b, c]) => [a, b, c]);
const range = (k: number) => [Math.min(...points.map((p) => p[k])), Math.max(...points.map((p) => p[k]))];

describe('Les Éclaireurs low-poly', () => {
  it('has the least detail of a low-poly model, with the bands and the lit lantern', () => {
    const colors = new Set(ECLAIREURS_POLY.map((t) => t[3]));
    expect(ECLAIREURS_POLY.length).toBeGreaterThanOrEqual(POLY_MIN_TRIS);
    expect(colors.size).toBeGreaterThanOrEqual(POLY_MIN_COLORS);
    for (const c of [RED, WHITE, LAMP]) expect(colors.has(c)).toBe(true);
  });

  it('has no degenerate faces', () => {
    expect(ECLAIREURS_POLY.filter((t) => normalOf(t).every((v) => v === 0))).toEqual([]);
  });

  it('stands on y = 0 with the footprint and height of the block tower', () => {
    const [y0, y1] = range(1);
    const [x0, x1] = range(0);
    const [z0, z1] = range(2);
    expect(y0).toBeCloseTo(0, 3);
    expect(y1).toBeGreaterThan(0.95);
    expect(y1).toBeLessThan(1.1);
    expect(x1 - x0).toBeGreaterThan(0.8);
    expect(x1 - x0).toBeLessThan(1.1);
    expect(z1 - z0).toBeGreaterThan(0.6);
    expect(z1 - z0).toBeLessThan(0.9);
  });

  it('builds one geometry with every face', () => {
    const geometry = buildPolyGeometry(ECLAIREURS_POLY);
    expect(geometry.getAttribute('position').count).toBe(ECLAIREURS_POLY.length * 3);
  });
});

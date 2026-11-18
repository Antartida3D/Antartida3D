import { describe, expect, it } from 'vitest';
import { buildPolyGeometry, normalOf, POLY_MIN_COLORS, POLY_MIN_TRIS } from '../src/voyage/lowPoly.ts';
import { CREAM, LAMP, ZINC } from '../src/voyage/sightingModels.ts';
import { SAN_JUAN_POLY } from '../src/voyage/poly/sanJuanPoly.ts';

const corners = SAN_JUAN_POLY.flatMap(([a, b, c]) => [a, b, c]);
const min = (k: number) => Math.min(...corners.map((p) => p[k]));
const max = (k: number) => Math.max(...corners.map((p) => p[k]));
const mid = ([a, b, c]: (typeof SAN_JUAN_POLY)[number]) => [0, 1, 2].map((k) => (a[k] + b[k] + c[k]) / 3);

describe('San Juan de Salvamento low-poly house', () => {
  it('meets the low-poly detail floor', () => {
    expect(SAN_JUAN_POLY.length).toBeGreaterThanOrEqual(POLY_MIN_TRIS);
    expect(new Set(SAN_JUAN_POLY.map((t) => t[3])).size).toBeGreaterThanOrEqual(POLY_MIN_COLORS);
  });

  it('has no degenerate faces', () => {
    expect(SAN_JUAN_POLY.filter((t) => Math.hypot(...normalOf(t)) === 0)).toHaveLength(0);
  });

  it('stands on y = 0 with the measures of the block HOUSE', () => {
    expect(min(1)).toBeCloseTo(0, 6);
    expect(max(1)).toBeGreaterThan(0.6);
    expect(max(1)).toBeLessThan(0.75);
    expect(max(0) - min(0)).toBeGreaterThan(0.85);
    expect(max(0) - min(0)).toBeLessThan(1.05);
    expect(max(2) - min(2)).toBeGreaterThan(0.65);
    expect(max(2) - min(2)).toBeLessThan(0.85);
  });

  it('has its lamp windows on the +x side, walls facing out and roof slopes facing up', () => {
    expect(SAN_JUAN_POLY.filter((t) => t[3] === LAMP && mid(t)[0] > 0.15).length).toBeGreaterThan(0);
    for (const t of SAN_JUAN_POLY.filter((f) => f[3] === CREAM)) {
      const n = normalOf(t);
      const m = mid(t);
      expect(n[0] * m[0] + n[2] * m[2] > 0 || n[1] > 0.99).toBe(true);
    }
    for (const t of SAN_JUAN_POLY.filter((f) => f[3] === ZINC)) expect(normalOf(t)[1]).toBeGreaterThan(0);
  });

  it('builds a geometry', () => {
    const g = buildPolyGeometry(SAN_JUAN_POLY);
    expect(g.getAttribute('position').count).toBe(SAN_JUAN_POLY.length * 3);
  });
});

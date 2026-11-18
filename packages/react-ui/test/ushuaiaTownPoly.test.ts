import { describe, expect, it } from 'vitest';
import { buildPolyGeometry, normalOf, POLY_MIN_COLORS, POLY_MIN_TRIS, type Tri } from '../src/voyage/lowPoly.ts';
import { USHUAIA_TOWN_CHIMNEYS, USHUAIA_TOWN_GROUND_SINK, USHUAIA_TOWN_POLY } from '../src/voyage/poly/ushuaiaTownPoly.ts';
import { LAMP, RED, ZINC } from '../src/voyage/sightingModels.ts';

const corners = (tris: readonly Tri[]) => tris.flatMap(([a, b, c]) => [a, b, c]);
const range = (k: number) => {
  const v = corners(USHUAIA_TOWN_POLY).map((p) => p[k]);
  return [Math.min(...v), Math.max(...v)];
};

describe('Ushuaia town low-poly', () => {
  it('has the least detail and the colors that tell the town', () => {
    expect(USHUAIA_TOWN_POLY.length).toBeGreaterThanOrEqual(POLY_MIN_TRIS);
    const colors = new Set(USHUAIA_TOWN_POLY.map((t) => t[3]));
    expect(colors.size).toBeGreaterThanOrEqual(POLY_MIN_COLORS);
    // Zinc roofs, the yellow and red church.
    for (const c of [ZINC, LAMP, RED]) expect(colors.has(c)).toBe(true);
  });

  it('has no degenerate faces and builds a geometry', () => {
    for (const t of USHUAIA_TOWN_POLY) expect(Math.hypot(...normalOf(t))).toBeGreaterThan(0.5);
    const geometry = buildPolyGeometry(USHUAIA_TOWN_POLY);
    expect(geometry.getAttribute('position').count).toBe(USHUAIA_TOWN_POLY.length * 3);
    geometry.dispose();
  });

  it('keeps the footprint and height of the block town', () => {
    const [x0, x1] = range(0);
    const [y0, y1] = range(1);
    const [z0, z1] = range(2);
    expect(x0).toBeCloseTo(-0.85, 2);
    expect(x1).toBeCloseTo(0.85, 2);
    expect(z0).toBeCloseTo(-0.56, 2);
    expect(z1).toBeCloseTo(0.36, 2);
    // The ground reaches below y = 0 like the block town, to hide the relief round its highest point.
    expect(y0).toBeCloseTo(USHUAIA_TOWN_GROUND_SINK, 3);
    // Top of the cross on the church tower.
    expect(y1).toBeCloseTo(0.81, 2);
  });

  it('stands on y = 0 at the shore', () => {
    // The shore line by the water is the level the town stands on.
    const shore = corners(USHUAIA_TOWN_POLY).filter((p) => Math.abs(p[2] - 0.36) < 1e-6 && Math.abs(p[1]) < 1e-6);
    expect(shore.length).toBeGreaterThan(0);
  });

  it('puts every chimney top on a roof, inside the town', () => {
    expect(USHUAIA_TOWN_CHIMNEYS).toHaveLength(3);
    const tops = corners(USHUAIA_TOWN_POLY);
    for (const [x, y, z] of USHUAIA_TOWN_CHIMNEYS) {
      expect(Math.abs(x)).toBeLessThan(0.85);
      expect(z).toBeGreaterThan(-0.56);
      expect(z).toBeLessThan(0.36);
      // A face corner of the chimney cap is at the top.
      expect(tops.some((p) => Math.abs(p[0] - x) < 0.03 && Math.abs(p[1] - y) < 1e-9 && Math.abs(p[2] - z) < 0.03)).toBe(true);
    }
  });
});

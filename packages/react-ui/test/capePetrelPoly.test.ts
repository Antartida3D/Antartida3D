import { describe, expect, it } from 'vitest';
import { boxShade, buildPolyGeometry, normalOf, POLY_MIN_COLORS, POLY_MIN_TRIS, type Tri } from '../src/voyage/lowPoly.ts';
import { CAPE_PETREL_BODY_POLY, CAPE_PETREL_WING_POLY } from '../src/voyage/poly/capePetrelPoly.ts';

const BLACK = 0x1f2a36;
const WHITE = 0xf7fafb;

const bounds = (tris: readonly Tri[]) => {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const [a, b, c] of tris) for (const p of [a, b, c]) for (let k = 0; k < 3; k++) {
    min[k] = Math.min(min[k], p[k]);
    max[k] = Math.max(max[k], p[k]);
  }
  return { min, max };
};

/** Signed volume of closed parts: positive when their faces look outwards. */
const volume = (tris: readonly Tri[]) =>
  tris.reduce((sum, [a, b, c]) => sum + (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6, 0);

/** Colors of the faces seen from above (normal up) in an x range. */
const topColors = (tris: readonly Tri[], x0: number, x1: number) =>
  new Set(tris.filter((t) => {
    const x = (t[0][0] + t[1][0] + t[2][0]) / 3;
    // 0.8 leaves out the eye facets, which look up and sideways.
    return normalOf(t)[1] > 0.8 && x >= x0 && x <= x1;
  }).map((t) => t[3]));

describe('cape petrel low-poly', () => {
  for (const [name, tris] of [['body', CAPE_PETREL_BODY_POLY], ['wing', CAPE_PETREL_WING_POLY]] as const) {
    it(`${name} meets the detail floor`, () => {
      expect(tris.length).toBeGreaterThanOrEqual(POLY_MIN_TRIS);
      expect(new Set(tris.map((t) => t[3])).size).toBeGreaterThanOrEqual(POLY_MIN_COLORS);
    });

    it(`${name} has no degenerate face and its faces look outwards`, () => {
      for (const t of tris) expect(Math.hypot(...normalOf(t))).toBeGreaterThan(0.5);
      expect(volume(tris)).toBeGreaterThan(0);
    });

    it(`${name} builds a finite geometry`, () => {
      const pos = buildPolyGeometry(tris, boxShade).getAttribute('position');
      expect(pos.count).toBe(tris.length * 3);
      for (let i = 0; i < pos.array.length; i++) expect(Number.isFinite(pos.array[i])).toBe(true);
    });
  }

  it('keeps the measures of the block bird: one unit long, bill to +x, round the body axis', () => {
    const { min, max } = bounds(CAPE_PETREL_BODY_POLY);
    expect(max[0] - min[0]).toBeGreaterThan(0.9);
    expect(max[0] - min[0]).toBeLessThan(1);
    expect(max[0]).toBeGreaterThan(0.45);
    // A flying bird: like bird() it sits round y = 0 (WING_ROOT is set in that frame), not on it.
    expect(min[1]).toBeGreaterThan(-0.08);
    expect(max[1]).toBeLessThan(0.1);
    expect(max[2]).toBeCloseTo(-min[2], 6);
  });

  it('has a right wing from its root out to +z, as long as the block wing', () => {
    const { min, max } = bounds(CAPE_PETREL_WING_POLY);
    expect(min[2]).toBeCloseTo(0, 6);
    expect(max[2]).toBeGreaterThan(0.72);
    expect(max[2]).toBeLessThan(0.8);
    expect(max[1] - min[1]).toBeLessThan(0.05);
  });

  it('is checkered black and white on the back and the upperwing, with a black head', () => {
    expect(topColors(CAPE_PETREL_BODY_POLY, -0.2, 0.22)).toEqual(new Set([BLACK, WHITE]));
    expect(topColors(CAPE_PETREL_BODY_POLY, 0.25, 0.39)).toEqual(new Set([BLACK]));
    expect(topColors(CAPE_PETREL_WING_POLY, -1, 1)).toEqual(new Set([BLACK, WHITE]));
  });

  it('has eyes on both sides of the head', () => {
    const eyes = CAPE_PETREL_BODY_POLY.filter((t) => t[3] === 0x5a3a24);
    expect(eyes.some((t) => t[0][2] > 0)).toBe(true);
    expect(eyes.some((t) => t[0][2] < 0)).toBe(true);
  });
});

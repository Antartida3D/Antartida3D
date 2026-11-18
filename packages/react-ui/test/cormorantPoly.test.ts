import { describe, expect, it } from 'vitest';
import { boxShade, buildPolyGeometry, normalOf, POLY_MIN_COLORS, POLY_MIN_TRIS, type Tri } from '../src/voyage/lowPoly.ts';
import { CORMORANT_BODY_POLY, CORMORANT_WING_POLY } from '../src/voyage/poly/cormorantPoly.ts';

const BLACK = 0x1f2a36;
const WHITE = 0xf7fafb;
const EYE = 0x5a3a24;
const BILL = 0x4a4f55;

const bounds = (tris: readonly Tri[]) => {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const t of tris) for (let k = 0; k < 3; k++) for (let c = 0; c < 3; c++) {
    min[c] = Math.min(min[c], t[k][c]);
    max[c] = Math.max(max[c], t[k][c]);
  }
  return { min, max };
};

/** Signed volume of closed parts: positive when their faces look outwards. */
const volume = (tris: readonly Tri[]) =>
  tris.reduce((sum, [a, b, c]) => sum + (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6, 0);

const midX = (t: Tri) => (t[0][0] + t[1][0] + t[2][0]) / 3;

/** Colors of the faces looking up (dir 1) or down (dir -1) in an x range. */
const colorsFacing = (tris: readonly Tri[], dir: 1 | -1, x0: number, x1: number) =>
  new Set(tris.filter((t) => normalOf(t)[1] * dir > 0.5 && midX(t) >= x0 && midX(t) <= x1).map((t) => t[3]));

describe('imperial cormorant low-poly', () => {
  for (const [name, tris] of [['body', CORMORANT_BODY_POLY], ['wing', CORMORANT_WING_POLY]] as const) {
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
    const { min, max } = bounds(CORMORANT_BODY_POLY);
    expect(max[0] - min[0]).toBeGreaterThan(0.9);
    expect(max[0] - min[0]).toBeLessThan(1);
    expect(max[0]).toBeGreaterThan(0.5);
    // A flying bird: like bird() it sits round y = 0 (WING_ROOT is set in that frame), not on it.
    expect(min[1]).toBeGreaterThan(-0.08);
    expect(max[1]).toBeLessThan(0.1);
    expect(max[2]).toBeCloseTo(-min[2], 6);
  });

  it('has a right wing from just inside its root out to +z, as long as the block wing', () => {
    const { min, max } = bounds(CORMORANT_WING_POLY);
    expect(min[2]).toBeLessThanOrEqual(0);
    expect(min[2]).toBeGreaterThan(-0.06);
    expect(max[2]).toBeGreaterThan(0.7);
    expect(max[2]).toBeLessThan(0.76);
    expect(max[1] - min[1]).toBeLessThan(0.05);
  });

  it('is black above and white below, with a white bar on the upperwing', () => {
    expect(colorsFacing(CORMORANT_BODY_POLY, 1, -0.2, 0.38)).toEqual(new Set([BLACK]));
    expect(colorsFacing(CORMORANT_BODY_POLY, -1, -0.1, 0.33)).toEqual(new Set([WHITE]));
    expect(colorsFacing(CORMORANT_WING_POLY, 1, -1, 1)).toEqual(new Set([BLACK, WHITE]));
  });

  it('has eyes on both sides of the head and a bill hooked at its tip', () => {
    const eyes = CORMORANT_BODY_POLY.filter((t) => t[3] === EYE);
    expect(eyes.some((t) => t[0][2] > 0)).toBe(true);
    expect(eyes.some((t) => t[0][2] < 0)).toBe(true);
    const tip = CORMORANT_BODY_POLY.filter((t) => t[3] === BILL && midX(t) > 0.515);
    expect(Math.min(...tip.flatMap((t) => [t[0][1], t[1][1], t[2][1]]))).toBeLessThan(0.02);
  });
});

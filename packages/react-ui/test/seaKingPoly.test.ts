import { describe, expect, it } from 'vitest';
import { buildPolyGeometry, normalOf, POLY_MIN_COLORS, POLY_MIN_TRIS, type Tri } from '../src/voyage/lowPoly.ts';
import { HELICOPTER_ROTOR_ORIGIN, VOXEL_PALETTE } from '../src/orcadas/stationModels.ts';
import { SEA_KING_BODY_POLY, SEA_KING_ROTOR_ORIGIN, SEA_KING_ROTOR_POLY } from '../src/voyage/poly/seaKingPoly.ts';

const bounds = (tris: readonly Tri[]) => {
  const corners = tris.flatMap(([a, b, c]) => [a, b, c]);
  return {
    min: [0, 1, 2].map((k) => Math.min(...corners.map((p) => p[k]))),
    max: [0, 1, 2].map((k) => Math.max(...corners.map((p) => p[k]))),
  };
};
const mid = ([a, b, c]: Tri) => [0, 1, 2].map((k) => (a[k] + b[k] + c[k]) / 3);

describe('Sea King low-poly helicopter of the voyage', () => {
  it('meets the low-poly detail floor, body and rotor', () => {
    for (const tris of [SEA_KING_BODY_POLY, SEA_KING_ROTOR_POLY]) {
      expect(tris.length).toBeGreaterThanOrEqual(POLY_MIN_TRIS);
      expect(new Set(tris.map((t) => t[3])).size).toBeGreaterThanOrEqual(POLY_MIN_COLORS);
    }
  });

  it('has no degenerate faces', () => {
    for (const tris of [SEA_KING_BODY_POLY, SEA_KING_ROTOR_POLY]) {
      expect(tris.filter((t) => Math.hypot(...normalOf(t)) === 0)).toHaveLength(0);
    }
  });

  it('keeps the measures of HELICOPTER_BOXES: wheels on y = 0, nose to +x', () => {
    const { min, max } = bounds(SEA_KING_BODY_POLY);
    expect(min[1]).toBeCloseTo(0, 6);
    const expected = { min: [-0.5, 0, -0.166], max: [0.46, 0.332, 0.166] };
    for (let k = 0; k < 3; k++) {
      expect(Math.abs(min[k] - expected.min[k])).toBeLessThanOrEqual(0.01);
      expect(Math.abs(max[k] - expected.max[k])).toBeLessThanOrEqual(0.01);
    }
  });

  it('turns the rotor about the same mast as the block model', () => {
    expect(SEA_KING_ROTOR_ORIGIN).toEqual(HELICOPTER_ROTOR_ORIGIN);
    const { min, max } = bounds(SEA_KING_ROTOR_POLY);
    expect(max[0]).toBeCloseTo(-min[0], 2);
    expect(max[2]).toBeCloseTo(-min[2], 2);
    expect(Math.abs(min[1])).toBeLessThan(0.02);
    expect(max[1]).toBeLessThan(0.02);
  });

  it('has cockpit glass at the front and the tail rotor at the back', () => {
    const glass = SEA_KING_BODY_POLY.filter((t) => t[3] === VOXEL_PALETTE.BLACK);
    expect(glass.some((t) => mid(t)[0] > 0.25 && mid(t)[1] > 0.13)).toBe(true);
    expect(SEA_KING_BODY_POLY.some((t) => t[3] === VOXEL_PALETTE.LAMP && mid(t)[0] < -0.4)).toBe(true);
  });

  it('builds the geometries', () => {
    for (const tris of [SEA_KING_BODY_POLY, SEA_KING_ROTOR_POLY]) {
      const g = buildPolyGeometry(tris);
      expect(g.getAttribute('position').count).toBe(tris.length * 3);
      g.dispose();
    }
  });
});

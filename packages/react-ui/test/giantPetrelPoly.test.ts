import { describe, expect, it } from 'vitest';
import { buildPolyGeometry, boxShade, mirrorZ, normalOf, POLY_MIN_COLORS, POLY_MIN_TRIS, type Tri } from '../src/voyage/lowPoly.ts';
import { GIANT_PETREL_BODY_POLY, GIANT_PETREL_WING_POLY } from '../src/voyage/poly/giantPetrelPoly.ts';
import { VOXEL_PALETTE } from '../src/orcadas/stationModels.ts';

const bounds = (tris: readonly Tri[]) => {
  const pts = tris.flatMap(([a, b, c]) => [a, b, c]);
  const axis = (k: number) => [Math.min(...pts.map((p) => p[k])), Math.max(...pts.map((p) => p[k]))];
  return { x: axis(0), y: axis(1), z: axis(2) };
};

describe('giant petrel low-poly model', () => {
  const parts = { body: GIANT_PETREL_BODY_POLY, wing: GIANT_PETREL_WING_POLY };

  for (const [name, tris] of Object.entries(parts)) {
    it(`${name} meets the low-poly detail floor`, () => {
      expect(tris.length).toBeGreaterThanOrEqual(POLY_MIN_TRIS);
      expect(new Set(tris.map((t) => t[3])).size).toBeGreaterThanOrEqual(POLY_MIN_COLORS);
    });

    it(`${name} has no degenerate faces`, () => {
      for (const t of tris) expect(Math.hypot(...normalOf(t))).toBeGreaterThan(0);
    });

    it(`${name} builds one geometry`, () => {
      const geometry = buildPolyGeometry(tris, boxShade);
      expect(geometry.getAttribute('position').count).toBe(tris.length * 3);
      geometry.dispose();
    });
  }

  it('keeps the frame of the block bird: front at +x, about one unit long, centered on y = 0', () => {
    // A bird in flight has no ground: like bird(...) in sightingModels.ts, its body sits on y = 0.
    const { x, y, z } = bounds(GIANT_PETREL_BODY_POLY);
    expect(x[0]).toBeGreaterThan(-0.46);
    expect(x[1]).toBeGreaterThan(0.45);
    expect(x[1]).toBeLessThan(0.52);
    expect(y[0]).toBeGreaterThan(-0.09);
    expect(y[0]).toBeLessThan(-0.04);
    expect(y[1]).toBeLessThan(0.1);
    expect(Math.abs(z[0] + z[1])).toBeLessThan(1e-9);
  });

  it('has a dark eye on each side of the head and a pale bill ahead of it', () => {
    const eyes = GIANT_PETREL_BODY_POLY.filter(([a, b, c, col]) => col === VOXEL_PALETTE.BLACK && a[0] > 0.3 && a[0] < 0.37 && b[0] < 0.37 && c[0] < 0.37);
    expect(eyes.some(([a]) => a[2] > 0.03)).toBe(true);
    expect(eyes.some(([a]) => a[2] < -0.03)).toBe(true);
    const front = Math.max(...GIANT_PETREL_BODY_POLY.flatMap(([a, b, c]) => [a[0], b[0], c[0]]));
    const tip = GIANT_PETREL_BODY_POLY.find(([a, b, c]) => [a, b, c].some((p) => p[0] === front));
    expect(tip?.[3]).not.toBe(VOXEL_PALETTE.BROWN);
  });

  it('spreads the right wing out along +z from its root, and mirrors it to the left', () => {
    const { z } = bounds(GIANT_PETREL_WING_POLY);
    expect(z[0]).toBeLessThanOrEqual(0);
    expect(z[1]).toBeGreaterThan(0.7);
    expect(z[1]).toBeLessThan(0.8);
    const left = bounds(mirrorZ(GIANT_PETREL_WING_POLY)).z;
    expect(left[0]).toBeCloseTo(-z[1]);
  });
});

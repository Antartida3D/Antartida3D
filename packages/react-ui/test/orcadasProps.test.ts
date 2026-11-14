import { describe, expect, it } from 'vitest';
// Break the pre-existing stationModels <-> sightingModels -> penguins import cycle in test isolation.
import '../src/voyage/sightingModels.ts';
import {
  boxShade,
  buildPolyGeometry,
  POLY_MIN_COLORS,
  POLY_MIN_TRIS,
  type Tri,
  type Vec3,
} from '../src/voyage/lowPoly.ts';
import {
  SEA_ICE_FLOE_POLY_VARIANTS,
  buildBoatChocksTris,
  buildHelicopterRotorTris,
  buildHelicopterTris,
  buildZodiacTris,
  buildZodiacWakeGeometry,
  zodiacBottomY,
} from '../src/orcadas/lowPolyProps.ts';
import {
  HELICOPTER_ROTOR_ORIGIN,
  floeVisibility,
  seaIcePlateRadius,
} from '../src/orcadas/stationModels.ts';
import { inward } from './polyHelpers.ts';

interface BBox {
  readonly min: readonly [number, number, number];
  readonly max: readonly [number, number, number];
}

function triBBox(tris: readonly Tri[]): BBox {
  let minX = Infinity,
    minY = Infinity,
    minZ = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity,
    maxZ = -Infinity;
  for (const [a, b, c] of tris) {
    for (const p of [a, b, c]) {
      minX = Math.min(minX, p[0]);
      minY = Math.min(minY, p[1]);
      minZ = Math.min(minZ, p[2]);
      maxX = Math.max(maxX, p[0]);
      maxY = Math.max(maxY, p[1]);
      maxZ = Math.max(maxZ, p[2]);
    }
  }
  return { min: [minX, minY, minZ], max: [maxX, maxY, maxZ] };
}

function bboxCenter(b: BBox): Vec3 {
  return [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2];
}

// Measured from STATION_BOAT_BOXES, HELICOPTER_BOXES, HELICOPTER_ROTOR_BOXES before migration.
const EXPECTED_BOAT_BBOX: BBox = {
  min: [-1.173, 0, -0.53],
  max: [1.145, 0.555, 0.53],
};
const EXPECTED_HELI_BBOX: BBox = {
  min: [-0.5, 0, -0.166],
  max: [0.46, 0.332, 0.166],
};
const EXPECTED_ROTOR_BBOX: BBox = {
  min: [-0.42, -0.013, -0.42],
  max: [0.42, 0.013, 0.42],
};

describe('Orcadas low-poly sea-ice floes', () => {
  SEA_ICE_FLOE_POLY_VARIANTS.forEach((variant, idx) => {
    it(`floe variant ${idx} meets detail, <=250 tris budget, outward winding, and upward waterline`, () => {
      const colors = new Set(variant.tris.map((t) => t[3]));
      expect(variant.tris.length).toBeGreaterThanOrEqual(POLY_MIN_TRIS);
      expect(variant.tris.length).toBeLessThanOrEqual(250);
      expect(colors.size).toBeGreaterThanOrEqual(POLY_MIN_COLORS);
      for (const t of variant.tris) {
        expect(t.slice(0, 3).flat().every(Number.isFinite)).toBe(true);
      }

      const b = triBBox(variant.tris);
      expect(inward(variant.tris, bboxCenter(b)) / variant.tris.length).toBeLessThan(0.25);

      // Horizontal extent fits inside seaIcePlateRadius's conservative 1.25 bound.
      expect(Math.max(Math.abs(b.min[0]), Math.abs(b.max[0]))).toBeLessThanOrEqual(1.25);
      expect(Math.max(Math.abs(b.min[2]), Math.abs(b.max[2]))).toBeLessThanOrEqual(1.25);
      // Submerged underside goes below y = 0, snow top rises above y = 0.
      expect(b.min[1]).toBeLessThan(0);
      expect(b.max[1]).toBeGreaterThan(0.05);

      const wl = variant.createWaterline();
      const pos = wl.getAttribute('position');
      const col = wl.getAttribute('color');
      expect(col.itemSize).toBe(4);
      const waterFaces = pos.count / 3;
      expect(variant.tris.length + waterFaces).toBeLessThanOrEqual(250);
      for (let i = 0; i < pos.count; i += 3) {
        const ax = pos.getX(i),
          az = pos.getZ(i);
        const bx = pos.getX(i + 1),
          bz = pos.getZ(i + 1);
        const cx = pos.getX(i + 2),
          cz = pos.getZ(i + 2);
        expect((bz - az) * (cx - ax) - (bx - ax) * (cz - az)).toBeGreaterThanOrEqual(-1e-9);
      }
      wl.dispose();
    });
  });

  it('keeps seaIcePlateRadius and floeVisibility helpers intact', () => {
    expect(seaIcePlateRadius({ sizeX: 0.9, sizeZ: 0.6 })).toBeCloseTo(1.25, 4);
    expect(floeVisibility(0.2, 0.28)).toBeCloseTo(1, 5);
  });
});

describe('Orcadas low-poly Zodiac RIB, chocks and wake', () => {
  it('Zodiac meets detail, <=1500 tris, outward winding and block-equivalent bbox (±0.03)', () => {
    const tris = buildZodiacTris();
    const colors = new Set(tris.map((t) => t[3]));
    expect(tris.length).toBeGreaterThanOrEqual(POLY_MIN_TRIS);
    expect(tris.length).toBeLessThanOrEqual(1500);
    expect(colors.size).toBeGreaterThanOrEqual(POLY_MIN_COLORS);
    for (const t of tris) {
      expect(t.slice(0, 3).flat().every(Number.isFinite)).toBe(true);
    }

    const b = triBBox(tris);
    expect(inward(tris, bboxCenter(b)) / tris.length).toBeLessThan(0.4);
    for (let axis = 0; axis < 3; axis++) {
      expect(Math.abs(b.min[axis] - EXPECTED_BOAT_BBOX.min[axis])).toBeLessThanOrEqual(0.03);
      expect(Math.abs(b.max[axis] - EXPECTED_BOAT_BBOX.max[axis])).toBeLessThanOrEqual(0.03);
    }

    const geo = buildPolyGeometry(tris, boxShade);
    expect(geo.getAttribute('position').count).toBe(tris.length * 3);
    geo.dispose();
  });

  it('zodiacBottomY tracks V-hull keel and rises toward bow and tubes', () => {
    expect(zodiacBottomY(0, 0)).toBe(0);
    expect(zodiacBottomY(1.0, 0)).toBeGreaterThan(0.15);
    expect(zodiacBottomY(0, 0.4)).toBeGreaterThan(0.08);
  });

  it('chocks and foam wake build valid geometries with per-vertex alpha on wake', () => {
    const chocks = buildBoatChocksTris(
      [{ wx: 0, wz: 0, gy: 0.1, chockTopY: 0.22 }],
      1,
      0,
      0,
      1,
    );
    expect(chocks.length).toBeGreaterThan(0);
    expect(inward(chocks, bboxCenter(triBBox(chocks))) / chocks.length).toBeLessThan(0.4);

    const wake = buildZodiacWakeGeometry();
    const col = wake.getAttribute('color');
    expect(col.itemSize).toBe(4);
    let hasOpaque = false;
    let hasZeroAlpha = false;
    for (let i = 0; i < col.count; i++) {
      const a = col.getW(i);
      if (a > 0.5) hasOpaque = true;
      if (a === 0) hasZeroAlpha = true;
    }
    expect(hasOpaque).toBe(true);
    expect(hasZeroAlpha).toBe(true);
    wake.dispose();
  });
});

describe('Orcadas low-poly Sea King helicopter and main rotor', () => {
  it('body meets detail, <=2000 tris, outward winding and block-equivalent bbox (±0.03)', () => {
    const tris = buildHelicopterTris();
    const colors = new Set(tris.map((t) => t[3]));
    expect(tris.length).toBeGreaterThanOrEqual(POLY_MIN_TRIS);
    expect(tris.length).toBeLessThanOrEqual(2000);
    expect(colors.size).toBeGreaterThanOrEqual(POLY_MIN_COLORS);
    for (const t of tris) {
      expect(t.slice(0, 3).flat().every(Number.isFinite)).toBe(true);
    }

    const b = triBBox(tris);
    expect(inward(tris, bboxCenter(b)) / tris.length).toBeLessThan(0.35);
    for (let axis = 0; axis < 3; axis++) {
      expect(Math.abs(b.min[axis] - EXPECTED_HELI_BBOX.min[axis])).toBeLessThanOrEqual(0.03);
      expect(Math.abs(b.max[axis] - EXPECTED_HELI_BBOX.max[axis])).toBeLessThanOrEqual(0.03);
    }
  });

  it('main rotor meets detail, <=300 tris, fixed pivot and block-equivalent bbox (±0.03)', () => {
    expect(HELICOPTER_ROTOR_ORIGIN).toEqual([0.08, 0.298, 0]);
    const tris = buildHelicopterRotorTris();
    const colors = new Set(tris.map((t) => t[3]));
    expect(tris.length).toBeGreaterThanOrEqual(POLY_MIN_TRIS);
    expect(tris.length).toBeLessThanOrEqual(300);
    expect(colors.size).toBeGreaterThanOrEqual(POLY_MIN_COLORS);
    for (const t of tris) {
      expect(t.slice(0, 3).flat().every(Number.isFinite)).toBe(true);
    }

    const b = triBBox(tris);
    for (let axis = 0; axis < 3; axis++) {
      expect(Math.abs(b.min[axis] - EXPECTED_ROTOR_BBOX.min[axis])).toBeLessThanOrEqual(0.03);
      expect(Math.abs(b.max[axis] - EXPECTED_ROTOR_BBOX.max[axis])).toBeLessThanOrEqual(0.03);
    }
  });
});

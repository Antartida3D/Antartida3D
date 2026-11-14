import { describe, expect, it } from 'vitest';
// Break the pre-existing stationModels <-> sightingModels -> penguins import cycle in test isolation.
import '../src/voyage/sightingModels.ts';
import {
  POLY_MIN_COLORS,
  POLY_MIN_TRIS,
  shift,
  type Tri,
  type Vec3,
} from '../src/voyage/lowPoly.ts';
import {
  buildElephantSealPolyParts,
  buildPenguinPolyParts,
  buildPenguinShadowGeometry,
  buildRookeryTris,
  buildSealContactGeometry,
  buildWeddellSealPolyParts,
  mirrorZTris,
  SKUA_POLY_MODEL,
  SNOW_PETREL_POLY_MODEL,
} from '../src/orcadas/lowPolyAnimals.ts';
import { PENGUIN_NECK, PENGUIN_SHOULDER } from '../src/orcadas/penguins.ts';
import {
  ELEPHANT_FLIPPER_L,
  ELEPHANT_FLIPPER_R,
  ELEPHANT_JAW,
  ELEPHANT_NECK,
  ELEPHANT_TAIL,
  WEDDELL_FLIPPER_L,
  WEDDELL_FLIPPER_R,
  WEDDELL_NECK,
  WEDDELL_TAIL,
} from '../src/orcadas/seals.ts';
import { BIRD_WING_ROOT, VOXEL_PALETTE } from '../src/orcadas/stationModels.ts';
import { inward } from './polyHelpers.ts';

interface BBox {
  readonly min: readonly [number, number, number];
  readonly max: readonly [number, number, number];
}

function triBBox(tris: readonly Tri[]): BBox {
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
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

function expectBBoxClose(tris: readonly Tri[], expected: BBox, tol = 0.03) {
  const b = triBBox(tris);
  for (let axis = 0; axis < 3; axis++) {
    expect(Math.abs(b.min[axis] - expected.min[axis]), `min[${axis}]`).toBeLessThanOrEqual(tol);
    expect(Math.abs(b.max[axis] - expected.max[axis]), `max[${axis}]`).toBeLessThanOrEqual(tol);
  }
}

function expectOutward(tris: readonly Tri[], maxInwardRatio = 0.25) {
  const b = triBBox(tris);
  expect(inward(tris, bboxCenter(b)) / tris.length).toBeLessThanOrEqual(maxInwardRatio);
}

// Exact bounding boxes measured from the block versions before migration.
const EXPECTED_BBOXES = {
  penguinBody: { min: [-0.23, 0.0, -0.13], max: [0.145, 0.55, 0.13] },
  adelieHead: { min: [-0.08, 0.015, -0.111], max: [0.1925, 0.1725, 0.111] },
  chinstrapHead: { min: [-0.08, -0.02, -0.107], max: [0.1675, 0.1725, 0.107] },
  penguinFlipper: { min: [-0.055, -0.305, -0.021], max: [0.0625, 0.0, 0.019] },
  rookery: { min: [-1.106217, -0.02, -1.150222], max: [1.05, 0.085, 0.830434] },
  weddell: {
    body: { min: [-0.45, 0.025, -0.148], max: [0.34, 0.265, 0.148] },
    head: { min: [-0.005, -0.005, -0.091], max: [0.2225, 0.145, 0.091] },
    flipperR: { min: [-0.07, -0.0175, -0.055], max: [0.07, 0.0175, 0.055] },
    flipperL: { min: [-0.07, -0.0175, -0.055], max: [0.07, 0.0175, 0.055] },
    tail: { min: [-0.175, -0.0275, -0.12], max: [-0.025, 0.0075, 0.12] },
  },
  elephant: {
    body: { min: [-0.52, 0.02, -0.17], max: [0.4, 0.37, 0.17] },
    head: { min: [0.0, -0.07, -0.102], max: [0.2625, 0.16, 0.102] },
    jaw: { min: [-0.02, -0.02, -0.06], max: [0.085, 0.035, 0.06] },
    flipperR: { min: [-0.09, -0.025, -0.065], max: [0.09, 0.0225, 0.1] },
    flipperL: { min: [-0.09, -0.025, -0.1], max: [0.09, 0.0225, 0.065] },
    tail: { min: [-0.24, -0.05, -0.135], max: [-0.01, 0.03, 0.135] },
  },
  skua: {
    body: { min: [-0.45, -0.085, -0.11], max: [0.4775, 0.1, 0.11] },
    wing: { min: [-0.1425, -0.0175, 0.0], max: [0.125, 0.024, 0.755] },
  },
  petrel: {
    body: { min: [-0.44, -0.0745, -0.1], max: [0.445, 0.0855, 0.1] },
    wing: { min: [-0.1475, -0.015, 0.0], max: [0.115, 0.019, 0.76] },
  },
} as const;

describe('Orcadas low-poly animals and rookery', () => {
  it('keeps animation pivots unchanged', () => {
    expect(PENGUIN_NECK).toEqual([0, 0.53, 0]);
    expect(PENGUIN_SHOULDER).toEqual([-0.01, 0.47, 0.15]);
    expect(WEDDELL_NECK).toEqual([0.26, 0.18, 0]);
    expect(WEDDELL_FLIPPER_R).toEqual([0.18, 0.05, 0.17]);
    expect(WEDDELL_FLIPPER_L).toEqual([0.18, 0.05, -0.17]);
    expect(WEDDELL_TAIL).toEqual([-0.38, 0.07, 0]);
    expect(ELEPHANT_NECK).toEqual([0.3, 0.28, 0]);
    expect(ELEPHANT_JAW).toEqual([0.42, 0.27, 0]);
    expect(ELEPHANT_FLIPPER_R).toEqual([0.2, 0.06, 0.2]);
    expect(ELEPHANT_FLIPPER_L).toEqual([0.2, 0.06, -0.2]);
    expect(ELEPHANT_TAIL).toEqual([-0.46, 0.08, 0]);
    expect(BIRD_WING_ROOT).toEqual([0.02, 0.05, 0.06]);
  });

  for (const species of ['adelie', 'chinstrap'] as const) {
    it(`${species} penguin meets detail, triangle budget (<= 300), outward winding and part bounds`, () => {
      const parts = buildPenguinPolyParts(species);
      const assembled = [
        ...parts.body,
        ...shift(parts.head, ...PENGUIN_NECK),
        ...shift(parts.flipper, PENGUIN_SHOULDER[0], PENGUIN_SHOULDER[1], PENGUIN_SHOULDER[2]),
        ...shift(parts.flipper, PENGUIN_SHOULDER[0], PENGUIN_SHOULDER[1], -PENGUIN_SHOULDER[2]),
      ];

      expect(assembled.length).toBeGreaterThanOrEqual(POLY_MIN_TRIS);
      expect(assembled.length).toBeLessThanOrEqual(300);
      expect(new Set(assembled.map((t) => t[3])).size).toBeGreaterThanOrEqual(POLY_MIN_COLORS);
      for (const t of assembled) {
        expect(t.slice(0, 3).flat().every(Number.isFinite)).toBe(true);
      }

      expectOutward(parts.body, 0.15);
      expectOutward(parts.head, 0.2);
      expectOutward(parts.flipper, 0.05);

      expectBBoxClose(parts.body, EXPECTED_BBOXES.penguinBody);
      expectBBoxClose(parts.head, species === 'adelie' ? EXPECTED_BBOXES.adelieHead : EXPECTED_BBOXES.chinstrapHead);
      expectBBoxClose(parts.flipper, EXPECTED_BBOXES.penguinFlipper);
    });
  }

  it('penguin rookery meets detail, triangle budget (<= 4000), outward winding and bounds', () => {
    const tris = buildRookeryTris();
    expect(tris.length).toBeGreaterThanOrEqual(POLY_MIN_TRIS);
    expect(tris.length).toBeLessThanOrEqual(4000);
    expect(new Set(tris.map((t) => t[3])).size).toBeGreaterThanOrEqual(3);
    for (const t of tris) {
      expect(t.slice(0, 3).flat().every(Number.isFinite)).toBe(true);
    }
    expectOutward(tris, 0.5);
    // The rock outcrops are half sunk into the knoll: compare what stands above the ground (y >= 0).
    const above = tris.filter(([a, b, c]) => Math.min(a[1], b[1], c[1]) >= 0);
    const { min, max } = triBBox(above);
    for (const axis of [0, 2]) {
      expect(Math.abs(min[axis] - EXPECTED_BBOXES.rookery.min[axis])).toBeLessThanOrEqual(0.03);
      expect(Math.abs(max[axis] - EXPECTED_BBOXES.rookery.max[axis])).toBeLessThanOrEqual(0.03);
    }
    expect(Math.abs(max[1] - EXPECTED_BBOXES.rookery.max[1])).toBeLessThanOrEqual(0.12);
  });

  it('Weddell seal meets detail, triangle budget (<= 800), outward winding and part bounds', () => {
    const parts = buildWeddellSealPolyParts();
    const assembled = [
      ...parts.body,
      ...shift(parts.head, ...WEDDELL_NECK),
      ...shift(parts.flipperR, ...WEDDELL_FLIPPER_R),
      ...shift(parts.flipperL, ...WEDDELL_FLIPPER_L),
      ...shift(parts.tail, ...WEDDELL_TAIL),
    ];

    expect(assembled.length).toBeGreaterThanOrEqual(POLY_MIN_TRIS);
    expect(assembled.length).toBeLessThanOrEqual(800);
    expect(new Set(assembled.map((t) => t[3])).size).toBeGreaterThanOrEqual(4);
    for (const t of assembled) {
      expect(t.slice(0, 3).flat().every(Number.isFinite)).toBe(true);
    }

    expectOutward(parts.body, 0.05);
    expectOutward(parts.head, 0.25);
    expectOutward(parts.flipperR, 0.05);
    expectOutward(parts.flipperL, 0.05);
    expectOutward(parts.tail, 0.25);

    expectBBoxClose(parts.body, EXPECTED_BBOXES.weddell.body);
    expectBBoxClose(parts.head, EXPECTED_BBOXES.weddell.head);
    expectBBoxClose(parts.flipperR, EXPECTED_BBOXES.weddell.flipperR);
    expectBBoxClose(parts.flipperL, EXPECTED_BBOXES.weddell.flipperL);
    expectBBoxClose(parts.tail, EXPECTED_BBOXES.weddell.tail);
  });

  it('Elephant seal meets detail, triangle budget (<= 800), outward winding and part bounds', () => {
    const parts = buildElephantSealPolyParts();
    const assembled = [
      ...parts.body,
      ...shift(parts.head, ...ELEPHANT_NECK),
      ...shift(parts.jaw ?? [], ...ELEPHANT_JAW),
      ...shift(parts.flipperR, ...ELEPHANT_FLIPPER_R),
      ...shift(parts.flipperL, ...ELEPHANT_FLIPPER_L),
      ...shift(parts.tail, ...ELEPHANT_TAIL),
    ];

    expect(assembled.length).toBeGreaterThanOrEqual(POLY_MIN_TRIS);
    expect(assembled.length).toBeLessThanOrEqual(800);
    expect(new Set(assembled.map((t) => t[3])).size).toBeGreaterThanOrEqual(4);
    for (const t of assembled) {
      expect(t.slice(0, 3).flat().every(Number.isFinite)).toBe(true);
    }

    expectOutward(parts.body, 0.05);
    expectOutward(parts.head, 0.2);
    expectOutward(parts.jaw ?? [], 0.05);
    expectOutward(parts.flipperR, 0.05);
    expectOutward(parts.flipperL, 0.05);
    expectOutward(parts.tail, 0.25);

    expectBBoxClose(parts.body, EXPECTED_BBOXES.elephant.body);
    expectBBoxClose(parts.head, EXPECTED_BBOXES.elephant.head);
    expectBBoxClose(parts.jaw ?? [], EXPECTED_BBOXES.elephant.jaw);
    expectBBoxClose(parts.flipperR, EXPECTED_BBOXES.elephant.flipperR);
    expectBBoxClose(parts.flipperL, EXPECTED_BBOXES.elephant.flipperL);
    expectBBoxClose(parts.tail, EXPECTED_BBOXES.elephant.tail);
  });

  for (const [name, model, expected] of [
    ['skua', SKUA_POLY_MODEL, EXPECTED_BBOXES.skua],
    ['snowPetrel', SNOW_PETREL_POLY_MODEL, EXPECTED_BBOXES.petrel],
  ] as const) {
    it(`${name} meets detail, triangle budget (<= 250), outward winding and part bounds`, () => {
      const leftWing = mirrorZTris(model.wing);
      const assembled = [
        ...model.body,
        ...shift(model.wing, ...BIRD_WING_ROOT),
        ...shift(leftWing, BIRD_WING_ROOT[0], BIRD_WING_ROOT[1], -BIRD_WING_ROOT[2]),
      ];

      expect(assembled.length).toBeGreaterThanOrEqual(POLY_MIN_TRIS);
      expect(assembled.length).toBeLessThanOrEqual(250);
      expect(new Set(assembled.map((t) => t[3])).size).toBeGreaterThanOrEqual(POLY_MIN_COLORS);
      for (const t of assembled) {
        expect(t.slice(0, 3).flat().every(Number.isFinite)).toBe(true);
      }

      expectOutward(model.body, 0.25);
      expectOutward(model.wing, 0.2);
      expectOutward(leftWing, 0.2);

      expectBBoxClose(model.body, expected.body);
      expectBBoxClose(model.wing, expected.wing);
    });
  }

  it('includes species-distinctive traits and vertex-alpha contact geometries', () => {
    const adelieHeadCols = new Set(buildPenguinPolyParts('adelie').head.map((t) => t[3]));
    expect(adelieHeadCols.has(VOXEL_PALETTE.WHITE)).toBe(true);
    expect(adelieHeadCols.has(VOXEL_PALETTE.RED)).toBe(true);

    const chinstrapHeadCols = new Set(buildPenguinPolyParts('chinstrap').head.map((t) => t[3]));
    expect(chinstrapHeadCols.has(VOXEL_PALETTE.WHITE)).toBe(true);
    expect(chinstrapHeadCols.has(VOXEL_PALETTE.BLACK)).toBe(true);

    const weddellCols = new Set(buildWeddellSealPolyParts().body.map((t) => t[3]));
    expect(weddellCols.has(VOXEL_PALETTE.SEAL_SPOT)).toBe(true);
    expect(weddellCols.has(VOXEL_PALETTE.SEAL_BELLY)).toBe(true);

    const elephant = buildElephantSealPolyParts();
    expect(new Set(elephant.jaw?.map((t) => t[3])).has(VOXEL_PALETTE.RED)).toBe(true);
    expect(new Set(elephant.head.map((t) => t[3])).has(VOXEL_PALETTE.BROWN)).toBe(true);

    expect(new Set(SKUA_POLY_MODEL.wing.map((t) => t[3])).has(VOXEL_PALETTE.WHITE)).toBe(true);
    expect(new Set(SNOW_PETREL_POLY_MODEL.body.map((t) => t[3])).has(VOXEL_PALETTE.WHITE)).toBe(true);
    expect(new Set(SNOW_PETREL_POLY_MODEL.body.map((t) => t[3])).has(VOXEL_PALETTE.BLACK)).toBe(true);

    for (const geo of [
      buildPenguinShadowGeometry(),
      buildSealContactGeometry('weddell'),
      buildSealContactGeometry('elephant'),
    ]) {
      const color = geo.getAttribute('color');
      expect(color.itemSize).toBe(4);
      const alphas = Array.from({ length: color.count }, (_, i) => color.getW(i));
      expect(Math.max(...alphas)).toBeGreaterThan(0);
      expect(Math.min(...alphas)).toBe(0);
      geo.dispose();
    }
  });
});

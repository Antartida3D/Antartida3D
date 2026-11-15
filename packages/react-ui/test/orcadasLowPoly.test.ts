import { describe, expect, it } from 'vitest';
// Break the pre-existing stationModels <-> sightingModels -> penguins import cycle in test isolation.
import '../src/voyage/sightingModels.ts';
import {
  boxShade,
  buildPolyGeometry,
  normalOf,
  POLY_MIN_COLORS,
  POLY_MIN_TRIS,
  PRESHADED,
  shift,
  type Tri,
  type Vec3,
} from '../src/voyage/lowPoly.ts';
import {
  FLAG_COLS,
  FLAG_HALF_HEIGHT,
  FLAG_LENGTH,
  buildFlagTris,
  buildFlagpoleBaseTris,
  buildHelipadTris,
  buildModuleTris,
  buildOmondTris,
  buildRadioTowerTris,
  buildStevensonDoorTris,
  buildStevensonInstrumentsTris,
  buildStevensonScreenTris,
  buildWindCupsTris,
  buildWindMastBaseTris,
  buildWindVaneTris,
  SCREEN_DOOR_DURATION,
  SCREEN_DOOR_HINGE,
  SCREEN_DOOR_OPEN_ANGLE,
  screenDoorAngle,
} from '../src/orcadas/lowPolyBuildings.ts';
import { buildStageDetailTris, VOXEL_PALETTE } from '../src/orcadas/stationModels.ts';
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

// Measured from the block versions in stationModels.ts before removal.
const EXPECTED_BBOXES = {
  moduleRound: { min: [-2.43, 0, -0.882], max: [2.57, 0.664372, 0.882] },
  moduleGabled: { min: [-1.64, 0, -0.95], max: [1.77, 0.5, 0.95] },
  moduleFlat: { min: [-3.12, 0, -0.832], max: [3.27, 0.62, 0.832] },
  // Omond lowered from 0.85 to 0.571: roofless ruin without timber roof remnant or tall chimney (Cool Antarctica).
  omond: { min: [-1.285714, 0, -0.657143], max: [1.285714, 0.571, 0.802143] },
  radioTower5: { min: [-0.3, 0, -0.3], max: [0.3, 5.3, 0.3] },
  stevensonScreen: { min: [-0.64, 0, -0.57], max: [0.64, 1.98, 1.06] },
  windMastBase: { min: [-0.74, 0, -0.74], max: [0.74, 4.35, 0.74] },
  windVane: { min: [-0.64, -0.07, -0.08], max: [0.7, 0.17, 0.08] },
  windCups: { min: [-0.35, -0.17, -0.54], max: [0.62, 0.12, 0.54] },
  flagpoleBase: { min: [-0.67, 0, -0.67], max: [0.66, 5, 0.66] },
  flag: { min: [-0.016, -FLAG_HALF_HEIGHT, -0.022], max: [FLAG_LENGTH, FLAG_HALF_HEIGHT, 0.022] },
  helipad3: { min: [-1.5, 0, -1.5], max: [1.5, 0.128, 1.5] },
} as const;

const MODELS: readonly {
  name: string;
  tris: Tri[];
  expected: BBox;
  maxTris?: number;
}[] = [
  {
    name: 'moduleRound-day',
    tris: buildModuleTris(4.8, 1.7, 0.67, 'orange', 'round', false),
    expected: EXPECTED_BBOXES.moduleRound,
    maxTris: 1500,
  },
  {
    name: 'moduleRound-night',
    tris: buildModuleTris(4.8, 1.7, 0.67, 'orange', 'round', true),
    expected: EXPECTED_BBOXES.moduleRound,
    maxTris: 1500,
  },
  {
    name: 'moduleGabled-day',
    tris: buildModuleTris(3.2, 1.8, 0.5, 'orange', 'gabled', false),
    expected: EXPECTED_BBOXES.moduleGabled,
    maxTris: 1500,
  },
  {
    name: 'moduleGabled-night',
    tris: buildModuleTris(3.2, 1.8, 0.5, 'orange', 'gabled', true),
    expected: EXPECTED_BBOXES.moduleGabled,
    maxTris: 1500,
  },
  {
    name: 'moduleFlat-day',
    tris: buildModuleTris(6.2, 1.6, 0.5, 'unknown', 'flat', false),
    expected: EXPECTED_BBOXES.moduleFlat,
    maxTris: 1500,
  },
  {
    name: 'moduleFlat-night',
    tris: buildModuleTris(6.2, 1.6, 0.5, 'unknown', 'flat', true),
    expected: EXPECTED_BBOXES.moduleFlat,
    maxTris: 1500,
  },
  {
    name: 'omond',
    tris: buildOmondTris(false),
    expected: EXPECTED_BBOXES.omond,
    maxTris: 1800, // about 90 dry-stone blocks of 18 faces each
  },
  {
    name: 'radioTower-5',
    tris: buildRadioTowerTris(5),
    expected: EXPECTED_BBOXES.radioTower5,
    maxTris: 2500,
  },
  {
    name: 'stevensonScreen',
    tris: buildStevensonScreenTris(),
    expected: EXPECTED_BBOXES.stevensonScreen,
    maxTris: 1000,
  },
  {
    name: 'windMastBase',
    tris: buildWindMastBaseTris(),
    expected: EXPECTED_BBOXES.windMastBase,
    maxTris: 1000,
  },
  {
    name: 'windVane',
    tris: buildWindVaneTris(),
    expected: EXPECTED_BBOXES.windVane,
    maxTris: 1000,
  },
  {
    name: 'windCups',
    tris: buildWindCupsTris(),
    expected: EXPECTED_BBOXES.windCups,
    maxTris: 1000,
  },
  {
    name: 'helipad-3',
    tris: buildHelipadTris(3),
    expected: EXPECTED_BBOXES.helipad3,
    maxTris: 1000,
  },
];

describe('Orcadas low-poly buildings and structures', () => {
  for (const m of MODELS) {
    it(`${m.name} meets detail, finite vertices, outward winding and bounding box`, () => {
      const colors = new Set(m.tris.map((t) => t[3]));
      expect(m.tris.length).toBeGreaterThanOrEqual(POLY_MIN_TRIS);
      if (m.maxTris) expect(m.tris.length).toBeLessThanOrEqual(m.maxTris);
      expect(colors.size).toBeGreaterThanOrEqual(POLY_MIN_COLORS);
      for (const t of m.tris) {
        expect(t.slice(0, 3).flat().every(Number.isFinite)).toBe(true);
      }

      const b = triBBox(m.tris);
      // Composite models (4-legged towers, recessed frames, overhangs) have local inward-facing faces
      // toward the global center, but the majority of faces must still point outward.
      expect(inward(m.tris, bboxCenter(b)) / m.tris.length).toBeLessThan(0.5);
      for (let axis = 0; axis < 3; axis++) {
        expect(Math.abs(b.min[axis] - m.expected.min[axis])).toBeLessThanOrEqual(0.02);
        expect(Math.abs(b.max[axis] - m.expected.max[axis])).toBeLessThanOrEqual(0.02);
      }
    });
  }

  it('flagpole base + continuous flag meet detail, finite vertices, no column gaps, and 360-degree Sol de Mayo', () => {
    const base = buildFlagpoleBaseTris();
    const flag = buildFlagTris();

    const combined: Tri[] = [
      ...base,
      ...shift(flag, 0, 3.95, 0),
    ];
    const colors = new Set(combined.map((t) => t[3]));
    expect(combined.length).toBeGreaterThanOrEqual(POLY_MIN_TRIS);
    expect(combined.length).toBeLessThanOrEqual(1000);
    expect(colors.size).toBeGreaterThanOrEqual(POLY_MIN_COLORS);
    for (const t of combined) {
      expect(t.slice(0, 3).flat().every(Number.isFinite)).toBe(true);
    }

    const baseBox = triBBox(base);
    expect(inward(base, bboxCenter(baseBox)) / base.length).toBeLessThan(0.5);
    for (let axis = 0; axis < 3; axis++) {
      expect(Math.abs(baseBox.min[axis] - EXPECTED_BBOXES.flagpoleBase.min[axis])).toBeLessThanOrEqual(0.02);
      expect(Math.abs(baseBox.max[axis] - EXPECTED_BBOXES.flagpoleBase.max[axis])).toBeLessThanOrEqual(0.02);
    }

    const flagBox = triBBox(flag);
    for (let axis = 0; axis < 3; axis++) {
      expect(Math.abs(flagBox.min[axis] - EXPECTED_BBOXES.flag.min[axis])).toBeLessThanOrEqual(0.02);
      expect(Math.abs(flagBox.max[axis] - EXPECTED_BBOXES.flag.max[axis])).toBeLessThanOrEqual(0.02);
    }

    // Cloth continuity: every interior column boundary shares identical vertices on left and right sides
    const clothTris = flag.filter((t) => t[3] === VOXEL_PALETTE.SKY || t[3] === VOXEL_PALETTE.WHITE);
    for (let col = 1; col < FLAG_COLS; col++) {
      const boundaryX = (col / FLAG_COLS) * FLAG_LENGTH;
      const leftSideVerts = new Set<string>();
      const rightSideVerts = new Set<string>();
      for (const [a, b, c] of clothTris) {
        const xs = [a[0], b[0], c[0]];
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        for (const p of [a, b, c]) {
          if (Math.abs(p[0] - boundaryX) > 1e-6) continue;
          const key = `${p[1].toFixed(5)},${p[2].toFixed(5)}`;
          if (maxX <= boundaryX + 1e-6) leftSideVerts.add(key);
          if (minX >= boundaryX - 1e-6) rightSideVerts.add(key);
        }
      }
      expect(leftSideVerts.size).toBeGreaterThan(0);
      expect(leftSideVerts).toEqual(rightSideVerts);
    }

    // Sol de Mayo: 16 rays spanning all 360 degrees on both faces, strictly clear of cloth z = +-0.008
    const sunX = FLAG_LENGTH / 2;
    const sunTris = flag.filter((t) => t[3] === VOXEL_PALETTE.ORANGE);
    expect(sunTris.length).toBeGreaterThanOrEqual(64);
    for (const sideSign of [-1, 1] as const) {
      const faceSunTris = sunTris.filter((t) => sideSign * t[0][2] > 0.015);
      expect(faceSunTris.length).toBeGreaterThanOrEqual(32);
      const rayTipSectors = new Set<number>();
      for (const [a, b, c] of faceSunTris) {
        for (const p of [a, b, c]) {
          const r = Math.hypot(p[0] - sunX, p[1]);
          if (r > 0.10) {
            const ang = ((Math.atan2(p[1], p[0] - sunX) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
            rayTipSectors.add(Math.floor((ang / (Math.PI * 2)) * 16 + 0.5) % 16);
          }
        }
      }
      expect(rayTipSectors.size).toBe(16);
    }
  });

  it('night windows switch to LAMP colour', () => {
    const dayColors = new Set(buildModuleTris(4.8, 1.7, 0.67, 'orange', 'round', false).map((t) => t[3]));
    const nightColors = new Set(buildModuleTris(4.8, 1.7, 0.67, 'orange', 'round', true).map((t) => t[3]));
    expect(dayColors.has(VOXEL_PALETTE.WINDOW_DAY)).toBe(true);
    expect(dayColors.has(VOXEL_PALETTE.LAMP)).toBe(false);
    expect(nightColors.has(VOXEL_PALETTE.LAMP)).toBe(true);
    expect(nightColors.has(VOXEL_PALETTE.WINDOW_DAY)).toBe(false);
  });

  it('wind vane and cups keep rotation pivot and bounding center', () => {
    const vaneCenter = bboxCenter(triBBox(buildWindVaneTris()));
    expect(Math.abs(vaneCenter[0])).toBeLessThanOrEqual(0.02);
    expect(Math.abs(vaneCenter[2])).toBeLessThanOrEqual(0.02);

    const cupsCenter = bboxCenter(triBBox(buildWindCupsTris()));
    expect(Math.abs(cupsCenter[2])).toBeLessThanOrEqual(0.02);
  });

  it('Omond House is a roofless ruin with no wide flat faces above 70% of wall height', () => {
    const tris = buildOmondTris(false);
    const maxWallY = triBBox(tris).max[1];
    const thresholdY = maxWallY * 0.7;
    const roofFaces = tris.filter((t) => {
      const avgY = (t[0][1] + t[1][1] + t[2][1]) / 3;
      // A roof is a wide flat face; the chamfered top of a wall stone is no wider than a stone.
      const xs = [t[0][0], t[1][0], t[2][0]];
      const zs = [t[0][2], t[1][2], t[2][2]];
      const wide = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs)) > 0.45;
      return avgY > thresholdY && Math.abs(normalOf(t)[1]) > 0.85 && wide;
    });
    expect(roofFaces).toHaveLength(0);
  });

  it('StageDetails meets detail, triangle budget (<= 6000), and finite vertices', () => {
    const tris = buildStageDetailTris();
    const colors = new Set(tris.map((t) => t[3]));
    expect(tris.length).toBeGreaterThanOrEqual(POLY_MIN_TRIS);
    expect(tris.length).toBeLessThanOrEqual(6000);
    expect(colors.size).toBeGreaterThanOrEqual(POLY_MIN_COLORS);
    for (const t of tris) {
      expect(t.slice(0, 3).flat().every(Number.isFinite)).toBe(true);
    }
  });

  it('boxShade reproduces buildBoxGeometry face shading', () => {
    expect(boxShade([1, 0, 0])).toBeCloseTo(0.82, 6);
    expect(boxShade([-1, 0, 0])).toBeCloseTo(0.7, 6);
    expect(boxShade([0, 1, 0])).toBeCloseTo(1, 6);
    expect(boxShade([0, -1, 0])).toBeCloseTo(0.5, 6);
    expect(boxShade([0, 0, 1])).toBeCloseTo(0.9, 6);
    expect(boxShade([0, 0, -1])).toBeCloseTo(0.62, 6);

    const tri: Tri = [[0, 0, 0], [0, 0, 1], [1, 0, 0], 0xffffff];
    const geo = buildPolyGeometry([tri], boxShade);
    const col = geo.getAttribute('color').array as Float32Array;
    expect(col[0]).toBeCloseTo(1, 4);

    const preshadedTri: Tri = [[0, 0, 0], [0, 0, 1], [1, 0, 0], PRESHADED + 0xffffff];
    const pGeo = buildPolyGeometry([preshadedTri], () => 0.1);
    const pCol = pGeo.getAttribute('color').array as Float32Array;
    expect(pCol[0]).toBeCloseTo(1, 4);
  });

  it('Stevenson door and instruments meet detail, outward winding, containment and closed bbox', () => {
    const body = buildStevensonScreenTris();
    const door = buildStevensonDoorTris();
    const instruments = buildStevensonInstrumentsTris();

    for (const [name, tris] of [
      ['stevensonDoor', door],
      ['stevensonInstruments', instruments],
    ] as const) {
      const colors = new Set(tris.map((t) => t[3]));
      expect(tris.length, name).toBeGreaterThanOrEqual(POLY_MIN_TRIS);
      expect(colors.size, name).toBeGreaterThanOrEqual(POLY_MIN_COLORS);
      for (const t of tris) {
        expect(t.slice(0, 3).flat().every(Number.isFinite)).toBe(true);
      }
      const box = triBBox(tris);
      expect(inward(tris, bboxCenter(box)) / tris.length, name).toBeLessThan(0.5);
    }

    const closedCombined = [...body, ...shift(door, ...SCREEN_DOOR_HINGE)];
    const closedBox = triBBox(closedCombined);
    for (let axis = 0; axis < 3; axis++) {
      expect(Math.abs(closedBox.min[axis] - EXPECTED_BBOXES.stevensonScreen.min[axis])).toBeLessThanOrEqual(0.02);
      expect(Math.abs(closedBox.max[axis] - EXPECTED_BBOXES.stevensonScreen.max[axis])).toBeLessThanOrEqual(0.02);
    }

    const bodyBox = triBBox(body);
    const instBox = triBBox(instruments);
    for (let axis = 0; axis < 3; axis++) {
      expect(instBox.min[axis]).toBeGreaterThanOrEqual(bodyBox.min[axis]);
      expect(instBox.max[axis]).toBeLessThanOrEqual(bodyBox.max[axis]);
    }
  });

  it('screenDoorAngle animates smoothly between 0 and ~110 deg and jumps when reduced', () => {
    expect(screenDoorAngle(false, SCREEN_DOOR_DURATION, false)).toBe(0);
    expect(screenDoorAngle(true, 0, false)).toBe(0);

    const mid = screenDoorAngle(true, SCREEN_DOOR_DURATION / 2, false);
    expect(mid).toBeCloseTo(SCREEN_DOOR_OPEN_ANGLE / 2, 6);

    const early = screenDoorAngle(true, SCREEN_DOOR_DURATION * 0.25, false);
    expect(early).toBeGreaterThan(0);
    expect(early).toBeLessThan(SCREEN_DOOR_OPEN_ANGLE * 0.25);

    expect(screenDoorAngle(true, SCREEN_DOOR_DURATION, false)).toBeCloseTo(SCREEN_DOOR_OPEN_ANGLE, 6);
    expect(screenDoorAngle(true, SCREEN_DOOR_DURATION * 2, false)).toBeCloseTo(SCREEN_DOOR_OPEN_ANGLE, 6);

    // Reduced motion jumps straight to target with no intermediate values
    expect(screenDoorAngle(true, 0, true)).toBeCloseTo(SCREEN_DOOR_OPEN_ANGLE, 6);
    expect(screenDoorAngle(true, SCREEN_DOOR_DURATION * 0.25, true)).toBeCloseTo(SCREEN_DOOR_OPEN_ANGLE, 6);
    expect(screenDoorAngle(false, 0, true)).toBe(0);
    expect(screenDoorAngle(false, SCREEN_DOOR_DURATION * 0.25, true)).toBe(0);

    // Closing returns smoothly to 0
    expect(screenDoorAngle(false, 0, false)).toBeCloseTo(SCREEN_DOOR_OPEN_ANGLE, 6);
    expect(screenDoorAngle(false, SCREEN_DOOR_DURATION / 2, false)).toBeCloseTo(SCREEN_DOOR_OPEN_ANGLE / 2, 6);
    expect(screenDoorAngle(false, SCREEN_DOOR_DURATION, false)).toBe(0);
  });
});

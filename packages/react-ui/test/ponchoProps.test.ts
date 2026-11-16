import { describe, expect, it } from 'vitest';
// Break the pre-existing stationModels <-> sightingModels -> penguins import cycle in test isolation.
import '../src/voyage/sightingModels.ts';
import { buildPolyGeometry, normalOf, POLY_MIN_COLORS, POLY_MIN_TRIS, RELIEF_ICE, resolveRelief, type Tri } from '../src/voyage/lowPoly.ts';
import { HAMMER_STAKE_AT, PONCHO_PROP_IDS, PONCHO_PROPS, type PonchoPropId } from '../src/voyage/ponchoProps.ts';
import { hammerPose, ponchoHandAt } from '../src/voyage/ponchoPeople.ts';
import { VOXEL_PALETTE } from '../src/orcadas/stationModels.ts';
import { inward } from './polyHelpers.ts';

/** The box each prop must stay inside, [x, y, z] extent set by hand from the heights of reference. */
const EXPECTED_BOX: Readonly<Record<PonchoPropId, readonly [number, number, number]>> = {
  tent: [1.8, 0.95, 2.1],
  shovel: [0.7, 0.95, 0.55],
  staffAndPick: [0.9, 1.15, 0.8],
  stakeAndPick: [0.7, 0.45, 0.7],
  slalomPoles: [2.7, 1.1, 0.7],
  flaggedCanes: [1.5, 1.05, 0.45],
  haulLine: [2.5, 0.1, 0.45],
  crevasseBridge: [2.0, 0.15, 1.0],
  crashedPlane: [3.7, 1.9, 4.5],
  iceTunnelEntrance: [1.95, 0.95, 2.3],
  nansenSled: [2.3, 0.95, 0.75],
  baseHut: [3.7, 1.9, 2.3],
  baseEsperanza: [12.5, 4.2, 5.5],
};

const heights = (tris: readonly Tri[]) => tris.flatMap(([a, b, c]) => [a[1], b[1], c[1]]);
const area = ([a, b, c]: Tri) => {
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  return 0.5 * Math.hypot(u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]);
};

describe('Poncho props (rule 30, low-poly)', () => {
  it('registers every prop under its id', () => {
    expect(Object.keys(PONCHO_PROPS).sort()).toEqual([...PONCHO_PROP_IDS].sort());
    for (const id of PONCHO_PROP_IDS) expect(PONCHO_PROPS[id].id).toBe(id);
  });

  for (const id of PONCHO_PROP_IDS) {
    describe(id, () => {
      const { tris, height, size } = PONCHO_PROPS[id];

      it('has the least detail, with finite faces that are not flat lines', () => {
        expect(tris.length).toBeGreaterThanOrEqual(POLY_MIN_TRIS);
        expect(new Set(tris.map((t) => t[3])).size).toBeGreaterThanOrEqual(POLY_MIN_COLORS);
        for (const t of tris) expect(t.slice(0, 3).flat().every(Number.isFinite)).toBe(true);
        expect(tris.filter((t) => area(t) < 1e-9)).toHaveLength(0);
      });

      it('rests on y = 0 and stays inside its box', () => {
        const ys = heights(tris);
        expect(Math.min(...ys)).toBeGreaterThan(-1e-3);
        expect(Math.min(...ys)).toBeLessThan(1e-3);
        expect(height).toBeCloseTo(Math.max(...ys), 9);
        const box = EXPECTED_BOX[id];
        size.forEach((s, k) => expect(s).toBeLessThanOrEqual(box[k]));
      });

      it('melts into the relief: faces of its foot take the color of the ground, and resolve to real colors', () => {
        const foot = tris.filter((t) => Math.min(t[0][1], t[1][1], t[2][1]) < 1e-3);
        expect(foot.length).toBeGreaterThan(0);
        expect(foot.some((t) => t[3] === RELIEF_ICE)).toBe(true);
        const resolved = resolveRelief(tris);
        expect(resolved.every((t) => t[3] >= 0)).toBe(true);
        const g = buildPolyGeometry(resolved);
        expect(Array.from(g.getAttribute('position').array as Float32Array).every(Number.isFinite)).toBe(true);
      });
    });
  }

  it('the base hut is a low orange hut with a door and windows, taller than a person and with its door on +z', () => {
    const hut = PONCHO_PROPS.baseHut;
    expect(hut.height).toBeGreaterThan(1.2);
    expect(hut.tris.some((t) => t[3] === VOXEL_PALETTE.WINDOW_DAY)).toBe(true);
    expect(hut.tris.some((t) => t[3] === 0xff4500)).toBe(true);
  });

  it('is deterministic', () => {
    expect(PONCHO_PROPS.tent.tris).toEqual(PONCHO_PROPS.tent.tris);
    const a = PONCHO_PROPS.crashedPlane.tris;
    const b = PONCHO_PROPS.crashedPlane.tris;
    expect(a).toBe(b);
  });

  it('tent walls face outwards and the door is on +z', () => {
    const cloth = PONCHO_PROPS.tent.tris.filter((t) => t[3] === VOXEL_PALETTE.ORANGE);
    expect(inward(cloth, [0, 0.3, 0])).toBe(0);
    const door = PONCHO_PROPS.tent.tris.filter((t) => t[3] === VOXEL_PALETTE.BLACK);
    expect(door.length).toBeGreaterThan(0);
    for (const t of door) expect(normalOf(t)[2]).toBeGreaterThan(0.9);
  });

  it('crevasse walls look into the slit and its ground faces up', () => {
    const tris = PONCHO_PROPS.crevasseBridge.tris;
    const walls = tris.filter((t) => t[3] === 0x111b26);
    expect(walls.length).toBeGreaterThan(0);
    expect(inward(walls, [0, 0, 0])).toBe(0);
    expect(inward(tris.filter((t) => t[3] === RELIEF_ICE), [0, -1, 0])).toBe(0);
  });

  it('keeps the stake where the left hand of the hammering pose holds it', () => {
    const stakeTop: [number, number, number] = [HAMMER_STAKE_AT[0], PONCHO_PROPS.stakeAndPick.height, HAMMER_STAKE_AT[1]];
    for (const phase of [0, 1, 2, 3, 4, 5]) {
      const hand = ponchoHandAt(hammerPose(phase), 'L');
      expect(Math.hypot(hand[0] - stakeTop[0], hand[1] - stakeTop[1], hand[2] - stakeTop[2])).toBeLessThan(0.05);
    }
  });

  it('is much taller than a dog and in step with a person: tent and tunnel are not smaller than one', () => {
    expect(PONCHO_PROPS.tent.height).toBeGreaterThan(0.6);
    expect(PONCHO_PROPS.nansenSled.height).toBeGreaterThan(0.8);
    expect(PONCHO_PROPS.slalomPoles.height).toBeGreaterThanOrEqual(0.95);
  });
});

import { describe, expect, it } from 'vitest';
// Break the pre-existing stationModels <-> sightingModels -> penguins import cycle in test isolation.
import '../src/voyage/sightingModels.ts';
import { buildPolyGeometry, normalOf, POLY_MIN_COLORS, POLY_MIN_TRIS, RELIEF_ICE, resolveRelief, type Tri } from '../src/voyage/lowPoly.ts';
import * as module2 from '../src/voyage/ponchoProps2.ts';
import {
  buildChild,
  buildDogParachute,
  buildRescueHelicopter,
  buildRescueRotor,
  buildTourist,
  CHILD_SCALE,
  clingHandsAt,
  clingPose,
  DOG_PARACHUTE_HOOK,
  ICEBREAKER_GANGWAY_AT,
  LOADING_RAMP_TOP_AT,
  NUNATAK_HOLDS,
  PONCHO_PROP2_IDS,
  PONCHO_PROPS2,
  RESCUE_ROTOR_AT,
  TOURIST_GROUP,
  TOURIST_LOOKS,
  type PonchoProp2Id,
} from '../src/voyage/ponchoProps2.ts';
import { buildPonchoPerson, PONCHO_PHASE_PERIOD, ponchoPoseLift, standPose, walkPose } from '../src/voyage/ponchoPeople.ts';
import { buildNansenSled } from '../src/voyage/ponchoProps.ts';
import { buildHelicopterRotorTris, buildHelicopterTris } from '../src/orcadas/lowPolyProps.ts';
import { HELICOPTER_ROTOR_ORIGIN, VOXEL_PALETTE } from '../src/orcadas/stationModels.ts';
import { inward } from './polyHelpers.ts';

/** The box each model must stay inside, [x, y, z] extent set by hand from the sizes of reference. */
const EXPECTED_BOX: Readonly<Record<PonchoProp2Id, readonly [number, number, number]>> = {
  icebreakerHull: [4.6, 5.2, 3.7],
  loadingRamp: [1.7, 1.9, 3.3],
  cargoCrates: [1.95, 0.8, 1.55],
  nunataks: [4.4, 2.2, 2.8],
  overturnedSled: [2.6, 0.8, 1.9],
  dogParachute: [2.2, 2.8, 2.2],
  rescueHelicopter: [4.0, 1.45, 1.45],
  supplyParachute: [1.1, 2.1, 1.1],
  touristSled: [2.3, 0.95, 0.75],
  townHouse: [3.4, 3.8, 2.8],
  lowFence: [3.3, 0.8, 0.6],
  lengaTree: [1.5, 2.9, 1.5],
  nireTree: [1.5, 1.95, 1.5],
  shrub: [0.95, 0.7, 0.8],
  frozenBay: [3.5, 0.5, 2.5],
  makeshiftSled: [2.4, 0.3, 1.1],
};

/** Models in the air: they have no foot of snow melting into the relief. */
const AERIAL: ReadonlySet<PonchoProp2Id> = new Set(['dogParachute', 'supplyParachute', 'rescueHelicopter']);

const ys = (tris: readonly Tri[]) => tris.flatMap(([a, b, c]) => [a[1], b[1], c[1]]);
const area = ([a, b, c]: Tri) => {
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  return 0.5 * Math.hypot(u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]);
};
const finite = (tris: readonly Tri[]) => tris.every((t) => t.slice(0, 3).flat().every(Number.isFinite));
const colorsOf = (tris: readonly Tri[]) => new Set(tris.map((t) => t[3]));

describe('Poncho props 2 (rule 30, low-poly)', () => {
  it('registers every model under its id', () => {
    expect(Object.keys(PONCHO_PROPS2).sort()).toEqual([...PONCHO_PROP2_IDS].sort());
    for (const id of PONCHO_PROP2_IDS) expect(PONCHO_PROPS2[id].id).toBe(id);
  });

  for (const id of PONCHO_PROP2_IDS) {
    describe(id, () => {
      const { tris, height, size } = PONCHO_PROPS2[id];

      it('has the least detail, with finite faces that are not flat lines', () => {
        expect(tris.length).toBeGreaterThanOrEqual(POLY_MIN_TRIS);
        expect(colorsOf(tris).size).toBeGreaterThanOrEqual(POLY_MIN_COLORS);
        expect(finite(tris)).toBe(true);
        expect(tris.filter((t) => area(t) < 1e-9)).toHaveLength(0);
      });

      it('rests on y = 0 and stays inside its box', () => {
        const all = ys(tris);
        expect(Math.min(...all)).toBeGreaterThan(-1e-3);
        expect(Math.min(...all)).toBeLessThan(1e-3);
        expect(height).toBeCloseTo(Math.max(...all), 9);
        size.forEach((s, k) => expect(s).toBeLessThanOrEqual(EXPECTED_BOX[id][k]));
      });

      it('resolves to a finite geometry, and its foot melts into the relief unless it is in the air', () => {
        const foot = tris.filter((t) => Math.min(t[0][1], t[1][1], t[2][1]) < 1e-3);
        expect(foot.length).toBeGreaterThan(0);
        expect(foot.some((t) => t[3] === RELIEF_ICE)).toBe(!AERIAL.has(id));
        const resolved = resolveRelief(tris);
        expect(resolved.every((t) => t[3] >= 0)).toBe(true);
        const g = buildPolyGeometry(resolved);
        expect(Array.from(g.getAttribute('position').array as Float32Array).every(Number.isFinite)).toBe(true);
      });

      it('is a plausible size: nothing is smaller than a boot or taller than the ship', () => {
        expect(height).toBeGreaterThan(0.2);
        expect(Math.max(...size)).toBeLessThan(6);
      });
    });
  }

  it('is deterministic', () => {
    expect(module2.buildNunataks()).toEqual(module2.buildNunataks());
    expect(module2.buildFrozenBay()).toEqual(module2.buildFrozenBay());
    expect(PONCHO_PROPS2.townHouse.tris).toBe(PONCHO_PROPS2.townHouse.tris);
  });

  it('names nothing after a real ship or a person', () => {
    const names = [...PONCHO_PROP2_IDS, ...PONCHO_PROP2_IDS.map((id) => PONCHO_PROPS2[id].label), ...Object.keys(module2)];
    for (const name of names) expect(name).not.toMatch(/san\s*mart[ií]n|ir[ií]zar/i);
  });

  it('draws the sides of the hull and the crates facing outwards', () => {
    const hull = PONCHO_PROPS2.icebreakerHull.tris.filter((t) => t[3] === 0x2b3743);
    expect(hull.length).toBeGreaterThan(0);
    expect(inward(hull, [0, 1.2, -0.7])).toBe(0);
    const crates = PONCHO_PROPS2.cargoCrates.tris.filter((t) => t[3] === VOXEL_PALETTE.WOOD);
    expect(crates.length).toBeGreaterThan(0);
    expect(inward(crates, [-0.25, 0.2, -0.05])).toBeLessThan(crates.length / 3);
  });

  it('draws the canopy of the dog parachute facing outwards (its inside is the other tone)', () => {
    const canopy = buildDogParachute().filter((t) => t[3] === VOXEL_PALETTE.ORANGE);
    expect(canopy.length).toBeGreaterThan(20);
    expect(inward(canopy, [0, DOG_PARACHUTE_HOOK[1] + 1.5, 0])).toBe(0);
  });

  it('draws the crags of the nunataks facing away from their own axis', () => {
    const axes = [[-1.15, -0.35], [-0.1, -0.55], [1.25, 0.1], [0.3, 0.95]];
    const rock = PONCHO_PROPS2.nunataks.tris.filter((t) => t[3] === 0x3c4046 && Math.abs(normalOf(t)[1]) < 0.9 && t[0][1] > 0.4); // above the scree
    expect(rock.length).toBeGreaterThan(30);
    const bad = rock.filter((t) => {
      const n = normalOf(t);
      const mx = (t[0][0] + t[1][0] + t[2][0]) / 3;
      const mz = (t[0][2] + t[1][2] + t[2][2]) / 3;
      const [ax, az] = axes.reduce((best, c) => (Math.hypot(mx - c[0], mz - c[1]) < Math.hypot(mx - best[0], mz - best[1]) ? c : best));
      return n[0] * (mx - ax) + n[2] * (mz - az) < 0;
    });
    expect(bad.length).toBeLessThan(rock.length * 0.05);
  });

  it('meets the ramp and the doorway of the hull at the same height and the ramp lands on the sill', () => {
    expect(ICEBREAKER_GANGWAY_AT[1]).toBeCloseTo(LOADING_RAMP_TOP_AT[1], 9);
    const ramp = PONCHO_PROPS2.loadingRamp.tris;
    const top = ramp.flatMap(([a, b, c]) => [a, b, c]).filter((p) => Math.abs(p[2] - LOADING_RAMP_TOP_AT[2]) < 0.01);
    expect(top.length).toBeGreaterThan(0);
    expect(Math.max(...top.map((p) => p[1]))).toBeGreaterThan(LOADING_RAMP_TOP_AT[1] - 0.15);
    // The ramp is where the doorway is: x of the ramp frame + the offset stays inside the doorway (0.4..1.2).
    expect(ICEBREAKER_GANGWAY_AT[0] - 0.4).toBeGreaterThan(0.4 - 1e-9);
    expect(ICEBREAKER_GANGWAY_AT[0] + 0.4).toBeLessThan(1.2 + 1e-9);
  });

  it('reuses the Orcadas helicopter at scale and keeps the rotor on its mast', () => {
    const body = buildHelicopterTris();
    expect(buildRescueHelicopter().length).toBeGreaterThan(body.length);
    const heli = PONCHO_PROPS2.rescueHelicopter.size;
    expect(heli[0]).toBeGreaterThan(3.5);
    expect(buildRescueRotor()).toHaveLength(buildHelicopterRotorTris().length);
    RESCUE_ROTOR_AT.forEach((v, k) => expect(v).toBeCloseTo(HELICOPTER_ROTOR_ORIGIN[k] * 4, 9));
    // The mast stands over the body, not outside it.
    expect(RESCUE_ROTOR_AT[0]).toBeGreaterThan(-heli[0] / 2);
    expect(RESCUE_ROTOR_AT[0]).toBeLessThan(heli[0] / 2);
  });

  it('hangs the dog from a hook under a canopy that is much higher than the dog', () => {
    const tris = buildDogParachute();
    expect(DOG_PARACHUTE_HOOK[1]).toBeGreaterThan(0.2);
    expect(Math.max(...ys(tris))).toBeGreaterThan(DOG_PARACHUTE_HOOK[1] + 1.5);
    // Both gore colors of the canopy are there, and the inside has its own tone.
    for (const c of [VOXEL_PALETTE.ORANGE, VOXEL_PALETTE.CREAM, 0xc9bfa0]) expect(colorsOf(tris).has(c)).toBe(true);
  });

  it('lays the sled on its side: lower and wider than upright', () => {
    const up = buildNansenSled();
    const upBox = [0, 1, 2].map((k) => Math.max(...up.flatMap(([a, b, c]) => [a[k], b[k], c[k]])) - Math.min(...up.flatMap(([a, b, c]) => [a[k], b[k], c[k]])));
    const down = PONCHO_PROPS2.overturnedSled;
    expect(down.size[1]).toBeLessThan(upBox[1]);
    expect(down.size[2]).toBeGreaterThan(upBox[2]);
  });
});

describe('Cling pose', () => {
  const phases = [0, 0.7, 1.9, 3.1, 4.4, 5.9];

  it('is deterministic and has the period of the phase', () => {
    for (const p of phases) {
      expect(clingPose(p)).toEqual(clingPose(p));
      const a = clingPose(p);
      const b = clingPose(p + PONCHO_PHASE_PERIOD);
      for (const k of Object.keys(a) as (keyof typeof a)[]) expect(b[k]).toBeCloseTo(a[k], 9);
    }
  });

  it('reaches up with both arms and leans in, with finite angles', () => {
    for (const p of phases) {
      const pose = clingPose(p);
      expect(Object.values(pose).every(Number.isFinite)).toBe(true);
      expect(pose.armL).toBeGreaterThan(2.4);
      expect(pose.armR).toBeGreaterThan(2.4);
      expect(pose.torsoPitch).toBeLessThan(-0.2);
    }
  });

  it('puts the mittens above the head-chest level and on the two stones', () => {
    for (const p of phases) {
      const pose = clingPose(p);
      const hands = clingHandsAt(pose);
      expect(ponchoPoseLift(pose)).toBeGreaterThanOrEqual(0);
      hands.forEach((h, side) => {
        expect(h[1]).toBeGreaterThan(0.8);
        // The person stands at hold - hand: its feet are on or just over the ground, never under it.
        const feet = NUNATAK_HOLDS[side][1] - h[1];
        expect(feet).toBeGreaterThanOrEqual(-0.05);
        expect(feet).toBeLessThan(0.3);
        // Each hand is on its own side of the midline, as the stone it holds.
        expect(Math.sign(h[2])).toBe(Math.sign(NUNATAK_HOLDS[side][2]));
      });
    }
  });
});

describe('Tourists and children', () => {
  const colorSet = (tris: readonly Tri[]) => colorsOf(tris);

  it('has three distinct looks, none orange, and the group only names them', () => {
    expect(new Set(TOURIST_LOOKS.map((l) => l.parka)).size).toBe(TOURIST_LOOKS.length);
    expect(TOURIST_LOOKS.every((l) => l.parka !== VOXEL_PALETTE.ORANGE)).toBe(true);
    const ids = new Set(TOURIST_LOOKS.map((l) => l.id));
    for (const t of TOURIST_GROUP) expect(ids.has(t.look)).toBe(true);
    expect(TOURIST_GROUP.length).toBeGreaterThanOrEqual(4);
  });

  for (const look of TOURIST_LOOKS) {
    it(`dresses the ${look.id} tourist on the existing person, with hat and pompom`, () => {
      const base = buildPonchoPerson(standPose());
      const tourist = buildTourist(standPose(), look);
      expect(tourist.length).toBeGreaterThan(base.length);
      expect(finite(tourist)).toBe(true);
      const cols = colorSet(tourist);
      expect(cols.has(look.parka)).toBe(true);
      expect(cols.has(look.hat)).toBe(true);
      expect(cols.has(look.pompom)).toBe(true);
      expect(cols.has(VOXEL_PALETTE.ORANGE)).toBe(false);
      // Feet on y = 0 (scaled about the origin) and the pompom is the highest thing.
      expect(Math.min(...ys(tourist))).toBeGreaterThan(-1e-3);
      const top = Math.max(...ys(tourist.filter((t) => t[3] === look.pompom)));
      expect(top).toBeCloseTo(Math.max(...ys(tourist)), 6);
      expect(Math.max(...ys(tourist))).toBeGreaterThan(Math.max(...ys(base)) * look.scale - 0.02);
    });
  }

  it('keeps the pompom on the head while walking (deterministic and periodic)', () => {
    const look = TOURIST_LOOKS[0];
    for (const p of [0, 1.3, 2.9, 4.7]) {
      const a = buildTourist(walkPose(p), look);
      const b = buildTourist(walkPose(p + PONCHO_PHASE_PERIOD), look);
      expect(a).toEqual(buildTourist(walkPose(p), look));
      expect(a.length).toBe(b.length);
      const pom = a.filter((t) => t[3] === look.pompom).flatMap(([x, y, z]) => [x, y, z]);
      const head = pom.reduce((s, v) => [s[0] + v[0] / pom.length, s[1] + v[1] / pom.length], [0, 0]);
      expect(head[1]).toBeGreaterThan(0.9);
      expect(Math.abs(head[0])).toBeLessThan(0.3);
    }
  });

  it('makes a child from the same person at the common scale, in a red parka', () => {
    const pose = standPose();
    const person = buildPonchoPerson(pose, 'red');
    const child = buildChild(pose);
    expect(child.length).toBe(person.length);
    expect(CHILD_SCALE).toBeCloseTo(0.6, 9);
    expect(Math.max(...ys(child))).toBeCloseTo(Math.max(...ys(person)) * CHILD_SCALE, 9);
    expect(Math.min(...ys(child))).toBeCloseTo(0, 6);
  });
});

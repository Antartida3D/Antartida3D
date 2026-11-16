import { describe, expect, it } from 'vitest';
import {
  PLESIO_SWIM, STILL_TIME, ammonitePose, columnWave, dinoPose, geologistPose, onLoop, plesioPose,
  restAmmonite, restDino, restGeologist, restPlesio, type Geologist,
} from '../src/fossils/fossilPoses.ts';
import {
  CAMP_FLAT, DISTANT_MESAS, FOREST_PLANTS, MESA_TOP, WATER_LEVEL, buildFieldTris, buildForestTris, buildSeaFloorTris,
  fieldHeight, seaFloorHeight,
} from '../src/fossils/fossilTerrain.ts';
import { PLESIO_VERTEBRAE, plesioVertebra } from '../src/fossils/models.ts';
import { FOSSIL_POLY_MODELS, PLESIO_NECK_SEGMENTS } from '../src/fossils/lowPolyFossils.ts';
import { FOSSIL_SCENERY_MODELS } from '../src/fossils/lowPolyScenery.ts';
import { SCENE_MODELS } from '../src/voyage/sightingModels.ts';
import { normalOf } from '../src/voyage/lowPoly.ts';
import { inward } from './polyHelpers.ts';

const times = Array.from({ length: 200 }, (_, i) => i * 0.137);

describe('fossil scene ground', () => {
  it('keeps the camp flat, the mesa high behind it and the sea to the west', () => {
    for (let a = 0; a < Math.PI * 2; a += 0.3) {
      for (const r of [0, 2, 4, CAMP_FLAT - 2]) expect(Math.abs(fieldHeight(Math.cos(a) * r, Math.sin(a) * r))).toBeLessThan(0.15);
    }
    expect(fieldHeight(4, -20)).toBeGreaterThan(MESA_TOP - 0.6);
    expect(fieldHeight(-14, 0)).toBeLessThan(WATER_LEVEL);
  });

  it('is deterministic and builds a bounded number of faces', () => {
    const a = buildFieldTris();
    expect(buildFieldTris()).toEqual(a);
    expect(a.length).toBeGreaterThan(3000);
    expect(a.length).toBeLessThan(12000);
    expect(buildForestTris().length).toBeLessThan(6000);
    expect(buildSeaFloorTris(true).length).toBeLessThan(6000);
  });

  it('in low-poly the cliffs of the mesa show their strata and the camp ground stays flat', () => {
    const field = buildFieldTris();
    const steep = field.filter((t) => Math.abs(normalOf(t)[1]) < 0.45);
    expect(steep.length).toBeGreaterThan(50);
    expect(new Set(steep.map((t) => t[3])).size).toBeGreaterThanOrEqual(3);
    const camp = field.filter((t) => Math.hypot(t[0][0], t[0][2]) < CAMP_FLAT - 2);
    for (const t of camp) expect(Math.abs(normalOf(t)[1])).toBeGreaterThan(0.95);
    // Each far island, seen from its own middle, has every face turned out.
    for (const [x, z] of [[-62, -40], [-48, -78], [-90, -10], [20, -60]]) {
      const mesa = DISTANT_MESAS.filter((t) => Math.hypot(t[0][0] - x, t[0][2] - z) < 28);
      expect(mesa.length).toBeGreaterThan(30);
      expect(inward(mesa, [x, 1, z])).toBe(0);
    }
  });

  it('raises a hard rock wall behind the Eocene sea floor only', () => {
    expect(seaFloorHeight(0, -12, true)).toBeGreaterThan(2.5);
    expect(seaFloorHeight(0, -12, false)).toBeLessThan(1);
  });

  it('leaves a clearing in the forest for the dinosaur', () => {
    for (const p of FOREST_PLANTS) expect(Math.hypot(p.x / 1.3, p.z)).toBeGreaterThanOrEqual(4.6);
  });
});

describe('fossil figures', () => {
  it('has every fossil model in low-poly, none left in blocks', () => {
    // Every model the expedition had in blocks is now low-poly, and each one has its test of least detail.
    const poly = { ...FOSSIL_POLY_MODELS, ...FOSSIL_SCENERY_MODELS };
    for (const name of [
      'antarctopelta-bones', 'antarctopelta-illustration', 'cretaceous-broadleaf', 'cretaceous-conifer', 'cretaceous-cycad',
      'cretaceous-fern', 'eocene-brachiopod', 'eocene-bryozoan', 'eocene-chiton', 'eocene-crinoid', 'eocene-sea-star',
      'eocene-urchin', 'field-crate', 'field-geologist-orange', 'field-geologist-red', 'field-geologist-yellow', 'field-mast',
      'field-sled', 'field-tent', 'fossil-ammonite', 'fossil-jaw', 'fossil-log', 'inoceramid-bivalve', 'living-ammonite',
      'plesiosaur-illustration', 'plesiosaur-skeleton', 'star-slab',
    ]) expect(poly[name], name).toBeDefined();
    for (const name of Object.keys(poly)) expect(SCENE_MODELS[name], name).toBeUndefined();
  });

  it('walks geologists along their loop and keeps every pose finite', () => {
    const acts: Geologist[] = [
      { act: 'walk', x: 0, z: 0, yaw: 0, seed: 1, loop: { cx: 1, cz: 2, rx: 3, rz: 2, period: 18 } },
      { act: 'hammer', x: 1, z: 1, yaw: 0.4, seed: 2 },
      { act: 'sit', x: -1, z: 0, yaw: 1, seed: 3 },
      { act: 'kneel', x: -2, z: 1, yaw: 0, seed: 5 },
      { act: 'look', x: 2, z: -1, yaw: 0, seed: 4 },
    ];
    const pose = restGeologist();
    for (const g of acts) for (const t of times) {
      geologistPose(g, t, pose);
      for (const v of Object.values(pose)) expect(Number.isFinite(v)).toBe(true);
      if (g.act === 'walk') expect(Math.hypot((pose.x - 1) / 3, (pose.z - 2) / 2)).toBeCloseTo(1, 5);
      if (g.act === 'hammer') expect(pose.armR).toBeGreaterThanOrEqual(0.8);
      if (g.act === 'sit') expect(pose.y).toBeLessThan(0);
      // Kneeling, the legs go back (-x), never forward into the find in front.
      if (g.act === 'kneel') {
        expect(pose.y).toBeLessThan(0);
        expect(pose.legL).toBeLessThan(-1);
        expect(pose.legR).toBeLessThan(-1);
      }
    }
  });

  it('faces the direction it walks', () => {
    const loop = { cx: 0, cz: 0, rx: 2, rz: 2, period: 10 };
    const a = onLoop(loop, 1);
    const b = onLoop(loop, 1.01);
    const dir = Math.atan2(-(b.z - a.z), b.x - a.x);
    expect(Math.abs(Math.atan2(Math.sin(dir - a.yaw), Math.cos(dir - a.yaw)))).toBeLessThan(0.05);
  });

  it('moves the dinosaur legs in diagonal pairs while walking and keeps them still while standing', () => {
    const pose = restDino();
    dinoPose(0.4, { cx: 0, cz: 0, rx: 3, rz: 2, period: 30 }, pose);
    expect(pose.legs[0]).toBeCloseTo(pose.legs[3]);
    expect(pose.legs[1]).toBeCloseTo(-pose.legs[0]);
    dinoPose(0.4, null, pose);
    expect(pose.legs.every((l) => l === 0)).toBe(true);
  });

  it('swims the plesiosaur around its loop above the sea floor', () => {
    const pose = restPlesio(PLESIO_NECK_SEGMENTS);
    for (const t of times) {
      plesioPose(t, PLESIO_SWIM, 2.2, pose);
      expect(pose.y).toBeGreaterThan(1.8);
      expect(Math.hypot(pose.x / PLESIO_SWIM.rx, pose.z / PLESIO_SWIM.rz)).toBeCloseTo(1, 5);
      expect(Math.sign(pose.flippers[0]) * Math.sign(pose.flippers[2])).toBeLessThanOrEqual(0);
    }
  });

  it('draws the same calm pose every time motion is reduced', () => {
    const a = ammonitePose(STILL_TIME, 1, restAmmonite(8));
    const b = ammonitePose(STILL_TIME, 1, restAmmonite(8));
    expect(a).toEqual(b);
  });

  it('runs the column highlight from the head to the tail and then lets it go', () => {
    expect(columnWave(0, PLESIO_VERTEBRAE, 0.3)).toBeGreaterThan(0);
    expect(columnWave(PLESIO_VERTEBRAE - 1, PLESIO_VERTEBRAE, 0.3)).toBe(0);
    expect(columnWave(PLESIO_VERTEBRAE - 1, PLESIO_VERTEBRAE, 2.9)).toBeGreaterThan(0);
    for (let i = 0; i < PLESIO_VERTEBRAE; i++) expect(columnWave(i, PLESIO_VERTEBRAE, 4)).toBe(0);
    expect(plesioVertebra(0)[0]).toBeGreaterThan(plesioVertebra(PLESIO_VERTEBRAE - 1)[0]);
  });
});

import { describe, expect, it } from 'vitest';
import { SCENE_MODELS, SEA_MODELS } from '../src/voyage/sightingModels.ts';
import { MARINE_PALETTE as C } from '../src/marine/models.ts';
import { MARINE_POLY_MODELS, MINKE_FEED_BODY_TRIS } from '../src/marine/lowPolyMarine.ts';
import { POLY_MIN_COLORS, POLY_MIN_TRIS, normalOf, type Tri } from '../src/voyage/lowPoly.ts';
import {
  DIVE_PERIOD, EDGE_Z, FILTER_PERIOD, HOLE, ICE_BOTTOM, LEAD, LEOPARD_LOOP, MINKE_FOOTPRINT, MINKE_KRILL_PATCHES, MINKE_LOOP,
  MINKE_SCALE, ORCA_POD, SUCTION_PERIOD, WATER_Y, WAVE_FLOE, WAVE_PERIOD, WAVE_SEAL_START, EMPEROR_HUNT_LOOP, EMPEROR_HUNT_STILL, emperorDive, emperorHunt, humpbackFilter, iceAt, inOpenWater,
  krillAt, leopardPose, minkePose, orcaPose, orcaWave, suction, buildIceTris, ICE_TOP,
} from '../src/marine/marinePoses.ts';

const samples = (period: number, step = 0.05) => Array.from({ length: Math.ceil(period / step) }, (_, i) => i * step);

describe('Océano: the ice', () => {
  it('opens at the ice edge, along the lead and in the emperor hole', () => {
    expect(iceAt(0, EDGE_Z + 1)).toBe(false);
    expect(iceAt(0, LEAD.z)).toBe(false);
    expect(iceAt(HOLE.x, HOLE.z)).toBe(false);
    expect(iceAt(-2, -6)).toBe(true);
  });
});

describe('Océano: poses never cross the ice', () => {
  it('the minke breathes once per loop, along the lead, and stays below the floes the rest of the time', () => {
    let breaths = 0;
    let wasBreathing = false;
    const bodyTop = 0.1 * MINKE_SCALE;
    const halfLength = 0.55 * MINKE_SCALE;
    // Start a quarter of a loop in, so one breath is not split across the ends of the sample.
    for (const t of samples(MINKE_LOOP.period).map((t) => t + MINKE_LOOP.period / 4)) {
      const p = minkePose(t);
      if (p.breathing && !wasBreathing) breaths++;
      wasBreathing = p.breathing;
      if (p.y + bodyTop > ICE_BOTTOM - 0.05) {
        // Nose, middle and tail fit in open water.
        for (const k of [-1, 0, 1]) {
          const x = p.x + Math.cos(p.yaw) * halfLength * k, z = p.z - Math.sin(p.yaw) * halfLength * k;
          expect(inOpenWater(x, z, MINKE_FOOTPRINT), `t=${t.toFixed(2)} k=${k}`).toBe(true);
        }
      }
      if (p.breathing) expect(p.y).toBeGreaterThan(-0.3);
    }
    expect(breaths).toBe(1);
  });

  it('the emperor leaves and returns through the hole, breathes at the surface and reaches the fish', () => {
    let deepest = 0;
    const phases = new Set<string>();
    for (const t of samples(DIVE_PERIOD)) {
      const p = emperorDive(t);
      phases.add(p.phase);
      deepest = Math.min(deepest, p.y);
      expect(p.y).toBeLessThanOrEqual(WATER_Y);
      if (p.y > ICE_BOTTOM - 0.3) expect(Math.hypot(p.x - HOLE.x, p.z - HOLE.z), `t=${t.toFixed(2)}`).toBeLessThan(HOLE.r * 0.5);
      if (p.phase === 'breathe') expect(p.y).toBeGreaterThan(-0.15);
    }
    expect([...phases]).toEqual(['breathe', 'down', 'hunt', 'up']);
    expect(deepest).toBeLessThan(-4);
  });

  it('the orcas swim in open water at the ice edge, without overlapping', () => {
    for (const t of samples(40, 0.25)) {
      const poses = ORCA_POD.map((_, i) => orcaPose(t, i));
      for (const p of poses) expect(p.z).toBeGreaterThan(EDGE_Z + 1);
      for (let i = 0; i < poses.length; i++) for (let j = i + 1; j < poses.length; j++) {
        expect(Math.hypot(poses[i].x - poses[j].x, poses[i].z - poses[j].z)).toBeGreaterThan(0.6);
      }
    }
  });

  it('krill stays close to its swarm', () => {
    for (let i = 0; i < 50; i++) {
      const k = krillAt(i, 7, [0, -2, 0], 2);
      expect(Math.hypot(k.x, k.z)).toBeLessThanOrEqual(2.01);
      expect(Math.abs(k.y + 2)).toBeLessThan(1);
    }
  });
});

describe('Océano: how each animal feeds', () => {
  it('the minke lunges with its mouth open only at the krill patches, never while breathing', () => {
    let lunges = 0, was = false;
    for (const t of samples(MINKE_LOOP.period).map((t) => t + MINKE_LOOP.period / 4)) {
      const p = minkePose(t);
      const lunging = p.lunge > 0.9;
      if (lunging && !was) {
        lunges++;
        const near = Math.min(...MINKE_KRILL_PATCHES.map((c) => Math.hypot(c[0] - p.x, c[2] - p.z)));
        expect(near).toBeLessThan(2);
      }
      was = lunging;
      if (p.breathing) expect(p.jaw).toBe(0);
      expect(p.throat).toBeGreaterThanOrEqual(1);
    }
    expect(lunges).toBe(MINKE_KRILL_PATCHES.length);
  });

  it('the leopard seal bites at the fish and sucks in the krill in each lap', () => {
    const prey = new Set<string>();
    let widest = 0;
    for (const t of samples(LEOPARD_LOOP.period)) {
      const p = leopardPose(t);
      if (p.prey) prey.add(p.prey);
      if (p.prey === 'fish') widest = Math.max(widest, p.jaw);
      if (p.prey === 'krill') expect(p.jaw).toBeLessThan(0.5);
    }
    expect([...prey].sort()).toEqual(['fish', 'krill']);
    expect(widest).toBeGreaterThan(0.6);
  });

  it('suction draws in water with the mouth open and expels it with the mouth closed', () => {
    for (const t of samples(SUCTION_PERIOD)) {
      const f = suction(t);
      if (f.expel > 0) expect(f.jaw).toBeLessThan(0.05);
      expect(f.draw > 0 && f.expel > 0).toBe(false);
    }
  });

  it('the type B orcas raise a wave that washes over the floe, and the seal stays on it', () => {
    const order: string[] = [];
    let crossed = false;
    for (const t of samples(WAVE_PERIOD)) {
      for (let i = 0; i < 3; i++) expect(orcaWave(t, i).y).toBeLessThan(WATER_Y);
      const w = orcaWave(t, 0);
      if (order[order.length - 1] !== w.phase) order.push(w.phase);
      if (w.height > 0.2 && Math.abs(w.crest - WAVE_FLOE.x) < 0.3) crossed = true;
      // On the floe the seal rests on the ice; past its edge it is below the water line.
      const sealX = WAVE_SEAL_START + w.slide;
      if (Math.abs(sealX) < WAVE_FLOE.half - 0.4) expect(w.sealY).toBeCloseTo(0.2, 5);
      if (w.sealVisible && w.sealY < 0.2) expect(sealX).toBeGreaterThan(WAVE_FLOE.half);
      if (w.phase === 'approach' && w.sealVisible) expect(sealX).toBe(WAVE_SEAL_START);
      expect(WAVE_FLOE.z).toBeGreaterThan(EDGE_Z + 2);
    }
    expect(order).toEqual(['approach', 'dive', 'wave', 'away']);
    expect(crossed).toBe(true);
    // The wave sweeps the seal off the floe and it ends under the water, out of view.
    const fallen = samples(WAVE_PERIOD).map((t) => orcaWave(t, 0)).filter((w) => w.sealY < WATER_Y - 0.4);
    expect(fallen.length).toBeGreaterThan(0);
    expect(samples(WAVE_PERIOD).some((t) => !orcaWave(t, 0).sealVisible)).toBe(true);
  });

  it('the emperor catches one fish per loop with its bill, carries it and swallows it', () => {
    const states: string[] = [];
    for (const t of samples(EMPEROR_HUNT_LOOP.period, 0.01)) {
      const { emperor, prey } = emperorHunt(t);
      if (states[states.length - 1] !== prey.state) states.push(prey.state);
      // Just before the catch the fish is right at the bill, so the snap reads as a bite.
      if (prey.state === 'free' && emperorHunt(t + 0.01).prey.state === 'held') {
        const reach = Math.hypot(prey.x - emperor.x, prey.z - emperor.z);
        expect(reach).toBeGreaterThan(0.45);
        expect(reach).toBeLessThan(0.8);
      }
      expect(emperor.y).toBeLessThan(ICE_BOTTOM);
    }
    expect(states).toEqual(['gone', 'free', 'held', 'gone']);
    // With reduced motion the still frame shows the fish in the bill.
    expect(emperorHunt(EMPEROR_HUNT_STILL).prey.state).toBe('held');
  });

  it('the emperor holds its head up out of the water while it breathes', () => {
    for (const t of samples(DIVE_PERIOD)) {
      const p = emperorDive(t);
      if (p.phase === 'breathe') expect(p.pitch).toBeGreaterThan(0);
    }
  });
});

describe('Océano: the humpback gulp', () => {
  it('opens, fills its throat, closes and pushes the water out, in that order', () => {
    const order: string[] = [];
    for (const t of samples(FILTER_PERIOD)) {
      const f = humpbackFilter(t);
      if (order[order.length - 1] !== f.phase) order.push(f.phase);
      if (f.phase === 'approach' || f.phase === 'expel') expect(f.jaw).toBe(0);
      if (f.phase === 'close') expect(f.throat).toBeGreaterThan(2);
      expect(f.throat).toBeGreaterThanOrEqual(1);
    }
    expect(order).toEqual(['approach', 'open', 'engulf', 'close', 'expel']);
  });
});

describe('Océano: the ice in low-poly', () => {
  const ice = buildIceTris();
  const ys = ice.flatMap((t) => [t[0][1], t[1][1], t[2][1]]);

  it('stays between its top and its underside, so no animal swims through it', () => {
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(ICE_BOTTOM);
    expect(Math.max(...ys)).toBeLessThan(ICE_TOP + 0.08);
    expect(ice.length).toBeGreaterThan(2000);
    expect(ice.length).toBeLessThan(12000);
  });

  it('has walls where it meets the water and none in the middle of a floe', () => {
    const walls = ice.filter((t) => Math.abs(normalOf(t)[1]) < 0.3);
    expect(walls.length).toBeGreaterThan(100);
    // A wall stands beside open water: the hole of the emperors is ringed by them.
    const nearHole = walls.filter((t) => Math.abs(Math.hypot(t[0][0] - HOLE.x, t[0][2] - HOLE.z) - HOLE.r) < 0.9);
    expect(nearHole.length).toBeGreaterThan(6);
  });
});

describe('Océano: models', () => {
  for (const [id, tris] of Object.entries(MARINE_POLY_MODELS)) {
    it(`${id} is low-poly with the least detail and no broken faces`, () => {
      expect(tris.length).toBeGreaterThanOrEqual(POLY_MIN_TRIS);
      expect(new Set(tris.map((t) => t[3])).size).toBeGreaterThanOrEqual(POLY_MIN_COLORS);
      expect(tris.filter((t) => Math.hypot(...normalOf(t)) === 0)).toEqual([]);
      // Block models are checked through SCENE_MODELS; Océano has none left.
      expect(SCENE_MODELS[id]).toBeUndefined();
    });
  }

  it('keeps the marks of each animal', () => {
    const has = (tris: readonly Tri[], color: number) => tris.some((t) => t[3] === color);
    expect(has(MARINE_POLY_MODELS['marine:humpback'], C.whaleKnob)).toBe(true);
    expect(has(MARINE_POLY_MODELS['marine:humpback'], C.baleen)).toBe(true);
    expect(has(MARINE_POLY_MODELS['marine:leopard'], C.tooth)).toBe(true);
    expect(has(MARINE_POLY_MODELS['marine:emperor-swim'], C.emperorYellow)).toBe(true);
    for (const c of [C.krillRed, C.krillGut, C.black]) expect(has(MARINE_POLY_MODELS['marine:krill'], c)).toBe(true);
    // The Antarctic minke's flipper is grey with only a thin white leading edge.
    // Faces wholly out of the body (it is 0.088 wide each side): the flippers, not the white belly.
    const edge = MINKE_FEED_BODY_TRIS.filter((t) => t[3] === C.white && [t[0], t[1], t[2]].every((v) => Math.abs(v[2]) > 0.095)).flatMap((t) => [t[0], t[1], t[2]]);
    expect(edge.length).toBeGreaterThan(0);
    expect(Math.max(...edge.map((v) => v[0])) - Math.min(...edge.map((v) => v[0]))).toBeLessThan(0.1);
  });

  it('draws the Antarctic minke without the white flipper band of the other minkes', () => {
    const WHITE = 0xf7fafb;
    const flipperWhite = SEA_MODELS.minke.filter((b) => b[6] === WHITE && Math.abs(b[2]) >= 0.1);
    expect(flipperWhite.length).toBeGreaterThan(0);
    // Only a thin leading edge is left.
    for (const b of flipperWhite) expect(b[3]).toBeLessThanOrEqual(0.015);
  });
});

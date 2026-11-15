import { describe, expect, it } from 'vitest';
import { SCENE_MODELS, SEA_MODELS } from '../src/voyage/sightingModels.ts';
import { MARINE_MODELS } from '../src/marine/models.ts';
import {
  DIVE_PERIOD, EDGE_Z, FILTER_PERIOD, HOLE, ICE_BOTTOM, LEAD, LEOPARD_LOOP, MINKE_FOOTPRINT, MINKE_KRILL_PATCHES, MINKE_LOOP,
  MINKE_SCALE, ORCA_POD, SUCTION_PERIOD, WATER_Y, WAVE_FLOE, WAVE_PERIOD, emperorDive, humpbackFilter, iceAt, inOpenWater,
  krillAt, leopardPose, minkePose, orcaPose, orcaWave, suction,
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
      expect(w.slide).toBeLessThan(WAVE_FLOE.half * 0.6);
      expect(WAVE_FLOE.z).toBeGreaterThan(EDGE_Z + 2);
    }
    expect(order).toEqual(['approach', 'dive', 'wave', 'away']);
    expect(crossed).toBe(true);
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

describe('Océano: models', () => {
  it('registers every model of the expedition for the test of least detail', () => {
    for (const id of Object.keys(MARINE_MODELS)) expect(SCENE_MODELS[id]).toBe(MARINE_MODELS[id]);
  });

  it('draws the Antarctic minke without the white flipper band of the other minkes', () => {
    const WHITE = 0xf7fafb;
    const flipperWhite = SEA_MODELS.minke.filter((b) => b[6] === WHITE && Math.abs(b[2]) >= 0.1);
    expect(flipperWhite.length).toBeGreaterThan(0);
    // Only a thin leading edge is left.
    for (const b of flipperWhite) expect(b[3]).toBeLessThanOrEqual(0.015);
  });
});

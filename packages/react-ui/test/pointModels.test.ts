import { describe, expect, it } from 'vitest';
import { PTS } from '@antartida/core';
import { normalOf, POLY_MIN_COLORS, POLY_MIN_TRIS } from '../src/voyage/lowPoly.ts';
import { POINT_MODEL_IDS } from '../src/voyage/pointModelIds.ts';
import { BOMBS, calvingPose, erebusSummit, huddleTurn, lavaBomb, PLUME_PUFFS, plumePuff, POINT_MODELS, thwaitesFront } from '../src/voyage/pointModels.ts';

describe('point models (#58, docs/diseno/estilo-voxel.md)', () => {
  it('gives models only to points of the map, and the card knows which', () => {
    const ids = new Set(PTS.map((p) => p.id));
    for (const id of Object.keys(POINT_MODELS)) expect(ids.has(id), id).toBe(true);
    expect([...POINT_MODEL_IDS].sort()).toEqual(Object.keys(POINT_MODELS).sort());
  });

  it('leaves Fósiles without a model: its expedition (#7) chooses what to show', () => {
    expect(POINT_MODELS.fosiles).toBeUndefined();
  });

  for (const [id, m] of Object.entries(POINT_MODELS)) {
    it(`${id} has the least detail, about one unit wide, with no broken faces`, () => {
      const tris = m.preview.tris;
      expect(tris.length).toBeGreaterThanOrEqual(POLY_MIN_TRIS);
      expect(new Set(tris.map((t) => t[3])).size).toBeGreaterThanOrEqual(POLY_MIN_COLORS);
      const xs = tris.flatMap(([a, b, c]) => [a[0], b[0], c[0]]);
      const width = Math.max(...xs) - Math.min(...xs);
      expect(width).toBeGreaterThan(0.8);
      expect(width).toBeLessThan(1.4);
      for (const t of tris) expect(t.slice(0, 3).flat().every(Number.isFinite)).toBe(true);
      // The ground is seen from above: almost no face of it may look down.
      const down = tris.filter((t) => normalOf(t)[1] < -0.9).length;
      expect(down / tris.length).toBeLessThan(0.25);
    });
  }

  it('raises the Erebus summit from the relief: its outer ring lies on the ground', () => {
    const ground = (dx: number, dz: number) => 5 - 0.5 * Math.hypot(dx, dz);
    const { tris, vent, rim } = erebusSummit(ground);
    expect(rim).toBeGreaterThan(ground(0, 0));
    expect(vent[1]).toBeLessThan(rim);
    const lowest = Math.min(...tris.flatMap(([a, b, c]) => [a, b, c].map((p) => p[1] - ground(p[0], p[2]))));
    expect(lowest).toBeGreaterThan(-0.05);
  });

  it('places Thwaites cliff, crevasses, and brash ice on the right side of a straight coast', () => {
    const coastAt = (_dx: number, dz: number) => -dz;
    const groundAt = (dx: number, dz: number) => (coastAt(dx, dz) > 0 ? 0.1 : 0);
    const { cliff, crevasses, brash, calving } = thwaitesFront(groundAt, coastAt);
    expect(cliff.length).toBeGreaterThan(0);
    expect(crevasses.length).toBeGreaterThan(0);
    expect(brash.length).toBeGreaterThan(0);
    expect(calving).not.toBeNull();
    // Cliff vertices stay on ice or at most 0.02 seaward at the wall foot (never < -0.03).
    for (const [a, b, c] of cliff) {
      for (const p of [a, b, c]) {
        expect(coastAt(p[0], p[2])).toBeGreaterThanOrEqual(-0.02);
      }
    }
    // All crevasse/rift vertices stay strictly inland (coastAt > 0.1).
    for (const [a, b, c] of crevasses) {
      for (const p of [a, b, c]) {
        expect(coastAt(p[0], p[2])).toBeGreaterThan(0.1);
      }
    }
    // All brash ice and tabular icebergs stay strictly seaward (coastAt < -0.05).
    for (const [a, b, c] of brash) {
      for (const p of [a, b, c]) {
        expect(coastAt(p[0], p[2])).toBeLessThan(-0.05);
      }
    }
  });

  it('leaves small pools and islets of the coast mask without a ring of cliff (#117)', () => {
    // Ice up to the coast at z = 1.5, a pool of sea inside it, and an islet in the sea.
    const coastAt = (dx: number, dz: number) =>
      Math.max(Math.min(1.5 - dz, Math.hypot(dx - 1, dz + 1) - 0.15), 0.15 - Math.hypot(dx + 1, dz - 2.3));
    const groundAt = (dx: number, dz: number) => (coastAt(dx, dz) > 0 ? 0.1 : 0);
    const { cliff } = thwaitesFront(groundAt, coastAt);
    const near = (x: number, z: number) => cliff.filter(([a]) => Math.hypot(a[0] - x, a[2] - z) < 0.4).length;
    expect(near(1, -1)).toBe(0);
    expect(near(-1, 2.3)).toBe(0);
    expect(near(0, 1.5)).toBeGreaterThan(0);
  });
});

describe('moving parts of the point models', () => {
  const vent = [0, 1, 0] as const;

  it('lets the plume rise from the vent', () => {
    for (let i = 0; i < PLUME_PUFFS; i++) {
      const { at, size } = plumePuff(vent, i, 12.3);
      expect(at[1]).toBeGreaterThan(vent[1]);
      expect(size).toBeGreaterThan(0);
    }
  });

  it('throws bombs from the vent onto the rim, and none between explosions', () => {
    for (let i = 0; i < BOMBS; i++) {
      expect(lavaBomb(vent, 1.1, i, 0)![1]).toBeCloseTo(vent[1], 5);
      expect(lavaBomb(vent, 1.1, i, 0.8)![1]).toBeGreaterThan(1.1);
      const end = lavaBomb(vent, 1.1, i, 1.6)!;
      expect(Math.hypot(end[0], end[2])).toBeGreaterThan(0.2);
    }
    expect(lavaBomb(vent, 1.1, 0, 5)).toBeNull();
  });

  it('calves the Thwaites block: at rest, tipping, sinking, gone, and again', () => {
    expect(calvingPose(0)).toEqual({ tilt: 0, sink: 0, visible: true });
    expect(calvingPose(10).tilt).toBeGreaterThan(0);
    expect(calvingPose(12).sink).toBeLessThan(0);
    expect(calvingPose(13).visible).toBe(false);
    expect(calvingPose(14)).toEqual(calvingPose(0));
  });

  it('keeps everything still at time 0 (reduced motion)', () => {
    expect(huddleTurn(0)).toBe(0);
    expect(calvingPose(0).tilt).toBe(0);
  });
});

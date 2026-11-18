import { describe, expect, it } from 'vitest';
import { VOSTOK_SCENE } from '@antartida/core';
import { poseOf } from '../src/scenepoint/sceneView.ts';
import { BEDROCK } from '../src/voyage/pointModels.ts';
import { buildVostokStageTris, PIT, STATION_AT, TOP, VOSTOK_VIEWS } from '../src/vostok/vostokScene.ts';

describe('scene of Lake Vostok (#281)', () => {
  const tris = buildVostokStageTris();

  it('builds a stage of finite faces, from the rock of the floor to the snow of the plateau', () => {
    expect(tris.length).toBeGreaterThan(2000);
    let [low, high] = [Infinity, -Infinity];
    for (const t of tris) {
      for (const v of t.slice(0, 3) as number[][]) {
        expect(v.every(Number.isFinite)).toBe(true);
        [low, high] = [Math.min(low, v[1]), Math.max(high, v[1])];
      }
    }
    expect(low).toBeCloseTo(0, 5);
    expect(high).toBeGreaterThan(TOP);
    expect(tris.some((t) => t[3] === BEDROCK)).toBe(true);
  });

  it('leaves the pit open: no snow of the plateau over it', () => {
    const inside = (x: number, z: number) => x > 0.5 && x < PIT - 0.5 && z > 0.5 && z < PIT - 0.5;
    const lid = tris.filter((t) => [t[0], t[1], t[2]].every((v) => Math.abs(v[1] - TOP) < 1e-6 && inside(v[0], v[2])));
    expect(lid).toHaveLength(0);
  });

  it('sets the station on the snow, off the pit', () => {
    expect(STATION_AT[1]).toBe(TOP);
    expect(STATION_AT[0] < 0 || STATION_AT[2] < 0).toBe(true);
  });

  it('has a view for every point of the visit, from above the plateau', () => {
    for (const spot of VOSTOK_SCENE.spots) {
      const { pos, target } = poseOf(VOSTOK_VIEWS[spot.id]);
      expect(pos[1], spot.id).toBeGreaterThan(TOP);
      expect(pos[1]).toBeGreaterThan(target[1]);
    }
  });
});

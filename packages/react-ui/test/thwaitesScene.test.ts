import { describe, expect, it } from 'vitest';
import { THWAITES_SCENE } from '@antartida/core';
import { RELIEF_ICE, RELIEF_ROCK } from '../src/voyage/lowPoly.ts';
import { poseOf } from '../src/scenepoint/sceneView.ts';
import { buildThwaitesStageTris, CALVING, THWAITES_VIEWS } from '../src/thwaites/thwaitesScene.ts';

describe('scene of Thwaites Glacier (#280)', () => {
  const tris = buildThwaitesStageTris();

  it('builds a stage of finite faces, with no colour left for the painted relief of the map', () => {
    expect(tris.length).toBeGreaterThan(5000);
    for (const t of tris) expect(t.slice(0, 3).flat().every(Number.isFinite)).toBe(true);
    expect(tris.some((t) => t[3] === RELIEF_ICE || t[3] === RELIEF_ROCK)).toBe(false);
  });

  it('raises the ice over the sea, with its front standing up from the water', () => {
    let [low, high] = [Infinity, -Infinity];
    for (const t of tris) for (const v of t.slice(0, 3) as number[][]) [low, high] = [Math.min(low, v[1]), Math.max(high, v[1])];
    expect(high).toBeGreaterThan(10);
    // Nothing deeper than the foot of the cliff, a little under the water.
    expect(low).toBeGreaterThan(-3);
  });

  it('has a block that breaks off the front, standing at the sea', () => {
    expect(CALVING).not.toBeNull();
    expect(CALVING!.tris.length).toBeGreaterThan(0);
    expect(CALVING!.pivot[1]).toBeCloseTo(0, 5);
  });

  it('has a view for every point of the visit, from above the sea', () => {
    for (const spot of THWAITES_SCENE.spots) {
      const { pos, target } = poseOf(THWAITES_VIEWS[spot.id]);
      expect(pos[1], spot.id).toBeGreaterThan(0);
      expect(pos[1]).toBeGreaterThan(target[1]);
      expect(pos[2], spot.id).toBeGreaterThan(target[2]);
    }
  });
});

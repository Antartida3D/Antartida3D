import { describe, expect, it } from 'vitest';
import { TESTIGOS_SCENE } from '@antartida/core';
import { poseOf } from '../src/scenepoint/sceneView.ts';
import { RELIEF_ICE, RELIEF_ROCK } from '../src/voyage/lowPoly.ts';
import { BEDROCK } from '../src/voyage/pointModels.ts';
import { buildTestigosStageTris, CAMP_AT, PIT, TESTIGOS_K, TESTIGOS_VIEWS, TOP } from '../src/testigos/testigosScene.ts';

describe('scene of the ice cores (#288)', () => {
  const tris = buildTestigosStageTris();

  it('builds a stage of finite faces, from the rock of the floor to the camp over the snow', () => {
    let [low, high] = [Infinity, -Infinity];
    for (const t of tris) {
      for (const v of t.slice(0, 3) as number[][]) {
        expect(v.every(Number.isFinite)).toBe(true);
        [low, high] = [Math.min(low, v[1]), Math.max(high, v[1])];
      }
    }
    expect(low).toBeCloseTo(0, 5);
    expect(high).toBeGreaterThan(TOP + 0.3 * TESTIGOS_K);
    expect(tris.some((t) => t[3] === BEDROCK)).toBe(true);
    expect(tris.some((t) => t[3] === RELIEF_ICE || t[3] === RELIEF_ROCK)).toBe(false);
  });

  it('leaves the pit open, and sets the camp on the snow behind it', () => {
    const inside = (x: number, z: number) => x > 0.5 && x < PIT - 0.5 && z > 0.5 && z < PIT - 0.5;
    const lid = tris.filter((t) => [t[0], t[1], t[2]].every((v) => Math.abs(v[1] - TOP) < 1e-6 && inside(v[0], v[2])));
    expect(lid).toHaveLength(0);
    expect(CAMP_AT[1]).toBe(TOP);
    // The camp model reaches 0.35 model units towards +z: it stays clear of the wall at z = 0.
    expect(CAMP_AT[2] + 0.36 * TESTIGOS_K).toBeLessThan(0);
  });

  it('has a view for every point of the visit, looking down at the cut', () => {
    for (const spot of TESTIGOS_SCENE.spots) {
      const { pos, target } = poseOf(TESTIGOS_VIEWS[spot.id]);
      expect(pos[1], spot.id).toBeGreaterThan(target[1]);
    }
  });
});

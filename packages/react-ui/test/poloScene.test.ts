import { describe, expect, it } from 'vitest';
import { POLO_SCENE } from '@antartida/core';
import { poseOf } from '../src/scenepoint/sceneView.ts';
import { RELIEF_ICE, RELIEF_ROCK } from '../src/voyage/lowPoly.ts';
import { POLO_FLAGS } from '../src/voyage/pointModels.ts';
import { buildPoloStageTris, POLO_K, POLO_VIEWS } from '../src/polo/poloScene.ts';

describe('scene of the South Pole (#286)', () => {
  const tris = buildPoloStageTris();

  it('builds a stage of finite faces on the snow, with the station standing over it', () => {
    let high = -Infinity;
    for (const t of tris) {
      for (const v of t.slice(0, 3) as number[][]) {
        expect(v.every(Number.isFinite)).toBe(true);
        // The snow drifts of the model sink just into the snow, so no edge shows.
        expect(v[1]).toBeGreaterThan(-0.01 * POLO_K);
        high = Math.max(high, v[1]);
      }
    }
    // The stilted wings stand some ten metres of the scene over the snow.
    expect(high).toBeGreaterThan(0.2 * POLO_K);
  });

  it('colors the relief of the map model as the plain snow of the scene', () => {
    expect(tris.some((t) => t[3] === RELIEF_ICE || t[3] === RELIEF_ROCK)).toBe(false);
  });

  it('keeps the flags of the map, among them the Argentine one', () => {
    expect(POLO_FLAGS.some((f) => f.colors.join() === [0x7fb6dc, 0xf7fafb, 0x7fb6dc].join())).toBe(true);
  });

  it('has a view for every point of the visit, from above the snow', () => {
    for (const spot of POLO_SCENE.spots) {
      const { pos, target } = poseOf(POLO_VIEWS[spot.id]);
      expect(pos[1], spot.id).toBeGreaterThan(0);
      expect(pos[1]).toBeGreaterThan(target[1]);
    }
  });
});

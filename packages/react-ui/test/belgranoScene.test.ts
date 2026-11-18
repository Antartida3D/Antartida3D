import { describe, expect, it } from 'vitest';
import { BELGRANO_SCENE } from '@antartida/core';
import { poseOf } from '../src/scenepoint/sceneView.ts';
import { RELIEF_ICE, RELIEF_ROCK } from '../src/voyage/lowPoly.ts';
import { ROCK } from '../src/voyage/sightingModels.ts';
import { BELGRANO_K, BELGRANO_VIEWS, buildBelgranoStageTris, RAISED, ROCK_RISE } from '../src/belgrano/belgranoScene.ts';
import { BELGRANO, POINT_MODELS } from '../src/voyage/pointModels.ts';

describe('scene of Belgrano II (#287)', () => {
  const tris = buildBelgranoStageTris();

  it('builds a stage of finite faces, with the nunatak and the base rising over the ice', () => {
    let high = -Infinity;
    for (const t of tris) {
      for (const v of t.slice(0, 3) as number[][]) {
        expect(v.every(Number.isFinite)).toBe(true);
        high = Math.max(high, v[1]);
      }
    }
    // The radio mast stands over the top of the nunatak (SITE 0.08 of the model).
    expect(high).toBeGreaterThan(0.25 * BELGRANO_K);
  });

  it('shows the rock of the nunatak as the plain rock of the scenes', () => {
    expect(tris.some((t) => t[3] === RELIEF_ICE || t[3] === RELIEF_ROCK)).toBe(false);
    expect(tris.some((t) => t[3] === ROCK)).toBe(true);
  });

  it('levels the rock under the base, so the buildings stand on it and do not float', () => {
    const pad = POINT_MODELS.belgrano.pad!;
    // The ground of the model (its lowest faces round the levelled top), under the buildings.
    const top = Math.max(...BELGRANO.flatMap((t) => [t[0][1], t[1][1], t[2][1]]).filter((y) => y <= 0.08));
    for (const t of RAISED) {
      for (const v of t.slice(0, 3) as number[][]) {
        if (Math.hypot(v[0], v[2]) < pad && v[1] <= top * ROCK_RISE + 1e-9) expect(v[1], `${v}`).toBeCloseTo(top * ROCK_RISE, 6);
      }
    }
  });

  it('has a view for every point of the visit, from above the ice', () => {
    for (const spot of BELGRANO_SCENE.spots) {
      const { pos, target } = poseOf(BELGRANO_VIEWS[spot.id]);
      expect(pos[1], spot.id).toBeGreaterThan(0);
      expect(pos[1]).toBeGreaterThan(target[1]);
    }
  });
});

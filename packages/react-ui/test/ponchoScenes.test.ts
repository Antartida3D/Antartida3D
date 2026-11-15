import { describe, expect, it } from 'vitest';
// Break the pre-existing stationModels <-> sightingModels -> penguins import cycle in test isolation.
import '../src/voyage/sightingModels.ts';
import {
  MAX_POLAR_DEG,
  PONCHO_SCENES,
  SCENE_FADE_END,
  TRANSPORTS,
  minCameraDistance,
  sceneUnit,
  startVoyage,
  voyageLength,
  voyageStops,
  type VoyageState,
} from '@antartida/core';
import { PERSON_VARIANTS } from '../src/voyage/ponchoPeople.ts';
import { PONCHO_PROP_IDS } from '../src/voyage/ponchoProps.ts';
import { PONCHO_MODELS } from '../src/voyage/ponchoModels.ts';
import { sceneFootprints, sceneStaticTris } from '../src/voyage/ponchoSceneBuild.ts';
import { sceneFocusAt, sceneLookAt } from '../src/voyage/ponchoSceneFocus.ts';
import type { Tri } from '../src/voyage/lowPoly.ts';

const scenes = Object.entries(PONCHO_SCENES);
const flat = () => 0;

describe('scenes of Poncho: ids against the models', () => {
  for (const [id, scene] of scenes) {
    it(`${id}: every element names a model, a variant or a dog that exists`, () => {
      for (const e of scene.elements) {
        if (e.kind === 'person') expect(PERSON_VARIANTS).toContain(e.id);
        if (e.kind === 'prop') expect(PONCHO_PROP_IDS).toContain(e.id);
        if (e.kind === 'sled') expect(e.id).toBe('nansenSled');
        if (e.kind === 'dog') expect(['poncho', 'pack']).toContain(e.id);
      }
      expect(PONCHO_MODELS['poncho-dog']).toBeDefined();
    });

    it(`${id}: the still parts have faces, are finite and sit on the ground`, () => {
      const tris = sceneStaticTris(scene, flat, (y) => y);
      const hasStill = scene.elements.some((e) => e.kind === 'prop' || (e.kind === 'person' && e.action === 'hammer') || (e.kind === 'dog' && e.curled));
      expect(tris.length > 0).toBe(hasStill);
      for (const t of tris) {
        expect(t.slice(0, 3).flat().every(Number.isFinite)).toBe(true);
        // Colors are resolved: none is left as a relief marker (negative), which would break the geometry.
        expect(t[3]).toBeGreaterThanOrEqual(0);
      }
      // Seated on a ground that rises 0.3 per unit of x, every face follows it: the lowest vertex under each foot is on it.
      const slope = (x: number) => 0.3 * x;
      const lifted = sceneStaticTris(scene, slope, (y) => y);
      if (tris.length) {
        const mean = (ts: readonly Tri[]) => ts.reduce((s, [a, b, c]) => s + a[1] + b[1] + c[1], 0) / (3 * ts.length);
        const meanX = lifted.reduce((s, [a, b, c]) => s + a[0] + b[0] + c[0], 0) / (3 * lifted.length);
        expect(mean(lifted) - mean(tris)).toBeCloseTo(0.3 * meanX, 1);
      }
    });

    it(`${id}: the prints, when there are, are one block of faces per print`, () => {
      const prints = sceneFootprints(scene, flat);
      expect(prints !== null).toBe(scene.paths.some((p) => p.prints));
      if (prints) {
        expect(Number.isInteger(prints.perPrint)).toBe(true);
        expect(prints.tris.length).toBe(prints.perPrint * prints.count);
      }
    });
  }
});

describe('scenes of Poncho: focus and camera', () => {
  const stops = voyageStops('dogs');
  const length = voyageLength('dogs');
  const at = (index: number, card: number, shiftUnits = 0): VoyageState => ({
    ...startVoyage('poncho'),
    t: stops[index].t + shiftUnits / length,
    reached: index + 1,
    card,
  });

  it('shows the scene of the stop whose card is open, whole', () => {
    const i = stops.findIndex((s) => s.milestone.id === 'rescate-ae-205');
    const f = sceneFocusAt(at(i, i))!;
    expect(f.stop.milestone.id).toBe('rescate-ae-205');
    expect(f.amount).toBe(1);
    expect(f.cardOpen).toBe(true);
  });

  it('shows nothing for a card of a stop without scene, even near one with it', () => {
    const i = stops.findIndex((s) => s.milestone.id === 'rumbo-a-belgrano');
    expect(sceneFocusAt(at(i, i))).toBeNull();
  });

  it('shows the scene when the team gets near its stop and not when it is far', () => {
    const i = stops.findIndex((s) => s.milestone.id === 'expedicion-invernal-1962');
    expect(sceneFocusAt(at(i, -1, -SCENE_FADE_END))?.stop.milestone.id).toBe('expedicion-invernal-1962');
    expect(sceneFocusAt(at(i, -1, 0))?.amount).toBe(1);
    expect(sceneFocusAt(at(i, -1, 40))).toBeNull();
  });

  it('is nothing for another kind of trip or no trip', () => {
    expect(sceneFocusAt(null)).toBeNull();
    expect(sceneFocusAt(startVoyage(TRANSPORTS.find((v) => v.kind === 'ship')!.id))).toBeNull();
  });

  for (const [id, scene] of scenes) {
    it(`${id}: the camera is at least the closest the map allows and above its polar limit`, () => {
      const stop = stops.find((s) => s.milestone.id === id)!;
      const { eye, target } = sceneLookAt(stop, scene);
      const d = Math.hypot(eye[0] - target[0], eye[1] - target[1], eye[2] - target[2]);
      const c = { x: target[0] + 500, y: target[2] + 500 };
      expect(d).toBeGreaterThanOrEqual(minCameraDistance(c.x, c.y) - 1e-9);
      // Angle from straight down must stay under MAX_POLAR_DEG, or the controls fight it.
      const polar = (Math.acos((eye[1] - target[1]) / d) * 180) / Math.PI;
      expect(polar).toBeLessThanOrEqual(MAX_POLAR_DEG);
      // The scene is as big on screen as at the closest zoom.
      expect(sceneUnit(d)).toBeGreaterThan(0);
      // And the camera looks at the side of the team, not at the team.
      const pin = { x: stop.pin.x - 500, z: stop.pin.y - 500 };
      expect(Math.hypot(target[0] - pin.x, target[2] - pin.z)).toBeGreaterThan(1);
    });
  }
});

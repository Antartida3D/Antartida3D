import {
  heightAt,
  minCameraDistance,
  sceneCameraOffset,
  sceneCenter,
  sceneOf,
  sceneUnit,
  sceneVisibility,
  voyageHeading,
  voyageLength,
  voyageStops,
  worldHeight,
  type SceneDef,
  type VoyageState,
  type VoyageStop,
} from '@antartida/core';

/**
 * Which scene of Poncho is on show and where the camera looks at it. Pure over the trip state and the
 * relief (no drawing), shared by the drawing (PonchoScenes3D.tsx) and the camera (Voyage3D.tsx).
 */
export interface SceneFocus {
  readonly stop: VoyageStop;
  readonly scene: SceneDef;
  /** 0..1: how much of the scene shows (sceneVisibility). */
  readonly amount: number;
  readonly cardOpen: boolean;
}

/** Height over the ground, in scene units, of the point the camera looks at: the chest of a person. */
export const SCENE_LOOK_HEIGHT = 0.5;

/** The stops of the trip of the dogs that have a scene, in trip order (built on first use: the stops load with the module). */
let sceneStops: readonly { stop: VoyageStop; scene: SceneDef }[] | null = null;
const stopsWithScene = () =>
  (sceneStops ??= voyageStops('dogs').flatMap((stop) => {
    const scene = sceneOf(stop.milestone.id);
    return scene ? [{ stop, scene }] : [];
  }));

/**
 * The scene to show for the state of the trip: the one of the stop whose card is open, else the one
 * of the nearest stop along the path while the team is within reach of it. null for another trip,
 * for a card of a stop without scene, and when no scene is near.
 */
export function sceneFocusAt(s: VoyageState | null): SceneFocus | null {
  if (!s || s.kind !== 'dogs') return null;
  const all = stopsWithScene();
  if (s.card >= 0) {
    const open = voyageStops('dogs')[s.card];
    const found = all.find((e) => e.stop === open);
    return found ? { ...found, amount: 1, cardOpen: true } : null;
  }
  const length = voyageLength('dogs');
  let best: SceneFocus | null = null;
  for (const e of all) {
    const amount = sceneVisibility(Math.abs(s.t - e.stop.t) * length, false);
    if (amount > (best?.amount ?? 0)) best = { ...e, amount, cardOpen: false };
  }
  return best;
}

/** Heading of the team at the stop, in map space. */
export const sceneHeading = (stop: VoyageStop): number => voyageHeading('dogs', stop.t);

/**
 * Where the camera stands and what it looks at (world x, y, z) to show the scene of `stop`: at
 * the closest the map allows there times the scene's distance factor, so it never fights the
 * zoom limit (minCameraDistance); the scene grows with that distance (sceneUnit) and reads whole.
 */
export function sceneLookAt(stop: VoyageStop, scene: SceneDef): { eye: [number, number, number]; target: [number, number, number] } {
  const heading = sceneHeading(stop);
  const c = sceneCenter(stop.pin.x, stop.pin.y, heading);
  const distance = minCameraDistance(c.x, c.y) * scene.camera.distanceFactor;
  const ground = Math.max(0, worldHeight(heightAt(c.x, c.y)));
  const target: [number, number, number] = [c.x - 500, ground + SCENE_LOOK_HEIGHT * sceneUnit(distance), c.y - 500];
  const o = sceneCameraOffset(scene.camera, heading, distance);
  return { eye: [target[0] + o.x, target[1] + o.y, target[2] + o.z], target };
}

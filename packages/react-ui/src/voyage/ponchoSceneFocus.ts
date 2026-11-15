import {
  heightAt,
  minCameraDistance,
  sceneCameraOffset,
  sceneCenter,
  sceneUnit,
  voyageHeading,
  worldHeight,
  type SceneDef,
  type VoyageStop,
} from '@antartida/core';

/**
 * Where the map camera goes when the diorama of a stop of Poncho opens (voyage/PonchoDiorama.tsx): it
 * comes down to the stop, close and low, under the screen that fades in. Pure over the relief.
 */

/** Height over the ground, in scene units, of the point the camera looks at: the chest of a person. */
export const SCENE_LOOK_HEIGHT = 0.5;

/** Heading of the team at the stop, in map space. */
export const sceneHeading = (stop: VoyageStop): number => voyageHeading('dogs', stop.t);

/**
 * Where the camera stands and what it looks at (world x, y, z) to show the scene of `stop`: at
 * the closest the map allows there times the scene's distance factor, so it never fights the
 * zoom limit (minCameraDistance). The point it looks at is a chest high on the scale of that distance (sceneUnit).
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

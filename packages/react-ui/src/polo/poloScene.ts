import type { PoloSpotId } from '@antartida/core';
import type { Tri, Vec3 } from '../voyage/lowPoly.ts';
import { POLO } from '../voyage/pointModels.ts';
import type { SpotView } from '../scenepoint/sceneView.ts';
import { atScene, plateauTris } from '../scenepoint/sceneGround.ts';

/**
 * The scene of the South Pole (#286), in world units: the Amundsen-Scott station of the map (POLO) at
 * the scale of the scene, on the snow of the plateau. The camera looks from +z, the side of the
 * windows. ILLUSTRATIVE: the buildings, their size and their places are a drawing (the scene says so).
 */

/** World units per model unit of POLO. */
export const POLO_K = 60;
/** The base of the model: the snow of the plateau is at y = 0. */
export const POLO_AT: Vec3 = [0, 0, 0];
/** How far the plateau runs, out to the sky. */
const PLATEAU = 300;

const at = (x: number, y: number, z: number): Vec3 => [x * POLO_K, y * POLO_K, z * POLO_K];

/** Everything that stands still: the plateau and the station (its flags swing: SceneFlags). */
export function buildPoloStageTris(): Tri[] {
  return [...plateauTris(0, PLATEAU, 0, 8, 28601), ...atScene(POLO, POLO_K, POLO_AT)];
}

export const POLO_VIEWS: Readonly<Record<PoloSpotId, SpotView>> = {
  // The whole station from the side of its windows, the ceremonial pole in front.
  station: { worldPos: at(0, 0.23, -0.14), target: at(0, 0.08, 0), distance: 100, bearingDeg: 20, elevationDeg: 22 },
  // The stilts and the chamfered underside the wind sweeps, from behind the station, over the drifts.
  raised: { worldPos: at(0.23, 0.07, -0.185), target: at(0.1, 0.1, -0.14), distance: 62, bearingDeg: 145, elevationDeg: 9 },
  // The ceremonial pole in its ring of flags.
  op90: { worldPos: at(-0.1, 0.16, 0.22), target: at(-0.1, 0.08, 0.2), distance: 40, bearingDeg: -20, elevationDeg: 16 },
};

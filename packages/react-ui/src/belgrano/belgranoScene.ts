import type { BelgranoSpotId } from '@antartida/core';
import type { Tri, Vec3 } from '../voyage/lowPoly.ts';
import { BELGRANO, POINT_MODELS } from '../voyage/pointModels.ts';
import type { SpotView } from '../scenepoint/sceneView.ts';
import { atScene, plateauTris } from '../scenepoint/sceneGround.ts';

/**
 * The scene of Belgrano II (#287), in world units: the Bertrab nunatak of the map (BELGRANO), with
 * the base on its levelled top, at the scale of the scene and rising out of the ice. The camera
 * looks from +z, the side of the windows. ILLUSTRATIVE: the nunatak, the buildings, their size and
 * their places are a drawing (the scene says so).
 */

/** World units per model unit of BELGRANO: the nunatak is two units across. */
export const BELGRANO_K = 100;
/** The base of the model: the ice round the nunatak is at y = 0. */
const BELGRANO_AT: Vec3 = [0, 0, 0];
/** Height of the levelled top of the nunatak in the model (SITE in pointModels.ts). */
const SITE = 0.08;
/**
 * How much higher the rock is drawn than in the model: on the map the low knoll lies on the relief;
 * here it has to stand out of the ice. Only the rock is stretched: what stands on its top is lifted whole.
 */
export const ROCK_RISE = 2.5;
/** How much the top of the nunatak, and the base on it, is lifted (model units). */
const LIFT = (ROCK_RISE - 1) * SITE;
/** Where the flags of the model (BELGRANO_FLAGS) hang from: lifted with the top of the nunatak. */
export const BELGRANO_FLAGS_AT: Vec3 = [0, LIFT * BELGRANO_K, 0];

/** The rock stretched up to its top; the base on it lifted by LIFT, so it keeps its shape. */
const raise = (y: number) => (y <= SITE ? y * ROCK_RISE : y + LIFT);

/**
 * The levelled top under the base, as on the map (PointModel.pad): the rock round the buildings rises
 * to SITE and fades back to its own height past it. Without it the hollows under the buildings,
 * stretched up, leave the base floating over the rock.
 */
const PAD = POINT_MODELS.belgrano.pad!;
const PAD_FADE = 0.12;
const levelled = ([x, y, z]: Vec3): Vec3 => {
  if (y > SITE) return [x, y, z];
  const t = Math.min(1, Math.max(0, (Math.hypot(x, z) - PAD) / PAD_FADE));
  const keep = t * t * (3 - 2 * t);
  return [x, Math.max(y, SITE * (1 - keep) + y * keep), z];
};
const lifted = (v: Vec3): Vec3 => {
  const [x, y, z] = levelled(v);
  return [x, raise(y), z];
};
export const RAISED: Tri[] = BELGRANO.map(([a, b, c, col]): Tri => [lifted(a), lifted(b), lifted(c), col]);
/** How far the ice runs, out to the sky. */
const PLATEAU = 400;

const at = (x: number, y: number, z: number): Vec3 => [x * BELGRANO_K, raise(y) * BELGRANO_K, z * BELGRANO_K];

/** Everything that stands still: the ice, the nunatak and the base (its flag swings: SceneFlags). */
export function buildBelgranoStageTris(): Tri[] {
  return [...plateauTris(0, PLATEAU, 0, 10, 28701), ...atScene(RAISED, BELGRANO_K, BELGRANO_AT)];
}

export const BELGRANO_VIEWS: Readonly<Record<BelgranoSpotId, SpotView>> = {
  // The whole nunatak rising from the ice, the base on its top.
  nunatak: { worldPos: at(-0.42, 0.04, -0.38), target: at(0, 0.05, 0), distance: 170, bearingDeg: 25, elevationDeg: 13 },
  // The flag on its stone base, in front of the main house.
  south: { worldPos: at(0.04, SITE + 0.18, 0.14), target: at(0.02, SITE + 0.08, 0.06), distance: 70, bearingDeg: -30, elevationDeg: 12 },
  // The main house, with snow drifted against its back.
  winter: { worldPos: at(-0.05, SITE + 0.07, 0), target: at(-0.05, SITE + 0.03, -0.03), distance: 75, bearingDeg: 15, elevationDeg: 22 },
  // The LABEL laboratory with its antenna, and the radome.
  label: { worldPos: at(0.14, SITE + 0.06, -0.1), target: at(0.14, SITE + 0.03, -0.02), distance: 60, bearingDeg: 40, elevationDeg: 16 },
};

import { METERS_PER_MAP_UNIT } from './relief.ts';
import { stormAt } from './storm.ts';
import { PTS } from './content/points.ts';
import type { Vector3Like } from './camera.ts';

/**
 * Tierra del Fuego, southern Patagonia and the Malvinas in map space: the land the Antarctic
 * terrain (Bedmap3, south of 60° S) does not cover. Built from IBCSO v2 by scripts/build-fuegia.ts.
 * No asset imports here, so the build script (Node) can use it too; the loader is in fuegia-mesh.ts.
 */
export const FUEGIA_BOX = { minX: -96, maxX: 100, minY: 194, maxY: 390 };

/** IBCSO v2 ends at 50° S; the relief sinks to sea level over the last FUEGIA_EDGE_FADE_DEG degrees. */
export const FUEGIA_DATA_LIMIT_LAT = -50.05;
export const FUEGIA_EDGE_FADE_DEG = 0.6;

/**
 * Heights here are multiplied by this, not by the continental VERTICAL_EXAGGERATION: the channels
 * are less than one map unit wide, and at x5 a 1000 m ridge already stands 0.6 units over them.
 * The UI legend states it.
 */
export const FUEGIA_VERTICAL_EXAGGERATION = 5;

/**
 * The mesh also carries the water within this many map units of the shore (about 30 km), so the
 * channels show the real coast instead of the ocean plane's Natural Earth one. The paint fades
 * out over the outer FUEGIA_WATER_FADE of that reach.
 */
export const FUEGIA_WATER_REACH = 4;
export const FUEGIA_WATER_FADE = 0.35;
/** Vertex mask values: land, or on water the distance to the shore scaled to 0..FUEGIA_WATER_MASK_MAX. */
export const FUEGIA_LAND_MASK = 255;
export const FUEGIA_WATER_MASK_MAX = 200;

/** Elevation in meters to world height (map units) with the regional exaggeration. */
export function fuegiaWorldHeight(meters: number): number {
  return (meters * FUEGIA_VERTICAL_EXAGGERATION) / METERS_PER_MAP_UNIT;
}

/** Load the relief only when the camera is within this many map units of the region center. */
export const FUEGIA_LOAD_DISTANCE = 1500;
export const FUEGIA_CENTER = {
  x: (FUEGIA_BOX.minX + FUEGIA_BOX.maxX) / 2,
  y: (FUEGIA_BOX.minY + FUEGIA_BOX.maxY) / 2,
};

export function inFuegia(x: number, y: number): boolean {
  return x >= FUEGIA_BOX.minX && x <= FUEGIA_BOX.maxX && y >= FUEGIA_BOX.minY && y <= FUEGIA_BOX.maxY;
}

/**
 * Closest the orbit camera of the 3D map may get to its target over Antarctica and its seas, the
 * same for the wheel, pinch, keys and buttons (#127). The target lies at sea level and the camera
 * tilts at most MAX_POLAR_DEG (60°), so it stays at least half this distance high: 12.5 world units,
 * more than twice the highest point of the relief (fuegia.test.ts measures it). At 20 the user
 * still ended up inside the white of the plateau.
 */
export const ICE_MIN_DISTANCE = 25;

/**
 * Closest the orbit camera may get to its target (map units). Over Antarctica `base` keeps it off
 * the plateau; around Tierra del Fuego the land is low and narrow channels need a closer look.
 * In the storm of the Drake, open sea, it may get as close: the camera has to go under the clouds.
 * It used to be 3, about 260 times closer than the overview: it felt like a zoom without end (#127).
 * At 15 the islands and channels still fill the screen.
 */
export const FUEGIA_MIN_DISTANCE = 15;
export function minCameraDistance(x: number, y: number, base = ICE_MIN_DISTANCE): number {
  if (inFuegia(x, y) || stormAt(x, y) > 0) return Math.min(base, FUEGIA_MIN_DISTANCE);
  // Round a point with a model the camera comes down to see it on the relief (MapPoint.closeUp).
  for (const p of CLOSE_UP_POINTS) {
    if (Math.hypot(x - p.x, y - p.y) < Math.max(CLOSE_UP_REACH, p.closeUp! * 2)) return Math.min(base, p.closeUp! * CLOSE_UP_MIN);
  }
  return base;
}

/** Around a point with a model the close-up rule holds this far (map units) at least. */
const CLOSE_UP_REACH = 4;
/** The camera may come this fraction of the close-up distance to the model. */
const CLOSE_UP_MIN = 0.5;
const CLOSE_UP_POINTS = PTS.filter((p) => p.closeUp !== undefined);

/**
 * Highest an orbit target may float over sea level before it is put back on the ground: above the
 * highest relief (about 5 world units) and the close-up of a model, which looks at its ground.
 */
export const GROUND_TARGET_MAX = 8;
/** Lowest an orbit target may sink under sea level before it is put back. */
export const GROUND_TARGET_MIN = -0.5;

/**
 * Where the orbit target of the map should be when it left the ground, or null when it is fine.
 * Zooming towards the cursor moves the target across the screen plane, so it climbs into the air
 * (cursor high up) or sinks under the map (cursor low down), and the camera, kept at its closest
 * distance from that target, goes into the map: the zoom with no end (#127). The target slides
 * along the line of sight back to sea level, so the picture does not change.
 */
export function groundTarget(pos: Vector3Like, target: Vector3Like): Vector3Like | null {
  if (target.y >= GROUND_TARGET_MIN && target.y <= GROUND_TARGET_MAX) return null;
  const dy = target.y - pos.y;
  // The camera looks down at the ground: where the line of sight meets it.
  if (pos.y > 0 && dy < 0) {
    const s = pos.y / -dy;
    return { x: pos.x + (target.x - pos.x) * s, y: 0, z: pos.z + (target.z - pos.z) * s };
  }
  return { x: target.x, y: 0, z: target.z };
}

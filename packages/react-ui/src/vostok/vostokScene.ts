import type { VostokSpotId } from '@antartida/core';
import { scaled, shift, type Tri, type Vec3 } from '../voyage/lowPoly.ts';
import { BEDROCK, VOSTOK_STATION, VOSTOK_TOP, VOSTOK_X, VOSTOK_Z, vostokFace } from '../voyage/pointModels.ts';
import type { SpotView } from '../scenepoint/sceneView.ts';
import { plateauTris } from '../scenepoint/sceneGround.ts';

/**
 * The scene of Lake Vostok (#281), in world units: a pit cut into the snow of the plateau, whose four
 * walls show the layers of the section of the map model (vostokFace): rock, the lake, deep ice and
 * ice. The station stands tiny at its rim. North is -z; the camera looks from +x, +z.
 * ILLUSTRATIVE, not to scale: the lake is drawn far thicker than its 510 m under about 4 km of ice,
 * and the station far bigger (the scene says so).
 */

/** World units per unit of the section (u, v of vostokLayers) across, and per model unit up. */
const W = 80;
const Y = 200;
/** Side of the pit (world units), from the corner at the origin towards +x and +z. */
export const PIT = 120;
/** Height of the snow of the plateau. */
export const TOP = VOSTOK_TOP * Y;
/** How far the plateau runs, out to the sky. */
const PLATEAU = 300;
/** Uniform scale of the station: it stays small next to the ice, though far bigger than it is. */
const STATION_K = 22;
/** Steps of each wall: enough for the lake to curve. */
const WALL_SAMPLES = 40;

const pitU = PIT / W;

/** A cut face from (u0, v0) to (u1, v1) in the section's units, in the world. */
const wall = (u0: number, v0: number, u1: number, v1: number): Tri[] =>
  vostokFace(u0, v0, u1, v1, WALL_SAMPLES).map(([a, b, c, col]): Tri => {
    const p = ([x, y, z]: Vec3): Vec3 => [(x / VOSTOK_X) * W, y * Y, (z / VOSTOK_Z) * W];
    return [p(a), p(b), p(c), col];
  });

/** The four walls of the pit, each facing into it. */
function wallsTris(): Tri[] {
  return [
    // At z = 0 facing +z, and at x = 0 facing +x: the two the camera sees first.
    ...wall(0, 0, pitU, 0),
    ...wall(0, pitU, 0, 0),
    // At x = PIT facing -x, and at z = PIT facing -z: seen from inside or across the pit.
    ...wall(pitU, 0, pitU, pitU),
    ...wall(pitU, pitU, 0, pitU),
  ];
}

/** The floor of the pit: the rock under the bottom of the section. */
function floorTris(): Tri[] {
  return [
    [[0, 0, 0], [0, 0, PIT], [PIT, 0, PIT], BEDROCK],
    [[0, 0, 0], [PIT, 0, PIT], [PIT, 0, 0], BEDROCK],
  ];
}

/** Where the station stands on the rim, behind the corner of the pit (north-west of it). */
export const STATION_AT: Vec3 = [-14, TOP, -10];

/** The station and its drill tower, on the snow at STATION_AT. */
function stationTris(): Tri[] {
  return shift(scaled(shift(VOSTOK_STATION, 0, -VOSTOK_TOP, 0), STATION_K), ...STATION_AT);
}

/** Everything that stands still: the plateau, the walls and floor of the pit and the station. */
export function buildVostokStageTris(): Tri[] {
  return [...plateauTris(TOP, PLATEAU, PIT, 8, 28101), ...wallsTris(), ...floorTris(), ...stationTris()];
}

/** Height of the lake on the walls near the corner, where its lens is deepest. */
const LAKE_Y = 0.09 * Y;

export const VOSTOK_VIEWS: Readonly<Record<VostokSpotId, SpotView>> = {
  // The whole cut from above its corner, the station on the rim; the dot on the lake at the corner.
  lake: { worldPos: [2, LAKE_Y, 2], target: [PIT * 0.3, TOP * 0.4, PIT * 0.3], distance: 260, bearingDeg: 45, elevationDeg: 26 },
  // The rock under the lake and the ice over it, on the wall at x = 0.
  liquid: { worldPos: [1, LAKE_Y * 0.7, PIT * 0.55], target: [0, TOP * 0.35, PIT * 0.45], distance: 210, bearingDeg: 70, elevationDeg: 24 },
  // The lake on the wall at z = 0, along its length.
  life: { worldPos: [PIT * 0.3, LAKE_Y, 1], target: [PIT * 0.4, TOP * 0.35, 0], distance: 210, bearingDeg: 20, elevationDeg: 24 },
};

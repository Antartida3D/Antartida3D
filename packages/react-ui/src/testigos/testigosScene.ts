import { createSeededRng, type TestigosSpotId } from '@antartida/core';
import { quad, type Tri, type Vec3 } from '../voyage/lowPoly.ts';
import { BEDROCK, GLACIAL_ICE, GLACIAL_ICE_DEEP, TESTIGOS } from '../voyage/pointModels.ts';
import { BLACK, ICE, ICE_WALL, WHITE } from '../voyage/sightingModels.ts';
import type { SpotView } from '../scenepoint/sceneView.ts';
import { atScene, plateauTris } from '../scenepoint/sceneGround.ts';

/**
 * The scene of the ice cores (#288), in world units: the drilling camp of the map (TESTIGOS) on the
 * snow of the plateau, behind a pit cut into the ice. Its walls show snow, firn and layers of ice
 * that grow thinner with depth, the air sealed in bubbles near the top, and the borehole down to the
 * rock. The pit runs from the corner at the origin towards +x and +z; the camera looks from +x, +z.
 * ILLUSTRATIVE: the layers, the bubbles and the depth are a drawing, not to scale (the scene says so).
 */

/** World units per model unit of TESTIGOS. */
export const TESTIGOS_K = 60;
/** Height of the snow of the plateau: the depth of the cut. */
export const TOP = 100;
/** Side of the pit. */
export const PIT = 90;
/** How far the plateau runs, out to the sky. */
const PLATEAU = 300;
/** Where the camp stands: behind the wall at z = 0, clear of the pit (its model reaches 0.35 towards +z). */
export const CAMP_AT: Vec3 = [PIT * 0.4, TOP, -24];
/** Where the borehole runs down the wall at z = 0: under the drill tower of the camp (model x 0). */
export const BOREHOLE_X = CAMP_AT[0];

/** Depth (fraction of TOP) of the snow, of the firn and of the rock under the ice. */
const SNOW = 0.03;
const FIRN = 0.12;
const ROCK = 0.06;
/** Layers of ice between the firn and the rock. */
const LAYERS = 16;
/** Steps of each wall, so the layers can wave a little. */
const STEPS = 12;

/** Depth (world units from the top) of the bottom of every band, top down, and its color. */
function bands(): { depth: number; color: number }[] {
  const out = [
    { depth: SNOW * TOP, color: WHITE },
    { depth: FIRN * TOP, color: ICE },
  ];
  const [top, bottom] = [FIRN * TOP, (1 - ROCK) * TOP];
  for (let i = 1; i <= LAYERS; i++) {
    // Thinner with depth: the weight of the ice above presses the old layers.
    const depth = top + (bottom - top) * Math.sqrt(i / LAYERS);
    const deep = i > LAYERS / 2;
    out.push({ depth, color: deep ? (i % 2 ? GLACIAL_ICE : GLACIAL_ICE_DEEP) : i % 2 ? ICE_WALL : GLACIAL_ICE });
  }
  out.push({ depth: TOP, color: BEDROCK });
  return out;
}

/** A gentle wave of a band boundary, by the distance `s` along the rim; it fades towards the rock. */
const wave = (s: number, depth: number) => (depth >= TOP ? 0 : Math.sin(s * 0.11 + depth * 0.07) * 0.8 * (1 - depth / TOP));

/**
 * One wall of the pit from (x0, z0) to (x1, z1) at the rim, in bands, facing the side on the left of
 * that direction as seen from inside the pit. `s0` is the distance along the rim at its start.
 */
function wallTris(x0: number, z0: number, x1: number, z1: number, s0: number): Tri[] {
  const out: Tri[] = [];
  const len = Math.hypot(x1 - x0, z1 - z0);
  let upper = 0;
  for (const { depth, color } of bands()) {
    for (let k = 0; k < STEPS; k++) {
      const [t0, t1] = [k / STEPS, (k + 1) / STEPS];
      const [ax, az, bx, bz] = [x0 + (x1 - x0) * t0, z0 + (z1 - z0) * t0, x0 + (x1 - x0) * t1, z0 + (z1 - z0) * t1];
      const [sa, sb] = [s0 + len * t0, s0 + len * t1];
      const y = (d: number, s: number) => TOP - d - wave(s, d);
      out.push(...quad([ax, y(depth, sa), az], [bx, y(depth, sb), bz], [bx, y(upper, sb), bz], [ax, y(upper, sa), az], color));
    }
    upper = depth;
  }
  return out;
}

/** The four walls of the pit, each facing into it; the distance along the rim keeps the waves meeting at the corners. */
function wallsTris(): Tri[] {
  return [
    ...wallTris(0, 0, PIT, 0, 0),
    ...wallTris(0, PIT, 0, 0, PIT),
    ...wallTris(PIT, 0, PIT, PIT, PIT),
    ...wallTris(PIT, PIT, 0, PIT, 2 * PIT),
  ];
}

/** Off the wall at z = 0, towards the pit, so what is drawn on it is not hidden in it. */
const ON_WALL = 0.08;

/** Air sealed in bubbles in the ice under the firn, on the wall at z = 0: small diamonds. ILLUSTRATIVE. */
function bubblesTris(): Tri[] {
  const rng = createSeededRng(28801);
  const out: Tri[] = [];
  for (let i = 0; i < 70; i++) {
    const x = 3 + rng() * (PIT - 6);
    const y = TOP - (FIRN + 0.02 + rng() * 0.3) * TOP;
    const r = 0.35 + rng() * 0.45;
    out.push(...quad([x, y - r, ON_WALL], [x + r, y, ON_WALL], [x, y + r, ON_WALL], [x - r, y, ON_WALL], WHITE));
  }
  return out;
}

/** The borehole down the wall at z = 0, from the snow to the rock. */
function boreholeTris(): Tri[] {
  const w = 0.7;
  return quad([BOREHOLE_X - w, (ROCK - 0.01) * TOP, ON_WALL * 2], [BOREHOLE_X + w, (ROCK - 0.01) * TOP, ON_WALL * 2], [BOREHOLE_X + w, TOP, ON_WALL * 2], [BOREHOLE_X - w, TOP, ON_WALL * 2], BLACK);
}

/** The floor of the pit: the rock. */
const floorTris = (): Tri[] => quad([0, 0, PIT], [PIT, 0, PIT], [PIT, 0, 0], [0, 0, 0], BEDROCK);

/** Everything that stands still: the plateau, the walls and floor of the pit, the bubbles, the borehole and the camp. */
export function buildTestigosStageTris(): Tri[] {
  return [...plateauTris(TOP, PLATEAU, PIT, 8, 28802), ...wallsTris(), ...floorTris(), ...bubblesTris(), ...boreholeTris(), ...atScene(TESTIGOS, TESTIGOS_K, CAMP_AT)];
}

export const TESTIGOS_VIEWS: Readonly<Record<TestigosSpotId, SpotView>> = {
  // The bubbles under the firn, close, on the wall at z = 0.
  bubbles: { worldPos: [PIT * 0.25, TOP * 0.78, 1], target: [PIT * 0.3, TOP * 0.82, 0], distance: 85, bearingDeg: 15, elevationDeg: 14 },
  // The whole cut with the borehole, the camp on the rim behind it.
  epica: { worldPos: [BOREHOLE_X, TOP * 0.5, 1], target: [PIT * 0.4, TOP * 0.5, 0], distance: 230, bearingDeg: 25, elevationDeg: 38 },
  // The bottom of the borehole, where the ice meets the rock.
  beyond: { worldPos: [BOREHOLE_X, ROCK * TOP, 1], target: [BOREHOLE_X, TOP * 0.15, 0], distance: 70, bearingDeg: 10, elevationDeg: 12 },
};

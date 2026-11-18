import type { ThwaitesSpotId } from '@antartida/core';
import { groundField, quad, RELIEF_ICE, RELIEF_ROCK, shift, type Tri, type Vec3 } from '../voyage/lowPoly.ts';
import { THWAITES_REACH, thwaitesFront } from '../voyage/pointModels.ts';
import { ICE, ICE_SHADE, ICE_WALL, WHITE } from '../voyage/sightingModels.ts';
import type { SceneFloe, SceneIceberg, SpotView } from '../scenepoint/sceneView.ts';

/**
 * The scene of Thwaites Glacier (#280), in world units: the front of the map and of its card
 * (thwaitesFront) on a made-up stretch of coast, scaled up, with the ice sheet rising inland (-z)
 * and the Amundsen Sea in front (+z). ILLUSTRATIVE: the ice is drawn far higher than it is, the width
 * is shortened and the calving is sped up (the scene says so).
 */

/** World units per model unit of thwaitesFront: across, and up (the ice is exaggerated). */
export const H = 12;
export const V = 40;
/** The sea plane of thwaitesFront (model y); the scene's sea is at world y = 0. */
const SEA_MODEL_Y = -0.05;

/** Where the coast runs (model z, +z is the sea), at model x: the coast of the card, a bay and a tongue. */
const coastLine = (dx: number) => 0.6 + 0.35 * Math.sin(dx * 1.7) - 0.35 * Math.exp(-(((dx - 0.8) / 0.25) ** 2));
/** Signed distance to the coast: > 0 on ice, < 0 on sea. */
const coastAt = (dx: number, dz: number) => coastLine(dx) - dz;
/** Height of the ice (model units): low at the front, rising inland. */
const groundAt = (dx: number, dz: number) => (coastAt(dx, dz) > 0 ? 0.06 + Math.min(0.3, Math.max(0, -dz) * 0.04) : 0);

/** A point of the model in the world. */
const world = ([x, y, z]: Vec3): Vec3 => [x * H, (y - SEA_MODEL_Y) * V, z * H];
const toWorld = (tris: readonly Tri[]): Tri[] => tris.map(([a, b, c, col]) => [world(a), world(b), world(c), col]);
/** Brash ice and icebergs keep their shape: they are not stretched up like the ice. */
const floating = ([x, y, z]: Vec3): Vec3 => [x * H, (y - SEA_MODEL_Y) * H, z * H];
const toWorldFloating = (tris: readonly Tri[]): Tri[] => tris.map(([a, b, c, col]) => [floating(a), floating(b), floating(c), col]);
/** The relief colors of thwaitesFront (made for the painted map) as the plain ice of the scenes. */
const plainIce = (tris: readonly Tri[]): Tri[] => tris.map((t) => (t[3] === RELIEF_ICE || t[3] === RELIEF_ROCK ? [t[0], t[1], t[2], WHITE] : t));

const FRONT = thwaitesFront(groundAt, coastAt);

/** How far the ice sheet runs: across (model x) and inland (model z), out to the sky. */
const SHEET_X = 26;
const SHEET_BACK = -26;
/** Past the furthest point of the coast, so the sheet reaches the cliff everywhere. */
const SHEET_FRONT = 1.2;
/** Where the fine band along the coast gives way to the coarse sheet inland. */
const SHEET_FINE = -2.2;

const snow = (_u: number, _v: number, _h: number, steep: number, noise: number) =>
  // Snow with a rare hollow: the sheet reads as one plain.
  steep > 0.5 ? ICE_WALL : noise > 0.97 ? ICE_SHADE : noise > 0.9 ? ICE : WHITE;

/** Ice sheet between model z0 and z1, in cells of `cell`, where `keep(x, z)`. */
function sheetBand(z0: number, z1: number, cell: number, seed: number, keep: (x: number, z: number) => boolean): Tri[] {
  const mid = (z0 + z1) / 2;
  const field = groundField(
    Math.round((2 * SHEET_X) / cell),
    Math.round((z1 - z0) / cell),
    cell,
    seed,
    (u, v, noise) => {
      const [x, z] = [u * SHEET_X, mid + (v * (z1 - z0)) / 2];
      return keep(x, z) ? groundAt(x, z) + noise * 0.003 : null;
    },
    snow,
    0.06,
  );
  // groundField is centred on (0, 0).
  return shift(field, 0, 0, mid);
}

/**
 * The ice sheet: a fine band along the coast, in the cells of thwaitesFront, so where it ends it
 * falls just behind the crest of the cliff and not in front of it; inland, coarse cells out to the
 * horizon, whose front edge falls under the fine band.
 */
function sheetTris(): Tri[] {
  return [
    ...sheetBand(SHEET_FINE, SHEET_FRONT, 0.1, 28001, (x, z) => coastAt(x, z) > 0.13),
    ...sheetBand(SHEET_BACK, SHEET_FINE + 0.4, 0.4, 28002, (_x, z) => z < SHEET_FINE + 0.1),
  ];
}

/** The cliff on past the square of thwaitesFront (|x| > its reach): a plain wall along the coast, as high as the ice there. */
function sideCliffTris(): Tri[] {
  const out: Tri[] = [];
  const step = 0.1;
  for (const side of [-1, 1]) {
    for (let x = THWAITES_REACH; x < SHEET_X; x += step) {
      const [x0, x1] = side > 0 ? [x, x + step] : [-x - step, -x];
      const [z0, z1] = [coastLine(x0), coastLine(x1)];
      const [t0, t1] = [groundAt(x0, z0 - 0.02), groundAt(x1, z1 - 0.02)];
      // Facing the sea (+z).
      out.push(...quad([x0, -0.06, z0], [x1, -0.06, z1], [x1, t1, z1], [x0, t0, z0], ICE_WALL));
    }
  }
  return out;
}

/** Everything that stands still: the ice sheet, its front with its crevasses, the brash ice and the icebergs near it. */
export function buildThwaitesStageTris(): Tri[] {
  return [...toWorld(plainIce([...sheetTris(), ...sideCliffTris(), ...FRONT.cliff, ...FRONT.crevasses])), ...toWorldFloating(FRONT.brash)];
}

/** The block is drawn wider than its piece of front, so it reads as a block. */
const BLOCK_WIDEN = 2.5;
const stretch = ([x, y, z]: Vec3): Vec3 => [x * H * BLOCK_WIDEN, y * V, z * H * BLOCK_WIDEN];

/**
 * The block that breaks off, at world scale: its faces round its pivot (its seaward foot), the pivot
 * in the world and the turn that faces it to the sea. It tips like the one of the map (calvingPose).
 */
export const CALVING: { tris: Tri[]; pivot: Vec3; heading: number } | null = FRONT.calving
  ? {
      tris: plainIce(FRONT.calving.tris).map(([a, b, c, col]): Tri => [stretch(a), stretch(b), stretch(c), col]),
      pivot: world(FRONT.calving.pivot),
      heading: FRONT.calving.heading,
    }
  : null;

/** The world height of the top of the front at model x: the cliff rises at least to its least height. */
const frontTop = (dx: number) => Math.max(groundAt(dx, coastLine(dx) - 0.05), 0.1);

/** Icebergs out at sea, broken from the front: [x, z, size, turn, tabular, held]. */
export const THWAITES_ICEBERGS: readonly SceneIceberg[] = [
  [-50, 46, 16, 0.4, true, false],
  [38, 64, 13, 2.1, true, false],
  [-92, 30, 11, 1.2, false, false],
  [96, 40, 14, 3.0, true, false],
  [6, 96, 10, 0.9, false, false],
];

/** Loose sea ice in front of the cliff: [x, z, size, turn, variant]. */
export const THWAITES_FLOES: readonly SceneFloe[] = [
  [-70, 24, 3.2, 0.4, 0], [-30, 30, 2.4, 1.9, 1], [-8, 34, 3.6, 2.6, 2], [22, 28, 2.6, 0.9, 3],
  [48, 32, 3, 4.1, 0], [70, 22, 2.2, 1.2, 1], [-54, 40, 2.8, 5.0, 2], [12, 48, 2.2, 0.2, 3],
  [60, 50, 2.6, 2.2, 0], [-20, 58, 2, 3.3, 1],
];

const at = (dx: number, dy: number, dz: number): Vec3 => world([dx, dy, dz]);

/** Where the calving block stands (model x, z), or the middle of the front without it. */
const BLOCK: [number, number] = FRONT.calving ? [FRONT.calving.pivot[0], FRONT.calving.pivot[2]] : [0, coastLine(0)];

export const THWAITES_VIEWS: Readonly<Record<ThwaitesSpotId, SpotView>> = {
  // The whole front from the sea, a little above it.
  front: { worldPos: at(-1.4, frontTop(-1.4) + 0.03, coastLine(-1.4)), target: at(-0.4, 0.02, coastLine(-0.4) - 0.3), distance: 62, bearingDeg: 6, elevationDeg: 16 },
  // The block that breaks off, close.
  loss: { worldPos: at(BLOCK[0], frontTop(BLOCK[0]) + 0.05, BLOCK[1]), target: at(BLOCK[0], 0.05, BLOCK[1]), distance: 26, bearingDeg: -24, elevationDeg: 12 },
  // The foot of the cliff at the water, from low over the sea.
  below: { worldPos: at(1.9, SEA_MODEL_Y + 0.02, coastLine(1.9) + 0.06), target: at(1.8, 0.0, coastLine(1.8)), distance: 22, bearingDeg: 30, elevationDeg: 5 },
  // Far out: the front, the ice behind and the open sea.
  sea: { worldPos: at(0.4, 0.05, coastLine(0.4) + 1.6), target: at(0, 0.1, coastLine(0) - 0.6), distance: 110, bearingDeg: -8, elevationDeg: 24 },
};

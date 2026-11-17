import type { CerroNevadoSpotId } from '@antartida/core';
import { TENT_TRIS, SLED_TRIS } from '../fossils/lowPolyScenery.ts';
import { block, emperor, emperorChick, emperorFlipper, emperorWithFlippers, EMPEROR_SHOULDER, groundField, scaled, shift, strut, turn, type Tri, type Vec3 } from '../voyage/lowPoly.ts';
import { ICE, ICE_SHADE, ICE_WALL, ROCK, WHITE } from '../voyage/sightingModels.ts';

/**
 * The scene of the emperor colony of Cerro Nevado (#206), in world units (an emperor is about 1.2
 * tall). North is -z: the ice cliffs of Snow Hill Island stand behind; the fast ice runs from them
 * to its edge towards the sea (+z), where the colony stands; in front lies the pack ice. Fast ice is
 * sea ice held to the shore that does not move with the winds or currents (NSIDC). Every place and
 * count is an illustration: distances are shortened and the number of birds is not a census.
 */

// Approximate colours: guano on the ice, the camp's snowmobiles (their colour is not in the sources).
const GUANO = 0xa88a76;
const SLED_ORANGE = 0xd0562a;
const SEAT_BLACK = 0x26292d;
const TRACK_DARK = 0x3a3f45;
const GLASS = 0x8fb3c9;
const METAL = 0x9aa3a8;

export const ADULT_K = 1.2;
const CHICK_K = 0.7;

/** Where the fast ice ends towards the sea (world z), at world x. */
export const fastIceEdge = (x: number) => 10 + Math.sin(x * 0.07 + 0.6) * 3 + Math.sin(x * 0.19) * 1.5;

/** Top of the fast ice: a hand over the sea, so its edge is a low step and not a wall. */
export const FAST_ICE_TOP = 0.35;

/** The ice cap of Snow Hill Island behind the colony: cliffs of ice at the shore (z = -36), a few rocks, snow on top. */
function islandTris(): Tri[] {
  const field = groundField(
    40,
    20,
    6,
    20621,
    (_u, v, noise) => {
      // v runs from -1 (north) to 1 (the shore). The shore itself is left empty, so the cap falls
      // there as a cliff into the fast ice.
      if (v > 0.96) return null;
      const d = (0.96 - v) * 60;
      return Math.min(22, 6 + d * 0.8) + noise * 0.8;
    },
    (_u, v, _h, steep, noise) => {
      if (steep > 0.6) return noise > 0.9 && v > 0.6 ? ROCK : ICE_WALL;
      return noise > 0.85 ? ICE : WHITE;
    },
    3,
  );
  return shift(field, 0, 0, -96);
}

/** The fast ice: a thin flat sheet from the shore to its edge, with the guano of the colony along the edge. */
function fastIceTris(): Tri[] {
  const field = groundField(
    72,
    22,
    2.5,
    20622,
    (u, v, noise) => {
      const [x, z] = [u * 90, v * 27.5 - 12.5];
      return z < fastIceEdge(x) ? FAST_ICE_TOP + noise * 0.015 : null;
    },
    (u, v, _h, steep, noise) => {
      const [x, z] = [u * 90, v * 27.5 - 12.5];
      if (steep > 0.5) return ICE_WALL;
      // Stains in patches where the groups stand, and under the crèche.
      const group = [-6, 8, 22, 36].some((gx) => Math.hypot((x - gx) / 4.5, (z - (fastIceEdge(gx) - 3.6)) / 2.2) < 1);
      const creche = Math.hypot((x + 20) / 6.5, (z - 3) / 2.6) < 1;
      if ((group || creche) && noise > 0.45) return GUANO;
      // Snow with a rare hollow: the fast ice reads as one flat sheet.
      return noise > 0.97 ? ICE_SHADE : noise > 0.9 ? ICE : WHITE;
    },
    0.6,
  );
  return shift(field, 0, 0, -12.5);
}

/** A snowmobile of the camp: front +x, base on y = 0, about 2.4 long. Colours illustrative. */
export const SNOWMOBILE_TRIS: readonly Tri[] = [
  ...block(0.15, 0.42, 0, 1.25, 0.34, 0.6, SLED_ORANGE),
  ...block(0.75, 0.32, 0, 0.35, 0.22, 0.52, SLED_ORANGE, SEAT_BLACK),
  ...block(-0.35, 0.68, 0, 0.75, 0.14, 0.44, SEAT_BLACK),
  ...block(0.42, 0.78, 0, 0.08, 0.3, 0.5, GLASS),
  ...block(-0.35, 0.2, 0, 1.2, 0.26, 0.42, TRACK_DARK),
  ...[0.3, -0.3].flatMap((z) => [
    ...strut([0.55, 0.03, z], [1.1, 0.03, z], 0.04, METAL),
    ...strut([1.1, 0.03, z], [1.22, 0.14, z], 0.04, METAL),
    ...strut([0.75, 0.05, z], [0.7, 0.28, z], 0.03, METAL),
  ]),
  ...strut([0.32, 0.86, -0.3], [0.32, 0.86, 0.3], 0.025, SEAT_BLACK),
];

/** A placed piece: model faces turned, scaled and moved into the scene. */
const place = (tris: readonly Tri[], x: number, y: number, z: number, k: number, facing = 0): Tri[] => shift(scaled(turn(tris, facing), k), x, y, z);

/** An emperor that stands on the fast ice. */
const adult = (x: number, z: number, facing: number, k = ADULT_K) => shift(emperorWithFlippers(0, 0, k, facing), x, FAST_ICE_TOP, z);
const chick = (x: number, z: number, facing: number, k = CHICK_K) => shift(emperorChick(0, 0, k, facing), x, FAST_ICE_TOP, z);

/** The crèche in the lee of the iceberg (Schiel et al. 2019: 144 chicks "on the lee side of an iceberg"); fewer drawn. */
function crecheTris(): Tri[] {
  return Array.from({ length: 34 }, (_, i) => {
    const a = i * 2.39996;
    const r = Math.sqrt(i / 34);
    return chick(-20 + Math.cos(a) * r * 7, 3 + Math.sin(a) * r * 2.6, a * 0.7, CHICK_K * (0.9 + (i % 3) * 0.06));
  }).flat();
}

/** Groups of chicks and adults strung along the edge of the fast ice, on the flat ice. */
function edgeGroupsTris(): Tri[] {
  const out: Tri[] = [];
  [-6, 8, 22, 36].forEach((cx, g) => {
    const cz = fastIceEdge(cx) - 3.6;
    for (let i = 0; i < 7; i++) {
      const a = i * 2.2 + g;
      out.push(...chick(cx + Math.cos(a) * 2.6, cz + Math.sin(a) * 1.2, a));
    }
    for (let i = 0; i < 3; i++) {
      const a = i * 2.1 + g * 0.7;
      out.push(...adult(cx + Math.cos(a) * 3.4 + 1, cz + Math.sin(a) * 1.4, a * 1.3));
    }
  });
  return out;
}

/** The Argentine camp by its iceberg (IAA: "a 300 metros de la colonia, protegido por témpano"): tents, a sled and snowmobiles. */
function campTris(): Tri[] {
  return [
    ...place(TENT_TRIS, -46, FAST_ICE_TOP, -9, 2.2, 0.3),
    ...place(TENT_TRIS, -41.5, FAST_ICE_TOP, -7.5, 2, -0.2),
    ...place(SLED_TRIS, -39, FAST_ICE_TOP, -11, 2.4, 1.2),
    ...place(SNOWMOBILE_TRIS, -48, FAST_ICE_TOP, -4.5, 1, -0.4),
    ...place(SNOWMOBILE_TRIS, -44, FAST_ICE_TOP, -3.6, 1, -0.1),
  ];
}

/** The emperor in front that waves, facing the first view of the scene (from the sea, +z). */
export const WAVER = { x: 7, z: fastIceEdge(7) - 1.6, facing: -1.45 } as const;

/** The waving flipper: its faces, the shoulder it hangs from and the turn of the emperor. */
export const WAVE = {
  flipper: scaled(emperorFlipper(1), ADULT_K),
  shoulder: ((): Vec3 => {
    const [[at]] = shift(scaled(turn([[EMPEROR_SHOULDER, EMPEROR_SHOULDER, EMPEROR_SHOULDER, 0]], WAVER.facing), ADULT_K), WAVER.x, FAST_ICE_TOP, WAVER.z);
    return at;
  })(),
  facing: WAVER.facing,
} as const;

/** The waver without its +z flipper, which is WAVE. */
function waverTris(): Tri[] {
  const [sx, sy, sz] = EMPEROR_SHOULDER;
  return [
    ...shift(emperor(0, 0, ADULT_K, WAVER.facing), WAVER.x, FAST_ICE_TOP, WAVER.z),
    // The shoulder is in units of emperor(): place() scales it with the bird.
    ...place(shift(emperorFlipper(-1), sx, sy, -sz), WAVER.x, FAST_ICE_TOP, WAVER.z, ADULT_K, WAVER.facing),
  ];
}

/** Everything that stands still: island, fast ice, colony, crèche, camp and the waver's body. */
export function buildColonyStageTris(): Tri[] {
  return [...islandTris(), ...fastIceTris(), ...crecheTris(), ...edgeGroupsTris(), ...campTris(), ...waverTris()];
}

/** Icebergs: [x, z, size, turn, tabular, held in the fast ice]. The ones held in the ice have no waterline. */
export const COLONY_ICEBERGS: readonly (readonly [number, number, number, number, boolean, boolean])[] = [
  [-20, -7, 15, 0.3, true, true],
  [-50, -16, 9, 1.4, false, true],
  [44, 58, 14, 2.2, true, false],
  [-72, 46, 10, 0.8, false, false],
  [92, 24, 12, 3.4, true, false],
];

/** The narrow belt of pack ice in front of the edge: [x, z, size, turn, variant]. */
export const PACK_FLOES: readonly (readonly [number, number, number, number, number])[] = [
  [-74, 17, 3.2, 0.4, 0], [-58, 22, 2.2, 1.9, 1], [-44, 18, 4, 2.6, 2], [-30, 24, 2.6, 0.9, 3],
  [-14, 19, 3.4, 4.1, 0], [2, 23, 2.4, 1.2, 1], [16, 20, 3.8, 5.0, 2], [30, 25, 2.8, 0.2, 3],
  [44, 19, 3, 2.2, 0], [58, 24, 3.6, 3.3, 1], [72, 18, 2.4, 0.7, 2], [-6, 30, 2, 1.5, 3],
  [24, 33, 2.6, 2.8, 0], [52, 31, 2, 4.4, 2],
];

/** A chick on a floe of the pack ice (Schiel et al.: small groups of chicks "in the pack ice and on ice floes"). */
export const FLOE_CHICK: Vec3 = [16, 0.13 * 3.8, 20];

export function buildFloeChickTris(): Tri[] {
  return shift(emperorChick(0, 0, CHICK_K, 0.8), ...FLOE_CHICK);
}

/** How the camera looks at a point of interest, and where its dot stands. */
export interface SpotView {
  worldPos: Vec3;
  target: Vec3;
  distance: number;
  /** Bearing round y in degrees: 0 looks from the sea (+z) towards the island. */
  bearingDeg: number;
  elevationDeg: number;
}

export const SPOT_VIEWS: Readonly<Record<CerroNevadoSpotId, SpotView>> = {
  colony: { worldPos: [10, 4.2, fastIceEdge(10) - 4], target: [12, 1, 6], distance: 24, bearingDeg: 8, elevationDeg: 18 },
  edge: { worldPos: [30, 3.2, fastIceEdge(30) + 1], target: [26, 0.6, 12], distance: 30, bearingDeg: 46, elevationDeg: 15 },
  creche: { worldPos: [-20, 3.6, 3], target: [-19, 1, 1.5], distance: 20, bearingDeg: -12, elevationDeg: 19 },
  camp: { worldPos: [-44, 4.4, -7], target: [-44, 1, -7], distance: 22, bearingDeg: -34, elevationDeg: 21 },
};

/** Camera position for a view: `distance` from the target, at that bearing and elevation. */
export function poseOf(view: SpotView): { pos: Vec3; target: Vec3 } {
  const b = (view.bearingDeg * Math.PI) / 180;
  const e = (view.elevationDeg * Math.PI) / 180;
  const [tx, ty, tz] = view.target;
  return {
    pos: [tx + Math.sin(b) * Math.cos(e) * view.distance, ty + Math.sin(e) * view.distance, tz + Math.cos(b) * Math.cos(e) * view.distance],
    target: view.target,
  };
}

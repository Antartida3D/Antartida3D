import { createSeededRng } from '@antartida/core';
import { block, chunk, prism, rect, type Tri, type Vec3 } from './lowPoly.ts';
import { slab, snowMound, thinTriangle, tube } from './ponchoShapes.ts';
import { resolveBuildingColour, VOXEL_PALETTE } from '../orcadas/stationModels.ts';
import { buildStationHut, FLAG_BLUE, FLAG_SUN, GLASS_DARK, placeTris, plate, PLINTH_YELLOW, ROOF_DARK, windowOn } from './ponchoBase.ts';

/**
 * The Base General San Martín of «Poncho va al frente» (book p. 12), on its islet in Marguerite Bay, as a place, after its
 * photographs (Wikimedia Commons, «San Martín Base, Antarctica.jpg», 2008, public domain; poncho-photos.ts) and in the style of
 * the Base Esperanza of the first stop (ponchoBase.ts): three middle-sized houses set apart, all looking at the sea (-z), orange
 * with dark roofs and white-framed windows, on the dark rock of the islet with snow on it. The house on the left has a pile
 * of orange boxes before it and a wooden stair up its side; the one in the middle has the flag and the emblem on its gable;
 * the one on the right has a yellow ground floor and a double door, and a wooden stair that climbs the rocks beside it.
 * Radio masts behind them and a small hut up the rocks. The glacier behind is the ground of the scene (`backdrop: 'glacier'`).
 * The base stood unoccupied in 1962 (docs/expediciones/poncho-fuentes.md): nobody is at its doors. Everything at human scale
 * (a person is one unit). An illustration after photographs of today, not a plan of the real base.
 */
const { WHITE, WOOD, WOOD_LIGHT, ZINC, RED, CREAM, ROCK, ROCK_DARK } = VOXEL_PALETTE;

/** Named colors of the base (rule 30.5): the orange of the boxes. */
const BOX_ORANGE = 0xe8742c;

/** A gabled house: `w` wide (x), `l` long (z), walls `h` high, the ridge `r` over them, its gable end looking at -z. */
interface GableHouse {
  readonly w: number;
  readonly l: number;
  readonly h: number;
  readonly r: number;
  /** Height of the yellow ground floor, or 0 for a house orange to the ground. */
  readonly plinth: number;
}

/** Faces of a gabled house centered on the origin, ridge along z, base on y = 0: walls, roof with eaves, gables and ridge cap. */
function gableHouse({ w, l, h, r, plinth }: GableHouse): Tri[] {
  const body = resolveBuildingColour('orange');
  const out: Tri[] = [];
  if (plinth > 0) out.push(...prism(rect(0, 0, w, l), 0, plinth, PLINTH_YELLOW));
  out.push(...prism(rect(0, 0, w, l), plinth, h, body));
  const o = 0.16;
  const eave = h - (o * r) / (w / 2);
  for (const s of [-1, 1] as const) {
    out.push(...slab([[s * (w / 2 + o), eave, -l / 2 - o], [0, h + r, -l / 2 - o], [0, h + r, l / 2 + o], [s * (w / 2 + o), eave, l / 2 + o]], 0.06, ROOF_DARK));
  }
  out.push(...block(0, h + r + 0.03, 0, 0.14, 0.06, l + 2 * o, ZINC));
  for (const z of [-l / 2 + 0.01, l / 2 - 0.01]) out.push(...thinTriangle([-w / 2, h, z], [w / 2, h, z], [0, h + r, z], 0.02, body));
  return out;
}

/** The gable end of a house (z = -l/2), seen from the sea: outward normal and the reader's right. */
const GABLE_N: Vec3 = [0, 0, -1];
const GABLE_U: Vec3 = [-1, 0, 0];

/** Size of the three houses. */
export const SAN_MARTIN_LEFT: GableHouse = { w: 2.8, l: 3.0, h: 2.3, r: 0.95, plinth: 0 };
export const SAN_MARTIN_MIDDLE: GableHouse = { w: 3.0, l: 3.4, h: 2.6, r: 1.0, plinth: 0 };
/** The right house is turned a quarter: its ridge runs along x and its long wall, with the double door, looks at the sea. */
export const SAN_MARTIN_RIGHT: GableHouse = { w: 2.6, l: 3.6, h: 2.0, r: 0.7, plinth: 0.9 };

/** The house on the left: two floors of windows and a door on the gable end, a wooden stair up its +x side to an upper door. */
function leftHouse(): Tri[] {
  const { w, l } = SAN_MARTIN_LEFT;
  const front = -l / 2;
  const out = gableHouse(SAN_MARTIN_LEFT);
  out.push(...plate([0.55, 0.5, front], GABLE_U, GABLE_N, 0.5, 0.95, 0.02, GLASS_DARK));
  out.push(...windowOn([-0.6, 0.85, front], GABLE_U, GABLE_N, 0.5, 0.45));
  for (const x of [-0.6, 0.6]) out.push(...windowOn([x, 1.75, front], GABLE_U, GABLE_N, 0.5, 0.45));
  // The stair: steps climbing along the +x wall from the front to an upper door, with a handrail.
  const steps = 9;
  for (let i = 0; i < steps; i++) {
    const y = 0.14 + i * 0.16;
    const z = front + 0.35 + i * 0.2;
    out.push(...block(w / 2 + 0.36, y, z, 0.62, 0.06, 0.24, i % 2 ? WOOD : WOOD_LIGHT));
  }
  out.push(...block(w / 2 + 0.36, 1.44, front + 2.15, 0.7, 0.07, 0.7, WOOD));
  for (const z of [front + 0.35, front + 2.4]) out.push(...block(w / 2 + 0.66, (z - front) * 0.6 + 0.3, z, 0.05, (z - front) * 1.0 + 0.4, 0.05, WOOD));
  out.push(...plate([w / 2, 1.95, front + 2.15], [0, 0, 1], [1, 0, 0], 0.45, 0.85, 0.02, GLASS_DARK));
  // Windows down the other long wall.
  for (const z of [front + 0.7, front + 2.0]) out.push(...windowOn([-w / 2, 1.7, z], [0, 0, -1], [-1, 0, 0], 0.4, 0.4));
  // Snow against the foot of the back wall.
  out.push(...snowMound(0, l / 2 + 0.15, 1.2, 0.3, 0.07, 731, 8));
  return out;
}

/** The house in the middle: the flag painted on the gable end and the round emblem over it, a wide dark door, windows. */
function middleHouse(): Tri[] {
  const { w, l, h } = SAN_MARTIN_MIDDLE;
  const front = -l / 2;
  const out = gableHouse(SAN_MARTIN_MIDDLE);
  out.push(...plate([0, 0.55, front], GABLE_U, GABLE_N, 0.95, 1.05, 0.02, GLASS_DARK));
  for (const x of [-0.95, 0.95]) out.push(...windowOn([x, 0.8, front], GABLE_U, GABLE_N, 0.45, 0.45), ...windowOn([x, 1.75, front], GABLE_U, GABLE_N, 0.45, 0.45));
  // The flag on the wall between the windows of the upper floor: light blue, white and light blue bands, the sun in the middle.
  const fy = 1.8;
  const band = 0.13;
  out.push(...plate([0, fy + band, front], GABLE_U, GABLE_N, 0.7, band, 0.015, FLAG_BLUE), ...plate([0, fy, front], GABLE_U, GABLE_N, 0.7, band, 0.012, WHITE));
  out.push(...plate([0, fy - band, front], GABLE_U, GABLE_N, 0.7, band, 0.015, FLAG_BLUE), ...plate([0, fy, front], GABLE_U, GABLE_N, 0.09, 0.09, 0.02, FLAG_SUN));
  // The emblem under the ridge: a white disk with a blue ring (a polygon of plates is enough at this size).
  const ey = h + 0.42;
  out.push(...tube([0, ey, front - 0.005], [0, ey, front - 0.03], 0.27, 0.27, 12, FLAG_BLUE), ...tube([0, ey, front - 0.03], [0, ey, front - 0.045], 0.2, 0.2, 12, WHITE));
  // A row of windows along each long wall.
  for (const s of [-1, 1] as const) for (const z of [front + 0.7, front + 1.7, front + 2.7]) out.push(...windowOn([s * (w / 2), 1.75, z], [0, 0, s], [s, 0, 0], 0.4, 0.4));
  out.push(...snowMound(0, l / 2 + 0.15, 1.3, 0.3, 0.07, 732, 8));
  return out;
}

/**
 * The house on the right, built with its ridge along z and its long wall to -x (the double door, windows, a small flag),
 * and turned a quarter so that wall looks at the sea.
 */
function rightHouse(): Tri[] {
  const { w, plinth } = SAN_MARTIN_RIGHT;
  const out = gableHouse(SAN_MARTIN_RIGHT);
  const n: Vec3 = [-1, 0, 0];
  const u: Vec3 = [0, 0, 1];
  const x = -w / 2;
  for (const z of [-0.33, 0.33]) out.push(...plate([x, 0.6, z], u, n, 0.6, 1.15, 0.02, GLASS_DARK));
  out.push(...plate([x, 1.2, 0], u, n, 1.4, 0.06, 0.025, ROOF_DARK));
  for (const z of [-1.25, 1.25]) out.push(...windowOn([x, plinth + 0.5, z], u, n, 0.45, 0.4));
  out.push(...plate([x, plinth + 0.75, -0.9], u, n, 0.3, 0.07, 0.015, FLAG_BLUE), ...plate([x, plinth + 0.68, -0.9], u, n, 0.3, 0.07, 0.012, WHITE), ...plate([x, plinth + 0.61, -0.9], u, n, 0.3, 0.07, 0.015, FLAG_BLUE));
  // A ramp of planks before the double door.
  out.push(...block(x - 0.35, 0.06, 0, 0.7, 0.08, 1.6, WOOD));
  return placeTris(out, 0, 0, -Math.PI / 2);
}

/**
 * Where the houses stand in the scene (centers), behind the stage, apart from each other, and the prop's place in the scene.
 * Left and right are as seen from the sea, where the camera stands (looking at +z): the left house is on +x.
 */
export const SAN_MARTIN_SCENE_Z = 3.4;
export const SAN_MARTIN_LEFT_AT = [5.2, 4.8] as const;
export const SAN_MARTIN_MIDDLE_AT = [-0.2, 6.0] as const;
export const SAN_MARTIN_RIGHT_AT = [-5.6, 4.9] as const;
const MASTS: readonly (readonly [number, number, number])[] = [[2.6, 8.4, 4.2], [-3.8, 9.5, 3.6], [-8.4, 7.6, 3.0]];
const HUT_AT = [-1.8, 11.2] as const;

/** Circles (x, z, radius) of the ground the base takes, in its own frame: the rocks and pebbles of the diorama keep out of them. */
export const SAN_MARTIN_CLEARINGS: readonly (readonly [number, number, number])[] = [
  [SAN_MARTIN_LEFT_AT[0], SAN_MARTIN_LEFT_AT[1], 2.3],
  [SAN_MARTIN_LEFT_AT[0] + 0.4, SAN_MARTIN_LEFT_AT[1] - 2.3, 1.0],
  [SAN_MARTIN_MIDDLE_AT[0], SAN_MARTIN_MIDDLE_AT[1], 2.5],
  [SAN_MARTIN_RIGHT_AT[0], SAN_MARTIN_RIGHT_AT[1], 2.4],
  ...MASTS.map(([x, z]) => [x, z, 0.4] as const),
  [HUT_AT[0], HUT_AT[1], 1.0],
].map(([x, z, r]) => [x, z - SAN_MARTIN_SCENE_Z, r] as const);

export function buildSanMartinBase(): Tri[] {
  const out: Tri[] = [];
  out.push(...placeTris(leftHouse(), SAN_MARTIN_LEFT_AT[0], SAN_MARTIN_LEFT_AT[1]));
  out.push(...placeTris(middleHouse(), SAN_MARTIN_MIDDLE_AT[0], SAN_MARTIN_MIDDLE_AT[1]));
  out.push(...placeTris(rightHouse(), SAN_MARTIN_RIGHT_AT[0], SAN_MARTIN_RIGHT_AT[1]));
  // The orange boxes piled before the left house (three rows, two high, a few missing).
  const [bx, bz] = [SAN_MARTIN_LEFT_AT[0] + 0.4, SAN_MARTIN_LEFT_AT[1] - 2.3];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 2; k++) {
    if (k === 1 && (i + j) % 3 === 0) continue;
    out.push(...block(bx - 0.75 + i * 0.5, 0.2 + k * 0.4, bz - 0.4 + j * 0.42, 0.46, 0.38, 0.38, BOX_ORANGE, k ? BOX_ORANGE : CREAM));
  }
  // The wooden stair that climbs the rocks beside the right house, with a handrail.
  for (let i = 0; i < 12; i++) {
    const x = SAN_MARTIN_RIGHT_AT[0] - 2.5 - i * 0.12;
    const z = SAN_MARTIN_RIGHT_AT[1] + 0.4 + i * 0.3;
    out.push(...block(x, 0.1 + i * 0.13, z, 0.7, 0.06, 0.28, i % 2 ? WOOD : WOOD_LIGHT));
    if (i % 3 === 0) out.push(...block(x - 0.36, 0.45 + i * 0.13, z, 0.05, 0.7, 0.05, WOOD));
  }
  // Radio masts with red and white bands behind the houses, and a small hut up the rocks.
  for (const [x, z, height] of MASTS) {
    const bands = 6;
    for (let i = 0; i < bands; i++) {
      out.push(...tube([x, 0.1 + (i / bands) * height, z], [x, 0.1 + ((i + 1) / bands) * height, z], 0.045, 0.045, 6, i % 2 ? CREAM : RED, i === 0, i === bands - 1));
    }
    out.push(...block(x, 0.06, z, 0.4, 0.12, 0.4, ZINC));
  }
  out.push(...placeTris(buildStationHut(0.45), HUT_AT[0], HUT_AT[1], Math.PI));
  // The dark rocks of the islet with snow on them, round and behind the houses, and drifts against them.
  const rng = createSeededRng(21801);
  const rocks: readonly (readonly [number, number, number])[] = [
    [8.2, 4.0, 1.0], [7.4, 6.8, 1.2], [3.0, 3.6, 0.6], [2.4, 6.6, 0.9], [-2.6, 3.8, 0.55], [-3.0, 6.9, 1.0],
    [-8.2, 3.6, 0.9], [-7.6, 9.6, 1.3], [5.2, 8.6, 1.4], [0.0, 9.4, 1.2], [9.4, 7.6, 1.1], [-9.8, 5.8, 0.8],
  ];
  for (const [x, z, s] of rocks) {
    const sy = s * (0.55 + rng() * 0.35);
    out.push(...chunk(x, sy / 2, z, s * (1.1 + rng() * 0.5), sy, s * (0.9 + rng() * 0.4), Math.floor(rng() * 1e6), rng() < 0.6 ? ROCK_DARK : ROCK));
    out.push(...snowMound(x + s * 0.1, z + s * 0.1, s * 0.7, s * 0.55, sy * 0.35, Math.floor(rng() * 1e6), 8));
  }
  return placeTris(out, 0, -SAN_MARTIN_SCENE_Z);
}

import { createSeededRng } from '@antartida/core';
import { buildModuleTris } from '../orcadas/lowPolyBuildings.ts';
import { block, chunk, facingOut, ngon, normalOf, prism, rect, strut, type Tri, type Vec3 } from './lowPoly.ts';
import { slab, snowMound, thinTriangle, tube } from './ponchoShapes.ts';
import { VOXEL_PALETTE, resolveBuildingColour } from '../orcadas/stationModels.ts';

/**
 * A low hut of the base (the base Esperanza of «Nace Poncho», book p. 5): the orange prefabricated
 * module of the station of Orcadas (`buildModuleTris`) with a door, windows and a gabled roof, and drifts
 * of snow along its foot so it melts into the ground. An illustration of a typical base hut, not a
 * plan of any real building. about 2.9 long (along x), 1.4 wide, 1.2 high in model units; the door faces +z.
 */
const { WHITE, ZINC } = VOXEL_PALETTE;

/** Size of the module in the units of the station, and the scale that makes it a hut at human scale. */
const MODULE: readonly [number, number, number] = [3, 1.5, 1.2];
const HUT_SCALE = 0.95;
const FOOTING_LIFT = 0.015;
/** Height of the stovepipe over its foot, and how far its foot sinks under the ridge (the slopes fall away from it). */
export const STOVEPIPE_HEIGHT = 0.36;
const STOVEPIPE_SINK = 0.06;

/** Height of the ridge of a hut of `scale`: the top of the module (its height) scaled, with the footing lift. */
export const hutRidgeY = (scale = HUT_SCALE): number => MODULE[2] * scale + FOOTING_LIFT * (scale / HUT_SCALE);

export function buildBaseHut(scale = HUT_SCALE): Tri[] {
  const k = scale;
  // The footings of the module sink a little under y = 0: the hut is lifted so its lowest point rests on it.
  const body = buildModuleTris(MODULE[0], MODULE[1], MODULE[2], 'orange', 'gabled').map(
    ([a, b, c, col]): Tri => [[a[0] * k, a[1] * k + FOOTING_LIFT * (k / HUT_SCALE), a[2] * k], [b[0] * k, b[1] * k + FOOTING_LIFT * (k / HUT_SCALE), b[2] * k], [c[0] * k, c[1] * k + FOOTING_LIFT * (k / HUT_SCALE), c[2] * k], col],
  );
  const out: Tri[] = [...body];
  // A stovepipe that rises from the ridge of the roof (its foot sunk a little into the slopes, so it never floats), and snow
  // drifted against the long walls and the ends (laid out for HUT_SCALE; `m` follows the scale).
  const m = k / HUT_SCALE;
  const pipeFoot = hutRidgeY(k) - STOVEPIPE_SINK * m;
  out.push(
    ...block(-0.9 * m, pipeFoot + STOVEPIPE_HEIGHT * m / 2, 0, 0.12 * m, STOVEPIPE_HEIGHT * m, 0.12 * m, ZINC),
    ...block(-0.9 * m, pipeFoot + (STOVEPIPE_HEIGHT + 0.02) * m, 0, 0.18 * m, 0.04 * m, 0.18 * m, WHITE),
  );
  const [lx, lz] = [MODULE[0] * k, MODULE[1] * k];
  for (const [x, z, rx, rz, s] of [[0, lz / 2 + 0.1 * m, 1.1 * m, 0.28 * m, 301], [-lx / 2 - 0.05 * m, 0.1 * m, 0.35 * m, 0.55 * m, 302], [lx / 2 + 0.05 * m, -0.1 * m, 0.35 * m, 0.55 * m, 303], [0, -lz / 2 - 0.1 * m, 1.0 * m, 0.25 * m, 304]] as const) {
    out.push(...snowMound(x, z, rx, rz, 0.06, s, 7));
  }
  return out;
}

/** Turns the faces by `yaw` about y (as three's rotation.y), moves them to (dx, dz) and lifts them `dy`. */
function placeTris(tris: readonly Tri[], dx: number, dz: number, yaw = 0, dy = 0): Tri[] {
  const c = Math.cos(yaw);
  const sn = Math.sin(yaw);
  const at = ([x, y, z]: readonly [number, number, number]): [number, number, number] => [dx + x * c + z * sn, y + dy, dz - x * sn + z * c];
  return tris.map(([a, b, cc, col]): Tri => [at(a), at(b), at(cc), col]);
}

const { RED, CREAM, WHITE: SNOW } = VOXEL_PALETTE;

/** The huts of Esperanza: a person is one unit, so a hut is about three and a half long and a little over one high. */
const ESPERANZA_HUT_SCALE = 1.1;
/** Colors of a hut of the station (named, rule 30.5): dark roof, yellow wooden base, and the blue of the flag. */
const ROOF_DARK = 0x3a3c40;
const PLINTH_YELLOW = 0xd9a441;
export const FLAG_BLUE = 0x74acdf;

/**
 * A hut of the station as it is in the photographs of Esperanza: the orange prefabricated module with a dark roof and a yellow
 * wooden skirt round its foot. Same size and doors as `buildBaseHut` (the door faces +z).
 */
export function buildStationHut(scale = ESPERANZA_HUT_SCALE): Tri[] {
  const bodyColor = resolveBuildingColour('orange');
  const hut = buildBaseHut(scale).map(([a, b, c, col]): Tri => (col === bodyColor && normalOf([a, b, c, col])[1] > 0.25 ? [a, b, c, ROOF_DARK] : [a, b, c, col]));
  const [length, width] = [MODULE[0] * scale, MODULE[1] * scale];
  return [...hut, ...prism(rect(0, 0, length * 0.99, width * 0.99), 0.02, 0.19 * scale, PLINTH_YELLOW, PLINTH_YELLOW)];
}

/** More named colors of the station (rule 30.5): dark glass, the sun of the flag, the ribs of the container and the letters of the sign. */
const GLASS_DARK = 0x2a2f35;
export const FLAG_SUN = 0xf6b40e;
const CONTAINER_RIB = 0xdfe3e6;
export const SIGN_INK = 0x4a3a2c;
const { WOOD, WOOD_LIGHT, ROCK, ROCK_DARK, WINDOW_DAY } = VOXEL_PALETTE;

/**
 * A flat plate on a wall: a rectangle `w` wide (along `u`) and `h` high (along y) round `center`, pushed `offset` out along
 * the wall's outward normal `n` and wound to face it. For windows, doors, letters and the painted flag.
 */
function plate(center: Vec3, u: Vec3, n: Vec3, w: number, h: number, offset: number, color: number): Tri[] {
  const at = (su: number, sy: number): Vec3 => [center[0] + u[0] * su * w / 2 + n[0] * offset, center[1] + sy * h / 2, center[2] + u[2] * su * w / 2 + n[2] * offset];
  const inside: Vec3 = [center[0] - n[0], center[1], center[2] - n[2]];
  const [a, b, c, d] = [at(-1, -1), at(1, -1), at(1, 1), at(-1, 1)];
  return [facingOut(a, b, c, color, inside), facingOut(a, c, d, color, inside)];
}

/** A window: a white frame and its pane (`pane`) a little in front of it. */
function windowOn(center: Vec3, u: Vec3, n: Vec3, w: number, h: number, pane = GLASS_DARK): Tri[] {
  return [...plate(center, u, n, w + 0.08, h + 0.08, 0.012, SNOW), ...plate(center, u, n, w, h, 0.02, pane)];
}

/** Glyphs of a 5-row pixel font (rows top to bottom), only the letters of the sign. */
const GLYPHS: Readonly<Record<string, readonly string[]>> = {
  B: ['110', '101', '110', '101', '110'],
  A: ['010', '101', '111', '101', '101'],
  S: ['011', '100', '010', '001', '110'],
  E: ['111', '100', '110', '100', '111'],
  P: ['110', '101', '110', '100', '100'],
  R: ['110', '101', '110', '101', '101'],
  N: ['1001', '1101', '1011', '1001', '1001'],
  Z: ['111', '001', '010', '100', '111'],
  ' ': ['00', '00', '00', '00', '00'],
};

/** Text written with square pixels on a wall, centered on `center`, read from outside (`u` points to the reader's right). */
function lettering(text: string, center: Vec3, u: Vec3, n: Vec3, pixel: number, color: number): Tri[] {
  const width = [...text].reduce((s, ch) => s + GLYPHS[ch][0].length + 1, -1) * pixel;
  const out: Tri[] = [];
  let col = -width / 2;
  for (const ch of text) {
    const rows = GLYPHS[ch];
    rows.forEach((row, r) => {
      [...row].forEach((bit, k) => {
        if (bit !== '1') return;
        const su = col + (k + 0.5) * pixel;
        const y = center[1] + (2 - r) * pixel;
        out.push(...plate([center[0] + u[0] * su, y, center[2] + u[2] * su], u, n, pixel, pixel, 0.035, color));
      });
    });
    col += (rows[0].length + 1) * pixel;
  }
  return out;
}

/** The main house: long side along z, its gable end (balcony and sign) to -z, towards the sea. Size of the model, before it is placed. */
export const ESPERANZA_MAIN = { length: 6.4, width: 2.8, wall: 2.5, ridge: 0.95 } as const;

/** The sign «BASE ESPERANZA» on the gable end: its board, the pixel of its letters, and the room it keeps from the slopes of the roof. */
export const ESPERANZA_SIGN = { width: 1.62, height: 0.22, pixel: 0.026, margin: 0.05 } as const;

/** Half the width of the gable end at height `y` (zero at the ridge, half the house at the top of the wall). */
export const esperanzaGableHalf = (y: number): number => {
  const { width: W, wall: H, ridge: R } = ESPERANZA_MAIN;
  return (W / 2) * Math.min(1, Math.max(0, 1 - (y - H) / R));
};

/** Height of the middle of the sign: as high under the ridge as its top corners can go and still stay inside the gable. */
export function esperanzaSignY(): number {
  const { width: W, wall: H, ridge: R } = ESPERANZA_MAIN;
  const top = H + R * (1 - (ESPERANZA_SIGN.width / 2 + ESPERANZA_SIGN.margin) / (W / 2));
  return top - ESPERANZA_SIGN.height / 2;
}

/**
 * The main house of Esperanza, after its photographs: a long two-storey building whose gable end looks at the sea, with a
 * wooden balcony across the upper floor, the sign «BASE ESPERANZA» under the ridge and wide dark windows below; the rear of
 * it has a tall yellow ground floor with doors and a row of small windows above. Centered on the origin, long along z,
 * the gable end on -z; it rests on y = 0. An illustration, not a plan of the real building.
 */
export function buildEsperanzaMainHouse(): Tri[] {
  const { length: L, width: W, wall: H, ridge: R } = ESPERANZA_MAIN;
  const body = resolveBuildingColour('orange');
  const front = -L / 2;
  const split = front + 2.6; // the end of the two-storey red front; behind it the ground floor is yellow
  const out: Tri[] = [
    ...prism(rect(0, (front + split) / 2, W, split - front), 0, 0.22, PLINTH_YELLOW),
    ...prism(rect(0, (front + split) / 2, W, split - front), 0.22, H, body),
    ...prism(rect(0, (split + L / 2) / 2, W, L / 2 - split), 0, 1.15, PLINTH_YELLOW),
    ...prism(rect(0, (split + L / 2) / 2, W, L / 2 - split), 1.15, H, body),
  ];
  // The gabled roof, ridge along z, with eaves; the gables close the ends.
  const o = 0.16;
  const eave = H - (o * R) / (W / 2);
  for (const s of [-1, 1] as const) {
    out.push(...slab([[s * (W / 2 + o), eave, front - o], [0, H + R, front - o], [0, H + R, L / 2 + o], [s * (W / 2 + o), eave, L / 2 + o]], 0.06, ROOF_DARK));
  }
  out.push(...block(0, H + R + 0.03, 0, 0.14, 0.06, L + 2 * o, ZINC));
  for (const z of [front + 0.01, L / 2 - 0.01]) out.push(...thinTriangle([-W / 2, H, z], [W / 2, H, z], [0, H + R, z], 0.02, body));
  out.push(...tube([0.7, H + 0.5, 1.8], [0.7, H + 1.2, 1.8], 0.06, 0.06, 6, ZINC));

  // The gable end, outward -z: the reader of the sign stands on -z, so their right is -x.
  const nF: Vec3 = [0, 0, -1];
  const uF: Vec3 = [-1, 0, 0];
  for (const x of [-0.85, 0.85]) out.push(...windowOn([x, 0.72, front], uF, nF, 0.95, 0.62));
  out.push(...plate([0, 0.55, front], uF, nF, 0.42, 0.95, 0.02, GLASS_DARK));
  for (const x of [-0.85, -0.25]) out.push(...windowOn([x, 1.9, front], uF, nF, 0.42, 0.5, CREAM));
  out.push(...plate([0.75, 1.75, front], uF, nF, 0.42, 0.8, 0.02, GLASS_DARK));
  // The sign under the ridge, with its letters, wholly inside the gable (its top corners under the slopes of the roof).
  const signY = esperanzaSignY();
  out.push(
    ...plate([0, signY, front], uF, nF, ESPERANZA_SIGN.width, ESPERANZA_SIGN.height, 0.025, CREAM),
    ...lettering('BASE ESPERANZA', [0, signY, front], uF, nF, ESPERANZA_SIGN.pixel, SIGN_INK),
  );
  // The balcony: a wooden floor across the upper storey on posts, and its railing with crossed braces.
  const bz = front - 0.3;
  const floorY = 1.32;
  const bx = W / 2 + 0.12;
  out.push(...block(0, floorY, bz, 2 * bx, 0.07, 0.6, WOOD, WOOD_LIGHT));
  // (No post in the middle: the walkway leaves from the front door, under the balcony.)
  for (const x of [-bx + 0.05, -0.75, 0.75, bx - 0.05]) out.push(...block(x, floorY / 2, front - 0.55, 0.08, floorY - 0.04, 0.08, WOOD));
  const railY = floorY + 0.5;
  const posts = 7;
  for (let i = 0; i < posts; i++) {
    const x = -bx + 0.04 + (i * (2 * bx - 0.08)) / (posts - 1);
    out.push(...block(x, (floorY + railY) / 2, front - 0.56, 0.05, railY - floorY, 0.05, WOOD));
    if (i < posts - 1) {
      const x1 = -bx + 0.04 + ((i + 1) * (2 * bx - 0.08)) / (posts - 1);
      out.push(...strut([x, floorY + 0.04, front - 0.56], [x1, railY - 0.04, front - 0.56], 0.012, WOOD_LIGHT, false));
      out.push(...strut([x1, floorY + 0.04, front - 0.56], [x, railY - 0.04, front - 0.56], 0.012, WOOD_LIGHT, false));
    }
  }
  out.push(...block(0, railY, front - 0.56, 2 * bx, 0.05, 0.07, WOOD_LIGHT));
  for (const s of [-1, 1] as const) out.push(...block(s * (bx - 0.02), railY, front - 0.29, 0.06, 0.05, 0.54, WOOD_LIGHT));

  // The long walls: a row of small windows on the upper floor, and doors and windows on the yellow ground floor behind.
  for (const s of [-1, 1] as const) {
    const n: Vec3 = [s, 0, 0];
    const u: Vec3 = [0, 0, s];
    const x = s * (W / 2);
    for (let z = front + 0.45; z < L / 2 - 0.2; z += 0.46) out.push(...windowOn([x, 1.85, z], u, n, 0.2, 0.28, WINDOW_DAY));
    for (let z = front + 0.5; z < split - 0.3; z += 0.62) out.push(...windowOn([x, 0.72, z], u, n, 0.38, 0.5));
    for (const z of [split + 0.6, split + 2.2]) out.push(...plate([x, 0.48, z], u, n, 0.42, 0.88, 0.02, GLASS_DARK));
    for (const z of [split + 1.3, split + 2.9]) out.push(...windowOn([x, 0.7, z], u, n, 0.24, 0.3));
  }
  out.push(...plate([0.5, 0.48, L / 2], [1, 0, 0], [0, 0, 1], 0.42, 0.88, 0.02, GLASS_DARK));
  // Snow against the foot of its long walls.
  for (const [x, z, rx, rz, seed] of [[-W / 2 - 0.1, 1.2, 0.35, 1.6, 431], [W / 2 + 0.1, 1.6, 0.3, 1.3, 432], [0, L / 2 + 0.15, 1.2, 0.3, 433]] as const) {
    out.push(...snowMound(x, z, rx, rz, 0.07, seed, 8));
  }
  return out;
}

/** The container: long along x, the painted side on -z. Size [length, height, depth]. */
export const ESPERANZA_CONTAINER = [2.6, 1.35, 1.1] as const;

/**
 * The white container of Esperanza with the Argentine flag painted on the side that looks at the sea (-z): light blue, white
 * and light blue bands and the sun in the middle; corrugated ribs on the other side, doors at one end. Rests on y = 0.
 */
export function buildFlagContainer(): Tri[] {
  const [l, h, d] = ESPERANZA_CONTAINER;
  const out: Tri[] = [...prism(rect(0, 0, l, d), 0.08, h, SNOW, CONTAINER_RIB)];
  for (const z of [-d / 2 + 0.06, d / 2 - 0.06]) out.push(...block(0, 0.04, z, l, 0.08, 0.1, ZINC));
  const n: Vec3 = [0, 0, -1];
  const u: Vec3 = [-1, 0, 0];
  const band = (h - 0.08) * 0.84 / 3;
  const mid = 0.08 + (h - 0.08) / 2;
  out.push(...plate([0, mid + band, -d / 2], u, n, l * 0.88, band, 0.01, FLAG_BLUE));
  out.push(...plate([0, mid - band, -d / 2], u, n, l * 0.88, band, 0.01, FLAG_BLUE));
  // The sun: a small polygon in the white band, a little in front of the wall.
  const sun = ngon(0, mid, band * 0.32, 10);
  const c: Vec3 = [0, mid, -d / 2 - 0.02];
  const behind: Vec3 = [0, mid, 0];
  sun.forEach(([x, y], i) => {
    const [x2, y2] = sun[(i + 1) % sun.length];
    out.push(facingOut(c, [x, y, -d / 2 - 0.02], [x2, y2, -d / 2 - 0.02], FLAG_SUN, behind));
  });
  // Corrugated ribs on the back and the doors with their bars at the +x end.
  for (let x = -l / 2 + 0.15; x < l / 2 - 0.1; x += 0.22) out.push(...plate([x, mid, d / 2], [1, 0, 0], [0, 0, 1], 0.06, h - 0.2, 0.01, CONTAINER_RIB));
  for (const z of [-0.2, 0.2]) out.push(...plate([l / 2, mid, z], [0, 0, 1], [1, 0, 0], 0.03, h - 0.2, 0.012, ZINC));
  return out;
}

/** The wooden walkway down to the water: from `from` (x, z) out to `to`, this wide, its deck this high over its posts. */
export const ESPERANZA_PIER = { from: [7.4, -4.0], to: [7.4, -7.6], width: 0.75, deck: 0.32 } as const;

/**
 * The walkway: planks on posts and a handrail on each side. Built of short pieces, so that once it is seated vertex by vertex
 * on the ground it follows the shore down to the water (on the sea the ground is the water, and its posts stand in it).
 */
function buildPier(): Tri[] {
  const { from, to, width, deck } = ESPERANZA_PIER;
  const out: Tri[] = [];
  const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const steps = Math.round(len / 0.24);
  const dz = (to[1] - from[1]) / steps;
  for (let i = 0; i < steps; i++) {
    const z = from[1] + (i + 0.5) * dz;
    out.push(...block(from[0], deck, z, width, 0.05, Math.abs(dz) * 0.86, i % 3 ? WOOD : WOOD_LIGHT));
  }
  for (let i = 0; i <= steps; i += 3) {
    const z = from[1] + i * dz;
    for (const s of [-1, 1] as const) {
      const x = from[0] + s * (width / 2 - 0.03);
      out.push(...block(x, deck / 2, z, 0.07, deck, 0.07, WOOD), ...block(x, deck + 0.3, z, 0.05, 0.55, 0.05, WOOD));
      if (i + 3 <= steps) out.push(...block(x, deck + 0.56, z + 1.5 * dz, 0.05, 0.05, Math.abs(3 * dz), WOOD_LIGHT));
    }
  }
  return out;
}

/** A building of the base out on the slope: center (x, z), its yaw, and its scale (buildStationHut). */
export interface EsperanzaHut {
  readonly x: number;
  readonly z: number;
  readonly yaw: number;
  readonly scale: number;
}

/**
 * Sizes of the other six buildings of the base (four huts and two sheds), all different. Where they go is drawn at random
 * (a fixed seed, so it is always the same base) on the slope behind the stage, never in rows and far from each other.
 */
const HUT_SCALES = [2.2, 1.9, 1.6, 2.0, 1.45, 1.3] as const;
const HUT_AREA = { x: [-10, 16], z: [2.5, 15] } as const;
/** Clear ground between two buildings, past their own half lengths. */
export const HUT_GAP = 2.6;
/** Not in rows: at most two buildings within this depth (z) of each other. */
export const HUT_ROW_BAND = 2;
const hutHalf = (scale: number) => (MODULE[0] * scale) / 2;

/** Where the main house and the container stand in the base (centers), by the shore on the +x side of the stage (on the left of the screen, clear of the panel). */
export const ESPERANZA_MAIN_AT = [7.4, -0.8] as const;
export const ESPERANZA_CONTAINER_AT = [4.6, -3.65] as const;
const MASTS: readonly (readonly [number, number])[] = [[11.6, 3.4], [-9.8, 2.6]];
const DISH_AT = [3.6, 3.0] as const;
/** What the huts keep away from (x, z, radius): the stage, the back of the main house, the masts and the dish. */
const TAKEN: readonly (readonly [number, number, number])[] = [[0, 0, 5.6], [ESPERANZA_MAIN_AT[0], ESPERANZA_MAIN_AT[1] + 2.2, 2.6], ...MASTS.map(([x, z]) => [x, z, 1] as const), [DISH_AT[0], DISH_AT[1], 1]];

export const ESPERANZA_HUTS: readonly EsperanzaHut[] = (() => {
  const rng = createSeededRng(26111);
  const placed: EsperanzaHut[] = [];
  for (const scale of HUT_SCALES) {
    for (let tries = 0; tries < 4000; tries++) {
      const x = HUT_AREA.x[0] + rng() * (HUT_AREA.x[1] - HUT_AREA.x[0]);
      const z = HUT_AREA.z[0] + rng() * (HUT_AREA.z[1] - HUT_AREA.z[0]);
      const free = TAKEN.every(([tx, tz, r]) => Math.hypot(tx - x, tz - z) > r + hutHalf(scale));
      const rowmates = placed.filter((h) => Math.abs(h.z - z) < HUT_ROW_BAND).length;
      if (free && rowmates < 2 && placed.every((h) => Math.hypot(h.x - x, h.z - z) > hutHalf(h.scale) + hutHalf(scale) + HUT_GAP)) {
        // The doors look roughly to the sea (a hut is built with its door on +z, so it is turned half a turn), each its own way.
        placed.push({ x, z, yaw: Math.PI + (rng() - 0.5) * 0.9, scale });
        break;
      }
    }
  }
  return placed;
})();

/**
 * The base is laid out above in the frame of its scene («Nace Poncho», shore on -z): the prop stands at (0, this) of the scene
 * (poncho-scenes.ts), so its faces and clearings are moved back by it.
 */
export const ESPERANZA_SCENE_Z = 3.2;

/**
 * Circles (x, z, radius) of the ground the base takes, in its own frame: the details of the diorama (rocks, pebbles) keep
 * out of them, so none is drawn inside a house.
 */
export const ESPERANZA_CLEARINGS: readonly (readonly [number, number, number])[] = [
  ...[-2.2, 0, 2.2].map((dz) => [ESPERANZA_MAIN_AT[0], ESPERANZA_MAIN_AT[1] + dz, 1.9] as const),
  [ESPERANZA_CONTAINER_AT[0], ESPERANZA_CONTAINER_AT[1], 1.45],
  [ESPERANZA_PIER.from[0], ESPERANZA_PIER.from[1] - 0.8, 0.8],
  ...ESPERANZA_HUTS.map((h) => [h.x, h.z, hutHalf(h.scale) + 0.2] as const),
  ...MASTS.map(([x, z]) => [x, z, 0.4] as const),
  [DISH_AT[0], DISH_AT[1], 0.5],
].map(([x, z, r]) => [x, z - ESPERANZA_SCENE_Z, r] as const);

/**
 * The Base Esperanza of «Nace Poncho» (book p. 5), as a place and not as a hut, after its photographs: by the shore, on the
 * +x side of the stage, the main house with its gable end to the sea, the white container with the flag painted on its
 * side to the water, the wooden walkway going down into the sea and the dark rocks of the shore round them; behind the
 * stage, up the slope, six more buildings of different sizes scattered far apart, two red and white radio masts, the dish,
 * barrels and boxes. Everything at human scale (a person is one unit). The sea is on -z; the positions are the ones in the scene,
 * moved back by ESPERANZA_SCENE_Z. An illustration of the base, not a
 * plan of the real one.
 */
export function buildEsperanzaBase(): Tri[] {
  const out: Tri[] = [];
  out.push(...placeTris(buildEsperanzaMainHouse(), ESPERANZA_MAIN_AT[0], ESPERANZA_MAIN_AT[1]));
  out.push(...placeTris(buildFlagContainer(), ESPERANZA_CONTAINER_AT[0], ESPERANZA_CONTAINER_AT[1], 0.06));
  out.push(...buildPier());
  for (const h of ESPERANZA_HUTS) out.push(...placeTris(buildStationHut(h.scale), h.x, h.z, h.yaw));
  // Two radio masts with red and white bands, and the dish behind the main house.
  for (const [x, z] of MASTS) {
    const bands = 5;
    for (let i = 0; i < bands; i++) {
      const y0 = 0.1 + (i / bands) * 3.4;
      const y1 = 0.1 + ((i + 1) / bands) * 3.4;
      out.push(...tube([x, y0, z], [x, y1, z], 0.045, 0.045, 6, i % 2 ? CREAM : RED, i === 0, i === bands - 1));
    }
    out.push(...block(x, 0.06, z, 0.4, 0.12, 0.4, ZINC));
  }
  out.push(...block(DISH_AT[0], 0.5, DISH_AT[1], 0.12, 1.0, 0.12, ZINC), ...tube([DISH_AT[0], 1.05, DISH_AT[1]], [DISH_AT[0] + 0.15, 1.2, DISH_AT[1] - 0.05], 0.05, 0.46, 10, SNOW));
  // Boxes and barrels by the container and behind the main house.
  out.push(...block(3.0, 0.18, -3.4, 0.5, 0.36, 0.4, CREAM), ...block(2.95, 0.5, -3.4, 0.4, 0.28, 0.35, RED));
  out.push(...tube([5.4, 0, 3.0], [5.4, 0.5, 3.0], 0.2, 0.2, 8, ZINC), ...tube([4.95, 0, 3.1], [4.95, 0.5, 3.1], 0.2, 0.2, 8, RED));
  // The dark rocks of the shore, round the main house, the walkway and the container (and a few among the huts).
  const rng = createSeededRng(26112);
  const rocks: readonly (readonly [number, number, number])[] = [
    [9.6, -4.6, 0.9], [8.7, -5.0, 0.7], [6.4, -4.7, 0.55], [5.5, -4.6, 0.75], [3.6, -4.6, 0.65], [2.6, -4.6, 0.45],
    [9.4, -2.4, 0.55], [8.9, 1.4, 0.45], [5.3, 1.2, 0.4], [10.6, -3.4, 0.7], [3.4, -2.4, 0.35], [-6.5, -4.2, 0.6],
  ];
  for (const [x, z, s] of rocks) {
    const sy = s * (0.55 + rng() * 0.3);
    out.push(...chunk(x, sy / 2, z, s * (1.1 + rng() * 0.5), sy, s * (0.9 + rng() * 0.4), Math.floor(rng() * 1e6), rng() < 0.6 ? ROCK_DARK : ROCK));
    if (s > 0.55) out.push(...chunk(x + s * 0.6, s * 0.18, z - s * 0.3, s * 0.55, s * 0.36, s * 0.5, Math.floor(rng() * 1e6), ROCK_DARK));
  }
  // Snow drifted against the container.
  out.push(...snowMound(ESPERANZA_CONTAINER_AT[0], ESPERANZA_CONTAINER_AT[1] + 0.65, 1.2, 0.25, 0.07, 434, 8));
  return placeTris(out, 0, -ESPERANZA_SCENE_Z);
}

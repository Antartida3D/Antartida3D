import { buildModuleTris } from '../orcadas/lowPolyBuildings.ts';
import { block, normalOf, prism, rect, type Tri } from './lowPoly.ts';
import { snowMound, tube } from './ponchoShapes.ts';
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

export function buildBaseHut(scale = HUT_SCALE): Tri[] {
  const k = scale;
  // The footings of the module sink a little under y = 0: the hut is lifted so its lowest point rests on it.
  const body = buildModuleTris(MODULE[0], MODULE[1], MODULE[2], 'orange', 'gabled').map(
    ([a, b, c, col]): Tri => [[a[0] * k, a[1] * k + FOOTING_LIFT * (k / HUT_SCALE), a[2] * k], [b[0] * k, b[1] * k + FOOTING_LIFT * (k / HUT_SCALE), b[2] * k], [c[0] * k, c[1] * k + FOOTING_LIFT * (k / HUT_SCALE), c[2] * k], col],
  );
  const out: Tri[] = [...body];
  // A stovepipe on the roof and snow drifted against the long walls and the ends (laid out for HUT_SCALE; `m` follows the scale).
  const m = k / HUT_SCALE;
  out.push(...block(-0.9 * m, 1.62 * m, 0, 0.12 * m, 0.3 * m, 0.12 * m, ZINC), ...block(-0.9 * m, 1.8 * m, 0, 0.18 * m, 0.04 * m, 0.18 * m, WHITE));
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
const FLAG_BLUE = 0x74acdf;

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

/**
 * The Base Esperanza of «Nace Poncho» (book p. 5), as a place and not as a hut: the huts of the base spread over the ground
 * in loose rows with room between them (a long main building in the middle, five huts and two sheds), dark roofs and yellow
 * skirts, two red and white radio masts, the dish, a flagpole and some boxes and barrels, after the photographs of the
 * base. Everything at human scale (a person is one unit). Unlike the other props its front (the doors) faces -z, towards
 * whoever looks at it from the stage; what is behind it is on +z. An illustration of a typical base, not a plan of the
 * real one. About 14 long (along x), 6.5 deep, 3.8 high in model units.
 */
export function buildEsperanzaBase(): Tri[] {
  const out: Tri[] = [];
  const hut = buildStationHut();
  const shed = buildStationHut(0.8);
  // Front row, nearest the stage (doors to -z: a hut is built with its door on +z, so it is turned half a turn), a little out of line.
  out.push(...placeTris(hut, -4.6, -1.0, Math.PI + 0.1), ...placeTris(hut, 4.3, -1.3, Math.PI - 0.12));
  // The long main building in the middle, with its door in the middle, and a hut on each side of it, farther back.
  out.push(...placeTris(buildStationHut(1.6), 0.0, 0.9, Math.PI + 0.02));
  out.push(...placeTris(hut, -5.2, 2.3, Math.PI + 0.2), ...placeTris(hut, 5.0, 2.2, Math.PI - 0.1));
  // Two sheds higher up the slope, and a hut by the mast.
  out.push(...placeTris(shed, -2.2, 3.3, Math.PI + 0.3), ...placeTris(shed, 2.6, 3.4, Math.PI - 0.25));
  // Two radio masts with red and white bands, and the dish, behind the huts.
  for (const [x, z] of [[-7.0, 1.4], [7.0, 1.0]] as const) {
    const bands = 5;
    for (let i = 0; i < bands; i++) {
      const y0 = 0.1 + (i / bands) * 3.4;
      const y1 = 0.1 + ((i + 1) / bands) * 3.4;
      out.push(...tube([x, y0, z], [x, y1, z], 0.045, 0.045, 6, i % 2 ? CREAM : RED, i === 0, i === bands - 1));
    }
    out.push(...block(x, 0.06, z, 0.4, 0.12, 0.4, ZINC));
  }
  out.push(...block(1.2, 0.5, 4.6, 0.12, 1.0, 0.12, ZINC), ...tube([1.2, 1.05, 4.6], [1.35, 1.2, 4.55], 0.05, 0.46, 10, SNOW));
  // A flagpole in front of the main building, with its blue and white flag, and some boxes and barrels by the doors.
  out.push(...tube([-1.9, 0, -0.6], [-1.9, 2.8, -0.6], 0.03, 0.03, 6, ZINC));
  out.push(...block(-1.68, 2.6, -0.6, 0.42, 0.1, 0.02, FLAG_BLUE), ...block(-1.68, 2.5, -0.6, 0.42, 0.1, 0.02, SNOW), ...block(-1.68, 2.4, -0.6, 0.42, 0.1, 0.02, FLAG_BLUE));
  out.push(...block(-2.9, 0.18, -0.7, 0.5, 0.36, 0.4, CREAM), ...block(-2.8, 0.5, -0.7, 0.4, 0.28, 0.35, RED));
  out.push(...tube([2.2, 0, -0.9], [2.2, 0.5, -0.9], 0.2, 0.2, 8, ZINC), ...tube([2.65, 0, -0.8], [2.65, 0.5, -0.8], 0.2, 0.2, 8, RED));
  // Snow drifted against the walls of the front huts (the foot of the prop takes the color of the ground).
  for (const [x, z, rx, rz, seed] of [[-4.6, -2.2, 1.3, 0.35, 422], [4.3, -2.5, 1.3, 0.35, 423], [0, -0.7, 1.8, 0.3, 424]] as const) {
    out.push(...snowMound(x, z, rx, rz, 0.08, seed, 8));
  }
  return out;
}

import { buildModuleTris } from '../orcadas/lowPolyBuildings.ts';
import { block, type Tri } from './lowPoly.ts';
import { snowMound, tube } from './ponchoShapes.ts';
import { VOXEL_PALETTE } from '../orcadas/stationModels.ts';

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

/** Turns the faces by `yaw` about y (as three's rotation.y) and moves them to (dx, dz). */
function placeTris(tris: readonly Tri[], dx: number, dz: number, yaw = 0): Tri[] {
  const c = Math.cos(yaw);
  const sn = Math.sin(yaw);
  const at = ([x, y, z]: readonly [number, number, number]): [number, number, number] => [dx + x * c + z * sn, y, dz - x * sn + z * c];
  return tris.map(([a, b, cc, col]): Tri => [at(a), at(b), at(cc), col]);
}

const { RED, CREAM } = VOXEL_PALETTE;

/** A hut of Esperanza as long as a hut of about eight metres: a person is one unit, so it is four and a half long and a little over one and a half high. */
const ESPERANZA_HUT_SCALE = 1.5;

/**
 * The Base Esperanza of «Nace Poncho» (book p. 5), as a place and not as a hut: two long orange prefabricated huts and a
 * shed on a ground of bare rock over the shore, with two radio masts and a dish behind them, after the photographs of
 * the base. Huts, masts and rocks at human scale (a person is one unit). Unlike the other props, its front (the doors)
 * faces -z, towards whoever looks at it from the stage, and what is behind it is on +z. An illustration of a typical
 * base, not a plan of the real one. About 12 long (along x), 5 deep, 3.4 high in model units.
 */
export function buildEsperanzaBase(): Tri[] {
  const out: Tri[] = [];
  // The huts with their doors to -z (a hut is built with its door on +z, so it is turned half a turn), a little out of line.
  out.push(...placeTris(buildBaseHut(ESPERANZA_HUT_SCALE), -2.7, 0, Math.PI - 0.04));
  out.push(...placeTris(buildBaseHut(ESPERANZA_HUT_SCALE), 2.6, 0.1, Math.PI + 0.06));
  out.push(...placeTris(buildBaseHut(1.1), 0.0, 1.4, Math.PI + 0.15));
  // Two radio masts with red and white bands, and the dish of the base on its pedestal, behind the huts.
  for (const [x, z] of [[-4.5, 1.2], [4.3, 1.4]] as const) {
    const bands = 5;
    for (let i = 0; i < bands; i++) {
      const y0 = 0.1 + (i / bands) * 3.3;
      const y1 = 0.1 + ((i + 1) / bands) * 3.3;
      out.push(...tube([x, y0, z], [x, y1, z], 0.045, 0.045, 6, i % 2 ? CREAM : RED, i === 0, i === bands - 1));
    }
    out.push(...block(x, 0.06, z, 0.4, 0.12, 0.4, ZINC));
  }
  out.push(...block(1.9, 0.5, 1.4, 0.12, 1.0, 0.12, ZINC), ...tube([1.9, 1.05, 1.4], [2.05, 1.2, 1.35], 0.05, 0.46, 10, WHITE));
  // Bare rock round the huts and behind them, and snow drifted against the ends.
  for (const [x, z, rx, rz, h, seed] of [
    [-5.2, -0.5, 0.9, 0.7, 0.55, 411], [-4.4, 1.5, 0.8, 0.6, 0.45, 412], [5.0, -0.4, 1.0, 0.7, 0.6, 413],
    [4.3, 1.6, 0.7, 0.55, 0.4, 414], [-1.7, 1.5, 0.7, 0.5, 0.4, 415], [1.5, 1.7, 0.6, 0.45, 0.35, 416],
  ] as const) {
    out.push(...snowMound(x, z, rx, rz, h, seed, 8, true));
  }
  out.push(...snowMound(-0.4, -1.5, 1.3, 0.35, 0.08, 417, 8), ...snowMound(3.0, -1.4, 0.8, 0.3, 0.08, 418, 8));
  return out;
}

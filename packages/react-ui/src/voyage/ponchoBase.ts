import { buildModuleTris } from '../orcadas/lowPolyBuildings.ts';
import { createSeededRng } from '@antartida/core';
import { block, prism, type Tri } from './lowPoly.ts';
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
/** Height of the terrace of rock the base stands on, and its colors (named, rule 30.5). */
const TERRACE_HEIGHT = 0.5;
const TERRACE_WALL = 0x5a5650;
const TERRACE_WALL_LIGHT = 0x6f6a63;
const TERRACE_TOP = 0x8a8378;
const FLAG_BLUE = 0x74acdf;

/** A ragged ring: an ellipse whose radius wanders a little, so the edge of the terrace is not a drawn curve. */
function raggedRing(rx: number, rz: number, n: number, seed: number): [number, number][] {
  const rng = createSeededRng(seed);
  return Array.from({ length: n }, (_, i): [number, number] => {
    const t = (i / n) * Math.PI * 2;
    const k = 0.9 + rng() * 0.2;
    return [Math.cos(t) * rx * k, Math.sin(t) * rz * k];
  });
}

/**
 * The Base Esperanza of «Nace Poncho» (book p. 5), as a place and not as a hut: a terrace of bare rock over the shore, with
 * the huts of the base spread over it with room between them (three long ones in a row, two sheds behind), two red and
 * white radio masts, the dish, a flagpole and some boxes, after the photographs of the base. Everything at human scale (a
 * person is one unit). Unlike the other props its front (the doors) faces -z, towards whoever looks at it from the stage;
 * what is behind it is on +z. An illustration of a typical base, not a plan of the real one. About 12.5 long (along x),
 * 4.5 deep, 3.8 high in model units, standing on its terrace.
 */
export function buildEsperanzaBase(): Tri[] {
  const out: Tri[] = [];
  // The terrace: a block of rock with dark walls and a gravel top, with snow drifted at its foot.
  out.push(...prism(raggedRing(6.3, 2.1, 18, 421), 0, TERRACE_HEIGHT, (i) => (i % 2 ? TERRACE_WALL : TERRACE_WALL_LIGHT), TERRACE_TOP));
  for (const [x, z, rx, rz, seed] of [[-5.2, -1.4, 1.3, 0.4, 422], [-1.0, -2.0, 1.6, 0.4, 423], [3.2, -1.8, 1.5, 0.4, 424], [5.9, 0.3, 0.5, 1.0, 425], [-6.0, 0.4, 0.5, 0.9, 426]] as const) {
    out.push(...snowMound(x, z, rx, rz, 0.1, seed, 8));
  }
  // The huts, with their doors to -z (a hut is built with its door on +z, so it is turned half a turn), a little out of line.
  const hut = buildBaseHut(ESPERANZA_HUT_SCALE);
  out.push(...placeTris(hut, -3.7, -0.1, Math.PI + 0.08, TERRACE_HEIGHT));
  out.push(...placeTris(hut, 0.2, -0.6, Math.PI - 0.05, TERRACE_HEIGHT));
  out.push(...placeTris(hut, 4.0, -0.1, Math.PI + 0.1, TERRACE_HEIGHT));
  const shed = buildBaseHut(0.8);
  out.push(...placeTris(shed, -1.7, 1.2, Math.PI + 0.3, TERRACE_HEIGHT), ...placeTris(shed, 2.3, 1.2, Math.PI - 0.2, TERRACE_HEIGHT));
  // Two radio masts with red and white bands, and the dish, behind the huts.
  for (const [x, z] of [[-5.5, 1.3], [5.5, 1.4]] as const) {
    const bands = 5;
    for (let i = 0; i < bands; i++) {
      const y0 = TERRACE_HEIGHT + (i / bands) * 3.2;
      const y1 = TERRACE_HEIGHT + ((i + 1) / bands) * 3.2;
      out.push(...tube([x, y0, z], [x, y1, z], 0.045, 0.045, 6, i % 2 ? CREAM : RED, i === 0, i === bands - 1));
    }
    out.push(...block(x, TERRACE_HEIGHT + 0.06, z, 0.4, 0.12, 0.4, ZINC));
  }
  out.push(...block(0.4, TERRACE_HEIGHT + 0.5, 1.5, 0.12, 1.0, 0.12, ZINC), ...tube([0.4, TERRACE_HEIGHT + 1.05, 1.5], [0.55, TERRACE_HEIGHT + 1.2, 1.45], 0.05, 0.46, 10, SNOW));
  // A flagpole in front of the middle hut, with its blue and white flag, and a few boxes and barrels by the doors.
  out.push(...tube([-1.6, TERRACE_HEIGHT, -1.5], [-1.6, TERRACE_HEIGHT + 2.6, -1.5], 0.03, 0.03, 6, ZINC));
  out.push(...block(-1.38, TERRACE_HEIGHT + 2.4, -1.5, 0.42, 0.1, 0.02, FLAG_BLUE), ...block(-1.38, TERRACE_HEIGHT + 2.3, -1.5, 0.42, 0.1, 0.02, SNOW), ...block(-1.38, TERRACE_HEIGHT + 2.2, -1.5, 0.42, 0.1, 0.02, FLAG_BLUE));
  out.push(...block(-2.3, TERRACE_HEIGHT + 0.18, -1.2, 0.5, 0.36, 0.4, CREAM), ...block(-2.2, TERRACE_HEIGHT + 0.5, -1.2, 0.4, 0.28, 0.35, RED));
  out.push(...tube([1.9, TERRACE_HEIGHT, -1.3], [1.9, TERRACE_HEIGHT + 0.5, -1.3], 0.2, 0.2, 8, ZINC), ...tube([2.35, TERRACE_HEIGHT, -1.2], [2.35, TERRACE_HEIGHT + 0.5, -1.2], 0.2, 0.2, 8, RED));
  return out;
}

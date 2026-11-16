import { buildModuleTris } from '../orcadas/lowPolyBuildings.ts';
import { block, type Tri } from './lowPoly.ts';
import { snowMound } from './ponchoShapes.ts';
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

export function buildBaseHut(): Tri[] {
  const k = HUT_SCALE;
  // The footings of the module sink a little under y = 0: the hut is lifted so its lowest point rests on it.
  const body = buildModuleTris(MODULE[0], MODULE[1], MODULE[2], 'orange', 'gabled').map(
    ([a, b, c, col]): Tri => [[a[0] * k, a[1] * k + FOOTING_LIFT, a[2] * k], [b[0] * k, b[1] * k + FOOTING_LIFT, b[2] * k], [c[0] * k, c[1] * k + FOOTING_LIFT, c[2] * k], col],
  );
  const out: Tri[] = [...body];
  // A stovepipe on the roof and snow drifted against the long walls and the ends.
  out.push(...block(-0.9, 1.62, 0, 0.12, 0.3, 0.12, ZINC), ...block(-0.9, 1.8, 0, 0.18, 0.04, 0.18, WHITE));
  const [lx, lz] = [MODULE[0] * k, MODULE[1] * k];
  for (const [x, z, rx, rz, s] of [[0, lz / 2 + 0.1, 1.1, 0.28, 301], [-lx / 2 - 0.05, 0.1, 0.35, 0.55, 302], [lx / 2 + 0.05, -0.1, 0.35, 0.55, 303], [0, -lz / 2 - 0.1, 1.0, 0.25, 304]] as const) {
    out.push(...snowMound(x, z, rx, rz, 0.06, s, 7));
  }
  return out;
}

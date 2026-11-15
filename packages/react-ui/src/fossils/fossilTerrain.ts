import { type Box } from '../voyage/vehicles.ts';
import { FOSSIL_PALETTE as C } from './models.ts';

/**
 * Ground of the Fossils scenes, as blocks: the gravel plain of James Ross Island with its layered
 * mesas (after the camp photographs of the family archive), the Cretaceous forest floor and two
 * sea floors. Illustrative landscapes, not a survey of any site.
 */

function hash(x: number, z: number, seed: number): number {
  const s = Math.sin(x * 127.1 + z * 311.7 + seed * 74.7) * 43758.5453;
  return s - Math.floor(s);
}
function noise(x: number, z: number, seed: number): number {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = x - ix, fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz);
  const a = hash(ix, iz, seed), b = hash(ix + 1, iz, seed), c = hash(ix, iz + 1, seed), d = hash(ix + 1, iz + 1, seed);
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export const WATER_LEVEL = -0.3;
/** Radius around the camp kept flat for tents, people and finds. */
export const CAMP_FLAT = 6;
export const MESA_TOP = 6.2;
const STRATUM = 0.45;
const STRATA = [C.strataTan, C.strataBrown, C.strataGrey, C.strataTan, C.scree, C.strataBrown] as const;

/** Height of the present-day ground: plain, scree, cliff and plateau; sea to the west. */
export function fieldHeight(x: number, z: number): number {
  const wobble = (noise(x * 0.18, z * 0.18, 3) - 0.5) * 2.4;
  // Mesa to the north (negative z): a scree slope, then a cliff to a flat top.
  const edge = -11 + wobble + (noise(x * 0.07, 0, 9) - 0.5) * 3;
  const behind = edge - z;
  let h = smooth(0, 4, behind) * 3.2 + smooth(3.6, 4.6, behind) * (MESA_TOP - 3.2);
  // A smaller butte to the east frames the camp.
  const bx = x - 15, bz = z + 2;
  const butte = Math.hypot(bx * 0.9, bz * 1.2) + (noise(x * 0.3, z * 0.3, 5) - 0.5) * 1.2;
  h = Math.max(h, smooth(5, 2.5, butte) * 2.2 + smooth(2.2, 1.6, butte) * 1.4);
  // The mesa stops at the shore: the west becomes sea.
  const shore = -8.5 + (noise(0, z * 0.2, 11) - 0.5) * 2.5;
  const land = smooth(shore - 1.6, shore + 0.6, x);
  h = h * smooth(shore - 3, shore + 3, x) + (land - 1) * 0.9;
  // Gravel relief, kept almost flat around the camp.
  const r = Math.hypot(x, z);
  h += (noise(x * 0.9, z * 0.9, 1) - 0.5) * 0.12 * smooth(CAMP_FLAT - 2, CAMP_FLAT + 2, r);
  return h;
}

const quantize = (h: number) => Math.round(h / 0.1) * 0.1;

/** Surface color of a present-day cell: gravel shades, snow patches, scree or snow-capped plateau. */
function fieldSurface(x: number, z: number, h: number): number {
  if (h > MESA_TOP - 0.4) return noise(x * 0.4, z * 0.4, 13) > 0.38 ? C.snow : C.basalt;
  if (h > 1.2) return noise(x * 0.5, z * 0.5, 14) > 0.72 ? C.snow : C.scree;
  if (h < WATER_LEVEL + 0.25) return C.gravelLight;
  const snowy = noise(x * 0.35, z * 0.35, 21) > 0.8 && Math.hypot(x, z) > 5;
  if (snowy) return C.snow;
  const v = hash(Math.floor(x * 2), Math.floor(z * 2), 2);
  return v < 0.45 ? C.gravel : v < 0.8 ? C.gravelMid : C.gravelLight;
}

export interface GridSpec { x0: number; x1: number; z0: number; z1: number; cell: number; floor: number }
export const FIELD_GRID: GridSpec = { x0: -15, x1: 24, z0: -26, z1: 12, cell: 0.6, floor: -1.2 };

/**
 * One column of blocks per cell. Where a neighbour is lower, the exposed side is split into
 * strata, so the cliffs show their layers; a thin cap carries the color of the surface.
 */
export function columnsFromHeight(
  grid: GridSpec, height: (x: number, z: number) => number, surface: (x: number, z: number, h: number) => number,
  strata: readonly number[], skipBelow = -Infinity,
): Box[] {
  const nx = Math.round((grid.x1 - grid.x0) / grid.cell);
  const nz = Math.round((grid.z1 - grid.z0) / grid.cell);
  const hs: number[] = [];
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    hs.push(quantize(height(grid.x0 + (i + 0.5) * grid.cell, grid.z0 + (j + 0.5) * grid.cell)));
  }
  const at = (i: number, j: number) => (i < 0 || j < 0 || i >= nx || j >= nz ? grid.floor : hs[j * nx + i]);
  const boxes: Box[] = [];
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const h = at(i, j);
    if (h < skipBelow) continue;
    const x = grid.x0 + (i + 0.5) * grid.cell;
    const z = grid.z0 + (j + 0.5) * grid.cell;
    const cap = 0.08;
    const low = Math.max(grid.floor, Math.min(at(i - 1, j), at(i + 1, j), at(i, j - 1), at(i, j + 1)));
    const body = h - cap;
    if (body - low > STRATUM * 0.6 && strata.length > 0) {
      if (low > grid.floor) boxes.push([x, (grid.floor + low) / 2, z, grid.cell, low - grid.floor, grid.cell, strata[0]]);
      let y = low;
      while (y < body - 0.01) {
        const top = Math.min(body, (Math.floor(y / STRATUM + 1e-6) + 1) * STRATUM);
        const k = ((Math.floor(y / STRATUM + 1e-6) % strata.length) + strata.length) % strata.length;
        boxes.push([x, (y + top) / 2, z, grid.cell, top - y, grid.cell, strata[k]]);
        y = top;
      }
    } else if (body > grid.floor) {
      boxes.push([x, (grid.floor + body) / 2, z, grid.cell, body - grid.floor, grid.cell, strata[0] ?? surface(x, z, h)]);
    }
    boxes.push([x, h - cap / 2, z, grid.cell, cap, grid.cell, surface(x, z, h)]);
  }
  return boxes;
}

export function buildFieldBoxes(): Box[] {
  return columnsFromHeight(FIELD_GRID, fieldHeight, fieldSurface, STRATA, WATER_LEVEL - 0.15);
}

/** Flat-topped islands across the sea, like the view from the camp photographs. */
export const DISTANT_MESAS: readonly Box[] = [
  [-62, 2.5, -40, 30, 5, 12, C.strataGrey], [-62, 5.6, -40, 26, 1.2, 10, C.basalt], [-62, 6.3, -40, 22, 0.3, 9, C.snow],
  [-48, 1.6, -78, 40, 3.2, 14, C.strataBrown], [-48, 3.6, -78, 34, 0.8, 12, C.basalt], [-48, 4.1, -78, 30, 0.25, 11, C.snow],
  [-90, 3, -10, 14, 6, 34, C.strataGrey], [-90, 6.4, -10, 12, 0.8, 30, C.snow],
  [20, 3.5, -60, 50, 7, 10, C.strataGrey], [20, 7.4, -60, 46, 0.8, 9, C.snow],
];

/** Ice floes on the water, each [x, z, size, seed]. */
export const FLOES: readonly (readonly [number, number, number, number])[] = Array.from({ length: 26 }, (_, i) => {
  const x = -12 - hash(i, 1, 7) * 40;
  const z = 10 - hash(i, 2, 7) * 60;
  return [x, z, 0.4 + hash(i, 3, 7) * 1.6, i] as const;
});

// --- Cretaceous forest ----------------------------------------------------------------------

export const FOREST_GRID: GridSpec = { x0: -16, x1: 16, z0: -20, z1: 10, cell: 0.8, floor: -1 };
export function forestHeight(x: number, z: number): number {
  const hills = (noise(x * 0.12, z * 0.12, 31) - 0.5) * 2.2 + Math.max(0, -z - 8) * 0.18;
  return hills * smooth(3, 8, Math.hypot(x, z));
}
function forestSurface(x: number, z: number): number {
  const v = hash(Math.floor(x * 1.5), Math.floor(z * 1.5), 4);
  return v < 0.55 ? C.forestFloor : v < 0.94 ? C.forestMoss : C.forestSoil;
}
export function buildForestBoxes(): Box[] {
  return columnsFromHeight(FOREST_GRID, forestHeight, forestSurface, [C.forestSoil, C.strataBrown]);
}
export type ForestPlant = 'conifer' | 'cycad' | 'fern' | 'broadleaf';
/** Plants of the forest, kept out of the clearing where the dinosaur walks. */
export const FOREST_PLANTS: readonly { kind: ForestPlant; x: number; z: number; scale: number }[] = (() => {
  const out: { kind: ForestPlant; x: number; z: number; scale: number }[] = [];
  for (let i = 0; i < 70; i++) {
    const x = (hash(i, 1, 41) - 0.5) * 30;
    const z = -18 + hash(i, 2, 41) * 26;
    if (Math.hypot(x / 1.3, z) < 4.6) continue;
    const r = hash(i, 3, 41);
    const kind: ForestPlant = r < 0.42 ? 'conifer' : r < 0.6 ? 'broadleaf' : r < 0.78 ? 'cycad' : 'fern';
    const scale = kind === 'conifer' ? 3.2 + hash(i, 4, 41) * 2.4 : kind === 'broadleaf' ? 2.4 + hash(i, 4, 41) * 1.4 : 1.2 + hash(i, 4, 41) * 0.8;
    out.push({ kind, x, z, scale });
  }
  return out;
})();

// --- Sea floors -----------------------------------------------------------------------------

export const SEA_GRID: GridSpec = { x0: -14, x1: 14, z0: -16, z1: 8, cell: 0.7, floor: -1 };
export function seaFloorHeight(x: number, z: number, eocene: boolean): number {
  const ripples = Math.sin(x * 1.3 + Math.sin(z * 0.4) * 1.5) * 0.06;
  const swell = (noise(x * 0.15, z * 0.15, eocene ? 51 : 52) - 0.5) * 1.2;
  // The Eocene stars lived on the hard wall of a valley flooded by the sea.
  const wall = eocene ? smooth(-4.5, -8.5, z + (noise(x * 0.2, 0, 53) - 0.5) * 3) * 3.2 : 0;
  return ripples + swell * smooth(2, 6, Math.hypot(x, z)) + wall;
}
export function buildSeaFloorBoxes(eocene: boolean): Box[] {
  return columnsFromHeight(
    SEA_GRID, (x, z) => seaFloorHeight(x, z, eocene),
    (x, z, h) => (h > 1 ? (hash(Math.floor(x * 2), Math.floor(z * 2), 6) > 0.5 ? C.seaFloorDark : C.rock) : hash(Math.floor(x * 2), Math.floor(z * 2), 5) > 0.3 ? C.seaFloor : C.seaFloorDark),
    eocene ? [C.seaFloorDark, C.rock, C.strataGrey] : [C.seaFloorDark],
  );
}

/** Deterministic scatter of [x, z, scale, seed] for small sea floor dwellers, away from the center. */
export function scatter(count: number, seed: number, radius: number, keepOut = 1.5): [number, number, number, number][] {
  const out: [number, number, number, number][] = [];
  for (let i = 0; out.length < count && i < count * 6; i++) {
    const a = hash(i, 1, seed) * Math.PI * 2;
    const r = keepOut + Math.sqrt(hash(i, 2, seed)) * (radius - keepOut);
    out.push([Math.cos(a) * r, Math.sin(a) * r * 0.7 - 1, 0.7 + hash(i, 3, seed) * 0.8, i]);
  }
  return out;
}

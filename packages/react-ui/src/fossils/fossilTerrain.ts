import { chunk, normalOf, prism, type Tri, type Vec3 } from '../voyage/lowPoly.ts';
import { FOSSIL_PALETTE as C } from './models.ts';

/**
 * Ground of the Fossils scenes, in low-poly (rule 30): the gravel plain of James Ross Island with
 * its layered mesas (after the camp photographs of the family archive), the Cretaceous forest floor
 * and two sea floors. A field of faces over the height of each landscape; steep faces show the
 * strata. Illustrative landscapes, not a survey of any site.
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

/** Faces steeper than this (0 flat, 1 a wall) are rock walls: they show the strata, not the surface. */
const CLIFF = 0.55;

/**
 * Ground as faces over a grid of corners at the height of the landscape. The inner corners are
 * jittered a little so the facets look like terrain, not a grid; cells split along alternating
 * diagonals. A face gets its surface color, or, if it is a steep wall, the color of the stratum at
 * its height. The edge of the grid drops to its floor, so the ground does not end in the air.
 */
export function heightField(
  grid: GridSpec, height: (x: number, z: number) => number, surface: (x: number, z: number, h: number) => number,
  strata: readonly number[], skipBelow = -Infinity,
): Tri[] {
  const nx = Math.round((grid.x1 - grid.x0) / grid.cell);
  const nz = Math.round((grid.z1 - grid.z0) / grid.cell);
  const pts: Vec3[][] = [];
  for (let i = 0; i <= nx; i++) {
    pts.push([]);
    for (let j = 0; j <= nz; j++) {
      const edge = i === 0 || j === 0 || i === nx || j === nz;
      const jx = edge ? 0 : (hash(i, j, 61) - 0.5) * grid.cell * 0.5;
      const jz = edge ? 0 : (hash(i, j, 62) - 0.5) * grid.cell * 0.5;
      const x = grid.x0 + i * grid.cell + jx;
      const z = grid.z0 + j * grid.cell + jz;
      pts[i].push([x, edge ? grid.floor : height(x, z), z]);
    }
  }
  const out: Tri[] = [];
  const face = (a: Vec3, b: Vec3, c: Vec3) => {
    if (Math.max(a[1], b[1], c[1]) < skipBelow) return;
    const n = normalOf([a, b, c, 0]);
    const steep = 1 - Math.abs(n[1]);
    const mx = (a[0] + b[0] + c[0]) / 3, my = (a[1] + b[1] + c[1]) / 3, mz = (a[2] + b[2] + c[2]) / 3;
    const k = ((Math.floor(my / STRATUM + 1e-6) % strata.length) + strata.length) % strata.length;
    out.push([a, b, c, steep > CLIFF && strata.length > 0 ? strata[k] : surface(mx, mz, my)]);
  };
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < nz; j++) {
      const a = pts[i][j], b = pts[i + 1][j], c = pts[i + 1][j + 1], e = pts[i][j + 1];
      if ((i + j) % 2) { face(a, e, c); face(a, c, b); } else { face(a, e, b); face(b, e, c); }
    }
  }
  return out;
}

export function buildFieldTris(): Tri[] {
  return heightField(FIELD_GRID, fieldHeight, fieldSurface, STRATA, WATER_LEVEL - 0.15);
}

/**
 * Flat-topped islands across the sea, like the view from the camp photographs: an irregular footprint
 * that narrows as it rises, a dark basalt cap and snow on top. [x, z, width, depth, height, rock].
 */
const MESAS: readonly (readonly [number, number, number, number, number, number])[] = [
  [-62, -40, 30, 12, 6.2, C.strataGrey], [-48, -78, 40, 14, 4.2, C.strataBrown], [-90, -10, 14, 34, 6.6, C.strataGrey], [20, -60, 50, 10, 7.6, C.strataGrey],
];
export const DISTANT_MESAS: readonly Tri[] = MESAS.flatMap(([x, z, w, d, h, rock], m) => {
  const ring = (k: number): [number, number][] => Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2;
    const r = 1 - k + (hash(i, m, 71) - 0.5) * 0.12;
    return [x + (Math.cos(a) * w * r) / 2, z - (Math.sin(a) * d * r) / 2];
  });
  return [
    ...prism(ring(0), -0.5, h * 0.8, rock),
    ...prism(ring(0.08), h * 0.8, h * 0.95, C.basalt),
    ...prism(ring(0.12), h * 0.95, h, C.snow),
  ];
});

/** A floe: a flat, rough slab of ice with a bluish underside. */
export const FLOE_TRIS: readonly Tri[] = [...chunk(0, 0.02, 0, 1, 0.14, 0.7, 81, C.snow), ...chunk(0.05, -0.04, 0, 0.9, 0.08, 0.6, 82, C.iceBlue)];

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
/** Forest floor in broad patches of moss and, here and there, bare soil (not face by face). */
function forestSurface(x: number, z: number): number {
  const v = noise(x * 0.35, z * 0.35, 4);
  return v < 0.5 ? C.forestFloor : v < 0.8 ? C.forestMoss : C.forestSoil;
}
export function buildForestTris(): Tri[] {
  return heightField(FOREST_GRID, forestHeight, forestSurface, [C.forestSoil, C.strataBrown]);
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
export function buildSeaFloorTris(eocene: boolean): Tri[] {
  return heightField(
    SEA_GRID, (x, z) => seaFloorHeight(x, z, eocene),
    // Broad patches of sand and darker mud; the rock wall of the Eocene valley in its own tones.
    (x, z, h) => (h > 1 ? (noise(x * 0.4, z * 0.4, 6) > 0.5 ? C.seaFloorDark : C.rock) : noise(x * 0.3, z * 0.3, 5) > 0.68 ? C.seaFloorDark : C.seaFloor),
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

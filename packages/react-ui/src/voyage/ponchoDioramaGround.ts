import { SCENE_STRIDE, createSeededRng, sceneBodyRadius, sceneCoastZ, scenePathPoints, type SceneDef } from '@antartida/core';
import { VOXEL_PALETTE } from '../orcadas/stationModels.ts';
import { SEA_ICE_FLOE_POLY_VARIANTS } from '../orcadas/lowPolyProps.ts';
import { ICEBERG_PEAKS_POLY, ICEBERG_TABULAR_POLY } from './icebergs.ts';
import { PRESHADED, RELIEF_ICE, chunk, normalOf, resolveRelief, type Tri, type Vec3 } from './lowPoly.ts';
import { ponchoFootprints } from './ponchoPeople.ts';
import { seatAt, type Ground } from './ponchoSceneBuild.ts';
import { snowMound } from './ponchoShapes.ts';

/**
 * The world round a diorama of Poncho (issue #146), at human scale (rule 30): not a slab that floats but
 * ground that reaches the horizon. Round the stage it is snow with gentle swells, pebbles, rocks, drifts and
 * the prints of the team; farther the swells grow into low rolling hills and, past them, a ring of far
 * ridges that fade into the haze (the canvas adds fog and a sky of its own). On a `coast` scene one side
 * of the stage gives onto the sea: the ice ends in a low cliff with a band of foam at its foot, and the
 * water, with floes and small icebergs, goes to the horizon. Everything is flat-colored facets of the
 * palette of Orcadas and of the relief; all of it is illustration, invented to read well.
 *
 * Local frame of the scene, units of a person's height; the sea, when there is one, lies on the +z side.
 * The ground is a grid whose cells grow with the distance (no seams, a few thousand faces in all).
 */

/** How far, in scene units, the pebbles, rocks and drifts are scattered past the farthest element. */
export const DIORAMA_MARGIN = 3.6;
/** Height of the swells of the snow near the stage: low enough for a boot to sit on, high enough to read as relief. */
export const DIORAMA_SWELL = 0.08;
/** How far a detail keeps from the body of an element (added to `sceneBodyRadius`), and from a path of the scene. */
export const DIORAMA_CLEAR_MARGIN = 0.35;
export const DIORAMA_PATH_CLEARANCE = 0.55;

/** Facets of the ground: width of the ones round the stage, how much each next ring grows, and how many rings. */
const NEAR_CELL = 0.6;
const NEAR_CELLS = 12;
const GROWTH = 1.3;
const FAR_CELLS = 15;
/** Beyond this distance the ground is the haze itself: the canvas fog is complete here (PonchoDioramaCanvas). */
export const DIORAMA_FOG_FAR = 125;

/** Water level and how deep the sea bed goes (under it nothing is drawn). The ice foot stands 0.3 above the water. */
export const DIORAMA_WATER_Y = -0.3;
const SEA_BED = -1.3;
/** The cliff of the ice falls from the snow to the bed over this width, starting this far before the coast line (scene units). */
const CLIFF_START = -0.1;
const CLIFF_END = 0.5;

const PEBBLES = 46;
const ROCKS = 14;
const DRIFTS = 9;
/** Prints of the team that arrived, in a line behind the scene (-x). */
const TRAIL_PRINTS = 9;
/** Far ridges: where the ring begins and ends, how many segments and rings. */
const RIDGE_RINGS: readonly number[] = [50, 68, 84, 100, 118];
const RIDGE_SEGMENTS = 56;

const { ROCK, ROCK_DARK, ROCK_LIGHT, SEA_GREY, ICE_BLUE, WHITE } = VOXEL_PALETTE;
const PEBBLE_COLORS = [ROCK_DARK, ROCK, SEA_GREY];
const ROCK_COLORS = [ROCK, ROCK_DARK, ROCK_LIGHT, SEA_GREY];
// The water: near the ice a pale turquoise, in the open a deeper blue-grey (named constants, rule 30).
const WATER_SHALLOW = 0x9cc7d6;
const WATER_MID = 0x6fa3bb;
const WATER_DEEP = 0x4f86a3;

const smooth = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Height of the snow at (x, z) near the stage: gentle swells, the same for the floor, the details and everyone who stands on it. */
export function dioramaGround(x: number, z: number): number {
  return DIORAMA_SWELL * (0.6 * Math.sin(x * 1.1 + 0.6) * Math.cos(z * 0.9) + 0.4 * Math.sin(z * 1.7 - x * 0.4));
}

/** The swells of the far land: nothing round the stage, then rolling hills (always above the water). */
function farLand(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const hills = 0.5 + 0.28 * Math.sin(x * 0.11 + 1.3) * Math.cos(z * 0.09) + 0.22 * Math.sin((x + z) * 0.07 + 0.4);
  return smooth(8, 34, r) * (0.15 + 1.5 * hills);
}

/** True when (x, z) is on the ice and not in the sea (always, on a plain). */
export const dioramaOnLand = (scene: SceneDef, x: number, z: number): boolean => scene.setting !== 'coast' || z < sceneCoastZ(x) - 0.6;

/** Height of the ground at (x, z) in the world: land, or its cliff and the sea bed on the coast. */
function worldHeight(scene: SceneDef, x: number, z: number): number {
  const land = dioramaGround(x, z) + farLand(x, z);
  if (scene.setting !== 'coast') return land;
  const t = smooth(CLIFF_START, CLIFF_END, z - sceneCoastZ(x));
  return land + (SEA_BED - land) * t;
}

/** Positions of the corners of the grid on one axis, from the least to the greatest, symmetric about 0. */
function gridAxis(cell: number, cells: number, growth: number, rings: number): number[] {
  const side = [0];
  for (let i = 1; i <= cells; i++) side.push(i * cell);
  for (let j = 1; j <= rings; j++) side.push(side[side.length - 1] + cell * growth ** j);
  return [...side.slice(1).reverse().map((v) => -v), ...side];
}

/** A cell of a grid, its four corners and its center. */
type Corners = readonly [Vec3, Vec3, Vec3, Vec3];

/** The faces of a grid over the axis `axis` x `axis`; `pointAt` gives each corner and `keep` the cells to build. Cells alternate their diagonal. */
function gridFaces(axis: readonly number[], pointAt: (x: number, z: number, edge: boolean, rng: () => number) => Vec3, keep: (c: Corners) => boolean, color: (c: Corners, rng: () => number) => number, seed: number): Tri[] {
  const rng = createSeededRng(seed);
  const n = axis.length;
  const pts: Vec3[][] = axis.map((x, i) =>
    axis.map((z, j) => {
      const edge = i === 0 || j === 0 || i === n - 1 || j === n - 1;
      return pointAt(x, z, edge, rng);
    }),
  );
  const out: Tri[] = [];
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - 1; j++) {
      const c: Corners = [pts[i][j], pts[i + 1][j], pts[i + 1][j + 1], pts[i][j + 1]];
      if (!keep(c)) continue;
      const col = color(c, rng);
      const [a, b, d, e] = c;
      if ((i + j) % 2) out.push([a, e, d, col], [a, d, b, col]);
      else out.push([a, e, b, col], [b, e, d, col]);
    }
  }
  return out;
}

/** The ground: facets of the color of the relief, a bluer one where the slope is steep or low. Sea cells that are only sea bed are left out. */
function groundFaces(scene: SceneDef, seed: number): Tri[] {
  const axis = gridAxis(NEAR_CELL, NEAR_CELLS, GROWTH, FAR_CELLS);
  // How wide the cells are at a coordinate: the corners of a cell may wander a third of it, so the facets are irregular, not a grid.
  const gap = (v: number): number => {
    const i = axis.indexOf(v);
    return Math.min(axis[i + 1] - v, v - axis[i - 1]);
  };
  return gridFaces(
    axis,
    (x, z, edge, rng) => {
      const jx = edge ? 0 : (rng() - 0.5) * 0.7 * gap(x);
      const jz = edge ? 0 : (rng() - 0.5) * 0.7 * gap(z);
      return [x + jx, worldHeight(scene, x + jx, z + jz), z + jz];
    },
    (c) => c.some((p) => p[1] > SEA_BED + 0.05),
    (c) => {
      const n = normalOf([c[0], c[3], c[1], 0]);
      const low = c.reduce((s, p) => s + p[1], 0) / 4 < -0.02;
      return low || 1 - Math.abs(n[1]) > 0.3 ? ICE_BLUE : RELIEF_ICE;
    },
    seed,
  );
}

/** Low far ridges all round, rising from below the ground and fading into the haze: rolling hills of snow with a few rock faces. */
function ridgeFaces(seed: number): Tri[] {
  const rng = createSeededRng(seed);
  const phase = [rng() * 6, rng() * 6, rng() * 6];
  const crest = (a: number) => 3 + 11 * Math.max(0, 0.35 + 0.6 * Math.sin(2 * a + phase[0]) * Math.cos(3 * a + phase[1]) + 0.3 * Math.sin(5 * a + phase[2]));
  const height = (ring: number, a: number) => {
    const t = ring / (RIDGE_RINGS.length - 1);
    // A ridge: low at the inner and outer ring, highest a little inside the middle.
    return -1.2 + (crest(a) + 1.2) * Math.sin(Math.PI * Math.min(1, t * 1.15)) ** 1.3;
  };
  const point = (ring: number, k: number): Vec3 => {
    const a = (k / RIDGE_SEGMENTS) * Math.PI * 2;
    const wob = 1 + 0.06 * Math.sin(3 * a + ring);
    const r = RIDGE_RINGS[ring] * wob;
    return [Math.cos(a) * r, height(ring, a) + (ring === 0 || ring === RIDGE_RINGS.length - 1 ? 0 : (rng() - 0.5) * 0.7), Math.sin(a) * r];
  };
  const grid = RIDGE_RINGS.map((_, r) => Array.from({ length: RIDGE_SEGMENTS }, (_, k) => point(r, k)));
  const out: Tri[] = [];
  for (let r = 0; r < RIDGE_RINGS.length - 1; r++) {
    for (let k = 0; k < RIDGE_SEGMENTS; k++) {
      const a = grid[r][k];
      const b = grid[r][(k + 1) % RIDGE_SEGMENTS];
      const c = grid[r + 1][(k + 1) % RIDGE_SEGMENTS];
      const d = grid[r + 1][k];
      for (const t of [[a, c, b], [a, d, c]] as const) {
        const [p, q, s] = t;
        // Seen from above, with the face turned up.
        const up = normalOf([p, q, s, 0])[1] >= 0;
        const face: [Vec3, Vec3, Vec3] = up ? [p, q, s] : [p, s, q];
        const steep = 1 - Math.abs(normalOf([...face, 0])[1]);
        const high = (face[0][1] + face[1][1] + face[2][1]) / 3;
        // Rock where it is steep, snow on the high gentle slopes and a bluer ice on the low ones: the shades read through the haze.
        out.push([face[0], face[1], face[2], steep > 0.14 ? (rng() < 0.5 ? SEA_GREY : ROCK_LIGHT) : high > 5 ? WHITE : ICE_BLUE]);
      }
    }
  }
  return out;
}

/** Distance from (x, z) to the segment a-b. */
function distanceToSegment(x: number, z: number, a: readonly [number, number], b: readonly [number, number]): number {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const len2 = dx * dx + dz * dz;
  const u = len2 ? Math.min(1, Math.max(0, ((x - a[0]) * dx + (z - a[1]) * dz) / len2)) : 0;
  return Math.hypot(x - (a[0] + dx * u), z - (a[1] + dz * u));
}

/** True when a detail of `size` at (x, z) would sit on an element of the scene or on one of its paths, or in the sea. */
export function dioramaBlocked(scene: SceneDef, x: number, z: number, size = 0): boolean {
  // The whole detail must stay on land, not just its middle.
  if (!dioramaOnLand(scene, x, z + size)) return true;
  return (
    scene.elements.some((e) => Math.hypot(e.x - x, e.z - z) < sceneBodyRadius(e) + DIORAMA_CLEAR_MARGIN + size) ||
    scene.paths.some((p) => {
      const pts = scenePathPoints(p);
      return pts.slice(1).some((q, i) => distanceToSegment(x, z, pts[i], q) < DIORAMA_PATH_CLEARANCE + size);
    })
  );
}

/** Mean radius, past the farthest element of the scene, up to which details are scattered. */
export const dioramaRadius = (scene: SceneDef): number => scene.radius + DIORAMA_MARGIN;

/**
 * The prints of the team that arrived: a line of boot prints behind the scene, along its heading, at the
 * first free height. Prints that would fall on an element, a path or the sea are left out.
 */
function trail(scene: SceneDef, radius: number, ground: Ground): Tri[] {
  const x0 = -radius * 0.85;
  const out: Tri[] = [];
  for (const z0 of [-2.4, 2.6, 0, -3.4]) {
    const spots = Array.from({ length: TRAIL_PRINTS }, (_, i) => [x0 + SCENE_STRIDE * i, z0 + (i % 2 ? 0.09 : 0)] as const);
    if (spots.some(([x, z]) => Math.hypot(x, z) >= radius * 0.85 || !dioramaOnLand(scene, x, z))) continue;
    for (const [x, z] of spots) {
      if (!dioramaBlocked(scene, x, z)) out.push(...ponchoFootprints([x, z], 0, 1, SCENE_STRIDE, ground));
    }
    break;
  }
  return out;
}

/** Pebbles, rocks and drifts scattered over the snow, clear of what the scene shows, and the prints. */
export function dioramaDetails(scene: SceneDef, radius: number, seed: number): Tri[] {
  const rng = createSeededRng(seed);
  const out: Tri[] = [];
  const spot = (size: number) => {
    // A few tries to find a free place; none left, no detail (it is only decoration).
    for (let tries = 0; tries < 12; tries++) {
      const a = rng() * Math.PI * 2;
      const r = Math.sqrt(rng()) * radius;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (!dioramaBlocked(scene, x, z, size)) return [x, z] as const;
    }
    return null;
  };
  for (let i = 0; i < PEBBLES; i++) {
    const size = 0.045 + rng() * 0.065;
    const at = spot(size);
    if (!at) continue;
    const [x, z] = at;
    out.push(...chunk(x, dioramaGround(x, z) + size * 0.1, z, size * 1.15, size * 0.55, size * 0.9, Math.floor(rng() * 1e6), PEBBLE_COLORS[Math.floor(rng() * PEBBLE_COLORS.length)]));
  }
  for (let i = 0; i < ROCKS; i++) {
    const size = 0.15 + rng() ** 1.6 * 0.3;
    const at = spot(size);
    if (!at) continue;
    const [x, z] = at;
    const sy = size * (0.6 + rng() * 0.3);
    out.push(...chunk(x, dioramaGround(x, z) + sy * 0.15, z, size * (1 + rng() * 0.5), sy, size * (0.85 + rng() * 0.4), Math.floor(rng() * 1e6), ROCK_COLORS[Math.floor(rng() * ROCK_COLORS.length)]));
    // A smaller one leans on the big ones.
    if (size > 0.28) {
      const sub = size * 0.5;
      out.push(...chunk(x + size * 0.7, dioramaGround(x + size * 0.7, z) + sub * 0.1, z + size * 0.2, sub * 1.2, sub * 0.65, sub, Math.floor(rng() * 1e6), ROCK_DARK));
    }
  }
  const ground: Ground = dioramaGround;
  for (let i = 0; i < DRIFTS; i++) {
    const rx = 0.45 + rng() * 0.55;
    const at = spot(rx);
    if (!at) continue;
    out.push(...seatAt(snowMound(0, 0, rx, rx * (0.55 + rng() * 0.3), 0.05 + rng() * 0.07, Math.floor(rng() * 1e6), 9), at[0], at[1], rng() * Math.PI * 2, 1, ground));
  }
  out.push(...trail(scene, radius, ground));
  return out;
}

// ---- The sea --------------------------------------------------------------------------------------

/** The mix of two 0xRRGGBB colors, `t` of the way from `a` to `b`. */
function mixHex(a: number, b: number, t: number): number {
  const ch = (shift: number) => Math.round(((a >> shift) & 255) + ((((b >> shift) & 255) - ((a >> shift) & 255)) * t));
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

/**
 * The water: facets that go from a pale turquoise near the ice to a deeper blue-grey in the open, each a
 * little lighter or darker than the next, from the coast to the horizon. Flat (preshaded) colors.
 */
function waterFaces(seed: number): Tri[] {
  const axis = gridAxis(1.1, 9, 1.38, 11);
  const gap = (v: number): number => {
    const i = axis.indexOf(v);
    return Math.min(axis[i + 1] - v, v - axis[i - 1]);
  };
  return gridFaces(
    axis,
    (x, z, edge, rng) => [x + (edge ? 0 : (rng() - 0.5) * 0.6 * gap(x)), DIORAMA_WATER_Y + (edge ? 0 : (rng() - 0.5) * 0.03), z + (edge ? 0 : (rng() - 0.5) * 0.6 * gap(z))],
    (c) => Math.max(c[0][2], c[3][2]) > 1.2,
    (c, rng) => {
      const away = c.reduce((s, p) => s + Math.abs(p[2] - sceneCoastZ(p[0])), 0) / 4;
      const base = mixHex(mixHex(WATER_SHALLOW, WATER_MID, smooth(0.5, 4, away)), WATER_DEEP, smooth(6, 40, away));
      return PRESHADED + mixHex(base, rng() < 0.5 ? WHITE : WATER_DEEP, 0.05 + rng() * 0.07);
    },
    seed,
  );
}

/** A band of foam at the foot of the ice, broken here and there, over the water. */
function foamFaces(): Tri[] {
  const out: Tri[] = [];
  const y = DIORAMA_WATER_Y + 0.012;
  for (let i = 0; i < 44; i++) {
    if (i % 9 === 4) continue;
    const x0 = -9.5 + i * 0.45;
    const x1 = x0 + 0.45;
    const w0 = 0.25 + 0.18 * Math.abs(Math.sin(i * 2.3));
    const w1 = 0.25 + 0.18 * Math.abs(Math.sin((i + 1) * 2.3));
    const off = 0.28;
    const a: Vec3 = [x0, y, sceneCoastZ(x0) + off];
    const b: Vec3 = [x1, y, sceneCoastZ(x1) + off];
    const c: Vec3 = [x1, y, sceneCoastZ(x1) + off + w1];
    const d: Vec3 = [x0, y, sceneCoastZ(x0) + off + w0];
    out.push([a, c, b, PRESHADED + WHITE], [a, d, c, PRESHADED + WHITE]);
  }
  return out;
}

/** Floes and small icebergs afloat (the models of Orcadas, scaled) in a few fixed places of the sea, near and far. */
function floatingIce(seed: number): Tri[] {
  const rng = createSeededRng(seed);
  const out: Tri[] = [];
  const place = (tris: readonly Tri[], x: number, z: number, scale: number, yaw: number) => {
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    for (const [a, b, d, col] of tris) {
      const m = ([px, py, pz]: Vec3): Vec3 => [x + (px * c + pz * s) * scale, DIORAMA_WATER_Y + py * scale, z + (-px * s + pz * c) * scale];
      out.push([m(a), m(b), m(d), col]);
    }
  };
  // Icebergs: the tabular and the peaked one, far enough that they do not crowd the stage.
  const bergs: readonly (readonly [number, number, number])[] = [[-9, 11, 3.4], [7, 17, 4.8], [20, 28, 7.5], [-24, 36, 9], [1, 50, 12]];
  bergs.forEach(([x, z, k], i) => place(i % 2 ? ICEBERG_PEAKS_POLY : ICEBERG_TABULAR_POLY, x, z, k, rng() * Math.PI * 2));
  // Small floes of loose ice along the coast and farther out.
  const floes: readonly (readonly [number, number, number])[] = [[-5, 7.4, 0.85], [2.8, 8.1, 0.6], [-1.5, 9.4, 0.7], [6.5, 7.2, 0.55], [-8.5, 8.6, 0.75], [11, 12, 1.3], [-14, 15, 1.6], [4, 21, 1.8]];
  floes.forEach(([x, z, k], i) => place(SEA_ICE_FLOE_POLY_VARIANTS[i % SEA_ICE_FLOE_POLY_VARIANTS.length].tris, x, z, k, rng() * Math.PI * 2));
  return out;
}

/** What a diorama stands in: the land with its details and far ridges, the sea, and the height of the snow under the stage. */
export interface DioramaWorld {
  /** Ground, details and ridges: colors resolved as the relief. */
  readonly land: readonly Tri[];
  /** Water, foam and floating ice; empty on a plain. */
  readonly sea: readonly Tri[];
  readonly ground: Ground;
}

/** The world of a scene, deterministic: the same scene gives the same world. */
export function buildDioramaWorld(scene: SceneDef, seed = 146000): DioramaWorld {
  const s = seed + Math.round(scene.radius * 10);
  const radius = dioramaRadius(scene);
  const land = resolveRelief([...groundFaces(scene, s), ...ridgeFaces(s + 2), ...dioramaDetails(scene, radius, s + 1)], () => 0);
  const sea = scene.setting === 'coast' ? [...waterFaces(s + 3), ...foamFaces(), ...floatingIce(s + 4)] : [];
  return { land, sea, ground: dioramaGround };
}

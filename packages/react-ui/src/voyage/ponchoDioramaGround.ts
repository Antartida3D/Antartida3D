import { SCENE_STRIDE, createSeededRng, type SceneDef } from '@antartida/core';
import { VOXEL_PALETTE } from '../orcadas/stationModels.ts';
import { RELIEF_ICE, chunk, groundField, resolveRelief, type Tri } from './lowPoly.ts';
import { ponchoFootprints } from './ponchoPeople.ts';
import { seatAt, type Ground } from './ponchoSceneBuild.ts';
import { snowMound } from './ponchoShapes.ts';

/**
 * The ground of a diorama of Poncho (issue #146), at human scale (rule 30): a slab of snow with an
 * irregular edge, loose pebbles and rocks, drifts and the prints of the team that came by. The same
 * primitives and colors as the stage details of Orcadas (`chunk`, VOXEL_PALETTE, relief colors), but
 * laid out for this scene: the details of Orcadas (`buildStageDetailTris`) are fixed to its own layout.
 * Local frame of the scene, units of a person's height. All is illustration, invented to read well.
 */

/** How far the snow goes past the farthest element of the scene (scene units). */
export const DIORAMA_MARGIN = 2.2;
/** Width of a facet of the floor, and how far its edge falls under the snow (a slab, not a wall). */
const CELL = 0.45;
const EDGE_DROP = 0.4;
/** Height of the swells of the snow: low enough for a boot to sit on, high enough to read as relief. */
export const DIORAMA_SWELL = 0.08;
/** Least distance (scene units) from a detail to the middle of an element, by kind: things stay clear of what the story shows. */
export const DIORAMA_CLEARANCE: Readonly<Record<'person' | 'dog' | 'prop' | 'sled', number>> = { person: 0.6, dog: 0.5, prop: 1.0, sled: 1.1 };
/** Least distance from a detail to a path of the scene. */
export const DIORAMA_PATH_CLEARANCE = 0.55;

const PEBBLES = 46;
const ROCKS = 14;
const DRIFTS = 9;
/** Prints of the team that arrived, in a line behind the scene (-x). */
const TRAIL_PRINTS = 9;

const { ROCK, ROCK_DARK, ROCK_LIGHT, SEA_GREY, ICE_BLUE } = VOXEL_PALETTE;
const PEBBLE_COLORS = [ROCK_DARK, ROCK, SEA_GREY];
const ROCK_COLORS = [ROCK, ROCK_DARK, ROCK_LIGHT, SEA_GREY];

/** Height of the snow at (x, z): gentle swells, the same for the floor, the details and everyone who stands on it. */
export function dioramaGround(x: number, z: number): number {
  return DIORAMA_SWELL * (0.6 * Math.sin(x * 1.1 + 0.6) * Math.cos(z * 0.9) + 0.4 * Math.sin(z * 1.7 - x * 0.4));
}

/** Radius of the irregular edge of the snow at the angle `theta`, for a mean radius `r`. */
export const dioramaEdge = (r: number, theta: number): number => r * (1 + 0.07 * Math.sin(3 * theta + 1.1) + 0.05 * Math.sin(5 * theta + 0.3) + 0.03 * Math.sin(8 * theta));

/** Mean radius of the snow of a scene: past its farthest element. */
export const dioramaRadius = (scene: SceneDef): number => scene.radius + DIORAMA_MARGIN;

/** The slab of snow: facets of the color of the relief, and a bluer lip where the edge falls. */
export function dioramaFloor(radius: number, seed: number): Tri[] {
  const cells = Math.ceil((2 * radius * 1.2) / CELL / 2) * 2;
  const half = (cells * CELL) / 2;
  const tris = groundField(
    cells,
    cells,
    CELL,
    seed,
    (u, v) => {
      const x = u * half;
      const z = v * half;
      return Math.hypot(x, z) <= dioramaEdge(radius, Math.atan2(z, x)) ? dioramaGround(x, z) : null;
    },
    (_u, _v, h, steep) => (h < -0.02 || steep > 0.3 ? ICE_BLUE : RELIEF_ICE),
    EDGE_DROP,
  );
  return tris;
}

/** Distance from (x, z) to the segment a-b. */
function distanceToSegment(x: number, z: number, a: readonly [number, number], b: readonly [number, number]): number {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const len2 = dx * dx + dz * dz;
  const u = len2 ? Math.min(1, Math.max(0, ((x - a[0]) * dx + (z - a[1]) * dz) / len2)) : 0;
  return Math.hypot(x - (a[0] + dx * u), z - (a[1] + dz * u));
}

/** True when a detail of `size` at (x, z) would sit on an element of the scene or on one of its paths. */
export function dioramaBlocked(scene: SceneDef, x: number, z: number, size = 0): boolean {
  return (
    scene.elements.some((e) => Math.hypot(e.x - x, e.z - z) < DIORAMA_CLEARANCE[e.kind] * (e.scale ?? 1) + size) ||
    scene.paths.some((p) => distanceToSegment(x, z, p.from, p.to) < DIORAMA_PATH_CLEARANCE + size)
  );
}

/**
 * The prints of the team that arrived: a line of boot prints behind the scene, along its heading,
 * at the first free height. Prints that would fall on an element or a path are left out.
 */
function trail(scene: SceneDef, radius: number, ground: Ground): Tri[] {
  const x0 = -radius * 0.85;
  const out: Tri[] = [];
  for (const z0 of [-2.4, 2.6, 0, -3.4]) {
    const spots = Array.from({ length: TRAIL_PRINTS }, (_, i) => [x0 + SCENE_STRIDE * i, z0 + (i % 2 ? 0.09 : 0)] as const);
    if (spots.some(([x, z]) => Math.hypot(x, z) >= dioramaEdge(radius, Math.atan2(z, x)) * 0.85)) continue;
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
      const r = Math.sqrt(rng()) * dioramaEdge(radius, a) * 0.86;
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

/** What the diorama of a scene stands on: all the faces (colors resolved), and the height of the snow. */
export interface DioramaGround {
  readonly tris: readonly Tri[];
  readonly ground: Ground;
  /** Mean radius of the slab. */
  readonly radius: number;
}

/** The floor and its details for a scene, deterministic: the same scene gives the same ground. */
export function buildDioramaGround(scene: SceneDef, seed = 146000): DioramaGround {
  const radius = dioramaRadius(scene);
  const s = seed + Math.round(scene.radius * 10);
  return { tris: resolveRelief([...dioramaFloor(radius, s), ...dioramaDetails(scene, radius, s + 1)], () => 0), ground: dioramaGround, radius };
}

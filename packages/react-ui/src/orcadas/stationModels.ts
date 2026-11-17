import { BufferAttribute, BufferGeometry, PlaneGeometry } from 'three';
import {
  createSeededRng,
  DIORAMA_PROP_SCALE,
  layoutOf,
  STAGE_HALF_EXTENT,
  STATION_GROUND_Y,
  STATION_LAYOUT,
  worldCoastDistance,
  type SiteColour,
  type StationLayoutEntry,
} from '@antartida/core';
import type { Box } from '../voyage/vehicles.ts';
import { chunk, type Tri, type Vec3 } from '../voyage/lowPoly.ts';

/** Building colours: orange from OpenStreetMap Maxar imagery, neutral grey for unassigned modules. */
export const OSM_ORANGE = 0xff4500;
export const UNKNOWN_BUILDING_COLOUR = 0x82888a;

// Shared muted palette matching voyage/sightingModels.ts and voyage/vehicles.ts
export const VOXEL_PALETTE = {
  BLACK: 0x1f2a36,
  WHITE: 0xf7fafb,
  ROCK: 0x8a8f8c,
  ROCK_DARK: 0x656a68,
  ROCK_LIGHT: 0x9a9f9b,
  ICE: 0xe9f1f4,
  ICE_BLUE: 0xb6d3e3,
  ORANGE: 0xd9822b,
  RED: 0xc8472a,
  RED_DARK: 0x96351e,
  CREAM: 0xf1e6c8,
  WOOD: 0x8a6a4a,
  WOOD_LIGHT: 0xc49a6c,
  GRASS: 0x9aa86a,
  SEA_GREY: 0x6f7f8c,
  BROWN: 0x6b5443,
  BROWN_DARK: 0x4d3b2f,
  WHALE_GREY: 0x55606b,
  LAMP: 0xf2c14e,
  ZINC: 0x7d868c,
  SKY: 0x7fb6dc,
  NAVY_ROOF: 0x1e3e5c,
  WINDOW_DAY: 0xc9dbe6,
  SEAL_DARK: 0x4f5a63,
  SEAL_BELLY: 0x9aa6ae,
  SEAL_SPOT: 0xc9d0d4,
  ZODIAC_TUBE: 0xb3bcc4,
  ZODIAC_TUBE_DARK: 0x87919a,
  ZODIAC_HULL: 0x3a434c,
  ZODIAC_FLOOR: 0x737d86,
  ZODIAC_MOTOR: 0x1a222b,
} as const;

const {
  BLACK,
  WHITE,
  ROCK,
  ROCK_DARK,
  ROCK_LIGHT,
  ICE,
  ORANGE,
  SEA_GREY,
  WHALE_GREY,
  LAMP,
  ZINC,
} = VOXEL_PALETTE;

export interface SeaIcePlate {
  x: number;
  z: number;
  /** Half size along local x and z, in world units. */
  sizeX: number;
  sizeZ: number;
  rotY: number;
  /** seaIce value from which the plate appears (it melts into the solid sheet later). */
  threshold: number;
  /** Floe shape variant index (0..3). */
  variant: number;
}

export interface IcebergInstance {
  x: number;
  z: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  rotY: number;
  phase: number;
  variant: 'tabular' | 'pinnacle';
}

export function offsetBoxes(
  boxes: readonly Box[],
  dx: number,
  dy: number,
  dz: number,
  scale = 1
): Box[] {
  return boxes.map(([cx, cy, cz, sx, sy, sz, col]) => [
    dx + cx * scale,
    dy + cy * scale,
    dz + cz * scale,
    sx * scale,
    sy * scale,
    sz * scale,
    col,
  ]);
}

/** Where a bird wing joins the body: turns around this pivot. */
export const BIRD_WING_ROOT = [0.02, 0.05, 0.06] as const;

// ============================================================================
// 2. STATION BUILDINGS & INSTRUMENTS VOXEL MODELS (16 to 54 boxes per model)
// ============================================================================

export function resolveBuildingColour(colour?: SiteColour): number {
  switch (colour) {
    case 'orange':
      return OSM_ORANGE;
    case 'black':
      return VOXEL_PALETTE.BLACK;
    case 'stone':
      return VOXEL_PALETTE.ROCK;
    case 'unknown':
    default:
      return UNKNOWN_BUILDING_COLOUR;
  }
}

/** Width of each of the 5 vertical segments of the flag, in model units. */
export const FLAG_SEGMENT_WIDTH = 0.38;


/** Top of the helipad curb: where a landed helicopter rests. */
export const HELIPAD_TOP_Y = 0.07 + 0.018;

/**
 * 9c. Sea King helicopter (+x nose, +y up, base on y = 0, length 1).
 * Illustrative livery using VOXEL_PALETTE (type, livery and scale are illustrative).
 */
export const HELICOPTER_BOXES: readonly Box[] = [
  // Boat-shaped watertight lower hull and main cabin
  [0.08, 0.06, 0, 0.34, 0.032, 0.12, WHALE_GREY],
  [0.09, 0.092, 0, 0.38, 0.036, 0.16, WHALE_GREY],
  [0.08, 0.145, 0, 0.4, 0.076, 0.15, SEA_GREY],
  [0.07, 0.185, 0, 0.36, 0.012, 0.13, WHITE],
  // Nose and cockpit with front and side windows
  [0.33, 0.085, 0, 0.11, 0.048, 0.13, ORANGE],
  [0.32, 0.125, 0, 0.11, 0.044, 0.135, SEA_GREY],
  [0.42, 0.098, 0, 0.08, 0.042, 0.095, ORANGE],
  [0.3, 0.156, 0, 0.06, 0.036, 0.125, BLACK],
  [0.29, 0.154, 0.072, 0.075, 0.034, 0.012, BLACK],
  [0.29, 0.154, -0.072, 0.075, 0.034, 0.012, BLACK],
  // Cabin side windows
  [0.18, 0.148, 0.078, 0.045, 0.032, 0.01, BLACK],
  [0.18, 0.148, -0.078, 0.045, 0.032, 0.01, BLACK],
  [0.09, 0.148, 0.078, 0.045, 0.032, 0.01, BLACK],
  [0.09, 0.148, -0.078, 0.045, 0.032, 0.01, BLACK],
  [-0.01, 0.148, 0.078, 0.04, 0.032, 0.01, BLACK],
  [-0.01, 0.148, -0.078, 0.04, 0.032, 0.01, BLACK],
  // Twin-turbine engine cowling on top, intakes and exhausts
  [0.09, 0.212, 0, 0.26, 0.046, 0.1, SEA_GREY],
  [0.08, 0.24, 0, 0.18, 0.022, 0.082, ORANGE],
  [0.23, 0.212, 0.028, 0.035, 0.034, 0.034, BLACK],
  [0.23, 0.212, -0.028, 0.035, 0.034, 0.034, BLACK],
  [-0.055, 0.214, 0.03, 0.045, 0.026, 0.026, ZINC],
  [-0.055, 0.214, -0.03, 0.045, 0.026, 0.026, ZINC],
  // Main rotor mast (hub and crossed blades live in HELICOPTER_ROTOR_BOXES)
  [0.08, 0.268, 0, 0.032, 0.045, 0.032, ZINC],
  // Tail boom, vertical pylon, horizontal stabilizer and tail rotor
  [-0.17, 0.145, 0, 0.17, 0.072, 0.085, SEA_GREY],
  [-0.31, 0.158, 0, 0.15, 0.052, 0.062, ORANGE],
  [-0.39, 0.195, 0, 0.075, 0.072, 0.04, ORANGE],
  [-0.415, 0.245, 0, 0.06, 0.056, 0.034, SEA_GREY],
  [-0.405, 0.235, 0.06, 0.055, 0.014, 0.1, SEA_GREY],
  [-0.42, 0.252, -0.028, 0.026, 0.026, 0.028, ZINC],
  [-0.42, 0.252, -0.044, 0.016, 0.16, 0.008, BLACK],
  [-0.42, 0.252, -0.044, 0.16, 0.016, 0.008, BLACK],
  // Lateral sponsons with main wheels and rear tailwheel (resting on y = 0)
  [0.06, 0.085, 0.132, 0.18, 0.046, 0.068, SEA_GREY],
  [0.06, 0.085, -0.132, 0.18, 0.046, 0.068, SEA_GREY],
  [0.145, 0.085, 0.132, 0.038, 0.042, 0.062, ORANGE],
  [0.145, 0.085, -0.132, 0.038, 0.042, 0.062, ORANGE],
  [0.06, 0.112, 0.092, 0.045, 0.022, 0.042, ZINC],
  [0.06, 0.112, -0.092, 0.045, 0.022, 0.042, ZINC],
  [0.085, 0.0225, 0.132, 0.052, 0.045, 0.028, BLACK],
  [0.085, 0.0225, -0.132, 0.052, 0.045, 0.028, BLACK],
  [0.085, 0.052, 0.132, 0.022, 0.026, 0.02, ZINC],
  [0.085, 0.052, -0.132, 0.022, 0.026, 0.02, ZINC],
  [-0.2, 0.018, 0, 0.038, 0.036, 0.022, BLACK],
  [-0.2, 0.072, 0, 0.018, 0.08, 0.018, ZINC],
];

/** Mast-axis origin of the Sea King main rotor in HELICOPTER_BOXES space. */
export const HELICOPTER_ROTOR_ORIGIN: readonly [number, number, number] = [0.08, 0.298, 0];

/** Sea King main rotor (hub and crossed blades), centered on the mast axis. */
export const HELICOPTER_ROTOR_BOXES: readonly Box[] = [
  [0, 0, 0, 0.062, 0.026, 0.062, BLACK],
  [0, 0.004, 0, 0.84, 0.01, 0.03, BLACK],
  [0, 0.004, 0, 0.03, 0.01, 0.84, BLACK],
  [0.395, 0.005, 0, 0.05, 0.012, 0.032, LAMP],
  [-0.395, 0.005, 0, 0.05, 0.012, 0.032, LAMP],
  [0, 0.005, 0.395, 0.032, 0.012, 0.05, LAMP],
  [0, 0.005, -0.395, 0.032, 0.012, 0.05, LAMP],
];

/**
 * 10. Sea-Ice Floe slabs (kept exported while voyage/sightingModels.ts references them).
 */





// ============================================================================
// 3. TERRAIN & INSTANCE GENERATORS
// ============================================================================

function hash2D(ix: number, iz: number, seed: number): number {
  let n = ix * 374761393 + iz * 668265263 + seed * 1442695041;
  n = (n ^ (n >> 13)) * 1274126177;
  return ((n ^ (n >> 16)) >>> 0) / 4294967296;
}

function smoothNoise2D(x: number, z: number, seed: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);

  const a = hash2D(ix, iz, seed);
  const b = hash2D(ix + 1, iz, seed);
  const c = hash2D(ix, iz + 1, seed);
  const d = hash2D(ix + 1, iz + 1, seed);

  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}

function fbm2D(x: number, z: number, seed: number): number {
  let val = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < 4; i++) {
    val += amp * smoothNoise2D(x * freq, z * freq, seed + i * 31);
    freq *= 2.05;
    amp *= 0.5;
  }
  return val;
}

const lerpNumber = (a: number, b: number, t: number) => a + (b - a) * t;

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** Half side of the terrain square, in world units. */
export const TERRAIN_HALF_EXTENT = STAGE_HALF_EXTENT;

/**
 * Rocky knoll of the penguin colony (reconstruction: no source places the colony). It sits on
 * the left end of the stage, above Bahía Scotia, so the penguins can toboggan down to the water.
 */
export const PENGUIN_KNOLL = {
  center: [-7.4, 1.0] as const,
  /** Radius of the flat top where the nests are, in world units. */
  topRadius: 1.4,
  /** Radius where the knoll meets the ground. */
  footRadius: 3.2,
  /** Height of the top above the surrounding ground. */
  height: 1.1,
} as const;

/** 0 to 1: how much a point belongs to the station pad (flat ground around each footprint). */
function padWeight(x: number, z: number): number {
  let w = 0;
  for (const e of STATION_LAYOUT) {
    if (e.id === 'boat') continue;
    const r = Math.hypot(e.footprint[0], e.footprint[1]) / 2;
    const d = Math.hypot(x - e.position[0], z - e.position[2]) - r;
    w = Math.max(w, 1 - smoothstep(0.4, 1.8, d));
  }
  return w;
}

/** 0 to 1 height profile of the colony knoll: flat top, smooth flanks. */
export function knollProfile(x: number, z: number): number {
  const { center, topRadius, footRadius } = PENGUIN_KNOLL;
  const r = Math.hypot(x - center[0], z - center[1]);
  return 1 - smoothstep(topRadius, footRadius, r);
}

/**
 * Terrain elevation (y in world units, sea level = 0) and surface weights [gravel, snow, rock]
 * at world coordinates (x, z). Coast from OpenStreetMap; the relief of the hills and the colony
 * knoll is a reconstruction (no elevation model was checked).
 */
export function evaluateIsthmusTerrain(
  x: number,
  z: number,
  seed = 19040222
): { y: number; gravel: number; snow: number; rock: number } {
  // The diorama ends like a model on a table: the land sinks into the sea near the border.
  const border = smoothstep(TERRAIN_HALF_EXTENT - 1, TERRAIN_HALF_EXTENT - 7, Math.max(Math.abs(x), Math.abs(z)));
  const d = Math.min(worldCoastDistance(x, z), lerpNumber(-2, 40, border));
  const nLow = fbm2D(x * 0.35, z * 0.35, seed);

  if (d < 0) {
    return { y: Math.max(-3, d * 0.9), gravel: 0.8, snow: 0.1, rock: 0.1 };
  }

  // A gravel beach about 15 m wide rises to the station pad.
  const beach = smoothstep(0, 1.3, d);
  const pad = padWeight(x, z);
  let y = beach * STATION_GROUND_Y;

  // Hills close the stage at both ends of the isthmus; they slope down to the bays.
  const ends = smoothstep(10, 24, Math.abs(x));
  const hill = ends * smoothstep(0, 5, d) * (4 + 6 * nLow);
  const knoll = knollProfile(x, z) * PENGUIN_KNOLL.height;
  const bumps = (nLow - 0.5) * 0.5 * smoothstep(0.5, 2.5, d);
  y += (hill + bumps) * (1 - pad) + knoll;

  // Surface: grey gravel on the pad and the beaches, rock on steep ground, snow up high and on
  // the knoll's seaward flank, where the penguins toboggan.
  const rise = y - STATION_GROUND_Y;
  const slide = slideSnow(x, z);
  // Snow covers the hills above an irregular line; bare rock shows only on the lower slopes.
  const snowLine = smoothstep(0.25, 1.2, rise + (nLow - 0.5) * 1.4) * smoothstep(9.5, 13, Math.abs(x));
  const rock =
    Math.min(1, smoothstep(0.6, 2.4, rise) * 0.7 + knollProfile(x, z) * 0.55) * (1 - slide) * (1 - snowLine);
  const snowPatch = smoothstep(0.5, 0.62, nLow + rise * 0.05) * (1 - pad);
  const snow = Math.min(1, Math.max(snowPatch, snowLine, slide));
  const gravel = Math.max(0.05, 1 - Math.min(0.95, rock + snow * 0.9));
  return { y, gravel, snow, rock };
}

/** Snow strip on the knoll's flank facing Bahía Uruguay, where the penguins slide. */
function slideSnow(x: number, z: number): number {
  const [cx, cz] = PENGUIN_KNOLL.center;
  const [dx, dz] = SLIDE_DIRECTION;
  const along = (x - cx) * dx + (z - cz) * dz;
  const across = Math.abs((x - cx) * dz - (z - cz) * dx);
  return 0.55 * (1 - smoothstep(0.32, 0.5, across)) * smoothstep(0.8, 1.4, along) * (1 - smoothstep(4.2, 5, along));
}

/** Unit vector from the knoll to the nearest water (down the coast-distance gradient). */
export const SLIDE_DIRECTION: readonly [number, number] = (() => {
  const [cx, cz] = PENGUIN_KNOLL.center;
  const h = 0.05;
  const gx = (worldCoastDistance(cx + h, cz) - worldCoastDistance(cx - h, cz)) / (2 * h);
  const gz = (worldCoastDistance(cx, cz + h) - worldCoastDistance(cx, cz - h)) / (2 * h);
  const g = Math.hypot(gx, gz);
  return [-gx / g, -gz / g];
})();

/** Terrain plane covering the stage; 180 segments is about 0.55 units per segment. */
export function createIsthmusTerrainGeometry(seed = 19040222): BufferGeometry {
  const side = 2 * TERRAIN_HALF_EXTENT;
  const segments = 180;
  const geo = new PlaneGeometry(side, side, segments, segments);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position;
  const count = pos.count;
  const surface = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const { y, gravel, snow, rock } = evaluateIsthmusTerrain(pos.getX(i), pos.getZ(i), seed);
    pos.setY(i, y);
    surface[i * 3] = gravel;
    surface[i * 3 + 1] = snow;
    surface[i * 3 + 2] = rock;
  }

  pos.needsUpdate = true;
  geo.setAttribute('aSurface', new BufferAttribute(surface, 3));
  geo.computeVertexNormals();
  return geo;
}

/** Sea-ice plates in both bays; each appears when seaIce passes its threshold (near shore first). */
/**
 * How far from the shore the sea ice reaches for a given cover (illustrative simulation): the
 * ice grows from the coast outwards. Returns the seaIce value at which a point `offshore` units
 * from the coast starts to freeze. The water shader uses the same rule through `aCoast`.
 */
export function iceThreshold(offshore: number, jitter = 0): number {
  return Math.min(0.97, Math.max(0.03, (offshore / ICE_REACH) * 0.9 + jitter * 0.12));
}

/** Offshore distance, in world units, that freezes last. */
export const ICE_REACH = 14;
/** Floes float in a band this wide (in seaIce units) ahead of the solid fast-ice sheet. */
export const ICE_FLOE_BAND = 0.5;

/** Conservative horizontal bounding radius (world units) of a sea-ice floe plate at peak cover. */
export function seaIcePlateRadius(p: Pick<SeaIcePlate, 'sizeX' | 'sizeZ'>): number {
  return (1.25 * Math.max(p.sizeX, p.sizeZ)) / 0.9;
}

/** Conservative horizontal bounding radius (world units) of an iceberg instance. */
export function icebergRadius(b: Pick<IcebergInstance, 'scaleX' | 'scaleZ'>): number {
  return 0.8 * Math.max(b.scaleX, b.scaleZ);
}

function insideCorridor(
  x: number,
  z: number,
  radius: number,
  avoid: readonly (readonly [number, number])[]
): boolean {
  const r2 = radius * radius;
  for (let i = 0; i < avoid.length; i++) {
    const dx = x - avoid[i][0];
    const dz = z - avoid[i][1];
    if (dx * dx + dz * dz < r2) return true;
  }
  return false;
}

/** Floes of varied size and shape; only the visible part of both bays gets them. */
export function generateSeaIcePlates(
  seed = 190406,
  avoid: readonly (readonly [number, number])[] = [],
  clearance = 0
): SeaIcePlate[] {
  const rng = createSeededRng(seed);
  const plates: SeaIcePlate[] = [];
  const step = 1.5;
  for (let gx = -27; gx <= 27; gx += step) {
    for (let gz = -22; gz <= 26; gz += step) {
      const x = gx + (rng() - 0.5) * step * 0.9;
      const z = gz + (rng() - 0.5) * step * 0.9;
      const d = worldCoastDistance(x, z);
      const size = 0.22 + rng() ** 2 * 0.62;
      const aspect = 0.6 + rng() * 0.8;
      const rotY = rng() * Math.PI * 2;
      const jitter = rng() - 0.5;
      // Keep floes off the beach: their whole extent must be at sea.
      if (d >= -0.35 - size) continue;
      const plate: SeaIcePlate = {
        x,
        z,
        sizeX: size * aspect,
        sizeZ: size / aspect,
        rotY,
        threshold: iceThreshold(-d, jitter),
        variant: Math.floor(rng() * 4),
      };
      if (avoid.length > 0 && insideCorridor(x, z, seaIcePlateRadius(plate) + clearance, avoid)) {
        continue;
      }
      plates.push(plate);
    }
  }
  return plates;
}

/** 0..1 visibility of a floe for a sea-ice cover: it appears, drifts in the pack, then joins the sheet. */
export function floeVisibility(threshold: number, seaIce: number): number {
  const appear = Math.min(1, Math.max(0, (seaIce - threshold) / 0.08));
  const merge = Math.min(1, Math.max(0, (threshold + ICE_FLOE_BAND - seaIce) / 0.08));
  return Math.min(appear, merge);
}

/** A few icebergs grounded or drifting in both bays, at least 2.5 units off the coast. */
export function generateIcebergs(
  seed = 190409,
  avoid: readonly (readonly [number, number])[] = [],
  clearance = 0
): IcebergInstance[] {
  const rng = createSeededRng(seed);
  const coords: readonly [number, number, number, 'tabular' | 'pinnacle'][] = [
    // Bahía Uruguay, behind the stage
    [-7, -10, 1.1, 'tabular'],
    [3, -13, 0.9, 'pinnacle'],
    [11, -9, 1.2, 'tabular'],
    // Bahía Scotia, in front
    [-12, 10, 1.0, 'pinnacle'],
    [10, 9, 1.1, 'tabular'],
  ];
  return coords
    .filter(([x, z]) => worldCoastDistance(x, z) < -2.5)
    .map(([x, z, s, variant]) => ({
      x,
      z,
      scaleX: s * (0.92 + rng() * 0.28),
      scaleY: s * (0.88 + rng() * 0.34),
      scaleZ: s * (0.9 + rng() * 0.28),
      rotY: rng() * Math.PI * 2,
      phase: rng() * Math.PI * 2,
      variant,
    }))
    .filter((b) => avoid.length === 0 || !insideCorridor(b.x, b.z, icebergRadius(b) + clearance, avoid));
}

/** Light grey gravel of the paths between the buildings (photos: grey gravel ground). */
const PATH_GRAVEL = 0xa8a49b;
const PATH_GRAVEL_LIGHT = 0xbdb9af;
export const PATH_GRAVEL_DARK = 0x8c887f;

const PATH_EDGE_Y = 0.008;
export const PATH_CROWN_Y = 0.014;

export type StationPathSpurId = 'screen' | 'omond' | 'module-360745961' | 'module-360745962';

export interface StationPathSpur {
  readonly id: StationPathSpurId;
  readonly mainSegmentIndex: number;
  /** Centerline waypoints from the main strip attachment point to the doorway, in world [x, z]. */
  readonly centerline: readonly Point2[];
}

export interface StationPathData {
  /** All triangles of the path surface (main strip + connected door spurs). */
  readonly tris: Tri[];
  /** Main continuous strip, grouped per segment along the spline. */
  readonly mainSegments: readonly (readonly Tri[])[];
  /** Door spurs, each grouped per segment from the main-strip edge to the door. */
  readonly spurSegments: readonly (readonly (readonly Tri[])[])[];
  /** Centerline waypoints of the main gravel path in world [x, z]. */
  readonly mainCenterline: readonly Point2[];
  /** Centerline waypoints of each doorway spur from the main path to the doorway. */
  readonly spurCenterlines: readonly StationPathSpur[];
}

type Point2 = readonly [number, number];
type StripRow = readonly [Vec3, Vec3, Vec3];

function localToWorldXZ(e: StationLayoutEntry, lx: number, lz: number): Point2 {
  const c = Math.cos(e.rotationY);
  const s = Math.sin(e.rotationY);
  return [e.position[0] + lx * c + lz * s, e.position[2] - lx * s + lz * c];
}

function catmullRom1D(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

/** Sample a Catmull-Rom spline through `controls` at roughly uniform `step` arc-length intervals. */
function sampleCatmullRomPath(controls: readonly Point2[], step: number): Point2[] {
  const n = controls.length;
  const padded: Point2[] = [
    [2 * controls[0][0] - controls[1][0], 2 * controls[0][1] - controls[1][1]],
    ...controls,
    [2 * controls[n - 1][0] - controls[n - 2][0], 2 * controls[n - 1][1] - controls[n - 2][1]],
  ];
  const dense: Point2[] = [];
  const subSteps = 24;
  for (let i = 1; i < padded.length - 2; i++) {
    const [p0, p1, p2, p3] = [padded[i - 1], padded[i], padded[i + 1], padded[i + 2]];
    const count = i === padded.length - 3 ? subSteps + 1 : subSteps;
    for (let s = 0; s < count; s++) {
      const t = s / subSteps;
      dense.push([
        catmullRom1D(p0[0], p1[0], p2[0], p3[0], t),
        catmullRom1D(p0[1], p1[1], p2[1], p3[1], t),
      ]);
    }
  }
  const arc: number[] = [0];
  for (let i = 1; i < dense.length; i++) {
    arc.push(arc[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
  }
  const total = arc[arc.length - 1];
  const segments = Math.max(2, Math.round(total / step));
  const out: Point2[] = [dense[0]];
  let cursor = 1;
  for (let k = 1; k < segments; k++) {
    const target = (k / segments) * total;
    while (cursor < arc.length - 1 && arc[cursor] < target) cursor++;
    const a0 = arc[cursor - 1];
    const a1 = arc[cursor];
    const u = a1 > a0 ? (target - a0) / (a1 - a0) : 0;
    out.push([
      dense[cursor - 1][0] + (dense[cursor][0] - dense[cursor - 1][0]) * u,
      dense[cursor - 1][1] + (dense[cursor][1] - dense[cursor - 1][1]) * u,
    ]);
  }
  out.push(dense[dense.length - 1]);
  return out;
}

/** Emit one segment between two 3-vertex cross-sections `[north/left, center, south/right]`. */
function emitStripSegment(
  r0: StripRow,
  r1: StripRow,
  col: number,
  flipDiag: boolean,
  splitNorth?: Vec3
): Tri[] {
  const seg: Tri[] = [];
  if (splitNorth) {
    seg.push(
      [r0[0], r0[1], splitNorth, col],
      [splitNorth, r0[1], r1[1], col],
      [splitNorth, r1[1], r1[0], col]
    );
  } else if (flipDiag) {
    seg.push([r0[0], r0[1], r1[0], col], [r0[1], r1[1], r1[0], col]);
  } else {
    seg.push([r0[0], r0[1], r1[1], col], [r0[0], r1[1], r1[0], col]);
  }
  if (flipDiag) {
    seg.push([r0[1], r0[2], r1[1], col], [r0[2], r1[2], r1[1], col]);
  } else {
    seg.push([r0[1], r0[2], r1[2], col], [r0[1], r1[2], r1[1], col]);
  }
  return seg;
}

interface InternalPathGeometry extends StationPathData {
  readonly edgeSamples: readonly { pos: Point2; outNormal: Point2 }[];
  readonly centerlineSamples: readonly Point2[];
}

function createStationPathGeometry(seed = 190415): InternalPathGeometry {
  const rng = createSeededRng(seed);
  const groundAt = (x: number, z: number) => evaluateIsthmusTerrain(x, z).y;
  const seatVertex = (x: number, z: number, dy: number): Vec3 => [x, groundAt(x, z) + dy, z];

  const screen = layoutOf('screen');
  const omond = layoutOf('omond');
  const flag = layoutOf('flag');
  const mod1 = layoutOf('module-360745961');
  const mod2 = layoutOf('module-360745962');
  const helipad = layoutOf('helipad');

  const screenDoor = localToWorldXZ(screen, 0, 0.8);
  const omondDoor = localToWorldXZ(omond, 0.01, omond.footprint[1] / 2 + 0.16);
  const mod1Door = localToWorldXZ(mod1, mod1.footprint[0] / 2 + 0.3, 0);
  const mod2Door = localToWorldXZ(mod2, mod2.footprint[0] / 2 + 0.34, 0);

  // Smooth spline passing in front of every station doorway/alley and meeting the helipad edge.
  const mainControls: Point2[] = [
    [-5.35, 1.42],
    [screenDoor[0], screenDoor[1] + 0.44],
    [omondDoor[0], omondDoor[1] + 1.0],
    [flag.position[0], flag.position[2] + 0.88],
    [mod1.position[0] + 0.1, mod1.position[2] + mod1.footprint[1] / 2 + 0.78],
    [mod1Door[0] + 0.03, 1.24],
    [mod2.position[0], mod2.position[2] + mod2.footprint[1] / 2 + 0.68],
    [helipad.position[0] - helipad.footprint[0] / 2 - 0.02, 1.3],
  ];

  const centerPts = sampleCatmullRomPath(mainControls, 0.32);
  const edgeSamples: { pos: Point2; outNormal: Point2 }[] = [];
  const mainRows: StripRow[] = centerPts.map(([x, z], idx) => {
    const prev = centerPts[Math.max(0, idx - 1)];
    const next = centerPts[Math.min(centerPts.length - 1, idx + 1)];
    const dx = next[0] - prev[0];
    const dz = next[1] - prev[1];
    const len = Math.hypot(dx, dz) || 1;
    // Left normal (-dz/len, dx/len) points toward +z (south/seaward); -normal points toward -z (buildings).
    const nx = -dz / len;
    const nz = dx / len;
    const endTaper = idx === 0 ? 0.84 : 1;
    const wNorth = (0.23 + 0.03 * Math.sin(idx * 0.85 + 0.4) + (rng() - 0.5) * 0.025) * endTaper;
    const wSouth = (0.24 + 0.03 * Math.cos(idx * 0.72 + 1.1) + (rng() - 0.5) * 0.025) * endTaper;
    const nX = x - nx * wNorth;
    const nZ = z - nz * wNorth;
    const sX = x + nx * wSouth;
    const sZ = z + nz * wSouth;
    edgeSamples.push({ pos: [nX, nZ], outNormal: [-nx, -nz] }, { pos: [sX, sZ], outNormal: [nx, nz] });
    return [seatVertex(nX, nZ, PATH_EDGE_Y), seatVertex(x, z, PATH_CROWN_Y), seatVertex(sX, sZ, PATH_EDGE_Y)];
  });

  // Match each door spur to a unique segment on the main strip (without overlapping).
  const doorConfigs: readonly { id: StationPathSpurId; target: Point2; halfW: number; minStep: number }[] = [
    { id: 'screen', target: screenDoor, halfW: 0.16, minStep: 0.18 },
    { id: 'omond', target: omondDoor, halfW: 0.16, minStep: 0.26 },
    { id: 'module-360745961', target: mod1Door, halfW: 0.14, minStep: 0.28 },
    { id: 'module-360745962', target: mod2Door, halfW: 0.14, minStep: 0.28 },
  ];

  const spurByMainSeg = new Map<
    number,
    { id: StationPathSpurId; target: Point2; halfW: number; minStep: number; mid: Vec3 }
  >();
  for (const cfg of doorConfigs) {
    let bestIdx = -1;
    let bestDist = Infinity;
    for (let i = 0; i < mainRows.length - 1; i++) {
      if (spurByMainSeg.has(i)) continue;
      const mx = (mainRows[i][0][0] + mainRows[i + 1][0][0]) / 2;
      const mz = (mainRows[i][0][2] + mainRows[i + 1][0][2]) / 2;
      const d = Math.hypot(cfg.target[0] - mx, cfg.target[1] - mz);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    if (bestIdx >= 0) {
      const mx = (mainRows[bestIdx][0][0] + mainRows[bestIdx + 1][0][0]) / 2;
      const mz = (mainRows[bestIdx][0][2] + mainRows[bestIdx + 1][0][2]) / 2;
      spurByMainSeg.set(bestIdx, { ...cfg, mid: seatVertex(mx, mz, PATH_EDGE_Y) });
    }
  }

  // Gravel palette varied per segment ("tramo"), never per individual triangle.
  const gravelTones = [PATH_GRAVEL, PATH_GRAVEL_LIGHT, PATH_GRAVEL, PATH_GRAVEL_DARK] as const;
  let toneCursor = 0;
  const nextSegmentTone = () => {
    const col = gravelTones[toneCursor % gravelTones.length];
    toneCursor += rng() < 0.65 ? 1 : 2;
    return col;
  };

  const mainSegments: Tri[][] = [];
  const tris: Tri[] = [];
  for (let i = 0; i < mainRows.length - 1; i++) {
    const col = nextSegmentTone();
    const spur = spurByMainSeg.get(i);
    const seg = emitStripSegment(mainRows[i], mainRows[i + 1], col, i % 2 === 1, spur?.mid);
    mainSegments.push(seg);
    tris.push(...seg);
  }

  // Build each spur directly from its attached main-strip north edge [north[j], mid, north[j+1]].
  const spurSegments: Tri[][][] = [];
  const spurCenterlines: StationPathSpur[] = [];
  const centerlineSamples: Point2[] = [...centerPts];
  for (const [segIdx, spur] of spurByMainSeg.entries()) {
    const leftBase = mainRows[segIdx][0];
    const rightBase = mainRows[segIdx + 1][0];
    const p0: Point2 = [spur.mid[0], spur.mid[2]];
    const ex = rightBase[0] - leftBase[0];
    const ez = rightBase[2] - leftBase[2];
    const eLen = Math.hypot(ex, ez) || 1;
    // Outward normal from the north edge points toward -z (buildings).
    const outX = ez / eLen;
    const outZ = -ex / eLen;
    const dist = Math.hypot(spur.target[0] - p0[0], spur.target[1] - p0[1]);
    const ctrl: Point2 = [p0[0] + outX * dist * 0.45, p0[1] + outZ * dist * 0.45];
    const steps = Math.max(1, Math.round(dist / spur.minStep));

    const rows: StripRow[] = [[leftBase, spur.mid, rightBase]];
    const spurCenterline: Point2[] = [p0];
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      const omt = 1 - t;
      const cx = omt * omt * p0[0] + 2 * omt * t * ctrl[0] + t * t * spur.target[0];
      const cz = omt * omt * p0[1] + 2 * omt * t * ctrl[1] + t * t * spur.target[1];
      centerlineSamples.push([cx, cz]);
      spurCenterline.push([cx, cz]);
      // Tangent of quadratic Bezier
      const tx = 2 * omt * (ctrl[0] - p0[0]) + 2 * t * (spur.target[0] - ctrl[0]);
      const tz = 2 * omt * (ctrl[1] - p0[1]) + 2 * t * (spur.target[1] - ctrl[1]);
      const tLen = Math.hypot(tx, tz) || 1;
      // Left normal (-tz/tLen, tx/tLen) points east (+x) when heading north (-z).
      const rx = -tz / tLen;
      const rz = tx / tLen;
      const wL = spur.halfW * (0.94 + rng() * 0.12);
      const wR = spur.halfW * (0.94 + rng() * 0.12);
      const lx = cx - rx * wL;
      const lz = cz - rz * wL;
      const rgtX = cx + rx * wR;
      const rgtZ = cz + rz * wR;
      if (s < steps) {
        edgeSamples.push({ pos: [lx, lz], outNormal: [-rx, -rz] }, { pos: [rgtX, rgtZ], outNormal: [rx, rz] });
      }
      rows.push([
        seatVertex(lx, lz, PATH_EDGE_Y),
        seatVertex(cx, cz, PATH_CROWN_Y),
        seatVertex(rgtX, rgtZ, PATH_EDGE_Y),
      ]);
    }

    const thisSpur: Tri[][] = [];
    for (let s = 0; s < rows.length - 1; s++) {
      const col = nextSegmentTone();
      const seg = emitStripSegment(rows[s], rows[s + 1], col, (segIdx + s) % 2 === 1);
      thisSpur.push(seg);
      tris.push(...seg);
    }
    spurSegments.push(thisSpur);
    spurCenterlines.push({ id: spur.id, mainSegmentIndex: segIdx, centerline: spurCenterline });
  }

  return {
    tris,
    mainSegments,
    spurSegments,
    mainCenterline: centerPts,
    spurCenterlines,
    edgeSamples,
    centerlineSamples,
  };
}

/** Continuous ground-hugging gravel path and connected doorway spurs of the station stage. */
export function buildStationPath(seed = 190415): StationPathData {
  const { tris, mainSegments, spurSegments, mainCenterline, spurCenterlines } =
    createStationPathGeometry(seed);
  return { tris, mainSegments, spurSegments, mainCenterline, spurCenterlines };
}

/** True when (x, z) is inside a building footprint grown by `margin` (world units). */
function nearBuilding(x: number, z: number, margin: number): boolean {
  return STATION_LAYOUT.some((e) => {
    const s = e.id === 'screen' || e.id === 'windMast' || e.id === 'flag' ? DIORAMA_PROP_SCALE : 1;
    const dx = x - e.position[0];
    const dz = z - e.position[2];
    const c = Math.cos(e.rotationY);
    const sn = Math.sin(e.rotationY);
    const u = dx * c - dz * sn;
    const v = dx * sn + dz * c;
    return Math.abs(u) < (e.footprint[0] * s) / 2 + margin && Math.abs(v) < (e.footprint[1] * s) / 2 + margin;
  });
}

/**
 * Ground details of the stage (illustrative): continuous ground-hugging gravel tracks with spurs
 * to the doors, varied faceted rocks and low-poly patches of old snow. World coordinates, one geometry.
 */
export function buildStageDetailTris(seed = 190415): Tri[] {
  const rng = createSeededRng(seed);
  const path = createStationPathGeometry(seed);
  const tris: Tri[] = [...path.tris];
  const groundAt = (x: number, z: number) => evaluateIsthmusTerrain(x, z).y;
  const [kx, kz] = PENGUIN_KNOLL.center;
  const onKnoll = (x: number, z: number) => Math.hypot(x - kx, z - kz) < PENGUIN_KNOLL.footRadius + 0.3;
  // A chunk is widest at its centre height: set it on the lowest ground under its outline, so on a
  // slope its downhill side does not hang in the air (its uphill side goes into the ground).
  const seatY = (x: number, z: number, sx: number, sy: number, sz: number) =>
    Math.min(groundAt(x, z), groundAt(x - sx / 2, z), groundAt(x + sx / 2, z), groundAt(x, z - sz / 2), groundAt(x, z + sz / 2)) + sy * 0.05;

  const nearPathCenter = (x: number, z: number, radius: number) => {
    const r2 = radius * radius;
    return path.centerlineSamples.some(([px, pz]) => (x - px) ** 2 + (z - pz) ** 2 < r2);
  };

  // Loose gravel pebbles and small cobbles tucked along the irregular edges of the path.
  for (let i = 0; i < path.edgeSamples.length; i++) {
    if (rng() > 0.55) continue;
    const { pos, outNormal } = path.edgeSamples[i];
    const outDist = 0.04 + rng() * 0.06;
    const ex = pos[0] + outNormal[0] * outDist + (rng() - 0.5) * 0.04;
    const ez = pos[1] + outNormal[1] * outDist + (rng() - 0.5) * 0.04;
    if (nearBuilding(ex, ez, 0.06) || nearPathCenter(ex, ez, 0.24)) continue;
    const sz = 0.045 + rng() * 0.045;
    const col = rng() < 0.5 ? PATH_GRAVEL_DARK : ROCK_DARK;
    tris.push(
      ...chunk(ex, seatY(ex, ez, sz * 1.15, sz * 0.52, sz * 0.9), ez, sz * 1.15, sz * 0.52, sz * 0.9, Math.floor(rng() * 1e6), col)
    );
  }

  // Faceted rocks of varied sizes and low-poly snow mounds across the isthmus.
  const rockPalette = [ROCK, ROCK_DARK, ROCK_LIGHT, SEA_GREY];
  for (let i = 0; i < 130; i++) {
    const x = -13 + rng() * 26;
    const z = -3.6 + rng() * 7.4;
    const d = worldCoastDistance(x, z);
    if (d < 0.3 || onKnoll(x, z) || nearBuilding(x, z, 0.5) || nearPathCenter(x, z, 0.45)) continue;

    if (rng() < 0.72) {
      const sz = 0.08 + rng() ** 1.8 * 0.28;
      const sx = sz * (0.95 + rng() * 0.65);
      const sy = sz * (0.58 + rng() * 0.35);
      const sza = sz * (0.85 + rng() * 0.5);
      const col = rockPalette[Math.floor(rng() * rockPalette.length)];
      tris.push(...chunk(x, seatY(x, z, sx, sy, sza), z, sx, sy, sza, Math.floor(rng() * 1e6), col));
      if (sz > 0.2) {
        const ox = x + (rng() - 0.5) * sz * 1.4;
        const oz = z + (rng() - 0.5) * sz * 1.4;
        const subSz = sz * (0.45 + rng() * 0.25);
        tris.push(
          ...chunk(ox, seatY(ox, oz, subSz * 1.2, subSz * 0.65, subSz), oz, subSz * 1.2, subSz * 0.65, subSz, Math.floor(rng() * 1e6), ROCK_DARK)
        );
      }
    } else if (
      d > 0.8 &&
      rng() < 0.5 &&
      // Snow drifts lie on gentle ground: on a steep bank a white fan reads as a stray block of ice.
      Math.hypot(groundAt(x + 0.2, z) - groundAt(x - 0.2, z), groundAt(x, z + 0.2) - groundAt(x, z - 0.2)) < 0.08
    ) {
      // Low faceted snow drift hugging terrain slope
      const rx = 0.18 + rng() * 0.24;
      const rz = rx * (0.55 + rng() * 0.35);
      const sides = 7;
      const phase = rng() * Math.PI * 2;
      const ring: Vec3[] = Array.from({ length: sides }, (_, k) => {
        const a = phase + (k / sides) * Math.PI * 2;
        const rad = 0.78 + rng() * 0.35;
        const vx = x + Math.cos(a) * rx * rad;
        const vz = z - Math.sin(a) * rz * rad;
        return [vx, groundAt(vx, vz) - 0.02, vz];
      });
      const cx = x + (rng() - 0.5) * rx * 0.25;
      const cz = z + (rng() - 0.5) * rz * 0.25;
      const peak: Vec3 = [cx, groundAt(cx, cz) + 0.032 + rng() * 0.03, cz];
      for (let k = 0; k < sides; k++) {
        const col = k % 2 === 0 ? WHITE : ICE;
        tris.push([peak, ring[k], ring[(k + 1) % sides], col]);
      }
    }
  }

  return tris;
}

export function generateSnowParticles(count: number, seed = 190412, span = 28, top = 18): Float32Array {
  const rng = createSeededRng(seed);
  const data = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    data[i * 3] = (rng() - 0.5) * span * 2;
    data[i * 3 + 1] = rng() * top + 0.4;
    data[i * 3 + 2] = (rng() - 0.5) * span * 2;
  }
  return data;
}

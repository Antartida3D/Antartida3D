import { BufferAttribute, BufferGeometry, PlaneGeometry } from 'three';
import {
  createSeededRng,
  STAGE_HALF_EXTENT,
  STATION_GROUND_Y,
  STATION_LAYOUT,
  worldCoastDistance,
  type SiteColour,
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
const PATH_GRAVEL_DARK = 0x8c887f;

/** True when (x, z) is inside a building footprint grown by `margin` (world units). */
function nearBuilding(x: number, z: number, margin: number): boolean {
  return STATION_LAYOUT.some((e) => {
    const dx = x - e.position[0];
    const dz = z - e.position[2];
    const c = Math.cos(e.rotationY);
    const sn = Math.sin(e.rotationY);
    const u = dx * c - dz * sn;
    const v = dx * sn + dz * c;
    return Math.abs(u) < e.footprint[0] / 2 + margin && Math.abs(v) < e.footprint[1] / 2 + margin;
  });
}

/**
 * Ground details of the stage (illustrative): continuous ground-hugging gravel tracks with spurs
 * to the doors, varied faceted rocks and low-poly patches of old snow. World coordinates, one geometry.
 */
export function buildStageDetailTris(seed = 190415): Tri[] {
  const rng = createSeededRng(seed);
  const tris: Tri[] = [];
  const groundAt = (x: number, z: number) => evaluateIsthmusTerrain(x, z).y;
  const [kx, kz] = PENGUIN_KNOLL.center;
  const onKnoll = (x: number, z: number) => Math.hypot(x - kx, z - kz) < PENGUIN_KNOLL.footRadius + 0.3;
  // A chunk is widest at its centre height: set it on the lowest ground under its outline, so on a
  // slope its downhill side does not hang in the air (its uphill side goes into the ground).
  const seatY = (x: number, z: number, sx: number, sy: number, sz: number) =>
    Math.min(groundAt(x, z), groundAt(x - sx / 2, z), groundAt(x + sx / 2, z), groundAt(x, z - sz / 2), groundAt(x, z + sz / 2)) + sy * 0.05;

  const gravelPalette = [PATH_GRAVEL, PATH_GRAVEL_LIGHT, PATH_GRAVEL_DARK];
  const pickGravel = () => gravelPalette[Math.floor(rng() * gravelPalette.length)];

  // Continuous faceted gravel ribbon hugging the terrain height at every cross-section vertex.
  const addGravelRibbon = (points: readonly (readonly [number, number])[], halfW: number) => {
    if (points.length < 2) return;
    const rows: Vec3[][] = points.map(([x, z], idx) => {
      const prev = points[Math.max(0, idx - 1)];
      const next = points[Math.min(points.length - 1, idx + 1)];
      const dx = next[0] - prev[0];
      const dz = next[1] - prev[1];
      const len = Math.hypot(dx, dz) || 1;
      const nx = -dz / len;
      const nz = dx / len;
      const wJit = halfW * (0.92 + rng() * 0.16);
      const offsets: readonly [number, number][] = [
        [-wJit - 0.08, -0.032],
        [-wJit, 0.015],
        [0, 0.022],
        [wJit, 0.015],
        [wJit + 0.08, -0.032],
      ];
      return offsets.map(([off, dy]): Vec3 => {
        const px = x + nx * off;
        const pz = z + nz * off;
        return [px, groundAt(px, pz) + dy, pz];
      });
    });

    for (let i = 0; i < rows.length - 1; i++) {
      for (let k = 0; k < 4; k++) {
        const a = rows[i][k];
        const b = rows[i][k + 1];
        const c = rows[i + 1][k + 1];
        const d = rows[i + 1][k];
        const col1 = k === 0 || k === 3 ? PATH_GRAVEL_DARK : pickGravel();
        const col2 = k === 0 || k === 3 ? PATH_GRAVEL : pickGravel();
        if ((i + k) % 2 === 0) {
          tris.push([a, b, c, col1], [a, c, d, col2]);
        } else {
          tris.push([a, b, d, col1], [b, c, d, col2]);
        }
      }
    }

    // Scattered cobbles along the track edges
    for (let i = 0; i < points.length; i += 2) {
      if (rng() > 0.65) continue;
      const [px, pz] = points[i];
      const side = rng() < 0.5 ? -1 : 1;
      const ex = px + (rng() - 0.5) * 0.16;
      const ez = pz + side * (halfW + 0.04 + rng() * 0.06);
      const sz = 0.055 + rng() * 0.055;
      tris.push(
        ...chunk(ex, seatY(ex, ez, sz * 1.15, sz * 0.55, sz * 0.9), ez, sz * 1.15, sz * 0.55, sz * 0.9, Math.floor(rng() * 1e6), rng() < 0.5 ? ROCK_DARK : PATH_GRAVEL_DARK)
      );
    }
  };

  // Main gravel track along the front of the station, split into contiguous runs around buildings.
  const pathZ = 2.35;
  const pathZAt = (x: number) => pathZ + Math.sin(x * 0.7) * 0.18;
  const PATH_STEP = 0.34;
  const PATH_HALF = 0.25;
  let run: [number, number][] = [];
  for (let x = -5.6; x <= 6.6; x += PATH_STEP) {
    const z = pathZAt(x);
    if (nearBuilding(x, z, 0.1)) {
      addGravelRibbon(run, PATH_HALF);
      run = [];
    } else {
      run.push([x, z + (rng() - 0.5) * 0.03]);
    }
  }
  addGravelRibbon(run, PATH_HALF);

  // Spurs from the main track to the doors of the buildings that face it.
  const spurs: [number, number, number][] = [];
  for (const id of ['screen', 'omond', 'module-360745961', 'module-360745962']) {
    const e = STATION_LAYOUT.find((l) => l.id === id);
    if (!e) continue;
    const x0 = e.position[0];
    const zFront = e.position[2] + e.footprint[1] / 2 + 0.08;
    const zEnd = pathZAt(x0);
    spurs.push([x0, zFront, zEnd]);
    const spurPts: [number, number][] = [];
    const steps = Math.max(2, Math.ceil((zEnd - zFront) / PATH_STEP));
    for (let s = 0; s <= steps; s++) {
      const z = zFront + (s / steps) * (zEnd - zFront);
      spurPts.push([x0 + (rng() - 0.5) * 0.025, z]);
    }
    addGravelRibbon(spurPts, 0.18);
  }

  // Faceted rocks of varied sizes and low-poly snow mounds across the isthmus.
  const rockPalette = [ROCK, ROCK_DARK, ROCK_LIGHT, SEA_GREY];
  for (let i = 0; i < 130; i++) {
    const x = -13 + rng() * 26;
    const z = -3.6 + rng() * 7.4;
    const d = worldCoastDistance(x, z);
    const onSpur = spurs.some(([sx, z0, z1]) => Math.abs(x - sx) < 0.4 && z > z0 - 0.2 && z < z1);
    if (d < 0.3 || onKnoll(x, z) || nearBuilding(x, z, 0.5) || onSpur || Math.abs(z - pathZAt(x)) < 0.45) continue;

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

export function generateSnowParticles(count: number, seed = 190412): Float32Array {
  const rng = createSeededRng(seed);
  const data = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    data[i * 3] = (rng() - 0.5) * 56;
    data[i * 3 + 1] = rng() * 18 + 0.4;
    data[i * 3 + 2] = (rng() - 0.5) * 56;
  }
  return data;
}

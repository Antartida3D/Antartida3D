import { BufferAttribute, BufferGeometry, Color, SRGBColorSpace } from 'three';
import { createSeededRng } from '@antartida/core';
import {
  block,
  chunk,
  lathe,
  loftAlongX,
  ngon,
  prism,
  quad,
  rect,
  strut,
  type LoftStation,
  type Tri,
  type Vec3,
} from '../voyage/lowPoly.ts';
import { VOXEL_PALETTE } from './stationModels.ts';

const {
  BLACK,
  WHITE,
  ICE,
  ICE_BLUE,
  ORANGE,
  RED,
  CREAM,
  WOOD,
  WOOD_LIGHT,
  BROWN_DARK,
  SEA_GREY,
  WHALE_GREY,
  LAMP,
  ZINC,
  ZODIAC_TUBE,
  ZODIAC_TUBE_DARK,
  ZODIAC_HULL,
  ZODIAC_FLOOR,
  ZODIAC_MOTOR,
} = VOXEL_PALETTE;

// Colours matching sightingModels.ts / icebergs.ts so diorama ice blends with open-map icebergs.
const ICE_SUBMERGED = 0x9fd6dc;
const ICE_WALL = 0xb4d5ea;
const ICE_SHADE = 0xc5dbe6;
// Dark tinted aviation glass for helicopter cockpit and cabin panes.
const COCKPIT_GLASS = 0x263a4c;

// Shallow-water and foam RGB (sRGB) matching voyage/icebergs.ts waterline shaders.
const SHALLOW_RGB: readonly [number, number, number] = [0.53, 0.725, 0.795];
const MID_RGB: readonly [number, number, number] = [0.265, 0.445, 0.59];
const FOAM_RGB: readonly [number, number, number] = [0.969, 0.98, 0.984];

type RgbaVertex = readonly [number, number, number, number, number, number, number];

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const norm = (v: Vec3): Vec3 => {
  const l = Math.hypot(v[0], v[1], v[2]);
  return l ? [v[0] / l, v[1] / l, v[2] / l] : [0, 1, 0];
};
const addScaled = (p: Vec3, u: Vec3, su: number, v: Vec3, sv: number): Vec3 => [
  p[0] + u[0] * su + v[0] * sv,
  p[1] + u[1] * su + v[1] * sv,
  p[2] + u[2] * su + v[2] * sv,
];

/** Build a BufferGeometry with per-vertex RGBA colors in sRGB for transparent water/foam meshes. */
function buildAlphaWaterGeometry(faces: readonly (readonly [RgbaVertex, RgbaVertex, RgbaVertex])[]): BufferGeometry {
  const positions = new Float32Array(faces.length * 9);
  const colors = new Float32Array(faces.length * 12);
  const c = new Color();
  faces.forEach((f, i) =>
    f.forEach(([x, y, z, r, g, b, alpha], k) => {
      positions.set([x, y, z], i * 9 + k * 3);
      c.setRGB(r, g, b, SRGBColorSpace);
      colors.set([c.r, c.g, c.b, alpha], i * 12 + k * 4);
    }),
  );
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('color', new BufferAttribute(colors, 4));
  return geometry;
}


interface TubeStation {
  readonly pos: Vec3;
  readonly r: number;
}

/** Swept polygonal tube along a 3D spine with optional end caps and per-face coloring. */
function sweptTube(
  stations: readonly TubeStation[],
  segments: number,
  colorAt: (stationIdx: number, segIdx: number) => number,
  capStart = true,
  capEnd = true,
): Tri[] {
  const rings: Vec3[][] = [];
  for (let k = 0; k < stations.length; k++) {
    const prev = stations[Math.max(0, k - 1)].pos;
    const next = stations[Math.min(stations.length - 1, k + 1)].pos;
    const t = norm(sub(next, prev));
    const ref: Vec3 = Math.abs(t[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const u = norm(cross(ref, t));
    const v = cross(t, u);
    const { pos, r } = stations[k];
    const ring: Vec3[] = [];
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      ring.push(addScaled(pos, u, Math.cos(a) * r, v, Math.sin(a) * r));
    }
    rings.push(ring);
  }
  const out: Tri[] = [];
  for (let k = 0; k < stations.length - 1; k++) {
    for (let i = 0; i < segments; i++) {
      const j = (i + 1) % segments;
      out.push(...quad(rings[k][i], rings[k][j], rings[k + 1][j], rings[k + 1][i], colorAt(k, i)));
    }
  }
  if (capStart) {
    const c = stations[0].pos;
    for (let i = 0; i < segments; i++) {
      const j = (i + 1) % segments;
      out.push([c, rings[0][j], rings[0][i], colorAt(0, i)]);
    }
  }
  if (capEnd) {
    const last = stations.length - 1;
    const c = stations[last].pos;
    for (let i = 0; i < segments; i++) {
      const j = (i + 1) % segments;
      out.push([c, rings[last][i], rings[last][j], colorAt(last - 1, i)]);
    }
  }
  return out;
}


// ============================================================================
// 1. SEA-ICE FLOES (4 low-poly variants + waterline foam/glow per variant)
// ============================================================================

export interface FloeVariantModel {
  readonly tris: readonly Tri[];
  readonly createWaterline: () => BufferGeometry;
}

type FloeShapeFn = (angle: number, rng: () => number) => readonly [number, number];

function buildFloeVariant(seed: number, segments: number, shapeFn: FloeShapeFn, hasSeamRidge = false): FloeVariantModel {
  const rng = createSeededRng(seed);
  // Build outer perimeter ring in counter-clockwise order seen from +y.
  const basePts: [number, number][] = [];
  for (let i = 0; i < segments; i++) {
    const a = -(i / segments) * Math.PI * 2;
    const [px, pz] = shapeFn(a, rng);
    basePts.push([px, pz]);
  }

  const tris: Tri[] = [];
  const subRing: Vec3[] = [];
  const waterRing: Vec3[] = [];
  const rimRing: Vec3[] = [];
  const innerRing: Vec3[] = [];

  for (let i = 0; i < segments; i++) {
    const [px, pz] = basePts[i];
    const subScale = 0.94 + rng() * 0.08;
    const rimScale = 0.88 + rng() * 0.05;
    const inScale = 0.45 + rng() * 0.14;
    const rimY = 0.042 + rng() * 0.025;
    const inY = 0.068 + rng() * 0.028;

    subRing.push([px * subScale, -0.055, pz * subScale]);
    waterRing.push([px, -0.004, pz]);
    rimRing.push([px * rimScale, rimY, pz * rimScale]);
    innerRing.push([px * inScale, inY, pz * inScale]);
  }

  const bottomCenter: Vec3 = [0, -0.068, 0];
  const crestOffsetX = (rng() - 0.5) * 0.16;
  const crestOffsetZ = (rng() - 0.5) * 0.16;
  const topCenter: Vec3 = [crestOffsetX, hasSeamRidge ? 0.125 : 0.095 + rng() * 0.025, crestOffsetZ];

  for (let i = 0; i < segments; i++) {
    const j = (i + 1) % segments;
    // Submerged keel & lower wall
    tris.push([bottomCenter, subRing[j], subRing[i], ICE_SUBMERGED]);
    tris.push(...quad(subRing[i], subRing[j], waterRing[j], waterRing[i], ICE_BLUE));
    // Faceted wave-washed ice wall up to snow rim
    const wallCol = i % 3 === 0 ? ICE_SHADE : ICE_WALL;
    tris.push(...quad(waterRing[i], waterRing[j], rimRing[j], rimRing[i], wallCol));
    // Sloped snow drift & central snow facet
    const snowCol = (i + seed) % 4 === 0 ? ICE : WHITE;
    tris.push(...quad(rimRing[i], rimRing[j], innerRing[j], innerRing[i], snowCol));
    tris.push([topCenter, innerRing[i], innerRing[j], (i + 1) % 3 === 0 ? ICE : WHITE]);
  }

  // Snow hummock or pressure-ridge blocks on top
  if (hasSeamRidge) {
    tris.push(
      ...chunk(0.02, 0.105, -0.22, 0.24, 0.08, 0.36, seed + 11, WHITE),
      ...chunk(-0.02, 0.11, 0.2, 0.22, 0.09, 0.34, seed + 12, ICE_WALL),
    );
  } else {
    const hAngle = rng() * Math.PI * 2;
    tris.push(
      ...chunk(
        Math.cos(hAngle) * 0.22,
        0.095,
        Math.sin(hAngle) * 0.2,
        0.34,
        0.075,
        0.28,
        seed + 13,
        WHITE,
      ),
    );
  }

  // Two small calved brash ice chunks sitting partially submerged beside the floe
  const brashA = basePts[1];
  const brashB = basePts[Math.floor(segments * 0.58)];
  tris.push(
    ...chunk(brashA[0] * 1.07, 0.006, brashA[1] * 1.07, 0.2, 0.065, 0.17, seed + 21, ICE_WALL),
    ...chunk(brashB[0] * 1.07, 0.004, brashB[1] * 1.07, 0.17, 0.055, 0.18, seed + 22, WHITE),
  );

  // Per-variant broken waterline flags (seeded)
  const foamKeep = Array.from({ length: segments }, () => rng() > 0.22);

  const createWaterline = (): BufferGeometry => {
    const faces: [RgbaVertex, RgbaVertex, RgbaVertex][] = [];
    const pt = (idx: number, k: number, rgb: readonly [number, number, number], alpha: number): RgbaVertex => {
      const [bx, bz] = basePts[(idx + segments) % segments];
      return [bx * k, 0.008, bz * k, rgb[0], rgb[1], rgb[2], alpha];
    };
    for (let i = 0; i < segments; i++) {
      // Shallow turquoise glow ring fading outward from the submerged edge (upward +y normals)
      const g0a = pt(i, 0.98, SHALLOW_RGB, 0.52);
      const g0b = pt(i + 1, 0.98, SHALLOW_RGB, 0.52);
      const g1b = pt(i + 1, 1.24, MID_RGB, 0.0);
      const g1a = pt(i, 1.24, MID_RGB, 0.0);
      faces.push([g0a, g1b, g0b], [g0a, g1a, g1b]);

      // Broken foam collar hugging the ice perimeter
      if (foamKeep[i]) {
        const f0a = pt(i, 0.99, FOAM_RGB, 0.78);
        const f0b = pt(i + 1, 0.99, FOAM_RGB, 0.78);
        const f1b = pt(i + 1, 1.1, FOAM_RGB, 0.0);
        const f1a = pt(i, 1.1, FOAM_RGB, 0.0);
        faces.push([f0a, f1b, f0b], [f0a, f1a, f1b]);
      }
    }
    return buildAlphaWaterGeometry(faces);
  };

  return { tris, createWaterline };
}

export const SEA_ICE_FLOE_POLY_VARIANTS: readonly FloeVariantModel[] = [
  // Variant A: Broad polygonal pan with wavy perimeter
  buildFloeVariant(190411, 12, (a, rng) => {
    const r = 0.82 + 0.08 * Math.sin(a * 3 + 0.4) + (rng() - 0.5) * 0.14;
    return [Math.cos(a) * r * 1.04, Math.sin(a) * r * 0.92];
  }),
  // Variant B: Angular fractured wedge floe
  buildFloeVariant(190412, 11, (a, rng) => {
    const wedge = Math.cos(a) > 0 ? 1.08 - 0.25 * Math.abs(Math.sin(a)) : 0.92;
    const r = 0.78 * wedge + (rng() - 0.5) * 0.16;
    return [Math.cos(a) * r * 1.06, Math.sin(a) * r * 0.9];
  }),
  // Variant C: Elongated lobed floe
  buildFloeVariant(190413, 12, (a, rng) => {
    const r = 0.7 + 0.09 * Math.cos(a * 2 - 0.5) + (rng() - 0.5) * 0.11;
    return [Math.cos(a) * r * 1.18, Math.sin(a) * r * 0.74];
  }),
  // Variant D: Fused twin-pan floe with central pressure-ridge seam
  buildFloeVariant(
    190414,
    12,
    (a, rng) => {
      const pinch = 1 - 0.14 * Math.abs(Math.cos(a));
      const r = 0.84 * pinch + (rng() - 0.5) * 0.14;
      return [Math.cos(a) * r * 0.98, Math.sin(a) * r * 0.98];
    },
    true,
  ),
];

// ============================================================================
// 2. ZODIAC 5m RIB BOAT, CHOCKS & FOAM WAKE
// ============================================================================

/**
 * Bottom height (local model Y) of the low-poly Zodiac at (localX, localZ),
 * used to compute the stranded beach pose on the gravel.
 */
export function zodiacBottomY(localX: number, localZ: number): number {
  const az = Math.abs(localZ);
  let keelY = 0;
  if (localX > 0.92) keelY = 0.19;
  else if (localX > 0.72) keelY = 0.095;
  else if (localX > 0.45) keelY = 0.03;

  // V-hull deadrise rises gently toward the chine, and tubes curve upward outside |z| > 0.28
  const chineY = Math.min(0.11, az * 0.32);
  if (az > 0.34) return Math.max(keelY, 0.115);
  return Math.max(keelY, chineY);
}

/**
 * Low-poly 5 m Zodiac RIB (+x bow, +y up, base at y = 0).
 * Bounding box matches STATION_BOAT_BOXES within ±0.03:
 * min [-1.173, 0, -0.53], max [1.145, 0.555, 0.53].
 */
export function buildZodiacTris(): Tri[] {
  const tris: Tri[] = [];

  // 1. Horseshoe tubular pontoons (8-sided cross-section swept from port stern round bow to stbd stern)
  const halfPath: readonly { x: number; y: number; z: number; r: number }[] = [
    { x: -1.11, y: 0.24, z: -0.385, r: 0.042 },
    { x: -1.03, y: 0.24, z: -0.385, r: 0.105 },
    { x: -0.92, y: 0.24, z: -0.385, r: 0.145 },
    { x: -0.35, y: 0.24, z: -0.385, r: 0.145 },
    { x: 0.38, y: 0.245, z: -0.382, r: 0.144 },
    { x: 0.64, y: 0.268, z: -0.32, r: 0.132 },
    { x: 0.84, y: 0.305, z: -0.21, r: 0.118 },
    { x: 0.99, y: 0.34, z: -0.095, r: 0.104 },
  ];
  const tubeStations: TubeStation[] = [
    ...halfPath.map((p) => ({ pos: [p.x, p.y, p.z] as Vec3, r: p.r })),
    { pos: [1.055, 0.36, 0], r: 0.09 },
    ...[...halfPath].reverse().map((p) => ({ pos: [p.x, p.y, -p.z] as Vec3, r: p.r })),
  ];
  const nTubeSeg = 8;
  tris.push(
    ...sweptTube(
      tubeStations,
      nTubeSeg,
      (k, seg) => {
        // Tapered stern cones
        if (k === 0 || k === tubeStations.length - 2) return k === 0 || k === tubeStations.length - 2 ? BLACK : ZODIAC_TUBE_DARK;
        if (k === 1 || k === tubeStations.length - 3) return ZODIAC_TUBE_DARK;
        // Bow nose collar
        if (k === halfPath.length - 1 || k === halfPath.length) return ZODIAC_TUBE_DARK;
        // Lower wetted band darker than sunlit top tube
        return seg === 4 || seg === 5 || seg === 6 ? ZODIAC_TUBE_DARK : ZODIAC_TUBE;
      },
      true,
      true,
    ),
  );

  // Bow nose bumper reaching x = 1.145
  tris.push(...block(1.12, 0.365, 0, 0.05, 0.09, 0.13, BLACK));

  // Outer black rubbing strakes along port & starboard tubes (reaching z = ±0.53)
  for (const s of [-1, 1] as const) {
    tris.push(
      ...strut([-0.92, 0.24, s * 0.514], [0.4, 0.245, s * 0.514], 0.016, BLACK, true),
      ...strut([0.4, 0.245, s * 0.514], [0.68, 0.27, s * 0.435], 0.015, BLACK, true),
      ...strut([0.68, 0.27, s * 0.435], [0.92, 0.315, s * 0.31], 0.014, BLACK, true),
      // Lifeline rope & D-ring patches along tube tops
      ...strut([-0.56, 0.34, s * 0.46], [0.0, 0.34, s * 0.46], 0.011, CREAM, true),
      ...strut([0.0, 0.34, s * 0.46], [0.56, 0.34, s * 0.45], 0.011, CREAM, true),
      ...block(-0.56, 0.335, s * 0.455, 0.06, 0.036, 0.032, BLACK),
      ...block(0.0, 0.335, s * 0.455, 0.06, 0.036, 0.032, BLACK),
      ...block(0.56, 0.335, s * 0.445, 0.06, 0.036, 0.032, BLACK),
      // Grab handles
      ...block(0.32, 0.382, s * 0.38, 0.14, 0.028, 0.04, BLACK),
      ...block(-0.36, 0.382, s * 0.38, 0.14, 0.028, 0.04, BLACK),
    );
  }

  // 2. Rigid V-hull lofted from stern transom (-0.92) to rising forefoot bow (+1.06)
  // Ring [z, y] CCW seen from +x: keel -> stbd chine -> stbd deck edge -> port deck edge -> port chine
  const hullStations: LoftStation[] = [
    {
      x: -0.92,
      ring: [[0, 0.0], [0.32, 0.115], [0.32, 0.185], [-0.32, 0.185], [-0.32, 0.115]],
    },
    {
      x: 0.45,
      ring: [[0, 0.0], [0.31, 0.115], [0.31, 0.185], [-0.31, 0.185], [-0.31, 0.115]],
    },
    {
      x: 0.72,
      ring: [[0, 0.045], [0.22, 0.135], [0.24, 0.2], [-0.24, 0.2], [-0.22, 0.135]],
    },
    {
      x: 0.92,
      ring: [[0, 0.115], [0.12, 0.185], [0.14, 0.24], [-0.14, 0.24], [-0.12, 0.185]],
    },
    {
      x: 1.07,
      ring: [[0, 0.21], [0.05, 0.26], [0.055, 0.3], [-0.055, 0.3], [-0.05, 0.26]],
    },
  ];
  tris.push(
    ...loftAlongX(
      hullStations,
      (_band, seg) => (seg === 2 ? ZODIAC_FLOOR : ZODIAC_HULL),
      ZODIAC_HULL,
      ZODIAC_HULL,
    ),
  );

  // Rigid stern transom & aluminum cap
  tris.push(
    ...block(-0.9, 0.21, 0, 0.075, 0.25, 0.56, ZODIAC_HULL),
    ...block(-0.9, 0.34, 0, 0.085, 0.03, 0.54, ZINC),
  );

  // Non-slip interior floor ribs, bow locker bench, aft red fuel tank
  tris.push(
    ...block(-0.5, 0.192, 0, 0.055, 0.016, 0.46, ZODIAC_TUBE_DARK),
    ...block(0.28, 0.192, 0, 0.055, 0.016, 0.46, ZODIAC_TUBE_DARK),
    ...prism(rect(0.54, 0, 0.22, 0.36), 0.18, 0.275, ZODIAC_TUBE_DARK),
    ...prism(rect(-0.64, 0.12, 0.22, 0.16), 0.18, 0.28, RED),
    ...block(-0.64, 0.288, 0.15, 0.04, 0.02, 0.04, BLACK),
  );

  // Coiled bow rope on forward deck (octagonal torus ring + painter line)
  tris.push(
    ...lathe(
      0.8,
      0,
      [
        [0.195, 0.085],
        [0.23, 0.095],
        [0.248, 0.06],
        [0.23, 0.035],
        [0.195, 0.04],
      ],
      8,
      CREAM,
    ),
    ...strut([0.85, 0.25, 0], [1.04, 0.32, 0], 0.014, CREAM, true),
  );

  // 3. Central jockey seat & angled helm console with stainless grab rail and steering wheel
  tris.push(
    ...prism(
      [
        [-0.04, -0.14],
        [-0.4, -0.11],
        [-0.4, 0.11],
        [-0.04, 0.14],
      ],
      0.18,
      0.3,
      ZODIAC_TUBE_DARK,
    ),
    ...prism(
      [
        [-0.04, -0.13],
        [-0.39, -0.105],
        [-0.39, 0.105],
        [-0.04, 0.13],
      ],
      0.3,
      0.345,
      BLACK,
    ),
    // Angled helm console pedestal
    ...loftAlongX(
      [
        { x: -0.02, ring: [[-0.14, 0.18], [0.14, 0.18], [0.13, 0.44], [-0.13, 0.44]] },
        { x: 0.19, ring: [[-0.14, 0.18], [0.14, 0.18], [0.13, 0.41], [-0.13, 0.41]] },
      ],
      () => ZODIAC_TUBE_DARK,
      ZODIAC_TUBE_DARK,
      ZODIAC_TUBE_DARK,
    ),
    ...block(0.09, 0.435, 0, 0.18, 0.045, 0.26, ZODIAC_FLOOR),
    // Grab rail (top at y = 0.555)
    ...strut([0.12, 0.43, 0.125], [0.12, 0.54, 0.125], 0.014, ZINC, true),
    ...strut([0.12, 0.43, -0.125], [0.12, 0.54, -0.125], 0.014, ZINC, true),
    ...strut([0.12, 0.54, -0.125], [0.12, 0.54, 0.125], 0.015, ZINC, true),
    // Steering wheel (hub + 6-sided rim)
    ...block(-0.02, 0.41, 0, 0.035, 0.035, 0.035, BLACK),
    ...strut([-0.035, 0.35, 0], [-0.035, 0.47, 0], 0.01, BLACK, true),
    ...strut([-0.035, 0.41, -0.06], [-0.035, 0.41, 0.06], 0.01, BLACK, true),
  );
  // Octagonal steering wheel rim
  const wheelRing = ngon(0, 0, 0.065, 8);
  for (let i = 0; i < 8; i++) {
    const [z0, y0] = wheelRing[i];
    const [z1, y1] = wheelRing[(i + 1) % 8];
    tris.push(...strut([-0.035, 0.41 + y0, z0], [-0.035, 0.41 + y1, z1], 0.01, BLACK, false));
  }

  // 4. Outboard motor at stern (clamp, sculpted cowling, shaft/leg, skeg at y=0, 3-blade prop to x=-1.173)
  tris.push(
    ...block(-0.95, 0.33, 0, 0.1, 0.12, 0.14, ZINC),
    // Sculpted chamfered cowling (top at y = 0.555)
    ...loftAlongX(
      [
        { x: -1.17, ring: [[-0.075, 0.35], [0.075, 0.35], [0.085, 0.49], [0.055, 0.54], [-0.055, 0.54], [-0.085, 0.49]] },
        { x: -0.95, ring: [[-0.085, 0.34], [0.085, 0.34], [0.095, 0.50], [0.06, 0.555], [-0.06, 0.555], [-0.095, 0.50]] },
      ],
      (_b, s) => (s === 3 ? ZODIAC_TUBE_DARK : ZODIAC_MOTOR),
      ZODIAC_MOTOR,
      ZODIAC_MOTOR,
    ),
    ...block(-1.06, 0.435, 0, 0.226, 0.025, 0.194, ZINC),
    // Tiller arm
    ...strut([-0.96, 0.4, -0.05], [-0.81, 0.42, -0.07], 0.016, BLACK, true),
    // Tapered leg & lower unit skeg (base at y = 0)
    ...loftAlongX(
      [
        { x: -1.09, ring: [[-0.028, 0.07], [0.028, 0.07], [0.032, 0.34], [-0.032, 0.34]] },
        { x: -0.99, ring: [[-0.03, 0.07], [0.03, 0.07], [0.035, 0.34], [-0.035, 0.34]] },
      ],
      () => ZODIAC_MOTOR,
      ZODIAC_MOTOR,
      ZODIAC_MOTOR,
    ),
    // Torpedo gearcase & skeg touching y = 0
    ...lathe(-1.05, 0, [[0.035, 0.022], [0.06, 0.035], [0.085, 0.022]], 6, ZODIAC_MOTOR),
    ...block(-1.05, 0.06, 0, 0.14, 0.055, 0.045, ZODIAC_MOTOR),
    ...block(-1.04, 0.015, 0, 0.075, 0.03, 0.018, ZODIAC_MOTOR),
    // Propeller hub & 3 blades reaching x = -1.173
    ...block(-1.148, 0.06, 0, 0.05, 0.032, 0.032, ZINC),
  );
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.3;
    tris.push(
      ...strut(
        [-1.158, 0.06, 0],
        [-1.16, 0.06 + Math.cos(a) * 0.058, Math.sin(a) * 0.058],
        0.012,
        ZINC,
        true,
      ),
    );
  }

  return tris;
}

/** Wooden cradle chocks supporting the winterized Zodiac on the gravel beach. */
export function buildBoatChocksTris(
  stations: readonly { wx: number; wz: number; gy: number; chockTopY: number }[],
  fwdX: number,
  fwdZ: number,
  rightX: number,
  rightZ: number,
): Tri[] {
  const tris: Tri[] = [];
  for (const { wx, wz, gy, chockTopY } of stations) {
    const beamRing: [number, number][] = [];
    const halfL = 0.065;
    const halfW = 0.27;
    const corners: readonly [number, number][] = [
      [halfL, -halfW],
      [-halfL, -halfW],
      [-halfL, halfW],
      [halfL, halfW],
    ];
    for (const [u, v] of corners) {
      beamRing.push([wx + u * fwdX + v * rightX, wz + u * fwdZ + v * rightZ]);
    }
    tris.push(...prism(beamRing, gy - 0.015, chockTopY, WOOD, BROWN_DARK, true));

    // Port & starboard angled cradle wedges aligned to the boat beam
    for (const s of [-1, 1] as const) {
      const cx = wx + 0.02 * fwdX + s * 0.21 * rightX;
      const cz = wz + 0.02 * fwdZ + s * 0.21 * rightZ;
      const wedgeRing: [number, number][] = [];
      for (const [u, v] of [
        [0.07, -0.05],
        [-0.07, -0.05],
        [-0.07, 0.05],
        [0.07, 0.05],
      ] as const) {
        wedgeRing.push([cx + u * fwdX + v * rightX, cz + u * fwdZ + v * rightZ]);
      }
      tris.push(...prism(wedgeRing, chockTopY - 0.01, chockTopY + 0.035, WOOD_LIGHT, WOOD_LIGHT, true));
    }
  }
  return tris;
}

/**
 * Low-poly foam patch geometry with per-vertex RGBA alpha for the Zodiac's instanced wake.
 * Centered on origin, unit-sized (scaled per instance by sx, sy, sz).
 */
export function buildZodiacWakeGeometry(): BufferGeometry {
  const segs = 10;
  const rng = createSeededRng(190455);
  const ringPts: [number, number][] = Array.from({ length: segs }, (_, i) => {
    const a = -(i / segs) * Math.PI * 2;
    const r = 0.45 + (rng() - 0.5) * 0.14;
    return [Math.cos(a) * r, Math.sin(a) * r];
  });
  const faces: [RgbaVertex, RgbaVertex, RgbaVertex][] = [];
  const center: RgbaVertex = [0, 0.22, 0, FOAM_RGB[0], FOAM_RGB[1], FOAM_RGB[2], 0.9];
  for (let i = 0; i < segs; i++) {
    const [ax, az] = ringPts[i];
    const [bx, bz] = ringPts[(i + 1) % segs];
    const mA: RgbaVertex = [ax * 0.58, 0.1, az * 0.58, FOAM_RGB[0], FOAM_RGB[1], FOAM_RGB[2], 0.72];
    const mB: RgbaVertex = [bx * 0.58, 0.1, bz * 0.58, FOAM_RGB[0], FOAM_RGB[1], FOAM_RGB[2], 0.72];
    const oA: RgbaVertex = [ax * 1.12, -0.15, az * 1.12, FOAM_RGB[0], FOAM_RGB[1], FOAM_RGB[2], 0.0];
    const oB: RgbaVertex = [bx * 1.12, -0.15, bz * 1.12, FOAM_RGB[0], FOAM_RGB[1], FOAM_RGB[2], 0.0];
    faces.push([center, mA, mB], [mA, oA, oB], [mA, oB, mB]);
  }
  return buildAlphaWaterGeometry(faces);
}

/**
 * Low-poly hull waterline glow and bow foam collar for the moving Zodiac, matching icebergs.ts
 * shallow water and foam colours. Centered on boat local origin (+x bow, -x stern, y = 0).
 */
export function buildZodiacWaterlineGeometry(): BufferGeometry {
  // Perimeter ring ordered counter-clockwise seen from +y (+x -> -z -> -x -> +z)
  const hullPts: readonly [number, number][] = [
    [1.22, 0],
    [0.9, -0.36],
    [0.44, -0.55],
    [-0.12, -0.57],
    [-0.68, -0.56],
    [-1.12, -0.51],
    [-1.18, 0],
    [-1.12, 0.51],
    [-0.68, 0.56],
    [-0.12, 0.57],
    [0.44, 0.55],
    [0.9, 0.36],
  ];
  const n = hullPts.length;
  const pt = (
    idx: number,
    scaleX: number,
    scaleZ: number,
    y: number,
    rgb: readonly [number, number, number],
    alpha: number,
  ): RgbaVertex => {
    const [hx, hz] = hullPts[(idx + n) % n];
    const sx = hx < 0 ? scaleX + (scaleX - 1) * 0.7 : scaleX;
    return [hx * sx, y, hz * scaleZ, rgb[0], rgb[1], rgb[2], alpha];
  };
  const faces: [RgbaVertex, RgbaVertex, RgbaVertex][] = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    // Inner shallow-water glow hugging the hull
    const g0a = pt(i, 0.94, 0.94, 0.008, SHALLOW_RGB, 0.55);
    const g0b = pt(j, 0.94, 0.94, 0.008, SHALLOW_RGB, 0.55);
    const g1a = pt(i, 1.38, 1.52, 0.0, MID_RGB, 0.0);
    const g1b = pt(j, 1.38, 1.52, 0.0, MID_RGB, 0.0);
    faces.push([g0a, g1a, g1b], [g0a, g1b, g0b]);

    // Bow and flank foam crest fading outward
    const f0a = pt(i, 0.98, 0.98, 0.022, FOAM_RGB, 0.85);
    const f0b = pt(j, 0.98, 0.98, 0.022, FOAM_RGB, 0.85);
    const f1a = pt(i, 1.15, 1.24, 0.006, FOAM_RGB, 0.0);
    const f1b = pt(j, 1.15, 1.24, 0.006, FOAM_RGB, 0.0);
    faces.push([f0a, f1a, f1b], [f0a, f1b, f0b]);
  }
  return buildAlphaWaterGeometry(faces);
}

/** Low-poly snow-puff particle (pure triangles, no texture) for helicopter rotor downdraft. */
export function buildSnowPuffTris(): Tri[] {
  return [
    ...chunk(0, 0, 0, 0.92, 0.58, 0.86, 190466, WHITE),
    ...chunk(0.18, 0.12, -0.1, 0.58, 0.44, 0.58, 190467, ICE),
  ];
}

// ============================================================================
// 3. SEA KING HELICOPTER BODY & TWISTED MAIN ROTOR
// ============================================================================

/** Helper returning an 8-point octagonal ring [z, y] counter-clockwise in (z, y) for loftAlongX. */
function octagonZY(cy: number, hw: number, hh: number, chW: number, chH: number): [number, number][] {
  // Ordered CCW in (z, y): bottom-right -> side-right -> upper-right -> top-right -> top-left -> upper-left -> side-left -> bottom-left
  return [
    [hw - chW, cy - hh],
    [hw, cy - hh + chH],
    [hw, cy + hh - chH],
    [hw - chW, cy + hh],
    [-(hw - chW), cy + hh],
    [-hw, cy + hh - chH],
    [-hw, cy - hh + chH],
    [-(hw - chW), cy - hh],
  ];
}

/**
 * Low-poly Sea King helicopter body (+x nose, +y up, resting on y = 0, length ~0.96).
 * Bounding box matches HELICOPTER_BOXES within ±0.03:
 * min [-0.5, 0, -0.166], max [0.46, 0.332, 0.166].
 */
export function buildHelicopterTris(): Tri[] {
  const tris: Tri[] = [];

  // 1. Lofted 8-sided fuselage tapering from cockpit/cabin to the tail boom
  // Stations strictly ascending in x from -0.43 (tail boom tip) to +0.46 (nose tip)
  const fuselageStations: LoftStation[] = [
    { x: -0.43, ring: octagonZY(0.215, 0.017, 0.02, 0.006, 0.007) }, // tail boom end
    { x: -0.32, ring: octagonZY(0.168, 0.026, 0.03, 0.008, 0.009) }, // mid tail boom
    { x: -0.2, ring: octagonZY(0.15, 0.038, 0.044, 0.012, 0.014) }, // tail boom root
    { x: -0.1, ring: octagonZY(0.122, 0.068, 0.072, 0.02, 0.022) }, // rear cabin taper
    { x: 0.02, ring: octagonZY(0.122, 0.08, 0.076, 0.022, 0.022) }, // aft cabin
    { x: 0.22, ring: octagonZY(0.122, 0.08, 0.076, 0.022, 0.022) }, // forward cabin
    { x: 0.29, ring: octagonZY(0.118, 0.074, 0.07, 0.02, 0.02) }, // cockpit windshield base
    { x: 0.37, ring: octagonZY(0.104, 0.062, 0.052, 0.018, 0.016) }, // upper nose
    { x: 0.43, ring: octagonZY(0.095, 0.042, 0.034, 0.014, 0.012) }, // radome shoulder
    { x: 0.46, ring: octagonZY(0.092, 0.016, 0.014, 0.005, 0.005) }, // nose tip
  ];

  // Segment indices in octagonZY (CCW in (z, y)):
  // 0: +z lower chamfer, 1: +z wall, 2: +z upper chamfer, 3: top crown,
  // 4: -z upper chamfer, 5: -z wall, 6: -z lower chamfer, 7: bottom keel
  tris.push(
    ...loftAlongX(
      fuselageStations,
      (band, seg) => {
        if (band === 0 || band === 1) return ORANGE; // high-visibility tail boom band
        if (band >= 7) return ORANGE; // high-visibility nose cone
        if (band === 6) {
          // Faceted cockpit windshield panes on upper front faces
          if (seg === 2 || seg === 3 || seg === 4) return COCKPIT_GLASS;
          return ORANGE;
        }
        if (seg === 0 || seg === 6 || seg === 7) return WHALE_GREY;
        if (seg === 3) return WHITE;
        return SEA_GREY;
      },
      ORANGE,
      ORANGE,
    ),
  );

  // Cockpit side window panes & frame pillars
  for (const s of [-1, 1] as const) {
    tris.push(
      ...block(0.31, 0.145, s * 0.068, 0.056, 0.026, 0.01, COCKPIT_GLASS),
      ...block(0.28, 0.145, s * 0.072, 0.01, 0.032, 0.01, BLACK),
      ...block(0.34, 0.145, s * 0.07, 0.01, 0.032, 0.01, BLACK),
      // Cabin side windows with thin dark frames
      ...block(0.18, 0.14, s * 0.081, 0.044, 0.03, 0.008, COCKPIT_GLASS),
      ...block(0.09, 0.14, s * 0.081, 0.044, 0.03, 0.008, COCKPIT_GLASS),
      ...block(-0.01, 0.14, s * 0.081, 0.04, 0.03, 0.008, COCKPIT_GLASS),
      ...block(0.135, 0.125, s * 0.081, 0.008, 0.08, 0.006, BLACK), // sliding door seam
    );
  }
  // Cockpit center windshield mullion
  tris.push(...strut([0.295, 0.185, 0], [0.365, 0.148, 0], 0.006, BLACK, false));

  // 2. Twin-turbine engine cowling on top, air intakes, exhausts & main rotor mast
  const cowlStations: LoftStation[] = [
    { x: -0.05, ring: octagonZY(0.214, 0.042, 0.026, 0.012, 0.01) },
    { x: 0.01, ring: octagonZY(0.218, 0.05, 0.032, 0.014, 0.012) },
    { x: 0.18, ring: octagonZY(0.218, 0.05, 0.032, 0.014, 0.012) },
    { x: 0.24, ring: octagonZY(0.21, 0.042, 0.024, 0.012, 0.009) },
  ];
  tris.push(
    ...loftAlongX(
      cowlStations,
      (_b, seg) => (seg === 2 || seg === 3 || seg === 4 ? ORANGE : SEA_GREY),
      SEA_GREY,
      SEA_GREY,
    ),
  );
  for (const s of [-1, 1] as const) {
    // Intakes & exhaust pipes
    tris.push(
      ...prism(rect(0.235, s * 0.026, 0.03, 0.03), 0.195, 0.228, BLACK),
      ...strut([-0.04, 0.214, s * 0.026], [-0.075, 0.218, s * 0.034], 0.012, ZINC, true),
    );
  }
  // Main rotor mast rising into HELICOPTER_ROTOR_ORIGIN [0.08, 0.298, 0]
  tris.push(...lathe(0.08, 0, [[0.24, 0.022], [0.295, 0.016]], 8, ZINC));

  // 3. Tail pylon, horizontal stabilizer & 4-blade tail rotor
  tris.push(
    ...loftAlongX(
      [
        { x: -0.44, ring: [[-0.014, 0.19], [0.014, 0.19], [0.012, 0.278], [-0.012, 0.278]] },
        { x: -0.4, ring: [[-0.016, 0.18], [0.016, 0.18], [0.013, 0.255], [-0.013, 0.255]] },
        { x: -0.35, ring: [[-0.018, 0.17], [0.018, 0.17], [0.014, 0.23], [-0.014, 0.23]] },
      ],
      (b) => (b === 0 ? SEA_GREY : ORANGE),
      SEA_GREY,
      ORANGE,
    ),
    // Horizontal stabilizer on starboard (+z) side
    ...prism(
      [
        [-0.37, 0.015],
        [-0.43, 0.015],
        [-0.425, 0.11],
        [-0.38, 0.11],
      ],
      0.228,
      0.242,
      SEA_GREY,
      SEA_GREY,
      true,
    ),
    // Tail rotor gearbox & hub at [-0.42, 0.252, -0.044]
    ...block(-0.42, 0.252, -0.028, 0.026, 0.026, 0.028, ZINC),
    ...block(-0.42, 0.252, -0.044, 0.018, 0.018, 0.014, ZINC),
  );
  // 4 tail rotor blades (vertical reaches y = 0.252 + 0.08 = 0.332; horizontal reaches x = -0.42 - 0.08 = -0.50)
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    const tipX = -0.42 + Math.cos(a) * 0.08;
    const tipY = 0.252 + Math.sin(a) * 0.08;
    tris.push(
      ...strut([-0.42, 0.252, -0.044], [tipX, tipY, -0.044], 0.006, BLACK, true),
    );
  }

  // 4. Landing skids with angled cross-tubes (patines con travesaños), resting on y = 0, outer z = ±0.166
  for (const s of [-1, 1] as const) {
    const sz = s * 0.156;
    // Main skid runner resting on y = 0 (radius 0.01 -> center y = 0.01, outer z = ±0.166)
    tris.push(
      ...sweptTube(
        [
          { pos: [-0.18, 0.01, sz], r: 0.01 },
          { pos: [0.22, 0.01, sz], r: 0.01 },
          { pos: [0.28, 0.026, sz], r: 0.01 },
          { pos: [0.31, 0.052, sz], r: 0.009 },
        ],
        6,
        () => BLACK,
        true,
        true,
      ),
      // Forward & aft tubular cross-struts connecting fuselage belly to skids
      ...strut([0.19, 0.068, s * 0.055], [0.19, 0.012, sz], 0.0085, ZINC, true),
      ...strut([-0.06, 0.068, s * 0.055], [-0.06, 0.012, sz], 0.0085, ZINC, true),
      // Small lateral sponson float pods mounted above aft skid strut (preserving Sea King side silhouette)
      ...prism(
        [
          [0.14, s * 0.08],
          [-0.04, s * 0.08],
          [-0.02, s * 0.145],
          [0.12, s * 0.145],
        ],
        0.065,
        0.105,
        SEA_GREY,
        SEA_GREY,
        true,
      ),
      ...block(0.135, 0.085, s * 0.112, 0.028, 0.034, 0.052, ORANGE),
    );
  }

  return tris;
}

/**
 * Low-poly Sea King main rotor centered on the mast axis (0, 0, 0):
 * sculpted rotor head + 4 thin airfoil blades with slight pitch twist and yellow warning tips.
 * Bounding box matches HELICOPTER_ROTOR_BOXES: [-0.42, -0.013, -0.42]..[0.42, 0.013, 0.42].
 */
export function buildHelicopterRotorTris(): Tri[] {
  const tris: Tri[] = [];

  // Central rotor hub & swashplate collar (height -0.013..+0.013)
  tris.push(
    ...lathe(
      0,
      0,
      [
        [-0.013, 0.018],
        [-0.006, 0.032],
        [0.006, 0.032],
        [0.013, 0.016],
        [0.013, 0],
      ],
      8,
      (_seg, band) => (band === 1 ? BLACK : ZINC),
    ),
  );

  // 4 thin blades with progressive washout twist along span (from 12 deg at root to 4 deg at tip)
  const spans = [
    { r: 0.028, chord: 0.014, thick: 0.006, twist: 0.22 },
    { r: 0.068, chord: 0.016, thick: 0.005, twist: 0.18 },
    { r: 0.22, chord: 0.016, thick: 0.0045, twist: 0.12 },
    { r: 0.37, chord: 0.015, thick: 0.004, twist: 0.07 },
    { r: 0.42, chord: 0.013, thick: 0.0035, twist: 0.04 },
  ] as const;

  for (let b = 0; b < 4; b++) {
    const angle = (b * Math.PI) / 2;
    const ca = Math.cos(angle);
    const sa = Math.sin(angle);
    // Outward span direction (dx, dz) = (ca, sa); chordwise direction = (-sa, ca)
    const bladeRings: Vec3[][] = spans.map(({ r, chord, thick, twist }) => {
      const ct = Math.cos(twist);
      const st = Math.sin(twist);
      const pt = (cOff: number, tOff: number): Vec3 => {
        const localChord = cOff * ct - tOff * st;
        const localY = 0.004 + cOff * st + tOff * ct;
        return [ca * r - sa * localChord, localY, sa * r + ca * localChord];
      };
      // Diamond airfoil section ordered CCW looking along +span
      return [pt(chord, 0), pt(0, thick), pt(-chord, 0), pt(0, -thick)];
    });

    for (let k = 0; k < bladeRings.length - 1; k++) {
      const col = k === 0 ? ZINC : k === bladeRings.length - 2 ? LAMP : BLACK;
      const r0 = bladeRings[k];
      const r1 = bladeRings[k + 1];
      for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4;
        tris.push(...quad(r0[i], r0[j], r1[j], r1[i], col));
      }
    }
    // Cap blade tip (outward along +span)
    const tip = bladeRings[bladeRings.length - 1];
    tris.push([tip[0], tip[2], tip[1], LAMP], [tip[0], tip[3], tip[2], LAMP]);
  }

  return tris;
}

import { BufferAttribute, BufferGeometry, Color, SRGBColorSpace } from 'three';
import { createSeededRng } from '@antartida/core';
import { chunk, mirrorZ, prism, shift, turn, type Tri, type Vec3 } from '../voyage/lowPoly.ts';
import { SLIDE_DIRECTION, VOXEL_PALETTE } from './stationModels.ts';
import { PENGUIN_NECK, type PenguinSpecies } from './penguins.ts';
import {
  ELEPHANT_FLIPPER_L,
  ELEPHANT_FLIPPER_R,
  ELEPHANT_JAW,
  ELEPHANT_NECK,
  ELEPHANT_TAIL,
  WEDDELL_FLIPPER_L,
  WEDDELL_FLIPPER_R,
  WEDDELL_NECK,
  WEDDELL_TAIL,
} from './seals.ts';

const {
  BLACK,
  WHITE,
  ROCK,
  ROCK_DARK,
  ROCK_LIGHT,
  ICE,
  RED,
  WOOD,
  SEA_GREY,
  BROWN,
  BROWN_DARK,
  SEAL_DARK,
  SEAL_BELLY,
  SEAL_SPOT,
} = VOXEL_PALETTE;

// Additional named palette constants (rule 30.5: never inline bare hex colors)
const PENGUIN_FOOT = 0xd98a6c;
const GUANO = 0xdcc2b4;
const GUANO_LIGHT = 0xeee2d6;
const GUANO_WARM = 0xc9a896;
const PEBBLE = 0x5b605e;
const PEBBLE_LIGHT = 0x767c79;
const SEAL_DORSAL = 0x3d4852;
const SEAL_SNOUT = 0x5d6973;
const ELEPHANT_BACK = 0x5c4637;
const ELEPHANT_BELLY = 0xa6896a;
const ELEPHANT_CHEST = 0x9c7a58;
const CONTACT_SHADOW_RGB: readonly [number, number, number] = [0.11, 0.15, 0.2];

// ---------------------------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------------------------

/** Mirror triangles across the z = 0 plane while preserving outward triangle winding. */
export const mirrorZTris = mirrorZ;

const centroid = (pts: readonly Vec3[]): Vec3 => {
  const n = pts.length;
  let sx = 0;
  let sy = 0;
  let sz = 0;
  for (const [x, y, z] of pts) {
    sx += x;
    sy += y;
    sz += z;
  }
  return [sx / n, sy / n, sz / n];
};

interface YRing {
  cx: number;
  y: number;
  cz: number;
  rx: number;
  rz: number;
  /** Flattening factor on -x (back) vs +x (front), optional. */
  frontScale?: number;
}

/**
 * Vertical loft along +y from a sequence of elliptical rings.
 * Each ring is sampled clockwise seen from +y so all side quads and caps face outward.
 */
function loftY(
  spec: readonly YRing[],
  segments: number,
  color: number | ((seg: number, band: number) => number),
  capBottom = true,
  capTop = true,
  phase = 0
): Tri[] {
  const rings: Vec3[][] = spec.map(({ cx, y, cz, rx, rz, frontScale = 1 }) =>
    Array.from({ length: segments }, (_, i) => {
      const a = phase - (i / segments) * Math.PI * 2;
      const ca = Math.cos(a);
      const sx = ca > 0 ? rx * frontScale : rx;
      return [cx + ca * sx, y, cz + Math.sin(a) * rz];
    })
  );
  const tris: Tri[] = [];
  for (let k = 0; k < rings.length - 1; k++) {
    for (let i = 0; i < segments; i++) {
      const j = (i + 1) % segments;
      const c = typeof color === 'number' ? color : color(i, k);
      const a = rings[k][i];
      const b = rings[k][j];
      const d = rings[k + 1][i];
      const e = rings[k + 1][j];
      tris.push([a, b, e, c], [a, e, d, c]);
    }
  }
  if (capBottom && rings.length > 0) {
    const r0 = rings[0];
    const c0 = centroid(r0);
    for (let i = 0; i < segments; i++) {
      const j = (i + 1) % segments;
      const col = typeof color === 'number' ? color : color(i, 0);
      tris.push([c0, r0[j], r0[i], col]);
    }
  }
  if (capTop && rings.length > 0) {
    const rTop = rings[rings.length - 1];
    const cTop = centroid(rTop);
    const band = Math.max(0, rings.length - 2);
    for (let i = 0; i < segments; i++) {
      const j = (i + 1) % segments;
      const col = typeof color === 'number' ? color : color(i, band);
      tris.push([cTop, rTop[i], rTop[j], col]);
    }
  }
  return tris;
}

interface XRing {
  x: number;
  cy: number;
  cz: number;
  ry: number;
  rz: number;
  /** Optional floor clamp so bellies rest flush on the ground. */
  floorY?: number;
}

/**
 * Horizontal loft along +x (tail to snout).
 * Cross-sections are sampled counter-clockwise seen from +x so all quads and caps face outward.
 */
function loftX(
  spec: readonly XRing[],
  segments: number,
  color: number | ((seg: number, band: number) => number),
  capStart = true,
  capEnd = true,
  phase = 0
): Tri[] {
  const rings: Vec3[][] = spec.map(({ x, cy, cz, ry, rz, floorY }) =>
    Array.from({ length: segments }, (_, i) => {
      const a = phase + (i / segments) * Math.PI * 2;
      const py = cy + Math.sin(a) * ry;
      return [x, floorY !== undefined ? Math.max(floorY, py) : py, cz + Math.cos(a) * rz];
    })
  );
  const tris: Tri[] = [];
  for (let k = 0; k < rings.length - 1; k++) {
    for (let i = 0; i < segments; i++) {
      const j = (i + 1) % segments;
      const c = typeof color === 'number' ? color : color(i, k);
      const a = rings[k][i];
      const b = rings[k][j];
      const d = rings[k + 1][i];
      const e = rings[k + 1][j];
      tris.push([a, d, e, c], [a, e, b, c]);
    }
  }
  if (capStart && rings.length > 0) {
    const r0 = rings[0];
    const c0 = centroid(r0);
    for (let i = 0; i < segments; i++) {
      const j = (i + 1) % segments;
      const col = typeof color === 'number' ? color : color(i, 0);
      tris.push([c0, r0[i], r0[j], col]);
    }
  }
  if (capEnd && rings.length > 0) {
    const rEnd = rings[rings.length - 1];
    const cEnd = centroid(rEnd);
    const band = Math.max(0, rings.length - 2);
    for (let i = 0; i < segments; i++) {
      const j = (i + 1) % segments;
      const col = typeof color === 'number' ? color : color(i, band);
      tris.push([cEnd, rEnd[j], rEnd[i], col]);
    }
  }
  return tris;
}

/** Closed faceted wedge/polygon extruded along z from -halfZ to +halfZ. */
function extrudeZPoly(profileXY: readonly (readonly [number, number])[], halfZ: number, color: number): Tri[] {
  const n = profileXY.length;
  const cx = profileXY.reduce((s, [x]) => s + x / n, 0);
  const cy = profileXY.reduce((s, [, y]) => s + y / n, 0);
  // Ensure counter-clockwise in (x, y) so +z/+z walls face outward
  const area = profileXY.reduce((sum, [x, y], i) => {
    const [nx, ny] = profileXY[(i + 1) % n];
    return sum + x * ny - nx * y;
  }, 0);
  const pts = area < 0 ? [...profileXY].reverse() : profileXY;
  const tris: Tri[] = [];
  for (let i = 0; i < n; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[(i + 1) % n];
    // +z front cap, -z back cap, and perimeter wall
    tris.push([[cx, cy, halfZ], [ax, ay, halfZ], [bx, by, halfZ], color]);
    tris.push([[cx, cy, -halfZ], [bx, by, -halfZ], [ax, ay, -halfZ], color]);
    tris.push(
      [[ax, ay, -halfZ], [bx, by, -halfZ], [bx, by, halfZ], color],
      [[ax, ay, -halfZ], [bx, by, halfZ], [ax, ay, halfZ], color]
    );
  }
  return tris;
}

/** Soft radial vertex-alpha contact shadow geometry on y = 0 (for transparent Material). */
function buildContactDiscGeometry(
  cx: number,
  cz: number,
  rx: number,
  rz: number,
  centerAlpha: number,
  segments = 12
): BufferGeometry {
  const rings = [
    { k: 0.55, a: centerAlpha * 0.72 },
    { k: 1.0, a: 0 },
  ];
  const faces: [readonly [number, number, number], readonly [number, number, number], readonly [number, number, number]][] = [];
  const pt = (i: number, k: number): [number, number] => {
    const ang = (i / segments) * Math.PI * 2;
    return [cx + Math.cos(ang) * rx * k, cz - Math.sin(ang) * rz * k];
  };
  for (let i = 0; i < segments; i++) {
    const p0 = pt(i, rings[0].k);
    const p1 = pt(i + 1, rings[0].k);
    faces.push([
      [cx, cz, centerAlpha],
      [p0[0], p0[1], rings[0].a],
      [p1[0], p1[1], rings[0].a],
    ]);
    const q0 = pt(i, rings[1].k);
    const q1 = pt(i + 1, rings[1].k);
    faces.push(
      [
        [p0[0], p0[1], rings[0].a],
        [q0[0], q0[1], 0],
        [q1[0], q1[1], 0],
      ],
      [
        [p0[0], p0[1], rings[0].a],
        [q1[0], q1[1], 0],
        [p1[0], p1[1], rings[0].a],
      ]
    );
  }

  const positions = new Float32Array(faces.length * 9);
  const colors = new Float32Array(faces.length * 12);
  const c = new Color();
  c.setRGB(CONTACT_SHADOW_RGB[0], CONTACT_SHADOW_RGB[1], CONTACT_SHADOW_RGB[2], SRGBColorSpace);
  faces.forEach((f, fi) =>
    f.forEach(([x, z, alpha], k) => {
      positions.set([x, 0, z], fi * 9 + k * 3);
      colors.set([c.r, c.g, c.b, alpha], fi * 12 + k * 4);
    })
  );
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(positions, 3));
  geo.setAttribute('color', new BufferAttribute(colors, 4));
  return geo;
}

// ---------------------------------------------------------------------------------------------
// 1. Penguins (Adélie and Chinstrap)
// ---------------------------------------------------------------------------------------------

export interface PenguinPolyParts {
  body: Tri[];
  /** Relative to PENGUIN_NECK. */
  head: Tri[];
  /** One flipper relative to PENGUIN_SHOULDER (symmetric in z, shared on both sides). */
  flipper: Tri[];
}

function buildWebbedFoot(side: 1 | -1): Tri[] {
  const zMid = side * 0.075;
  const ring: [number, number][] = [
    [-0.03, zMid - side * 0.024],
    [0.145, zMid - side * 0.048],
    [0.145, zMid + side * 0.048],
    [-0.03, zMid + side * 0.024],
  ];
  return prism(ring, 0, 0.032, PENGUIN_FOOT, PENGUIN_FOOT, true);
}

/**
 * Low-poly penguin split into animated parts (body, head, flipper) matching the exact pivots
 * and bounding envelopes of the block version. Budget: <= 300 tris total.
 */
export function buildPenguinPolyParts(species: PenguinSpecies): PenguinPolyParts {
  // 10-sided sculpted spindle body (y = 0.04..0.55) with crisp white chest vs black back.
  // Phase places segment 0 centered on +x; segments 0, 1, 8, 9 are the front arc.
  const frontMask = (seg: number, band: number) => {
    if (band === 0) return seg === 0 || seg === 9;
    if (band === 3 && species === 'adelie') return seg === 0 || seg === 9;
    return seg === 0 || seg === 1 || seg === 8 || seg === 9;
  };
  const bodyTorso = loftY(
    [
      { cx: -0.01, y: 0.04, cz: 0, rx: 0.115, rz: 0.112 },
      { cx: -0.005, y: 0.15, cz: 0, rx: 0.132, rz: 0.13, frontScale: 1.05 },
      { cx: 0.0, y: 0.31, cz: 0, rx: 0.128, rz: 0.125, frontScale: 1.06 },
      { cx: 0.0, y: 0.45, cz: 0, rx: 0.112, rz: 0.11, frontScale: 1.04 },
      { cx: 0.0, y: 0.55, cz: 0, rx: 0.095, rz: 0.095 },
    ],
    10,
    (seg, band) => (frontMask(seg, band) ? WHITE : BLACK),
    true,
    true,
    Math.PI / 10
  );

  // Stiff tapered tail reaching x = -0.23
  const tail = loftX(
    [
      { x: -0.23, cy: 0.038, cz: 0, ry: 0.012, rz: 0.03 },
      { x: -0.07, cy: 0.088, cz: 0, ry: 0.032, rz: 0.068 },
    ],
    4,
    BLACK,
    true,
    false
  );

  const body: Tri[] = [...bodyTorso, ...tail, ...buildWebbedFoot(1), ...buildWebbedFoot(-1)];

  // Head (relative to PENGUIN_NECK = [0, 0.53, 0])
  const headCrown = loftY(
    [
      { cx: 0.01, y: 0.015, cz: 0, rx: 0.092, rz: 0.094 },
      { cx: 0.014, y: 0.092, cz: 0, rx: 0.092, rz: 0.094, frontScale: 1.08 },
      { cx: 0.006, y: 0.168, cz: 0, rx: 0.048, rz: 0.05 },
    ],
    8,
    (seg, band) => {
      if (species === 'chinstrap' && band === 0 && (seg === 0 || seg === 1 || seg === 6 || seg === 7)) {
        return WHITE;
      }
      return BLACK;
    },
    true,
    true,
    Math.PI / 8
  );

  const headFeatures: Tri[] = [];
  if (species === 'adelie') {
    // White eye rings + dark eyes on both sides (z = ±0.096..±0.111)
    for (const side of [1, -1] as const) {
      const ringZ = side * 0.098;
      const eyeZ = side * 0.107;
      const ringPts = Array.from({ length: 6 }, (_, i): Vec3 => {
        const a = (i / 6) * Math.PI * 2;
        return [0.05 + Math.cos(a) * 0.032, 0.095 + Math.sin(a) * 0.032, ringZ];
      });
      const eyePts = Array.from({ length: 4 }, (_, i): Vec3 => {
        const a = (i / 4) * Math.PI * 2;
        return [0.056 + Math.cos(a) * 0.014, 0.095 + Math.sin(a) * 0.014, eyeZ];
      });
      const ringApex: Vec3 = [0.05, 0.095, side * 0.106];
      const eyeApex: Vec3 = [0.056, 0.095, side * 0.111];
      for (let i = 0; i < 6; i++) {
        const j = (i + 1) % 6;
        headFeatures.push(side > 0 ? [ringApex, ringPts[i], ringPts[j], WHITE] : [ringApex, ringPts[j], ringPts[i], WHITE]);
      }
      for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4;
        headFeatures.push(side > 0 ? [eyeApex, eyePts[i], eyePts[j], BLACK] : [eyeApex, eyePts[j], eyePts[i], BLACK]);
      }
    }
    // Red-based conical bill tapering to a dark tip at x = 0.192
    headFeatures.push(
      ...loftX(
        [
          { x: 0.09, cy: 0.072, cz: 0, ry: 0.023, rz: 0.028 },
          { x: 0.145, cy: 0.068, cz: 0, ry: 0.016, rz: 0.02 },
          { x: 0.192, cy: 0.063, cz: 0, ry: 0.004, rz: 0.006 },
        ],
        4,
        (_seg, band) => (band === 0 ? RED : BLACK),
        false,
        true,
        Math.PI / 4
      )
    );
  } else {
    // Chinstrap: dark eyes, sharp black chinstrap line under the chin, and sleek black bill
    for (const side of [1, -1] as const) {
      const eyeZ = side * 0.101;
      const eyePts = Array.from({ length: 4 }, (_, i): Vec3 => {
        const a = (i / 4) * Math.PI * 2;
        return [0.065 + Math.cos(a) * 0.014, 0.095 + Math.sin(a) * 0.014, eyeZ];
      });
      const eyeApex: Vec3 = [0.065, 0.095, side * 0.107];
      for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4;
        headFeatures.push(side > 0 ? [eyeApex, eyePts[i], eyePts[j], BLACK] : [eyeApex, eyePts[j], eyePts[i], BLACK]);
      }
      // Cheek strap descending from crown behind eye to under the chin
      headFeatures.push(
        ...prism(
          [
            [0.02, side * 0.092],
            [0.038, side * 0.092],
            [0.056, side * 0.104],
          ],
          -0.015,
          0.08,
          BLACK,
          BLACK,
          true
        )
      );
    }
    // Thin black chinstrap under the throat (y = -0.018..0.004)
    headFeatures.push(
      ...prism(
        [
          [0.046, -0.103],
          [0.072, 0],
          [0.046, 0.103],
        ],
        -0.018,
        0.004,
        BLACK,
        BLACK,
        true
      )
    );
    // Black conical bill
    headFeatures.push(
      ...loftX(
        [
          { x: 0.09, cy: 0.072, cz: 0, ry: 0.022, rz: 0.026 },
          { x: 0.167, cy: 0.064, cz: 0, ry: 0.004, rz: 0.006 },
        ],
        4,
        BLACK,
        false,
        true,
        Math.PI / 4
      )
    );
  }

  // Flipper (relative to PENGUIN_SHOULDER = [-0.01, 0.47, 0.15])
  // Tapered hydrofoil blade with white leading (+x) edge and dark trailing edge
  const flipper = loftY(
    [
      { cx: -0.03, y: -0.305, cz: -0.001, rx: 0.024, rz: 0.007 },
      { cx: 0.012, y: -0.13, cz: -0.001, rx: 0.05, rz: 0.018 },
      { cx: 0.0, y: 0.0, cz: -0.001, rx: 0.046, rz: 0.018 },
    ],
    4,
    (seg) => (seg === 0 || seg === 3 ? WHITE : BLACK),
    true,
    true,
    Math.PI / 4
  );

  // Align head with local PENGUIN_NECK (already built around [0, 0, 0] with y = 0.015..0.172)
  void PENGUIN_NECK;
  void extrudeZPoly;
  return { body, head: [...headCrown, ...headFeatures], flipper };
}

/** Soft faceted contact shadow disc under a standing/walking penguin. */
export function buildPenguinShadowGeometry(): BufferGeometry {
  return buildContactDiscGeometry(0.01, 0, 0.19, 0.16, 0.24, 10);
}

// ---------------------------------------------------------------------------------------------
// 2. Penguin Rookery (pebble nests + irregular guano stains)
// ---------------------------------------------------------------------------------------------

const SLIDE_S = SLIDE_DIRECTION;
const SLIDE_P: readonly [number, number] = [SLIDE_S[1], -SLIDE_S[0]];

const NESTS: readonly (readonly [number, number])[] = [
  [-0.2, -0.5],
  [0.25, -0.6],
  [-0.6, -0.15],
  [-0.1, -0.98],
  [0.4, -1.05],
  [-0.98, 0.25],
  [-0.62, 0.62],
  [-1.12, -0.22],
  [-0.2, 0.08],
];

const GUANO_PATCHES: readonly { x: number; z: number; rx: number; rz: number; h: number; seed: number; col: number }[] = [
  { x: 0.1, z: -0.15, rx: 0.54, rz: 0.39, h: 0.016, seed: 301, col: GUANO },
  { x: -0.35, z: 0.3, rx: 0.4, rz: 0.3, h: 0.015, seed: 302, col: GUANO },
  { x: 0.45, z: 0.3, rx: 0.25, rz: 0.22, h: 0.014, seed: 303, col: GUANO_LIGHT },
  { x: -0.6, z: -0.45, rx: 0.24, rz: 0.25, h: 0.015, seed: 304, col: GUANO_LIGHT },
  { x: 0.3, z: -0.75, rx: 0.28, rz: 0.16, h: 0.014, seed: 305, col: GUANO_WARM },
  { x: -0.94, z: 0.05, rx: 0.16, rz: 0.27, h: 0.015, seed: 306, col: GUANO_LIGHT },
];

/**
 * Low-poly guano-stained rock of the colony with rings of small faceted pebbles for each nest,
 * relative to the knoll center and its top height (y = 0). Budget: <= 4,000 tris.
 */
export function buildRookeryTris(): Tri[] {
  const tris: Tri[] = [];

  // Irregular faceted guano stains flush with the knoll top
  for (const p of GUANO_PATCHES) {
    const rng = createSeededRng(p.seed);
    const ring: [number, number][] = Array.from({ length: 8 }, (_, i) => {
      const a = -(i / 8) * Math.PI * 2;
      const j = 0.8 + rng() * 0.32;
      return [p.x + Math.cos(a) * p.rx * j, p.z + Math.sin(a) * p.rz * j];
    });
    tris.push(...prism(ring, -0.015, p.h, p.col, p.col, true));
  }

  // Scattered angular rock outcrops around the knoll rim: tall and half sunk, so on the slope of
  // the knoll they rise out of the ground instead of lying on it as flat plates.
  tris.push(
    ...chunk(0.75, 0, -0.45, 0.28, 0.22, 0.22, 19051, ROCK_DARK),
    ...chunk(-0.85, 0, 0.6, 0.24, 0.2, 0.3, 19052, ROCK_LIGHT),
    ...chunk(0.95, 0, 0.5, 0.2, 0.18, 0.2, 19053, ROCK),
    ...chunk(-0.55, 0, -0.75, 0.22, 0.18, 0.18, 19054, ROCK_DARK)
  );

  // Pebble rings for the 9 nests (each nest = 9 small faceted stones + shallow guano cup)
  const pebbleColors = [PEBBLE, PEBBLE_LIGHT, ROCK_DARK] as const;
  NESTS.forEach(([s, p], idx) => {
    const nx = SLIDE_S[0] * s + SLIDE_P[0] * p;
    const nz = SLIDE_S[1] * s + SLIDE_P[1] * p;
    const rng = createSeededRng(7100 + idx * 37);

    // Shallow center cup
    const cupRing: [number, number][] = Array.from({ length: 6 }, (_, i) => {
      const a = -(i / 6) * Math.PI * 2;
      return [nx + Math.cos(a) * 0.095, nz + Math.sin(a) * 0.095];
    });
    tris.push(...prism(cupRing, 0.004, 0.03, GUANO_WARM, GUANO_WARM, false));

    const count = 9;
    for (let k = 0; k < count; k++) {
      const ang = (k / count) * Math.PI * 2 + (rng() - 0.5) * 0.22;
      const rad = 0.105 + rng() * 0.022;
      const px = nx + Math.cos(ang) * rad;
      const pz = nz + Math.sin(ang) * rad;
      const psx = 0.055 + rng() * 0.025;
      const psy = 0.045 + rng() * 0.02;
      const psz = 0.055 + rng() * 0.025;
      const col = pebbleColors[(idx + k) % pebbleColors.length];
      tris.push(...chunk(px, 0.048, pz, psx, psy, psz, 8200 + idx * 31 + k, col));
    }
  });

  return tris;
}

// ---------------------------------------------------------------------------------------------
// 3. Seals (Weddell Seal & Southern Elephant Seal)
// ---------------------------------------------------------------------------------------------

export interface SealPolyParts {
  body: Tri[];
  head: Tri[];
  jaw?: Tri[];
  flipperR: Tri[];
  flipperL: Tri[];
  tail: Tri[];
}

function buildSealFlipper(lengthX: number, reachZ: number, thickness: number, mainCol: number, tipCol: number): Tri[] {
  // Flipper extends from body attachment (z ~ -reachZ*0.58) out to +reachZ (right side)
  const zIn = -reachZ * 0.58;
  const zMid = reachZ * 0.25;
  const zTip = reachZ;
  const rings: Vec3[][] = [
    // Root at shoulder
    [
      [lengthX * 0.35, thickness * 0.5, zIn],
      [lengthX * 0.35, -thickness * 0.5, zIn],
      [-lengthX * 0.35, -thickness * 0.45, zIn],
      [-lengthX * 0.35, thickness * 0.45, zIn],
    ],
    // Mid paddle
    [
      [lengthX * 0.48, thickness * 0.35, zMid],
      [lengthX * 0.48, -thickness * 0.35, zMid],
      [-lengthX * 0.45, -thickness * 0.32, zMid],
      [-lengthX * 0.45, thickness * 0.32, zMid],
    ],
    // Swept-back digit tip
    [
      [lengthX * 0.15, thickness * 0.18, zTip],
      [lengthX * 0.15, -thickness * 0.18, zTip],
      [-lengthX * 0.52, -thickness * 0.15, zTip],
      [-lengthX * 0.52, thickness * 0.15, zTip],
    ],
  ];
  const tris: Tri[] = [];
  for (let k = 0; k < rings.length - 1; k++) {
    const col = k === 0 ? mainCol : tipCol;
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      const a = rings[k][i];
      const b = rings[k][j];
      const d = rings[k + 1][i];
      const e = rings[k + 1][j];
      tris.push([a, e, b, col], [a, d, e, col]);
    }
  }
  const c0 = centroid(rings[0]);
  const cEnd = centroid(rings[2]);
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    tris.push([c0, rings[0][i], rings[0][j], mainCol]);
    tris.push([cEnd, rings[2][j], rings[2][i], tipCol]);
  }
  return tris;
}

function buildSealTailFlukes(baseX: number, tipX: number, spreadZ: number, mainCol: number, tipCol: number): Tri[] {
  const peduncle = loftX(
    [
      { x: baseX - 0.07, cy: -0.008, cz: 0, ry: 0.018, rz: 0.032 },
      { x: baseX, cy: -0.006, cz: 0, ry: 0.025, rz: 0.042 },
    ],
    6,
    mainCol,
    true,
    true
  );
  const flukeR = turn(
    loftX(
      [
        { x: tipX, cy: -0.01, cz: 0, ry: 0.01, rz: 0.032 },
        { x: baseX - 0.03, cy: -0.008, cz: 0, ry: 0.016, rz: 0.028 },
      ],
      4,
      (_s, b) => (b === 0 ? tipCol : mainCol),
      true,
      true,
      Math.PI / 4
    ),
    0.34
  );
  const flukeRight = shift(flukeR, 0, 0, spreadZ * 0.36);
  const flukeLeft = mirrorZTris(flukeRight);
  return [...peduncle, ...flukeRight, ...flukeLeft];
}

/**
 * Low-poly Weddell seal split into animated parts matching WEDDELL_* pivots.
 * Features rounded 10-sided lofted torso, seeded pale mottling, small cat-like head with
 * hinted whiskers and large dark eyes. Budget: <= 800 tris.
 */
export function buildWeddellSealPolyParts(): SealPolyParts {
  const rng = createSeededRng(190451);
  // Pre-roll mottled flank pattern so faces are deterministic
  const flankSpots = Array.from({ length: 60 }, () => rng() < 0.28);

  const body = loftX(
    [
      { x: -0.45, cy: 0.078, cz: 0, ry: 0.048, rz: 0.068, floorY: 0.022 },
      { x: -0.32, cy: 0.105, cz: 0, ry: 0.082, rz: 0.108, floorY: 0.018 },
      { x: -0.14, cy: 0.132, cz: 0, ry: 0.118, rz: 0.142, floorY: 0.015 },
      { x: 0.05, cy: 0.145, cz: 0, ry: 0.122, rz: 0.148, floorY: 0.015 },
      { x: 0.22, cy: 0.16, cz: 0, ry: 0.106, rz: 0.128, floorY: 0.022 },
      { x: 0.34, cy: 0.18, cz: 0, ry: 0.078, rz: 0.098 },
    ],
    10,
    (seg, band) => {
      // seg 0 = +z, 2/3 = top (+y), 5 = -z, 7/8 = belly (-y)
      const a = (seg / 10) * Math.PI * 2;
      const sinA = Math.sin(a + Math.PI / 10);
      if (sinA > 0.55) return SEAL_DORSAL;
      if (sinA < -0.42) return band >= 3 ? SEAL_SPOT : SEAL_BELLY;
      if (band >= 1 && band <= 3 && flankSpots[band * 10 + seg]) return SEAL_SPOT;
      return SEAL_DARK;
    },
    true,
    true
  );

  // Head relative to WEDDELL_NECK = [0.26, 0.18, 0]
  const headBase = loftX(
    [
      { x: -0.005, cy: 0.052, cz: 0, ry: 0.06, rz: 0.078 },
      { x: 0.07, cy: 0.078, cz: 0, ry: 0.068, rz: 0.084 },
      { x: 0.14, cy: 0.072, cz: 0, ry: 0.054, rz: 0.064 },
      { x: 0.195, cy: 0.058, cz: 0, ry: 0.036, rz: 0.044 },
      { x: 0.222, cy: 0.058, cz: 0, ry: 0.016, rz: 0.02 },
    ],
    8,
    (seg, band) => {
      const a = (seg / 8) * Math.PI * 2;
      const sinA = Math.sin(a + Math.PI / 8);
      if (band === 3) return BLACK;
      if (sinA < -0.35 && band >= 1) return SEAL_SPOT;
      return band >= 2 ? SEAL_SNOUT : SEAL_DARK;
    },
    true,
    true
  );

  const headDetails: Tri[] = [];
  for (const side of [1, -1] as const) {
    // Large dark eyes
    const eyePts = Array.from({ length: 5 }, (_, i): Vec3 => {
      const a = (i / 5) * Math.PI * 2;
      return [0.11 + Math.cos(a) * 0.015, 0.104 + Math.sin(a) * 0.015, side * 0.076];
    });
    const eyeApex: Vec3 = [0.112, 0.106, side * 0.089];
    for (let i = 0; i < 5; i++) {
      const j = (i + 1) % 5;
      headDetails.push(side > 0 ? [eyeApex, eyePts[i], eyePts[j], BLACK] : [eyeApex, eyePts[j], eyePts[i], BLACK]);
    }
    // Hinted pale whiskers (two crisp angled triangular filaments per cheek)
    for (const [wy, wzOff] of [[0.056, 0.008], [0.044, -0.004]] as const) {
      headDetails.push(
        ...prism(
          [
            [0.165, side * (0.048 + wzOff)],
            [0.192, side * (0.088 + wzOff)],
            [0.182, side * (0.086 + wzOff)],
          ],
          wy - 0.003,
          wy + 0.003,
          SEAL_SPOT,
          SEAL_SPOT,
          true
        )
      );
    }
  }

  const flipperR = buildSealFlipper(0.14, 0.055, 0.028, SEAL_DORSAL, BLACK);
  const flipperL = mirrorZTris(flipperR);
  const tail = buildSealTailFlukes(-0.025, -0.17, 0.115, SEAL_DORSAL, SEAL_DORSAL);

  void WEDDELL_NECK;
  void WEDDELL_FLIPPER_R;
  void WEDDELL_FLIPPER_L;
  void WEDDELL_TAIL;

  return { body, head: [...headBase, ...headDetails], flipperR, flipperL, tail };
}

/**
 * Low-poly Southern Elephant seal split into animated parts matching ELEPHANT_* pivots.
 * Features massive torso, creased neck rolls, overhanging proboscis and roaring lower jaw.
 * Budget: <= 800 tris.
 */
export function buildElephantSealPolyParts(): SealPolyParts {
  const rng = createSeededRng(190452);
  const flankPatches = Array.from({ length: 90 }, () => rng() < 0.24);

  // Heavy bull torso with neck folds (alternating ridges at x = 0.24..0.39)
  const body = loftX(
    [
      { x: -0.52, cy: 0.085, cz: 0, ry: 0.058, rz: 0.085, floorY: 0.02 },
      { x: -0.34, cy: 0.125, cz: 0, ry: 0.098, rz: 0.132, floorY: 0.015 },
      { x: -0.12, cy: 0.16, cz: 0, ry: 0.14, rz: 0.168, floorY: 0.012 },
      { x: 0.1, cy: 0.185, cz: 0, ry: 0.148, rz: 0.166, floorY: 0.012 },
      // Creased neck rolls (fold 1 crest -> groove -> fold 2 crest -> collar)
      { x: 0.23, cy: 0.225, cz: 0, ry: 0.142, rz: 0.148, floorY: 0.02 },
      { x: 0.285, cy: 0.248, cz: 0, ry: 0.115, rz: 0.122 },
      { x: 0.34, cy: 0.275, cz: 0, ry: 0.122, rz: 0.126 },
      { x: 0.395, cy: 0.292, cz: 0, ry: 0.085, rz: 0.096 },
    ],
    10,
    (seg, band) => {
      const a = (seg / 10) * Math.PI * 2;
      const sinA = Math.sin(a + Math.PI / 10);
      if (sinA > 0.55) return band >= 4 ? ELEPHANT_BACK : BROWN_DARK;
      if (sinA < -0.38) return band >= 4 ? ELEPHANT_CHEST : ELEPHANT_BELLY;
      if (band >= 4) return band % 2 === 0 ? WOOD : BROWN;
      if (flankPatches[band * 10 + seg]) return ELEPHANT_BACK;
      return BROWN;
    },
    true,
    true
  );

  // Head relative to ELEPHANT_NECK = [0.30, 0.28, 0]
  const cranium = loftX(
    [
      { x: 0.0, cy: 0.05, cz: 0, ry: 0.082, rz: 0.098 },
      { x: 0.08, cy: 0.085, cz: 0, ry: 0.08, rz: 0.096 },
      { x: 0.155, cy: 0.082, cz: 0, ry: 0.062, rz: 0.072 },
    ],
    8,
    (seg, band) => {
      const a = (seg / 8) * Math.PI * 2;
      return Math.sin(a + Math.PI / 8) > 0.45 && band >= 1 ? BROWN_DARK : BROWN;
    },
    true,
    true
  );

  // Characteristic overhanging proboscis (drooping curved snout down to y = -0.068)
  const proboscis = loftX(
    [
      { x: 0.14, cy: 0.086, cz: 0, ry: 0.048, rz: 0.056 },
      { x: 0.205, cy: 0.065, cz: 0, ry: 0.046, rz: 0.048 },
      { x: 0.245, cy: 0.015, cz: 0, ry: 0.04, rz: 0.042 },
      { x: 0.262, cy: -0.042, cz: 0, ry: 0.026, rz: 0.032 },
    ],
    6,
    (_seg, band) => (band === 2 ? BLACK : band === 1 ? BROWN_DARK : ELEPHANT_BACK),
    false,
    true
  );

  const headEyes: Tri[] = [];
  for (const side of [1, -1] as const) {
    const eyePts = Array.from({ length: 5 }, (_, i): Vec3 => {
      const a = (i / 5) * Math.PI * 2;
      return [0.11 + Math.cos(a) * 0.014, 0.1 + Math.sin(a) * 0.014, side * 0.09];
    });
    const eyeApex: Vec3 = [0.112, 0.102, side * 0.102];
    for (let i = 0; i < 5; i++) {
      const j = (i + 1) % 5;
      headEyes.push(side > 0 ? [eyeApex, eyePts[i], eyePts[j], BLACK] : [eyeApex, eyePts[j], eyePts[i], BLACK]);
    }
  }

  // Lower jaw relative to ELEPHANT_JAW = [0.42, 0.27, 0]
  const jawOuter = loftX(
    [
      { x: -0.02, cy: 0.0, cz: 0, ry: 0.02, rz: 0.06 },
      { x: 0.05, cy: 0.002, cz: 0, ry: 0.018, rz: 0.052 },
      { x: 0.085, cy: 0.006, cz: 0, ry: 0.012, rz: 0.035 },
    ],
    6,
    (seg) => {
      const a = (seg / 6) * Math.PI * 2;
      return Math.sin(a + Math.PI / 6) > 0.35 ? RED : BROWN_DARK;
    },
    true,
    true
  );

  const flipperR = buildSealFlipper(0.18, 0.095, 0.036, BROWN_DARK, BLACK);
  const flipperL = mirrorZTris(flipperR);
  const tail = buildSealTailFlukes(-0.02, -0.235, 0.132, BROWN_DARK, BLACK);

  void ELEPHANT_NECK;
  void ELEPHANT_JAW;
  void ELEPHANT_FLIPPER_R;
  void ELEPHANT_FLIPPER_L;
  void ELEPHANT_TAIL;

  return {
    body,
    head: [...cranium, ...proboscis, ...headEyes],
    jaw: jawOuter,
    flipperR,
    flipperL,
    tail,
  };
}

/** Soft dark wet contact sheet following a seal's resting beach silhouette. */
export function buildSealContactGeometry(species: 'weddell' | 'elephant'): BufferGeometry {
  if (species === 'elephant') {
    return buildContactDiscGeometry(-0.06, 0, 0.56, 0.24, 0.28, 14);
  }
  return buildContactDiscGeometry(-0.05, 0, 0.46, 0.2, 0.26, 14);
}

// ---------------------------------------------------------------------------------------------
// 4. Gliding Seabirds (Brown Skua & Snow Petrel)
// ---------------------------------------------------------------------------------------------

export interface BirdPolyModel {
  body: Tri[];
  /** Right wing (+z), measured from BIRD_WING_ROOT. */
  wing: Tri[];
  flap: readonly [reach: number, speed: number];
}

function buildSteppedWing(species: 'skua' | 'snowPetrel'): Tri[] {
  const isSkua = species === 'skua';
  const innerCol = isSkua ? BROWN : WHITE;
  const outerCol = isSkua ? BROWN_DARK : ICE;
  const tipCol = isSkua ? BROWN_DARK : ICE;

  // Cambered airfoil stations from root (z = 0) out to wrist/outer wing (z = 0.62)
  const stations: readonly { z: number; leX: number; teX: number; topY: number; botY: number }[] = isSkua
    ? [
        { z: 0.0, leX: 0.125, teX: -0.095, topY: 0.02, botY: -0.015 },
        { z: 0.36, leX: 0.09, teX: -0.085, topY: 0.021, botY: -0.01 },
        { z: 0.52, leX: 0.045, teX: -0.105, topY: 0.016, botY: -0.008 },
        { z: 0.62, leX: -0.01, teX: -0.125, topY: 0.012, botY: -0.006 },
      ]
    : [
        { z: 0.0, leX: 0.115, teX: -0.085, topY: 0.018, botY: -0.014 },
        { z: 0.37, leX: 0.072, teX: -0.08, topY: 0.018, botY: -0.009 },
        { z: 0.53, leX: 0.025, teX: -0.105, topY: 0.014, botY: -0.007 },
        { z: 0.63, leX: -0.03, teX: -0.128, topY: 0.01, botY: -0.005 },
      ];

  // Diamond airfoil ring: leading edge (+x), upper camber (+y), trailing edge (-x), lower (-y)
  const rings: Vec3[][] = stations.map(({ z, leX, teX, topY, botY }) => {
    const midX = leX * 0.45 + teX * 0.55;
    return [
      [leX, (topY + botY) * 0.35, z],
      [midX, topY, z],
      [teX, 0, z],
      [midX, botY, z],
    ];
  });

  const tris: Tri[] = [];
  for (let k = 0; k < rings.length - 1; k++) {
    // Skua has a crisp white primary wing flash on band 1 (z = 0.36..0.52)
    const col = isSkua && k === 1 ? WHITE : k >= 1 ? outerCol : innerCol;
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      const a = rings[k][i];
      const b = rings[k][j];
      const d = rings[k + 1][i];
      const e = rings[k + 1][j];
      tris.push([a, b, e, col], [a, e, d, col]);
    }
  }
  const cRoot = centroid(rings[0]);
  const cOuter = centroid(rings[rings.length - 1]);
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    tris.push([cRoot, rings[0][j], rings[0][i], innerCol]);
    tris.push([cOuter, rings[rings.length - 1][i], rings[rings.length - 1][j], outerCol]);
  }

  // Three stepped slotted primary feathers fanning at the wingtip
  const primaries: readonly [z0: number, z1: number, x0: number, x1: number, w: number][] = isSkua
    ? [
        [0.57, 0.70, -0.005, -0.06, 0.028],
        [0.59, 0.735, -0.045, -0.105, 0.025],
        [0.57, 0.755, -0.085, -0.142, 0.022],
      ]
    : [
        [0.58, 0.71, -0.02, -0.075, 0.025],
        [0.60, 0.74, -0.058, -0.115, 0.022],
        [0.58, 0.76, -0.095, -0.147, 0.02],
      ];

  for (const [z0, z1, x0, x1, w] of primaries) {
    const r0: Vec3[] = [
      [x0 + w, 0, z0],
      [x0, 0.008, z0],
      [x0 - w, 0, z0],
      [x0, -0.006, z0],
    ];
    const tip: Vec3 = [x1, 0.002, z1];
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      tris.push([r0[i], r0[j], tip, tipCol]);
    }
  }

  return tris;
}

function buildBirdBody(species: 'skua' | 'snowPetrel'): Tri[] {
  const isSkua = species === 'skua';
  const backCol = isSkua ? BROWN : WHITE;
  const bellyCol = isSkua ? WOOD : ICE;
  const headCol = isSkua ? BROWN_DARK : WHITE;
  const tailCol = isSkua ? BROWN_DARK : WHITE;
  const footCol = isSkua ? BLACK : SEA_GREY;

  const torso = loftX(
    isSkua
      ? [
          { x: -0.28, cy: 0.006, cz: 0, ry: 0.03, rz: 0.042 },
          { x: -0.06, cy: 0.0, cz: 0, ry: 0.065, rz: 0.08 },
          { x: 0.14, cy: 0.01, cz: 0, ry: 0.06, rz: 0.072 },
          { x: 0.29, cy: 0.045, cz: 0, ry: 0.052, rz: 0.055 },
          { x: 0.37, cy: 0.048, cz: 0, ry: 0.036, rz: 0.038 },
        ]
      : [
          { x: -0.26, cy: 0.005, cz: 0, ry: 0.026, rz: 0.036 },
          { x: -0.05, cy: 0.0, cz: 0, ry: 0.055, rz: 0.07 },
          { x: 0.13, cy: 0.008, cz: 0, ry: 0.05, rz: 0.062 },
          { x: 0.28, cy: 0.04, cz: 0, ry: 0.045, rz: 0.048 },
          { x: 0.355, cy: 0.042, cz: 0, ry: 0.03, rz: 0.032 },
        ],
    6,
    (seg, band) => {
      if (band >= 2) return headCol;
      const a = (seg / 6) * Math.PI * 2;
      return Math.sin(a + Math.PI / 6) < -0.35 ? bellyCol : backCol;
    },
    true,
    true
  );

  // Hooked predatory bill (skua) or sleek short bill (petrel)
  const billX0 = isSkua ? 0.355 : 0.34;
  const billX1 = isSkua ? 0.44 : 0.415;
  const billTipX = isSkua ? 0.475 : 0.445;
  const billY = isSkua ? 0.042 : 0.034;
  const bill = loftX(
    [
      { x: billX0, cy: billY, cz: 0, ry: 0.02, rz: 0.022 },
      { x: billX1, cy: billY - 0.006, cz: 0, ry: 0.012, rz: 0.013 },
      { x: billTipX, cy: billY - (isSkua ? 0.024 : 0.012), cz: 0, ry: 0.004, rz: 0.005 },
    ],
    4,
    BLACK,
    false,
    true,
    Math.PI / 4
  );

  // Eyes
  const eyeX = isSkua ? 0.335 : 0.325;
  const eyeY = isSkua ? 0.068 : 0.06;
  const eyeZ = isSkua ? 0.048 : 0.042;
  const eyes: Tri[] = [];
  for (const side of [1, -1] as const) {
    const pts = Array.from({ length: 4 }, (_, i): Vec3 => {
      const a = (i / 4) * Math.PI * 2;
      return [eyeX + Math.cos(a) * 0.012, eyeY + Math.sin(a) * 0.012, side * (eyeZ - 0.005)];
    });
    const apex: Vec3 = [eyeX, eyeY, side * (eyeZ + 0.007)];
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      eyes.push(side > 0 ? [apex, pts[i], pts[j], BLACK] : [apex, pts[j], pts[i], BLACK]);
    }
  }

  // Fanned tail feathers
  const tailEnd = isSkua ? -0.45 : -0.44;
  const tailSpan = isSkua ? 0.11 : 0.1;
  const tail = prism(
    [
      [-0.24, -0.025],
      [-0.24, 0.025],
      [tailEnd + 0.03, tailSpan],
      [tailEnd, 0],
      [tailEnd + 0.03, -tailSpan],
    ],
    -0.004,
    0.018,
    tailCol,
    tailCol,
    true
  );

  // Tucked feet under tail base
  const feet = prism(
    [
      [-0.08, -0.035],
      [-0.08, 0.035],
      [-0.16, 0.04],
      [-0.16, -0.04],
    ],
    isSkua ? -0.082 : -0.072,
    isSkua ? -0.055 : -0.048,
    footCol,
    footCol,
    true
  );

  return [...torso, ...bill, ...eyes, ...tail, ...feet];
}

export const SKUA_POLY_MODEL: BirdPolyModel = {
  body: buildBirdBody('skua'),
  wing: buildSteppedWing('skua'),
  flap: [0.24, 3.2],
};

export const SNOW_PETREL_POLY_MODEL: BirdPolyModel = {
  body: buildBirdBody('snowPetrel'),
  wing: buildSteppedWing('snowPetrel'),
  flap: [0.16, 2.4],
};

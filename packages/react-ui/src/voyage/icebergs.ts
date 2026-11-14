import { BufferAttribute, BufferGeometry, Color, SRGBColorSpace } from 'three';
import { createSeededRng } from '@antartida/core';
import { ICE, ICE_SHADE, ICE_WALL, WHITE } from './sightingModels.ts';
import { chunk, groundField, type Tri } from './lowPoly.ts';

/**
 * Low-poly icebergs of the open map (SeaLife) and of the iceberg card: faceted ice instead of the
 * columns of the block icebergs, which the Orcadas diorama still uses (SEA_MODELS). One unit long,
 * the water line at y = 0. Illustrations, not to scale.
 */
type Height = (u: number, v: number, noise: number) => number;

/** An iceberg over a ragged footprint `cols` x `rows` cells: the ice faces, its turquoise foot under the water and a few calved pieces. */
function iceberg(cols: number, rows: number, seed: number, height: Height): Tri[] {
  const cell = 1 / cols;
  const rng = createSeededRng(seed + 7);
  const ice = groundField(
    cols,
    rows,
    cell,
    seed,
    (u, v, noise) => {
      const h = height(u, v, noise);
      return h > 0.015 ? h : null;
    },
    (_u, _v, h, steep, noise) => {
      // Walls bluer than snow; the wave-washed lowest band wetter; snow on the flat tops.
      if (h < 0.04) return ICE_SHADE;
      if (steep > 0.6) return ICE_WALL;
      if (steep > 0.3) return noise > 0.5 ? ICE_WALL : ICE;
      return noise > 0.8 ? ICE : WHITE;
    },
    0.03,
  );
  const length = cols * cell;
  const width = rows * cell;
  return [
    ...ice,
    ...chunk(length * 0.62, 0.012, width * 0.38, 0.09, 0.05, 0.07, Math.floor(rng() * 1e6), ICE_WALL),
    ...chunk(length * 0.68, 0.008, width * 0.18, 0.05, 0.03, 0.05, Math.floor(rng() * 1e6), WHITE),
    ...chunk(-length * 0.6, 0.01, -width * 0.36, 0.07, 0.04, 0.09, Math.floor(rng() * 1e6), ICE_WALL),
  ];
}

/** Tabular iceberg: a wide level plateau broken off an ice shelf, its rim falling to the sea and one end collapsed. */
export const ICEBERG_TABULAR_POLY: Tri[] = iceberg(14, 9, 190421, (u, v, noise) => {
  const edge = 1 - Math.hypot(u * 0.95, v) - (noise - 0.5) * 0.22 + (u > 0.3 && v < 0 ? -0.22 : 0);
  if (edge <= 0) return 0;
  return Math.min(0.21, 0.03 + edge * 0.7) + (edge > 0.3 ? (noise - 0.5) * 0.008 : 0);
});

/** Small weathered iceberg: a tall peak off centre, a lower one past a saddle, melted slopes round them. */
export const ICEBERG_PEAKS_POLY: Tri[] = iceberg(11, 8, 190422, (u, v, noise) => {
  // Each peak falls as a sheer cliff on its west side and as a long melted slope on the east one.
  const peak = (cu: number, cv: number, top: number, reach: number) =>
    top * Math.max(0, 1 - Math.hypot((u - cu) * (u < cu ? 2.6 : 1), v - cv) / reach) ** 1.5;
  return Math.max(peak(-0.45, -0.15, 0.5, 1.15), peak(0.45, 0.4, 0.27, 0.6)) + (noise - 0.5) * 0.05;
});

/** The low-poly iceberg of a sea model id, if it is one. */
export const POLY_ICEBERGS: Readonly<Record<string, readonly Tri[]>> = { 'iceberg-lg': ICEBERG_TABULAR_POLY, 'iceberg-sm': ICEBERG_PEAKS_POLY };

// The water round an iceberg, in the colors the ocean shader paints shallow water (ocean.glsl.ts:
// SHALLOW, MID), so the ice under the surface reads as the same sea, lighter where it is shallow.
const SHALLOW: [number, number, number] = [0.53, 0.725, 0.795];
const MID: [number, number, number] = [0.265, 0.445, 0.59];
const FOAM: [number, number, number] = [0.969, 0.98, 0.984];

/** Half length and half width (model units) of the waterline of each iceberg. */
const WATERLINE: Record<'iceberg-lg' | 'iceberg-sm', readonly [number, number]> = { 'iceberg-lg': [0.5, 0.33], 'iceberg-sm': [0.47, 0.34] };
const SEGMENTS = 28;

/** A point on the waterline ring at segment `i`, `k` times its size, wobbled so it is not an ellipse. */
function ringPoint(kind: 'iceberg-lg' | 'iceberg-sm', i: number, k: number): [number, number] {
  const [rx, rz] = WATERLINE[kind];
  const a = (i / SEGMENTS) * Math.PI * 2;
  const wobble = 1 + 0.07 * Math.sin(a * 3 + 1) + 0.04 * Math.sin(a * 7);
  return [0.02 + Math.cos(a) * rx * k * wobble, Math.sin(a) * rz * k * wobble];
}

/** A flat geometry of faces with a color and an alpha per corner, in sRGB, for transparent water. */
function waterGeometry(faces: readonly (readonly [readonly [number, number, number, number, number, number], readonly [number, number, number, number, number, number], readonly [number, number, number, number, number, number]])[]): BufferGeometry {
  const positions = new Float32Array(faces.length * 9);
  const colors = new Float32Array(faces.length * 12);
  const c = new Color();
  faces.forEach((f, i) =>
    f.forEach(([x, z, r, g, b, alpha], k) => {
      positions.set([x, 0, z], i * 9 + k * 3);
      c.setRGB(r, g, b, SRGBColorSpace);
      colors.set([c.r, c.g, c.b, alpha], i * 12 + k * 4);
    }),
  );
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('color', new BufferAttribute(colors, 4));
  return geometry;
}

type Corner = readonly [number, number, number, number, number, number];
const corner = ([x, z]: [number, number], [r, g, b]: [number, number, number], alpha: number): Corner => [x, z, r, g, b, alpha];

/** Bands between rings of the waterline, each ring with its scale, color and alpha. */
function bands(kind: 'iceberg-lg' | 'iceberg-sm', rings: readonly (readonly [number, [number, number, number], number])[], keep: (i: number) => boolean = () => true) {
  const faces: [Corner, Corner, Corner][] = [];
  for (let r = 0; r < rings.length - 1; r++) {
    const [k0, c0, a0] = rings[r];
    const [k1, c1, a1] = rings[r + 1];
    for (let i = 0; i < SEGMENTS; i++) {
      if (!keep(i)) continue;
      const a = corner(ringPoint(kind, i, k0), c0, a0);
      const b = corner(ringPoint(kind, i + 1, k0), c0, a0);
      const c = corner(ringPoint(kind, i + 1, k1), c1, a1);
      const d = corner(ringPoint(kind, i, k1), c1, a1);
      faces.push([a, b, c], [a, c, d]);
    }
  }
  return faces;
}

/**
 * Where the water meets an iceberg, drawn apart from it (SeaLife), all fading into the sea with no
 * edge: the glow of the ice under the surface, the broken foam where the swell breaks on the walls
 * and a ripple that spreads out from it.
 */
export function waterline(kind: 'iceberg-lg' | 'iceberg-sm'): { glow: BufferGeometry; foam: BufferGeometry; ripple: BufferGeometry } {
  const rng = createSeededRng(kind === 'iceberg-lg' ? 51 : 52);
  const broken = Array.from({ length: SEGMENTS }, () => rng() > 0.3);
  return {
    glow: waterGeometry([
      ...Array.from({ length: SEGMENTS }, (_, i): [Corner, Corner, Corner] => [
        corner([0.02, 0], SHALLOW, 0.7),
        corner(ringPoint(kind, i + 1, 0.9), SHALLOW, 0.7),
        corner(ringPoint(kind, i, 0.9), SHALLOW, 0.7),
      ]),
      ...bands(kind, [[0.9, SHALLOW, 0.7], [1.15, SHALLOW, 0.55], [1.45, MID, 0.28], [1.9, MID, 0]]),
    ]),
    foam: waterGeometry(bands(kind, [[0.96, FOAM, 0.9], [1.04, FOAM, 0.55], [1.16, FOAM, 0]], (i) => broken[i])),
    ripple: waterGeometry(bands(kind, [[1, FOAM, 0], [1.06, FOAM, 0.5], [1.14, FOAM, 0]])),
  };
}

/** A ripple spreading from an iceberg: its scale and opacity at a phase 0..1. */
export const rippleAt = (phase: number) => ({ scale: 1 + phase * 0.8, opacity: 0.55 * (1 - phase) ** 1.5 });

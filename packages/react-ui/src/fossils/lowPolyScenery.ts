import { chunk, type Tri, type Vec3 } from '../voyage/lowPoly.ts';
import { body, column } from './lowPolyFossils.ts';
import { FOSSIL_PALETTE as C } from './models.ts';

/**
 * Low-poly scenery of Fósiles (#7, rule 30): the plants of the Cretaceous forest, the life of the
 * sea floors, the camp and the remains. Illustrations after the La Lupa descriptions and the camp
 * photographs; one unit is the height (plants, props) or length (animals, remains) of each model.
 */

/** The faces seen from both sides: thin leaves and fronds have no inside. */
const twoSided = (tris: readonly Tri[]): Tri[] => tris.flatMap((t) => [t, [t[0], t[2], t[1], t[3]] as Tri]);

/**
 * A leaf or frond from `base` out to `tip`, arching down by `droop` at its end, `width` wide at its
 * middle: a strip of quads, seen from both sides.
 */
function frond(base: Vec3, tip: Vec3, width: number, droop: number, color: number | ((i: number) => number), steps = 4): Tri[] {
  const dx = tip[0] - base[0], dz = tip[2] - base[2];
  const l = Math.hypot(dx, dz) || 1;
  const side: Vec3 = [-dz / l, 0, dx / l];
  const at = (t: number, s: number): Vec3 => {
    const w = Math.sin(Math.PI * Math.min(1, t * 1.15)) * width * 0.5 * s;
    return [base[0] + dx * t + side[0] * w, base[1] + (tip[1] - base[1]) * t - droop * t * t, base[2] + dz * t + side[2] * w];
  };
  const tris: Tri[] = [];
  for (let i = 0; i < steps; i++) {
    const t0 = i / steps, t1 = (i + 1) / steps;
    const c = typeof color === 'number' ? color : color(i);
    // The leaf starts and ends in a point: a face with two equal corners is left out.
    for (const t of [[at(t0, -1), at(t1, -1), at(t1, 1)], [at(t0, -1), at(t1, 1), at(t0, 1)]] as const) {
      const same = (p: Vec3, q: Vec3) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) < 1e-9;
      if (!same(t[0], t[1]) && !same(t[1], t[2]) && !same(t[0], t[2])) tris.push([t[0], t[1], t[2], c]);
    }
  }
  return twoSided(tris);
}

// --- Cretaceous forest ----------------------------------------------------------------------

/** Tall conifer: a tapering trunk and five tiers of drooping needles, darker and lighter. */
export const CONIFER_TRIS: readonly Tri[] = [
  ...column(0, 0, [[0, 0.06, 0.06], [0.05, 0.04, 0.04], [0.9, 0.025, 0.025]], 6, C.bark),
  ...[0, 1, 2, 3, 4].flatMap((k) => {
    const y = 0.3 + k * 0.15;
    const r = 0.27 - k * 0.045;
    return column(0, 0, [[y, r, r], [y + 0.05, r * 0.85, r * 0.85], [y + 0.2, 0.012, 0.012]], 7, k % 2 ? C.conifer : C.coniferLight);
  }),
];

/** Cycad: a stout scaly trunk and a crown of stiff, arching fronds. */
export const CYCAD_TRIS: readonly Tri[] = [
  ...column(0, 0, [[0, 0.085, 0.085], [0.12, 0.08, 0.08], [0.24, 0.085, 0.085], [0.32, 0.07, 0.07]], 7, (band) => (band % 2 ? C.bark : C.forestSoil)),
  ...Array.from({ length: 9 }, (_, i) => {
    const a = (i / 9) * Math.PI * 2;
    return frond([0, 0.32, 0], [Math.cos(a) * 0.42, 0.45, Math.sin(a) * 0.42], 0.12, 0.18, (s) => (s < 2 ? C.cycad : C.fern));
  }).flat(),
];

/** Fern: a tuft of fronds unrolling from the ground. */
export const FERN_TRIS: readonly Tri[] = [
  ...column(0, 0, [[0, 0.07, 0.07], [0.04, 0.05, 0.05]], 6, C.forestSoil),
  ...Array.from({ length: 7 }, (_, i) => {
    const a = (i / 7) * Math.PI * 2 + 0.3;
    return frond([0, 0.04, 0], [Math.cos(a) * 0.32, 0.26, Math.sin(a) * 0.32], 0.11, 0.2, i % 2 ? C.leaf : C.fern);
  }).flat(),
];

/** Broad-leaved tree: a trunk with one branch and a crown of leafy masses. */
export const BROADLEAF_TRIS: readonly Tri[] = [
  ...column(0, 0, [[0, 0.06, 0.06], [0.5, 0.035, 0.035], [0.62, 0.03, 0.03]], 6, C.bark),
  ...body([[0, 0.45, 0.022, 0.022], [0.16, 0.52, 0.015, 0.015]], () => C.bark, [C.bark, C.bark], 5),
  ...chunk(0, 0.72, 0, 0.5, 0.34, 0.46, 401, C.leaf),
  ...chunk(0.16, 0.62, 0.08, 0.32, 0.24, 0.3, 402, C.fern),
  ...chunk(-0.14, 0.66, -0.1, 0.3, 0.24, 0.32, 403, C.fern),
  ...chunk(0.04, 0.88, -0.04, 0.3, 0.2, 0.28, 404, C.leaf),
];

/** Fossil trunk lying on the gravel: the evidence that forests grew here, broken in stony bands. */
export const LOG_TRIS: readonly Tri[] = body(
  Array.from({ length: 9 }, (_, i): [number, number, number, number] => [-0.5 + i * 0.125, 0.06, 0.055 + Math.sin(i * 1.7) * 0.006, 0.06 + Math.cos(i * 1.3) * 0.006]),
  (band, seg) => (seg >= 6 ? C.rock : band % 3 === 0 ? C.strataGrey : band % 3 === 1 ? C.light : C.rock),
  [C.light, C.light], 8,
);

/** Every model of this file, for the test of least detail. */
export const FOSSIL_SCENERY_MODELS: Readonly<Record<string, readonly Tri[]>> = {
  'cretaceous-conifer': CONIFER_TRIS, 'cretaceous-cycad': CYCAD_TRIS, 'cretaceous-fern': FERN_TRIS,
  'cretaceous-broadleaf': BROADLEAF_TRIS, 'fossil-log': LOG_TRIS,
};

import { block, chamferRect, chunk, lathe, prism, quad, strut, type Tri, type Vec3 } from '../voyage/lowPoly.ts';
import { body, column, spike } from './lowPolyFossils.ts';
import { FOSSIL_PALETTE as C, PLESIO_VERTEBRAE, plesioVertebra } from './models.ts';

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

// --- Sea floors: Cretaceous and Eocene ------------------------------------------------------

/** Bryozoan colony: a reddish base and stiff branching twigs, pale with red tips. */
export const BRYOZOAN_TRIS: readonly Tri[] = [
  ...chunk(0, 0.04, 0, 0.16, 0.08, 0.16, 501, C.bryozoanRed),
  ...Array.from({ length: 9 }, (_, i) => {
    const a = i * 2.1;
    const h = 0.2 + (i % 4) * 0.07;
    const mid: Vec3 = [Math.cos(a) * 0.05, h * 0.55, Math.sin(a) * 0.05];
    const tip: Vec3 = [Math.cos(a) * (0.06 + h * 0.3), h, Math.sin(a) * (0.06 + h * 0.3)];
    return [...strut([0, 0.05, 0], mid, 0.016, C.bryozoan), ...strut(mid, tip, 0.013, i % 3 ? C.bryozoan : C.bryozoanRed)];
  }).flat(),
];

/** Brachiopod: a lens of two valves with radial ribs, the hinge and its stalk opening at the back. */
export const BRACHIOPOD_TRIS: readonly Tri[] = [
  ...body([[-0.13, 0.04, 0.01, 0.03], [-0.08, 0.06, 0.05, 0.09], [0.02, 0.06, 0.06, 0.11], [0.1, 0.05, 0.045, 0.09], [0.13, 0.04, 0.01, 0.03]],
    (_, seg) => (seg % 2 ? C.brachiopod : seg < 5 ? C.light : C.shellStripe), [C.dark, C.brachiopod], 10),
  ...block(-0.15, 0.03, 0, 0.04, 0.03, 0.04, C.dark),
];

/** Sea urchin: a low dome with its spines all round and one on top. */
export const URCHIN_TRIS: readonly Tri[] = [
  ...column(0, 0, [[0, 0.11, 0.11], [0.06, 0.13, 0.13], [0.13, 0.1, 0.1], [0.17, 0.05, 0.05]], 10, (band, seg) => (band === 1 && seg % 2 ? C.urchinSpine : C.urchin)),
  ...Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2;
    const y = 0.07 + (i % 2) * 0.05;
    return spike([Math.cos(a) * 0.12, y, Math.sin(a) * 0.12], [Math.cos(a) * 0.09, 0.03, Math.sin(a) * 0.09], 0.01, C.urchinSpine);
  }).flat(),
  ...spike([0, 0.16, 0], [0, 0.06, 0], 0.012, C.urchinSpine),
];

/** Sea lily: a jointed stalk; the crown of arms sways from CRINOID_TOP as one part. */
export const CRINOID_STALK_TRIS: readonly Tri[] = [
  ...column(0, 0, [[0, 0.07, 0.07], [0.04, 0.04, 0.04]], 7, C.crinoid),
  ...column(0, 0, Array.from({ length: 11 }, (_, i): [number, number, number] => [0.03 + i * 0.07, i % 2 ? 0.02 : 0.024, i % 2 ? 0.02 : 0.024]), 6, (band) => (band % 2 ? C.crinoid : C.crinoidLight)),
];
export const CRINOID_TOP: Vec3 = [0, 0.76, 0];
export const CRINOID_CROWN_TRIS: readonly Tri[] = [
  ...column(0, 0, [[0, 0.03, 0.03], [0.05, 0.06, 0.06], [0.07, 0.05, 0.05]], 7, C.crinoid),
  ...Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2;
    const out = 0.08 + (i % 2) * 0.03;
    const mid: Vec3 = [Math.cos(a) * out, 0.14, Math.sin(a) * out];
    const tip: Vec3 = [Math.cos(a) * (out + 0.06), 0.22 + (i % 2) * 0.03, Math.sin(a) * (out + 0.06)];
    return [...strut([Math.cos(a) * 0.04, 0.06, Math.sin(a) * 0.04], mid, 0.012, i % 2 ? C.crinoidLight : C.crinoid), ...strut(mid, tip, 0.009, C.crinoidLight)];
  }).flat(),
];

/** Chiton: eight overlapping valves on an oval girdle, two dark eyes in front. */
export const CHITON_TRIS: readonly Tri[] = [
  ...column(0, 0, [[0, 0.25, 0.12], [0.035, 0.24, 0.115], [0.04, 0.2, 0.09]], 12, C.chiton),
  ...Array.from({ length: 8 }, (_, i) => {
    const x = -0.21 + i * 0.06;
    const end = i === 0 || i === 7;
    return body([[x - 0.034, 0.04, 0.005, 0.07], [x, 0.04, end ? 0.025 : 0.035, end ? 0.07 : 0.085], [x + 0.034, 0.04, 0.005, 0.07]],
      () => (i % 2 ? C.chitonLight : C.chiton), [C.chiton, C.chiton], 8);
  }).flat(),
  ...block(0.245, 0.03, 0.035, 0.02, 0.015, 0.015, C.ink),
  ...block(0.245, 0.03, -0.035, 0.02, 0.015, 0.015, C.ink),
];

/** Giant inoceramid bivalve of the Cretaceous sea floor: a broad low shell with growth rings. */
export const INOCERAMUS_TRIS: readonly Tri[] = [
  ...column(0, 0, [[0, 0.45, 0.35], [0.06, 0.44, 0.34], [0.1, 0.38, 0.29], [0.13, 0.3, 0.23], [0.15, 0.2, 0.15], [0.16, 0.08, 0.06]], 14,
    (band) => (band % 2 ? C.light : band === 0 ? C.inoceramus : C.shellStripe)),
  ...block(-0.44, 0.06, 0, 0.06, 0.08, 0.3, C.dark),
];

/** Rock slab with two small sea stars and a printed scale, as in the Bill Hill photograph (stars apart). */
export const STAR_SLAB_TRIS: readonly Tri[] = [
  ...prism(chamferRect(0, 0, 1.4, 0.9, 0.08), 0, 0.12, C.seaFloorDark, C.seaFloorDark, true),
  ...prism(chamferRect(0.02, 0, 1.3, 0.82, 0.06), 0.12, 0.13, C.sand, C.sand),
  // Printed scale bar: alternating centimeter blocks
  ...Array.from({ length: 6 }, (_, i) => block(-0.55 + i * 0.1, 0.136, 0.34, 0.1, 0.012, 0.06, i % 2 ? C.ink : C.canvas)).flat(),
  // Fragments of the associated fauna
  ...chunk(0.42, 0.15, -0.25, 0.14, 0.04, 0.1, 511, C.brachiopod), ...chunk(0.5, 0.15, 0.12, 0.08, 0.04, 0.08, 512, C.bryozoan),
  ...chunk(-0.4, 0.15, -0.28, 0.12, 0.04, 0.07, 513, C.shellStripe), ...chunk(-0.52, 0.15, 0.05, 0.1, 0.05, 0.1, 514, C.urchin),
];

// --- Camp -----------------------------------------------------------------------------------

/** Pyramid field tent, like the ones in the camp photographs: a dark band, a skirt, the door and pegs. */
export const TENT_TRIS: readonly Tri[] = (() => {
  const h = 0.9;
  const r0 = 0.72;
  // Four-sided: corners at 45 degrees, so the faces look along +x, -x, +z and -z.
  const sides = lathe(0, 0, [[0.04, r0], [0.3, r0 * 0.7], [0.36, r0 * 0.62], [h, 0.05], [h + 0.05, 0]], 4, (_, band) => (band === 1 ? C.tentDark : C.tent), Math.PI / 4);
  const skirt = prism(chamferRect(0, 0, 1.06, 1.06, 0.02), 0, 0.04, C.tentDark, C.tentDark);
  // The door on the +z face, just off the cloth.
  const faceZ = (y: number) => (r0 * Math.SQRT1_2) * (1 - (y - 0.04) / (h - 0.04)) + 0.006;
  const door = quad([-0.11, 0.04, faceZ(0.04)], [0.11, 0.04, faceZ(0.04)], [0.06, 0.4, faceZ(0.4)], [-0.06, 0.4, faceZ(0.4)], C.tentDark);
  const vent = quad([-0.05, 0.56, faceZ(0.56)], [0.05, 0.56, faceZ(0.56)], [0.04, 0.62, faceZ(0.62)], [-0.04, 0.62, faceZ(0.62)], C.canvas);
  const pegs = [[0.55, 0.55], [-0.55, 0.55], [0.55, -0.55], [-0.55, -0.55]].flatMap(([x, z]) => block(x, 0.04, z, 0.04, 0.08, 0.04, C.metal));
  return [...sides, ...skirt, ...door, ...vent, ...pegs, ...strut([0, h, 0], [0, h + 0.08, 0], 0.012, C.ink)];
})();

/** A field crate: a box is a box, so it keeps its shape; lid, straps, label and feet. */
export const CRATE_TRIS: readonly Tri[] = [
  ...block(0, 0.2, 0, 0.6, 0.36, 0.4, C.crate),
  ...block(0, 0.4, 0, 0.62, 0.04, 0.42, C.crateDark),
  ...block(0, 0.2, 0, 0.62, 0.05, 0.41, C.crateDark),
  ...block(0, 0.2, 0, 0.61, 0.05, 0.42, C.crateDark),
  ...block(0.12, 0.3, 0.203, 0.18, 0.08, 0.006, C.canvas),
  ...block(0.12, 0.3, 0.207, 0.12, 0.02, 0.004, C.ink),
  ...[[-0.24, 0.16], [0.24, 0.16], [-0.24, -0.16], [0.24, -0.16]].flatMap(([x, z]) => block(x, 0.01, z, 0.06, 0.02, 0.06, C.crateDark)),
];

/** Sled with upturned runners and a wrapped load, as in the photograph of the ammonite being moved. */
export const SLED_TRIS: readonly Tri[] = [
  ...prism(chamferRect(0, 0, 1, 0.42, 0.04), 0.03, 0.06, C.canvas),
  ...[0.2, -0.2].flatMap((z) => [
    ...strut([-0.52, 0.015, z], [0.42, 0.015, z], 0.012, C.metal),
    ...strut([0.42, 0.015, z], [0.56, 0.09, z], 0.012, C.metal),
  ]),
  ...column(0, 0, [[0.06, 0.2, 0.15], [0.18, 0.21, 0.155], [0.26, 0.15, 0.11], [0.28, 0.08, 0.06]], 8, (band) => (band === 2 ? C.shellStripe : C.shell)),
  ...[-0.12, 0.12].flatMap((x) => block(x, 0.17, 0, 0.02, 0.22, 0.32, C.ink)),
  ...[0.12, -0.12].flatMap((z) => strut([0.56, 0.09, z], [0.74, 0.09, z * 0.6], 0.008, C.ink)),
];

/** Radio mast with a pennant, a landmark of every camp photograph. */
export const MAST_TRIS: readonly Tri[] = [
  ...prism(chamferRect(0, 0, 0.16, 0.16, 0.02), 0, 0.1, C.crateDark),
  ...Array.from({ length: 8 }, (_, i) => strut([0, 0.1 + i * 0.1, 0], [0, 0.2 + i * 0.1, 0], 0.016, i % 2 ? C.metal : C.canvas)).flat(),
  ...strut([-0.06, 0.97, 0], [0.06, 0.97, 0], 0.008, C.metal),
  // The pennant: a triangle of cloth, seen from both sides.
  ...[[[0, 0.94, 0], [0, 0.86, 0], [0.22, 0.9, 0.01]] as Vec3[]].flatMap(([a, b, c]) => [[a, b, c, C.tent], [a, c, b, C.tent]] as Tri[]),
  ...strut([0, 0.9, 0], [0, 1.04, 0], 0.008, C.ink),
];

// --- Remains --------------------------------------------------------------------------------

/** The jaw fragment of 1986: a bone with its sockets and the leaf-shaped tooth, crown wider than root. */
export const JAW_TOOTH_CENTER: Vec3 = [0.06, 0.31, 0];
export const JAW_TRIS: readonly Tri[] = [
  ...body([[-0.44, 0.1, 0.04, 0.06], [-0.32, 0.11, 0.06, 0.08], [0.1, 0.12, 0.07, 0.09], [0.22, 0.15, 0.1, 0.08], [0.32, 0.16, 0.07, 0.06]],
    (_, seg) => (seg >= 6 ? C.rib : C.bone), [C.rib, C.bone], 8),
  ...Array.from({ length: 6 }, (_, i) => block(-0.32 + i * 0.075, 0.19, 0.035, 0.035, 0.012, 0.05, C.dark)).flat(),
  ...column(0.06, 0, [[0.18, 0.02, 0.014], [0.27, 0.028, 0.016], [0.32, 0.05, 0.018], [0.36, 0.035, 0.016], [0.39, 0.01, 0.01]], 6, C.bone),
];

/** Recovered pieces of Antarctopelta laid on the ground: vertebrae, ribs, a limb bone and armor plates. */
export const DINO_BONES_TRIS: readonly Tri[] = [
  ...body([[-0.41, 0.03, 0.025, 0.03], [-0.34, 0.03, 0.02, 0.025], [-0.22, 0.03, 0.02, 0.025], [-0.19, 0.035, 0.03, 0.035]], () => C.bone, [C.boneShade, C.boneShade], 6),
  ...[-0.1, 0, 0.1].flatMap((x, i) => column(x, 0.11, [[0, 0.04, 0.04], [0.05, 0.035, 0.035], [0.065, 0.02, 0.02]], 6, i === 1 ? C.boneShade : C.bone)),
  ...strut([0.09, 0.015, -0.12], [0.33, 0.02, -0.13], 0.015, C.rib),
  ...strut([0.07, 0.015, -0.19], [0.28, 0.02, -0.22], 0.015, C.rib),
  ...chunk(-0.15, 0.015, -0.22, 0.08, 0.03, 0.07, 601, C.armor), ...chunk(-0.05, 0.015, -0.25, 0.06, 0.03, 0.06, 602, C.armor),
  ...chunk(0.32, 0.015, 0.05, 0.07, 0.03, 0.06, 603, C.armor), ...chunk(0.38, 0.015, 0.16, 0.07, 0.03, 0.05, 604, C.armorDark),
  ...body([[-0.46, 0.04, 0.03, 0.035], [-0.38, 0.035, 0.022, 0.025], [-0.3, 0.035, 0.025, 0.03]], () => C.boneShade, [C.bone, C.bone], 6)
    .map(([a, b, c, col]): Tri => [[a[0], a[1], a[2] + 0.15], [b[0], b[1], b[2] + 0.15], [c[0], c[1], c[2] + 0.15], col]),
];

/** Ribs, girdles and four paddles of small phalanges of the plesiosaur; the vertebrae are drawn apart. */
export const PLESIO_BONES_TRIS: readonly Tri[] = [
  ...Array.from({ length: 8 }, (_, i) => {
    const [x, , z] = plesioVertebra(27 + i * 1.6);
    return [...strut([x, 0.012, z + 0.02], [x - 0.015, 0.012, z + 0.16], 0.007, C.boneShade), ...strut([x, 0.012, z - 0.02], [x - 0.015, 0.012, z - 0.16], 0.007, C.boneShade)];
  }).flat(),
  ...chunk(0.0, 0.01, 0, 0.1, 0.02, 0.22, 611, C.bone), ...chunk(-0.2, 0.01, 0, 0.09, 0.02, 0.2, 612, C.bone),
  ...[[0.0, 1], [0.0, -1], [-0.2, 1], [-0.2, -1]].flatMap(([x, s]) =>
    Array.from({ length: 6 }, (_, k) => chunk(x - 0.015 * k, 0.008, s * (0.14 + k * 0.035), 0.03 - k * 0.003, 0.014, 0.026, 620 + k, k % 2 ? C.bone : C.boneShade)).flat()),
];

/** One vertebra, a short six-sided spool one unit wide and tall, white: its color is set per instance. */
export const VERTEBRA_TRIS: readonly Tri[] = column(0, 0, [[-0.5, 0.42, 0.42], [-0.3, 0.5, 0.5], [0.3, 0.5, 0.5], [0.5, 0.42, 0.42]], 6, 0xffffff);

/** Every model of this file, for the test of least detail. */
export const FOSSIL_SCENERY_MODELS: Readonly<Record<string, readonly Tri[]>> = {
  'cretaceous-conifer': CONIFER_TRIS, 'cretaceous-cycad': CYCAD_TRIS, 'cretaceous-fern': FERN_TRIS,
  'cretaceous-broadleaf': BROADLEAF_TRIS, 'fossil-log': LOG_TRIS,
  'eocene-bryozoan': BRYOZOAN_TRIS, 'eocene-brachiopod': BRACHIOPOD_TRIS, 'eocene-urchin': URCHIN_TRIS,
  'eocene-crinoid': [...CRINOID_STALK_TRIS, ...CRINOID_CROWN_TRIS.map(([a, b, c, col]): Tri => [
    [a[0], a[1] + CRINOID_TOP[1], a[2]], [b[0], b[1] + CRINOID_TOP[1], b[2]], [c[0], c[1] + CRINOID_TOP[1], c[2]], col])],
  'eocene-chiton': CHITON_TRIS, 'inoceramid-bivalve': INOCERAMUS_TRIS, 'star-slab': STAR_SLAB_TRIS,
  'field-tent': TENT_TRIS, 'field-crate': CRATE_TRIS, 'field-sled': SLED_TRIS, 'field-mast': MAST_TRIS,
  'fossil-jaw': JAW_TRIS, 'antarctopelta-bones': DINO_BONES_TRIS,
  'plesiosaur-skeleton': [...PLESIO_BONES_TRIS, ...Array.from({ length: PLESIO_VERTEBRAE }, (_, i) => {
    const [x, y, z, size] = plesioVertebra(i);
    return VERTEBRA_TRIS.map(([a, b, c]): Tri => [
      [x + a[0] * size * 0.85, y + a[1] * size, z + a[2] * size * 1.15], [x + b[0] * size * 0.85, y + b[1] * size, z + b[2] * size * 1.15],
      [x + c[0] * size * 0.85, y + c[1] * size, z + c[2] * size * 1.15], i % 2 ? C.bone : C.boneShade]);
  }).flat()],
};

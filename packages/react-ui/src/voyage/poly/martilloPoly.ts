import { buildPenguinPolyParts } from '../../orcadas/lowPolyAnimals.ts';
import { PENGUIN_NECK, PENGUIN_SHOULDER } from '../../orcadas/penguins.ts';
import { chunk, facingOut, groundField, mirrorZ, ngon, prism, scaled, shift, spike, turn, type Tri, type Vec3 } from '../lowPoly.ts';
import { VOXEL_PALETTE } from '../../orcadas/stationModels.ts';

// The colony of Isla Martillo, low-poly, with the footprint of COLONY in sightingModels.ts: a low
// island of grass and trampled earth with a rocky shore, and six Magellanic penguins on it. The
// penguins reuse the Orcadas low-poly penguin (body, flippers, head and bill) and add only the
// Magellanic marks: a white band from above the eye round to the throat and a black breast band.
// An illustration, not a survey.

// Named colors of the Orcadas palette (BLACK, WHITE, RED, ROCK and GRASS have the values of
// sightingModels.ts), so this file does not import sightingModels.ts, which will import it.
const { BLACK, WHITE, RED, ROCK, ROCK_DARK, GRASS } = VOXEL_PALETTE;
/** A darker grass for the tussocks and the shaded tufts. */
const GRASS_DARK = 0x7f8f55;
/** Trampled earth of the colony (the top patch of COLONY). */
const EARTH = 0xb3a878;
/** Mouth of a nesting burrow. */
const BURROW = 0x4a3f33;

/** Island: semi-axes of its outline, the part of it that is flat, and the height of that flat top. */
const ISLAND_RX = 0.53;
const ISLAND_RZ = 0.4;
const ISLAND_FLAT = 0.82;
const ISLAND_TOP = 0.07;

/** Size of a penguin: about the height of the block penguins of COLONY (penguinAt at k = 0.5). */
const PENGUIN_K = 0.44;

/** A ring of a lofted shape round y: [height, center x, half length, half width, front stretch]. */
type Ring = readonly [number, number, number, number, number];
/** The rings, segments and phase of the Orcadas penguin torso and head (buildPenguinPolyParts). */
const TORSO: readonly Ring[] = [
  [0.04, -0.01, 0.115, 0.112, 1],
  [0.15, -0.005, 0.132, 0.13, 1.05],
  [0.31, 0, 0.128, 0.125, 1.06],
  [0.45, 0, 0.112, 0.11, 1.04],
  [0.55, 0, 0.095, 0.095, 1],
];
const HEAD: readonly Ring[] = [
  [0.015, 0.01, 0.092, 0.094, 1],
  [0.092, 0.014, 0.092, 0.094, 1.08],
  [0.168, 0.006, 0.048, 0.05, 1],
];

const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/**
 * A point on the faceted surface of a lofted shape at height `y` and angle `angle` (from +x towards
 * +z), pushed out from its axis by `push`, so a mark painted there lies just over the facets.
 */
function onSurface(rings: readonly Ring[], segments: number, y: number, angle: number, push: number): Vec3 {
  const phase = Math.PI / segments;
  const step = (Math.PI * 2) / segments;
  const k = Math.max(0, Math.min(rings.length - 2, rings.findIndex((_r, i) => i < rings.length - 1 && y <= rings[i + 1][0])));
  const t = (y - rings[k][0]) / (rings[k + 1][0] - rings[k][0]);
  const s = (phase - angle) / step;
  const f = s - Math.floor(s);
  const vertex = ([ry, cx, rx, rz, front]: Ring, a: number): Vec3 => [cx + Math.cos(a) * (Math.cos(a) > 0 ? rx * front : rx), ry, Math.sin(a) * rz];
  const a0 = phase - Math.floor(s) * step;
  const a1 = a0 - step;
  const p = lerp3(lerp3(vertex(rings[k], a0), vertex(rings[k], a1), f), lerp3(vertex(rings[k + 1], a0), vertex(rings[k + 1], a1), f), t);
  const cx = rings[k][1] + (rings[k + 1][1] - rings[k][1]) * t;
  return [cx + (p[0] - cx) * push, p[1], p[2] * push];
}

/** A strip of faces between two rows of points, turned out from `inside`. */
function strip(inner: readonly Vec3[], outer: readonly Vec3[], color: number, inside: Vec3): Tri[] {
  const out: Tri[] = [];
  for (let i = 0; i < inner.length - 1; i++) {
    out.push(facingOut(inner[i], outer[i], outer[i + 1], color, inside), facingOut(inner[i], outer[i + 1], inner[i + 1], color, inside));
  }
  return out;
}

const deg = (d: number) => (d * Math.PI) / 180;

/**
 * The white head band of one side (+z), in head coordinates: from above the eye, back behind it
 * and down to the throat, as [angle in degrees from +x, height].
 */
const HEAD_BAND: readonly (readonly [number, number])[] = [
  [38, 0.126], [62, 0.137], [88, 0.13], [110, 0.105], [118, 0.07], [106, 0.04], [84, 0.03], [62, 0.028],
];
const HEAD_BAND_HALF = 0.011;
/** Mean radius of the head, to measure the band's width along the angle. */
const HEAD_R = 0.09;

function headBand(): Tri[] {
  const inner: Vec3[] = [];
  const outer: Vec3[] = [];
  HEAD_BAND.forEach(([a, y], i) => {
    const [pa, py] = HEAD_BAND[Math.max(0, i - 1)];
    const [na, ny] = HEAD_BAND[Math.min(HEAD_BAND.length - 1, i + 1)];
    const ta = deg(na - pa) * HEAD_R;
    const ty = ny - py;
    const l = Math.hypot(ta, ty);
    const [oa, oy] = [(-ty / l) * HEAD_BAND_HALF, (ta / l) * HEAD_BAND_HALF];
    const clampY = (v: number) => Math.min(0.16, Math.max(0.018, v));
    inner.push(onSurface(HEAD, 8, clampY(y - oy), deg(a) - oa / HEAD_R, 1.06));
    outer.push(onSurface(HEAD, 8, clampY(y + oy), deg(a) + oa / HEAD_R, 1.06));
  });
  const side = strip(inner, outer, WHITE, [0.01, 0.09, 0]);
  return [...side, ...mirrorZ(side)];
}

/** The black breast band across the white front of the torso, at the facets' corners. */
function breastBand(): Tri[] {
  const angles = [90, 54, 18, -18, -54].map(deg);
  const row = (y: number) => angles.map((a) => onSurface(TORSO, 10, y, a, 1.03));
  return strip(row(0.4), row(0.435), BLACK, [0, 0.42, 0]);
}

/**
 * A Magellanic penguin standing at the origin, beak to +x, feet on y = 0, at full Orcadas size:
 * the Orcadas body and flippers, the Orcadas head with its bill all black and no eye rings, and
 * the Magellanic head and breast bands.
 */
function magellanic(): Tri[] {
  const body = buildPenguinPolyParts('chinstrap');
  const head = buildPenguinPolyParts('adelie').head
    .filter((t) => t[3] !== WHITE)
    .map(([a, b, c, col]): Tri => [a, b, c, col === RED ? BLACK : col]);
  const [sx, sy, sz] = PENGUIN_SHOULDER;
  return [
    ...body.body,
    ...breastBand(),
    ...shift([...head, ...headBand()], ...PENGUIN_NECK),
    ...shift(body.flipper, sx, sy, sz),
    ...shift(mirrorZ(body.flipper), sx, sy, -sz),
  ];
}

/** Where the penguins of COLONY stand, with the way each one faces. */
const PENGUINS: readonly (readonly [number, number, number])[] = [
  [-0.3, -0.12, 0.3], [0, 0.15, -0.6], [0.3, -0.1, 0.2],
  [-0.15, 0.28, 1.2], [0.25, 0.25, -0.3], [0.05, -0.25, 2.6],
];

/** The island: a field of faces over an ellipse, flat on top, falling to y = 0 as a rocky shore. */
function island(): Tri[] {
  const cols = 13;
  const rows = 9;
  const cell = 0.09;
  const ellipse = (u: number, v: number) => Math.hypot((u * cols * cell) / 2 / ISLAND_RX, (v * rows * cell) / 2 / ISLAND_RZ);
  return groundField(
    cols,
    rows,
    cell,
    211,
    (u, v, noise) => {
      const e = ellipse(u, v);
      if (e >= 1) return null;
      return e < ISLAND_FLAT ? ISLAND_TOP : ISLAND_TOP * ((1 - e) / (1 - ISLAND_FLAT)) * (0.85 + noise * 0.3);
    },
    (u, v, _h, steep, noise) => {
      if (steep > 0.3) return noise > 0.5 ? ROCK : ROCK_DARK;
      if (ellipse(u, v) < 0.55) return noise > 0.85 ? GRASS : EARTH;
      return noise > 0.7 ? GRASS_DARK : GRASS;
    },
    0,
  );
}

/** A tuft of tussock grass on the island top. */
const tussock = (x: number, z: number): Tri[] =>
  [[0.018, 0.06, 0.01], [-0.016, 0.055, 0.014], [0.004, 0.065, -0.018]].flatMap(([dx, dy, dz]) =>
    spike([x, ISLAND_TOP - 0.004, z], [dx, dy, dz], 0.012, GRASS_DARK));

/** A nesting burrow: a dark mouth with its mound of dug earth behind it (to -x). */
const burrow = (x: number, z: number): Tri[] => [
  ...prism(ngon(x, z, 0.038, 7), ISLAND_TOP - 0.01, ISLAND_TOP + 0.003, BURROW),
  ...chunk(x - 0.045, ISLAND_TOP + 0.012, z, 0.07, 0.03, 0.08, Math.round((x + 1) * 1000 + z * 100), EARTH),
];

const PENGUIN = scaled(magellanic(), PENGUIN_K);

/** The colony of Isla Martillo, low-poly: replaces COLONY (base on y = 0, about 1.17 x 0.81). */
export const MARTILLO_POLY: Tri[] = [
  ...island(),
  ...chunk(-0.42, 0.05, -0.26, 0.22, 0.1, 0.18, 91, ROCK),
  ...chunk(-0.25, 0.03, -0.33, 0.12, 0.06, 0.1, 92, ROCK_DARK),
  ...burrow(0.38, 0.12),
  ...burrow(-0.38, 0.14),
  ...tussock(0.4, -0.05),
  ...tussock(-0.05, 0.3),
  ...tussock(0.12, -0.3),
  ...tussock(-0.42, 0.05),
  ...PENGUINS.flatMap(([x, z, angle]) => shift(turn(PENGUIN, angle), x, ISLAND_TOP - 0.002, z)),
];

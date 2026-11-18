import { createSeededRng } from '@antartida/core';
import { chunk, facingOut, loftBody, mirrorZ, prism, skin, spike, type Tri, type Vec3 } from '../lowPoly.ts';

/**
 * Low-poly South American sea lion bull (Otaria flavescens) on a rock of the Beagle Channel, for the
 * Desde Ushuaia sightings: a direct replacement of `seal(BROWN, 0x8a6f58, ROCK)` in sightingModels.ts.
 * One unit is the length of the rock, nose to +x, y up, the rock resting on y = 0. Unlike the lying
 * true seals (leopard, crabeater, Weddell) it sits up on its long fore flippers, with a thick maned
 * neck, a short blunt muzzle and small external ears. ILLUSTRATIVE: shape and colors are drawn, not
 * measured.
 */

// Same values as BROWN, BLACK and ROCK of sightingModels.ts, and the belly of `seal(BROWN, 0x8a6f58,
// ROCK)`. Not imported from there: that module will import this one, and a cycle would read them
// before they are set.
const SEA_LION_BROWN = 0x6b5443;
const SEA_LION_BELLY = 0x8a6f58;
const SEA_LION_BLACK = 0x1f2a36;
const SEA_LION_ROCK = 0x8a8f8c;
/** The darker mane of the bull, over its neck, shoulders and the back of its head. */
const SEA_LION_MANE = 0x58402c;
/** Fore and hind flippers, bare and darker than the fur. */
const SEA_LION_FLIPPER = 0x3f3129;
const SEA_LION_WHISKER = 0xe6dcc6;
/** Facets of the rock turned another way, so it does not read as one flat color. */
const ROCK_DARK = 0x737875;

const TAU = Math.PI * 2;
const unit = (v: Vec3): Vec3 => {
  const l = Math.hypot(...v);
  return [v[0] / l, v[1] / l, v[2] / l];
};
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** A ring of `n` points round `c` in the plane of u and v, of half sizes ru and rv. */
const ring = (c: Vec3, u: Vec3, v: Vec3, ru: number, rv: number, n: number): Vec3[] =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * TAU;
    return [c[0] + u[0] * Math.cos(a) * ru + v[0] * Math.sin(a) * rv, c[1] + u[1] * Math.cos(a) * ru + v[1] * Math.sin(a) * rv, c[2] + u[2] * Math.cos(a) * ru + v[2] * Math.sin(a) * rv];
  });

/** A ring of `n` points round `c` across the direction `d`, of half sizes ru and rv. */
const ringAcross = (c: Vec3, d: Vec3, ru: number, rv: number, n: number): Vec3[] => {
  const t = unit(d);
  const u = unit(cross(Math.abs(t[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], t));
  return ring(c, u, cross(t, u), ru, rv, n);
};

/** Top of the rock where the animal lies. */
const ROCK_TOP = 0.075;

/** A low rock slab of the Beagle Channel: an irregular oval with a bevelled edge, 1 x 0.7 as the block model. */
function rock(): Tri[] {
  const rng = createSeededRng(314021);
  const n = 11;
  const jitter = Array.from({ length: n }, () => 0.9 + rng() * 0.14);
  const ringAt = (scale: number, y: number, dy: number): Vec3[] =>
    Array.from({ length: n }, (_, i) => {
      const a = (i / n) * TAU;
      return [Math.cos(a) * 0.5 * scale * jitter[i], y + (rng() - 0.5) * dy, Math.sin(a) * 0.35 * scale * jitter[i]];
    });
  const rings = [ringAt(1, 0, 0), ringAt(0.92, 0.058, 0.01), ringAt(0.76, ROCK_TOP, 0.006)];
  const inside: Vec3 = [0, 0.02, 0];
  const out: Tri[] = [];
  for (let k = 0; k < rings.length - 1; k++) {
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const color = rng() < 0.4 ? ROCK_DARK : SEA_LION_ROCK;
      const [a, b] = [rings[k][i], rings[k][j]];
      const [c, d] = [rings[k + 1][j], rings[k + 1][i]];
      out.push(facingOut(a, b, c, color, inside), facingOut(a, c, d, color, inside));
    }
  }
  const top: Vec3 = [0.02, ROCK_TOP + 0.006, 0];
  for (let i = 0; i < n; i++) out.push(facingOut(top, rings[2][i], rings[2][(i + 1) % n], i % 3 ? SEA_LION_ROCK : ROCK_DARK, inside));
  // Loose boulders at the edge, as the small rock of the block model.
  out.push(...chunk(-0.42, 0.05, -0.27, 0.17, 0.1, 0.13, 314022, ROCK_DARK), ...chunk(0.4, 0.035, 0.24, 0.12, 0.07, 0.1, 314023, SEA_LION_ROCK));
  return out;
}

/**
 * Spine of the body and neck in the plane z = 0, from the tail up to the back of the head, as
 * (x, y, half size across the spine in that plane, half width): the hind body lies on the rock and
 * the chest and thick neck rise steeply, as a sea lion sitting on its fore flippers.
 */
const SPINE: readonly (readonly [number, number, number, number])[] = [
  [-0.37, 0.1, 0.008, 0.012],
  [-0.33, 0.11, 0.035, 0.055],
  [-0.22, 0.135, 0.06, 0.095],
  [-0.08, 0.162, 0.082, 0.12],
  [0.05, 0.195, 0.095, 0.128],
  [0.14, 0.25, 0.1, 0.125],
  [0.2, 0.31, 0.092, 0.115],
  [0.24, 0.36, 0.08, 0.1],
  [0.27, 0.4, 0.066, 0.082],
];
/** Spine stations from this one on carry the mane. */
const MANE_FROM = 4;
const BODY_SEGMENTS = 10;

/** Across-spine direction of each spine station, towards the back (dorsal). */
const dorsalAt = (k: number): Vec3 => {
  const p = SPINE[Math.max(0, k - 1)];
  const q = SPINE[Math.min(SPINE.length - 1, k + 1)];
  return unit([p[1] - q[1], q[0] - p[0], 0]);
};

function torso(): Tri[] {
  const rings = SPINE.map(([x, y, h, w], k) => ring([x, y, 0], dorsalAt(k), [0, 0, 1], h, w, BODY_SEGMENTS));
  return skin(
    rings,
    (band, seg) => {
      const c = Math.cos(((seg + 0.5) / BODY_SEGMENTS) * TAU);
      if (band >= MANE_FROM) return c < -0.75 ? SEA_LION_BELLY : SEA_LION_MANE;
      return c < -0.5 ? SEA_LION_BELLY : SEA_LION_BROWN;
    },
    SEA_LION_MANE,
  );
}

/** Shaggy tufts over the mane, leaning back down the neck. */
function maneTufts(): Tri[] {
  const out: Tri[] = [];
  for (const k of [5, 6, 7]) {
    const [x, y, h, w] = SPINE[k];
    const n = dorsalAt(k);
    const down: Vec3 = [n[1], -n[0], 0];
    for (const a of [-1.9, -1.2, -0.55, 0, 0.55, 1.2, 1.9]) {
      const radial: Vec3 = [n[0] * Math.cos(a), n[1] * Math.cos(a), Math.sin(a)];
      const base: Vec3 = [x + n[0] * Math.cos(a) * h * 0.8, y + n[1] * Math.cos(a) * h * 0.8, Math.sin(a) * w * 0.8];
      const dir: Vec3 = [radial[0] * 0.03 + down[0] * 0.035, radial[1] * 0.03 + down[1] * 0.035, radial[2] * 0.03];
      out.push(...spike(base, dir, 0.016, SEA_LION_MANE));
    }
  }
  return out;
}

const HEAD_SEGMENTS = 8;

/** Head on top of the neck: a rounded crown, a short blunt muzzle with a black nose, eyes, ears and whiskers. */
function head(): Tri[] {
  const skull = loftBody(
    [
      [0.23, 0.425, 0.05, 0.06],
      [0.28, 0.44, 0.066, 0.076],
      [0.33, 0.442, 0.058, 0.068],
      [0.37, 0.432, 0.042, 0.052],
      [0.405, 0.436, 0.03, 0.04],
    ],
    (band, seg) => {
      const s = Math.sin(((seg + 0.5) / HEAD_SEGMENTS) * TAU);
      if (band === 0) return SEA_LION_MANE;
      if (band === 3) return s < 0.3 ? SEA_LION_BELLY : SEA_LION_BROWN;
      return s < -0.5 ? SEA_LION_BELLY : SEA_LION_BROWN;
    },
    [SEA_LION_MANE, SEA_LION_BLACK],
    HEAD_SEGMENTS,
  );
  const side: Tri[] = [];
  // Eye: a small dark cone on the side of the head.
  const eyeAt: Vec3 = [0.325, 0.462, 0.058];
  const eye = ring(eyeAt, [1, 0, 0], [0, 1, 0], 0.012, 0.01, 5);
  const eyeApex: Vec3 = [0.327, 0.463, 0.069];
  for (let i = 0; i < 5; i++) side.push(facingOut(eyeApex, eye[i], eye[(i + 1) % 5], SEA_LION_BLACK, eyeAt));
  // Small external ear, a feature of eared seals that true seals lack.
  side.push(...spike([0.272, 0.47, 0.052], [-0.024, 0.012, 0.014], 0.009, SEA_LION_MANE));
  // Pale whiskers fanning out from the muzzle.
  for (const [y, dz] of [[0.43, 0.006], [0.418, -0.004]] as const) {
    side.push(...prism([[0.385, 0.038 + dz], [0.425, 0.085 + dz], [0.415, 0.088 + dz]], y - 0.0025, y + 0.0025, SEA_LION_WHISKER, SEA_LION_WHISKER, true));
  }
  return [...skull, ...side, ...mirrorZ(side)];
}

/** The +z fore flipper: a stout arm from the shoulder down to the rock, then a long flat blade pointing forwards. */
function foreFlipper(): Tri[] {
  const shoulder: Vec3 = [0.09, 0.2, 0.085];
  const elbow: Vec3 = [0.15, 0.135, 0.125];
  const wrist: Vec3 = [0.19, 0.088, 0.14];
  const arm = skin(
    [ringAcross(shoulder, [0.06, -0.065, 0.04], 0.042, 0.032, 6), ringAcross(elbow, [0.05, -0.06, 0.02], 0.032, 0.024, 6), ringAcross(wrist, [0.04, -0.05, 0.015], 0.022, 0.016, 6)],
    (band) => (band === 0 ? SEA_LION_BROWN : SEA_LION_FLIPPER),
    SEA_LION_FLIPPER,
  );
  const flat = (c: Vec3, thick: number, wide: number) => ring(c, [0, 1, 0], [0, 0, 1], thick, wide, 6);
  const blade = skin([flat([0.18, 0.088, 0.142], 0.013, 0.03), flat([0.26, 0.082, 0.158], 0.008, 0.04), flat([0.33, 0.079, 0.168], 0.004, 0.03)], () => SEA_LION_FLIPPER, SEA_LION_FLIPPER);
  return [...arm, ...blade];
}

/** The +z hind flipper, splayed back and out flat on the rock behind the body. */
function hindFlipper(): Tri[] {
  const root: Vec3 = [-0.3, 0.098, 0.04];
  const tip: Vec3 = [-0.41, 0.075, 0.13];
  const d: Vec3 = [tip[0] - root[0], 0, tip[2] - root[2]];
  const across = unit([-d[2], 0, d[0]]);
  const mid: Vec3 = [(root[0] + tip[0]) / 2, (root[1] + tip[1]) / 2 - 0.004, (root[2] + tip[2]) / 2];
  const flat = (c: Vec3, thick: number, wide: number) => ring(c, [0, 1, 0], across, thick, wide, 6);
  return skin([flat(root, 0.02, 0.032), flat(mid, 0.01, 0.042), flat(tip, 0.005, 0.05)], (band) => (band === 0 ? SEA_LION_BROWN : SEA_LION_FLIPPER), SEA_LION_FLIPPER);
}

/** The sea lion and its rock, ready for buildPolyGeometry. */
export const SEA_LION_POLY: readonly Tri[] = [
  ...rock(),
  ...torso(),
  ...maneTufts(),
  ...head(),
  ...foreFlipper(),
  ...mirrorZ(foreFlipper()),
  ...hindFlipper(),
  ...mirrorZ(hindFlipper()),
];

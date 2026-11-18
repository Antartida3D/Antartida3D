import { facingOut, loftBody, prism, spike, strut, type Station, type Tri, type Vec3 } from '../lowPoly.ts';

/**
 * Low-poly imperial cormorant (Leucocarbo atriceps) for the Desde Ushuaia sightings, a direct
 * replacement of `bird(BLACK, BLACK, WHITE, BLACK, ...)` in sightingModels.ts: about one unit long,
 * bill to +x, y up, the body axis on y = 0 as the block model (moveSighting flies it round that
 * point), and the right wing measured from WING_ROOT so it beats round its root (child 1; the left
 * one is mirrored in z). Black back and cap, white throat, breast and belly, long neck in a gentle
 * S, hooked bill with orange caruncles at its base, blue eye ring, webbed pink feet trailing under
 * the tail, broad wings with fingered primaries and a white bar on the inner upperwing.
 * ILLUSTRATIVE: shape and pattern are drawn, not measured.
 */

// Same values as BLACK and WHITE of sightingModels.ts. Not imported from there: that module will
// import this one, and a cycle would read them before they are set.
const SHAG_BLACK = 0x1f2a36;
const SHAG_WHITE = 0xf7fafb;
/** The bill, a dark horn grey so it reads against the black cap. */
const SHAG_BILL = 0x4a4f55;
/** The knobs (caruncles) at the base of the upper bill. */
const SHAG_CARUNCLE = 0xe8a33a;
/** The bare ring round the eye. */
const SHAG_EYE_RING = 0x3b7fc4;
/** The eye, dark brown inside the blue ring. */
const SHAG_EYE = 0x5a3a24;
/** Legs and webbed feet. */
const SHAG_FEET = 0xd99a8e;

type Ring = readonly Vec3[];
const centroid = (pts: Ring): Vec3 => [0, 1, 2].map((c) => pts.reduce((s, p) => s + p[c], 0) / pts.length) as unknown as Vec3;
const midpoint = (a: Vec3, b: Vec3): Vec3 => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];

/** A closed pyramid from a convex ring to an apex; `side(i)` colors the face from ring[i]. */
function pyramid(ring: Ring, apex: Vec3, side: (i: number) => number, base: number): Tri[] {
  const c = centroid(ring);
  const inside = midpoint(c, apex);
  const out: Tri[] = [];
  for (let i = 0; i < ring.length; i++) {
    const j = (i + 1) % ring.length;
    out.push(facingOut(apex, ring[i], ring[j], side(i), inside), facingOut(c, ring[j], ring[i], base, inside));
  }
  return out;
}

/**
 * Torso, neck and head in one skin from the rump to the base of the bill, as (x, center y, half
 * height, half width). The neck dips and rises again (stations 6 to 9) into a gentle S.
 */
const BODY: readonly Station[] = [
  [-0.26, 0, 0.025, 0.03],
  [-0.18, -0.002, 0.045, 0.05],
  [-0.08, -0.004, 0.064, 0.072],
  [0.02, -0.002, 0.068, 0.075],
  [0.1, 0, 0.056, 0.064],
  [0.16, 0.006, 0.038, 0.042],
  [0.21, 0.01, 0.026, 0.028],
  [0.26, -0.006, 0.022, 0.024],
  [0.3, 0.004, 0.021, 0.022],
  [0.34, 0.022, 0.025, 0.026],
  [0.37, 0.033, 0.031, 0.031],
  [0.4, 0.035, 0.029, 0.029],
  [0.425, 0.031, 0.02, 0.021],
];
/** First band of the head; the bands before it, from 1 on, are the torso and the neck. */
const HEAD_BAND = 9;
/** Last band of the white throat; the cheeks and the band at the bill are black. */
const THROAT_END_BAND = 10;

/**
 * Colors of the skin. Segments 0..3 are the upper side, 4..7 the lower one, 5 and 6 the very bottom.
 * Black back, cap and vent; white from the chin down the front of the neck, breast and belly.
 */
const bodyColor = (band: number, seg: number): number => {
  const bottom = seg === 5 || seg === 6;
  if (band === 0) return SHAG_BLACK;
  if (band === 1 || band >= HEAD_BAND) return bottom && band <= THROAT_END_BAND ? SHAG_WHITE : SHAG_BLACK;
  return seg >= 4 ? SHAG_WHITE : SHAG_BLACK;
};

function torso(): Tri[] {
  return loftBody(BODY, bodyColor, [SHAG_BLACK, SHAG_BLACK]);
}

/** Long thin bill with a hook at its tip, and the orange caruncles over its base. */
function bill(): Tri[] {
  return [
    ...loftBody([
      [0.41, 0.03, 0.011, 0.012],
      [0.45, 0.028, 0.0075, 0.008],
      [0.49, 0.026, 0.0055, 0.0055],
      [0.515, 0.025, 0.0045, 0.0045],
    ], () => SHAG_BILL, [SHAG_BILL, SHAG_BILL], 6),
    ...spike([0.511, 0.026, 0], [0.017, -0.013, 0], 0.0045, SHAG_BILL),
    ...spike([0.418, 0.04, 0.009], [0.01, 0.018, 0.004], 0.005, SHAG_CARUNCLE),
    ...spike([0.418, 0.04, -0.009], [0.01, 0.018, -0.004], 0.005, SHAG_CARUNCLE),
  ];
}

/** Each eye: a low blue pyramid (the eye ring) on the side of the head, the dark eye poking out of it. */
function eyes(): Tri[] {
  const [x, y] = [0.392, 0.044];
  const ringAt = (r: number, z: number, n: number): Vec3[] =>
    Array.from({ length: n }, (_, i): Vec3 => {
      const a = (i / n) * Math.PI * 2;
      return [x + Math.cos(a) * r, y + Math.sin(a) * r, z];
    });
  const out: Tri[] = [];
  for (const side of [1, -1] as const) {
    out.push(...pyramid(ringAt(0.012, side * 0.026, 6), [x, y, side * 0.034], () => SHAG_EYE_RING, SHAG_EYE_RING));
    // The upper front facet is the catchlight.
    out.push(...pyramid(ringAt(0.0065, side * 0.029, 4), [x, y, side * 0.039], (i) => (i === 0 ? SHAG_WHITE : SHAG_EYE), SHAG_EYE));
  }
  return out;
}

/** Long, stiff, wedge-shaped tail. */
function tail(): Tri[] {
  return prism([[-0.24, -0.028], [-0.24, 0.028], [-0.36, 0.06], [-0.42, 0.04], [-0.44, 0], [-0.42, -0.04], [-0.36, -0.06]], -0.006, 0.008, SHAG_BLACK, SHAG_BLACK, true);
}

/** Legs out of the belly and webbed feet with three toes, trailing under the tail as in flight. */
function feet(): Tri[] {
  const out: Tri[] = [];
  for (const side of [1, -1] as const) {
    const z = side * 0.024;
    out.push(...strut([-0.17, -0.035, side * 0.025], [-0.29, -0.022, z], 0.006, SHAG_FEET));
    out.push(...prism([
      [-0.285, z - 0.006], [-0.285, z + 0.006], [-0.355, z + 0.024], [-0.345, z + 0.01],
      [-0.372, z], [-0.345, z - 0.01], [-0.355, z - 0.024],
    ], -0.026, -0.018, SHAG_FEET, SHAG_FEET, true));
  }
  return out;
}

/** Body without the wings, in model units round the body axis. */
export const CORMORANT_BODY_POLY: Tri[] = [...torso(), ...bill(), ...eyes(), ...tail(), ...feet()];

/**
 * Span stations of the right wing: z from its root, leading and trailing edge (x). The first one
 * reaches into the back, so the joint stays hidden while the wing beats. Broad inner wing, swept
 * back from the wrist (about z = 0.34); the fingered primaries carry it out to the tip.
 */
const WING: readonly (readonly [z: number, le: number, te: number])[] = [
  [-0.04, 0.1, -0.1],
  [0, 0.1, -0.1],
  [0.12, 0.105, -0.105],
  [0.24, 0.1, -0.11],
  [0.34, 0.08, -0.1],
  [0.44, 0.045, -0.1],
  [0.52, 0.015, -0.095],
];
/** Reach of the longest primary, for the thinning of the wing. */
const WING_LENGTH = 0.72;
/** Primaries as [z of the base, z of the tip, x of the base, x of the tip, half width at the base]. */
const PRIMARIES: readonly (readonly [number, number, number, number, number])[] = [
  [0.47, 0.66, 0.008, 0, 0.018],
  [0.48, 0.71, -0.022, -0.03, 0.02],
  [0.48, 0.72, -0.052, -0.068, 0.02],
  [0.47, 0.68, -0.08, -0.105, 0.018],
];
/** Bands of the inner wing (along the span) that carry the white bar on the upper coverts. */
const BAR_BANDS = [1, 2];

/** Right wing, measured from its root at WING_ROOT of sightingModels.ts. */
function wing(): Tri[] {
  // Airfoil ring: leading edge, upper front, upper rear, trailing edge, lower rear, lower front.
  const rings: Vec3[][] = WING.map(([z, le, te]) => {
    const thin = 1 - 0.6 * (Math.max(0, z) / WING_LENGTH);
    const top = 0.022 * thin;
    const bottom = -0.012 * thin;
    const at = (f: number) => le + (te - le) * f;
    return [[le, 0.002, z], [at(0.3), top, z], [at(0.65), top * 0.6, z], [te, 0, z], [at(0.65), bottom * 0.5, z], [at(0.3), bottom, z]];
  });
  const n = rings[0].length;
  const colorAt = (k: number, seg: number) => (seg === 1 && BAR_BANDS.includes(k) ? SHAG_WHITE : SHAG_BLACK);
  const out: Tri[] = [];
  for (let k = 0; k < rings.length - 1; k++) {
    const inside = centroid([...rings[k], ...rings[k + 1]]);
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const color = colorAt(k, i);
      out.push(facingOut(rings[k][i], rings[k][j], rings[k + 1][j], color, inside), facingOut(rings[k][i], rings[k + 1][j], rings[k + 1][i], color, inside));
    }
  }
  // Both ends closed: the root inside the back, the outer end under the primaries.
  for (const [end, next] of [[0, 1], [rings.length - 1, rings.length - 2]] as const) {
    const ring = rings[end];
    const mid = centroid(ring);
    const inside = centroid([...ring, ...rings[next]]);
    for (let i = 0; i < n; i++) out.push(facingOut(mid, ring[i], ring[(i + 1) % n], SHAG_BLACK, inside));
  }
  for (const [z0, z1, x0, x1, w] of PRIMARIES) {
    const base: Vec3[] = [[x0 + w, 0, z0], [x0, 0.008, z0], [x0 - w, 0, z0], [x0, -0.006, z0]];
    out.push(...pyramid(base, [x1, 0.002, z1], () => SHAG_BLACK, SHAG_BLACK));
  }
  return out;
}

/** Right wing (towards +z) from its root; the left one is its mirror in z. */
export const CORMORANT_WING_POLY: Tri[] = wing();

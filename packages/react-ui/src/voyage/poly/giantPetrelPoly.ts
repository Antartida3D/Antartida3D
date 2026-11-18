import { facingOut, loftBody, prism, sideAt, skin, spike, type Station, type Tri, type Vec3 } from '../lowPoly.ts';
// The palette comes from stationModels.ts, not sightingModels.ts: sightingModels will import this
// file, and importing it back would read its colors before they are set (an import cycle).
import { VOXEL_PALETTE } from '../../orcadas/stationModels.ts';

const { BLACK, BROWN, BROWN_DARK, ROCK_DARK } = VOXEL_PALETTE;
/** Belly and underwing: the pale brown of the block model ('petrel-gigante' in sightingModels.ts). */
const GIANT_PETREL_BELLY = 0x8a7460;
/** Face and throat, paler than the back. */
const GIANT_PETREL_FACE = 0x9c8b78;
/** The big pale bill and its nasal tube. */
const GIANT_PETREL_BILL = 0xe2cf9f;
/** The darker hooked tip of the bill. */
const GIANT_PETREL_BILL_TIP = 0x8c8a55;

/*
 * Giant petrel in flight, the low-poly twin of bird(BROWN, ...) in sightingModels.ts: same frame
 * (front at +x, body centered on y = 0, about one unit long), so it replaces the block model as it
 * is. A heavy hunched body, a short rounded tail, the feet trailing under it, and a massive pale
 * bill with the long nasal tube on top. ILLUSTRATIVE: no source backs these proportions.
 */

// Body outline: x, center y, half height, half width. Deep chest and shoulder, thick neck.
const TORSO: readonly Station[] = [
  [-0.3, 0.005, 0.028, 0.035],
  [-0.18, 0.005, 0.05, 0.06],
  [-0.02, 0.005, 0.068, 0.075],
  [0.14, 0.012, 0.064, 0.068],
  [0.26, 0.03, 0.05, 0.052],
  [0.34, 0.042, 0.044, 0.044],
  [0.39, 0.04, 0.03, 0.03],
];
const SEGMENTS = 8;
/** Lower faces of a ring of `n` segments (angle measured from +z towards +y). */
const below = (seg: number, n: number) => Math.sin(((seg + 0.5) / n) * Math.PI * 2) < -0.3;

const torso = loftBody(
  TORSO,
  (band, seg) => (band >= 4 ? GIANT_PETREL_FACE : below(seg, SEGMENTS) ? GIANT_PETREL_BELLY : BROWN),
  [BROWN_DARK, GIANT_PETREL_FACE],
  SEGMENTS,
);

// Massive bill, deep at the base and hooked down at the tip.
const bill = loftBody(
  [
    [0.375, 0.036, 0.022, 0.022],
    [0.42, 0.032, 0.017, 0.016],
    [0.46, 0.029, 0.013, 0.012],
    [0.485, 0.022, 0.011, 0.009],
    [0.498, 0.011, 0.004, 0.004],
  ],
  (band) => (band >= 3 ? GIANT_PETREL_BILL_TIP : GIANT_PETREL_BILL),
  [undefined, GIANT_PETREL_BILL_TIP],
  6,
);

// The nasal tube along the top of the bill, its dark opening facing forward.
const nasalTube = loftBody(
  [
    [0.38, 0.056, 0.009, 0.01],
    [0.445, 0.049, 0.007, 0.008],
  ],
  () => GIANT_PETREL_BILL,
  [undefined, BLACK],
  6,
);

// Eyes on the sides of the head, just above the bill.
const EYE_X = 0.345;
const EYE_Y = 0.055;
// Sunk a little: the faceted head lies inside the smooth outline sideAt measures.
const eyeZ = sideAt(TORSO, EYE_X, EYE_Y) - 0.004;
const eyes = [1, -1].flatMap((side) => spike([EYE_X, EYE_Y, side * eyeZ], [0, 0, side * 0.008], 0.009, BLACK));

// Short rounded tail.
const tail = prism(
  [[-0.27, -0.03], [-0.27, 0.03], [-0.35, 0.06], [-0.395, 0.04], [-0.41, 0], [-0.395, -0.04], [-0.35, -0.06]],
  -0.004,
  0.012,
  BROWN_DARK,
  BROWN_DARK,
  true,
);

// Legs trailing back under the tail, each ending in a webbed foot.
const feet = [1, -1].flatMap((side) => [
  ...spike([-0.16, -0.04, side * 0.025], [-0.11, 0.016, side * 0.003], 0.01, ROCK_DARK),
  ...prism([[-0.265, side * 0.014], [-0.265, side * 0.04], [-0.345, side * 0.03]], -0.027, -0.02, ROCK_DARK, ROCK_DARK, true),
]);

export const GIANT_PETREL_BODY_POLY: Tri[] = [...torso, ...bill, ...nasalTube, ...eyes, ...tail, ...feet];

/*
 * Right wing (+z), measured from its root at WING_ROOT (sightingModels.ts); the left one is
 * mirrorZ of it. Broad and stiff: raised a little to the wrist, then the hand bowed down to a
 * pointed tip. It starts inside the body so no gap opens when it beats.
 */
// Stations along the span: z, leading edge x, trailing edge x, center y, thickness.
const WING: readonly (readonly [number, number, number, number, number])[] = [
  [-0.03, 0.13, -0.1, 0, 0.03],
  [0.16, 0.12, -0.11, 0.01, 0.026],
  [0.36, 0.1, -0.1, 0.016, 0.022],
  [0.52, 0.04, -0.11, 0.006, 0.016],
  [0.66, -0.03, -0.12, -0.012, 0.01],
];
const WING_TIP: Vec3 = [-0.11, -0.026, 0.77];
/** Airfoil ring: leading edge, upper front, upper rear, trailing edge, lower rear, lower front. */
const wingRings = WING.map(([z, le, te, y, t]): Vec3[] => {
  const c = le - te;
  return [
    [le, y, z],
    [le - 0.25 * c, y + 0.55 * t, z],
    [le - 0.6 * c, y + 0.35 * t, z],
    [te, y, z],
    [le - 0.6 * c, y - 0.25 * t, z],
    [le - 0.25 * c, y - 0.4 * t, z],
  ];
});
/** Upper faces brown, the hand from the wrist darker; the underside pale. */
const wingColor = (band: number, seg: number) => (seg <= 2 ? (band >= 2 ? BROWN_DARK : BROWN) : GIANT_PETREL_BELLY);
const ringCenter = (r: readonly Vec3[]): Vec3 => [0, 1, 2].map((k) => r.reduce((s, p) => s + p[k], 0) / r.length) as unknown as Vec3;
const rootRing = wingRings[0];
const tipRing = wingRings[wingRings.length - 1];
const rootCenter = ringCenter(rootRing);
const tipCenter = ringCenter(tipRing);

export const GIANT_PETREL_WING_POLY: Tri[] = [
  ...skin(wingRings, wingColor),
  ...rootRing.map((p, i) => facingOut(rootCenter, p, rootRing[(i + 1) % rootRing.length], BROWN, ringCenter(wingRings[1]))),
  ...tipRing.map((p, i) => facingOut(WING_TIP, p, tipRing[(i + 1) % tipRing.length], i <= 2 ? BROWN_DARK : GIANT_PETREL_BELLY, tipCenter)),
];

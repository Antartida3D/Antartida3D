import {
  block, fromOutline, loftBody, mirrorZ, orient, sectionAt, shift, sideAt, skin, topAt, type Station, type Tri, type Vec3,
} from '../lowPoly.ts';

/**
 * Low-poly hourglass dolphin (Lagenorhynchus cruciger) for the Desde Ushuaia sightings, a direct
 * replacement of `dolphin(BLACK, WHITE, WHITE)` in sightingModels.ts: about one unit long, nose to
 * +x, y up, the body axis on y = 0 as the block model (moveSighting makes it jump round that point).
 * Black, with a white belly and on each flank the white front and rear patches joined by a narrow
 * waist under the dorsal fin, the hourglass that names it. ILLUSTRATIVE: shape and pattern are
 * drawn, not measured.
 */

// Same values as BLACK and WHITE of sightingModels.ts. Not imported from there: that module will
// import this one, and a cycle would read them before they are set.
const DOLPHIN_BLACK = 0x1f2a36;
const DOLPHIN_WHITE = 0xf7fafb;
/** The eye, darker than the black head so its facets show on it. */
const DOLPHIN_EYE = 0x0b1117;

/**
 * Body from the tail tip to the beak, as (x, top, bottom, half width): stocky, a tail stock taller
 * than wide, a rounded melon and a short beak.
 */
const OUTLINE: readonly Station[] = [
  [-0.5, 0.01, -0.006, 0.005], [-0.46, 0.02, -0.012, 0.009], [-0.4, 0.034, -0.024, 0.015], [-0.32, 0.05, -0.04, 0.026],
  [-0.24, 0.064, -0.056, 0.04], [-0.15, 0.076, -0.07, 0.056], [-0.06, 0.084, -0.08, 0.068], [0.03, 0.088, -0.087, 0.075],
  [0.12, 0.086, -0.088, 0.076], [0.2, 0.08, -0.084, 0.072], [0.27, 0.07, -0.076, 0.064], [0.33, 0.058, -0.066, 0.054],
  [0.38, 0.045, -0.055, 0.044], [0.42, 0.03, -0.045, 0.034], [0.45, 0.012, -0.036, 0.024], [0.48, 0.002, -0.03, 0.016],
  [0.5, -0.008, -0.026, 0.009],
];
const SEGMENTS = 20;

/**
 * White marks of each flank, as an x range for each row of faces on the side (`s`, the sine of the
 * ring angle: 1 on top, -1 below): the front patch behind the eye, pointed forward; the waist under
 * the dorsal fin; and the rear patch that sweeps up and back towards the tail stock.
 */
const WHITE_MARKS: readonly { readonly s: readonly [number, number]; readonly x: readonly [number, number] }[] = [
  // Front patch.
  { s: [0, 0.3], x: [0.08, 0.28] },
  { s: [-0.3, 0], x: [-0.04, 0.34] },
  { s: [-0.6, -0.3], x: [0.08, 0.3] },
  // Rear patch; its middle row meets the waist above.
  { s: [-0.6, -0.3], x: [-0.34, -0.06] },
  { s: [-0.3, 0], x: [-0.36, -0.04] },
  { s: [0, 0.3], x: [-0.36, -0.1] },
  { s: [0.3, 0.6], x: [-0.33, -0.16] },
  { s: [0.6, 0.8], x: [-0.3, -0.22] },
  // Belly, apart from the patches by a black band low on the flank; the chin stays black.
  { s: [-1, -0.95], x: [-0.3, 0.32] },
  { s: [-0.95, -0.8], x: [-0.25, 0.3] },
];

/** Stations of OUTLINE plus one at each edge of a mark, so every mark falls on whole bands. */
const BODY: readonly Station[] = (() => {
  const outline = fromOutline(OUTLINE);
  const xs = [...outline.map(([x]) => x), ...WHITE_MARKS.flatMap((m) => m.x)].sort((a, b) => a - b);
  return xs.filter((x, i) => i === 0 || x - xs[i - 1] > 0.004).map((x): Station => [x, ...sectionAt(outline, x)]);
})();

const skinColor = (x: number, s: number): number =>
  WHITE_MARKS.some((m) => s > m.s[0] && s < m.s[1] && x > m.x[0] && x < m.x[1]) ? DOLPHIN_WHITE : DOLPHIN_BLACK;

const BODY_TRIS: readonly Tri[] = loftBody(
  BODY,
  (band, seg) => skinColor((BODY[band][0] + BODY[band + 1][0]) / 2, Math.sin(((seg + 0.5) / SEGMENTS) * Math.PI * 2)),
  [DOLPHIN_BLACK, DOLPHIN_BLACK],
  SEGMENTS,
);

/**
 * Tall, strongly falcate dorsal fin at the middle of the back: convex leading edge, hollow trailing
 * edge and the tip hooked well behind the base. Rings up the fin: (y above the back, leading x,
 * trailing x, half thickness); the first one is sunk in the back so the fin grows out of it.
 */
const DORSAL: readonly Tri[] = (() => {
  const base = topAt(BODY, -0.005, 0);
  return skin([
    [-0.012, 0.06, -0.07, 0.012], [0.0, 0.058, -0.07, 0.011], [0.02, 0.04, -0.06, 0.009], [0.04, 0.018, -0.05, 0.007],
    [0.06, -0.005, -0.045, 0.005], [0.08, -0.03, -0.05, 0.0035], [0.095, -0.055, -0.065, 0.002], [0.105, -0.08, -0.086, 0.001],
  ].map(([y, lead, trail, w]): Vec3[] => {
    const mid = lead + (trail - lead) * 0.35;
    return [[lead, base + y, 0], [mid, base + y, w], [trail, base + y, 0], [mid, base + y, -w]];
  }), () => DOLPHIN_BLACK, DOLPHIN_BLACK);
})();

const EYE_X = 0.4;
const eyeY = sectionAt(BODY, EYE_X)[0] + 0.006;
const eyeZ = sideAt(BODY, EYE_X, eyeY) - 0.003;
const EYES: readonly Tri[] = [
  ...block(EYE_X, eyeY, eyeZ, 0.014, 0.012, 0.01, DOLPHIN_EYE),
  ...block(EYE_X, eyeY, -eyeZ, 0.014, 0.012, 0.01, DOLPHIN_EYE),
];

/**
 * Right fluke from the notch out, at the height of the tail tip: swept back with pointed tips. The
 * rings run along +z: leading edge, upper and lower face, trailing edge.
 */
const flukeY = sectionAt(BODY, -0.5)[0];
const FLUKE: readonly Tri[] = skin(Array.from({ length: 7 }, (_, i): Vec3[] => {
  const u = i / 6;
  const lead = -0.46 - 0.09 * u ** 1.4;
  const trail = -0.51 - 0.045 * u;
  const half = 0.008 * (1 - 0.7 * u);
  const mid = lead + (trail - lead) * 0.35;
  const z = 0.002 + u * 0.138;
  return [[lead, flukeY, z], [mid, flukeY + half, z], [trail, flukeY, z], [mid, flukeY - half, z]];
}), () => DOLPHIN_BLACK, DOLPHIN_BLACK);

/** Right pectoral flipper out along +z from its root: small, pointed and swept back. */
const FLIPPER: readonly Tri[] = skin(Array.from({ length: 6 }, (_, i): Vec3[] => {
  const u = i / 5;
  const chord = 0.052 * (1 - 0.75 * u);
  const lead = chord * 0.4 - 0.03 * u ** 1.5;
  const trail = lead - chord;
  const half = 0.008 * (1 - 0.6 * u);
  const mid = lead + (trail - lead) * 0.35;
  const z = -0.01 + u * 0.1;
  return [[lead, 0, z], [mid, half, z], [trail, 0, z], [mid, -half, z]];
}), () => DOLPHIN_BLACK, DOLPHIN_BLACK);

/** The right flipper at its root, low on the flank behind the head, reaching back, down and out. */
const FLIPPER_X = 0.27;
const FLIPPER_Y = -0.045;
const FLIPPER_RIGHT: readonly Tri[] = shift(
  orient(FLIPPER, [-0.3, -0.7, 0.65], [0, 0.6, 0.75]),
  FLIPPER_X, FLIPPER_Y, sideAt(BODY, FLIPPER_X, FLIPPER_Y) - 0.006,
);

export const HOURGLASS_DOLPHIN_POLY: Tri[] = [
  ...BODY_TRIS,
  ...DORSAL,
  ...EYES,
  ...FLUKE,
  ...mirrorZ(FLUKE),
  ...FLIPPER_RIGHT,
  ...mirrorZ(FLIPPER_RIGHT),
];

import {
  block, fromOutline, loftBody, mirrorZ, orient, sectionAt, shift, sideAt, skin, topAt, type Station, type Tri, type Vec3,
} from '../lowPoly.ts';
import { assembleCetacean, type CetaceanPolyParts } from '../whalePolyModels.ts';

/**
 * Low-poly Peale's dolphin (Lagenorhynchus australis) for the Desde Ushuaia sightings, a direct
 * replacement of `dolphin(0x3d4852, WHITE, 0xa9b3ba)` in sightingModels.ts: about one unit long,
 * nose to +x, y up, the body axis on y = 0 as the block model (moveSighting makes it jump round that
 * point). Stocky, with a short beak, a dark grey back and face, a white belly, a large light grey
 * patch on the front of each flank with a white spot behind the flipper, and a light grey stripe
 * from below the dorsal fin back to the tail stock. ILLUSTRATIVE: shape and pattern are drawn, not
 * measured. Source for the pattern pending.
 */

/** The back and face, the light grey patch: the colors of the block model. */
const PEALES_BACK = 0x3d4852;
const PEALES_PATCH = 0xa9b3ba;
// Same values as BLACK and WHITE of sightingModels.ts. Not imported from there: that module will
// import this one, and a cycle would read them before they are set.
const PEALES_WHITE = 0xf7fafb;
const PEALES_EYE = 0x1f2a36;

/**
 * Body from the tail tip to the beak, as (x, top, bottom, half width): stocky and deep, a tail stock
 * taller than wide, a melon that slopes into a short beak.
 */
const OUTLINE: readonly Station[] = [
  [-0.47, 0.012, -0.004, 0.006], [-0.42, 0.03, -0.014, 0.012], [-0.36, 0.046, -0.027, 0.021], [-0.3, 0.059, -0.04, 0.031],
  [-0.22, 0.073, -0.056, 0.046], [-0.14, 0.084, -0.07, 0.059], [-0.06, 0.091, -0.08, 0.069], [0.02, 0.094, -0.085, 0.075],
  [0.1, 0.093, -0.086, 0.076], [0.18, 0.088, -0.082, 0.073], [0.25, 0.079, -0.074, 0.067], [0.31, 0.067, -0.064, 0.059],
  [0.36, 0.054, -0.052, 0.049], [0.4, 0.039, -0.042, 0.039], [0.43, 0.023, -0.034, 0.029], [0.455, 0.009, -0.029, 0.019],
  [0.48, 0.0, -0.025, 0.013], [0.5, -0.008, -0.02, 0.007],
];
const SEGMENTS = 16;
/** Where the tail joins the body. */
const TAIL_X = -0.3;

interface Mark { readonly s: readonly [number, number]; readonly x: readonly [number, number]; readonly color: number }
/**
 * Marks of each flank, as an x range for each row of faces on the side (`s`, the sine of the ring
 * angle: 1 on top, -1 below). The first that matches wins: the white spot behind the flipper over
 * the grey patch.
 */
const MARKS: readonly Mark[] = [
  // White spot behind the flipper.
  { s: [-0.7, 0], x: [0.14, 0.21], color: PEALES_WHITE },
  // Light grey patch from behind the eye to the middle of the body, higher in front.
  { s: [0.4, 0.7], x: [0.14, 0.33], color: PEALES_PATCH },
  { s: [0, 0.4], x: [0.0, 0.34], color: PEALES_PATCH },
  { s: [-0.4, 0], x: [-0.02, 0.33], color: PEALES_PATCH },
  { s: [-0.7, -0.4], x: [0.02, 0.3], color: PEALES_PATCH },
  // Light grey stripe, rising forward from the tail stock towards the dorsal fin.
  { s: [-0.4, 0], x: [-0.4, -0.12], color: PEALES_PATCH },
  { s: [0, 0.4], x: [-0.3, -0.07], color: PEALES_PATCH },
  { s: [0.4, 0.7], x: [-0.18, -0.09], color: PEALES_PATCH },
  // White belly; the chin and throat stay dark.
  { s: [-1, -0.7], x: [-0.32, 0.28], color: PEALES_WHITE },
];

/** Stations of OUTLINE plus one at each edge of a mark and at the tail joint, so every mark falls on whole bands. */
const BODY: readonly Station[] = (() => {
  const outline = fromOutline(OUTLINE);
  const xs = [...outline.map(([x]) => x), TAIL_X, ...MARKS.flatMap((m) => m.x)].sort((a, b) => a - b);
  return xs.filter((x, i) => i === 0 || x - xs[i - 1] > 0.004).map((x): Station => [x, ...sectionAt(outline, x)]);
})();

const skinColor = (x: number, s: number): number =>
  MARKS.find((m) => s > m.s[0] && s < m.s[1] && x > m.x[0] && x < m.x[1])?.color ?? PEALES_BACK;
const loft = (stations: readonly Station[]) => loftBody(
  stations,
  (band, seg) => skinColor((stations[band][0] + stations[band + 1][0]) / 2, Math.sin(((seg + 0.5) / SEGMENTS) * Math.PI * 2)),
  [PEALES_BACK, PEALES_BACK],
  SEGMENTS,
);

/**
 * Falcate dorsal fin in the middle of the back: its leading edge bowed, its tip swept behind its
 * base. Rings up the fin: (y above the back, leading x, trailing x, half thickness); the first one is
 * sunk in the back.
 */
const DORSAL: readonly Tri[] = (() => {
  const base = topAt(BODY, 0, 0);
  return skin([
    [-0.012, 0.07, -0.075, 0.011], [0.0, 0.065, -0.072, 0.01], [0.025, 0.045, -0.058, 0.008], [0.05, 0.016, -0.05, 0.006],
    [0.07, -0.018, -0.056, 0.0045], [0.085, -0.048, -0.068, 0.003], [0.095, -0.078, -0.088, 0.0015],
  ].map(([y, lead, trail, w]): Vec3[] => {
    const mid = lead + (trail - lead) * 0.35;
    return [[lead, base + y, 0], [mid, base + y, w], [trail, base + y, 0], [mid, base + y, -w]];
  }), () => PEALES_BACK, PEALES_BACK);
})();

const EYE_X = 0.375;
const eyeY = sectionAt(BODY, EYE_X)[0] + 0.004;
const eyeZ = sideAt(BODY, EYE_X, eyeY) - 0.003;
/** Eyes in the dark face, just above the line of the mouth, and the blowhole ahead of the melon's crown. */
const HEAD_MARKS: readonly Tri[] = [
  ...block(EYE_X, eyeY, eyeZ, 0.014, 0.012, 0.01, PEALES_EYE),
  ...block(EYE_X, eyeY, -eyeZ, 0.014, 0.012, 0.01, PEALES_EYE),
  ...block(0.3, topAt(BODY, 0.3, 0) - 0.002, 0, 0.008, 0.006, 0.018, PEALES_EYE),
];

/**
 * Right fluke from the notch out, at the height of the tail tip: its leading edge swept back to a
 * pointed tip. The rings run along +z: leading edge, upper and lower face, trailing edge.
 */
const fluke = (y: number): Tri[] => skin(Array.from({ length: 7 }, (_, i): Vec3[] => {
  const u = i / 6;
  const lead = -0.43 - 0.075 * u ** 1.6;
  const trail = -0.475 - 0.04 * u;
  const half = 0.008 * (1 - 0.7 * u);
  const mid = lead + (trail - lead) * 0.35;
  const z = 0.002 + u * 0.135;
  return [[lead, y, z], [mid, y + half, z], [trail, y, z], [mid, y - half, z]];
}), () => PEALES_BACK, PEALES_BACK);

/** Right flipper out along +z from its root: small, pointed and curved back, dark. */
const FLIPPER: readonly Tri[] = skin(Array.from({ length: 7 }, (_, i): Vec3[] => {
  const u = i / 6;
  const chord = 0.06 * (1 - 0.8 * u);
  const lead = chord * 0.35 - 0.04 * u ** 1.5;
  const trail = lead - chord;
  const half = 0.009 * (1 - 0.6 * u);
  const z = -0.01 + u * 0.12;
  const thick = lead - chord * 0.35;
  return [[lead, 0, z], [thick, half, z], [trail, 0, z], [thick, -half, z]];
}), () => PEALES_BACK, PEALES_BACK);

/** The right flipper at its root, low on the flank behind the head: back, down and out. */
const FLIPPER_X = 0.24;
const FLIPPER_Y = -0.045;
const FLIPPER_ROOT: Vec3 = [FLIPPER_X, FLIPPER_Y, sideAt(BODY, FLIPPER_X, FLIPPER_Y) - 0.006];
const flipperAtRoot = orient(FLIPPER, [-0.35, -0.7, 0.6], [0, 0.6, 0.7]);

const tailStation = BODY.findIndex(([x]) => x >= TAIL_X - 1e-9);
const [, tailY] = BODY[tailStation];
/** The tail reaches a little into the body, so no gap opens at the joint if it beats. */
const tailStations: Station[] = [
  ...BODY.slice(0, tailStation + 1),
  (() => {
    const [cy, hy, hz] = sectionAt(BODY, TAIL_X);
    return [TAIL_X + 0.015, cy, hy * 0.96, hz * 0.96] as Station;
  })(),
];

/** Cut as the other cetaceans (whalePolyModels.ts): body, tail and flippers. */
export const PEALES_DOLPHIN_PARTS: CetaceanPolyParts = {
  tailPivot: [TAIL_X, tailY, 0],
  flipperPivot: FLIPPER_ROOT,
  body: [...loft(BODY.slice(tailStation)), ...DORSAL, ...HEAD_MARKS],
  tail: shift([...loft(tailStations), ...fluke(BODY[0][1]), ...mirrorZ(fluke(BODY[0][1]))], -TAIL_X, -tailY, 0),
  flipperR: flipperAtRoot,
  flipperL: mirrorZ(flipperAtRoot),
};

export const PEALES_DOLPHIN_POLY: Tri[] = assembleCetacean(PEALES_DOLPHIN_PARTS);

import { buildHelicopterRotorTris } from '../../orcadas/lowPolyProps.ts';
import { HELICOPTER_ROTOR_ORIGIN, VOXEL_PALETTE } from '../../orcadas/stationModels.ts';
import { block, facingOut, lathe, prism, skin, strut, type Tri, type Vec3 } from '../lowPoly.ts';

// Sea King of the voyage, low-poly, with the measures of HELICOPTER_BOXES (stationModels.ts): nose
// to +x, y up, length 1 (tail rotor tip at x = -0.5, nose at x = 0.46), wheels on y = 0. A boat hull
// with flat sides, the twin-engine cowling on the roof, the tall swept tail pylon with its rotor on
// -z and the stabilizer on +z, the side sponsons with the main wheels and a tailwheel under the boom.
// Same livery as the block model (grey with high-visibility orange) and the dark glass of the Irízar
// and the Hercules (BLACK). An illustration: the livery and proportions are not measured.
const { BLACK, WHITE, ORANGE, SEA_GREY, WHALE_GREY, ZINC, LAMP } = VOXEL_PALETTE;

/** Mast-axis origin of the main rotor in the body space: the same as the block model, so it turns in place. */
export const SEA_KING_ROTOR_ORIGIN = HELICOPTER_ROTOR_ORIGIN;

const mean = (ring: readonly Vec3[]): Vec3 => [0, 1, 2].map((k) => ring.reduce((s, p) => s + p[k], 0) / ring.length) as unknown as Vec3;

/** The ring closed with a fan from its middle, facing away from `away` (the next ring). */
const capRing = (ring: readonly Vec3[], color: number, away: Vec3): Tri[] => {
  const c = mean(ring);
  return ring.map((p, i) => facingOut(c, p, ring[(i + 1) % ring.length], color, away));
};

/** A skin over the rings closed at both ends. */
const closedSkin = (rings: readonly (readonly Vec3[])[], colorAt: (band: number, seg: number) => number, startCap: number, endCap: number): Tri[] => [
  ...skin(rings, colorAt, endCap),
  ...capRing(rings[0], startCap, mean(rings[1])),
];

// Hull section at x: a V keel (yk, half width wk), the chine (yc, wc), flat walls up to the shoulder
// (ys) and a flat roof (yr, wt). Segments: 0 and 6 the bottom, 7 the keel, 1 and 5 the walls,
// 2 and 4 the shoulders, 3 the roof.
const hull = (x: number, yk: number, wk: number, yc: number, wc: number, ys: number, yr: number, wt: number): Vec3[] => [
  [x, yk, wk], [x, yc, wc], [x, ys, wc], [x, yr, wt], [x, yr, -wt], [x, ys, -wc], [x, yc, -wc], [x, yk, -wk],
];
/** Tail to nose: boom end, boom root, upswept rear cabin, cabin, windscreen base, nose, radome, tip. */
const HULL: readonly Vec3[][] = [
  hull(-0.37, 0.15, 0.008, 0.156, 0.022, 0.186, 0.196, 0.016),
  hull(-0.24, 0.128, 0.012, 0.136, 0.034, 0.176, 0.186, 0.026),
  hull(-0.12, 0.07, 0.02, 0.09, 0.07, 0.17, 0.186, 0.06),
  hull(-0.04, 0.046, 0.024, 0.074, 0.08, 0.172, 0.19, 0.066),
  hull(0.22, 0.046, 0.024, 0.074, 0.08, 0.172, 0.19, 0.066),
  hull(0.28, 0.05, 0.024, 0.076, 0.078, 0.15, 0.175, 0.06),
  hull(0.35, 0.062, 0.02, 0.08, 0.068, 0.13, 0.145, 0.04),
  hull(0.42, 0.076, 0.014, 0.088, 0.048, 0.11, 0.12, 0.03),
  hull(0.46, 0.088, 0.006, 0.094, 0.02, 0.104, 0.108, 0.012),
];
const BOTTOM = [0, 6, 7];
const SHOULDER = [2, 4];
const ROOF = 3;
/** Band of the cockpit side windows, of the windscreen, and of the nose. */
const COCKPIT_BAND = 4;
const WINDSCREEN_BAND = 5;
const NOSE_BAND = 6;

function fuselage(): Tri[] {
  return closedSkin(
    HULL,
    (band, seg) => {
      if (band === 0) return ORANGE; // high-visibility tail boom
      if (band >= NOSE_BAND) return band === NOSE_BAND && seg === ROOF ? SEA_GREY : ORANGE;
      if (band === WINDSCREEN_BAND) return BOTTOM.includes(seg) ? ORANGE : seg === ROOF || SHOULDER.includes(seg) ? BLACK : SEA_GREY;
      if (BOTTOM.includes(seg)) return WHALE_GREY;
      if (band === COCKPIT_BAND) return SHOULDER.includes(seg) ? BLACK : SEA_GREY;
      return seg === ROOF && band >= 2 ? WHITE : SEA_GREY;
    },
    ORANGE,
    ORANGE,
  );
}

/** Cabin side windows, the sliding-door seam and the windscreen mullion. */
function cabinDetail(): Tri[] {
  const out: Tri[] = [];
  for (const s of [1, -1]) {
    for (const x of [-0.01, 0.09, 0.18]) out.push(...block(x, 0.148, s * 0.0815, 0.044, 0.03, 0.004, BLACK));
    out.push(...strut([0.135, 0.08, s * 0.0815], [0.135, 0.168, s * 0.0815], 0.0025, BLACK));
  }
  out.push(...strut([0.282, 0.176, 0], [0.348, 0.147, 0], 0.003, SEA_GREY));
  return out;
}

// Engine cowling on the roof, six-point sections [z, y] at x: bottom (sunk in the roof), wall top,
// crown. Segments: 0 and 4 the walls, 1 and 3 the bevels, 2 the crown, 5 the bottom.
const cowl = (x: number, w: number, ym: number, wt: number, yt: number): Vec3[] => {
  const yb = 0.186;
  return [[x, yb, w], [x, ym, w], [x, yt, wt], [x, yt, -wt], [x, ym, -w], [x, yb, -w]];
};

/** Twin-turbine cowling with dark intakes in front, exhausts aft and the rotor mast. */
function engines(): Tri[] {
  const out = closedSkin(
    [cowl(-0.06, 0.03, 0.205, 0.018, 0.214), cowl(-0.02, 0.05, 0.225, 0.034, 0.238), cowl(0.17, 0.05, 0.225, 0.034, 0.238), cowl(0.23, 0.044, 0.215, 0.026, 0.226)],
    (band, seg) => (band === 1 && seg === 2 ? ORANGE : SEA_GREY),
    SEA_GREY,
    BLACK,
  );
  for (const s of [1, -1]) out.push(...strut([-0.02, 0.21, s * 0.045], [-0.075, 0.216, s * 0.054], 0.011, ZINC));
  // The mast rises from the crown to just under the rotor hub at SEA_KING_ROTOR_ORIGIN.
  out.push(...lathe(SEA_KING_ROTOR_ORIGIN[0], 0, [[0.232, 0.022], [0.27, 0.018], [0.292, 0.014]], 8, ZINC));
  return out;
}

// Tail pylon, five-point sections (round leading edge to +x) at height y, swept back as it rises.
const pylonRing = (y: number, cx: number, hl: number, hw: number): Vec3[] => [
  [cx + hl, y, 0], [cx + 0.3 * hl, y, hw], [cx - hl, y, 0.6 * hw], [cx - hl, y, -0.6 * hw], [cx + 0.3 * hl, y, -hw],
];
const TAIL_HUB: Vec3 = [-0.42, 0.252, -0.046];
const TAIL_BLADE = 0.08;

/** Pylon, stabilizer on +z, gearbox and four-blade tail rotor on -z with yellow tips. */
function tail(): Tri[] {
  const out = closedSkin(
    [pylonRing(0.16, -0.355, 0.03, 0.02), pylonRing(0.215, -0.39, 0.032, 0.016), pylonRing(0.272, -0.415, 0.026, 0.012)],
    (band) => (band === 0 ? ORANGE : SEA_GREY),
    ORANGE,
    SEA_GREY,
  );
  out.push(
    ...prism([[-0.385, 0.012], [-0.43, 0.012], [-0.425, 0.11], [-0.395, 0.11]], 0.228, 0.24, SEA_GREY, SEA_GREY, true),
    ...block(-0.42, 0.252, -0.026, 0.026, 0.026, 0.028, ZINC),
    ...block(-0.42, 0.252, -0.044, 0.018, 0.018, 0.01, ZINC),
  );
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    const at = (r: number): Vec3 => [TAIL_HUB[0] + Math.cos(a) * r, TAIL_HUB[1] + Math.sin(a) * r, TAIL_HUB[2]];
    out.push(...strut(at(0.008), at(0.064), 0.005, BLACK), ...strut(at(0.064), at(TAIL_BLADE), 0.005, LAMP));
  }
  return out;
}

/** A wheel on an axle along z: an eight-sided tyre whose lowest corner sits on y = cy - r. */
function wheel(cx: number, cy: number, cz: number, r: number, hw: number): Tri[] {
  const side = (z: number): Vec3[] =>
    Array.from({ length: 8 }, (_, i) => {
      const a = -Math.PI / 2 + (i * Math.PI) / 4;
      return [cx + Math.cos(a) * r, cy + Math.sin(a) * r, z];
    });
  return closedSkin([side(cz - hw), side(cz + hw)], () => BLACK, BLACK, BLACK);
}

// Sponson: six-point sections round (z = SPONSON_Z, y = SPONSON_Y) with a flat bottom, scaled by k.
const SPONSON_Z = 0.126;
const SPONSON_Y = 0.085;
const sponsonRing = (x: number, s: number, k: number): Vec3[] =>
  Array.from({ length: 6 }, (_, i) => {
    const a = -Math.PI / 2 + Math.PI / 6 + (i * Math.PI) / 3;
    return [x, SPONSON_Y + Math.sin(a) * 0.023 * k, s * SPONSON_Z + Math.cos(a) * 0.04 * k];
  });
const MAIN_WHEEL_X = 0.085;
const WHEEL_R = 0.022;

/** Side sponsons (orange fronts) on stub wings, with the main wheels under them, and the tailwheel. */
function gear(): Tri[] {
  const out: Tri[] = [];
  for (const s of [1, -1]) {
    out.push(
      ...closedSkin(
        [sponsonRing(-0.03, s, 0.4), sponsonRing(0, s, 0.92), sponsonRing(0.1, s, 1), sponsonRing(0.15, s, 0.6)],
        (band) => (band === 2 ? ORANGE : SEA_GREY),
        SEA_GREY,
        ORANGE,
      ),
      ...block(0.06, 0.098, s * 0.085, 0.08, 0.016, 0.018, SEA_GREY),
      ...strut([MAIN_WHEEL_X, 0.066, s * SPONSON_Z], [MAIN_WHEEL_X, WHEEL_R, s * SPONSON_Z], 0.006, ZINC),
      ...wheel(MAIN_WHEEL_X, WHEEL_R, s * 0.132, WHEEL_R, 0.012),
      ...block(MAIN_WHEEL_X, WHEEL_R, s * 0.145, 0.014, 0.014, 0.004, ZINC),
      ...strut([-0.19, 0.11, s * 0.014], [-0.2, 0.018, s * 0.014], 0.004, ZINC),
    );
  }
  out.push(...wheel(-0.2, 0.018, 0, 0.018, 0.009));
  return out;
}

/** Sea King body (without the main rotor), wheels on y = 0. */
export const SEA_KING_BODY_POLY: readonly Tri[] = [...fuselage(), ...cabinDetail(), ...engines(), ...tail(), ...gear()];

/** Main rotor centered on its mast axis (place it at SEA_KING_ROTOR_ORIGIN and turn it round y): the Orcadas Sea King's. */
export const SEA_KING_ROTOR_POLY: readonly Tri[] = buildHelicopterRotorTris();

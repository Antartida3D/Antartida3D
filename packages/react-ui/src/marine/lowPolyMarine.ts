import {
  block, column, EMPEROR_SWIM_BILL_TIP, EMPEROR_SWIM_SHOULDER, emperorSwimFlipper, emperorSwimming, facingOut, fromOutline, loftBody, mirrorZ, orient, outward,
  prism, scaled, sectionAt, shift, sideAt, skin, spike, strut, topAt, type Station, type Tri, type Vec3,
} from '../voyage/lowPoly.ts';
import { assembleCetacean, MINKE_PARTS, type CetaceanPolyParts } from '../voyage/whalePolyModels.ts';
import { createSeededRng, smooth01 } from '@antartida/core';
import { MARINE_PALETTE as C } from './models.ts';

/**
 * Low-poly models of Océano (#196, rule 30). Front towards +x, y up, about one unit long, with the
 * pivots of the block models they replace (HUMPBACK_HINGE, LEOPARD_HINGE,
 * EMPEROR_SHOULDER), so the poses of marinePoses.ts move them the same way. Illustrations: they keep
 * the marks that tell each animal apart, not its exact anatomy.
 */

/** Upper faces in one color and lower ones in another, split a little below the middle. */
const backBelly = (back: number, belly: number, n: number, split = -0.25) => (_: number, seg: number) =>
  Math.sin(((seg + 0.5) / n) * Math.PI * 2) > split ? back : belly;

/** Both eyes, on either side of a head. */
const eyes = (x: number, y: number, z: number, s: number, color: number = C.black): Tri[] => [
  ...block(x, y, z, s * 0.6, s, s, color),
  ...block(x, y, -z, s * 0.6, s, s, color),
];

/** A thin solid whose faces all turn away from its own middle, whatever way its outline was given. */
const solid = (tris: readonly Tri[]): Tri[] => {
  const pts = tris.flatMap((t) => [t[0], t[1], t[2]]);
  const mid = [0, 1, 2].map((k) => pts.reduce((sum, p) => sum + p[k], 0) / pts.length) as unknown as Vec3;
  return outward(tris, () => mid);
};

/** A flat paddle out to +z from its root, `outline` given as [x, z]. */
const paddle = (outline: readonly [number, number][], y: number, thick: number, color: number): Tri[] =>
  solid(prism(outline, y - thick / 2, y + thick / 2, color, color, true));

// --- Humpback whale, feeding ---------------------------------------------------------------

/**
 * A thin fin out along +z from its root at z = 0, its leading edge towards +x: `section(u, i)` gives
 * the leading and trailing x and the half thickness at u (0 root, 1 tip) of section i. The faces
 * of each band are, in order: upper front, upper back, lower back, lower front.
 */
function fin(span: number, sections: number, section: (u: number, i: number) => readonly [number, number, number], colorAt: (i: number, seg: number) => number, y = 0): Tri[] {
  const rings = Array.from({ length: sections + 1 }, (_, i) => {
    const u = i / sections;
    const [lead, trail, half] = section(u, i);
    // Thickest a third of the way back from the leading edge, as a flipper or a fluke.
    const thick = lead + (trail - lead) * 0.35;
    return [[lead, y, u * span], [thick, y + half, u * span], [trail, y, u * span], [thick, y - half, u * span]] as Vec3[];
  });
  return skin(rings, colorAt, colorAt(sections - 1, 0));
}

/** Where the lower jaw turns: the corner of the mouth, just below the eye. */
export const HUMPBACK_HINGE: Vec3 = [0.22, -0.04, 0];

/**
 * Body from the tail stock to the tip of the upper jaw, as (x, top, bottom, half width): stout, with
 * the widest girth behind the flippers, a tall and narrow tail stock and a flat head about a third
 * of the length. Ahead of the hinge only the upper jaw is body; the lower jaw is apart. Between the
 * navel and the hinge the belly is raised: there the throat pouch is the underside.
 */
const HUMPBACK_BODY = fromOutline([
  [-0.52, 0.03, 0.002, 0.009], [-0.47, 0.05, -0.016, 0.018], [-0.4, 0.078, -0.042, 0.034], [-0.31, 0.106, -0.074, 0.058],
  [-0.22, 0.128, -0.1, 0.085], [-0.12, 0.142, -0.118, 0.11], [-0.03, 0.146, -0.116, 0.124], [0.06, 0.144, -0.104, 0.128],
  [0.14, 0.135, -0.085, 0.122], [0.22, 0.115, -0.045, 0.108], [0.3, 0.088, -0.036, 0.094], [0.38, 0.064, -0.03, 0.078],
  [0.45, 0.044, -0.024, 0.06], [0.5, 0.03, -0.019, 0.042], [0.527, 0.016, -0.013, 0.022], [0.537, 0.004, -0.007, 0.008],
]);
/** First band of HUMPBACK_BODY ahead of the hinge: below it is the palate, dark inside the mouth. */
const HUMPBACK_PALATE_BAND = 9;
const HUMPBACK_BODY_SEGMENTS = 14;

/**
 * Pectoral flipper, out along +z from its root: about a third of the body long, narrow, its leading
 * edge with a row of knobs (tubercles) and white below; above, dark only near the body.
 */
const HUMPBACK_FLIPPER = fin(0.31, 16, (u, i) => {
  const chord = 0.075 - 0.045 * u;
  const back = 0.035 * u * u;
  const knob = i % 2 && i < 16 ? 0.01 : 0;
  return [chord * 0.35 - back + knob, -chord * 0.65 - back, 0.012 - 0.008 * u];
}, (i, seg) => (seg < 2 && i < 5 ? C.whale : C.white));
/**
 * The right flipper in place: on the flank behind the eye, above the throat so it never sinks into
 * it, reaching back, down and out with its leading edge forward and its broad face to the side.
 */
const HUMPBACK_FLIPPER_ROOT: Vec3 = [0.13, -0.035, 0.085];
const humpbackFlipperAtRoot = orient(HUMPBACK_FLIPPER, [-0.6, -0.63, 0.5], [0.3, 0.45, 0.84]);
const humpbackFlipper = shift(humpbackFlipperAtRoot, ...HUMPBACK_FLIPPER_ROOT);

/** Right half of the flukes, from the notch out: swept back, the trailing edge serrated, white below with a dark rim. */
const humpbackFluke = fin(0.175, 12, (u, i) => {
  const tooth = i % 2 && i < 12 ? 0.008 : 0;
  return [-0.487 - 0.11 * u ** 1.6, -0.56 - 0.055 * Math.min(1, u * 4) ** 0.7 + 0.015 * u * u - tooth, 0.013 - 0.009 * u];
}, (i, seg) => (seg < 2 || (seg === 2 && i > 2) ? C.black : C.white), 0.016);

/** Small dorsal fin on its hump, two thirds of the way back: a ridge of (x, foot, top, half width). */
const HUMPBACK_DORSAL = skin([
  [-0.3, 0.098, 0.106, 0.016], [-0.25, 0.112, 0.13, 0.03], [-0.215, 0.118, 0.165, 0.026], [-0.195, 0.121, 0.185, 0.015],
  [-0.175, 0.124, 0.168, 0.022], [-0.13, 0.13, 0.148, 0.034], [-0.075, 0.136, 0.143, 0.02],
].map(([x, foot, top, w]): Vec3[] => [[x, foot, w], [x, top, 0], [x, foot, -w]]), () => C.black);

/**
 * Baleen on the right side, hanging from the upper jaw: a comb of dark plates, longest at the back,
 * each with its pale fringe of bristles at the tip on the side of the mouth. The jaw hides it closed.
 */
const humpbackBaleen = Array.from({ length: 18 }, (_, i): Tri[] => {
  const x = 0.235 + i * 0.0145;
  const [cy, hy, hz] = sectionAt(HUMPBACK_BODY, x);
  const y = cy - hy * Math.sqrt(1 - 0.45 ** 2) + 0.004;
  const z = 0.45 * hz;
  const long = 0.046 - 0.11 * (x - 0.235);
  // Top inside the upper jaw, narrowing and swept back a little towards the tip; the fringe is the last quarter.
  const [a, b]: Vec3[] = [[x, y, z], [x + 0.0115, y, z]];
  const [c, d]: Vec3[] = [[x + 0.0085, y - long * 0.75, z], [x - 0.001, y - long * 0.75, z]];
  const [e, f]: Vec3[] = [[x + 0.0055, y - long, z], [x - 0.003, y - long, z]];
  const out: Vec3 = [x, y, 0];
  const inward: Vec3 = [x, y, 2 * z];
  const sheet = (p: Vec3, q: Vec3, r: Vec3, w: Vec3, outer: number, inner: number): Tri[] => [
    facingOut(p, q, r, outer, out), facingOut(p, r, w, outer, out), facingOut(p, q, r, inner, inward), facingOut(p, r, w, inner, inward),
  ];
  return [...sheet(a, b, c, d, C.baleen, C.baleen), ...sheet(d, c, e, f, C.baleen, C.fringe)];
}).flat();

/** Knobs (tubercles) in rows on top of the upper jaw, each standing out of the skin. */
const humpbackHeadKnobs = [0.26, 0.31, 0.36, 0.41, 0.46].flatMap((x, i) => [0, 0.5, -0.5].flatMap((f) => {
  if (f !== 0 && i === 4) return [];
  const z = f * sectionAt(HUMPBACK_BODY, x)[2];
  return spike([x, topAt(HUMPBACK_BODY, x, z) - 0.004, z], [0, 0.016, f * 0.014], 0.01, C.whaleKnob);
}));

/** Color of a face of the HUMPBACK_BODY loft: dark back, grey flanks, the palate dark inside the mouth. */
const humpbackSkin = (band: number, seg: number) => {
  const s = Math.sin(((seg + 0.5) / HUMPBACK_BODY_SEGMENTS) * Math.PI * 2);
  if (s > 0.45) return C.black;
  return s < -0.85 && band >= HUMPBACK_PALATE_BAND ? C.black : C.whale;
};
/** A knuckle on top of the tail stock. */
const humpbackKnuckle = (x: number) => spike([x, topAt(HUMPBACK_BODY, x, 0) - 0.003, 0], [0, 0.01, 0], 0.008, C.black);
/** Flukes and the knuckles behind the tail station: what beats with the tail on the open map. */
const humpbackTailDetail: readonly Tri[] = [...humpbackFluke, ...mirrorZ(humpbackFluke), ...[-0.36, -0.42].flatMap(humpbackKnuckle)];
/** Dorsal fin, knobs, eyes and baleen: the rest of the body. */
const humpbackTrunkDetail: readonly Tri[] = [
  ...HUMPBACK_DORSAL,
  ...humpbackKnuckle(-0.3),
  ...humpbackHeadKnobs,
  ...eyes(0.185, 0, sideAt(HUMPBACK_BODY, 0.185, 0) - 0.002, 0.016),
  ...humpbackBaleen, ...mirrorZ(humpbackBaleen),
];

/** Head, back and tail with the flukes, the dorsal fin and the long flippers; the jaw and throat are separate. */
export const HUMPBACK_BODY_TRIS: readonly Tri[] = [
  ...loftBody(HUMPBACK_BODY, humpbackSkin, [C.whale, C.whale], HUMPBACK_BODY_SEGMENTS),
  ...humpbackTailDetail,
  ...humpbackTrunkDetail,
  ...humpbackFlipper, ...mirrorZ(humpbackFlipper),
];

/** Lower jaw from HUMPBACK_HINGE, wider than the upper one so it closes round it; the mouth floor shows when it opens. */
const HUMPBACK_JAW: readonly Station[] = [
  [-0.04, -0.012, 0.026, 0.07], [0.02, -0.014, 0.028, 0.105], [0.08, -0.012, 0.026, 0.102], [0.16, -0.004, 0.023, 0.086],
  [0.23, 0.004, 0.02, 0.066], [0.28, 0.011, 0.017, 0.048], [0.31, 0.017, 0.013, 0.028], [0.325, 0.016, 0.007, 0.01],
];
const HUMPBACK_JAW_SEGMENTS = 12;
/** Bands of HUMPBACK_JAW whose top is the floor of the mouth, inside the closed lips. */
const HUMPBACK_MOUTH_FLOOR_BANDS = 3;

/** Lower jaw, measured from HUMPBACK_HINGE: dark lips, pale chin, knobs along its sides and the big one at the tip. */
export const HUMPBACK_JAW_TRIS: readonly Tri[] = [
  ...loftBody(HUMPBACK_JAW, (band, seg) => {
    const s = Math.sin(((seg + 0.5) / HUMPBACK_JAW_SEGMENTS) * Math.PI * 2);
    // The floor of the mouth stops short of the chin, which shows past the upper jaw.
    if (s > 0.9 && band <= HUMPBACK_MOUTH_FLOOR_BANDS) return C.gum;
    return s > 0.4 ? C.black : s < -0.5 ? C.pleat : C.whale;
  }, [C.whale, C.whale], HUMPBACK_JAW_SEGMENTS),
  ...[0.1, 0.16, 0.22, 0.27].flatMap((x) => {
    const [cy, hy] = sectionAt(HUMPBACK_JAW, x);
    const z = sideAt(HUMPBACK_JAW, x, cy + hy * 0.3) - 0.004;
    return [...spike([x, cy + hy * 0.3, z], [0, 0.003, 0.011], 0.007, C.whaleKnob), ...spike([x, cy + hy * 0.3, -z], [0, 0.003, -0.011], 0.007, C.whaleKnob)];
  }),
  ...spike([0.315, 0.008, 0], [0.012, -0.008, 0], 0.011, C.whaleKnob),
];

/**
 * Throat pouch at rest, as (x, top, bottom, half width) in the body: from the tip of the lower jaw to
 * the navel, its top hidden in the jaw and the belly, its bottom the underside of the whale.
 */
const HUMPBACK_POUCH: readonly Station[] = [
  [-0.11, -0.085, -0.103, 0.014], [-0.08, -0.07, -0.113, 0.05], [-0.03, -0.062, -0.127, 0.085], [0.04, -0.057, -0.132, 0.106],
  [0.12, -0.054, -0.13, 0.112], [0.2, -0.051, -0.12, 0.108], [0.28, -0.047, -0.105, 0.1], [0.36, -0.043, -0.089, 0.088],
  [0.43, -0.039, -0.074, 0.07], [0.49, -0.034, -0.06, 0.048], [0.525, -0.028, -0.048, 0.026], [0.545, -0.022, -0.036, 0.008],
];
const POUCH_SEGMENTS = 30;

/**
 * A point of the throat (from HUMPBACK_HINGE) carried by a jaw opened `jaw` radians: ahead of and
 * above the hinge it turns with the jaw, behind it stays with the belly, and below the hinge the turn
 * fades from one to the other. The skin stretches between jaw and belly instead of coming apart.
 */
function opened([x, y, z]: Vec3, jaw: number): Vec3 {
  const a = Math.atan2(y, x);
  const b = a > Math.PI / 2 ? a : a >= 0 ? a - jaw : -Math.PI + ((a + Math.PI) * (Math.PI - jaw)) / Math.PI;
  const r = Math.hypot(x, y);
  return [r * Math.cos(b), r * Math.sin(b), z];
}

/**
 * The pleated throat pouch, measured from HUMPBACK_HINGE, with the jaw open `jaw` radians and the
 * throat `fill` times as deep as at rest (humpbackFilter). It swells most under the hinge, less to
 * the chin and not at the navel, so the full whale looks like a tadpole; it is one skin from the tip
 * of the jaw to the belly, so it never comes apart from either.
 */
export function humpbackThroat(jaw: number, fill: number): Tri[] {
  const [hx, hy] = HUMPBACK_HINGE;
  const rings = HUMPBACK_POUCH.map(([x, top, bottom, hz]) => {
    const swell = smooth01((x + 0.11) / 0.23) * (1 - 0.65 * smooth01((x - 0.3) / 0.25)) * (fill - 1);
    const low = top - (top - bottom) * (1 + swell);
    const half = (top - low) / 2;
    const wide = hz * (1 + 0.25 * swell);
    return Array.from({ length: POUCH_SEGMENTS }, (_, i) => {
      const a = (i / POUCH_SEGMENTS) * Math.PI * 2;
      return opened([x - hx, top - half + Math.sin(a) * half - hy, Math.cos(a) * wide], jaw);
    });
  });
  // White ridges with narrow grooves below; the sides, hidden in the body at rest, are the color of the flank.
  return skin(rings, (_, seg) => (Math.sin(((seg + 0.5) / POUCH_SEGMENTS) * Math.PI * 2) > 0.3 ? C.whale : seg % 3 ? C.pleat : C.pleatLine), C.pleat);
}

/** The throat at rest, mouth closed. */
export const HUMPBACK_THROAT_TRIS: readonly Tri[] = humpbackThroat(0, 1);

/** Station of HUMPBACK_BODY where the open map bends the tail: the tail stock, behind the dorsal fin. */
const HUMPBACK_TAIL_STATION = 3;
const [tailX, tailY] = HUMPBACK_BODY[HUMPBACK_TAIL_STATION];

/**
 * The same humpback for the open map and its card (whalePolyModels.ts, SeaLife): mouth shut, cut
 * into body, tail and flippers so the map can beat the tail and wave the flippers.
 */
export const HUMPBACK_PARTS: CetaceanPolyParts = {
  tailPivot: [tailX, tailY, 0],
  flipperPivot: HUMPBACK_FLIPPER_ROOT,
  body: [
    ...loftBody(HUMPBACK_BODY.slice(HUMPBACK_TAIL_STATION), (band, seg) => humpbackSkin(band + HUMPBACK_TAIL_STATION, seg), [C.whale, C.whale], HUMPBACK_BODY_SEGMENTS),
    ...humpbackTrunkDetail,
    ...shift(HUMPBACK_JAW_TRIS, ...HUMPBACK_HINGE),
    ...shift(HUMPBACK_THROAT_TRIS, ...HUMPBACK_HINGE),
  ],
  tail: shift([
    ...loftBody(HUMPBACK_BODY.slice(0, HUMPBACK_TAIL_STATION + 1), humpbackSkin, [C.whale, C.whale], HUMPBACK_BODY_SEGMENTS),
    ...humpbackTailDetail,
  ], -tailX, -tailY, 0),
  flipperR: humpbackFlipperAtRoot,
  flipperL: mirrorZ(humpbackFlipperAtRoot),
};

// --- Leopard seal --------------------------------------------------------------------------

const along = (a: Vec3, b: Vec3, k = 1): Vec3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const unitV = (v: Vec3): Vec3 => {
  const l = Math.hypot(...v);
  return [v[0] / l, v[1] / l, v[2] / l];
};

/** Point and outward normal of the skin of a lofted body at x, `a` radians round its axis from +z (π/2 is the top). */
function skinAt(stations: readonly Station[], x: number, a: number): [Vec3, Vec3] {
  const [cy, hy, hz] = sectionAt(stations, x);
  const [cy0, hy0, hz0] = sectionAt(stations, x - 0.004);
  const [cy1, hy1, hz1] = sectionAt(stations, x + 0.004);
  const [dcy, dhy, dhz] = [(cy1 - cy0) / 0.008, (hy1 - hy0) / 0.008, (hz1 - hz0) / 0.008];
  const s = Math.sin(a), c = Math.cos(a);
  return [[x, cy + s * hy, c * hz], unitV([-(s * dcy) / hy - (s * s * dhy) / hy - (c * c * dhz) / hz, s / hy, c / hz])];
}

/**
 * A spot laid on the skin of a lofted body: an uneven patch of `r` round (x, a), its rim following
 * the curve of the skin a hair above it, so it reads as a mark of the coat and not as a plate.
 */
function skinSpot(stations: readonly Station[], x: number, a: number, r: number, color: number, rng: () => number, corners = 6): Tri[] {
  const [mid, n] = skinAt(stations, x, a);
  const [, hy, hz] = sectionAt(stations, x);
  const perAngle = Math.hypot(Math.cos(a) * hy, Math.sin(a) * hz);
  const lift = 0.0016;
  const turn0 = rng() * Math.PI;
  const rim = Array.from({ length: corners }, (_, k) => {
    const t = turn0 + (k / corners) * Math.PI * 2;
    const rk = r * (0.7 + 0.5 * rng());
    const [p, m] = skinAt(stations, x + Math.cos(t) * rk * 1.2, a + (Math.sin(t) * rk * 0.85) / perAngle);
    return along(p, m, lift);
  });
  const center = along(mid, n, lift * 1.3);
  const inside = along(mid, n, -0.03);
  return rim.map((p, k) => facingOut(center, p, rim[(k + 1) % corners], color, inside));
}

/**
 * Spots scattered over a stretch of skin from x0 to x1, `density(x, s)` (s the height round the
 * body, 1 on top and -1 below) the chance of one at a place; never two on top of each other.
 */
function scatterSpots(stations: readonly Station[], x0: number, x1: number, tries: number, seed: number, size: readonly [number, number], color: number, density: (x: number, s: number) => number): Tri[] {
  const rng = createSeededRng(seed);
  const placed: Vec3[] = [];
  const out: Tri[] = [];
  for (let i = 0; i < tries; i++) {
    const x = x0 + (x1 - x0) * rng();
    const a = rng() * Math.PI * 2;
    const r = size[0] + (size[1] - size[0]) * rng();
    if (rng() > density(x, Math.sin(a))) continue;
    const [p] = skinAt(stations, x, a);
    if (placed.some(([px, py, pz]) => Math.hypot(px - p[0], py - p[1], pz - p[2]) < r * 2.3)) continue;
    placed.push(p);
    out.push(...skinSpot(stations, x, a, r, color, rng));
  }
  return out;
}

/** An outline of (x, top, bottom, half width) made smooth: `k` stations between each two, on a Catmull-Rom curve through them. */
const smoothOutline = (outline: readonly Station[], k: number): Station[] => {
  const at = (i: number) => outline[Math.max(0, Math.min(outline.length - 1, i))];
  const out: Station[] = [];
  for (let i = 0; i < outline.length - 1; i++) {
    for (let j = 0; j < k; j++) {
      const t = j / k;
      const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
      out.push([0, 1, 2, 3].map((c) => 0.5 * (2 * p1[c] + (p2[c] - p0[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t * t + (3 * p1[c] - p0[c] - 3 * p2[c] + p3[c]) * t * t * t)) as unknown as Station);
    }
  }
  out.push(outline[outline.length - 1]);
  return out;
};

/** Whether a point is well inside a lofted body. */
const insideLoft = (stations: readonly Station[], [x, y, z]: Vec3) => {
  if (x < stations[0][0] || x > stations[stations.length - 1][0]) return false;
  const [cy, hy, hz] = sectionAt(stations, x);
  return ((y - cy) / hy) ** 2 + (z / hz) ** 2 < 0.8;
};
/** Middle of the face `seg` of band `band` of a loftBody of `n` faces round. */
const faceMidOf = (stations: readonly Station[], band: number, seg: number, n: number): Vec3 => {
  const x = (stations[band][0] + stations[band + 1][0]) / 2;
  const [cy, hy, hz] = sectionAt(stations, x);
  const a = ((seg + 0.5) / n) * Math.PI * 2;
  const k = Math.cos(Math.PI / n);
  return [x, cy + Math.sin(a) * hy * k, Math.cos(a) * hz * k];
};

/** Where the lower jaw of the leopard seal turns: the back of its wide gape, behind the eye. */
export const LEOPARD_HINGE: Vec3 = [0.335, -0.026, 0];
/** Where the head meets the neck: the head turns there on the open map. */
const LEOPARD_NECK: Vec3 = [0.235, 0, 0];
const LEOPARD_SEGMENTS = 16;

/**
 * Body from the hind flippers to the neck, as (x, top, bottom, half width): long and slender,
 * thickest at the chest and narrowing to a marked neck, thinner than other seals.
 */
const LEOPARD_TRUNK = fromOutline(smoothOutline([
  [-0.42, 0.016, -0.014, 0.017], [-0.37, 0.029, -0.027, 0.031], [-0.3, 0.045, -0.044, 0.048], [-0.21, 0.06, -0.061, 0.062],
  [-0.11, 0.071, -0.074, 0.073], [-0.01, 0.077, -0.079, 0.078], [0.07, 0.076, -0.077, 0.076], [0.14, 0.068, -0.068, 0.066],
  [0.195, 0.056, -0.057, 0.054], [0.235, 0.048, -0.05, 0.047],
], 3));
/**
 * The head from the neck to the nose: big, long and flat on top like a reptile's, broadest at the
 * back of the gape. Ahead of the hinge only the upper jaw is head: its underside is the palate.
 */
const LEOPARD_HEAD = fromOutline(smoothOutline([
  [0.235, 0.048, -0.05, 0.047], [0.265, 0.054, -0.054, 0.056], [0.3, 0.06, -0.053, 0.063], [0.335, 0.059, -0.028, 0.063],
  [0.37, 0.054, -0.023, 0.057], [0.41, 0.044, -0.02, 0.048], [0.45, 0.034, -0.017, 0.04], [0.48, 0.026, -0.015, 0.033],
  [0.502, 0.018, -0.013, 0.026], [0.514, 0.008, -0.012, 0.012],
], 2));
/** Lower jaw from LEOPARD_HINGE: a little wider than the head, so it closes round the upper jaw, and round at the back so it never leaves a gap as it opens. */
const LEOPARD_JAW = fromOutline(smoothOutline([
  [-0.04, 0.012, -0.024, 0.036], [-0.015, 0.026, -0.034, 0.06], [0.02, 0.028, -0.034, 0.065], [0.06, 0.025, -0.03, 0.057],
  [0.1, 0.021, -0.025, 0.048], [0.135, 0.017, -0.019, 0.039], [0.16, 0.017, -0.012, 0.029], [0.179, 0.015, -0.004, 0.013],
], 2));
const JAW_SEGMENTS = 14;
const atHinge = (p: Vec3): Vec3 => along(p, LEOPARD_HINGE);
const fromHinge = (p: Vec3): Vec3 => along(p, LEOPARD_HINGE, -1);

/** Height round the body of the face `seg` of a loft of `n` faces: 1 on top, -1 below. */
const heightOf = (seg: number, n = LEOPARD_SEGMENTS) => Math.sin(((seg + 0.5) / n) * Math.PI * 2);
/** Dark grey back, a lighter band along the flank and silvery pale throat and belly. */
const leopardCoat = (_band: number, seg: number) => {
  const s = heightOf(seg);
  return s > 0.4 ? C.leopard : s > 0 ? C.leopardFlank : C.leopardPale;
};

/** Fore flipper, out along +z from its root: long, with a straight leading edge and a narrow tip. */
const LEOPARD_FORE = fin(0.2, 8, (u) => {
  const lead = 0.026 * (1 - u) - 0.004 * u * u;
  const trail = -0.058 * (1 - u) ** 0.8 - 0.013 * u;
  return [lead, trail, 0.01 - 0.006 * u];
}, (_, seg) => (seg < 2 ? C.leopard : C.leopardPale));
const LEOPARD_FORE_ROOT: Vec3 = [0.15, -0.046, 0.042];
const leopardForeAtRoot = orient(LEOPARD_FORE, [-0.5, -0.38, 0.78], [0.05, 0.9, 0.4]);

/** Hind flipper of a true seal: a fan out from the tail, its two outer toes longer than the middle ones. */
const LEOPARD_HIND = paddle([[-0.011, 0], [0.011, 0], [0.03, 0.075], [0.037, 0.115], [0.014, 0.098], [0, 0.093], [-0.014, 0.098], [-0.037, 0.115], [-0.03, 0.075]], 0, 0.008, C.leopard);
const LEOPARD_TAIL_ROOT: Vec3 = [-0.412, 0, 0];
const leopardHindAtRoot = shift(orient(LEOPARD_HIND, [-1, 0.02, 0.26], [0, 0.45, 0.89]), 0, 0, 0.009);

/** Three-pointed back teeth (P04) and a big canine ahead, along one side of a jaw; `up` is 1 below the palate, -1 on the lower jaw. */
function leopardTeeth(stations: readonly Station[], xs: readonly number[], canine: number, side: number, up: 1 | -1, length: number): Tri[] {
  const at = (x: number, inset: number): Vec3 => {
    const [cy, hy, hz] = sectionAt(stations, x);
    return [x, cy - up * (hy * Math.sqrt(1 - inset ** 2) - 0.002), side * inset * hz];
  };
  return [
    ...spike(at(canine, 0.5), [0.004, -up * length, 0], 0.0058, C.tooth),
    ...xs.flatMap((x) => {
      // Set in from the lips, so the closed mouth hides them.
      const b = at(x, up > 0 ? 0.62 : 0.52);
      return [
        ...spike(b, [0, -up * 0.016, 0], 0.0042, C.tooth),
        ...spike(along(b, [-0.008, 0, 0]), [-0.003, -up * 0.009, 0], 0.003, C.tooth),
        ...spike(along(b, [0.008, 0, 0]), [0.003, -up * 0.009, 0], 0.003, C.tooth),
      ];
    }),
  ];
}

/** Lower jaw, measured from LEOPARD_HINGE: the floor of the mouth inside the upper jaw, dark lips, pale spotted chin, canines and back teeth. */
export const LEOPARD_JAW_TRIS: readonly Tri[] = [
  ...loftBody(LEOPARD_JAW, (band, seg) => {
    if (insideLoft(LEOPARD_HEAD, atHinge(faceMidOf(LEOPARD_JAW, band, seg, JAW_SEGMENTS)))) return C.gum;
    return heightOf(seg, JAW_SEGMENTS) > 0.2 ? C.leopard : C.leopardPale;
  }, [C.leopardPale, C.leopardPale], JAW_SEGMENTS),
  ...scatterSpots(LEOPARD_JAW, 0.0, 0.16, 50, 913, [0.006, 0.01], C.leopardSpot, (_, s) => (s < -0.1 ? 0.8 : 0)),
  ...leopardTeeth(LEOPARD_JAW, [0.04, 0.064, 0.088, 0.112], 0.142, 1, -1, 0.022),
  ...leopardTeeth(LEOPARD_JAW, [0.04, 0.064, 0.088, 0.112], 0.142, -1, -1, 0.022),
];

/** Big dark eyes set high on the head, with a glint; nostrils on top of the snout; short whiskers. */
const leopardFace: Tri[] = [
  ...[0.6, Math.PI - 0.6].flatMap((a) => {
    const rng = createSeededRng(41);
    const [, n] = skinAt(LEOPARD_HEAD, 0.377, a + 0.16);
    return [
      ...skinSpot(LEOPARD_HEAD, 0.372, a, 0.012, C.black, rng, 7),
      ...skinSpot(LEOPARD_HEAD, 0.377, a + 0.16, 0.0032, C.eyeWhite, rng, 5).map(([p, q, r, col]): Tri => [along(p, n, 0.0012), along(q, n, 0.0012), along(r, n, 0.0012), col]),
    ];
  }),
  ...[Math.PI / 2 - 0.42, Math.PI / 2 + 0.42].flatMap((a) => skinSpot(LEOPARD_HEAD, 0.502, a, 0.0045, C.black, createSeededRng(43), 5)),
  ...[1, -1].flatMap((side) => [0.47, 0.485].flatMap((x, i) => {
    const [p] = skinAt(LEOPARD_HEAD, x, side > 0 ? -0.05 - i * 0.12 : Math.PI + 0.05 + i * 0.12);
    return strut(p, along(p, [0.006, -0.003, side * 0.016]), 0.001, C.leopardPale, false);
  })),
];

/** Head, from the neck: dark crown, the palate inside the mouth, spotted throat, eyes and upper teeth. */
const leopardHead: Tri[] = [
  ...loftBody(LEOPARD_HEAD, (band, seg) => {
    const mid = faceMidOf(LEOPARD_HEAD, band, seg, LEOPARD_SEGMENTS);
    if (mid[0] > LEOPARD_HINGE[0] && insideLoft(LEOPARD_JAW, fromHinge(mid))) return C.gum;
    // The upper lip is dark down to the mouth line.
    if (mid[0] > LEOPARD_HINGE[0] - 0.01 && heightOf(seg) < 0) return C.leopard;
    return leopardCoat(band, seg);
  // Closed at the neck too: on the map the head turns there.
  }, [C.leopard, C.leopard], LEOPARD_SEGMENTS),
  ...scatterSpots(LEOPARD_HEAD, 0.24, 0.33, 80, 517, [0.006, 0.011], C.leopardSpot, (_, s) => (s < 0 ? 0.85 : 0.05)),
  ...scatterSpots(LEOPARD_HEAD, 0.24, 0.43, 40, 518, [0.005, 0.008], C.leopardLight, (_, s) => (s > 0.75 ? 0.4 : 0)),
  ...leopardFace,
  ...leopardTeeth(LEOPARD_HEAD, [0.372, 0.396, 0.42, 0.444], 0.47, 1, 1, 0.02),
  ...leopardTeeth(LEOPARD_HEAD, [0.372, 0.396, 0.42, 0.444], 0.47, -1, 1, 0.02),
];

/** The trunk with the spots of the coat: many dark ones on the pale throat, chest, belly and flanks, a few pale ones on the back. */
const leopardTrunk: Tri[] = [
  ...loftBody(LEOPARD_TRUNK, leopardCoat, [C.leopard, C.leopard], LEOPARD_SEGMENTS),
  ...scatterSpots(LEOPARD_TRUNK, -0.38, 0.235, 900, 311, [0.008, 0.016], C.leopardSpot, (x, s) => (s < -0.1 ? 0.9 : s < 0.35 ? 0.5 : 0.04) * (x < -0.3 ? 0.5 : 1)),
  ...scatterSpots(LEOPARD_TRUNK, -0.34, 0.2, 260, 312, [0.007, 0.013], C.leopardLight, (_, s) => (s > 0.55 ? 0.35 : 0)),
];

/** The lowest point of the belly: where the seal rests on the ice. */
const LEOPARD_FLOOR = Math.min(...LEOPARD_TRUNK.map(([, cy, hy]) => cy - hy));

/**
 * Leopard seal (#8): long and slender, a big reptilian head on a marked neck, long fore flippers,
 * dark grey back and pale throat and belly with dark spots. The lower jaw is apart, at LEOPARD_HINGE.
 */
export const LEOPARD_BODY_TRIS: readonly Tri[] = [
  ...leopardTrunk,
  ...leopardHead,
  ...shift(leopardForeAtRoot, ...LEOPARD_FORE_ROOT),
  ...shift(mirrorZ(leopardForeAtRoot), LEOPARD_FORE_ROOT[0], LEOPARD_FORE_ROOT[1], -LEOPARD_FORE_ROOT[2]),
  ...shift(leopardHindAtRoot, ...LEOPARD_TAIL_ROOT),
  ...shift(mirrorZ(leopardHindAtRoot), ...LEOPARD_TAIL_ROOT),
];

/**
 * The same leopard seal for the open map and its card (SeaLife, SeaPreview), mouth shut, belly on
 * y = 0 so it lies on its floe, cut into the parts the map moves: head at the neck, fore flippers
 * at the shoulders (the left one at -z) and hind flippers at the tail.
 */
export interface LeopardPolyParts {
  readonly neck: Vec3;
  readonly flipperPivot: Vec3;
  readonly tailPivot: Vec3;
  readonly body: readonly Tri[];
  readonly head: readonly Tri[];
  readonly flipperR: readonly Tri[];
  readonly flipperL: readonly Tri[];
  readonly tail: readonly Tri[];
}
const onFloor = (p: Vec3): Vec3 => [p[0], p[1] - LEOPARD_FLOOR, p[2]];
export const LEOPARD_PARTS: LeopardPolyParts = {
  neck: onFloor(LEOPARD_NECK),
  flipperPivot: onFloor(LEOPARD_FORE_ROOT),
  tailPivot: onFloor(LEOPARD_TAIL_ROOT),
  body: shift(leopardTrunk, 0, -LEOPARD_FLOOR, 0),
  head: shift([...leopardHead, ...shift(LEOPARD_JAW_TRIS, ...LEOPARD_HINGE)], -LEOPARD_NECK[0], -LEOPARD_NECK[1], -LEOPARD_NECK[2]),
  flipperR: leopardForeAtRoot,
  flipperL: mirrorZ(leopardForeAtRoot),
  tail: [...leopardHindAtRoot, ...mirrorZ(leopardHindAtRoot)],
};

// --- Emperor penguin, swimming: the emperor of the map and of Cerro Nevado, laid flat ---------

/** emperorSwimming() is one unit long; the emperor of Océano is a little shorter, as the model it replaces. */
const EMPEROR_SWIM_K = 0.75;
/** Where each flipper meets the body. */
export const EMPEROR_SHOULDER: Vec3 = [EMPEROR_SWIM_SHOULDER[0] * EMPEROR_SWIM_K, EMPEROR_SWIM_SHOULDER[1] * EMPEROR_SWIM_K, EMPEROR_SWIM_SHOULDER[2] * EMPEROR_SWIM_K];
/** Tip of the bill of the swimming emperor, along +x: where it holds a caught fish. */
export const EMPEROR_BILL_TIP = EMPEROR_SWIM_BILL_TIP * EMPEROR_SWIM_K;
/** The emperor lying flat to swim, belly down. */
export const EMPEROR_SWIM_TRIS: readonly Tri[] = scaled(emperorSwimming(), EMPEROR_SWIM_K);
/** Right flipper from EMPEROR_SHOULDER (towards +z), black above, pale below; the left one is its mirror. */
export const EMPEROR_FLIPPER_TRIS: readonly Tri[] = scaled(emperorSwimFlipper(), EMPEROR_SWIM_K);

// --- Krill, diatoms, fish and squid ----------------------------------------------------------

/** Antarctic krill: a segmented, nearly transparent shell with red spots, big black eyes and a green gut. */
export const KRILL_TRIS: readonly Tri[] = [
  ...loftBody([[-0.4, -0.03, 0.01, 0.04], [-0.3, -0.02, 0.04, 0.035], [-0.18, -0.01, 0.055, 0.045], [-0.04, 0.0, 0.065, 0.055],
    [0.15, 0.0, 0.08, 0.07], [0.3, 0.02, 0.06, 0.055], [0.36, 0.03, 0.03, 0.03]],
  (band, seg) => (seg === 2 && band >= 3 && band <= 4 ? C.krillGut : (band + seg) % 5 === 0 ? C.krillRed : C.krillShell), [C.krillRed, C.krillShell], 8),
  ...eyes(0.34, 0.03, 0.045, 0.045),
  ...strut([0.36, 0.04, 0.02], [0.58, 0.05, 0.05], 0.006, C.krillRed),
  ...strut([0.36, 0.04, -0.02], [0.58, 0.05, -0.05], 0.006, C.krillRed),
  // The swimming legs under the body.
  ...[-0.2, -0.1, 0.0, 0.1, 0.2].flatMap((x) => [...strut([x, -0.05, 0.03], [x - 0.02, -0.13, 0.04], 0.008, C.krillLeg), ...strut([x, -0.05, -0.03], [x - 0.02, -0.13, -0.04], 0.008, C.krillLeg)]),
];

/** A round diatom seen from above, magnified: a glassy disc with radial ribs, a clear center and plastids. */
export const DIATOM_DISC_TRIS: readonly Tri[] = [
  ...column(0, 0, [[-0.06, 0.38, 0.38], [0.04, 0.42, 0.42], [0.06, 0.36, 0.36]], 16, (_, seg) => (seg % 2 ? C.diatomRim : C.diatom)),
  ...column(0, 0, [[0.06, 0.09, 0.09], [0.072, 0.07, 0.07]], 8, C.diatomGlass),
  ...[[0.16, -0.05], [-0.12, 0.14], [-0.1, -0.16]].flatMap(([x, z]) => block(x, 0.066, z, 0.08, 0.012, 0.06, C.plastid)),
];

/** A chain of long diatom cells joined end to end, magnified. */
export const DIATOM_CHAIN_TRIS: readonly Tri[] = [0, 1, 2, 3].flatMap((i) => {
  const x = -0.39 + i * 0.26;
  return [
    ...loftBody([[x - 0.11, 0, 0.03, 0.04], [x - 0.08, 0, 0.05, 0.06], [x + 0.08, 0, 0.05, 0.06], [x + 0.11, 0, 0.03, 0.04]], () => C.diatom, [C.diatomGlass, C.diatomGlass], 8),
    ...block(x, 0.05, 0, 0.12, 0.008, 0.06, C.plastid),
  ];
});

/** Antarctic silverfish: slender and silvery, darker above, with big eyes and fins. */
export const SILVERFISH_TRIS: readonly Tri[] = [
  ...loftBody([[-0.42, 0, 0.012, 0.01], [-0.3, 0, 0.04, 0.03], [-0.1, 0, 0.065, 0.048], [0.16, 0, 0.065, 0.048], [0.34, 0.0, 0.05, 0.042], [0.42, -0.01, 0.02, 0.02]],
    backBelly(C.silverDark, C.silver, 8, 0.45), [C.silverDark, C.silver], 8),
  // The tail fin stands upright: a flat outline in x-z turned to x-y.
  ...solid(prism([[-0.42, 0.0], [-0.49, 0.08], [-0.5, 0.0], [-0.49, -0.08]], -0.006, 0.006, C.silverDark, C.silverDark, true)
    .map(([a, b, c, col]): Tri => [[a[0], a[2], a[1]], [b[0], b[2], b[1]], [c[0], c[2], c[1]], col])),
  ...spike([-0.05, 0.06, 0], [-0.08, 0.04, 0], 0.012, C.silverDark),
  ...spike([-0.12, -0.06, 0], [-0.06, -0.03, 0], 0.01, C.silverDark),
  ...eyes(0.34, 0.02, 0.04, 0.03),
];

/** A squid: mantle behind with fins at the tip, eyes, arms and two longer tentacles ahead. */
export const SQUID_TRIS: readonly Tri[] = [
  ...loftBody([[-0.36, 0, 0.01, 0.01], [-0.28, 0, 0.045, 0.045], [-0.1, 0, 0.07, 0.07], [0.12, 0, 0.065, 0.065], [0.2, 0, 0.055, 0.06]],
    (band, seg) => ((band + seg) % 5 === 0 ? C.squidSpot : C.squid), [C.squid, C.squid], 8),
  ...paddle([[-0.36, 0.0], [-0.3, 0.02], [-0.24, 0.1], [-0.33, 0.07]], 0, 0.01, C.squidDark),
  ...mirrorZ(paddle([[-0.36, 0.0], [-0.3, 0.02], [-0.24, 0.1], [-0.33, 0.07]], 0, 0.01, C.squidDark)),
  ...eyes(0.18, 0.02, 0.058, 0.03),
  ...Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2;
    return strut([0.2, Math.sin(a) * 0.03, Math.cos(a) * 0.03], [0.4, Math.sin(a) * 0.05, Math.cos(a) * 0.05], 0.008, C.squidDark);
  }).flat(),
  ...strut([0.2, 0, 0.012], [0.54, 0, 0.02], 0.007, C.squid),
  ...strut([0.2, 0, -0.012], [0.54, 0, -0.02], 0.007, C.squid),
];

/** A whale or seal with its jaw (and throat) hung at the hinge, mouth closed: as the scene draws it at rest. */
const atRest = (body: readonly Tri[], hinge: Vec3, jaw: readonly Tri[], throat: readonly Tri[] = []): Tri[] => [
  ...body, ...shift(jaw, ...hinge), ...shift(throat, ...hinge),
];
export const HUMPBACK_TRIS: readonly Tri[] = atRest(HUMPBACK_BODY_TRIS, HUMPBACK_HINGE, HUMPBACK_JAW_TRIS, HUMPBACK_THROAT_TRIS);
export const LEOPARD_TRIS: readonly Tri[] = atRest(LEOPARD_BODY_TRIS, LEOPARD_HINGE, LEOPARD_JAW_TRIS);

/** Every model of Océano, whole and at rest, for the test of least detail and the food web. */
export const MARINE_POLY_MODELS: Readonly<Record<string, readonly Tri[]>> = {
  'marine:humpback': HUMPBACK_TRIS,
  'marine:minke': assembleCetacean(MINKE_PARTS),
  'marine:leopard': LEOPARD_TRIS,
  'marine:emperor-swim': [...EMPEROR_SWIM_TRIS, ...shift(EMPEROR_FLIPPER_TRIS, ...EMPEROR_SHOULDER), ...shift(mirrorZ(EMPEROR_FLIPPER_TRIS), EMPEROR_SHOULDER[0], EMPEROR_SHOULDER[1], -EMPEROR_SHOULDER[2])],
  'marine:krill': KRILL_TRIS,
  'marine:diatom-disc': DIATOM_DISC_TRIS,
  'marine:diatom-chain': DIATOM_CHAIN_TRIS,
  'marine:silverfish': SILVERFISH_TRIS,
  'marine:squid': SQUID_TRIS,
};

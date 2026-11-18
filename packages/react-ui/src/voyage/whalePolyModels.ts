import {
  block, fromOutline, loftAlongX, loftBody, mirrorZ, orient, prism, sectionAt, shift, sideAt, skin, topAt, type LoftStation, type Station, type Tri, type Vec3,
} from './lowPoly.ts';

/**
 * Low-poly cetaceans for the general map (rule 30): nose to +x, y up, ~1 unit long. The humpback
 * is the one of Océano, cut into these parts (HUMPBACK_PARTS in marine/lowPolyMarine.ts).
 * Each whale is split into body, tail (pivoted at `tailPivot`), and pectoral flippers
 * (pivoted at `flipperPivot`) so SeaLife can animate tail beats, flipper waves, and breaches.
 */

const MINKE_DARK = 0x3b4854;
const MINKE_BELLY = 0xdbe2e6;
/** Light grey of the chevron, shoulder and flank marks. */
const MINKE_FLANK = 0x6c7985;
/** Light grey of the flippers, lighter than the back so they show against it. */
const MINKE_FLIPPER_GREY = 0x8794a0;
const MINKE_FLIPPER_EDGE = 0xe6ecef;
const ORCA_BLACK = 0x1f2a36;
const SADDLE_GREY = 0x8e989f;
const WHITE = 0xf4f7f8;
const BLACK = 0x1f2a36;
const SPRAY_BLUE = 0xd8ecf8;

export interface CetaceanPolyParts {
  readonly body: readonly Tri[];
  readonly tail: readonly Tri[];
  readonly flipperR: readonly Tri[];
  readonly flipperL: readonly Tri[];
  readonly tailPivot: readonly [number, number, number];
  readonly flipperPivot: readonly [number, number, number];
}

const ringZY = (cz: number, cy: number, rz: number, ry: number, n: number): [number, number][] =>
  Array.from({ length: n }, (_, i) => {
    const a = -Math.PI / 2 + Math.PI / n + (i / n) * Math.PI * 2;
    return [cz + Math.cos(a) * rz, cy + Math.sin(a) * ry];
  });

// --- Orca ---
const ORCA_TAIL_PIVOT: readonly [number, number, number] = [-0.18, 0.01, 0];
const ORCA_FLIPPER_PIVOT: readonly [number, number, number] = [0.19, -0.065, 0.095];

/**
 * Points of each body ring: enough rows on the flank for the eye patch. A point on top and one below
 * (unlike ringZY), so no face straddles z = 0 and the right half can be mirrored into the left one.
 */
const ORCA_RING = 16;
const orcaRing = (cy: number, rz: number, ry: number): [number, number][] =>
  Array.from({ length: ORCA_RING }, (_, i) => {
    const a = -Math.PI / 2 + (i / ORCA_RING) * Math.PI * 2;
    return [Math.cos(a) * rz, cy + Math.sin(a) * ry];
  });
/** Body rings as (x, center y, half width, half height); 0.33-0.39 only split the head so the eye patch has faces to fall on. */
const orcaBodyStations: readonly LoftStation[] = ([
  [-0.18, 0.01, 0.075, 0.082],
  [-0.02, 0.0, 0.102, 0.112],
  [0.15, -0.005, 0.108, 0.115],
  [0.3, -0.012, 0.092, 0.096],
  [0.33, -0.0145, 0.0855, 0.088],
  [0.36, -0.017, 0.079, 0.08],
  [0.39, -0.0195, 0.0725, 0.072],
  [0.42, -0.022, 0.066, 0.064],
  [0.5, -0.034, 0.034, 0.032],
  [0.53, -0.04, 0.014, 0.014],
] as const).map(([x, cy, rz, ry]) => ({ x, ring: orcaRing(cy, rz, ry) }));

/**
 * Black back, white belly, the white flank patch that rises behind the dorsal fin and the grey
 * saddle over it. `s` is the height of the row of faces on the side: 1 on top, -1 below.
 */
function orcaSkin(band: number, seg: number): number {
  const x = (orcaBodyStations[band].x + orcaBodyStations[band + 1].x) / 2;
  const s = Math.sin(-Math.PI / 2 + ((seg + 0.5) / ORCA_RING) * Math.PI * 2);
  if (s < -0.8) return WHITE;
  if (x < -0.02 && s > 0.85) return SADDLE_GREY;
  if (x < -0.02 && s < -0.3) return WHITE;
  return ORCA_BLACK;
}

/**
 * The white eye patch, painted on the faces of the head (no relief): an elongated oval above and
 * behind the eye, slanting up towards the back. (x, y) of its middle, half length, half height and
 * slant (radians); a face is white when its middle falls inside. With the head rings above it picks
 * on each side a strip of six faces, one row high, that climbs one row from front to back.
 */
const ORCA_EYE_PATCH = { x: 0.375, y: -0.0165, a: 0.05, b: 0.012, slant: 0.517 } as const;
function inEyePatch([a, b, c]: Tri): boolean {
  const { x, y, a: ha, b: hb, slant } = ORCA_EYE_PATCH;
  const dx = (a[0] + b[0] + c[0]) / 3 - x;
  const dy = (a[1] + b[1] + c[1]) / 3 - y;
  const z = Math.abs(a[2] + b[2] + c[2]) / 3;
  const along = -dx * Math.cos(slant) + dy * Math.sin(slant);
  const across = dx * Math.sin(slant) + dy * Math.cos(slant);
  return z > 0.03 && (along / ha) ** 2 + (across / hb) ** 2 < 1;
}
/** The right half of the body, painted, and its mirror: both flanks get the same faces and the same patch. */
const orcaBody = (): Tri[] => {
  const right = loftAlongX(orcaBodyStations, orcaSkin, undefined, ORCA_BLACK)
    .filter(([a, b, c]) => a[2] + b[2] + c[2] > 0)
    .map((t): Tri => (inEyePatch(t) ? [t[0], t[1], t[2], WHITE] : t));
  return [...right, ...mirrorZ(right)];
};

/**
 * Tall, straight dorsal fin of an adult male: rings up the fin (u from base to tip) as a thin
 * diamond, its leading edge bowed forward, its trailing edge hollow, narrower and thinner towards
 * the tip. The first ring is sunk in the back, so the fin grows out of it without a step.
 */
const ORCA_FIN_BASE = 0.098;
const ORCA_FIN_TOP = 0.36;
const ORCA_DORSAL: readonly Tri[] = skin([0, 0.08, 0.25, 0.45, 0.65, 0.82, 1].map((u): Vec3[] => {
  const y = ORCA_FIN_BASE + u * (ORCA_FIN_TOP - ORCA_FIN_BASE);
  const lead = 0.08 - 0.077 * u ** 1.35;
  const trail = -0.04 + 0.031 * u ** 0.65;
  const w = 0.013 * (1 - u) + 0.0015 * u;
  const mid = lead + (trail - lead) * 0.35;
  return [[lead, y, 0], [mid, y, w], [trail, y, 0], [mid, y, -w]];
}), () => ORCA_BLACK, ORCA_BLACK);

const orcaTailStations: readonly LoftStation[] = [
  { x: -0.32, ring: ringZY(0, 0.018, 0.022, 0.026, 8) },
  { x: -0.16, ring: ringZY(0, 0.012, 0.046, 0.054, 8) },
  { x: 0, ring: ringZY(0, 0, 0.075, 0.082, 8) },
];

const orcaFlukeR: readonly Tri[] = prism(
  [[-0.3, 0.015], [-0.38, 0.175], [-0.42, 0.19], [-0.36, 0.015]],
  0.008,
  0.026,
  ORCA_BLACK,
  ORCA_BLACK,
);

const orcaFlipperR: readonly Tri[] = prism(
  [[0.04, 0.0], [0.02, 0.11], [-0.05, 0.13], [-0.07, 0.06], [-0.03, 0.0]],
  -0.012,
  0.014,
  ORCA_BLACK,
  ORCA_BLACK,
);

export const ORCA_PARTS: CetaceanPolyParts = {
  tailPivot: ORCA_TAIL_PIVOT,
  flipperPivot: ORCA_FLIPPER_PIVOT,
  body: [
    ...orcaBody(),
    ...ORCA_DORSAL,
  ],
  tail: [
    ...loftAlongX(orcaTailStations, (_b, seg) => (seg === 0 || seg === 7 ? WHITE : ORCA_BLACK), ORCA_BLACK),
    ...orcaFlukeR,
    ...mirrorZ(orcaFlukeR),
  ],
  flipperR: orcaFlipperR,
  flipperL: mirrorZ(orcaFlipperR),
};

// --- Antarctic minke whale ---

/**
 * Body of the Antarctic minke from the tail tip to the snout, as (x, top, bottom, half width): slim
 * and streamlined, deepest just behind the flippers, a narrow tail stock taller than wide, and a
 * flat head that narrows to a sharp point, a triangle seen from above.
 */
const MINKE_OUTLINE: readonly Station[] = [
  [-0.5, 0.012, 0.0, 0.004], [-0.47, 0.02, -0.006, 0.008], [-0.43, 0.028, -0.013, 0.013], [-0.38, 0.037, -0.021, 0.02],
  [-0.33, 0.046, -0.029, 0.028], [-0.27, 0.056, -0.039, 0.039], [-0.21, 0.065, -0.05, 0.05], [-0.15, 0.073, -0.061, 0.06],
  [-0.09, 0.079, -0.071, 0.067], [-0.03, 0.083, -0.079, 0.073], [0.03, 0.085, -0.085, 0.076], [0.09, 0.085, -0.088, 0.077],
  [0.15, 0.083, -0.088, 0.076], [0.21, 0.078, -0.084, 0.072], [0.26, 0.071, -0.077, 0.066], [0.31, 0.062, -0.068, 0.058],
  [0.35, 0.053, -0.059, 0.05], [0.39, 0.043, -0.049, 0.041], [0.43, 0.032, -0.038, 0.031], [0.46, 0.023, -0.029, 0.022],
  [0.485, 0.013, -0.019, 0.012], [0.5, 0.004, -0.009, 0.004],
];
/** Where the open map bends the tail: the tail stock, behind the dorsal fin. */
const MINKE_TAIL_X = -0.27;
const MINKE_SEGMENTS = 20;

/**
 * Pale marks of the flanks, as an x range for each row of faces on the side (`s`, the sine of the
 * ring angle: 1 on top, -1 below): a light chevron behind the head that runs down into the shoulder
 * patch above the flipper, and the flank patch that rises from the belly ahead of the dorsal fin,
 * with a dark field between them. Illustrative: the pattern varies from whale to whale.
 */
const MINKE_PALE_MARKS: readonly { readonly s: readonly [number, number]; readonly x: readonly [number, number] }[] = [
  // Chevron, its point forward on the back.
  { s: [0.95, 1], x: [0.25, 0.272] },
  { s: [0.8, 0.95], x: [0.238, 0.262] },
  { s: [0.6, 0.8], x: [0.222, 0.25] },
  { s: [0.3, 0.6], x: [0.2, 0.24] },
  // Shoulder patch.
  { s: [0, 0.3], x: [0.15, 0.235] },
  { s: [-0.3, 0], x: [0.13, 0.225] },
  { s: [-0.6, -0.3], x: [0.12, 0.21] },
  // Flank patch, slanting up and back.
  { s: [-0.6, -0.3], x: [-0.1, 0.06] },
  { s: [-0.3, 0], x: [-0.12, 0.025] },
  { s: [0, 0.3], x: [-0.14, -0.025] },
  { s: [0.3, 0.6], x: [-0.16, -0.085] },
];

/** Stations of MINKE_OUTLINE plus one at each edge of a mark and of the tail, so every mark falls on whole bands. */
const MINKE_BODY: readonly Station[] = (() => {
  const outline = fromOutline(MINKE_OUTLINE);
  const xs = [...outline.map(([x]) => x), MINKE_TAIL_X, 0.245, ...MINKE_PALE_MARKS.flatMap((m) => m.x)].sort((a, b) => a - b);
  return xs.filter((x, i) => i === 0 || x - xs[i - 1] > 0.004).map((x): Station => [x, ...sectionAt(outline, x)]);
})();

/**
 * Color of a face of the minke body at x, `s` the height of its row on the side (1 on top, -1
 * below): dark back, pale belly, the pale lower jaw under a dark upper jaw, and the light grey marks.
 */
function minkeSkin(x: number, s: number): number {
  if (MINKE_PALE_MARKS.some((m) => s > m.s[0] && s < m.s[1] && x > m.x[0] && x < m.x[1])) return MINKE_FLANK;
  const belly = x > 0.27 ? 0 : x > 0.245 ? -0.3 : x > -0.3 ? -0.6 : -0.8;
  return s < belly ? MINKE_BELLY : MINKE_DARK;
}
const minkeLoft = (stations: readonly Station[], caps: [number?, number?]) => loftBody(
  stations,
  (band, seg) => minkeSkin((stations[band][0] + stations[band + 1][0]) / 2, Math.sin(((seg + 0.5) / MINKE_SEGMENTS) * Math.PI * 2)),
  caps,
  MINKE_SEGMENTS,
);

/** Tall, falcate dorsal fin about two thirds of the way back, its tip swept behind its base. Rings up the fin: (y above the back, leading x, trailing x, half thickness). */
const MINKE_DORSAL: readonly Tri[] = (() => {
  const base = topAt(MINKE_BODY, -0.16, 0);
  return skin([
    [-0.012, -0.105, -0.205, 0.01], [0.0, -0.11, -0.205, 0.009], [0.014, -0.135, -0.2, 0.007], [0.028, -0.163, -0.203, 0.005],
    [0.038, -0.188, -0.212, 0.003], [0.044, -0.214, -0.226, 0.0015],
  ].map(([y, lead, trail, w]): Vec3[] => {
    const mid = lead + (trail - lead) * 0.35;
    return [[lead, base + y, 0], [mid, base + y, w], [trail, base + y, 0], [mid, base + y, -w]];
  }), () => MINKE_DARK, MINKE_DARK);
})();

/** The median ridge on top of the snout, from the blowholes forward. */
const MINKE_RIDGE: readonly Tri[] = skin([0.345, 0.38, 0.42, 0.455, 0.48].map((x, i): Vec3[] => {
  const w = 0.008 - i * 0.0012;
  const top = topAt(MINKE_BODY, x, 0);
  return [[x, topAt(MINKE_BODY, x, w) - 0.002, w], [x, top + 0.005 - i * 0.0008, 0], [x, topAt(MINKE_BODY, x, -w) - 0.002, -w]];
}), () => MINKE_DARK);

const MINKE_EYE_X = 0.285;
const minkeEyeY = sectionAt(MINKE_BODY, MINKE_EYE_X)[0] + 0.004;
const minkeEyeZ = sideAt(MINKE_BODY, MINKE_EYE_X, minkeEyeY) - 0.003;
/** Eyes just above the corner of the mouth, and the two blowholes ahead of the shoulders. */
const minkeHeadMarks: readonly Tri[] = [
  ...block(MINKE_EYE_X, minkeEyeY, minkeEyeZ, 0.012, 0.011, 0.01, BLACK),
  ...block(MINKE_EYE_X, minkeEyeY, -minkeEyeZ, 0.012, 0.011, 0.01, BLACK),
  ...block(0.335, topAt(MINKE_BODY, 0.335, 0.007) - 0.002, 0.007, 0.022, 0.006, 0.005, BLACK),
  ...block(0.335, topAt(MINKE_BODY, 0.335, 0.007) - 0.002, -0.007, 0.022, 0.006, 0.005, BLACK),
];

/**
 * Right fluke from the notch out, at the height of the tail tip: swept back, with pointed tips. The
 * rings run along +z: leading edge, upper and lower face, trailing edge.
 */
const minkeFluke = (y: number): Tri[] => skin(Array.from({ length: 7 }, (_, i): Vec3[] => {
  const u = i / 6;
  const lead = -0.44 - 0.12 * u ** 1.5;
  const trail = -0.505 - 0.07 * u;
  const half = 0.009 * (1 - 0.7 * u);
  const mid = lead + (trail - lead) * 0.35;
  const z = 0.002 + u * 0.128;
  return [[lead, y, z], [mid, y + half, z], [trail, y, z], [mid, y - half, z]];
}), () => MINKE_DARK, MINKE_DARK);

/**
 * Right pectoral flipper out along +z from its root: short (about an eighth of the body), narrow and
 * pointed, solid light grey with a pale leading edge (NOAA Fisheries, «Minke Whale», consulted
 * 2026-11-18): no white band, which belongs to the other minkes. Each ring: leading edge, the end of
 * the pale strip above, thickest point above, trailing edge, and the same below.
 */
const MINKE_FLIPPER: readonly Tri[] = skin(Array.from({ length: 8 }, (_, i): Vec3[] => {
  const u = i / 7;
  const chord = 0.058 * (1 - 0.8 * u);
  const lead = chord * 0.35 - 0.035 * u ** 1.5;
  const trail = lead - chord;
  const half = 0.011 * (1 - 0.6 * u);
  const z = -0.012 + u * 0.142;
  const edge = lead - chord * 0.2;
  const thick = lead - chord * 0.4;
  return [[lead, 0, z], [edge, half * 0.75, z], [thick, half, z], [trail, 0, z], [thick, -half, z], [edge, -half * 0.75, z]];
}), (_, seg) => (seg === 0 || seg === 5 ? MINKE_FLIPPER_EDGE : MINKE_FLIPPER_GREY), MINKE_FLIPPER_GREY);

/**
 * The right flipper at its root, low on the flank behind the eye: it reaches back, down and out, with
 * its broad face turned half to the side and half down, so it shows both from the side and from below.
 */
const MINKE_FLIPPER_X = 0.235;
const MINKE_FLIPPER_Y = -0.05;
const MINKE_FLIPPER_ROOT: Vec3 = [MINKE_FLIPPER_X, MINKE_FLIPPER_Y, sideAt(MINKE_BODY, MINKE_FLIPPER_X, MINKE_FLIPPER_Y) - 0.006];
const minkeFlipperAtRoot = orient(MINKE_FLIPPER, [-0.35, -0.75, 0.55], [0, 0.55, 0.75]);

const minkeTailStation = MINKE_BODY.findIndex(([x]) => x >= MINKE_TAIL_X - 1e-9);
const [, minkeTailY] = MINKE_BODY[minkeTailStation];
/** The tail reaches a little into the body, so no gap opens at the joint when it beats. */
const minkeTailStations: Station[] = [
  ...MINKE_BODY.slice(0, minkeTailStation + 1),
  (() => {
    const [cy, hy, hz] = sectionAt(MINKE_BODY, MINKE_TAIL_X);
    return [MINKE_TAIL_X + 0.015, cy, hy * 0.96, hz * 0.96] as Station;
  })(),
];

/**
 * Antarctic minke (Balaenoptera bonaerensis): slim, with a sharp triangular snout and its median
 * ridge, a tall falcate dorsal fin two thirds of the way back, a dark back, a pale belly and the light
 * chevron, shoulder and flank marks. Cut into body, tail and flippers for the open map, its card and
 * Océano.
 */
export const MINKE_PARTS: CetaceanPolyParts = {
  tailPivot: [MINKE_TAIL_X, minkeTailY, 0],
  flipperPivot: MINKE_FLIPPER_ROOT,
  body: [
    ...minkeLoft(MINKE_BODY.slice(minkeTailStation), [MINKE_DARK, MINKE_DARK]),
    ...MINKE_DORSAL,
    ...MINKE_RIDGE,
    ...minkeHeadMarks,
  ],
  tail: shift([
    ...minkeLoft(minkeTailStations, [MINKE_DARK, MINKE_DARK]),
    ...minkeFluke(minkeTailStations[0][1]),
    ...mirrorZ(minkeFluke(minkeTailStations[0][1])),
  ], -MINKE_TAIL_X, -minkeTailY, 0),
  flipperR: minkeFlipperAtRoot,
  flipperL: mirrorZ(minkeFlipperAtRoot),
};

export function assembleCetacean(parts: CetaceanPolyParts): Tri[] {
  const [fx, fy, fz] = parts.flipperPivot;
  return [
    ...parts.body,
    ...shift(parts.tail, ...parts.tailPivot),
    ...shift(parts.flipperR, fx, fy, fz),
    ...shift(parts.flipperL, fx, fy, -fz),
  ];
}

/** Low-poly whale blowhole spray / splash plume. */
export const SPOUT_POLY: readonly Tri[] = [
  ...prism([[0.03, 0], [0, 0.03], [-0.03, 0], [0, -0.03]], 0.05, 0.24, WHITE, SPRAY_BLUE),
  ...prism([[0.06, 0.02], [0.02, 0.06], [-0.02, 0.02], [0.02, -0.02]], 0.22, 0.42, SPRAY_BLUE, WHITE),
  ...prism([[0.02, -0.02], [-0.02, 0.02], [-0.06, -0.02], [-0.02, -0.06]], 0.24, 0.46, WHITE, SPRAY_BLUE),
  ...block(0.05, 0.48, 0.05, 0.055, 0.055, 0.055, WHITE),
  ...block(-0.05, 0.51, -0.04, 0.05, 0.05, 0.05, SPRAY_BLUE),
  ...block(0.0, 0.54, 0.0, 0.045, 0.045, 0.045, WHITE),
];

/** Low-poly water splash ring of faceted droplets when whales breach or surface. */
export const SPLASH_POLY: readonly Tri[] = Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * Math.PI * 2;
  const r = i % 2 === 0 ? 0.24 : 0.31;
  const h = i % 2 === 0 ? 0.14 : 0.19;
  const col = i % 2 === 0 ? WHITE : SPRAY_BLUE;
  return block(Math.cos(a) * r, h, Math.sin(a) * r, 0.065, 0.085, 0.065, col);
}).flat();

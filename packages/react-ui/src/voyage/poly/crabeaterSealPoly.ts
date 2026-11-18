import { createSeededRng } from '@antartida/core';
import { block, chunk, fromOutline, loftBody, mirrorZ, prism, sectionAt, shift, sideAt, skin, type Tri, type Vec3 } from '../lowPoly.ts';

/**
 * Low-poly crabeater seal (Lobodon carcinophaga) resting on an ice floe, for the Desde Ushuaia
 * sightings: a direct replacement of `seal(CREAM, WHITE, ICE)` in sightingModels.ts. One unit is the
 * length of the floe, nose to +x, y up, the floe resting on y = 0. Unlike the dark grey Weddell seal
 * (short cat-like face) and leopard seal (big reptilian head), it is pale cream, slender, with a
 * small head and a long narrow snout, and faint darker patches on the flanks. ILLUSTRATIVE: shape
 * and colors are drawn, not measured.
 */

// Same values as CREAM, WHITE, BLACK, ICE and ICE_SHADE of sightingModels.ts. Not imported from
// there: that module will import this one, and a cycle would read them before they are set.
const CRAB_CREAM = 0xf1e6c8;
const CRAB_BELLY = 0xf7fafb;
const CRAB_BLACK = 0x1f2a36;
const FLOE_ICE = 0xe9f1f4;
const FLOE_SHADE = 0xc5dbe6;
const FLOE_SNOW = 0xf7fafb;
/** The back, a little darker than the cream flanks. */
const CRAB_BACK = 0xd8caa5;
/** Faint darker patches on the back and flanks, and the claws of the flippers. */
const CRAB_MOTTLE = 0xc4b592;

const TAU = Math.PI * 2;
const SEGMENTS = 12;

/**
 * Body from the tail to the nose, as (x, top, bottom, half width), belly on y = 0: long and slim,
 * the neck raised so the head is up, a small head and a long snout narrowing to the nose.
 */
const BODY = fromOutline([
  [-0.4, 0.05, 0.022, 0.018], [-0.34, 0.075, 0.012, 0.038], [-0.25, 0.105, 0.004, 0.062], [-0.14, 0.13, 0, 0.08],
  [-0.02, 0.145, 0, 0.088], [0.08, 0.15, 0.002, 0.085], [0.16, 0.15, 0.012, 0.075], [0.22, 0.152, 0.03, 0.062],
  [0.26, 0.168, 0.066, 0.052], [0.29, 0.2, 0.105, 0.054], [0.32, 0.222, 0.13, 0.056], [0.35, 0.228, 0.15, 0.052],
  [0.38, 0.222, 0.165, 0.042], [0.41, 0.208, 0.172, 0.031], [0.44, 0.196, 0.175, 0.021], [0.46, 0.188, 0.177, 0.011],
]);
/** Where the snout starts: ahead of it the top of the muzzle is darker. */
const SNOUT_X = 0.4;

/** Faces of the trunk that carry a faint patch, picked once so the coat is always the same. */
const patchRng = createSeededRng(31415);
const PATCHED = Array.from({ length: (BODY.length - 1) * SEGMENTS }, () => patchRng() < 0.2);

/** Darker back, cream flanks with faint patches, pale belly; the top of the snout darker. */
function coat(band: number, seg: number): number {
  const s = Math.sin(((seg + 0.5) / SEGMENTS) * TAU);
  const x = BODY[band][0];
  if (s < -0.45) return CRAB_BELLY;
  if (x > SNOUT_X) return s > 0.3 ? CRAB_BACK : CRAB_CREAM;
  const patch = x > -0.3 && x < 0.3 && PATCHED[band * SEGMENTS + seg];
  if (s > 0.6) return patch ? CRAB_MOTTLE : CRAB_BACK;
  return patch ? CRAB_MOTTLE : CRAB_CREAM;
}

/** A dark eye on the side of the head, behind the snout. */
const EYE_X = 0.365;
function eye(side: 1 | -1): Tri[] {
  const [cy, hy] = sectionAt(BODY, EYE_X);
  const y = cy + 0.35 * hy;
  return block(EYE_X, y, side * (sideAt(BODY, EYE_X, y) - 0.002), 0.012, 0.012, 0.01, CRAB_BLACK);
}

/** A diamond section in the plane z = c[2]: leading edge to +x, trailing to -x, `h` half thick. */
const chordRing = ([x, y, z]: Vec3, lead: number, trail: number, h: number): Vec3[] => [[x + lead, y, z], [x, y + h, z], [x - trail, y, z], [x, y - h, z]];
/** A diamond section in the plane x = c[0]: `w` half wide along z, `h` half thick. */
const spanRing = ([x, y, z]: Vec3, w: number, h: number): Vec3[] => [[x, y, z + w], [x, y + h, z], [x, y, z - w], [x, y - h, z]];
/** Upper faces darker, the outer band with the claws, lower faces cream. */
const flipperColor = (band: number, seg: number) => (seg < 2 ? (band ? CRAB_MOTTLE : CRAB_BACK) : CRAB_CREAM);

/** Right fore flipper: from the shoulder inside the body, back and out, lying on the ice. */
const FORE = skin([
  chordRing([0.13, 0.04, 0.055], 0.025, 0.02, 0.013),
  chordRing([0.075, 0.02, 0.1], 0.025, 0.03, 0.009),
  chordRing([0.02, 0.008, 0.14], 0.008, 0.022, 0.004),
], flipperColor, CRAB_MOTTLE);

/** Right hind flipper: a fan widening back from the tail. */
const HIND = skin([
  spanRing([-0.38, 0.038, 0.012], 0.014, 0.011),
  spanRing([-0.435, 0.034, 0.03], 0.024, 0.007),
  spanRing([-0.49, 0.03, 0.045], 0.034, 0.004),
], flipperColor, CRAB_MOTTLE);

/** The seal with its belly on y = 0. The nose is the front cap of the body, dark. */
const SEAL: Tri[] = [
  ...loftBody(BODY, coat, [CRAB_BACK, CRAB_BLACK], SEGMENTS),
  ...eye(1), ...eye(-1),
  ...FORE, ...mirrorZ(FORE),
  ...HIND, ...mirrorZ(HIND),
];

/** Outline of the floe (x, z), about as big as the ice block of the block model (1 by 0.7). */
const FLOE_RING = [1, 0.93, 1.04, 0.9, 0.97, 1.02, 0.89, 1, 0.95, 1.05].map((k, i): [number, number] => {
  const a = (i / 10) * TAU;
  return [Math.cos(a) * 0.5 * k, Math.sin(a) * 0.34 * k];
});
/** Height of the snow on top of the floe, where the seal lies. */
const FLOE_TOP = 0.065;

/** Floe: a shaded waterline ledge, an ice slab on it with a snowy top, and two lumps of ice clear of the seal. */
const FLOE: Tri[] = [
  ...prism(FLOE_RING, 0, 0.03, FLOE_SHADE, FLOE_ICE),
  ...prism(FLOE_RING.map(([x, z]): [number, number] => [x * 0.93, z * 0.93]), 0.03, FLOE_TOP, (i) => (i % 2 ? FLOE_ICE : FLOE_SHADE), FLOE_SNOW),
  ...chunk(-0.24, FLOE_TOP + 0.01, -0.19, 0.11, 0.035, 0.075, 31, FLOE_ICE),
  ...chunk(0.3, FLOE_TOP + 0.008, 0.19, 0.08, 0.03, 0.06, 37, FLOE_ICE),
];

/** Crabeater seal lying on its floe, as `seal(CREAM, WHITE, ICE)`: front to +x, the floe on y = 0. */
export const CRABEATER_SEAL_POLY: readonly Tri[] = [...FLOE, ...shift(SEAL, 0, FLOE_TOP, 0)];

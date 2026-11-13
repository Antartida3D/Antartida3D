import type { Box } from './vehicles.ts';

/**
 * Voxel models for Poncho's expedition (docs/diseno/estilo-voxel.md). Colors and proportions are
 * approximate, taken from the book's description: this is an illustration, not data and not a
 * measured model of any real animal. The nose points to +x, y is up and the base rests on y = 0.
 */

// Poncho: cream coat, grey patches, dark pointed ears, almond eyes, white plumed tail.
const PONCHO_CREAM = 0xf0e2c0;
const PONCHO_CREAM_SHADE = 0xd9c8a0;
const PONCHO_GREY_PATCH = 0x8a8478;
const PONCHO_MUZZLE_GREY = 0xa39d92;
const PONCHO_EAR_DARK = 0x3b3a3a;
const PONCHO_EYE_ALMOND = 0x8a5a2b;
const PONCHO_NOSE = 0x1f2a36;
const PONCHO_TAIL_WHITE = 0xfaf6ec;

// Pack dogs and the Nansen sled.
const PACK_GREY = 0xb4b2aa;
const PACK_GREY_SHADE = 0x8e8c85;
const PACK_GREY_PATCH = 0x5f5d58;
const PACK_TAN = 0xc9a574;
const PACK_TAN_SHADE = 0xa8855a;
const PACK_TAN_PATCH = 0x7a5a38;
const PACK_DARK = 0x4a4744;
const PACK_DARK_SHADE = 0x33312f;
const PACK_DARK_PATCH = 0x2a2826;
const SLED_WOOD = 0x8a6a4a;
const SLED_WOOD_DARK = 0x5e4630;
const SLED_LOAD = 0x6f7f8c;
const SLED_LOAD_STRAP = 0xc8472a;
const GANGLINE = 0x3b3a3a;

interface DogPalette {
  coat: number;
  shade: number;
  patch: number;
  muzzle: number;
  ear: number;
  tail: number;
}

const PONCHO_PALETTE: DogPalette = {
  coat: PONCHO_CREAM,
  shade: PONCHO_CREAM_SHADE,
  patch: PONCHO_GREY_PATCH,
  muzzle: PONCHO_MUZZLE_GREY,
  ear: PONCHO_EAR_DARK,
  tail: PONCHO_TAIL_WHITE,
};

const packPalette = (coat: number, shade: number, patch: number): DogPalette => ({
  coat,
  shade,
  patch,
  muzzle: shade,
  ear: PONCHO_EAR_DARK,
  tail: coat,
});

/** One dog, one unit long, centered on x = 0 and z = 0, base at y = 0. Friendly, not fierce. */
function dogLocal(p: DogPalette): Box[] {
  return [
    // Broad chest, solid body and grey saddle along the back.
    [0.05, 0.45, 0, 0.34, 0.32, 0.3, p.coat],
    [-0.2, 0.44, 0, 0.34, 0.28, 0.26, p.coat],
    [0.15, 0.38, 0, 0.14, 0.22, 0.34, p.coat],
    [0, 0.3, 0, 0.4, 0.05, 0.22, p.shade],
    [-0.05, 0.62, 0, 0.5, 0.03, 0.2, p.patch],
    [-0.2, 0.5, 0.14, 0.14, 0.1, 0.02, p.patch],
    [-0.2, 0.5, -0.14, 0.14, 0.1, 0.02, p.patch],
    // Neck, head with a grey patch, slightly pointed muzzle with a grey "mask" and a dark nose.
    [0.2, 0.58, 0, 0.14, 0.2, 0.2, p.coat],
    [0.3, 0.68, 0, 0.2, 0.2, 0.2, p.coat],
    [0.3, 0.79, 0, 0.14, 0.02, 0.14, p.patch],
    [0.41, 0.64, 0, 0.14, 0.1, 0.11, p.coat],
    [0.41, 0.6, 0, 0.12, 0.04, 0.115, p.muzzle],
    [0.485, 0.65, 0, 0.03, 0.04, 0.05, PONCHO_NOSE],
    // Almond eyes (the distinctive trait) and dark pointed ears.
    [0.375, 0.71, 0.102, 0.03, 0.03, 0.01, PONCHO_EYE_ALMOND],
    [0.375, 0.71, -0.102, 0.03, 0.03, 0.01, PONCHO_EYE_ALMOND],
    [0.26, 0.82, 0.065, 0.05, 0.1, 0.04, p.ear],
    [0.26, 0.82, -0.065, 0.05, 0.1, 0.04, p.ear],
    // Sturdy legs and paws.
    [0.12, 0.15, 0.1, 0.09, 0.3, 0.09, p.coat],
    [0.12, 0.15, -0.1, 0.09, 0.3, 0.09, p.coat],
    [-0.3, 0.15, 0.1, 0.09, 0.3, 0.09, p.coat],
    [-0.3, 0.15, -0.1, 0.09, 0.3, 0.09, p.coat],
    [0.13, 0.02, 0.1, 0.11, 0.04, 0.11, p.shade],
    [0.13, 0.02, -0.1, 0.11, 0.04, 0.11, p.shade],
    [-0.29, 0.02, 0.1, 0.11, 0.04, 0.11, p.shade],
    [-0.29, 0.02, -0.1, 0.11, 0.04, 0.11, p.shade],
    // Plumed tail curled over the back and held up.
    [-0.45, 0.58, 0, 0.1, 0.1, 0.1, p.tail],
    [-0.46, 0.68, 0, 0.08, 0.12, 0.12, p.tail],
    [-0.4, 0.78, 0, 0.14, 0.1, 0.12, p.tail],
    [-0.32, 0.8, 0, 0.1, 0.08, 0.1, p.tail],
  ];
}

/** A dog scaled by `s` and moved to (`ox`, `oz`) on the ground. */
const dogAt = (p: DogPalette, s: number, ox: number, oz: number): Box[] =>
  dogLocal(p).map(([cx, cy, cz, sx, sy, sz, color]) => [cx * s + ox, cy * s, cz * s + oz, sx * s, sy * s, sz * s, color]);

// Team layout along x (total length 1: x in [-0.5, 0.5]).
const LEAD_SCALE = 0.22;
const PACK_SCALE = 0.18;
const LEAD_X = 0.39;
const TEAM_PAIRS: readonly (readonly [number, DogPalette, DogPalette])[] = [
  [0.15, packPalette(PACK_GREY, PACK_GREY_SHADE, PACK_GREY_PATCH), packPalette(PACK_TAN, PACK_TAN_SHADE, PACK_TAN_PATCH)],
  [-0.07, packPalette(PACK_DARK, PACK_DARK_SHADE, PACK_DARK_PATCH), packPalette(PACK_GREY, PACK_GREY_SHADE, PACK_GREY_PATCH)],
];
const PAIR_HALF_GAP = 0.05;

/** Nansen sled: two runners with curled tips, a slatted basket, a tied load and a push bow. */
function nansenSled(): Box[] {
  const rail = 0.055;
  return [
    [-0.345, 0.01, 0.05, 0.31, 0.02, 0.015, SLED_WOOD_DARK],
    [-0.345, 0.01, -0.05, 0.31, 0.02, 0.015, SLED_WOOD_DARK],
    [-0.19, 0.035, 0.05, 0.02, 0.04, 0.015, SLED_WOOD_DARK],
    [-0.19, 0.035, -0.05, 0.02, 0.04, 0.015, SLED_WOOD_DARK],
    [-0.45, 0.04, 0.05, 0.015, 0.04, 0.015, SLED_WOOD],
    [-0.45, 0.04, -0.05, 0.015, 0.04, 0.015, SLED_WOOD],
    [-0.27, 0.04, 0.05, 0.015, 0.04, 0.015, SLED_WOOD],
    [-0.27, 0.04, -0.05, 0.015, 0.04, 0.015, SLED_WOOD],
    [-0.35, 0.065, 0, 0.26, 0.012, 0.11, SLED_WOOD],
    [-0.35, 0.085, rail, 0.26, 0.03, 0.008, SLED_WOOD],
    [-0.35, 0.085, -rail, 0.26, 0.03, 0.008, SLED_WOOD],
    [-0.35, 0.1, 0, 0.16, 0.05, 0.08, SLED_LOAD],
    [-0.35, 0.128, 0, 0.02, 0.008, 0.085, SLED_LOAD_STRAP],
    [-0.485, 0.12, 0.05, 0.012, 0.12, 0.012, SLED_WOOD],
    [-0.485, 0.12, -0.05, 0.012, 0.12, 0.012, SLED_WOOD],
    [-0.485, 0.18, 0, 0.012, 0.012, 0.112, SLED_WOOD],
  ];
}

/** Gangline from the sled to the leader plus a short tug to each dog of every pair. */
function tugLines(): Box[] {
  const y = 0.075;
  const lines: Box[] = [[0.045, y, 0, 0.47, 0.008, 0.008, GANGLINE]];
  for (const [x] of TEAM_PAIRS) lines.push([x, y, 0, 0.008, 0.008, PAIR_HALF_GAP * 2, GANGLINE]);
  return lines;
}

const poncho: Box[] = [
  ...dogAt(PONCHO_PALETTE, LEAD_SCALE, LEAD_X, 0),
  ...TEAM_PAIRS.flatMap(([x, left, right]) => [
    ...dogAt(left, PACK_SCALE, x, PAIR_HALF_GAP),
    ...dogAt(right, PACK_SCALE, x, -PAIR_HALF_GAP),
  ]),
  ...tugLines(),
  ...nansenSled(),
];

/** Poncho's models: the whole team in one draw call and Poncho alone for cards and previews. */
export const PONCHO_MODELS: Readonly<Record<string, readonly Box[]>> = {
  poncho,
  'poncho-dog': dogLocal(PONCHO_PALETTE),
};

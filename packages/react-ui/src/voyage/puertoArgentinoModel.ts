import { block, loftAlongX, mirrorZ, prism, strut, type LoftStation, type Tri } from './lowPoly.ts';

/**
 * ARA Puerto Argentino (Neftegaz-class Antarctic supply ship), low-poly (rule 30):
 * bow to +x, y up, base on y = 0, one unit long (x in [-0.5, 0.5]).
 */

// Approximate livery, matching vehicles.ts palette.
const NAVY_GREY = 0x8e989f;
const HULL_DARK = 0x454e56;
const LIGHT_GREY = 0xc9d0d4;
const DECK = 0x5e656c;
const BLACK = 0x1f2a36;
const LIFEBOAT = 0xd9822b;
const HULL_RED = 0xc8472a;
const CREAM = 0xf1e6c8;

/**
 * Symmetric hull cross-section [z, y] counter-clockwise seen from +x:
 * 6 points: keel-right, chine-right, gunwale-right, gunwale-left, chine-left, keel-left.
 * Segment 0 = bottom, 1 = +z lower hull, 2 = +z upper hull, 3 = deck, 4 = -z upper hull, 5 = -z lower hull.
 */
const hullRing = (kz: number, cz: number, gz: number, yKeel: number, yChine: number, yDeck: number): readonly (readonly [number, number])[] => [
  [kz, yKeel],
  [cz, yChine],
  [gz, yDeck],
  [-gz, yDeck],
  [-cz, yChine],
  [-kz, yKeel],
];

const HULL_STATIONS: readonly LoftStation[] = [
  { x: -0.5, ring: hullRing(0.055, 0.088, 0.092, 0.008, 0.036, 0.072) },
  { x: -0.44, ring: hullRing(0.068, 0.098, 0.1, 0.0, 0.032, 0.072) },
  { x: -0.15, ring: hullRing(0.072, 0.102, 0.104, 0.0, 0.032, 0.072) },
  { x: 0.12, ring: hullRing(0.07, 0.102, 0.104, 0.0, 0.034, 0.082) },
  { x: 0.28, ring: hullRing(0.052, 0.088, 0.094, 0.0, 0.038, 0.096) },
  { x: 0.4, ring: hullRing(0.024, 0.056, 0.068, 0.004, 0.044, 0.105) },
  { x: 0.47, ring: hullRing(0.008, 0.024, 0.034, 0.014, 0.056, 0.112) },
  { x: 0.5, ring: hullRing(0.002, 0.006, 0.01, 0.032, 0.072, 0.116) },
];

const hullColor = (band: number, seg: number): number => {
  if (seg === 3) return band < 3 ? DECK : NAVY_GREY;
  if (seg === 0 || seg === 1 || seg === 5) return HULL_DARK;
  return NAVY_GREY;
};

const HULL: readonly Tri[] = loftAlongX(HULL_STATIONS, hullColor, HULL_DARK, NAVY_GREY);

// Bulwarks along the aft work deck
const BULWARK_R: readonly Tri[] = [
  ...block(-0.18, 0.082, 0.096, 0.56, 0.02, 0.01, NAVY_GREY),
  ...block(-0.465, 0.082, 0, 0.014, 0.02, 0.184, NAVY_GREY),
];
const BULWARKS: readonly Tri[] = [...BULWARK_R, ...mirrorZ(BULWARK_R)];

// Forward superstructure: chamfered accommodation block, bridge deckhouse, wraparound windows, mast
const SUPERSTRUCTURE_BASE: readonly Tri[] = prism(
  [
    [0.34, -0.072],
    [0.36, -0.052],
    [0.36, 0.052],
    [0.34, 0.072],
    [0.14, 0.078],
    [0.14, -0.078],
  ],
  0.08,
  0.165,
  LIGHT_GREY,
  LIGHT_GREY,
);

const BRIDGE_HOUSE: readonly Tri[] = prism(
  [
    [0.345, -0.068],
    [0.365, -0.048],
    [0.365, 0.048],
    [0.345, 0.068],
    [0.21, 0.084],
    [0.21, -0.084],
  ],
  0.165,
  0.205,
  LIGHT_GREY,
  LIGHT_GREY,
);

// Bridge wing overhangs & wraparound dark glass band
const BRIDGE_DETAILS: readonly Tri[] = [
  ...block(0.28, 0.208, 0, 0.135, 0.008, 0.185, LIGHT_GREY),
  ...block(0.358, 0.186, 0, 0.012, 0.02, 0.11, BLACK),
  ...block(0.282, 0.186, 0.078, 0.12, 0.018, 0.008, BLACK),
  ...block(0.282, 0.186, -0.078, 0.12, 0.018, 0.008, BLACK),
  // Mast and radar crossbar
  ...strut([0.275, 0.21, 0], [0.265, 0.295, 0], 0.007, BLACK),
  ...block(0.268, 0.275, 0, 0.01, 0.008, 0.072, LIGHT_GREY),
  ...block(0.266, 0.298, 0, 0.028, 0.008, 0.012, LIGHT_GREY),
];

// Twin exhaust funnels aft of the bridge
const FUNNEL_R: readonly Tri[] = [
  ...prism(
    [
      [0.15, 0.032],
      [0.15, 0.064],
      [0.105, 0.064],
      [0.105, 0.032],
    ],
    0.165,
    0.228,
    NAVY_GREY,
    BLACK,
  ),
];
const FUNNELS: readonly Tri[] = [...FUNNEL_R, ...mirrorZ(FUNNEL_R)];

// Lifeboats mounted on both sides
const LIFEBOAT_R: readonly Tri[] = [
  ...loftAlongX(
    [
      { x: 0.15, ring: [[0.082, 0.118], [0.094, 0.126], [0.082, 0.138], [0.07, 0.126]] },
      { x: 0.2, ring: [[0.082, 0.114], [0.098, 0.126], [0.082, 0.142], [0.066, 0.126]] },
      { x: 0.24, ring: [[0.082, 0.118], [0.094, 0.126], [0.082, 0.138], [0.07, 0.126]] },
    ],
    () => LIFEBOAT,
    LIFEBOAT,
    LIFEBOAT,
  ),
];
const LIFEBOATS: readonly Tri[] = [...LIFEBOAT_R, ...mirrorZ(LIFEBOAT_R)];

// Aft deck crane (starboard side) + supply containers
const CRANE_AND_CARGO: readonly Tri[] = [
  // Crane pedestal and boom
  ...prism(
    [
      [0.01, 0.044],
      [0.01, 0.076],
      [-0.03, 0.076],
      [-0.03, 0.044],
    ],
    0.072,
    0.155,
    DECK,
    LIFEBOAT,
  ),
  ...strut([-0.01, 0.15, 0.06], [-0.25, 0.205, 0.055], 0.011, LIFEBOAT),
  ...strut([-0.01, 0.12, 0.06], [-0.14, 0.175, 0.058], 0.006, DECK),
  // Supply containers on the work deck
  ...block(-0.18, 0.094, -0.028, 0.11, 0.044, 0.068, HULL_RED),
  ...block(-0.34, 0.09, 0.024, 0.085, 0.036, 0.06, CREAM),
  ...block(-0.33, 0.086, -0.045, 0.065, 0.028, 0.045, LIFEBOAT),
];

export const PUERTO_ARGENTINO_POLY: readonly Tri[] = [
  ...HULL,
  ...BULWARKS,
  ...SUPERSTRUCTURE_BASE,
  ...BRIDGE_HOUSE,
  ...BRIDGE_DETAILS,
  ...FUNNELS,
  ...LIFEBOATS,
  ...CRANE_AND_CARGO,
];

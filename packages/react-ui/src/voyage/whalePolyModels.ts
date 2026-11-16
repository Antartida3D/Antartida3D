import { block, loftAlongX, mirrorZ, prism, shift, type LoftStation, type Tri } from './lowPoly.ts';

/**
 * Low-poly cetaceans for the general map (rule 30): nose to +x, y up, ~1 unit long.
 * Each whale is split into body, tail (pivoted at `tailPivot`), and pectoral flippers
 * (pivoted at `flipperPivot`) so SeaLife can animate tail beats, flipper waves, and breaches.
 */

const WHALE_GREY = 0x4b5b67;
const WHALE_BELLY = 0xd6dfe4;
const MINKE_DARK = 0x3b4854;
const MINKE_BELLY = 0xdbe2e6;
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

// --- Humpback Whale ---
const HUMPBACK_TAIL_PIVOT: readonly [number, number, number] = [-0.2, 0.01, 0];
const HUMPBACK_FLIPPER_PIVOT: readonly [number, number, number] = [0.18, -0.075, 0.11];

const humpbackBodyStations: readonly LoftStation[] = [
  { x: -0.2, ring: ringZY(0, 0.01, 0.088, 0.092, 10) },
  { x: -0.04, ring: ringZY(0, 0.0, 0.118, 0.122, 10) },
  { x: 0.14, ring: ringZY(0, -0.006, 0.124, 0.125, 10) },
  { x: 0.3, ring: ringZY(0, -0.014, 0.11, 0.108, 10) },
  { x: 0.43, ring: ringZY(0, -0.025, 0.082, 0.074, 10) },
  { x: 0.51, ring: ringZY(0, -0.036, 0.046, 0.038, 10) },
  { x: 0.54, ring: ringZY(0, -0.042, 0.018, 0.016, 10) },
];

const humpbackTailStations: readonly LoftStation[] = [
  { x: -0.34, ring: ringZY(0, 0.02, 0.024, 0.028, 8) },
  { x: -0.18, ring: ringZY(0, 0.012, 0.052, 0.058, 8) },
  { x: 0, ring: ringZY(0, 0, 0.088, 0.092, 8) },
];

const humpbackFlukeR: readonly Tri[] = [
  ...prism([[-0.32, 0.015], [-0.41, 0.21], [-0.45, 0.23], [-0.39, 0.015]], 0.01, 0.026, WHALE_GREY, WHALE_GREY),
  ...prism([[-0.32, 0.015], [-0.41, 0.21], [-0.45, 0.23], [-0.39, 0.015]], 0.004, 0.01, WHITE, WHITE),
];

const humpbackFlipperR: readonly Tri[] = [
  ...prism([[0.04, 0.0], [0.0, 0.16], [-0.07, 0.32], [-0.12, 0.34], [-0.05, 0.14], [-0.03, 0.0]], -0.01, 0.014, WHITE, WHITE),
];

export const HUMPBACK_PARTS: CetaceanPolyParts = {
  tailPivot: HUMPBACK_TAIL_PIVOT,
  flipperPivot: HUMPBACK_FLIPPER_PIVOT,
  body: [
    ...loftAlongX(
      humpbackBodyStations,
      (_b, seg) => (seg === 0 || seg === 9 || seg === 1 || seg === 8 ? WHALE_BELLY : WHALE_GREY),
      undefined,
      WHALE_GREY,
    ),
    // Dorsal hump
    ...prism([[-0.19, -0.018], [-0.14, 0.02], [-0.07, 0.018], [-0.07, -0.018]], 0.11, 0.155, WHALE_GREY, WHALE_GREY),
    // Rostrum tubercles & eyes
    ...block(0.45, 0.022, 0.03, 0.018, 0.012, 0.014, WHALE_GREY),
    ...block(0.45, 0.022, -0.03, 0.018, 0.012, 0.014, WHALE_GREY),
    ...block(0.39, 0.012, 0.088, 0.02, 0.02, 0.012, BLACK),
    ...block(0.39, 0.012, -0.088, 0.02, 0.02, 0.012, BLACK),
  ],
  tail: [
    ...loftAlongX(humpbackTailStations, (_b, seg) => (seg === 0 || seg === 7 ? WHALE_BELLY : WHALE_GREY), WHALE_GREY),
    ...humpbackFlukeR,
    ...mirrorZ(humpbackFlukeR),
  ],
  flipperR: humpbackFlipperR,
  flipperL: mirrorZ(humpbackFlipperR),
};

// --- Orca ---
const ORCA_TAIL_PIVOT: readonly [number, number, number] = [-0.18, 0.01, 0];
const ORCA_FLIPPER_PIVOT: readonly [number, number, number] = [0.19, -0.065, 0.095];

const orcaBodyStations: readonly LoftStation[] = [
  { x: -0.18, ring: ringZY(0, 0.01, 0.075, 0.082, 10) },
  { x: -0.02, ring: ringZY(0, 0.0, 0.102, 0.112, 10) },
  { x: 0.15, ring: ringZY(0, -0.005, 0.108, 0.115, 10) },
  { x: 0.3, ring: ringZY(0, -0.012, 0.092, 0.096, 10) },
  { x: 0.42, ring: ringZY(0, -0.022, 0.066, 0.064, 10) },
  { x: 0.5, ring: ringZY(0, -0.034, 0.034, 0.032, 10) },
  { x: 0.53, ring: ringZY(0, -0.04, 0.014, 0.014, 10) },
];

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
    ...loftAlongX(
      orcaBodyStations,
      (band, seg) => {
        if (seg === 0 || seg === 9) return WHITE;
        if (band === 0 && (seg === 4 || seg === 5)) return SADDLE_GREY;
        if (band === 0 && (seg === 1 || seg === 8)) return WHITE;
        return ORCA_BLACK;
      },
      undefined,
      ORCA_BLACK,
    ),
    // Tall dorsal fin
    ...prism([[-0.03, -0.016], [0.08, 0.0], [0.01, 0.016], [-0.04, 0.0]], 0.105, 0.25, ORCA_BLACK, ORCA_BLACK),
    ...prism([[-0.03, -0.01], [0.04, 0.0], [0.0, 0.01], [-0.03, 0.0]], 0.25, 0.36, ORCA_BLACK, ORCA_BLACK),
    // White eye patches
    ...block(0.39, 0.014, 0.078, 0.075, 0.032, 0.01, WHITE),
    ...block(0.39, 0.014, -0.078, 0.075, 0.032, 0.01, WHITE),
  ],
  tail: [
    ...loftAlongX(orcaTailStations, (_b, seg) => (seg === 0 || seg === 7 ? WHITE : ORCA_BLACK), ORCA_BLACK),
    ...orcaFlukeR,
    ...mirrorZ(orcaFlukeR),
  ],
  flipperR: orcaFlipperR,
  flipperL: mirrorZ(orcaFlipperR),
};

// --- Minke Whale ---
const MINKE_TAIL_PIVOT: readonly [number, number, number] = [-0.19, 0.01, 0];
const MINKE_FLIPPER_PIVOT: readonly [number, number, number] = [0.18, -0.055, 0.082];

const minkeBodyStations: readonly LoftStation[] = [
  { x: -0.19, ring: ringZY(0, 0.01, 0.062, 0.068, 8) },
  { x: -0.02, ring: ringZY(0, 0.0, 0.088, 0.092, 8) },
  { x: 0.15, ring: ringZY(0, -0.005, 0.092, 0.094, 8) },
  { x: 0.3, ring: ringZY(0, -0.012, 0.074, 0.074, 8) },
  { x: 0.42, ring: ringZY(0, -0.02, 0.048, 0.044, 8) },
  { x: 0.51, ring: ringZY(0, -0.028, 0.018, 0.016, 8) },
];

const minkeTailStations: readonly LoftStation[] = [
  { x: -0.31, ring: ringZY(0, 0.016, 0.018, 0.022, 8) },
  { x: -0.16, ring: ringZY(0, 0.01, 0.038, 0.044, 8) },
  { x: 0, ring: ringZY(0, 0, 0.062, 0.068, 8) },
];

const minkeFlukeR: readonly Tri[] = prism(
  [[-0.29, 0.012], [-0.36, 0.155], [-0.4, 0.17], [-0.35, 0.012]],
  0.006,
  0.022,
  MINKE_DARK,
  MINKE_DARK,
);

const minkeFlipperR: readonly Tri[] = [
  ...prism([[0.03, 0.0], [-0.01, 0.13], [-0.06, 0.14], [-0.03, 0.0]], -0.008, 0.012, MINKE_DARK, MINKE_DARK),
  // Characteristic white minke flipper band
  ...prism([[0.01, 0.04], [-0.015, 0.09], [-0.045, 0.09], [-0.02, 0.04]], -0.009, 0.013, WHITE, WHITE),
];

export const MINKE_PARTS: CetaceanPolyParts = {
  tailPivot: MINKE_TAIL_PIVOT,
  flipperPivot: MINKE_FLIPPER_PIVOT,
  body: [
    ...loftAlongX(
      minkeBodyStations,
      (_b, seg) => (seg === 0 || seg === 7 ? MINKE_BELLY : MINKE_DARK),
      undefined,
      MINKE_DARK,
    ),
    // Falcate dorsal fin
    ...prism([[-0.12, -0.012], [-0.04, 0.0], [-0.09, 0.012], [-0.14, 0.0]], 0.088, 0.16, MINKE_DARK, MINKE_DARK),
    // Eyes
    ...block(0.39, 0.008, 0.056, 0.016, 0.016, 0.01, BLACK),
    ...block(0.39, 0.008, -0.056, 0.016, 0.016, 0.01, BLACK),
  ],
  tail: [
    ...loftAlongX(minkeTailStations, (_b, seg) => (seg === 0 || seg === 7 ? MINKE_BELLY : MINKE_DARK), MINKE_DARK),
    ...minkeFlukeR,
    ...mirrorZ(minkeFlukeR),
  ],
  flipperR: minkeFlipperR,
  flipperL: mirrorZ(minkeFlipperR),
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

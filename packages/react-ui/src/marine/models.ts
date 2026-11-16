import type { Box } from '../voyage/vehicles.ts';

/**
 * Voxel models of Océano (#8). Front towards +x, y up, one unit about the length of the model, as
 * every model of the app (docs/diseno/estilo-voxel.md). Moving parts are separate box lists that
 * turn around a pivot; MARINE_MODELS joins them for the test of least detail. Shapes and colors are
 * illustrations: they keep the marks that tell each animal apart, not its exact anatomy.
 */
export const MARINE_PALETTE = {
  black: 0x1f2a36, white: 0xf7fafb, eyeWhite: 0xe9f1f4,
  // Humpback: dark grey back, white flippers and throat, knobs on the head, dark baleen.
  // Antarctic minke, as SEA_MODELS.minke.
  minke: 0x3d4852,
  whale: 0x55606b, whaleKnob: 0x47515b, pleat: 0xd9dee2, pleatLine: 0x9aa5ae, baleen: 0x3b3530, fringe: 0xb9a98f,
  // Leopard seal: dark grey back, pale spotted throat and belly.
  leopard: 0x5f6b75, leopardPale: 0xbfc8ce, leopardSpot: 0x3a434b, tooth: 0xf1ead8, gum: 0xb7707a,
  // Emperor penguin, as in sightingModels.ts.
  emperorYellow: 0xf2c14e, emperorChest: 0xf6e7a8, emperorBill: 0xe59a6b,
  // Antarctic krill: almost transparent with red pigment spots, big black eyes, green gut.
  krillShell: 0xe7b3a2, krillRed: 0xc8472a, krillGut: 0x6f9a3c, krillLeg: 0xf0cfc2,
  // Diatoms: golden-brown cells with darker plastids.
  diatom: 0xc9a24b, diatomRim: 0x9c7a32, diatomGlass: 0xe8dcae, plastid: 0x6e7f2e,
  // Antarctic silverfish and squid.
  silver: 0xc9d3d8, silverDark: 0x7f8f99, squid: 0xd99a8a, squidDark: 0xa8635a, squidSpot: 0x8c3f36,
} as const;
const C = MARINE_PALETTE;

/** Mirror a list of boxes across the body's plane (z → −z). */
const both = (boxes: readonly Box[]): Box[] => boxes.flatMap((b) => b[2] === 0 ? [b] : [b, [b[0], b[1], -b[2], b[3], b[4], b[5], b[6]] as Box]);

// --- Humpback whale, feeding ---------------------------------------------------------------

/** Where the lower jaw turns: below the eye. */
export const HUMPBACK_HINGE = [0.28, -0.06, 0] as const;

/** Head, back, tail and the very long white flippers; the lower jaw and throat are separate parts. */
export const HUMPBACK_BODY: readonly Box[] = both([
  [0, 0, 0, 0.4, 0.24, 0.25, C.whale],
  [-0.24, 0.01, 0, 0.18, 0.19, 0.19, C.whale],
  [-0.4, 0.02, 0, 0.16, 0.13, 0.12, C.whale],
  [-0.52, 0.03, 0, 0.1, 0.08, 0.07, C.whale],
  [-0.585, 0.035, 0, 0.06, 0.03, 0.08, C.whale],
  [-0.61, 0.035, 0.11, 0.1, 0.03, 0.17, C.whale],
  [-0.61, 0.019, 0.11, 0.08, 0.004, 0.15, C.white],
  [-0.16, 0.135, 0, 0.1, 0.05, 0.04, C.whale],
  // Upper jaw: flat on top, with the knobs that mark a humpback.
  [0.3, 0.02, 0, 0.2, 0.13, 0.22, C.whale],
  [0.48, 0.0, 0, 0.18, 0.06, 0.17, C.whale],
  [0.38, 0.09, 0, 0.03, 0.02, 0.03, C.whaleKnob],
  [0.46, 0.04, 0.04, 0.03, 0.02, 0.03, C.whaleKnob],
  [0.52, 0.04, 0, 0.03, 0.02, 0.03, C.whaleKnob],
  [0.31, -0.01, 0.111, 0.03, 0.03, 0.01, C.black],
  // Baleen plates hanging from the upper jaw: only seen when the mouth opens.
  ...[0, 1, 2, 3, 4].map((i): Box => [0.34 + i * 0.05, -0.065, 0.07, 0.035, 0.07, 0.012, C.baleen]),
  [0.44, -0.1, 0.06, 0.2, 0.012, 0.012, C.fringe],
  // Flippers: about a third of the body, white.
  [0.16, -0.08, 0.2, 0.12, 0.03, 0.17, C.white],
  [0.1, -0.085, 0.35, 0.1, 0.025, 0.15, C.white],
  [0.05, -0.09, 0.47, 0.07, 0.02, 0.1, C.white],
  [-0.1, -0.115, 0, 0.3, 0.03, 0.18, C.white],
]);

/** Lower jaw, measured from HUMPBACK_HINGE. */
export const HUMPBACK_JAW: readonly Box[] = [
  [0.15, -0.025, 0, 0.32, 0.04, 0.2, C.whale],
  [0.32, -0.02, 0, 0.04, 0.035, 0.14, C.whale],
  [0.08, 0.0, 0.098, 0.18, 0.02, 0.01, C.whale],
  [0.08, 0.0, -0.098, 0.18, 0.02, 0.01, C.whale],
];

/** Throat pouch, hanging from the jaw: it is scaled down (y) to inflate when the whale gulps. */
export const HUMPBACK_THROAT: readonly Box[] = [
  [0.1, -0.05, 0, 0.32, 0.06, 0.2, C.pleat],
  ...[-0.06, 0, 0.06].map((z): Box => [0.1, -0.081, z, 0.3, 0.004, 0.01, C.pleatLine]),
];

// --- Antarctic minke whale, feeding --------------------------------------------------------

/** Where the minke's lower jaw turns. */
export const MINKE_HINGE = [0.24, -0.05, 0] as const;

/**
 * The minke of the map (SEA_MODELS.minke), split so it can lunge: same shape and colors, grey
 * flippers with only a white leading edge, and a lower jaw and throat that open to take in krill.
 */
export const MINKE_FEED_BODY: readonly Box[] = both([
  [0.02, 0, 0, 0.4, 0.17, 0.17, C.minke],
  [0.28, 0.005, 0, 0.16, 0.13, 0.15, C.minke],
  [0.41, -0.015, 0, 0.12, 0.08, 0.12, C.minke],
  [0.5, -0.03, 0, 0.08, 0.05, 0.08, C.minke],
  [-0.24, 0.01, 0, 0.18, 0.14, 0.13, C.minke],
  [-0.4, 0.02, 0, 0.16, 0.09, 0.08, C.minke],
  [-0.52, 0.03, 0, 0.1, 0.05, 0.05, C.minke],
  [-0.59, 0.035, 0.08, 0.09, 0.025, 0.14, C.minke],
  [-0.22, 0.1, 0, 0.07, 0.06, 0.03, C.minke],
  [0.18, -0.06, 0.12, 0.1, 0.025, 0.1, C.minke],
  [0.226, -0.06, 0.12, 0.012, 0.027, 0.1, C.white],
  [-0.05, -0.085, 0, 0.32, 0.03, 0.14, C.white],
  [0.43, 0.005, 0.062, 0.03, 0.03, 0.01, C.black],
  ...[0, 1, 2].map((i): Box => [0.33 + i * 0.06, -0.045, 0.045, 0.04, 0.035, 0.01, C.pleat]),
]);

/** Lower jaw of the minke from MINKE_HINGE. */
export const MINKE_JAW: readonly Box[] = [
  [0.15, -0.01, 0, 0.32, 0.035, 0.13, C.minke],
  [0.07, 0.01, 0.062, 0.16, 0.02, 0.01, C.minke],
  [0.07, 0.01, -0.062, 0.16, 0.02, 0.01, C.minke],
];

/** Throat of the minke: white, pleated, it stretches when the whale gulps. */
export const MINKE_THROAT: readonly Box[] = [
  [0.1, -0.035, 0, 0.3, 0.04, 0.13, C.white],
  ...[-0.04, 0, 0.04].map((z): Box => [0.1, -0.056, z, 0.28, 0.004, 0.008, C.pleatLine]),
];

// --- Leopard seal --------------------------------------------------------------------------

/** Where the lower jaw of the leopard seal turns. */
export const LEOPARD_HINGE = [0.3, -0.02, 0] as const;

/** Long slender body, big head, long fore flippers, dark back and pale spotted throat. */
export const LEOPARD_BODY: readonly Box[] = both([
  [0, 0, 0, 0.42, 0.15, 0.16, C.leopard],
  [-0.26, 0, 0, 0.16, 0.12, 0.13, C.leopard],
  [-0.38, 0, 0, 0.1, 0.08, 0.08, C.leopard],
  [-0.47, 0, 0.035, 0.1, 0.02, 0.06, C.leopard],
  [-0.53, 0, 0.055, 0.05, 0.02, 0.08, C.leopard],
  [0, -0.065, 0, 0.5, 0.03, 0.13, C.leopardPale],
  [0.06, -0.081, 0.03, 0.04, 0.004, 0.03, C.leopardSpot],
  [-0.1, -0.081, 0, 0.04, 0.004, 0.03, C.leopardSpot],
  [0.12, -0.035, 0.081, 0.03, 0.03, 0.004, C.leopardSpot],
  [-0.07, -0.03, 0.081, 0.04, 0.03, 0.004, C.leopardSpot],
  [0.24, 0, 0, 0.08, 0.13, 0.14, C.leopard],
  // The head: wide and long, nearly reptilian.
  [0.35, 0.02, 0, 0.13, 0.09, 0.15, C.leopard],
  [0.46, 0.015, 0, 0.11, 0.06, 0.1, C.leopard],
  [0.38, 0.05, 0.076, 0.025, 0.025, 0.01, C.black],
  [0.505, 0.04, 0.02, 0.012, 0.012, 0.012, C.black],
  [0.49, -0.025, 0.035, 0.014, 0.03, 0.014, C.tooth],
  [0.14, -0.05, 0.12, 0.16, 0.02, 0.07, C.leopard],
  [0.07, -0.055, 0.17, 0.08, 0.02, 0.05, C.leopard],
]);

/** Lower jaw of the leopard seal from LEOPARD_HINGE, with a canine and the three-pointed back teeth. */
export const LEOPARD_JAW: readonly Box[] = both([
  [0.1, -0.02, 0, 0.24, 0.04, 0.12, C.leopardPale],
  [0.2, 0.012, 0.035, 0.014, 0.028, 0.014, C.tooth],
  ...[0.05, 0.09, 0.13].map((x): Box => [x, 0.008, 0.045, 0.022, 0.018, 0.01, C.tooth]),
]);

// --- Emperor penguin, swimming -------------------------------------------------------------

/** Where each flipper meets the body. */
export const EMPEROR_SHOULDER = [0.1, 0.02, 0.1] as const;

/** An emperor lying flat to swim: black back, white belly, yellow ear patches and pale chest. */
/** Tip of the bill of the swimming emperor, along +x: where it holds a caught fish. */
export const EMPEROR_BILL_TIP = 0.47;
export const EMPEROR_SWIM: readonly Box[] = both([
  [0, 0, 0, 0.5, 0.18, 0.2, C.black],
  [0, -0.05, 0, 0.46, 0.09, 0.205, C.white],
  [0.22, -0.04, 0, 0.09, 0.09, 0.18, C.emperorChest],
  [0.32, 0.02, 0, 0.14, 0.13, 0.14, C.black],
  [0.3, 0.02, 0.072, 0.07, 0.06, 0.006, C.emperorYellow],
  [0.36, 0.05, 0.071, 0.02, 0.02, 0.005, C.eyeWhite],
  [0.43, 0.015, 0, 0.1, 0.03, 0.04, C.black],
  [0.43, 0.0, 0, 0.08, 0.012, 0.045, C.emperorBill],
  [-0.29, 0, 0, 0.08, 0.05, 0.08, C.black],
  [-0.3, -0.04, 0.04, 0.08, 0.02, 0.04, C.black],
]);

/** Right flipper from EMPEROR_SHOULDER (towards +z); the left one is its mirror. */
export const EMPEROR_FLIPPER: readonly Box[] = [
  [0, 0, 0.1, 0.12, 0.02, 0.2, C.black],
  [0, -0.011, 0.1, 0.1, 0.004, 0.18, C.white],
];

// --- Krill, diatoms, fish and squid ----------------------------------------------------------

export const KRILL: readonly Box[] = both([
  [0.15, 0, 0, 0.35, 0.16, 0.14, C.krillShell],
  [-0.08, 0, 0, 0.12, 0.13, 0.11, C.krillShell],
  [-0.19, -0.01, 0, 0.1, 0.11, 0.09, C.krillShell],
  [-0.28, -0.02, 0, 0.08, 0.09, 0.07, C.krillShell],
  [-0.36, -0.03, 0, 0.08, 0.02, 0.12, C.krillRed],
  [0.12, 0.081, 0, 0.18, 0.004, 0.06, C.krillGut],
  [0.05, -0.04, 0.071, 0.04, 0.03, 0.004, C.krillRed],
  [-0.12, -0.03, 0.056, 0.04, 0.03, 0.004, C.krillRed],
  [0.34, 0.03, 0.06, 0.06, 0.06, 0.04, C.black],
  [0.48, 0.04, 0.03, 0.2, 0.01, 0.01, C.krillRed],
  [0.15, -0.1, 0, 0.25, 0.05, 0.1, C.krillLeg],
  [-0.12, -0.08, 0, 0.2, 0.03, 0.08, C.krillLeg],
]);

/** A round diatom seen from above, magnified: a glassy disc with ribs and plastids. */
export const DIATOM_DISC: readonly Box[] = [
  [0, 0, 0, 0.62, 0.12, 0.62, C.diatom],
  [0, 0, 0, 0.84, 0.1, 0.4, C.diatom],
  [0, 0, 0, 0.4, 0.1, 0.84, C.diatom],
  [0, 0.065, 0, 0.18, 0.01, 0.18, C.diatomGlass],
  [0, 0.062, 0, 0.8, 0.006, 0.03, C.diatomRim],
  [0, 0.062, 0, 0.03, 0.006, 0.8, C.diatomRim],
  [0.22, 0.062, 0.22, 0.05, 0.006, 0.05, C.diatomRim],
  [-0.22, 0.062, 0.22, 0.05, 0.006, 0.05, C.diatomRim],
  [0.22, 0.062, -0.22, 0.05, 0.006, 0.05, C.diatomRim],
  [-0.22, 0.062, -0.22, 0.05, 0.006, 0.05, C.diatomRim],
  [0.16, 0.064, -0.05, 0.08, 0.008, 0.06, C.plastid],
  [-0.12, 0.064, 0.14, 0.07, 0.008, 0.08, C.plastid],
  [-0.1, 0.064, -0.16, 0.08, 0.008, 0.06, C.plastid],
];

/** A chain of long diatom cells joined end to end, magnified. */
export const DIATOM_CHAIN: readonly Box[] = [0, 1, 2, 3].flatMap((i): Box[] => {
  const x = -0.39 + i * 0.26;
  return [
    [x, 0, 0, 0.22, 0.1, 0.12, C.diatom],
    [x + 0.12, 0, 0, 0.03, 0.11, 0.125, C.diatomGlass],
    [x, 0.052, 0, 0.12, 0.005, 0.07, C.plastid],
  ];
});

/** Antarctic silverfish: slender and silvery, with big eyes. */
export const SILVERFISH: readonly Box[] = both([
  [0, 0, 0, 0.5, 0.14, 0.1, C.silver],
  [0.32, 0, 0, 0.16, 0.12, 0.09, C.silver],
  [-0.32, 0, 0, 0.16, 0.09, 0.07, C.silver],
  [-0.45, 0, 0, 0.06, 0.16, 0.02, C.silverDark],
  [0, 0.06, 0, 0.6, 0.025, 0.06, C.silverDark],
  [0, -0.06, 0, 0.5, 0.02, 0.09, C.white],
  [0.35, 0.02, 0.046, 0.04, 0.04, 0.005, C.black],
  [-0.05, 0.09, 0, 0.2, 0.04, 0.01, C.silverDark],
  [-0.12, -0.085, 0, 0.18, 0.03, 0.01, C.silverDark],
  [0.2, -0.02, 0.05, 0.06, 0.02, 0.02, C.silverDark],
  [0.41, -0.02, 0, 0.02, 0.02, 0.04, C.black],
]);

/** A squid: mantle behind, fins at the tip, eyes, eight arms and two longer tentacles ahead. */
export const SQUID: readonly Box[] = both([
  [-0.1, 0, 0, 0.5, 0.14, 0.14, C.squid],
  [-0.32, 0, 0.09, 0.12, 0.02, 0.08, C.squidDark],
  [0.18, 0, 0, 0.08, 0.11, 0.12, C.squid],
  [0.18, 0.02, 0.061, 0.04, 0.04, 0.005, C.black],
  [0.31, 0.03, 0.03, 0.2, 0.02, 0.02, C.squidDark],
  [0.31, -0.03, 0.03, 0.2, 0.02, 0.02, C.squidDark],
  [0.38, 0, 0.012, 0.32, 0.015, 0.015, C.squid],
  [-0.05, 0.071, 0, 0.06, 0.004, 0.04, C.squidSpot],
  [-0.2, 0.071, 0.02, 0.05, 0.004, 0.04, C.squidSpot],
  [0.05, 0.071, -0.03, 0.04, 0.004, 0.03, C.squidSpot],
]);

// --- Baleen and teeth, side by side --------------------------------------------------------

/** Baleen of a whale, close up: plates hanging from the upper jaw with a hairy fringe inside. */
export const BALEEN_DETAIL: readonly Box[] = [
  [0, 0.3, 0, 1, 0.08, 0.18, C.whale],
  ...[-3.5, -2.5, -1.5, -0.5, 0.5, 1.5, 2.5, 3.5].flatMap((k): Box[] => [
    [k * 0.12, 0.08, 0, 0.05, 0.36, 0.14, C.baleen],
    [k * 0.12 + 0.03, -0.06, 0.04, 0.03, 0.14, 0.05, C.fringe],
  ]),
];

/** The back teeth of a leopard seal, close up: three points each, with gaps where water passes. */
export const TEETH_DETAIL: readonly Box[] = [
  [0, -0.02, 0, 1, 0.1, 0.18, C.gum],
  ...[-0.33, -0.11, 0.11, 0.33].flatMap((x): Box[] => [
    [x, 0.13, 0, 0.07, 0.2, 0.07, C.tooth],
    [x - 0.065, 0.08, 0, 0.045, 0.1, 0.06, C.tooth],
    [x + 0.065, 0.08, 0, 0.045, 0.1, 0.06, C.tooth],
  ]),
  [0.47, 0.17, 0, 0.06, 0.3, 0.07, C.tooth],
];

/** Every model of Océano, joined with its moving parts, for the test of least detail. */
export const MARINE_MODELS: Readonly<Record<string, readonly Box[]>> = {
  'marine:humpback': [...HUMPBACK_BODY, ...HUMPBACK_JAW, ...HUMPBACK_THROAT],
  'marine:minke-feeding': [...MINKE_FEED_BODY, ...MINKE_JAW, ...MINKE_THROAT],
  'marine:leopard': [...LEOPARD_BODY, ...LEOPARD_JAW],
  'marine:emperor-swim': [...EMPEROR_SWIM, ...both(EMPEROR_FLIPPER)],
  'marine:krill': KRILL,
  'marine:diatom-disc': DIATOM_DISC,
  'marine:diatom-chain': DIATOM_CHAIN,
  'marine:silverfish': SILVERFISH,
  'marine:squid': SQUID,
  'marine:baleen': BALEEN_DETAIL,
  'marine:teeth': TEETH_DETAIL,
};

// Colors and shared measures of the Fósiles models, which are low-poly (lowPolyFossils.ts for the
// animals and people, lowPolyScenery.ts for plants, sea floor life, camp and remains). Flat colors
// taken from the field photographs of the family archive (dark gravel, ochre strata, orange tents,
// red and yellow parkas) and from the expedition palette. Illustrations, not anatomical measurements.
export const FOSSIL_PALETTE = {
  // Present-day James Ross ground
  gravel: 0x524c46, gravelMid: 0x5c554e, gravelLight: 0x6a635a, scree: 0x8c8172,
  strataTan: 0xa08c70, strataBrown: 0x6e5f50, strataGrey: 0x857b70, basalt: 0x3a3836,
  snow: 0xf4f7f8, iceBlue: 0xd7e6ee, sea: 0x4f7f9b, seaDeep: 0x3b6680,
  // Camp and people
  tent: 0xe0702a, tentDark: 0xb8521c, canvas: 0xf3ebdd, crate: 0xb48a57, crateDark: 0x8a6440,
  parkaRed: 0xc8352e, parkaYellow: 0xe8b631, parkaOrange: 0xd8642a, pants: 0x2e3440, boot: 0x5a3b28,
  skin: 0xd9a982, beard: 0x4a3426, hat: 0x1f2a36, glove: 0x3a3330, metal: 0x9aa3a8, handle: 0x2f6fb3,
  ink: 0x1f2a36,
  // Fossils
  sand: 0xb5a28b, light: 0xd9cbb1, dark: 0x685c50, rock: 0x8b8276,
  bone: 0xeddcb8, boneShade: 0xcdb892, rib: 0x9a7853, shell: 0xc7a16e, shellStripe: 0x9b6f3f, glow: 0xf2c14e,
  // Living animals (colors are an illustrative choice)
  ammoniteSoft: 0xd9b8a0, dinoGreen: 0x6c8063, dinoDark: 0x55684d, armor: 0xb3a16b, armorDark: 0x8d7d50,
  belly: 0xc4bb94, beak: 0x6b5d4e, plesioBack: 0x4f6f7d, plesioBelly: 0xcfd8d4, plesioSpot: 0x3c5764,
  tooth: 0xf7f2e4,
  // Cretaceous forest
  conifer: 0x3f5e45, coniferLight: 0x557a52, fern: 0x7a9a55, cycad: 0x6d8a4a, leaf: 0x83956b, bark: 0x6f5a45,
  forestFloor: 0x5f6d45, forestMoss: 0x68774b, forestSoil: 0x6b5a43,
  // Eocene sea floor
  seaFloor: 0xaea78f, seaFloorDark: 0x8f8a74, starOrange: 0xd47a3c, starPlate: 0xe8a868, starSpot: 0x8f3b22,
  bryozoan: 0xe8d9b0, bryozoanRed: 0xd89a6a, brachiopod: 0xcdb38f, urchin: 0x6d4f6a, urchinSpine: 0x9b7c95,
  crinoid: 0x9c6b5a, crinoidLight: 0xb98f7c, chiton: 0x8a7a6a, chitonLight: 0xb1a493, serpulid: 0xe9e2d0,
  inoceramus: 0xa89a83,
} as const;
const C = FOSSIL_PALETTE;

// --- Geologist colors (the figures are in lowPolyFossils.ts) --------------------------------

export type Parka = 'red' | 'yellow' | 'orange';
export const PARKA_COLORS = { red: C.parkaRed, yellow: C.parkaYellow, orange: C.parkaOrange } as const;

// --- Plesiosaur column: where each vertebra lies (the models are in lowPolyScenery.ts) -------

/** Vertebral column laid in the sediment, head to tail along a gentle curve, in the xz plane. */
export const PLESIO_VERTEBRAE = 52;
export function plesioVertebra(i: number): readonly [number, number, number, number] {
  const t = i / (PLESIO_VERTEBRAE - 1);
  const x = 0.55 - t * 1.1;
  const z = Math.sin(t * Math.PI * 1.4 + 0.4) * 0.09;
  // Neck vertebrae small, trunk ones large, tail tapering.
  const size = t < 0.5 ? 0.022 + t * 0.03 : t < 0.78 ? 0.04 : 0.04 - (t - 0.78) * 0.11;
  return [x, size / 2 + 0.005, z, size];
}

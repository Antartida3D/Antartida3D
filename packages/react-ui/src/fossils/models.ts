import { type Box } from '../voyage/vehicles.ts';

// Illustrations, not anatomical measurements. Flat colors taken from the field photographs of the
// family archive (dark gravel, ochre strata, orange tents, red and yellow parkas) and from the
// expedition palette. One unit is the length (or height, for people and trees) of each model.
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

// --- Dinosaur jaw ---------------------------------------------------------------------------

export const JAW_BOXES: readonly Box[] = [
  [-0.1, 0.12, 0, 0.62, 0.13, 0.18, C.bone],
  [0.25, 0.16, 0, 0.15, 0.2, 0.16, C.bone],
  [-0.38, 0.1, 0, 0.12, 0.1, 0.16, C.rib],
  ...Array.from({ length: 7 }, (_, i): Box => [-0.32 + i * 0.075, 0.19, 0.04, 0.035, 0.035, 0.07, C.dark]),
  // The leaf-shaped tooth, crown wider than its root
  [0.06, 0.24, 0, 0.055, 0.12, 0.035, C.bone],
  [0.06, 0.31, 0, 0.1, 0.055, 0.035, C.bone],
  [0.06, 0.35, 0, 0.065, 0.035, 0.035, C.bone],
  [0.06, 0.375, 0, 0.03, 0.025, 0.03, C.bone],
];
export const JAW_TOOTH_CENTER: readonly [number, number, number] = [0.06, 0.31, 0];

// --- Geologist colors (the figures are in lowPolyFossils.ts) --------------------------------

export type Parka = 'red' | 'yellow' | 'orange';
export const PARKA_COLORS = { red: C.parkaRed, yellow: C.parkaYellow, orange: C.parkaOrange } as const;

// --- Remains: dinosaur bones and plesiosaur skeleton (the living animals are in lowPolyFossils.ts)

/** Recovered pieces, laid on the ground: jaw, vertebrae, ribs and armor plates. */
export const DINO_BONES: readonly Box[] = [
  [-0.3, 0.03, -0.05, 0.22, 0.05, 0.06, C.bone],
  [-0.1, 0.03, 0.12, 0.08, 0.06, 0.08, C.bone], [0.0, 0.03, 0.1, 0.08, 0.06, 0.08, C.boneShade],
  [0.1, 0.03, 0.12, 0.08, 0.06, 0.08, C.bone],
  [0.22, 0.02, -0.12, 0.26, 0.03, 0.035, C.rib], [0.18, 0.02, -0.2, 0.22, 0.03, 0.035, C.rib],
  [-0.15, 0.02, -0.22, 0.07, 0.03, 0.07, C.armor], [-0.05, 0.02, -0.25, 0.06, 0.03, 0.06, C.armor],
  [0.32, 0.02, 0.05, 0.06, 0.03, 0.06, C.armor], [0.38, 0.02, 0.16, 0.07, 0.03, 0.05, C.armorDark],
  [-0.38, 0.03, 0.15, 0.16, 0.05, 0.05, C.boneShade], [-0.42, 0.04, 0.15, 0.05, 0.07, 0.07, C.bone],
];

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
/** Ribs on the trunk, girdles and four paddles of small phalanges; the vertebrae are drawn apart. */
export const PLESIO_BONES: readonly Box[] = [
  ...Array.from({ length: 8 }, (_, i): Box[] => {
    const [x, , z] = plesioVertebra(27 + i * 1.6);
    return [[x, 0.012, z + 0.09, 0.016, 0.012, 0.14, C.boneShade], [x, 0.012, z - 0.09, 0.016, 0.012, 0.14, C.boneShade]];
  }).flat(),
  [0.0, 0.01, 0, 0.09, 0.012, 0.22, C.bone], [-0.2, 0.01, 0, 0.08, 0.012, 0.2, C.bone],
  ...[[0.0, 1], [0.0, -1], [-0.2, 1], [-0.2, -1]].flatMap(([x, s]) =>
    Array.from({ length: 6 }, (_, k): Box => [x - 0.015 * k, 0.008, s * (0.14 + k * 0.035), 0.03 - k * 0.003, 0.01, 0.026, k % 2 ? C.bone : C.boneShade])),
];
export const PLESIO_SKELETON: readonly Box[] = [
  ...PLESIO_BONES,
  ...Array.from({ length: PLESIO_VERTEBRAE }, (_, i): Box => {
    const [x, y, z, s] = plesioVertebra(i);
    return [x, y, z, s * 0.85, s, s * 1.15, i % 2 ? C.bone : C.boneShade];
  }),
];

// --- Camp -----------------------------------------------------------------------------------

/** Pyramid field tent, like the ones in the camp photographs. */
export const TENT_BOXES: readonly Box[] = [
  [0, 0.02, 0, 1.04, 0.04, 1.04, C.tentDark],
  ...Array.from({ length: 10 }, (_, i): Box => [0, 0.08 + i * 0.085, 0, 1 - i * 0.098, 0.085, 1 - i * 0.098, i % 4 === 3 ? C.tentDark : C.tent]),
  [0, 0.95, 0, 0.05, 0.08, 0.05, C.ink],
  [0, 0.2, 0.47, 0.22, 0.34, 0.03, C.tentDark],
  [0, 0.36, 0.43, 0.14, 0.08, 0.03, C.ink],
  [0, 0.6, 0.2, 0.1, 0.05, 0.03, C.canvas],
  ...[[0.55, 0.55], [-0.55, 0.55], [0.55, -0.55], [-0.55, -0.55]].map(([x, z]): Box => [x, 0.04, z, 0.04, 0.08, 0.04, C.metal]),
];
export const CRATE_BOXES: readonly Box[] = [
  [0, 0.2, 0, 0.6, 0.4, 0.4, C.crate],
  [0, 0.41, 0, 0.62, 0.03, 0.42, C.crateDark],
  [0, 0.2, 0.201, 0.62, 0.05, 0.005, C.crateDark],
  [0, 0.2, -0.201, 0.62, 0.05, 0.005, C.crateDark],
  [0.301, 0.2, 0, 0.005, 0.05, 0.42, C.crateDark],
  [-0.301, 0.2, 0, 0.005, 0.05, 0.42, C.crateDark],
  [0.12, 0.3, 0.203, 0.18, 0.08, 0.005, C.canvas],
  [0.12, 0.3, 0.205, 0.12, 0.02, 0.003, C.ink],
  [-0.2, 0.06, 0.2, 0.05, 0.12, 0.02, C.crateDark],
  [0.2, 0.06, 0.2, 0.05, 0.12, 0.02, C.crateDark],
  [-0.2, 0.06, -0.2, 0.05, 0.12, 0.02, C.crateDark],
  [0.2, 0.06, -0.2, 0.05, 0.12, 0.02, C.crateDark],
];
/** Sled with a wrapped load, as in the photograph of the ammonite being moved. */
export const SLED_BOXES: readonly Box[] = [
  [0, 0.03, 0, 1, 0.04, 0.42, C.canvas],
  [0.52, 0.06, 0, 0.06, 0.08, 0.42, C.canvas],
  [0, 0.02, 0.2, 1.04, 0.02, 0.03, C.metal], [0, 0.02, -0.2, 1.04, 0.02, 0.03, C.metal],
  [0, 0.14, 0, 0.42, 0.18, 0.3, C.shell],
  [0, 0.24, 0, 0.36, 0.06, 0.26, C.shellStripe],
  [-0.12, 0.15, 0, 0.02, 0.2, 0.32, C.ink], [0.12, 0.15, 0, 0.02, 0.2, 0.32, C.ink],
  [0, 0.15, 0.08, 0.44, 0.02, 0.02, C.ink], [0, 0.15, -0.08, 0.44, 0.02, 0.02, C.ink],
  [0.6, 0.07, 0.12, 0.2, 0.015, 0.015, C.ink], [0.6, 0.07, -0.12, 0.2, 0.015, 0.015, C.ink],
];
/** Radio mast with a pennant, a landmark of every camp photograph. */
export const MAST_BOXES: readonly Box[] = [
  [0, 0.05, 0, 0.16, 0.1, 0.16, C.crateDark],
  ...Array.from({ length: 8 }, (_, i): Box => [0, 0.15 + i * 0.1, 0, 0.03, 0.1, 0.03, i % 2 ? C.metal : C.canvas]),
  [0, 0.97, 0, 0.12, 0.015, 0.015, C.metal],
  [0.08, 0.9, 0, 0.14, 0.06, 0.01, C.tent],
  [0.17, 0.9, 0, 0.05, 0.03, 0.01, C.tentDark],
  [0, 1.0, 0, 0.015, 0.06, 0.015, C.ink],
];
export const FOSSIL_MODELS: Readonly<Record<string, readonly Box[]>> = {
  'fossil-jaw': JAW_BOXES, 'antarctopelta-bones': DINO_BONES,
  'plesiosaur-skeleton': PLESIO_SKELETON,
  'field-tent': TENT_BOXES, 'field-crate': CRATE_BOXES, 'field-sled': SLED_BOXES, 'field-mast': MAST_BOXES,
};

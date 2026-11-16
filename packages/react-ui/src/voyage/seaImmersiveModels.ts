import { block, mirrorZ, prism, scaled, type Tri } from './lowPoly.ts';
import { SEA_ICE_FLOE_POLY_VARIANTS } from '../orcadas/lowPolyProps.ts';

const WHITE = 0xf4f7f8;
const BIRD_SLATE = 0x45505a;
const BEAK_GOLD = 0xe3a83b;
const BLACK = 0x1f2a36;
const ICE_WHITE = 0xeff5f8;
const ICE_BLUE = 0xb8d4e6;
const FOAM_WHITE = 0xe8f3f8;
const KRILL_CORAL = 0xe87b5a;
const KRILL_GOLD = 0xf2b179;
const BUOY_YELLOW = 0xf0b429;
const BUOY_RED = 0xd64531;
const BUOY_STEEL = 0x7a8a99;
const BEACON_WARM = 0xf2c14e;

export interface SeaBirdParts {
  readonly body: readonly Tri[];
  readonly wingR: readonly Tri[];
  readonly wingL: readonly Tri[];
}

const albatrossWingR: readonly Tri[] = [
  ...prism([[0.06, 0], [0.02, 0.36], [-0.05, 0.38], [-0.07, 0.16], [-0.06, 0]], -0.008, 0.01, WHITE, WHITE),
  ...prism([[0.01, 0.36], [-0.02, 0.58], [-0.08, 0.56], [-0.05, 0.38]], -0.006, 0.008, BIRD_SLATE, BIRD_SLATE),
];

/** Low-poly wandering albatross with articulated wings for gliding over the open ocean. */
export const ALBATROSS_PARTS: SeaBirdParts = {
  body: [
    ...prism([[0.18, 0], [0.06, 0.045], [-0.14, 0.032], [-0.22, 0.018], [-0.22, -0.018], [-0.14, -0.032], [0.06, -0.045]], -0.035, 0.035, WHITE, WHITE),
    // Hooked yellow-gold beak & dark eyes
    ...prism([[0.27, 0], [0.18, 0.02], [0.18, -0.02]], -0.016, 0.014, BEAK_GOLD, BEAK_GOLD),
    ...block(0.15, 0.015, 0.025, 0.014, 0.014, 0.008, BLACK),
    ...block(0.15, 0.015, -0.025, 0.014, 0.014, 0.008, BLACK),
    // Tail fan
    ...prism([[-0.2, 0], [-0.3, 0.06], [-0.3, -0.06]], -0.006, 0.008, BIRD_SLATE, BIRD_SLATE),
  ],
  wingR: albatrossWingR,
  wingL: mirrorZ(albatrossWingR),
};

/** Small calved ice block for iceberg tap-reactions. */
export const ICE_CHUNK_POLY: readonly Tri[] = [
  ...prism([[0.07, 0], [0.02, 0.06], [-0.06, 0.04], [-0.05, -0.05], [0.03, -0.06]], 0, 0.09, ICE_BLUE, ICE_WHITE),
];

/** Low-poly V-wake foam trail behind sailing ships. */
export const SHIP_WAKE_POLY: readonly Tri[] = [
  ...prism([[-0.42, 0.02], [-0.85, 0.17], [-0.88, 0.13], [-0.46, 0.01]], 0.002, 0.012, FOAM_WHITE, FOAM_WHITE),
  ...prism([[-0.42, -0.02], [-0.46, -0.01], [-0.88, -0.13], [-0.85, -0.17]], 0.002, 0.012, FOAM_WHITE, FOAM_WHITE),
  ...prism([[-0.48, 0.03], [-0.72, 0.07], [-0.74, 0.03], [-0.5, -0.03]], 0.001, 0.009, ICE_BLUE, FOAM_WHITE),
];

/** Drifting seasonal pack-ice plates (two distinct shapes). */
export const PACK_ICE_POLYS: readonly (readonly Tri[])[] = [
  scaled(SEA_ICE_FLOE_POLY_VARIANTS[1].tris, 0.36),
  scaled(SEA_ICE_FLOE_POLY_VARIANTS[3].tris, 0.32),
];

/** Low-poly krill swarm cluster floating near whale feeding zones. */
export const KRILL_POLY: readonly Tri[] = Array.from({ length: 12 }, (_, i) => {
  const a = (i / 12) * Math.PI * 2 + (i % 3) * 0.2;
  const r = 0.08 + (i % 4) * 0.075;
  const col = i % 2 === 0 ? KRILL_CORAL : KRILL_GOLD;
  return block(Math.cos(a) * r, 0.015 + (i % 3) * 0.008, Math.sin(a) * r, 0.055, 0.022, 0.03, col);
}).flat();

/** Low-poly oceanographic drifting buoy for the Drake Passage. */
export const BUOY_POLY: readonly Tri[] = (() => {
  const oct = (r: number) =>
    Array.from({ length: 8 }, (_, i) => {
      const a = (i / 8) * Math.PI * 2;
      return [Math.cos(a) * r, Math.sin(a) * r] as const;
    });
  return [
    // Submerged ballast skirt
    ...prism(oct(0.14), -0.06, 0.0, BLACK, BLACK),
    // Main yellow float hull + red visibility band
    ...prism(oct(0.18), 0.0, 0.08, BUOY_YELLOW, BUOY_YELLOW),
    ...prism(oct(0.15), 0.08, 0.13, BUOY_RED, BUOY_RED),
    // Steel mast & sensor crossarm
    ...block(0, 0.24, 0, 0.045, 0.22, 0.045, BUOY_STEEL),
    ...block(0, 0.3, 0, 0.16, 0.025, 0.025, BUOY_STEEL),
    // Top warm strobe beacon
    ...prism(oct(0.055), 0.35, 0.42, BEACON_WARM, BEACON_WARM),
  ];
})();

/** Small low-poly warm lantern / radio beacon diamond for Antarctic stations. */
export const BEACON_DIAMOND_POLY: readonly Tri[] = [
  ...prism([[0.08, 0], [0, 0.08], [-0.08, 0], [0, -0.08]], 0, 0.14, BEACON_WARM, BEACON_WARM),
];

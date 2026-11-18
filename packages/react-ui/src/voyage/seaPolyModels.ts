import { buildPenguinPolyParts, buildWeddellSealPolyParts, mirrorZTris } from '../orcadas/lowPolyAnimals.ts';
import { SEA_ICE_FLOE_POLY_VARIANTS } from '../orcadas/lowPolyProps.ts';
import { PENGUIN_NECK, PENGUIN_SHOULDER, type PenguinSpecies } from '../orcadas/penguins.ts';
import { WEDDELL_FLIPPER_L, WEDDELL_FLIPPER_R, WEDDELL_NECK, WEDDELL_TAIL } from '../orcadas/seals.ts';
import { scaled, shift, turn, type Tri } from './lowPoly.ts';
import { assembleCetacean, MINKE_PARTS, ORCA_PARTS } from './whalePolyModels.ts';
import { HUMPBACK_PARTS } from '../marine/lowPolyMarine.ts';

/** Assemble an Orcadas low-poly penguin in its standing rest pose (feet at y = 0, beak to +x). */
export function assemblePenguin(species: PenguinSpecies): Tri[] {
  const parts = buildPenguinPolyParts(species);
  const [sx, sy, sz] = PENGUIN_SHOULDER;
  return [
    ...parts.body,
    ...shift(parts.head, ...PENGUIN_NECK),
    ...shift(parts.flipper, sx, sy, sz),
    ...shift(mirrorZTris(parts.flipper), sx, sy, -sz),
  ];
}

/** Assemble the Orcadas low-poly Weddell seal in its resting pose (belly on y = 0, nose to +x). */
export function assembleWeddellSeal(): Tri[] {
  const parts = buildWeddellSealPolyParts();
  return [
    ...parts.body,
    ...shift(parts.head, ...WEDDELL_NECK),
    ...shift(parts.flipperL, ...WEDDELL_FLIPPER_L),
    ...shift(parts.flipperR, ...WEDDELL_FLIPPER_R),
    ...shift(parts.tail, ...WEDDELL_TAIL),
  ];
}

const floeBase = (variantIdx: number, scale: number): Tri[] =>
  shift(scaled(SEA_ICE_FLOE_POLY_VARIANTS[variantIdx].tris, scale), 0, 0.068 * scale, 0);

export interface PenguinOnFloe {
  readonly species: PenguinSpecies;
  readonly x: number;
  readonly z: number;
  readonly scale: readonly [number, number, number];
  readonly angle: number;
}

/** Four penguins with distinct squad builds (leader, tall, stout, rookie) on a roomier floe. */
export const PENGUINS_ON_FLOE: readonly PenguinOnFloe[] = [
  { species: 'adelie', x: 0.17, z: 0.02, scale: [0.43, 0.44, 0.43], angle: 0.25 },
  { species: 'chinstrap', x: -0.15, z: -0.16, scale: [0.35, 0.54, 0.35], angle: 0.65 },
  { species: 'adelie', x: -0.15, z: 0.17, scale: [0.47, 0.36, 0.47], angle: -0.45 },
  { species: 'chinstrap', x: 0.06, z: -0.2, scale: [0.32, 0.32, 0.32], angle: 0.9 },
];

export const PENGUIN_FLOE_TRIS: readonly Tri[] = floeBase(0, 0.68);
export const SEAL_FLOE_TRIS: readonly Tri[] = floeBase(2, 0.6);
export const PENGUIN_FLOE_Y = 0.105;
export const SEAL_FLOE_PLACEMENT = { x: 0.02, y: 0.092, z: 0.02, scale: 0.72, angle: 0.2 } as const;

const ADELIE = assemblePenguin('adelie');
const CHINSTRAP = assemblePenguin('chinstrap');

const scaleXYZ = (tris: readonly Tri[], [sx, sy, sz]: readonly [number, number, number]): Tri[] =>
  tris.map(([a, b, c, col]) => [
    [a[0] * sx, a[1] * sy, a[2] * sz],
    [b[0] * sx, b[1] * sy, b[2] * sz],
    [c[0] * sx, c[1] * sy, c[2] * sz],
    col,
  ]);

/**
 * Low-poly sea fauna for the general map (SeaLife.tsx and SeaPreview.tsx), reusing the Orcadas
 * penguin and Weddell seal models on low-poly sea ice floes, plus low-poly cetaceans.
 */
export const SEA_POLY_MODELS = {
  penguins: [
    ...PENGUIN_FLOE_TRIS,
    ...PENGUINS_ON_FLOE.flatMap((p) =>
      shift(turn(scaleXYZ(p.species === 'chinstrap' ? CHINSTRAP : ADELIE, p.scale), p.angle), p.x, PENGUIN_FLOE_Y, p.z),
    ),
  ],
  seal: [
    ...SEAL_FLOE_TRIS,
    ...shift(
      turn(scaled(assembleWeddellSeal(), SEAL_FLOE_PLACEMENT.scale), SEAL_FLOE_PLACEMENT.angle),
      SEAL_FLOE_PLACEMENT.x,
      SEAL_FLOE_PLACEMENT.y,
      SEAL_FLOE_PLACEMENT.z,
    ),
  ],
  humpback: assembleCetacean(HUMPBACK_PARTS),
  orca: assembleCetacean(ORCA_PARTS),
  minke: assembleCetacean(MINKE_PARTS),
} as const satisfies Record<string, readonly Tri[]>;

export type SeaPolyModelId = keyof typeof SEA_POLY_MODELS;

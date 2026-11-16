import type { Tri, Vec3 } from './lowPoly.ts';
import { loftAlongX, tube, type XStation } from './ponchoShapes.ts';
import { PONCHO_EYE_ALMOND, PONCHO_NOSE, PONCHO_PALETTE, type DogPalette } from './ponchoModels.ts';

/**
 * Low-poly dog of Poncho's team (rule 30): rounded body, neck and head lofted along x, tapered
 * legs and a plumed tail, instead of the block model of ponchoModels.ts. One unit long, nose to
 * +x, base on y = 0, same frame and size as `poncho-dog` so the harness point and DOG_SCALE hold.
 * An illustration after the book's description, not a measured model of a real animal.
 */

const SIDES = 8;
const LEG_SIDES = 6;

// Chest to rump, then neck to snout: [x, center height, half height, half width].
const BODY: readonly XStation[] = [
  { x: -0.36, cy: 0.5, ry: 0.1, rz: 0.1 },
  { x: -0.26, cy: 0.5, ry: 0.17, rz: 0.15 },
  { x: -0.06, cy: 0.47, ry: 0.19, rz: 0.16 },
  { x: 0.12, cy: 0.5, ry: 0.2, rz: 0.17 },
  { x: 0.22, cy: 0.56, ry: 0.15, rz: 0.12 },
];
const HEAD: readonly XStation[] = [
  { x: 0.2, cy: 0.64, ry: 0.11, rz: 0.1 },
  { x: 0.31, cy: 0.69, ry: 0.13, rz: 0.12 },
  { x: 0.42, cy: 0.65, ry: 0.07, rz: 0.075 },
  { x: 0.48, cy: 0.64, ry: 0.04, rz: 0.045 },
];

/** Where each leg hangs from (model frame: x ahead, y up, z to the left of the dog): the hip or the shoulder. */
export type DogLeg = 'frontLeft' | 'frontRight' | 'hindLeft' | 'hindRight';
export const DOG_LEGS: readonly DogLeg[] = ['frontLeft', 'frontRight', 'hindLeft', 'hindRight'];
export const DOG_LEG_PIVOT: Readonly<Record<DogLeg, Vec3>> = {
  frontLeft: [0.12, 0.4, 0.1],
  frontRight: [0.12, 0.4, -0.1],
  hindLeft: [-0.27, 0.4, 0.1],
  hindRight: [-0.27, 0.4, -0.1],
};

/** The dog in pieces: the body, and each leg with its points relative to its own pivot, so it can swing. */
export interface DogParts {
  readonly body: Tri[];
  readonly legs: Readonly<Record<DogLeg, Tri[]>>;
}

/** Biggest swing of a leg at a trot, in radians, forwards or backwards. */
export const DOG_SWING = 0.55;

/**
 * How far each leg swings (radians, positive = the paw goes forward) when the dog trots at `phase` (radians; a
 * whole turn is one stride). A trot moves the legs in diagonal pairs: front left with hind right, front right
 * with hind left. A dog that does not move (`moving` false) stands with its legs straight.
 */
export function dogLegSwing(phase: number, moving: boolean): Record<DogLeg, number> {
  if (!moving) return { frontLeft: 0, frontRight: 0, hindLeft: 0, hindRight: 0 };
  const a = Math.sin(phase) * DOG_SWING;
  return { frontLeft: a, hindRight: a, frontRight: -a, hindLeft: -a };
}

/** A dog in the given palette, in pieces. */
export function ponchoDogParts(p: DogPalette = PONCHO_PALETTE): DogParts {
  const body: Tri[] = [
    ...loftAlongX(BODY, SIDES, (i, band) => (i >= 5 && i <= 7 && band >= 1 && band <= 2 ? p.patch : i >= 3 && i <= 4 ? p.shade : p.coat)),
    ...loftAlongX(HEAD, SIDES, (i, band) => (band === 2 ? (i >= 3 && i <= 5 ? p.muzzle : p.coat) : i >= 5 && i <= 7 && band === 0 ? p.patch : p.coat)),
    // Dark nose and almond eyes (the distinctive trait), ears pointing up and a bit back.
    ...tube([0.475, 0.645, 0], [0.5, 0.645, 0], 0.045, 0.03, 6, PONCHO_NOSE),
    ...tube([0.37, 0.72, 0.1], [0.385, 0.72, 0.125], 0.022, 0.022, 5, PONCHO_EYE_ALMOND),
    ...tube([0.37, 0.72, -0.1], [0.385, 0.72, -0.125], 0.022, 0.022, 5, PONCHO_EYE_ALMOND),
    ...tube([0.28, 0.77, 0.07], [0.25, 0.91, 0.08], 0.045, 0.01, 5, p.ear),
    ...tube([0.28, 0.77, -0.07], [0.25, 0.91, -0.08], 0.045, 0.01, 5, p.ear),
    // Plumed tail curled up over the back.
    ...tube([-0.34, 0.54, 0], [-0.46, 0.62, 0], 0.06, 0.07, 6, p.tail),
    ...tube([-0.46, 0.62, 0], [-0.42, 0.78, 0], 0.07, 0.065, 6, p.tail, false, true),
    ...tube([-0.42, 0.78, 0], [-0.3, 0.8, 0], 0.065, 0.03, 6, p.tail, false, true),
  ];
  // Legs tapering down to a paw, front pair and hind pair, each one moved so its pivot is the origin.
  const legs = {} as Record<DogLeg, Tri[]>;
  for (const leg of DOG_LEGS) {
    const [px, py, pz] = DOG_LEG_PIVOT[leg];
    const sx = px > 0 ? 0.05 : 0.055;
    const tris = [
      ...tube([px, py, pz], [px + 0.01, 0.04, pz], sx + 0.015, sx - 0.01, LEG_SIDES, p.coat),
      ...tube([px - 0.02, 0.045, pz], [px + 0.06, 0.045, pz], 0.045, 0.04, LEG_SIDES, p.shade),
    ];
    legs[leg] = tris.map(([a, b, c, color]): Tri => [
      [a[0] - px, a[1] - py, a[2] - pz],
      [b[0] - px, b[1] - py, b[2] - pz],
      [c[0] - px, c[1] - py, c[2] - pz],
      color,
    ]);
  }
  return { body, legs };
}

/** The whole dog at rest in the given palette (body and legs in their places). */
export function ponchoDogTris(p: DogPalette = PONCHO_PALETTE): Tri[] {
  const { body, legs } = ponchoDogParts(p);
  const out = [...body];
  for (const leg of DOG_LEGS) {
    const [px, py, pz] = DOG_LEG_PIVOT[leg];
    for (const [a, b, c, color] of legs[leg]) {
      out.push([[a[0] + px, a[1] + py, a[2] + pz], [b[0] + px, b[1] + py, b[2] + pz], [c[0] + px, c[1] + py, c[2] + pz], color]);
    }
  }
  return out;
}

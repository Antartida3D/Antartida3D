import type { Tri } from './lowPoly.ts';
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

/** A dog in the given palette. */
export function ponchoDogTris(p: DogPalette = PONCHO_PALETTE): Tri[] {
  // Grey saddle: the upper bands of the body take the patch color.
  const out: Tri[] = [
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
  // Legs tapering down to a paw, front pair and hind pair.
  for (const [x, sx] of [[0.12, 0.05], [-0.27, 0.055]] as const) {
    for (const z of [0.1, -0.1]) {
      out.push(...tube([x, 0.4, z], [x + 0.01, 0.04, z], sx + 0.015, sx - 0.01, LEG_SIDES, p.coat));
      out.push(...tube([x - 0.02, 0.045, z], [x + 0.06, 0.045, z], 0.045, 0.04, LEG_SIDES, p.shade));
    }
  }
  return out;
}

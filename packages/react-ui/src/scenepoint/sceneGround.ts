import { groundField, RELIEF_ICE, RELIEF_ROCK, scaled, shift, type Tri } from '../voyage/lowPoly.ts';
import { ICE, ICE_SHADE, ROCK, WHITE } from '../voyage/sightingModels.ts';

/**
 * Ground shared by the scenes of points of interest on the high plateau (#281, #286): plain snow,
 * and the models of the map points set on it at the scale of the scene.
 */

/** Snow with a rare hollow: the plateau reads as one plain. */
const snowColor = (_u: number, _v: number, _h: number, _steep: number, noise: number) => (noise > 0.97 ? ICE_SHADE : noise > 0.9 ? ICE : WHITE);

/** Snow of the plateau at height `y` over a rectangle from (x0, z0) to (x1, z1); its edges stay straight, so they meet what stands next to them. */
export function snowRect(x0: number, z0: number, x1: number, z1: number, y: number, cell: number, seed: number): Tri[] {
  const cols = Math.max(1, Math.round((x1 - x0) / cell));
  const rows = Math.max(1, Math.round((z1 - z0) / cell));
  const field = groundField(cols, rows, (x1 - x0) / cols, seed, () => y, snowColor, 0);
  // groundField is square-celled from the width: stretch its depth to the rectangle, then centre it.
  const kz = (z1 - z0) / (rows * ((x1 - x0) / cols));
  return shift(
    field.map(([a, b, c, col]): Tri => [[a[0], a[1], a[2] * kz], [b[0], b[1], b[2] * kz], [c[0], c[1], c[2] * kz], col]),
    (x0 + x1) / 2,
    0,
    (z0 + z1) / 2,
  );
}

/**
 * The plateau at height `y` out to `reach` on every side, round an open square hole from (0, 0) to
 * (`hole`, `hole`), or whole when `hole` is 0.
 */
export function plateauTris(y: number, reach: number, hole: number, cell: number, seed: number): Tri[] {
  if (hole <= 0) return snowRect(-reach, -reach, reach, reach, y, cell, seed);
  return [
    ...snowRect(-reach, -reach, 0, reach, y, cell, seed),
    ...snowRect(hole, -reach, reach, reach, y, cell, seed + 1),
    ...snowRect(0, -reach, hole, 0, y, cell, seed + 2),
    ...snowRect(0, hole, hole, reach, y, cell, seed + 3),
  ];
}

/** The relief colors of a map model (made for the painted map) as the plain snow and rock of the scenes. */
export const plainRelief = (tris: readonly Tri[]): Tri[] =>
  tris.map((t) => (t[3] === RELIEF_ICE ? [t[0], t[1], t[2], WHITE] : t[3] === RELIEF_ROCK ? [t[0], t[1], t[2], ROCK] : t));

/** A model of the map (pointModels.ts) at the scale `k` of a scene, its base at `at`. */
export const atScene = (tris: readonly Tri[], k: number, [x, y, z]: readonly [number, number, number]): Tri[] => shift(scaled(plainRelief(tris), k), x, y, z);

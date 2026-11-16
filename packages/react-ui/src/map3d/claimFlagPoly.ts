import { block, ngon, prism, type Tri } from '../voyage/lowPoly.ts';
import type { Box } from '../voyage/vehicles.ts';

const ZINC = 0x7d868c;
const ICE = 0xe9f1f4;

/** Wave displacement in z along the flag cloth (anchored at the hoist x ~ 0.02). */
const waveZ = (x: number): number => (x > 0.035 ? Math.sin((x - 0.035) * 9.5) * 0.022 : 0);

/**
 * Convert a block flag definition into low-poly triangles with an 8-sided mast, faceted finial,
 * and a gentle wind wave across the cloth while preserving exact pattern colors.
 */
export function boxesToFlagPoly(boxes: readonly Box[]): Tri[] {
  const tris: Tri[] = [
    ...prism(ngon(0, 0, 0.014, 8), 0, 0.985, ZINC, ZINC),
    ...prism(ngon(0, 0, 0.022, 8), 0.98, 1.008, ICE, ICE),
  ];
  for (const [cx, cy, cz, sx, sy, sz, color] of boxes) {
    // Skip the original vertical pole boxes; replaced by the octagonal mast above.
    if (cx <= 0.01 && sy > 0.5) continue;
    for (const [a, b, c, col] of block(cx, cy, cz, sx, sy, sz, color)) {
      tris.push([
        [a[0], a[1], a[2] + waveZ(a[0])],
        [b[0], b[1], b[2] + waveZ(b[0])],
        [c[0], c[1], c[2] + waveZ(c[0])],
        col,
      ]);
    }
  }
  return tris;
}

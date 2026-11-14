import { normalOf, type Tri, type Vec3 } from '../src/voyage/lowPoly.ts';

/** Faces whose normal points into the shape: with a front-side material they would not be drawn. */
export function inward(tris: readonly Tri[], center: Vec3): number {
  return tris.filter((t) => {
    const n = normalOf(t);
    const m = [0, 1, 2].map((k) => (t[0][k] + t[1][k] + t[2][k]) / 3);
    return n[0] * (m[0] - center[0]) + n[1] * (m[1] - center[1]) + n[2] * (m[2] - center[2]) < -1e-9;
  }).length;
}

import { createSeededRng } from '@antartida/core';
import { quad, RELIEF_ICE, type Tri, type Vec3 } from './lowPoly.ts';
import { VOXEL_PALETTE } from '../orcadas/stationModels.ts';

/**
 * Generic low-poly pieces for the props of Poncho's stops (ponchoProps.ts): tilted rods, thin
 * plates, ropes, a snow mound that melts into the relief, and a loft along x. Every face looks
 * outwards (test/ponchoShapes.test.ts). Units are model units (a person stands ~1.0 tall).
 */

const { WHITE, ICE } = VOXEL_PALETTE;

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: Vec3): Vec3 => {
  const l = Math.hypot(...a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/**
 * A rod from `a` to `b` with `sides` corners and radius `r0` at `a`, `r1` at `b`, closed at the
 * ends that ask for it. Used for poles, ropes, shafts and struts.
 */
export function tube(a: Vec3, b: Vec3, r0: number, r1: number, sides: number, color: number, capA = true, capB = true): Tri[] {
  const d = norm(sub(b, a));
  const ref: Vec3 = Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
  const u = norm(cross(d, ref));
  const w = cross(d, u);
  const ringAt = (c: Vec3, r: number): Vec3[] =>
    Array.from({ length: sides }, (_, i) => {
      const t = (i / sides) * Math.PI * 2;
      return add(c, add(mul(u, Math.cos(t) * r), mul(w, Math.sin(t) * r)));
    });
  const ra = ringAt(a, r0);
  const rb = ringAt(b, r1);
  const out: Tri[] = [];
  for (let i = 0; i < sides; i++) {
    const j = (i + 1) % sides;
    out.push(...quad(ra[i], ra[j], rb[j], rb[i], color));
    if (capA) out.push([a, ra[j], ra[i], color]);
    if (capB) out.push([b, rb[i], rb[j], color]);
  }
  return out;
}

/** A rope along a polyline: one thin rod per piece, closed only at the two ends. */
export function rope(points: readonly Vec3[], r: number, sides: number, color: number): Tri[] {
  const out: Tri[] = [];
  for (let i = 0; i < points.length - 1; i++) out.push(...tube(points[i], points[i + 1], r, r, sides, color, i === 0, i === points.length - 2));
  return out;
}

/**
 * A thin plate: the four corners in order (either way round), thickened `t` along their normal.
 * For blades, wings, flags and skis.
 */
export function slab(corners: readonly [Vec3, Vec3, Vec3, Vec3], t: number, color: number, backColor = color): Tri[] {
  const [a, b, c] = corners;
  const n = norm(cross(sub(b, a), sub(c, a)));
  const front = corners.map((p) => add(p, mul(n, t / 2))) as unknown as [Vec3, Vec3, Vec3, Vec3];
  const back = corners.map((p) => add(p, mul(n, -t / 2))) as unknown as [Vec3, Vec3, Vec3, Vec3];
  const out: Tri[] = [...quad(front[0], front[1], front[2], front[3], color), ...quad(back[3], back[2], back[1], back[0], backColor)];
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    out.push(...quad(back[i], back[j], front[j], front[i], color));
  }
  return out;
}

/** A thin triangle plate, e.g. a pennant: three corners, thickened `t`. */
export function thinTriangle(a: Vec3, b: Vec3, c: Vec3, t: number, color: number): Tri[] {
  const n = norm(cross(sub(b, a), sub(c, a)));
  const f = [a, b, c].map((p) => add(p, mul(n, t / 2)));
  const k = [a, b, c].map((p) => add(p, mul(n, -t / 2)));
  const out: Tri[] = [[f[0], f[1], f[2], color], [k[0], k[2], k[1], color]];
  for (let i = 0; i < 3; i++) {
    const j = (i + 1) % 3;
    out.push(...quad(k[i], k[j], f[j], f[i], color));
  }
  return out;
}

/**
 * A drift of snow: a ragged ring on the ground (y = 0, the color of the relief, so it melts into
 * it once resolveRelief paints it) rising to a lumpy white top `h` high. Same winding as `prism`.
 */
export function snowMound(cx: number, cz: number, rx: number, rz: number, h: number, seed: number, n = 10): Tri[] {
  const rng = createSeededRng(seed);
  const at = (i: number, k: number, y: number): Vec3 => {
    const a = -(i / n) * Math.PI * 2;
    return [cx + Math.cos(a) * rx * k, y, cz + Math.sin(a) * rz * k];
  };
  const outerK = Array.from({ length: n }, () => 0.88 + rng() * 0.24);
  const innerH = Array.from({ length: n }, () => h * (0.72 + rng() * 0.28));
  const outer = (i: number) => at(i % n, outerK[i % n], 0);
  const inner = (i: number) => at(i % n, 0.58 * outerK[i % n], innerH[i % n]);
  const top: Vec3 = [cx, h, cz];
  const out: Tri[] = [];
  for (let i = 0; i < n; i++) {
    out.push(...quad(outer(i), outer(i + 1), inner(i + 1), inner(i), i % 3 === 0 ? ICE : RELIEF_ICE));
    out.push([top, inner(i), inner(i + 1), i % 2 ? WHITE : ICE]);
  }
  return out;
}

/** One cross section of `loftAlongX`: its place along x, the center height and the two radii. */
export interface XStation {
  readonly x: number;
  readonly cy: number;
  readonly ry: number;
  readonly rz: number;
}

/**
 * A body of revolution-like shape along x (a fuselage): rings of `sides` corners at each station,
 * joined by bands, closed at both ends. `color(i, band)` paints segment `i` of band `band`.
 */
export function loftAlongX(stations: readonly XStation[], sides: number, color: number | ((i: number, band: number) => number)): Tri[] {
  const rings = stations.map((s) =>
    Array.from({ length: sides }, (_, i): Vec3 => {
      const t = (i / sides) * Math.PI * 2;
      return [s.x, s.cy + Math.sin(t) * s.ry, Math.cos(t) * s.rz];
    }),
  );
  const paint = (i: number, band: number) => (typeof color === 'number' ? color : color(i, band));
  const out: Tri[] = [];
  for (let k = 0; k < rings.length - 1; k++) {
    for (let i = 0; i < sides; i++) {
      const j = (i + 1) % sides;
      out.push(...quad(rings[k][i], rings[k + 1][i], rings[k + 1][j], rings[k][j], paint(i, k)));
    }
  }
  const first = stations[0];
  const last = stations[stations.length - 1];
  for (let i = 0; i < sides; i++) {
    const j = (i + 1) % sides;
    out.push([[first.x, first.cy, 0], rings[0][i], rings[0][j], paint(i, 0)]);
    out.push([[last.x, last.cy, 0], rings[rings.length - 1][j], rings[rings.length - 1][i], paint(i, rings.length - 2)]);
  }
  return out;
}

/** Lowest y of a set of faces. */
export const lowestY = (tris: readonly Tri[]): number => Math.min(...tris.flatMap(([a, b, c]) => [a[1], b[1], c[1]]));

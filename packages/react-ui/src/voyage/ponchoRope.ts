import type { Vec3 } from './lowPoly.ts';

/**
 * The long line tied from the waist of the instructor to the harness of Poncho (book p. 9), as a curve
 * that is cheap to rebuild every frame: a few points between the two ends, sagging with a gentle curve
 * when there is slack and straight when the line is tight, and a thin three-sided tube along them.
 * Pure: the ends come from the people and dogs that move, the clock is not here.
 */

/** Pieces of the line, and sides of its tube. */
export const ROPE_SEGMENTS = 10;
export const ROPE_SIDES = 3;
/** Thickness of the line (radius, scene units) and how far above the snow it never drops. */
export const ROPE_RADIUS = 0.02;
export const ROPE_CLEARANCE = 0.02;

/**
 * How far the middle of a line of `length` sags when its ends are `chord` apart (parabola: the arc is
 * about chord + 8 d^2 / (3 chord)). Zero when the line is tight (chord >= length).
 */
export function ropeSag(chord: number, length: number): number {
  if (chord >= length || chord <= 0) return chord <= 0 ? length / 2 : 0;
  return Math.sqrt((3 * chord * (length - chord)) / 8);
}

/**
 * The points of the line from `a` to `b`, `segments + 1` of them, sagging down by `ropeSag` in the middle
 * and never lower than `floor(x, z)` plus ROPE_CLEARANCE. With the ends closer than the line is long it
 * hangs loose; farther than that it is straight (the ends win: it does not stretch the ends apart).
 */
export function ropePoints(a: Vec3, b: Vec3, length: number, floor: (x: number, z: number) => number, segments = ROPE_SEGMENTS): Vec3[] {
  const chord = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const sag = ropeSag(chord, length);
  return Array.from({ length: segments + 1 }, (_, i): Vec3 => {
    const u = i / segments;
    const x = a[0] + (b[0] - a[0]) * u;
    const z = a[2] + (b[2] - a[2]) * u;
    const y = a[1] + (b[1] - a[1]) * u - sag * 4 * u * (1 - u);
    return [x, Math.max(y, floor(x, z) + ROPE_CLEARANCE), z];
  });
}

/** Number of vertices of the tube along `segments` pieces. */
export const ropeVertexCount = (segments = ROPE_SEGMENTS): number => (segments + 1) * ROPE_SIDES;

/** Triangle indices of the tube, fixed: two faces for each side of each piece. */
export function ropeIndices(segments = ROPE_SEGMENTS): number[] {
  const out: number[] = [];
  for (let i = 0; i < segments; i++) {
    for (let k = 0; k < ROPE_SIDES; k++) {
      const a = i * ROPE_SIDES + k;
      const b = i * ROPE_SIDES + ((k + 1) % ROPE_SIDES);
      out.push(a, b, a + ROPE_SIDES, b, b + ROPE_SIDES, a + ROPE_SIDES);
    }
  }
  return out;
}

/** Writes the vertices of the tube along `points` into `out` (3 numbers a vertex, ropeVertexCount of them). */
export function fillRopeTube(out: Float32Array, points: readonly Vec3[], radius = ROPE_RADIUS): void {
  const last = points.length - 1;
  points.forEach((p, i) => {
    const q = points[Math.min(last, i + 1)];
    const o = points[Math.max(0, i - 1)];
    const tx = q[0] - o[0];
    const ty = q[1] - o[1];
    const tz = q[2] - o[2];
    // The two directions across the line: one sideways (horizontal), one at right angles to both.
    let sx = -tz;
    let sz = tx;
    const sl = Math.hypot(sx, sz) || 1;
    sx /= sl;
    sz /= sl;
    const ux = ty * sz;
    const uy = tz * sx - tx * sz;
    const uz = -ty * sx;
    const ul = Math.hypot(ux, uy, uz) || 1;
    for (let k = 0; k < ROPE_SIDES; k++) {
      const ang = (k / ROPE_SIDES) * Math.PI * 2;
      const c = Math.cos(ang) * radius;
      const s = Math.sin(ang) * radius;
      const at = (i * ROPE_SIDES + k) * 3;
      out[at] = p[0] + sx * c + (ux / ul) * s;
      out[at + 1] = p[1] + (uy / ul) * s;
      out[at + 2] = p[2] + sz * c + (uz / ul) * s;
    }
  });
}

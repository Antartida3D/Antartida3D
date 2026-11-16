import { describe, expect, it } from 'vitest';
import {
  ROPE_CLEARANCE,
  ROPE_RADIUS,
  ROPE_SEGMENTS,
  ROPE_SIDES,
  fillRopeTube,
  ropeIndices,
  ropePoints,
  ropeSag,
  ropeVertexCount,
} from '../src/voyage/ponchoRope.ts';
import type { Vec3 } from '../src/voyage/lowPoly.ts';

const flat = () => 0;
const arc = (pts: readonly Vec3[]) => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1], p[2] - pts[i][2]), 0);

describe('the line of the instructor (book p. 9)', () => {
  it('sags only when there is slack: tight at the length, more the closer the ends', () => {
    expect(ropeSag(2.2, 2.2)).toBe(0);
    expect(ropeSag(3, 2.2)).toBe(0);
    expect(ropeSag(2, 2.2)).toBeGreaterThan(0);
    expect(ropeSag(1, 2.2)).toBeGreaterThan(ropeSag(2, 2.2));
    expect(ropeSag(0, 2.2)).toBeGreaterThan(0);
  });

  it('runs from one end to the other, straight when tight and with a gentle curve as long as the line when slack', () => {
    const a: Vec3 = [0, 0.5, 0];
    const tight = ropePoints(a, [2.2, 0.5, 0], 2.2, () => -5);
    expect(tight).toHaveLength(ROPE_SEGMENTS + 1);
    expect(tight[0]).toEqual(a);
    expect(tight[ROPE_SEGMENTS][0]).toBeCloseTo(2.2, 9);
    for (const p of tight) expect(p[1]).toBeCloseTo(0.5, 9);
    const slack = ropePoints(a, [1.6, 0.5, 0.2], 2.2, () => -5);
    expect(Math.min(...slack.map((p) => p[1]))).toBeLessThan(0.5);
    expect(arc(slack)).toBeGreaterThan(Math.hypot(1.6, 0.2));
    expect(arc(slack)).toBeLessThan(2.2 * 1.06);
  });

  it('never goes under the snow, and follows its height', () => {
    const hill = (x: number) => 0.1 * x;
    const pts = ropePoints([0, 0.3, 0], [0.5, 0.3, 0], 2.2, hill);
    for (const p of pts) expect(p[1]).toBeGreaterThanOrEqual(hill(p[0]) + ROPE_CLEARANCE - 1e-9);
  });

  it('has a tube with finite vertices at the radius of the line, and indices that stay inside it', () => {
    const pts = ropePoints([0, 0.5, 0], [1.5, 0.5, 0.4], 2.2, flat);
    const out = new Float32Array(ropeVertexCount() * 3);
    fillRopeTube(out, pts);
    expect(Array.from(out).every(Number.isFinite)).toBe(true);
    // Every vertex of a ring is one radius from the point of the line it belongs to.
    for (let i = 0; i < pts.length; i++) {
      for (let k = 0; k < ROPE_SIDES; k++) {
        const at = (i * ROPE_SIDES + k) * 3;
        expect(Math.hypot(out[at] - pts[i][0], out[at + 1] - pts[i][1], out[at + 2] - pts[i][2])).toBeCloseTo(ROPE_RADIUS, 4);
      }
    }
    const idx = ropeIndices();
    expect(idx).toHaveLength(ROPE_SEGMENTS * ROPE_SIDES * 6);
    expect(Math.max(...idx)).toBe(ropeVertexCount() - 1);
    expect(Math.min(...idx)).toBe(0);
  });
});

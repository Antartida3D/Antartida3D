import { describe, expect, it } from 'vitest';
import { boxShade, buildPolyGeometry, normalOf, POLY_MIN_COLORS, POLY_MIN_TRIS, type Tri } from '../src/voyage/lowPoly.ts';
import { HOURGLASS_DOLPHIN_POLY } from '../src/voyage/poly/hourglassDolphinPoly.ts';

/** WHITE of the model: belly and hourglass patches. */
const WHITE = 0xf7fafb;

const bounds = (tris: readonly Tri[]) => {
  const ps = tris.flatMap(([a, b, c]) => [a, b, c]);
  const min = [0, 1, 2].map((k) => Math.min(...ps.map((p) => p[k])));
  const max = [0, 1, 2].map((k) => Math.max(...ps.map((p) => p[k])));
  return { min, max };
};

describe('hourglass dolphin low-poly (#314)', () => {
  const tris = HOURGLASS_DOLPHIN_POLY;

  it('meets the low-poly detail floor', () => {
    expect(tris.length).toBeGreaterThanOrEqual(POLY_MIN_TRIS);
    expect(new Set(tris.map((t) => t[3])).size).toBeGreaterThanOrEqual(POLY_MIN_COLORS);
  });

  it('has no degenerate faces', () => {
    expect(tris.filter((t) => normalOf(t).every((v) => v === 0))).toHaveLength(0);
  });

  it('keeps the size and place of the block dolphin: one unit long, axis on y = 0, symmetric', () => {
    const { min, max } = bounds(tris);
    expect(max[0] - min[0]).toBeGreaterThan(0.95);
    expect(max[0] - min[0]).toBeLessThan(1.15);
    // The block model reaches from y = -0.0975 (flippers) to 0.19 (dorsal fin).
    expect(min[1]).toBeCloseTo(-0.1, 1);
    expect(max[1]).toBeCloseTo(0.19, 1);
    expect(max[2]).toBeCloseTo(-min[2], 6);
  });

  it('shows the hourglass: white patches on the flank ahead of and behind the dorsal fin, black back and beak', () => {
    const mid = (t: Tri) => [0, 1, 2].map((k) => (t[0][k] + t[1][k] + t[2][k]) / 3);
    const flankWhite = tris.filter((t) => t[3] === WHITE).map(mid).filter(([, y, z]) => z > 0.03 && y > -0.03);
    expect(flankWhite.some(([x]) => x > 0.1)).toBe(true);
    expect(flankWhite.some(([x]) => x < -0.15)).toBe(true);
    const back = tris.filter((t) => mid(t)[1] > 0.08);
    expect(back.every((t) => t[3] !== WHITE)).toBe(true);
    expect(tris.filter((t) => mid(t)[0] > 0.44).every((t) => t[3] !== WHITE)).toBe(true);
  });

  it('builds a finite BufferGeometry with boxShade', () => {
    const pos = buildPolyGeometry(tris, boxShade).getAttribute('position');
    expect(pos.count).toBe(tris.length * 3);
    for (let i = 0; i < pos.count; i++) expect(Number.isFinite(pos.getX(i) + pos.getY(i) + pos.getZ(i))).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import { boxShade, buildPolyGeometry, normalOf, POLY_MIN_COLORS, POLY_MIN_TRIS } from '../src/voyage/lowPoly.ts';
import { PEALES_DOLPHIN_POLY } from '../src/voyage/poly/pealesDolphinPoly.ts';

const tris = PEALES_DOLPHIN_POLY;
const points = tris.flatMap(([a, b, c]) => [a, b, c]);
const range = (k: number) => [Math.min(...points.map((p) => p[k])), Math.max(...points.map((p) => p[k]))];

describe("Peale's dolphin low-poly model", () => {
  it('meets the low-poly detail floor', () => {
    expect(tris.length).toBeGreaterThanOrEqual(POLY_MIN_TRIS);
    expect(new Set(tris.map((t) => t[3])).size).toBeGreaterThanOrEqual(POLY_MIN_COLORS);
  });

  it('has no degenerate faces', () => {
    expect(tris.filter((t) => normalOf(t).every((v) => v === 0))).toHaveLength(0);
  });

  it('keeps the frame of the block model: one unit long, nose to +x, axis on y = 0', () => {
    const [minX, maxX] = range(0);
    const [minY, maxY] = range(1);
    const [minZ, maxZ] = range(2);
    expect(maxX - minX).toBeGreaterThan(0.95);
    expect(maxX - minX).toBeLessThan(1.1);
    expect(maxX).toBeCloseTo(0.5, 2);
    // The block model spans y from about -0.1 (belly, flippers) to 0.19 (dorsal fin tip).
    expect(minY).toBeGreaterThan(-0.13);
    expect(minY).toBeLessThan(-0.08);
    expect(maxY).toBeGreaterThan(0.17);
    expect(maxY).toBeLessThan(0.21);
    expect(minZ).toBeCloseTo(-maxZ, 6);
  });

  it('has eyes on both sides and the light grey and white marks of the species', () => {
    const eyes = tris.filter((t) => t[3] === 0x1f2a36 && t[0][0] > 0.35);
    expect(eyes.some((t) => t[0][2] > 0.02)).toBe(true);
    expect(eyes.some((t) => t[0][2] < -0.02)).toBe(true);
    const colors = new Set(tris.map((t) => t[3]));
    for (const c of [0x3d4852, 0xa9b3ba, 0xf7fafb]) expect(colors.has(c)).toBe(true);
  });

  it('builds a finite geometry with boxShade', () => {
    const position = buildPolyGeometry(tris, boxShade).getAttribute('position');
    expect(position.count).toBe(tris.length * 3);
    for (let i = 0; i < position.array.length; i++) expect(Number.isFinite(position.array[i])).toBe(true);
  });
});

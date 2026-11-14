import { describe, expect, it } from 'vitest';
import { sdfFromAlpha } from '../src/map3d/coast.ts';

describe('coast SDF from relief alpha', () => {
  // 3x3 RGBA texture with known alpha values (0 = -1, 32 = 0, 64 = +1, 96 = +2).
  const alphas = [
    0, 32, 64,
    32, 64, 96,
    64, 96, 128,
  ];
  const data = new Uint8ClampedArray(3 * 3 * 4);
  for (let i = 0; i < alphas.length; i++) {
    data[i * 4 + 3] = alphas[i];
  }
  // Map x 100..200 and y 300..500 over the texel centres 0..2.
  const sdf = sdfFromAlpha(data, 3, 3, (x, y) => [(x - 100) / 50, (y - 300) / 100]);

  it('returns the exact encoded distance at pixel centers', () => {
    expect(sdf(100, 300)).toBeCloseTo(-1, 6);
    expect(sdf(150, 300)).toBeCloseTo(0, 6);
    expect(sdf(200, 300)).toBeCloseTo(1, 6);
    expect(sdf(150, 400)).toBeCloseTo(1, 6);
    expect(sdf(200, 500)).toBeCloseTo(3, 6);
  });

  it('bilinearly interpolates between pixels', () => {
    // Midpoint between (col 0, row 0) = -1 and (col 1, row 0) = 0 -> -0.5.
    expect(sdf(125, 300)).toBeCloseTo(-0.5, 6);
    // Center of cell (0..1, 0..1): average of (-1, 0, 0, +1) = 0.
    expect(sdf(125, 350)).toBeCloseTo(0, 6);
    // Quarter point between row 1 (col 1..2: +1..+2) and row 2 (col 1..2: +2..+3).
    expect(sdf(175, 425)).toBeCloseTo(1.75, 6);
  });

  it('returns -1 (sea) outside the image', () => {
    expect(sdf(99.9, 400)).toBe(-1);
    expect(sdf(200.1, 400)).toBe(-1);
    expect(sdf(150, 299.9)).toBe(-1);
    expect(sdf(150, 500.1)).toBe(-1);
  });
});

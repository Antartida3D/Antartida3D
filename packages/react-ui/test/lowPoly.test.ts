import { describe, expect, it } from 'vitest';
import { block, chunk, emperor, extrude, lathe, ngon, prism, rect } from '../src/voyage/lowPoly.ts';
import { inward } from './polyHelpers.ts';

describe('low-poly primitives face outwards', () => {
  it('prism', () => {
    expect(inward(prism(rect(0, 0, 1, 0.6), 0, 1, 1, 1, true), [0, 0.5, 0])).toBe(0);
    expect(inward(prism(ngon(0, 0, 0.5, 7), 0, 1, 1, 1, true), [0, 0.5, 0])).toBe(0);
    expect(inward(prism([...ngon(0, 0, 0.5, 7)].reverse(), 0, 1, 1, 1, true), [0, 0.5, 0])).toBe(0);
  });
  it('block', () => expect(inward(block(0.2, 0.3, -0.1, 0.4, 0.2, 0.3, 1), [0.2, 0.3, -0.1])).toBe(0));
  it('lathe, open top and pointed', () => {
    expect(inward(lathe(0, 0, [[0, 0.5], [0.5, 0.4], [1, 0.2]], 8, 1), [0, 0.5, 0])).toBe(0);
    expect(inward(lathe(0, 0, [[0, 0.5], [1, 0]], 8, 1), [0, 0.3, 0])).toBe(0);
  });
  it('extrude', () => {
    const arch: [number, number][] = [[0.5, 0], [0.4, 0.3], [0, 0.45], [-0.4, 0.3], [-0.5, 0]];
    expect(inward(extrude(arch, -1, 1, 1), [0, 0.15, 0])).toBe(0);
  });
  it('chunk', () => expect(inward(chunk(0, 0, 0, 1, 1, 1, 3, 1), [0, 0, 0])).toBe(0));
  it('emperor stands on the ground, about k tall', () => {
    const ys = emperor(0, 0, 0.3).flatMap(([a, b, c]) => [a[1], b[1], c[1]]);
    expect(Math.min(...ys)).toBeCloseTo(0, 5);
    expect(Math.max(...ys)).toBeCloseTo(0.3, 2);
  });
});

describe('low-poly icebergs (#58)', async () => {
  const { ICEBERG_PEAKS_POLY, ICEBERG_TABULAR_POLY } = await import('../src/voyage/icebergs.ts');
  const { POLY_MIN_TRIS, POLY_MIN_COLORS } = await import('../src/voyage/lowPoly.ts');
  for (const [name, tris] of Object.entries({ tabular: ICEBERG_TABULAR_POLY, peaks: ICEBERG_PEAKS_POLY })) {
    it(`${name} is one unit long, above the water, with the least detail`, () => {
      const xs = tris.flatMap(([a, b, c]) => [a[0], b[0], c[0]]);
      const ys = tris.flatMap(([a, b, c]) => [a[1], b[1], c[1]]);
      expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(0.9);
      expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(1.5);
      expect(Math.max(...ys)).toBeGreaterThan(0.15);
      expect(tris.length).toBeGreaterThanOrEqual(POLY_MIN_TRIS);
      expect(new Set(tris.map((t) => t[3])).size).toBeGreaterThanOrEqual(POLY_MIN_COLORS);
    });
  }
});

describe('the water round an iceberg faces up (seen from above, not culled)', async () => {
  const { waterline } = await import('../src/voyage/icebergs.ts');
  for (const kind of ['iceberg-lg', 'iceberg-sm'] as const) {
    it(kind, () => {
      for (const g of Object.values(waterline(kind))) {
        const p = g.getAttribute('position').array as Float32Array;
        for (let i = 0; i < p.length; i += 9) {
          const [ax, az, bx, bz, cx, cz] = [p[i], p[i + 2], p[i + 3], p[i + 5], p[i + 6], p[i + 8]];
          // y of the normal (b - a) x (c - a)
          expect((bz - az) * (cx - ax) - (bx - ax) * (cz - az)).toBeGreaterThanOrEqual(-1e-9);
        }
      }
    });
  }
});

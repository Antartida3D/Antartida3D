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

describe('emperor penguin, one closed model standing and swimming (#318)', async () => {
  const { EMPEROR_SWIM_BILL_TIP, emperorFlipper, emperorSwimFlipper, emperorSwimming, emperorWithFlippers, normalOf, POLY_MIN_COLORS, POLY_MIN_TRIS } = await import('../src/voyage/lowPoly.ts');
  type Tris = ReturnType<typeof emperorSwimming>;
  const key = (p: readonly number[]) => p.map((v) => Math.round(v * 1e6)).join(',');
  /** Edges with no face on the other side: a closed, outward skin uses each edge once each way. */
  const openEdges = (tris: Tris) => {
    const edges = new Map<string, number>();
    for (const [a, b, c] of tris) for (const [p, q] of [[a, b], [b, c], [c, a]]) edges.set(`${key(p)}>${key(q)}`, (edges.get(`${key(p)}>${key(q)}`) ?? 0) + 1);
    return [...edges].filter(([e, n]) => edges.get(e.split('>').reverse().join('>')) !== n).length;
  };
  /** Signed volume: positive when the faces look out. */
  const volume = (tris: Tris) => tris.reduce((s, [a, b, c]) => s + (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6, 0);

  const models = { standing: emperor(0, 0, 1), withFlippers: emperorWithFlippers(0, 0, 1), flipper: emperorFlipper(1), flipperLeft: emperorFlipper(-1), swimming: emperorSwimming(), swimFlipper: emperorSwimFlipper() };
  for (const [name, tris] of Object.entries(models)) {
    it(`${name} is closed, faces out and has no degenerate face`, () => {
      expect(openEdges(tris)).toBe(0);
      expect(volume(tris)).toBeGreaterThan(0);
      expect(tris.filter((t) => Math.hypot(...normalOf(t)) === 0)).toEqual([]);
    });
  }

  it('has the least detail and the marks of the emperor', () => {
    for (const tris of [models.withFlippers, models.swimming]) {
      expect(tris.length).toBeGreaterThanOrEqual(POLY_MIN_TRIS);
      const colors = new Set(tris.map((t) => t[3]));
      expect(colors.size).toBeGreaterThanOrEqual(POLY_MIN_COLORS);
      // Yellow neck patch, pale yellow chest, orange bill stripe, brown eye.
      for (const c of [0xf4b634, 0xf6e7a8, 0xe8843c, 0x5a3b26]) expect(colors.has(c)).toBe(true);
    }
  });

  it('stands on its feet, front +x, about one unit tall', () => {
    const pts = models.standing.flatMap(([a, b, c]) => [a, b, c]);
    expect(Math.min(...pts.map((p) => p[1]))).toBeCloseTo(0, 5);
    expect(Math.max(...pts.map((p) => p[1]))).toBeCloseTo(1, 5);
    // The bill reaches ahead, the tail behind, both less than half its height.
    expect(Math.max(...pts.map((p) => p[0]))).toBeGreaterThan(0.24);
    expect(Math.min(...pts.map((p) => p[0]))).toBeLessThan(-0.2);
    expect(Math.max(...pts.map((p) => Math.abs(p[2])))).toBeLessThan(0.25);
  });

  it('swims belly down, with the bill tip where it holds a fish and a closed tail end', () => {
    const pts = models.swimming.flatMap(([a, b, c]) => [a, b, c]);
    expect(Math.max(...pts.map((p) => p[0]))).toBeCloseTo(EMPEROR_SWIM_BILL_TIP, 2);
    // Seen from below, the belly is white and pale yellow, more than the slate back.
    const down = (color: number) => models.swimming.filter((t) => t[3] === color && normalOf(t)[1] < -0.5).length;
    expect(down(0xf7fafb) + down(0xf6e7a8)).toBeGreaterThan(down(0x3b4956));
    // Something closes the body behind: faces looking back (-x) at its rear.
    expect(models.swimming.filter((t) => normalOf(t)[0] < -0.9 && t[0][0] < -0.45).length).toBeGreaterThan(0);
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

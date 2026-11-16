import { describe, expect, it } from 'vitest';
import { POLY_MIN_COLORS, POLY_MIN_TRIS, normalOf, type Tri } from '../src/voyage/lowPoly.ts';
import { CONIFER_TRIS, FOSSIL_SCENERY_MODELS } from '../src/fossils/lowPolyScenery.ts';

const ys = (tris: readonly Tri[]) => tris.flatMap((t) => [t[0][1], t[1][1], t[2][1]]);

describe('Fósiles scenery in low-poly (#7, rule 30)', () => {
  for (const [id, tris] of Object.entries(FOSSIL_SCENERY_MODELS)) {
    it(`${id} has the least detail, no broken faces, and nothing under its base`, () => {
      expect(tris.length).toBeGreaterThanOrEqual(POLY_MIN_TRIS);
      expect(new Set(tris.map((t) => t[3])).size).toBeGreaterThanOrEqual(POLY_MIN_COLORS);
      expect(tris.filter((t) => Math.hypot(...normalOf(t)) === 0)).toEqual([]);
      expect(Math.min(...ys(tris))).toBeGreaterThan(-0.01);
    });
  }

  it('the conifer is about one unit tall, the tallest plant of the forest', () => {
    const top = Math.max(...ys(CONIFER_TRIS));
    expect(top).toBeGreaterThan(0.95);
    expect(top).toBeLessThan(1.2);
    for (const id of ['cretaceous-cycad', 'cretaceous-fern']) expect(Math.max(...ys(FOSSIL_SCENERY_MODELS[id]))).toBeLessThan(top);
  });
});

import { describe, expect, it } from 'vitest';
import { PONCHO_MODELS } from '../src/voyage/ponchoModels.ts';
import { SCENE_MODELS } from '../src/voyage/sightingModels.ts';
import { VOXEL_MIN_COLORS } from '../src/voyage/vehicles.ts';

describe('Poncho voxel models', () => {
  it('are registered in the scene models', () => {
    expect(SCENE_MODELS.poncho).toBe(PONCHO_MODELS.poncho);
    expect(SCENE_MODELS['poncho-dog']).toBe(PONCHO_MODELS['poncho-dog']);
  });

  it('have enough detail', () => {
    expect(PONCHO_MODELS.poncho.length).toBeGreaterThanOrEqual(40);
    expect(PONCHO_MODELS['poncho-dog'].length).toBeGreaterThanOrEqual(20);
  });

  for (const [name, boxes] of Object.entries(PONCHO_MODELS)) {
    it(`${name} is made of boxes with a size and a solid color`, () => {
      expect(new Set(boxes.map((b) => b[6])).size).toBeGreaterThanOrEqual(VOXEL_MIN_COLORS);
      for (const [, , , sx, sy, sz, color] of boxes) {
        expect(Math.min(sx, sy, sz)).toBeGreaterThan(0);
        expect(Number.isInteger(color) && color >= 0 && color <= 0xffffff).toBe(true);
      }
    });

    it(`${name} rests on y = 0, never below`, () => {
      expect(Math.min(...boxes.map((b) => b[1] - b[4] / 2))).toBeCloseTo(0, 6);
    });
  }

  it('the team stays within one unit of length along x', () => {
    for (const [cx, , , sx] of PONCHO_MODELS.poncho) {
      expect(cx - sx / 2).toBeGreaterThanOrEqual(-0.5 - 1e-9);
      expect(cx + sx / 2).toBeLessThanOrEqual(0.5 + 1e-9);
    }
  });

  it('Poncho leads the team: the furthest box toward +x belongs to the front', () => {
    const maxX = Math.max(...PONCHO_MODELS.poncho.map((b) => b[0] + b[3] / 2));
    expect(maxX).toBeGreaterThan(0.45);
  });
});

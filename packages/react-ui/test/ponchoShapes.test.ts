import { describe, expect, it } from 'vitest';
import '../src/voyage/sightingModels.ts';
import { RELIEF_ICE, type Vec3 } from '../src/voyage/lowPoly.ts';
import { loftAlongX, lowestY, rope, slab, snowMound, thinTriangle, tube } from '../src/voyage/ponchoShapes.ts';
import { inward } from './polyHelpers.ts';

describe('generic shapes of the Poncho props face outwards', () => {
  it('tube, tilted and vertical, closed at both ends', () => {
    expect(inward(tube([0, 0, 0], [0.3, 1, 0.2], 0.05, 0.03, 6, 1), [0.15, 0.5, 0.1])).toBe(0);
    expect(inward(tube([0, 0, 0], [0, 1, 0], 0.05, 0.05, 5, 1), [0, 0.5, 0])).toBe(0);
    expect(inward(tube([0, 0, 0], [1, 0, 0], 0.05, 0.05, 4, 1), [0.5, 0, 0])).toBe(0);
  });
  it('slab, whichever way its corners run', () => {
    const c: [Vec3, Vec3, Vec3, Vec3] = [[0, 0, 0], [1, 0, 0], [1, 0.5, 0.2], [0, 0.5, 0.2]];
    expect(inward(slab(c, 0.05, 1), [0.5, 0.25, 0.1])).toBe(0);
    expect(inward(slab([c[3], c[2], c[1], c[0]], 0.05, 1), [0.5, 0.25, 0.1])).toBe(0);
  });
  it('thin triangle', () => expect(inward(thinTriangle([0, 0, 0], [0.2, 0.05, 0], [0, 0.1, 0], 0.01, 1), [0.07, 0.05, 0])).toBe(0));
  it('loft along x', () => {
    const tris = loftAlongX([{ x: -1, cy: 0, ry: 0.1, rz: 0.1 }, { x: 0, cy: 0, ry: 0.3, rz: 0.3 }, { x: 1, cy: 0, ry: 0.05, rz: 0.05 }], 8, 1);
    expect(inward(tris, [0, 0, 0])).toBe(0);
  });
  it('rope is a chain of closed rods', () => {
    const tris = rope([[0, 0, 0], [1, 0, 0.1], [2, 0, 0]], 0.02, 4, 1);
    expect(tris.length).toBe(2 * 4 * 2 + 2 * 4);
  });
  it('snow mound rests on y = 0 with the color of the relief at its rim and faces up', () => {
    const tris = snowMound(0.3, -0.2, 0.5, 0.4, 0.1, 7);
    expect(lowestY(tris)).toBe(0);
    expect(tris.some((t) => t[3] === RELIEF_ICE)).toBe(true);
    expect(inward(tris, [0.3, -1, -0.2])).toBe(0);
  });
});

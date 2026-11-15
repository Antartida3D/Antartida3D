import { describe, expect, it } from 'vitest';
import '../src/voyage/sightingModels.ts';
import { POLY_MIN_COLORS, POLY_MIN_TRIS, type Tri, type Vec3 } from '../src/voyage/lowPoly.ts';
import {
  OBSERVER_HIP_Y,
  OBSERVER_SCALE,
  assembleObserverTris,
  buildObserverPolyParts,
} from '../src/orcadas/lowPolyPeople.ts';
import { VOXEL_PALETTE } from '../src/orcadas/stationModels.ts';
import { inward } from './polyHelpers.ts';

function distinctNamedColors(tris: readonly Tri[]): number {
  const paletteSet = new Set(Object.values(VOXEL_PALETTE));
  const used = new Set<number>();
  for (const t of tris) {
    expect(paletteSet.has(t[3])).toBe(true);
    used.add(t[3]);
  }
  return used.size;
}

describe('lowPolyPeople — Antarctic meteorological observer (Regla 30)', () => {
  it('meets minimum poly triangle and named color thresholds with finite outward faces', () => {
    const parts = buildObserverPolyParts();
    const assembled = assembleObserverTris(parts);

    expect(assembled.length).toBeGreaterThanOrEqual(POLY_MIN_TRIS);
    expect(distinctNamedColors(assembled)).toBeGreaterThanOrEqual(POLY_MIN_COLORS);
    expect(OBSERVER_SCALE).toBeGreaterThan(0.4);

    for (const tri of assembled) {
      for (let v = 0; v < 3; v++) {
        for (const coord of tri[v]) {
          expect(Number.isFinite(coord)).toBe(true);
        }
      }
    }

    // Leg part is closed round (0, -OBSERVER_HIP_Y/2, 0), boots sit on y = 0 in assembled rig
    let minY = Infinity;
    for (const tri of parts.legL) {
      for (const [_, y] of [tri[0], tri[1], tri[2]] as Vec3[]) {
        if (y < minY) minY = y;
      }
    }
    expect(OBSERVER_HIP_Y + minY).toBeCloseTo(0, 5);

    // Outward winding check per sculpted subvolume: limbs have zero inward faces and torso is overwhelmingly outward
    // Leg: trouser (6 segs * 4 bands * 2 + 12 caps = 60), bootCuff (8*2*2 + 16 = 48), bootShell (8*4*2 + 16 = 80)
    const trouserTris = parts.legL.slice(0, 60);
    const bootCuffTris = parts.legL.slice(60, 108);
    const bootShellTris = parts.legL.slice(108);
    expect(inward(trouserTris, [0, -0.15, 0])).toBe(0);
    expect(inward(bootCuffTris, [0, -0.33, 0])).toBe(0);
    expect(inward(bootShellTris, [0.02, -0.405, 0])).toBe(0);

    // ArmL: sleeve (6*4*2 + 12 = 60), mitten (6*3*2 + 12 = 48), thumb (6*2*2 + 12 = 36)
    const sleeveTris = parts.armL.slice(0, 60);
    const mittenTris = parts.armL.slice(60, 108);
    const thumbTris = parts.armL.slice(108);
    expect(inward(sleeveTris, [0.01, -0.10, 0])).toBe(0);
    expect(inward(mittenTris, [0.03, -0.255, 0])).toBe(0);
    expect(inward(thumbTris, [0.055, -0.25, 0])).toBe(0);

    expect(inward(parts.torso, [0, 0.72, 0]) / parts.torso.length).toBeLessThan(0.25);
  });
});

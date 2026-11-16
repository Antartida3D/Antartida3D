import { describe, expect, it } from 'vitest';
import { POLY_MIN_COLORS, POLY_MIN_TRIS, normalOf, type Tri, type Vec3 } from '../src/voyage/lowPoly.ts';
import {
  AMMONITE_APERTURE, AMMONITE_BODY_TRIS, AMMONITE_FOSSIL_TRIS, FOSSIL_POLY_MODELS, STAR_TRIS, ammoniteShell, dinosaurAtRest, dinosaurParts,
  plesiosaurParts,
} from '../src/fossils/lowPolyFossils.ts';
import { FOSSIL_PALETTE as C } from '../src/fossils/models.ts';
import { inward } from './polyHelpers.ts';

const center = (tris: readonly Tri[]): Vec3 => {
  const pts = tris.flatMap((t) => [t[0], t[1], t[2]]);
  return [0, 1, 2].map((k) => pts.reduce((s, p) => s + p[k], 0) / pts.length) as unknown as Vec3;
};
const minY = (tris: readonly Tri[]) => Math.min(...tris.flatMap((t) => [t[0][1], t[1][1], t[2][1]]));
const area = (t: Tri) => {
  const n = normalOf(t);
  return Math.hypot(...n);
};

describe('Fósiles in low-poly (#7, rule 30)', () => {
  for (const [id, tris] of Object.entries(FOSSIL_POLY_MODELS)) {
    it(`${id} has the least detail and no broken faces`, () => {
      expect(tris.length).toBeGreaterThanOrEqual(POLY_MIN_TRIS);
      expect(new Set(tris.map((t) => t[3])).size).toBeGreaterThanOrEqual(POLY_MIN_COLORS);
      expect(tris.filter((t) => area(t) === 0)).toEqual([]);
    });
  }

  it('the parts that are closed shapes have no face turned inwards', () => {
    const p = plesiosaurParts();
    const d = dinosaurParts();
    // The loft of the trunk and the pillar of the leg; plates and the foot stick out of them.
    for (const part of [STAR_TRIS, p.body, p.flipper.slice(0, 28), d.body.slice(0, 120), d.leg.slice(0, 42)]) {
      expect(inward(part, center(part))).toBe(0);
    }
  });

  it('the ammonite shell ends at the bottom, where the animal lived, and its opening is filled', () => {
    const shell = ammoniteShell(false, C.dark);
    expect(AMMONITE_APERTURE[1]).toBeCloseTo(0.09, 3);
    expect(AMMONITE_APERTURE[1]).toBeLessThan(Math.min(...shell.slice(0, shell.length / 2).map((t) => t[0][1])));
    expect(AMMONITE_FOSSIL_TRIS.some((t) => t[3] === C.dark)).toBe(true);
    // The soft body comes out of the opening forward (+x), not up.
    const soft = AMMONITE_BODY_TRIS.filter((t) => t[3] === C.ammoniteSoft).flatMap((t) => [t[0], t[1], t[2]]);
    expect(Math.max(...soft.map((v) => v[0]))).toBeGreaterThan(AMMONITE_APERTURE[0] + 0.1);
    expect(Math.max(...soft.map((v) => v[1]))).toBeLessThan(AMMONITE_APERTURE[1] + 0.1);
    expect(minY(shell)).toBeCloseTo(0, 1);
    expect(minY(shell)).toBeGreaterThan(-0.005);
  });

  it('the dinosaur stands on its feet and the sea star lies on the floor', () => {
    expect(minY(dinosaurAtRest())).toBeCloseTo(0.005, 2);
    expect(minY(STAR_TRIS)).toBeCloseTo(0, 6);
  });

  it('keep the marks of each animal: eyes, armor plates, the teeth of a marine reptile, the star eye spots', () => {
    const colors = (tris: readonly Tri[]) => new Set(tris.map((t) => t[3]));
    for (const c of [C.ink, C.armor, C.armorDark, C.beak]) expect(colors(FOSSIL_POLY_MODELS['antarctopelta-illustration']).has(c)).toBe(true);
    for (const c of [C.ink, C.tooth, C.plesioSpot]) expect(colors(FOSSIL_POLY_MODELS['plesiosaur-illustration']).has(c)).toBe(true);
    for (const c of [C.ink, C.shellStripe, C.ammoniteSoft]) expect(colors(FOSSIL_POLY_MODELS['living-ammonite']).has(c)).toBe(true);
    for (const c of [C.starPlate, C.starSpot]) expect(colors(STAR_TRIS).has(c)).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
// Break the pre-existing stationModels <-> sightingModels -> penguins import cycle in test isolation.
import '../src/voyage/sightingModels.ts';
import { PONCHO_SCENES } from '@antartida/core';
import {
  DIORAMA_CLEARANCE,
  DIORAMA_SWELL,
  buildDioramaGround,
  dioramaBlocked,
  dioramaDetails,
  dioramaEdge,
  dioramaGround,
  dioramaRadius,
} from '../src/voyage/ponchoDioramaGround.ts';

/** The most faces the ground of a diorama may have: one draw call, light on a phone. */
const MAX_GROUND_TRIS = 5000;

describe('ground of the diorama', () => {
  it('has gentle swells: the snow stays within DIORAMA_SWELL of flat', () => {
    for (let x = -8; x <= 8; x += 0.37) {
      for (let z = -8; z <= 8; z += 0.41) expect(Math.abs(dioramaGround(x, z))).toBeLessThanOrEqual(DIORAMA_SWELL + 1e-9);
    }
  });

  it('has an irregular edge that never closes in on the scene', () => {
    const r = 6;
    const radii = Array.from({ length: 72 }, (_, i) => dioramaEdge(r, (i / 72) * Math.PI * 2));
    expect(Math.min(...radii)).toBeGreaterThan(r * 0.8);
    expect(Math.max(...radii)).toBeLessThan(r * 1.2);
    expect(new Set(radii.map((v) => v.toFixed(3))).size).toBeGreaterThan(20);
  });

  for (const [id, scene] of Object.entries(PONCHO_SCENES)) {
    describe(id, () => {
      const radius = dioramaRadius(scene);

      it('keeps every element and path on the snow, well inside the edge', () => {
        const spots = [...scene.elements.map((e) => [e.x, e.z] as const), ...scene.paths.flatMap((p) => [p.from, p.to])];
        for (const [x, z] of spots) expect(Math.hypot(x, z)).toBeLessThan(dioramaEdge(radius, Math.atan2(z, x)) * 0.8);
      });

      it('builds finite faces with resolved colors, within the budget, and the same every time', () => {
        const a = buildDioramaGround(scene);
        const b = buildDioramaGround(scene);
        expect(a.tris.length).toBeGreaterThan(300);
        expect(a.tris.length).toBeLessThanOrEqual(MAX_GROUND_TRIS);
        for (const t of a.tris) {
          expect(t.slice(0, 3).flat().every(Number.isFinite)).toBe(true);
          // A relief marker left (negative) would break the geometry.
          expect(t[3]).toBeGreaterThanOrEqual(0);
        }
        expect(b.tris).toEqual(a.tris);
      });

      it('has pebbles, rocks and drifts scattered, and leaves clear what the scene shows', () => {
        const details = dioramaDetails(scene, radius, 1);
        expect(details.length).toBeGreaterThan(200);
        for (const t of details) {
          for (const v of t.slice(0, 3) as readonly (readonly [number, number, number])[]) {
            expect(v.every(Number.isFinite)).toBe(true);
            for (const e of scene.elements) {
              // A rock may lean on the edge of the clearance, never sit under the thing.
              expect(Math.hypot(v[0] - e.x, v[2] - e.z), `${e.kind} ${e.id}`).toBeGreaterThan(DIORAMA_CLEARANCE[e.kind] * (e.scale ?? 1) * 0.4);
            }
          }
        }
      });

      it('reports a place on an element as blocked and a free one as open', () => {
        const e = scene.elements[0];
        expect(dioramaBlocked(scene, e.x, e.z)).toBe(true);
        expect(dioramaBlocked(scene, 40, 40)).toBe(false);
      });
    });
  }
});

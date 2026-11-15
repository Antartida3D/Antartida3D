import { describe, expect, it } from 'vitest';
// Break the pre-existing stationModels <-> sightingModels -> penguins import cycle in test isolation.
import '../src/voyage/sightingModels.ts';
import { MARAMBIO_ELEMENTS, MARAMBIO_POINT, MARAMBIO_RUNWAY_BEARING_DEG, project, unproject } from '@antartida/core';
import { normalOf, POLY_MIN_COLORS, POLY_MIN_TRIS, RELIEF_ICE, RELIEF_ROCK, resolveRelief, type Tri } from '../src/voyage/lowPoly.ts';
import {
  MARAMBIO_SITE_FLAT_RADIUS,
  MARAMBIO_SITE_HEADING,
  MARAMBIO_SITE_PARTS,
  MARAMBIO_SITE_PLATEAU_Y,
  MARAMBIO_SITE_POLY,
  marambioSiteXZ,
  onMarambioSiteFlat,
} from '../src/voyage/marambioSiteModel.ts';
import { buildMarambioSiteGeometry } from '../src/map3d/MarambioSite.tsx';
import { inward } from './polyHelpers.ts';

function bboxOf(tris: readonly Tri[]) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const t of tris) {
    for (const p of [t[0], t[1], t[2]]) {
      for (let k = 0; k < 3; k++) {
        min[k] = Math.min(min[k], p[k]);
        max[k] = Math.max(max[k], p[k]);
      }
    }
  }
  return { min, max, center: [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2] as const };
}

const built = (({ ground: _ground, ...rest }) => rest)(MARAMBIO_SITE_PARTS);

describe('Base Marambio maqueta on the map', () => {
  it('has the least detail of a low-poly model, within a budget for one map draw', () => {
    expect(MARAMBIO_SITE_POLY.length).toBeGreaterThanOrEqual(POLY_MIN_TRIS);
    expect(MARAMBIO_SITE_POLY.length).toBeLessThanOrEqual(9000);
    expect(new Set(resolveRelief(MARAMBIO_SITE_POLY).map((t) => t[3])).size).toBeGreaterThanOrEqual(POLY_MIN_COLORS);
    for (const t of MARAMBIO_SITE_POLY) expect([t[0], t[1], t[2]].flat().every(Number.isFinite)).toBe(true);
  });

  it('is about one map model wide, stands on y = 0 and stays low', () => {
    const box = bboxOf(MARAMBIO_SITE_POLY);
    expect(box.max[0] - box.min[0]).toBeGreaterThan(0.8);
    expect(box.max[0] - box.min[0]).toBeLessThan(1.5);
    expect(box.min[1]).toBeCloseTo(0, 5);
    expect(box.max[1]).toBeLessThan(0.5);
  });

  it('draws its ground in the colours of the relief, every face looking up', () => {
    const colours = new Set(MARAMBIO_SITE_PARTS.ground.map((t) => t[3]));
    expect(colours.has(RELIEF_ROCK)).toBe(true);
    expect(colours.has(RELIEF_ICE)).toBe(true);
    for (const t of MARAMBIO_SITE_PARTS.ground) expect(normalOf(t)[1]).toBeGreaterThan(0);
  });

  it('keeps each part facing out and few faces looking down', () => {
    for (const [name, part] of Object.entries(MARAMBIO_SITE_PARTS)) {
      const { center } = bboxOf(part);
      expect(inward(part, [center[0], center[1], center[2]]) / part.length, name).toBeLessThan(0.5);
    }
    const down = MARAMBIO_SITE_POLY.filter((t) => normalOf(t)[1] < -0.9).length;
    expect(down / MARAMBIO_SITE_POLY.length).toBeLessThan(0.25);
  });

  it('stands everything built on the flat top of the plateau, not under it', () => {
    for (const [name, part] of Object.entries(built)) {
      for (const t of part) {
        for (const p of [t[0], t[1], t[2]]) {
          expect(onMarambioSiteFlat(p[0], p[2]), `${name} at ${p[0].toFixed(3)}, ${p[2].toFixed(3)}`).toBe(true);
          expect(p[1], name).toBeGreaterThanOrEqual(MARAMBIO_SITE_PLATEAU_Y - 0.01);
        }
      }
    }
  });

  it('is flattened on the map out to the corners of the plateau top', () => {
    for (const [name, part] of Object.entries(built)) {
      for (const t of part) for (const p of [t[0], t[1], t[2]]) expect(Math.hypot(p[0], p[2]), name).toBeLessThanOrEqual(MARAMBIO_SITE_FLAT_RADIUS);
    }
  });

  it('keeps the order of the diorama: runway on one side, the base on the other, the row to the east', () => {
    const runwayZ = bboxOf(MARAMBIO_SITE_PARTS.runway).center[2];
    for (const e of MARAMBIO_ELEMENTS) {
      if (e.kind === 'runway') continue;
      expect(marambioSiteXZ(e.id)[1], e.id).toBeGreaterThan(runwayZ);
    }
    expect(marambioSiteXZ('sanidad')[0]).toBeGreaterThan(marambioSiteXZ('hangar')[0]);
    expect(marambioSiteXZ('hangar')[1]).toBeGreaterThan(marambioSiteXZ('apron')[1]);
  });

  it('sits on the map with its runway along the bearing of the real one, the base to the south-east', () => {
    const { lon, lat } = unproject(MARAMBIO_POINT.x, MARAMBIO_POINT.y);
    const direction = (bearingDeg: number) => {
      const b = (bearingDeg * Math.PI) / 180;
      const p = project(lon, lat);
      const q = project(lon + (Math.sin(b) * 1e-3) / Math.cos((lat * Math.PI) / 180), lat + Math.cos(b) * 1e-3);
      const l = Math.hypot(q.x - p.x, q.y - p.y);
      return [(q.x - p.x) / l, (q.y - p.y) / l];
    };
    // SiteOnRelief turns local +x to world (cos, -sin) and local +z to world (sin, cos).
    const h = MARAMBIO_SITE_HEADING;
    const along = direction(MARAMBIO_RUNWAY_BEARING_DEG);
    const across = direction(MARAMBIO_RUNWAY_BEARING_DEG + 90);
    expect(Math.cos(h) * along[0] - Math.sin(h) * along[1]).toBeGreaterThan(0.999);
    expect(Math.sin(h) * across[0] + Math.cos(h) * across[1]).toBeGreaterThan(0.999);
  });

  it('carries the parked C-130 on the apron and builds one geometry', () => {
    const plane = bboxOf(MARAMBIO_SITE_PARTS.hercules);
    const apron = bboxOf(MARAMBIO_SITE_PARTS.apron.slice(-12));
    expect(plane.center[0]).toBeGreaterThan(apron.min[0]);
    expect(plane.center[0]).toBeLessThan(apron.max[0]);
    expect(plane.center[2]).toBeGreaterThan(apron.min[2]);
    expect(plane.center[2]).toBeLessThan(apron.max[2]);
    const geometry = buildMarambioSiteGeometry();
    expect(geometry.getAttribute('position').count).toBe(MARAMBIO_SITE_POLY.length * 3);
    geometry.dispose();
  });
});

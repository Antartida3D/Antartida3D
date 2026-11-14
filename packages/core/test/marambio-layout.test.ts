import { describe, expect, it } from 'vitest';
import {
  MARAMBIO_ELEMENTS,
  MARAMBIO_GROUND_Y,
  MARAMBIO_HERCULES,
  MARAMBIO_LAYOUT,
  MARAMBIO_RUNWAY_HALF_LENGTH,
  MARAMBIO_RUNWAY_WIDTH,
  MARAMBIO_RUNWAY_Z,
  MARAMBIO_TAXIWAY,
  DIORAMA_METERS_PER_UNIT,
  HERCULES_LENGTH_M,
  footprintCorners,
  marambioCorners,
  marambioElement,
  marambioLayoutOf,
  marambioPlateauDistance,
} from '../src/index.ts';

type Quad = [number, number][];

/** Gap between two convex plans (negative when they overlap), by the separating axis test. */
function gap(a: Quad, b: Quad): number {
  let best = -Infinity;
  for (const poly of [a, b]) {
    for (let i = 0; i < poly.length; i++) {
      const [x0, z0] = poly[i];
      const [x1, z1] = poly[(i + 1) % poly.length];
      const l = Math.hypot(x1 - x0, z1 - z0);
      const n = [(z1 - z0) / l, -(x1 - x0) / l];
      const pa = a.map(([x, z]) => x * n[0] + z * n[1]);
      const pb = b.map(([x, z]) => x * n[0] + z * n[1]);
      best = Math.max(best, Math.min(...pb) - Math.max(...pa), Math.min(...pa) - Math.max(...pb));
    }
  }
  return best;
}

const standing = MARAMBIO_ELEMENTS.filter((e) => e.kind !== 'runway' && e.kind !== 'apron');

describe('Marambio site', () => {
  it('gives every element its OpenStreetMap object and a source', () => {
    for (const e of MARAMBIO_ELEMENTS) {
      expect(e.osm, e.id).toMatch(/^(way|node) \d+$/);
      expect(e.source, e.id).toContain('OpenStreetMap');
      expect(e.footprint[0], e.id).toBeGreaterThanOrEqual(e.footprint[1]);
    }
    expect(new Set(MARAMBIO_ELEMENTS.map((e) => e.id)).size).toBe(MARAMBIO_ELEMENTS.length);
  });

  it('keeps the whole base on the south-east side of the runway', () => {
    for (const e of standing) expect(e.center[1], e.id).toBeGreaterThan(40);
  });

  it('marks as estimated what OpenStreetMap does not map', () => {
    expect(marambioElement('terminal').confidence).toBe('estimado');
    expect(marambioElement('commTower').confidence).toBe('estimado');
    expect(marambioElement('hangar').confidence).toBe('medido');
  });
});

describe('Marambio stage', () => {
  it('places every element of the site', () => {
    expect(MARAMBIO_LAYOUT.map((e) => e.id)).toEqual(MARAMBIO_ELEMENTS.map((e) => e.id));
    for (const e of MARAMBIO_LAYOUT) expect(e.position[1]).toBe(MARAMBIO_GROUND_Y);
  });

  it('keeps the measured plan of each building at the scale of the diorama', () => {
    for (const e of standing) {
      const { footprint } = marambioLayoutOf(e.id);
      expect(footprint[0] * DIORAMA_METERS_PER_UNIT, e.id).toBeCloseTo(e.footprint[0], 6);
      expect(footprint[1] * DIORAMA_METERS_PER_UNIT, e.id).toBeCloseTo(e.footprint[1], 6);
    }
  });

  it('keeps buildings apart from each other, off the runway and off the apron', () => {
    const runway = marambioCorners('runway');
    const apron = marambioCorners('apron');
    for (let i = 0; i < standing.length; i++) {
      const a = marambioCorners(standing[i].id);
      expect(gap(a, runway), `${standing[i].id} / runway`).toBeGreaterThan(0.3);
      expect(gap(a, apron), `${standing[i].id} / apron`).toBeGreaterThan(0.3);
      for (let j = i + 1; j < standing.length; j++) {
        expect(gap(a, marambioCorners(standing[j].id)), `${standing[i].id} / ${standing[j].id}`).toBeGreaterThan(0.5);
      }
    }
  });

  it('keeps the real order: stores and terminal by the runway, apron and hangar farther, the row to the east', () => {
    const z = (id: string) => marambioLayoutOf(id).position[2];
    const x = (id: string) => marambioLayoutOf(id).position[0];
    for (const near of ['terminal', 'jp1', 'abastecimiento', 'deposito', 'commTower']) {
      expect(z(near)).toBeGreaterThan(MARAMBIO_RUNWAY_Z + MARAMBIO_RUNWAY_WIDTH / 2);
      expect(z(near)).toBeLessThan(z('apron'));
    }
    expect(z('hangar')).toBeGreaterThan(z('apron'));
    expect(x('hangar')).toBeGreaterThan(x('apron'));
    expect(x('sanidad')).toBeGreaterThan(x('hangar'));
    for (const [a, b] of [['sanidad', 'jefatura'], ['jefatura', 'palermo'], ['palermo', 'comedor']]) expect(x(b)).toBeGreaterThan(x(a));
    expect(x('usina')).toBeLessThan(x('obrador'));
    expect(x('obrador')).toBeLessThan(x('hangar'));
  });

  it('opens the hangar towards the apron', () => {
    const hangar = marambioLayoutOf('hangar');
    const apron = marambioLayoutOf('apron');
    const door = [Math.cos(hangar.rotationY), -Math.sin(hangar.rotationY)];
    const toApron = [apron.position[0] - hangar.position[0], apron.position[2] - hangar.position[2]];
    const l = Math.hypot(toApron[0], toApron[1]);
    expect((door[0] * toApron[0] + door[1] * toApron[1]) / l).toBeGreaterThan(0.95);
  });

  it('turns the door end of every module of the row towards the hangar side', () => {
    const hangar = marambioLayoutOf('hangar');
    const row = ['sanidad', 'jefatura', 'palermo', 'comedor'].map(marambioLayoutOf);
    for (const e of row) expect(e.rotationY, e.id).toBeCloseTo(row[0].rotationY, 9);
    // The door of a module is at its +x end.
    const { position, footprint, rotationY } = row[0];
    const end = (side: number) => [
      position[0] + (side * Math.cos(rotationY) * footprint[0]) / 2,
      position[2] - (side * Math.sin(rotationY) * footprint[0]) / 2,
    ];
    const toHangar = ([x, z]: number[]) => Math.hypot(x - hangar.position[0], z - hangar.position[2]);
    expect(toHangar(end(1))).toBeLessThan(toHangar(end(-1)) - 1);
  });

  it('parks the C-130 inside the apron, clear of the hangar', () => {
    const length = HERCULES_LENGTH_M / DIORAMA_METERS_PER_UNIT;
    const { position, rotationY } = MARAMBIO_HERCULES;
    // Plan of the aircraft: its length by its span (40.4 m).
    const plane = footprintCorners(position[0], position[2], length, 40.4 / DIORAMA_METERS_PER_UNIT, rotationY);
    expect(gap(plane, marambioCorners('hangar'))).toBeGreaterThan(1);
    const apron = marambioLayoutOf('apron');
    const c = Math.cos(apron.rotationY);
    const s = Math.sin(apron.rotationY);
    for (const [px, pz] of plane) {
      const dx = px - apron.position[0];
      const dz = pz - apron.position[2];
      expect(Math.abs(dx * c - dz * s)).toBeLessThanOrEqual(apron.footprint[0] / 2 + 0.6);
      expect(Math.abs(dx * s + dz * c)).toBeLessThanOrEqual(apron.footprint[1] / 2 + 0.6);
    }
  });

  it('stands everything on the plateau, well inside its rim', () => {
    for (const e of MARAMBIO_ELEMENTS.filter((s) => s.kind !== 'runway')) {
      for (const [x, z] of marambioCorners(e.id)) expect(marambioPlateauDistance(x, z), e.id).toBeGreaterThan(2);
    }
    for (const x of [-MARAMBIO_RUNWAY_HALF_LENGTH, MARAMBIO_RUNWAY_HALF_LENGTH]) {
      for (const dz of [-1, 1]) expect(marambioPlateauDistance(x, MARAMBIO_RUNWAY_Z + (dz * MARAMBIO_RUNWAY_WIDTH) / 2)).toBeGreaterThan(1);
    }
    for (const [x, z] of MARAMBIO_TAXIWAY) expect(marambioPlateauDistance(x, z)).toBeGreaterThan(2);
    expect(marambioPlateauDistance(80, 0)).toBeLessThan(0);
    expect(marambioPlateauDistance(0, 60)).toBeLessThan(0);
  });
});

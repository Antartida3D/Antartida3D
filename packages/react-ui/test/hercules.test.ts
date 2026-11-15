import { describe, expect, it } from 'vitest';
import { POLY_MIN_COLORS, POLY_MIN_TRIS, type Tri, type Vec3 } from '../src/voyage/lowPoly.ts';
import { HERCULES_FLIGHT_POLY, HERCULES_PARKED_POLY, HERCULES_SPAN } from '../src/voyage/herculesModel.ts';
import { buildVehicleGeometry, VEHICLE_POLY_MODELS } from '../src/voyage/vehicles.ts';
import { inward } from './polyHelpers.ts';

// The livery approved in issue #103: the values the block model had.
const CAMO_GREEN = 0x55603f;
const CAMO_SAND = 0xa7845f;
const BELLY_GREY = 0xaab2b4;
const PLANE_DARK = 0x6f787e;
const BLACK = 0x1f2a36;
const FLAG_SKY = 0x7fb6dc;
const FLAG_WHITE = 0xf7fafb;
const LIVERY = [CAMO_GREEN, CAMO_SAND, BELLY_GREY, PLANE_DARK, BLACK, FLAG_SKY, FLAG_WHITE];

const MIN_TRIS = 600;
const MAX_TRIS = 2600;

const cornersOf = ([a, b, c]: Tri): Vec3[] => [a, b, c];
const corners = (tris: readonly Tri[]): Vec3[] => tris.flatMap(cornersOf);

function bbox(tris: readonly Tri[]) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const p of corners(tris)) {
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], p[k]);
      max[k] = Math.max(max[k], p[k]);
    }
  }
  return { min, max };
}

// Adding 0 turns -0 into 0, so a corner on the plane of symmetry has one key.
const key = (p: Vec3) => p.map((v) => Math.round(v * 1e6) + 0).join(',');
const faceKey = (t: Tri) => cornersOf(t).map(key).join('|') + '#' + t[3];

/** The faces grouped by the solids they make: faces that share a corner belong together. */
function solids(tris: readonly Tri[]): Tri[][] {
  const parent = new Map<string, string>();
  const find = (k: string): string => {
    let root = k;
    while (parent.get(root) !== root) root = parent.get(root)!;
    parent.set(k, root);
    return root;
  };
  for (const [a, b, c] of tris) {
    for (const k of [key(a), key(b), key(c)]) if (!parent.has(k)) parent.set(k, k);
    parent.set(find(key(b)), find(key(a)));
    parent.set(find(key(c)), find(key(a)));
  }
  const groups = new Map<string, Tri[]>();
  for (const t of tris) {
    const root = find(key(t[0]));
    groups.set(root, [...(groups.get(root) ?? []), t]);
  }
  return [...groups.values()];
}

/** Volume enclosed by the faces, positive when they are wound counter-clockwise seen from outside. */
const signedVolume = (tris: readonly Tri[]) =>
  tris.reduce((sum, [a, b, c]) => sum + (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6, 0);

/** Edges with no face on the other side, and edges two faces run along in the same direction. */
function edgeFaults(tris: readonly Tri[]) {
  const edges = new Map<string, number>();
  for (const [a, b, c] of tris) {
    for (const [p, q] of [[a, b], [b, c], [c, a]]) {
      const e = key(p) + '>' + key(q);
      edges.set(e, (edges.get(e) ?? 0) + 1);
    }
  }
  let open = 0;
  let repeated = 0;
  for (const [e, n] of edges) {
    if (n > 1) repeated++;
    const [p, q] = e.split('>');
    if (!edges.has(q + '>' + p)) open++;
  }
  return { open, repeated };
}

const VARIANTS: readonly (readonly [string, readonly Tri[]])[] = [
  ['flight', HERCULES_FLIGHT_POLY],
  ['parked', HERCULES_PARKED_POLY],
];

describe('low-poly C-130 Hercules (rule 30)', () => {
  for (const [name, tris] of VARIANTS) {
    describe(name, () => {
      it('has the least detail and stays within the triangle budget', () => {
        expect(tris.length).toBeGreaterThanOrEqual(POLY_MIN_TRIS);
        expect(new Set(tris.map((t) => t[3])).size).toBeGreaterThanOrEqual(POLY_MIN_COLORS);
        expect(tris.length).toBeGreaterThanOrEqual(MIN_TRIS);
        expect(tris.length).toBeLessThanOrEqual(MAX_TRIS);
      });

      it('has finite corners and solid colors', () => {
        expect(corners(tris).flat().every(Number.isFinite)).toBe(true);
        for (const t of tris) expect(Number.isInteger(t[3]) && t[3] >= 0 && t[3] <= 0xffffff).toBe(true);
      });

      it('faces outwards', () => {
        const { min, max } = bbox(tris);
        const center: Vec3 = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
        // Not convex: the inner sides of nacelles, sponsons and wheels look at the middle.
        expect(inward(tris, center) / tris.length).toBeLessThan(0.4);
      });

      it('is made of closed solids wound counter-clockwise from outside', () => {
        for (const solid of solids(tris)) {
          expect(edgeFaults(solid)).toEqual({ open: 0, repeated: 0 });
          expect(signedVolume(solid)).toBeGreaterThan(0);
        }
      });

      it('is one unit long, with the wing wider than the aircraft is long', () => {
        const { min, max } = bbox(tris);
        expect(max[0] - min[0]).toBeCloseTo(1, 2);
        expect((min[0] + max[0]) / 2).toBeCloseTo(0, 2);
        const span = max[2] - min[2];
        expect(span).toBeGreaterThanOrEqual(1.25);
        expect(span).toBeLessThanOrEqual(1.45);
        expect(span).toBeCloseTo(HERCULES_SPAN, 6);
        // A tall fin: the aircraft stands between a quarter and a half of its length high.
        expect(max[1] - min[1]).toBeGreaterThan(0.25);
        expect(max[1] - min[1]).toBeLessThan(0.5);
      });

      it('is the same shape on both sides', () => {
        const all = new Set(corners(tris).map(key));
        for (const [x, y, z] of corners(tris)) expect(all.has(key([x, y, -z]))).toBe(true);
        const { min, max } = bbox(tris);
        expect(min[2]).toBeCloseTo(-max[2], 9);
      });

      it('wears the livery: camouflage, grey belly, dark engines, black radome and the flag', () => {
        const colors = new Set(tris.map((t) => t[3]));
        for (const color of LIVERY) expect(colors.has(color)).toBe(true);
        expect([...colors].every((c) => LIVERY.includes(c))).toBe(true);
        // The nose ends in the black radome.
        const { max } = bbox(tris);
        const nose = tris.filter((t) => cornersOf(t).some((p) => p[0] > max[0] - 1e-6));
        expect(nose.length).toBeGreaterThan(0);
        expect(nose.every((t) => t[3] === BLACK)).toBe(true);
        // The flag is high on the fin, at the tail, on both of its sides.
        const flag = tris.filter((t) => t[3] === FLAG_SKY || t[3] === FLAG_WHITE);
        expect(flag.every((t) => cornersOf(t).every((p) => p[0] < -0.3 && p[1] > max[1] - 0.12))).toBe(true);
        expect(flag.some(([a, b, c]) => a[2] + b[2] + c[2] > 0)).toBe(true);
        expect(flag.some(([a, b, c]) => a[2] + b[2] + c[2] < 0)).toBe(true);
      });
    });
  }

  it('flies with its fuselage axis on y = 0 and its middle on the origin', () => {
    const { min, max } = bbox(HERCULES_FLIGHT_POLY);
    expect(min[0]).toBeCloseTo(-0.5, 2);
    expect(max[0]).toBeCloseTo(0.5, 2);
    // The belly is under the axis, the wing and the fin above it.
    expect(min[1]).toBeLessThan(-0.05);
    expect(min[1]).toBeGreaterThan(-0.1);
    expect(max[1]).toBeGreaterThan(0.2);
  });

  it('stands on its wheels on y = 0 when parked', () => {
    const { min } = bbox(HERCULES_PARKED_POLY);
    expect(Math.abs(min[1])).toBeLessThanOrEqual(1e-6);
    const lowest = HERCULES_PARKED_POLY.filter((t) => cornersOf(t).some((p) => p[1] < 1e-6));
    expect(lowest.length).toBeGreaterThan(0);
    expect(lowest.every((t) => t[3] === BLACK)).toBe(true);
    // The nose gear and a main gear on each side touch the ground.
    const touching = corners(lowest).filter((p) => p[1] < 1e-6);
    expect(touching.some((p) => p[0] > 0.25)).toBe(true);
    expect(touching.some((p) => p[0] < 0.15 && p[2] > 0.05)).toBe(true);
    expect(touching.some((p) => p[0] < 0.15 && p[2] < -0.05)).toBe(true);
  });

  it('has wheels only when parked: the same airframe, raised, plus the gear', () => {
    const raise = bbox(HERCULES_PARKED_POLY).max[1] - bbox(HERCULES_FLIGHT_POLY).max[1];
    const flight = new Set(HERCULES_FLIGHT_POLY.map(faceKey));
    const lowered = HERCULES_PARKED_POLY.map((t): Tri => [[t[0][0], t[0][1] - raise, t[0][2]], [t[1][0], t[1][1] - raise, t[1][2]], [t[2][0], t[2][1] - raise, t[2][2]], t[3]]);
    const gear = lowered.filter((t) => !flight.has(faceKey(t)));
    expect(HERCULES_PARKED_POLY.length - gear.length).toBe(HERCULES_FLIGHT_POLY.length);
    expect(gear.length).toBeGreaterThan(0);
    expect(gear.every((t) => t[3] === BLACK)).toBe(true);
    // Nothing of the flight model reaches as low as the wheels.
    expect(bbox(gear).min[1]).toBeLessThan(bbox(HERCULES_FLIGHT_POLY).min[1] - 0.01);
  });

  it('is the vehicle of the voyage: one geometry with every face', () => {
    expect(VEHICLE_POLY_MODELS.hercules).toBe(HERCULES_FLIGHT_POLY);
    const geometry = buildVehicleGeometry('hercules');
    expect(geometry.getAttribute('position').count).toBe(HERCULES_FLIGHT_POLY.length * 3);
    expect(geometry.getAttribute('color').count).toBe(HERCULES_FLIGHT_POLY.length * 3);
    geometry.dispose();
  });
});

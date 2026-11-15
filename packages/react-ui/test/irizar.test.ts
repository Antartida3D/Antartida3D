import { describe, expect, it } from 'vitest';
import { IRIZAR_DECK_AFT, IRIZAR_DECK_TOP, IRIZAR_HALF_BEAM, SHIP_DRAFT, ZODIAC_LAUNCH_ALONG, ZODIAC_LAUNCH_HEIGHT, ZODIAC_LAUNCH_SIDE } from '@antartida/core';
import { normalOf, POLY_MIN_COLORS, POLY_MIN_TRIS, type Tri, type Vec3 } from '../src/voyage/lowPoly.ts';
import { BLACK, CREAM, DECK, HULL_RED, IRIZAR_POLY, LIFEBOAT } from '../src/voyage/irizarModel.ts';
import { buildVehicleGeometry, VEHICLE_MODELS, VEHICLE_POLY_MODELS } from '../src/voyage/vehicles.ts';
import { inward } from './polyHelpers.ts';

const LIVERY = [HULL_RED, CREAM, BLACK, DECK, LIFEBOAT];
const MIN_TRIS = 400;
const MAX_TRIS = 1600;

const cornersOf = ([a, b, c]: Tri): Vec3[] => [a, b, c];
const corners = (tris: readonly Tri[]): Vec3[] => tris.flatMap(cornersOf);
const middle = ([a, b, c]: Tri): Vec3 => [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];

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

const key = (p: Vec3) => p.map((v) => Math.round(v * 1e6) + 0).join(',');

/** Volume enclosed by the faces, positive when they are wound counter-clockwise seen from outside. */
const signedVolume = (tris: readonly Tri[]) =>
  tris.reduce((sum, [a, b, c]) => sum + (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6, 0);

/** Highest face over (x, z) that looks up: what a helicopter landing there would touch. */
function surfaceAt(x: number, z: number): Tri | undefined {
  const inside = ([a, b, c]: Tri) => {
    const s = (p: Vec3, q: Vec3) => (q[0] - p[0]) * (z - p[2]) - (q[2] - p[2]) * (x - p[0]);
    const d1 = s(a, b);
    const d2 = s(b, c);
    const d3 = s(c, a);
    return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
  };
  return IRIZAR_POLY.filter((t) => normalOf(t)[1] > 0.99 && inside(t)).sort((p, q) => middle(q)[1] - middle(p)[1])[0];
}

describe('low-poly ARA Almirante Irízar (rule 30)', () => {
  it('has the least detail and stays within the triangle budget', () => {
    expect(IRIZAR_POLY.length).toBeGreaterThanOrEqual(POLY_MIN_TRIS);
    expect(new Set(IRIZAR_POLY.map((t) => t[3])).size).toBeGreaterThanOrEqual(POLY_MIN_COLORS);
    expect(IRIZAR_POLY.length).toBeGreaterThanOrEqual(MIN_TRIS);
    expect(IRIZAR_POLY.length).toBeLessThanOrEqual(MAX_TRIS);
  });

  it('has finite corners, solid colors and no degenerate faces', () => {
    expect(corners(IRIZAR_POLY).flat().every(Number.isFinite)).toBe(true);
    for (const t of IRIZAR_POLY) {
      expect(Number.isInteger(t[3]) && t[3] >= 0 && t[3] <= 0xffffff).toBe(true);
      expect(Math.hypot(...normalOf(t))).toBeCloseTo(1, 6);
    }
  });

  it('faces outwards', () => {
    // Not convex: the inner sides of lifeboats and cranes and the undersides of the tiers look at the middle.
    expect(inward(IRIZAR_POLY, [0, 0.08, 0]) / IRIZAR_POLY.length).toBeLessThan(0.4);
    expect(signedVolume(IRIZAR_POLY)).toBeGreaterThan(0);
  });

  it('is made of closed parts, but for the helipad paint laid on the deck', () => {
    const paint = (t: Tri) => t[3] === CREAM && cornersOf(t).every((p) => Math.abs(p[1] - IRIZAR_DECK_TOP) < 0.001 && p[1] > IRIZAR_DECK_TOP);
    const edges = new Set<string>();
    const solid = IRIZAR_POLY.filter((t) => !paint(t));
    for (const [a, b, c] of solid) for (const [p, q] of [[a, b], [b, c], [c, a]]) edges.add(key(p) + '>' + key(q));
    const open = [...edges].filter((e) => !edges.has(e.split('>').reverse().join('>')));
    expect(open).toEqual([]);
    expect(IRIZAR_POLY.length - solid.length).toBeGreaterThan(0);
  });

  it('is one unit long, bow to +x, with its keel on y = 0', () => {
    const { min, max } = bbox(IRIZAR_POLY);
    expect(min[0]).toBeCloseTo(-0.5, 6);
    expect(max[0]).toBeCloseTo(0.5, 6);
    expect(Math.abs(min[1])).toBeLessThanOrEqual(1e-9);
    // The bow, not the stern, is the sharp end: the hull is narrow at +x and broad at -x.
    const width = (x: number) => Math.max(...corners(IRIZAR_POLY).filter((p) => Math.abs(p[0] - x) < 1e-6).map((p) => Math.abs(p[2])));
    expect(width(0.5)).toBeLessThan(0.04);
    expect(width(-0.5)).toBeGreaterThan(0.08);
    // The mast is the highest point, a bit under a third of the length.
    expect(max[1]).toBeGreaterThan(0.25);
    expect(max[1]).toBeLessThan(0.35);
  });

  it('has an icebreaker bow: the forefoot rises in a long slope from the keel to the stem', () => {
    const keelAt = (x: number) => Math.min(...corners(IRIZAR_POLY).filter((p) => Math.abs(p[0] - x) < 1e-6 && Math.abs(p[2]) < 0.06).map((p) => p[1]));
    expect(keelAt(0.27)).toBeCloseTo(0, 6);
    expect(keelAt(0.35)).toBeGreaterThan(0);
    expect(keelAt(0.42)).toBeGreaterThan(keelAt(0.35));
    // The stem foot is out of the water: the forefoot is what climbs onto the ice.
    expect(keelAt(0.5)).toBeGreaterThan(SHIP_DRAFT);
  });

  it('is no wider than IRIZAR_HALF_BEAM, lifeboats included, and the same on both sides', () => {
    const { min, max } = bbox(IRIZAR_POLY);
    expect(max[2]).toBeLessThanOrEqual(IRIZAR_HALF_BEAM + 1e-9);
    expect(min[2]).toBeCloseTo(-max[2], 9);
    expect(max[2]).toBeGreaterThan(IRIZAR_HALF_BEAM - 0.005);
    const all = new Set(corners(IRIZAR_POLY).map(key));
    for (const [x, y, z] of corners(IRIZAR_POLY)) expect(all.has(key([x, y, -z]))).toBe(true);
    // The widest points are the lifeboats.
    const widest = IRIZAR_POLY.filter((t) => cornersOf(t).some((p) => Math.abs(p[2]) > max[2] - 1e-6));
    expect(widest.every((t) => t[3] === LIFEBOAT)).toBe(true);
  });

  it('has the flight deck where the Sea King lands: IRIZAR_DECK_TOP high round IRIZAR_DECK_AFT aft', () => {
    for (const [dx, dz] of [[0, 0], [0.07, 0], [-0.07, 0], [0, 0.06], [0, -0.06], [0.1, 0.08], [-0.12, -0.08]]) {
      const face = surfaceAt(-IRIZAR_DECK_AFT + dx, dz);
      expect(face, `deck at ${dx}, ${dz}`).toBeDefined();
      // The deck, or the helipad paint just over it.
      expect(middle(face!)[1]).toBeGreaterThanOrEqual(IRIZAR_DECK_TOP - 1e-9);
      expect(middle(face!)[1]).toBeLessThan(IRIZAR_DECK_TOP + 0.001);
      expect([DECK, CREAM]).toContain(face![3]);
    }
    // Nothing stands on the flight deck: the helicopter takes off from it clear of the hangar.
    const over = IRIZAR_POLY.filter((t) => cornersOf(t).some((p) => Math.abs(p[0] + IRIZAR_DECK_AFT) < 0.12 && Math.abs(p[2]) < 0.09 && p[1] > IRIZAR_DECK_TOP + 0.001));
    expect(over).toEqual([]);
  });

  it('leaves the waist clear where the Zodiac is lowered, outside the hull', () => {
    expect(ZODIAC_LAUNCH_SIDE).toBeGreaterThan(IRIZAR_HALF_BEAM);
    const near = IRIZAR_POLY.filter((t) => cornersOf(t).some((p) => Math.abs(p[0] - ZODIAC_LAUNCH_ALONG) < 0.05 && p[2] > IRIZAR_HALF_BEAM + 1e-9 && p[1] > ZODIAC_LAUNCH_HEIGHT - 0.05));
    expect(near).toEqual([]);
  });

  it('wears the livery: red hull, cream superstructure, dark bridge windows, red funnel with a black top', () => {
    const colors = new Set(IRIZAR_POLY.map((t) => t[3]));
    for (const color of LIVERY) expect(colors.has(color)).toBe(true);
    expect([...colors].every((c) => LIVERY.includes(c))).toBe(true);
    // The hull sides under the main deck are red.
    const sides = IRIZAR_POLY.filter((t) => middle(t)[1] < 0.07 && Math.abs(normalOf(t)[2]) > 0.7);
    expect(sides.length).toBeGreaterThan(0);
    expect(sides.every((t) => t[3] === HULL_RED)).toBe(true);
    // The bridge windows look forward, high on the superstructure.
    const glass = IRIZAR_POLY.filter((t) => t[3] === BLACK && normalOf(t)[0] > 0.7 && middle(t)[1] > 0.18);
    expect(glass.length).toBeGreaterThan(0);
    // The funnel: red up to a black top, behind the bridge and ahead of the hangar.
    const funnelTop = IRIZAR_POLY.filter((t) => t[3] === BLACK && middle(t)[1] > 0.24 && middle(t)[1] < 0.26 && Math.abs(middle(t)[0] - 0.04) < 0.05);
    expect(funnelTop.length).toBeGreaterThan(0);
    const funnel = IRIZAR_POLY.filter((t) => t[3] === HULL_RED && middle(t)[1] > 0.17);
    expect(funnel.length).toBeGreaterThan(0);
    expect(funnel.every((t) => Math.abs(middle(t)[0] - 0.04) < 0.05)).toBe(true);
  });

  it('is the vehicle of the voyage: one geometry with every face', () => {
    expect(VEHICLE_POLY_MODELS.irizar).toBe(IRIZAR_POLY);
    expect(VEHICLE_MODELS.irizar).toBeUndefined();
    const geometry = buildVehicleGeometry('irizar');
    expect(geometry.getAttribute('position').count).toBe(IRIZAR_POLY.length * 3);
    expect(geometry.getAttribute('color').count).toBe(IRIZAR_POLY.length * 3);
    geometry.dispose();
  });
});

import { IRIZAR_DECK_AFT, IRIZAR_DECK_TOP } from '@antartida/core';
import { block, facingOut, loftAlongX, mirrorZ, ngon, strut, type LoftStation, type Tri, type Vec3 } from './lowPoly.ts';

/**
 * Icebreaker ARA Almirante Irízar, low-poly (rule 30): bow to +x, y up, one unit is the length of
 * the ship and the keel rests on y = 0. An illustration, not a measured model: the layout follows
 * photos of the ship loosely (superstructure forward, funnel, hangar and flight deck aft) and the
 * flight deck and lifeboats keep the measures of @antartida/core (IRIZAR_DECK_AFT, IRIZAR_DECK_TOP,
 * IRIZAR_HALF_BEAM), where the Sea King takes off and the Zodiac is lowered.
 */

// Approximate livery, from photos: red hull, cream superstructure, orange lifeboats. The Puerto
// Argentino (vehicles.ts) shares these colors: vehicles.ts imports this file, so they live here.
export const HULL_RED = 0xc8472a;
export const CREAM = 0xf1e6c8;
export const BLACK = 0x1f2a36;
export const DECK = 0x5e656c;
export const LIFEBOAT = 0xd9822b;

/** Ring of points [x, z] seen from above, in either winding. */
type Ring2 = readonly (readonly [number, number])[];

const centerOf = (ring: Ring2): [number, number] => {
  const n = ring.length;
  return ring.reduce<[number, number]>(([sx, sz], [x, z]) => [sx + x / n, sz + z / n], [0, 0]);
};

/** The ring scaled about its middle by `kx` along the ship and `kz` across it. */
const scaleRing = (ring: Ring2, kx: number, kz = kx): Ring2 => {
  const [cx, cz] = centerOf(ring);
  return ring.map(([x, z]) => [cx + (x - cx) * kx, cz + (z - cz) * kz]);
};

const moveRing = (ring: Ring2, dx: number): Ring2 => ring.map(([x, z]) => [x + dx, z]);

/**
 * A closed solid between a convex ring at y0 and one of the same number of points at y1, which may
 * be smaller or set aft: tapered walls, a raked funnel. `wall(i)` colors the wall from point i to
 * i + 1. Every face is wound away from the middle of the solid.
 */
function frustum(lower: Ring2, y0: number, upper: Ring2, y1: number, wall: number | ((i: number) => number), top = typeof wall === 'number' ? wall : wall(0), bottom = top): Tri[] {
  const n = lower.length;
  const at = (ring: Ring2, i: number, y: number): Vec3 => [ring[i % n][0], y, ring[i % n][1]];
  const [lx, lz] = centerOf(lower);
  const [ux, uz] = centerOf(upper);
  const low: Vec3 = [lx, y0, lz];
  const high: Vec3 = [ux, y1, uz];
  const inside: Vec3 = [(lx + ux) / 2, (y0 + y1) / 2, (lz + uz) / 2];
  const out: Tri[] = [];
  for (let i = 0; i < n; i++) {
    const color = typeof wall === 'number' ? wall : wall(i);
    const a = at(lower, i, y0);
    const b = at(lower, i + 1, y0);
    const c = at(upper, i + 1, y1);
    const d = at(upper, i, y1);
    out.push(facingOut(a, b, c, color, inside), facingOut(a, c, d, color, inside));
    out.push(facingOut(high, at(upper, i, y1), at(upper, i + 1, y1), top, inside));
    out.push(facingOut(low, at(lower, i, y0), at(lower, i + 1, y0), bottom, inside));
  }
  return out;
}

// Hull: eight-point sections along x, stern to bow. The bow is an icebreaker's: the forefoot rises
// from the keel well aft of the stem in a long slope, so the ship rides up onto the ice and breaks
// it with its weight, and the stem rakes forward above the waterline with flared sides. The main
// deck rises a little to the forecastle.
/** [x, keel y, half width of the keel, bilge [half width, y], waterline [half width, y], deck edge [half width, y]]. */
type HullStation = readonly [number, number, number, readonly [number, number], readonly [number, number], readonly [number, number]];
const HULL_STATIONS: readonly HullStation[] = [
  [-0.5, 0.015, 0.045, [0.075, 0.022], [0.09, 0.04], [0.094, 0.083]],
  [-0.42, 0.004, 0.045, [0.085, 0.012], [0.099, 0.032], [0.1, 0.082]],
  [-0.32, 0, 0.05, [0.092, 0.007], [0.1, 0.028], [0.1, 0.08]],
  [0.16, 0, 0.05, [0.092, 0.007], [0.1, 0.028], [0.1, 0.08]],
  [0.27, 0, 0.04, [0.085, 0.01], [0.097, 0.03], [0.099, 0.081]],
  [0.35, 0.018, 0.022, [0.06, 0.026], [0.08, 0.042], [0.09, 0.084]],
  [0.42, 0.045, 0.01, [0.032, 0.05], [0.052, 0.06], [0.068, 0.088]],
  [0.5, 0.08, 0.002, [0.006, 0.082], [0.014, 0.086], [0.03, 0.093]],
];
/** Segment of a hull ring that is the main deck: 0-2 the +z side from the keel up, 4-6 the -z side down, 7 the keel. */
const HULL_DECK_SEGMENT = 3;

function hull(): Tri[] {
  const stations: LoftStation[] = HULL_STATIONS.map(([x, keelY, keel, bilge, water, deck]) => ({
    x,
    ring: [[keel, keelY], [bilge[0], bilge[1]], [water[0], water[1]], [deck[0], deck[1]], [-deck[0], deck[1]], [-water[0], water[1]], [-bilge[0], bilge[1]], [-keel, keelY]],
  }));
  return loftAlongX(stations, (_band, seg) => (seg === HULL_DECK_SEGMENT ? DECK : HULL_RED), HULL_RED, HULL_RED);
}

/** Height of the main deck amidships, where the superstructure and the hangar stand. */
const MAIN_DECK = 0.08;

// Superstructure: a block of cabins on the forward half, its front pointed like the hull below it,
// in two tiers that step in, with the bridge on top and its wings out to the sides.
const TIER1_TOP = 0.125;
const TIER1: Ring2 = [[0.3, 0], [0.28, 0.06], [0.25, 0.088], [-0.01, 0.088], [-0.01, -0.088], [0.25, -0.088], [0.28, -0.06]];
const TIER2_TOP = 0.17;
const TIER2: Ring2 = [[0.29, 0], [0.27, 0.05], [0.24, 0.075], [0.02, 0.075], [0.02, -0.075], [0.24, -0.075], [0.27, -0.05]];
/** The band of cabin windows along the second tier, and which of its walls have them (all but the back). */
const TIER2_WINDOWS: readonly [number, number] = [0.142, 0.152];
const TIER2_BACK = 3;
/** How much narrower a tier is at its top than at its foot, along the ship and across it. */
const TIER_LEAN_X = 0.015;
const TIER_LEAN_Z = 0.04;

function superstructure(): Tri[] {
  // The walls lean in a little as they rise: the ring of the second tier at a fraction k of its height.
  const tier2At = (y: number): Ring2 => {
    const k = (y - TIER1_TOP) / (TIER2_TOP - TIER1_TOP);
    return scaleRing(TIER2, 1 - TIER_LEAN_X * k, 1 - TIER_LEAN_Z * k);
  };
  const [sill, head] = TIER2_WINDOWS;
  return [
    ...frustum(TIER1, MAIN_DECK - 0.002, scaleRing(TIER1, 1 - TIER_LEAN_X, 1 - TIER_LEAN_Z), TIER1_TOP, CREAM),
    ...frustum(TIER2, TIER1_TOP - 0.001, tier2At(sill), sill, CREAM),
    ...frustum(tier2At(sill), sill, tier2At(head), head, (i) => (i === TIER2_BACK ? CREAM : BLACK), CREAM),
    ...frustum(tier2At(head), head, tier2At(TIER2_TOP), TIER2_TOP, CREAM),
  ];
}

// Bridge: wider than the tier under it (the bridge wings), glazed across the front and along the
// forward half of each side; the windows lean out and a visor of the roof shades them.
const BRIDGE: Ring2 = [[0.295, 0], [0.28, 0.098], [0.2, 0.098], [0.13, 0.098], [0.13, -0.098], [0.2, -0.098], [0.28, -0.098]];
/** Walls of the bridge ring that are glass: the two halves of the front and the forward part of each side. */
const BRIDGE_GLASS = [0, 1, 5, 6];
const BRIDGE_FLOOR = 0.168;
const BRIDGE_SILL = 0.19;
const BRIDGE_HEAD = 0.211;
const BRIDGE_ROOF = 0.222;

function bridge(): Tri[] {
  const lean = scaleRing(BRIDGE, 1.025, 1.02);
  return [
    ...frustum(BRIDGE, BRIDGE_FLOOR, BRIDGE, BRIDGE_SILL, CREAM),
    ...frustum(BRIDGE, BRIDGE_SILL, lean, BRIDGE_HEAD, (i) => (BRIDGE_GLASS.includes(i) ? BLACK : CREAM), CREAM),
    ...frustum(scaleRing(lean, 1.01, 1.005), BRIDGE_HEAD, scaleRing(BRIDGE, 0.99, 0.98), BRIDGE_ROOF, CREAM),
  ];
}

/** Mast on the bridge roof, with its yard and the radar. */
function mast(): Tri[] {
  return [
    ...strut([0.205, BRIDGE_ROOF - 0.002, 0], [0.195, 0.31, 0], 0.0035, BLACK),
    ...strut([0.198, 0.285, -0.038], [0.198, 0.285, 0.038], 0.0022, BLACK),
    ...block(0.201, 0.262, 0, 0.012, 0.005, 0.052, BLACK),
  ];
}

// Funnel: behind the bridge, raked aft, red with a black top.
const FUNNEL_FOOT = 0.12;
const FUNNEL_BAND = 0.235;
const FUNNEL_TOP = 0.257;
const FUNNEL_RAKE = 0.016;

function funnel(): Tri[] {
  const foot: Ring2 = [[0.085, 0.022], [0.06, 0.04], [0.02, 0.04], [0.005, 0.022], [0.005, -0.022], [0.02, -0.04], [0.06, -0.04], [0.085, -0.022]];
  const band = moveRing(scaleRing(foot, 0.86, 0.88), -FUNNEL_RAKE * ((FUNNEL_BAND - FUNNEL_FOOT) / (FUNNEL_TOP - FUNNEL_FOOT)));
  const top = moveRing(scaleRing(foot, 0.83, 0.86), -FUNNEL_RAKE);
  return [...frustum(foot, FUNNEL_FOOT, band, FUNNEL_BAND, HULL_RED), ...frustum(band, FUNNEL_BAND, top, FUNNEL_TOP, BLACK)];
}

// Lifeboats beside the superstructure, hanging out over the hull side: their outer side is the
// widest point of the ship (IRIZAR_HALF_BEAM).
const LIFEBOAT_X = 0.075;
const LIFEBOAT_Z = 0.095;
const LIFEBOAT_LENGTH = 0.085;
const LIFEBOAT_WIDTH = 0.028;
const LIFEBOAT_FOOT = 0.118;

/** Lifeboat of the +z side: an enclosed orange boat, its hull narrowing to the keel and its rounded roof. */
function lifeboat(): Tri[] {
  const l = LIFEBOAT_LENGTH / 2;
  const w = LIFEBOAT_WIDTH / 2;
  const x = LIFEBOAT_X;
  const z = LIFEBOAT_Z;
  const gunwale: Ring2 = [[x + l, z], [x + l * 0.55, z + w], [x - l * 0.6, z + w], [x - l, z + w * 0.5], [x - l, z - w * 0.5], [x - l * 0.6, z - w], [x + l * 0.55, z - w]];
  const rim = LIFEBOAT_FOOT + 0.015;
  return [
    ...frustum(scaleRing(gunwale, 0.8, 0.45), LIFEBOAT_FOOT, gunwale, rim, LIFEBOAT),
    ...frustum(gunwale, rim, scaleRing(gunwale, 0.82, 0.55), rim + 0.013, LIFEBOAT),
  ];
}

/** Cargo crane of the +z side, on the foredeck, its jib raised forward and out. */
function crane(): Tri[] {
  const x = 0.355;
  const z = 0.04;
  return [
    ...frustum(ngon(x, z, 0.012, 6), 0.083, ngon(x, z, 0.009, 6), 0.118, CREAM),
    ...block(x - 0.002, 0.126, z, 0.024, 0.016, 0.02, CREAM),
    ...strut([x + 0.004, 0.128, z], [0.405, 0.2, z + 0.012], 0.0028, CREAM),
  ];
}

// Hangar for the Sea King aft of the superstructure, and the flight deck over the stern where it
// lands: its middle IRIZAR_DECK_AFT aft of the middle of the ship and its top IRIZAR_DECK_TOP high.
const HANGAR: Ring2 = [[-0.035, 0.08], [-0.2, 0.08], [-0.2, -0.08], [-0.035, -0.08]];
const HANGAR_TOP = 0.15;
const FLIGHT_DECK_FORE = -0.2;
const FLIGHT_DECK_AFT_END = -0.475;
const FLIGHT_DECK_HALF_WIDTH = 0.097;
/** The helipad circle on the deck: a ring of cream paint, just over the deck so the two do not flicker. */
const HELIPAD_OUTER = 0.058;
const HELIPAD_INNER = 0.048;
const PAINT = 0.0006;

function hangarAndDeck(): Tri[] {
  const deck: Ring2 = [[FLIGHT_DECK_FORE, FLIGHT_DECK_HALF_WIDTH], [FLIGHT_DECK_AFT_END, FLIGHT_DECK_HALF_WIDTH], [FLIGHT_DECK_AFT_END, -FLIGHT_DECK_HALF_WIDTH], [FLIGHT_DECK_FORE, -FLIGHT_DECK_HALF_WIDTH]];
  const y = IRIZAR_DECK_TOP + PAINT;
  const outer = ngon(-IRIZAR_DECK_AFT, 0, HELIPAD_OUTER, 12);
  const inner = ngon(-IRIZAR_DECK_AFT, 0, HELIPAD_INNER, 12);
  const below: Vec3 = [-IRIZAR_DECK_AFT, 0, 0];
  const helipad = outer.flatMap(([ox, oz], i): Tri[] => {
    const [px, pz] = outer[(i + 1) % outer.length];
    const [ix, iz] = inner[i];
    const [qx, qz] = inner[(i + 1) % inner.length];
    return [facingOut([ox, y, oz], [px, y, pz], [qx, y, qz], CREAM, below), facingOut([ox, y, oz], [qx, y, qz], [ix, y, iz], CREAM, below)];
  });
  return [
    ...frustum(HANGAR, MAIN_DECK - 0.002, scaleRing(HANGAR, 0.99, 0.96), HANGAR_TOP, CREAM),
    // The hangar door, closed, on its after wall.
    ...block(-0.2015, 0.112, 0, 0.003, 0.06, 0.104, DECK),
    ...frustum(deck, MAIN_DECK - 0.001, deck, IRIZAR_DECK_TOP, DECK),
    ...helipad,
  ];
}

/** A part of the +z side with its mirror on the other. */
const bothSides = (tris: readonly Tri[]): Tri[] => [...tris, ...mirrorZ(tris)];

/** The Irízar afloat: keel on y = 0, the waterline (SHIP_DRAFT) a little above it. */
export const IRIZAR_POLY: readonly Tri[] = [
  ...hull(),
  ...superstructure(),
  ...bridge(),
  ...mast(),
  ...funnel(),
  ...bothSides(lifeboat()),
  ...bothSides(crane()),
  ...hangarAndDeck(),
];

import {
  SHIP_BOW,
  SHIP_CENTER_X,
  SHIP_CENTER_Z,
  SHIP_DECK_ABOVE_WATER,
  SHIP_DOOR_U,
  SHIP_DOOR_V,
  SHIP_GANGWAY_FOOT,
  SHIP_GANGWAY_HALF_WIDTH,
  SHIP_GANGWAY_RUN,
  SHIP_HEIGHT_SCALE,
  SHIP_LANDING_U,
  SHIP_LANDING_X,
  SHIP_LENGTH,
  shipWalkHeight,
  type SceneDef,
} from '@antartida/core';
import { VOXEL_PALETTE } from '../orcadas/stationModels.ts';
import {
  BLACK,
  CREAM,
  HULL_RED,
  IRIZAR_DECKHOUSE,
  IRIZAR_HANGAR,
  IRIZAR_LIFEBOAT_FOOT,
  IRIZAR_POLY,
  IRIZAR_STEM_X,
  IRIZAR_STERN_X,
  irizarDeckHalfWidth,
  irizarDeckY,
  irizarLifeboat,
  irizarWaterHalfWidth,
  irizarWaterY,
} from './irizarModel.ts';
import { quad, strut, type Tri, type Vec3 } from './lowPoly.ts';
import { DIORAMA_WATER_Y } from './ponchoSea.ts';
import { rope, slab, snowMound, tube } from './ponchoShapes.ts';

/**
 * The icebreaker of «En rompehielos hacia Belgrano» (issue #219) as the scene draws it: the low-poly icebreaker of the trip
 * (irizarModel.ts) painted like a polar ship (dark blue hull with a red band at the waterline and a white line under the deck,
 * white superstructure), drawn taller than long (SHIP_HEIGHT_SCALE) so its decks are a person and a half high, AFLOAT against
 * the ice edge. On it: rows of windows and portholes, orange lifeboats on davits (the model's pair and one more by the hangar),
 * anchors, rails on the foredeck, the door the walkers go in by, foam at the waterline and a plank gangway from the ice. Placement
 * and measures come from core (poncho-ship.ts), so the walk and the faces agree. An ILLUSTRATION: it is not the ship of 1964 and
 * carries no name (the book, p. 14, only says "un rompehielos").
 *
 * The ship is NOT seated on the ground like the other props (that is the sea bed here): its hull rides at the water level, only
 * the foot of the gangway follows the ice. Scene frame: x ahead, z to the left, units of a person's height.
 */

/** Id the scene gives the element that stands for the ship and its gangway. */
export const SHIP_PROP_ID = 'icebreakerShip';

/** True when the scene has the ship in it. */
export const sceneHasShip = (scene: SceneDef): boolean => scene.elements.some((e) => e.kind === 'prop' && e.id === SHIP_PROP_ID);

// Paint of the polar ship (named, rule 30.5): the hull dark blue, the superstructure white.
export const SHIP_NAVY = 0x1f3150;
export const SHIP_WHITE = 0xf1f1ec;
const PORTHOLE = 0x101a28;

const { WHITE, ZINC, WOOD, WOOD_LIGHT, BROWN, BROWN_DARK } = VOXEL_PALETTE;
const L = SHIP_LENGTH;
/** Scene units per model unit, along the ship and across it, and upwards. */
const H = L * SHIP_HEIGHT_SCALE;
/** Height of the waterline in the model: the ship is lowered until its deck at the landing is SHIP_DECK_ABOVE_WATER high. */
const WATERLINE = irizarDeckY(SHIP_LANDING_U) - SHIP_DECK_ABOVE_WATER / H;
/** How far a painted face stands off the wall under it (model units), so the two do not flicker. */
const PAINT = 0.0006;
/** The hull below this height (model units) is the hull; above it, red is the funnel. */
const HULL_TOP = 0.1;

/** A point of the model (bow to +x, keel on y = 0, one unit the length) in the scene, with the water at `waterY`. A turn of 180 degrees when the bow goes to -x: no mirror, so the faces keep their winding. */
const place = (waterY: number) => ([mx, my, mz]: Vec3): Vec3 => [SHIP_CENTER_X + SHIP_BOW * mx * L, waterY + (my - WATERLINE) * H, SHIP_CENTER_Z + SHIP_BOW * mz * L];

/** The colors of the trip's icebreaker turned into the polar paint: blue hull, white superstructure (funnel, deck and windows as they are). */
function repaint([a, b, c, color]: Tri): Tri {
  if (color === HULL_RED && Math.max(a[1], b[1], c[1]) <= HULL_TOP) return [a, b, c, SHIP_NAVY];
  if (color === CREAM) return [a, b, c, SHIP_WHITE];
  return [a, b, c, color];
}

/** A flat rectangle on a wall that faces +z (side 1) or -z (side -1): corners from x0 to x1 and y0 to y1, its z at each height given by `zAt`. */
function onSide(side: 1 | -1, x0: number, x1: number, y0: number, y1: number, zAt: (x: number, y: number) => number, color: number): Tri[] {
  const p = (x: number, y: number): Vec3 => [x, y, side * (zAt(x, y) + PAINT)];
  return side === 1 ? quad(p(x0, y0), p(x1, y0), p(x1, y1), p(x0, y1), color) : quad(p(x1, y0), p(x0, y0), p(x0, y1), p(x1, y1), color);
}

/** Half width of the hull side at height y and x: between the waterline corner and the deck edge of its rings. */
function hullSideAt(x: number, y: number): number {
  const wy = irizarWaterY(x);
  const dy = irizarDeckY(x);
  const k = Math.min(1, Math.max(0, (y - wy) / (dy - wy)));
  return irizarWaterHalfWidth(x) + (irizarDeckHalfWidth(x) - irizarWaterHalfWidth(x)) * k;
}

/** The paint of the hull, both sides: a red band at the waterline, a white line under the deck edge, and a row of portholes. */
function hullPaint(): Tri[] {
  const out: Tri[] = [];
  const [x0, x1] = [-0.46, 0.4];
  const n = 43;
  for (const side of [1, -1] as const) {
    for (let i = 0; i < n; i++) {
      const a = x0 + ((x1 - x0) * i) / n;
      const b = x0 + ((x1 - x0) * (i + 1)) / n;
      // The red band from just under the water up a little over it, as on a ship loaded to its marks.
      const red = (x: number) => Math.max(WATERLINE + 0.004, irizarWaterY(x) + 0.001);
      out.push(...stripe(side, a, b, () => WATERLINE - 0.002, red, HULL_RED));
      out.push(...stripe(side, a, b, (x) => irizarDeckY(x) - 0.006, (x) => irizarDeckY(x) - 0.002, SHIP_WHITE));
    }
    // Portholes along the straight side, a row between the band and the deck.
    for (let x = -0.4; x <= 0.2; x += 0.02) {
      const y = WATERLINE + 0.026;
      out.push(...onSide(side, x - 0.003, x + 0.003, y, y + 0.006, hullSideAt, PORTHOLE));
    }
  }
  return out;
}

/** A band along the hull side from x = a to b, between heights bottom(x) and top(x), following the side. */
function stripe(side: 1 | -1, a: number, b: number, bottom: (x: number) => number, top: (x: number) => number, color: number): Tri[] {
  const p = (x: number, y: number): Vec3 => [x, y, side * (hullSideAt(x, y) + PAINT)];
  const [pa, pb, pc, pd] = [p(a, bottom(a)), p(b, bottom(b)), p(b, top(b)), p(a, top(a))];
  return side === 1 ? quad(pa, pb, pc, pd, color) : quad(pb, pa, pd, pc, color);
}

/** Windows along the sides of the first tier and of the hangar: a row of dark panes on each wall. */
function deckhouseWindows(): Tri[] {
  const out: Tri[] = [];
  const { mainDeck, tier1Top, tier1Half, tier1Fore, tier1Aft, tierLeanZ } = IRIZAR_DECKHOUSE;
  const tierZ = (_x: number, y: number) => tier1Half * (1 - tierLeanZ * ((y - mainDeck) / (tier1Top - mainDeck)));
  const hangarZ = (_x: number, y: number) => IRIZAR_HANGAR.half * (1 - IRIZAR_HANGAR.leanZ * ((y - mainDeck) / (IRIZAR_HANGAR.top - mainDeck)));
  const [sill, head] = [mainDeck + 0.018, mainDeck + 0.032];
  for (const side of [1, -1] as const) {
    for (let x = tier1Aft + 0.012; x <= tier1Fore - 0.01; x += 0.017) out.push(...onSide(side, x - 0.0045, x + 0.0045, sill, head, tierZ, BLACK));
    for (let x = IRIZAR_HANGAR.aft + 0.02; x <= IRIZAR_HANGAR.fore - 0.015; x += 0.03) out.push(...onSide(side, x - 0.004, x + 0.004, sill + 0.016, head + 0.012, hangarZ, BLACK));
  }
  return out;
}

/** The door the walkers go in by, on the slanted front wall of the first tier on the side of the ice: a dark opening with a white frame and a sill. */
function door(): Tri[] {
  const [[ax, az], [bx, bz]] = IRIZAR_DECKHOUSE.tier1FrontNear;
  const { mainDeck } = IRIZAR_DECKHOUSE;
  const len = Math.hypot(bx - ax, bz - az);
  const t: [number, number] = [(bx - ax) / len, (bz - az) / len];
  // Out of the wall: the wall goes from the side (a) to the point (b); its outside, towards +x and +z, is that turned a quarter.
  const n: [number, number] = [-t[1], t[0]];
  const at = (s: number, y: number, out: number): Vec3 => [SHIP_DOOR_U + t[0] * s + n[0] * out, y, SHIP_DOOR_V + t[1] * s + n[1] * out];
  const half = 0.5 / 2 / L;
  const top = mainDeck + 1.1 / H;
  const frame = 0.06 / L;
  return [
    ...quad(at(-half - frame, mainDeck, PAINT), at(half + frame, mainDeck, PAINT), at(half + frame, top + frame, PAINT), at(-half - frame, top + frame, PAINT), SHIP_WHITE),
    ...quad(at(-half, mainDeck, 2 * PAINT), at(half, mainDeck, 2 * PAINT), at(half, top, 2 * PAINT), at(-half, top, 2 * PAINT), PORTHOLE),
  ];
}

/** Lifeboats on davits: the model's pair beside the superstructure gets its arms, and a second, larger pair hangs by the hangar. */
function lifeboats(): Tri[] {
  const out: Tri[] = [];
  const davit = (x: number, z: number, size: number): Tri[] => {
    const arms: Tri[] = [];
    for (const dx of [-0.03, 0.03].map((d) => d * size)) {
      const foot: Vec3 = [x + dx, IRIZAR_DECKHOUSE.mainDeck, z - 0.012];
      const knee: Vec3 = [x + dx, IRIZAR_LIFEBOAT_FOOT + 0.04 * size, z - 0.006];
      const tip: Vec3 = [x + dx, IRIZAR_LIFEBOAT_FOOT + 0.042 * size, z + 0.004];
      arms.push(...strut(foot, knee, 0.0018, SHIP_WHITE), ...strut(knee, tip, 0.0016, SHIP_WHITE));
    }
    return arms;
  };
  for (const side of [1, -1] as const) {
    const mirror = (tris: readonly Tri[]): Tri[] => (side === 1 ? [...tris] : tris.map(([a, b, c, col]): Tri => [[a[0], a[1], -a[2]], [c[0], c[1], -c[2]], [b[0], b[1], -b[2]], col]));
    out.push(...mirror(davit(0.075, 0.095, 1)));
    out.push(...mirror(irizarLifeboat(-0.12, 0.1, 1.25)), ...mirror(davit(-0.12, 0.1, 1.25)));
  }
  return out;
}

/** An anchor in its hawse at the bow, each side: a dark plate and the flukes. */
function anchors(): Tri[] {
  const out: Tri[] = [];
  const x = 0.43;
  const y = irizarDeckY(x) - 0.012;
  for (const side of [1, -1] as const) {
    out.push(...onSide(side, x - 0.006, x + 0.006, y - 0.004, y + 0.006, hullSideAt, PORTHOLE));
    out.push(...onSide(side, x - 0.0025, x + 0.0025, y - 0.012, y - 0.002, (px, py) => hullSideAt(px, py) + PAINT, BLACK));
  }
  return out;
}

/** Foam on the water along the hull: a band all round the waterline, from stern to stem. */
function foam(at: (p: Vec3) => Vec3): Tri[] {
  const out: Tri[] = [];
  const steps = 30;
  const [x0, x1] = [IRIZAR_STERN_X - 0.004, IRIZAR_STEM_X + 0.012];
  const width = 0.012;
  for (let i = 0; i < steps; i++) {
    // Broken here and there, like the foam of the shore.
    if (i % 7 === 3) continue;
    const a = x0 + ((x1 - x0) * i) / steps;
    const b = x0 + ((x1 - x0) * (i + 1)) / steps;
    for (const side of [1, -1]) {
      const inner = (x: number) => irizarWaterHalfWidth(Math.min(x, IRIZAR_STEM_X)) * side;
      const outer = (x: number) => (irizarWaterHalfWidth(Math.min(x, IRIZAR_STEM_X)) + width * (0.8 + 0.5 * Math.abs(Math.sin(x * 90)))) * side;
      const y = WATERLINE + 0.0007;
      const quadPts = [at([a, y, inner(a)]), at([b, y, inner(b)]), at([b, y, outer(b)]), at([a, y, outer(a)])] as const;
      out.push(...(side === 1 ? quad(quadPts[0], quadPts[3], quadPts[2], quadPts[1], WHITE) : quad(quadPts[0], quadPts[1], quadPts[2], quadPts[3], WHITE)));
    }
  }
  return out;
}

/** The rails round the foredeck: posts and two lines each side, open where the gangway lands. */
function foredeckRails(at: (p: Vec3) => Vec3): Tri[] {
  const out: Tri[] = [];
  const start = 0.3;
  const end = 0.47;
  const n = 11;
  for (const side of [1, -1]) {
    let before: readonly [Vec3, Vec3] | null = null;
    for (let i = 0; i <= n; i++) {
      const mx = start + ((end - start) * i) / n;
      const mz = side * (irizarDeckHalfWidth(mx) - 0.003);
      const foot = at([mx, irizarDeckY(mx), mz]);
      // The side towards the ice has a gap where the gangway lands.
      const gap = side === 1 && Math.abs(foot[0] - SHIP_LANDING_X) < SHIP_GANGWAY_HALF_WIDTH + 0.1;
      if (gap) {
        before = null;
        continue;
      }
      const top: Vec3 = [foot[0], foot[1] + 0.55, foot[2]];
      const mid: Vec3 = [foot[0], foot[1] + 0.28, foot[2]];
      out.push(...strut(foot, top, 0.022, ZINC));
      if (before) out.push(...strut(before[0], top, 0.014, SHIP_WHITE), ...strut(before[1], mid, 0.012, SHIP_WHITE));
      before = [top, mid];
    }
  }
  return out;
}

/**
 * The gangway of planks from the foot on the ice (`footY`, the height of the ice there) up to the deck edge (`deckY`): four boards,
 * cleats for the boots, two stringers, a rope handrail on posts and a drift of snow at its foot. Its top surface is the height
 * `shipWalkHeight` gives, so whoever walks it keeps to the boards.
 */
export function buildShipGangway(footY: number, deckY: number): Tri[] {
  const [fx, fz] = SHIP_GANGWAY_FOOT;
  const surf = (t: number, x: number, lift = 0): Vec3 => [fx + x, footY + (deckY - footY) * t + lift, fz + t * SHIP_GANGWAY_RUN];
  const w = SHIP_GANGWAY_HALF_WIDTH;
  const out: Tri[] = [];
  const boards = 4;
  for (let j = 0; j < boards; j++) {
    const x0 = -w + ((2 * w) / boards) * j + 0.008;
    const x1 = -w + ((2 * w) / boards) * (j + 1) - 0.008;
    out.push(...slab([surf(0, x0, -0.025), surf(0, x1, -0.025), surf(1, x1, -0.025), surf(1, x0, -0.025)], 0.05, j % 2 ? WOOD_LIGHT : WOOD, BROWN));
  }
  for (let k = 1; k <= 11; k++) out.push(...tube(surf(k / 12, -w, 0.012), surf(k / 12, w, 0.012), 0.016, 0.016, 4, BROWN_DARK));
  for (const s of [-1, 1]) out.push(...tube(surf(0, s * (w - 0.04), -0.07), surf(1, s * (w - 0.04), -0.07), 0.05, 0.05, 4, BROWN_DARK));
  for (const s of [-1, 1]) {
    const stations = [0, 0.2, 0.4, 0.6, 0.8, 1];
    for (const t of stations) out.push(...tube(surf(t, s * (w + 0.04)), surf(t, s * (w + 0.04), 0.72), 0.022, 0.02, 4, WOOD));
    out.push(...rope(stations.map((t) => surf(t, s * (w + 0.04), 0.7)), 0.016, 4, CREAM), ...rope(stations.map((t) => surf(t, s * (w + 0.04), 0.38)), 0.014, 4, CREAM));
  }
  // Packed snow where the boots come on and off the boards.
  out.push(...snowMound(fx, fz - 0.15, 0.8, 0.55, 0.07, 311, 10).map(([a, b, c, col]): Tri => [[a[0], a[1] + footY, a[2]], [b[0], b[1] + footY, b[2]], [c[0], c[1] + footY, c[2]], col]));
  return out;
}

/** The ship in the model frame, painted, with everything it carries (no gangway): keel on y = 0, one unit the length. */
const SHIP_MODEL: readonly Tri[] = [...IRIZAR_POLY.map(repaint), ...hullPaint(), ...deckhouseWindows(), ...door(), ...lifeboats(), ...anchors()];

/** The faces of the ship and its gangway: the hull on the water, and the gangway from the ice under the scene (`ground`). Colors of the ice left for resolveRelief. */
export function shipStaticTris(ground: (x: number, z: number) => number, waterY = DIORAMA_WATER_Y): Tri[] {
  const at = place(waterY);
  const ship = SHIP_MODEL.map(([a, b, c, color]): Tri => [at(a), at(b), at(c), color]);
  const [fx, fz] = SHIP_GANGWAY_FOOT;
  return [...ship, ...foam(at), ...foredeckRails(at), ...buildShipGangway(ground(fx, fz), waterY + SHIP_DECK_ABOVE_WATER)];
}

/**
 * The ground for whoever walks on it, with the gangway and the foredeck on top of the ice: the ice at the foot of the gangway, a slope up it
 * and the deck to the door, as `shipWalkHeight` says. Everywhere else it is `ground`.
 */
export function withShipWalkway(ground: (x: number, z: number) => number, waterY = DIORAMA_WATER_Y): (x: number, z: number) => number {
  const [fx, fz] = SHIP_GANGWAY_FOOT;
  const footY = ground(fx, fz);
  return (x, z) => shipWalkHeight(x, z, footY, waterY) ?? ground(x, z);
}

/** Whether (x, z) is under the ship's hull, a little wider than it: the floes and ice of the sea keep out of it. */
export function underShip(x: number, z: number, margin = 0.6): boolean {
  const u = (x - SHIP_CENTER_X) / (SHIP_BOW * L);
  if (u < IRIZAR_STERN_X - margin / L || u > IRIZAR_STEM_X + margin / L) return false;
  const half = irizarWaterHalfWidth(Math.min(Math.max(u, IRIZAR_STERN_X), IRIZAR_STEM_X)) * L + margin;
  return Math.abs(z - SHIP_CENTER_Z) <= half;
}

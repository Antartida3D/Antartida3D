import { describe, expect, it } from 'vitest';
// Break the pre-existing stationModels <-> sightingModels -> penguins import cycle in test isolation.
import '../src/voyage/sightingModels.ts';
import {
  PONCHO_SCENES,
  SHIP_BOW,
  SHIP_CENTER_X,
  SHIP_CENTER_Z,
  SHIP_DECK_ABOVE_WATER,
  SHIP_DOOR,
  SHIP_DOOR_DECK_ABOVE_WATER,
  SHIP_HEIGHT_SCALE,
  SHIP_GANGWAY_FOOT,
  SHIP_GANGWAY_HALF_WIDTH,
  SHIP_GANGWAY_TOP,
  SHIP_LANDING_HALF_BEAM,
  SHIP_LANDING_U,
  SHIP_LENGTH,
  sceneCoastZ,
  shipWalkHeight,
} from '@antartida/core';
import { DECK, HULL_RED, IRIZAR_DECKHOUSE, LIFEBOAT, irizarDeckHalfWidth, irizarDeckY, irizarWaterHalfWidth } from '../src/voyage/irizarModel.ts';
import { POLY_MIN_COLORS, POLY_MIN_TRIS, type Tri } from '../src/voyage/lowPoly.ts';
import { DIORAMA_WATER_Y } from '../src/voyage/ponchoSea.ts';
import { elementStaticTris } from '../src/voyage/ponchoSceneBuild.ts';
import { buildShipGangway, sceneHasShip, shipStaticTris, underShip, withShipWalkway, SHIP_NAVY, SHIP_PROP_ID, SHIP_WHITE } from '../src/voyage/ponchoShip.ts';
import { buildDioramaWorld } from '../src/voyage/ponchoDioramaGround.ts';

const scene = PONCHO_SCENES['rumbo-a-belgrano'];
const flat = () => 0;
const points = (tris: readonly Tri[]) => tris.flatMap(([a, b, c]) => [a, b, c]);
const WATER_Y = DIORAMA_WATER_Y;
const DECK_Y = WATER_Y + SHIP_DECK_ABOVE_WATER;

describe('the ship afloat (#219)', () => {
  it('is in the scene of the stop and in no other', () => {
    expect(sceneHasShip(scene)).toBe(true);
    for (const [id, other] of Object.entries(PONCHO_SCENES)) if (id !== 'rumbo-a-belgrano') expect(sceneHasShip(other), id).toBe(false);
  });

  it('has the detail of a low-poly model (rule 30) and finite faces with resolved colors but the ice', () => {
    const tris = shipStaticTris(flat);
    expect(tris.length).toBeGreaterThan(POLY_MIN_TRIS);
    expect(new Set(tris.map((t) => t[3])).size).toBeGreaterThanOrEqual(POLY_MIN_COLORS);
    for (const t of tris) expect(t.slice(0, 3).flat().every(Number.isFinite)).toBe(true);
  });

  it('is what the element draws, whatever the ground is under its marker', () => {
    const e = scene.elements.find((x) => x.id === SHIP_PROP_ID)!;
    expect(elementStaticTris(e, flat)).toEqual(shipStaticTris(flat));
  });

  it('rides on the water, not on the sea bed: the same hull on a flat or a sloping ground, only the gangway follows the ice', () => {
    const a = shipStaticTris(flat);
    const b = shipStaticTris((_x, z) => 0.1 * z);
    expect(b).toHaveLength(a.length);
    // Everything but the gangway (the hull, the foam and the rails) is the same face for face; only the gangway and the snow at its foot move.
    const gangway = buildShipGangway(0, DECK_Y).length;
    expect(a.slice(0, a.length - gangway)).toEqual(b.slice(0, b.length - gangway));
    expect(a.slice(a.length - gangway)).not.toEqual(b.slice(b.length - gangway));
    // The ship itself spans its length, from the stern to the stem, along x.
    const xs = points(a).map((p) => p[0]);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(SHIP_LENGTH * 0.95);
  });

  it('is a deck at SHIP_DECK_ABOVE_WATER over the water where the gangway lands, and the walkway meets it', () => {
    const tris = shipStaticTris(flat);
    // Deck faces (the color of the main deck) by the landing: at the edge and a little into the foredeck.
    const [tx, tz] = SHIP_GANGWAY_TOP;
    // (The deck faces have corners only at the rings of the hull, the nearest a metre or so along the ship; the deck rises a little to the bow.)
    const deck = points(tris.filter((t) => t[3] === DECK)).filter((p) => Math.abs(p[0] - tx) < 1.5 && p[2] > tz - 0.3 && p[2] < tz + 0.6);
    expect(deck.length).toBeGreaterThan(0);
    for (const p of deck) expect(Math.abs(p[1] - DECK_Y)).toBeLessThan(0.1);
    // The ground of the walkers: the ice at the foot, this deck at the top and on the foredeck.
    const walk = withShipWalkway(flat);
    expect(walk(SHIP_GANGWAY_FOOT[0], SHIP_GANGWAY_FOOT[1])).toBe(0);
    expect(walk(tx, tz)).toBeCloseTo(DECK_Y, 9);
    expect(walk(SHIP_DOOR[0], SHIP_DOOR[1])).toBeCloseTo(WATER_Y + SHIP_DOOR_DECK_ABOVE_WATER, 9);
    expect(walk(SHIP_DOOR[0] + 2, SHIP_DOOR[1])).toBe(0);
  });

  it('has the deck narrow at the landing as the core says it is (SHIP_LANDING_HALF_BEAM comes from the model)', () => {
    expect(irizarDeckHalfWidth(SHIP_LANDING_U) * SHIP_LENGTH).toBeCloseTo(SHIP_LANDING_HALF_BEAM, 1);
    expect(SHIP_CENTER_Z - SHIP_LANDING_HALF_BEAM).toBeCloseTo(SHIP_GANGWAY_TOP[1], 9);
  });

  it('keeps its hull off the ice: along the whole ship the water between it and the edge is left', () => {
    for (let i = 0; i <= 40; i++) {
      const mx = -0.5 + i / 40;
      const x = SHIP_CENTER_X + SHIP_BOW * mx * SHIP_LENGTH;
      const nearSide = SHIP_CENTER_Z - irizarWaterHalfWidth(mx) * SHIP_LENGTH;
      // (An edge that is not there is the open sea beyond the stage: the ice only reaches where the coast line is.)
      expect(nearSide, `x = ${x.toFixed(1)}`).toBeGreaterThan(sceneCoastZ(x) + 0.05);
    }
  });

  it('keeps the floes of the sea out from under the hull', () => {
    expect(underShip(SHIP_CENTER_X, SHIP_CENTER_Z)).toBe(true);
    expect(underShip(SHIP_CENTER_X, SHIP_CENTER_Z + 6)).toBe(false);
    expect(underShip(SHIP_CENTER_X + 30, SHIP_CENTER_Z)).toBe(false);
    // The sea of the scene has no floe whose faces are inside the hull's footprint.
    const { sea } = buildDioramaWorld(scene);
    const above = sea.filter((t) => t.slice(0, 3).some((v) => (v as readonly number[])[1] > WATER_Y + 0.05));
    for (const [a, b, c] of above) {
      const mid = [(a[0] + b[0] + c[0]) / 3, (a[2] + b[2] + c[2]) / 3] as const;
      expect(underShip(mid[0], mid[1], 0), `floe at (${mid[0].toFixed(1)}, ${mid[1].toFixed(1)})`).toBe(false);
    }
  });

  it('has a gangway whose boards go from the foot to the deck edge', () => {
    const tris = buildShipGangway(0, DECK_Y);
    const ys = points(tris).map((p) => p[1]);
    // From the ice (a little under it: the planks have thickness) to the deck, and the handrail a person's hip over it.
    expect(Math.min(...ys)).toBeLessThan(0.05);
    expect(Math.max(...ys)).toBeGreaterThan(DECK_Y + 0.5);
    // The top surface of the boards is the height the walkers use (shipWalkHeight): there are faces at the foot on the ice and at the top on the deck.
    const [fx, fz] = SHIP_GANGWAY_FOOT;
    const at = (z: number) => points(tris).filter((p) => Math.abs(p[2] - z) < 0.06 && Math.abs(p[0] - fx) < SHIP_GANGWAY_HALF_WIDTH);
    expect(at(fz).some((p) => Math.abs(p[1] - shipWalkHeight(fx, fz, 0, DECK_Y)!) < 0.03)).toBe(true);
    expect(at(SHIP_GANGWAY_TOP[1]).some((p) => Math.abs(p[1] - DECK_Y) < 0.03)).toBe(true);
  });

  it('is painted like a polar ship: a dark blue hull with a red band at the water, white superstructure, orange lifeboats', () => {
    const tris = shipStaticTris(flat);
    const count = (color: number) => tris.filter((t) => t[3] === color).length;
    expect(count(SHIP_NAVY)).toBeGreaterThan(50);
    expect(count(SHIP_WHITE)).toBeGreaterThan(50);
    expect(count(LIFEBOAT)).toBeGreaterThan(40);
    // The red left on the hull is the band at the waterline (and the funnel, up high): none of the hull sides is red.
    const red = tris.filter((t) => t[3] === HULL_RED);
    const lowRed = points(red).filter((p) => p[1] < WATER_Y + 0.5);
    expect(lowRed.length).toBeGreaterThan(0);
    for (const p of lowRed) expect(p[1]).toBeGreaterThan(WATER_Y - 0.2);
  });

  it('has windows along its decks and portholes along its hull, on both sides', () => {
    const tris = shipStaticTris(flat);
    const dark = tris.filter((t) => t[3] !== SHIP_NAVY && t.slice(0, 3).every((v) => (v as readonly number[])[1] > WATER_Y + 0.2) && (t[3] === 0x101a28 || t[3] === 0x1f2a36));
    const near = dark.filter((t) => t[0][2] < SHIP_CENTER_Z);
    const far = dark.filter((t) => t[0][2] > SHIP_CENTER_Z);
    expect(near.length).toBeGreaterThan(60);
    expect(far.length).toBeGreaterThan(60);
  });

  it('is tall enough for people: the first deck of cabins is higher than a person, and so is its door', () => {
    const tier = (IRIZAR_DECKHOUSE.tier1Top - IRIZAR_DECKHOUSE.mainDeck) * SHIP_LENGTH * SHIP_HEIGHT_SCALE;
    expect(tier).toBeGreaterThan(1.15);
    // The door is a dark opening right at the end of the walk, on the wall, from the deck up past a person's head.
    const tris = shipStaticTris(flat);
    const doorFaces = points(tris.filter((t) => t[3] === 0x101a28)).filter((p) => Math.hypot(p[0] - SHIP_DOOR[0], p[2] - SHIP_DOOR[1]) < 0.4);
    expect(doorFaces.length).toBeGreaterThan(0);
    const ys = doorFaces.map((p) => p[1]);
    expect(Math.min(...ys)).toBeCloseTo(WATER_Y + SHIP_DOOR_DECK_ABOVE_WATER, 1);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(1.05);
  });

  it('has the deck at the door as high as the core says it is (SHIP_DOOR_DECK_ABOVE_WATER comes from the model)', () => {
    const fall = (irizarDeckY(SHIP_LANDING_U) - IRIZAR_DECKHOUSE.mainDeck) * SHIP_LENGTH * SHIP_HEIGHT_SCALE;
    expect(SHIP_DECK_ABOVE_WATER - fall).toBeCloseTo(SHIP_DOOR_DECK_ABOVE_WATER, 1);
  });
});

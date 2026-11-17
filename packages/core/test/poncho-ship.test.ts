import { describe, expect, it } from 'vitest';
import {
  PONCHO_SCENES,
  SHIP_BOW,
  SHIP_CENTER_X,
  SHIP_DECK_ABOVE_WATER,
  SHIP_DOOR,
  SHIP_DOOR_DECK_ABOVE_WATER,
  SHIP_GANGWAY_FOOT,
  SHIP_GANGWAY_HALF_WIDTH,
  SHIP_GANGWAY_TOP,
  SHIP_LANDING_U,
  SHIP_LANDING_X,
  SHIP_LENGTH,
  scenePathLength,
  scenePathPoints,
  sceneCoastZ,
  sceneWalk,
  shipWalkHeight,
  shipWalkwayAt,
} from '../src/index.ts';

const WATER = -0.3;
const scene = PONCHO_SCENES['rumbo-a-belgrano'];
const board = scene.paths.find((p) => p.id === 'board')!;

describe('the ship of «En rompehielos hacia Belgrano»', () => {
  it('has its gangway land on the deck edge, the foot on the ice well before the sea', () => {
    const [fx, fz] = SHIP_GANGWAY_FOOT;
    const [tx, tz] = SHIP_GANGWAY_TOP;
    expect(tx).toBe(fx);
    expect(tz).toBeGreaterThan(fz);
    // The foot stands on the ice, clear of the edge (as every element on a coast).
    expect(fz).toBeLessThan(sceneCoastZ(fx) - 1);
    // The top is out over the water, past the ice edge: a gangway, not a ramp on land.
    expect(tz).toBeGreaterThan(sceneCoastZ(tx));
  });

  it('lies along x with its landing where the middle of the ship puts it (the bow, SHIP_LANDING_U of the length from the middle)', () => {
    expect(SHIP_CENTER_X + SHIP_BOW * SHIP_LANDING_U * SHIP_LENGTH).toBeCloseTo(SHIP_LANDING_X, 9);
  });

  it('tells the gangway, the foredeck and the rest of the ground apart', () => {
    const [fx, fz] = SHIP_GANGWAY_FOOT;
    const [tx, tz] = SHIP_GANGWAY_TOP;
    expect(shipWalkwayAt(fx, fz)).toEqual({ kind: 'gangway', t: 0 });
    expect(shipWalkwayAt(tx, tz)).toEqual({ kind: 'gangway', t: 1 });
    expect(shipWalkwayAt(fx, (fz + tz) / 2)).toMatchObject({ kind: 'gangway' });
    expect(shipWalkwayAt(SHIP_DOOR[0], SHIP_DOOR[1])).toEqual({ kind: 'deck' });
    // Off the side of the boards, short of the foot, or out over the water past the door: no walkway.
    expect(shipWalkwayAt(fx + SHIP_GANGWAY_HALF_WIDTH + 0.05, (fz + tz) / 2)).toBeNull();
    expect(shipWalkwayAt(fx, fz - 0.1)).toBeNull();
    expect(shipWalkwayAt(SHIP_DOOR[0] + 1, SHIP_DOOR[1])).toBeNull();
  });

  it('rises in a straight slope from the ice to the deck, and the deck goes on to the door', () => {
    const [fx, fz] = SHIP_GANGWAY_FOOT;
    const [tx, tz] = SHIP_GANGWAY_TOP;
    const footY = 0.02;
    const deckY = WATER + SHIP_DECK_ABOVE_WATER;
    expect(shipWalkHeight(fx, fz, footY, WATER)).toBeCloseTo(footY, 9);
    expect(shipWalkHeight(tx, tz, footY, WATER)).toBeCloseTo(deckY, 9);
    expect(shipWalkHeight(SHIP_DOOR[0], SHIP_DOOR[1], footY, WATER)).toBeCloseTo(WATER + SHIP_DOOR_DECK_ABOVE_WATER, 9);
    expect(shipWalkHeight(fx + 1, fz, footY, WATER)).toBeNull();
    let before = -Infinity;
    for (let i = 0; i <= 10; i++) {
      const y = shipWalkHeight(fx, fz + ((tz - fz) * i) / 10, footY, WATER)!;
      expect(y).toBeGreaterThan(before);
      before = y;
    }
    // Gentle enough for a dog: under 20 degrees.
    expect(Math.atan2(deckY - footY, tz - fz)).toBeLessThan((20 * Math.PI) / 180);
  });

  it('has the file climb the whole gangway and cross the foredeck to the door, on the walkway from the foot on', () => {
    const pts = scenePathPoints(board);
    const foot = pts.findIndex(([x, z]) => x === SHIP_GANGWAY_FOOT[0] && z === SHIP_GANGWAY_FOOT[1]);
    expect(foot).toBeGreaterThan(0);
    expect(pts[pts.length - 1]).toEqual(SHIP_DOOR);
    for (const [x, z] of pts.slice(foot)) expect(shipWalkwayAt(x, z), `(${x}, ${z})`).not.toBeNull();
    // Each straight stretch from the foot on stays on the walkway too.
    for (let i = foot; i < pts.length - 1; i++) {
      for (let k = 1; k < 10; k++) {
        const x = pts[i][0] + ((pts[i + 1][0] - pts[i][0]) * k) / 10;
        const z = pts[i][1] + ((pts[i + 1][1] - pts[i][1]) * k) / 10;
        expect(shipWalkwayAt(x, z), `(${x.toFixed(2)}, ${z.toFixed(2)})`).not.toBeNull();
      }
    }
  });

  it('has the dogs, Poncho among them, and the man who leads them go aboard when the sentence about the dogs is told', () => {
    expect(board.board).toBe(true);
    const walkers = scene.elements.filter((e) => e.path === 'board');
    expect(walkers.filter((e) => e.kind === 'dog').length).toBeGreaterThanOrEqual(6);
    expect(walkers.some((e) => e.kind === 'dog' && e.id === 'poncho')).toBe(true);
    expect(walkers.some((e) => e.kind === 'person')).toBe(true);
    for (const e of walkers) expect(e.appearAt).toBe(1);
  });

  it('is a whole ship in the scene: the prop that stands for it is there from the first sentence', () => {
    const ship = scene.elements.filter((e) => e.id === 'icebreakerShip');
    expect(ship).toHaveLength(1);
    expect(ship[0].appearAt ?? 0).toBe(0);
    expect(ship[0].until).toBeUndefined();
  });
});

describe('a walk that ends at a door', () => {
  const end = board.delay + board.duration;

  it('takes everyone of the file all the way, one behind the other, and each is gone once there', () => {
    for (const lag of [0, 1.2, 3.6, 7.2]) {
      // Short of the end: still walking, not gone.
      const before = sceneWalk(board, end + lag - 0.5, lag);
      expect(before.gone).toBe(false);
      expect(before.moving).toBe(true);
      // At the end: at the door and gone (not walking on the spot).
      const after = sceneWalk(board, end + lag + 0.1, lag);
      expect(after.gone).toBe(true);
      expect(after.moving).toBe(false);
      expect(after.x).toBeCloseTo(SHIP_DOOR[0], 6);
      expect(after.z).toBeCloseTo(SHIP_DOOR[1], 6);
      expect(after.travel).toBeCloseTo(scenePathLength(board), 6);
    }
    // While the head of the file is gone, the last one is still on the way.
    const t = end + 0.5;
    expect(sceneWalk(board, t, 0).gone).toBe(true);
    expect(sceneWalk(board, t, 7.2).gone).toBe(false);
  });

  it('leaves the other walks as they were: a file that only ends stops spaced along the path and stays', () => {
    const plain = { ...board, board: undefined };
    const late = sceneWalk(plain, 1e4, 4.8);
    expect(late.gone).toBe(false);
    expect(Math.hypot(late.x - SHIP_DOOR[0], late.z - SHIP_DOOR[1])).toBeGreaterThan(1);
  });
});

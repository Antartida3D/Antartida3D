import { describe, expect, it } from 'vitest';
import {
  DOUBLE_TAP_MS, DOUBLE_TAP_PX, DOUBLE_TAP_ZOOM, ONE_FINGER_IDLE, SHEET_SNAP_PX, SHEET_TAP_PX, TAP_DRAG_DOUBLING_PX, TAP_MAX_MS, TAP_MOVE_PX,
  legendSwipe, legendSwipeStarts, moveTwoFingers, oneFingerDown, oneFingerMove, oneFingerUp, sheetAfterDrag, startTwoFingers, tapDragZoom,
  type OneFingerZoomState, type TwoFingerState,
} from '../src/index.ts';

type Point = { x: number; y: number };
/** Runs a gesture through its moves and adds up what it did. */
function run(a: Point, b: Point, moves: readonly (readonly [Point, Point])[]) {
  let state: TwoFingerState = startTwoFingers(a, b);
  const total = { zoom: 1, turn: 0, tilt: 0 };
  for (const [p, q] of moves) {
    const step = moveTwoFingers(state, p, q);
    state = step.state;
    total.zoom *= step.zoom;
    total.turn += step.turn;
    total.tilt += step.tilt;
  }
  return { ...total, mode: state.mode };
}
const steps = (n: number, at: (i: number) => readonly [Point, Point]) => Array.from({ length: n }, (_, i) => at(i + 1));

describe('two fingers on the 3D map', () => {
  const a = { x: 150, y: 400 };
  const b = { x: 250, y: 400 };

  it('does nothing until the fingers have moved enough to tell the gesture', () => {
    const still = run(a, b, [[{ x: 152, y: 401 }, { x: 251, y: 399 }]]);
    expect(still).toEqual({ zoom: 1, turn: 0, tilt: 0, mode: 'undecided' });
  });

  it('zooms in when the fingers spread and out when they pinch, without tilting', () => {
    const spread = run(a, b, steps(10, (i) => [{ x: 150 - i * 5, y: 400 }, { x: 250 + i * 5, y: 400 }]));
    expect(spread.mode).toBe('zoomTurn');
    expect(spread.zoom).toBeCloseTo(2, 6); // 100 px apart to 200 px
    expect(spread.tilt).toBe(0);
    const pinch = run(a, b, steps(10, (i) => [{ x: 150 + i * 2.5, y: 400 }, { x: 250 - i * 2.5, y: 400 }]));
    expect(pinch.zoom).toBeCloseTo(0.5, 6);
  });

  it('turns by the angle the fingers twist, clockwise on screen positive', () => {
    const mid = { x: 200, y: 400 };
    const at = (deg: number) => {
      const r = (deg * Math.PI) / 180;
      return [
        { x: mid.x - 50 * Math.cos(r), y: mid.y - 50 * Math.sin(r) },
        { x: mid.x + 50 * Math.cos(r), y: mid.y + 50 * Math.sin(r) },
      ] as const;
    };
    const twist = run(a, b, steps(9, (i) => at(i * 5)));
    expect(twist.mode).toBe('zoomTurn');
    expect(twist.turn).toBeCloseTo(Math.PI / 4, 6);
    expect(twist.zoom).toBeCloseTo(1, 6);
    expect(run(a, b, steps(9, (i) => at(-i * 5))).turn).toBeCloseTo(-Math.PI / 4, 6);
  });

  it('tilts when both fingers go up or down together, without zooming or turning', () => {
    const up = run(a, b, steps(10, (i) => [{ x: 150, y: 400 - i * 6 }, { x: 251, y: 400 - i * 6 }]));
    expect(up.mode).toBe('tilt');
    expect(up.tilt).toBeCloseTo(-60, 6);
    expect(up.zoom).toBe(1);
    expect(up.turn).toBe(0);
  });

  it('keeps its mode until a finger lifts: a pinch that drifts does not tilt', () => {
    const moves = [
      ...steps(5, (i) => [{ x: 150 - i * 6, y: 400 }, { x: 250 + i * 6, y: 400 }] as const),
      ...steps(5, (i) => [{ x: 120, y: 400 + i * 10 }, { x: 280, y: 400 + i * 10 }] as const),
    ];
    const drifted = run(a, b, moves);
    expect(drifted.mode).toBe('zoomTurn');
    expect(drifted.tilt).toBe(0);
  });

  it('does not take two fingers moving sideways together for a tilt', () => {
    const sideways = run(a, b, steps(10, (i) => [{ x: 150 + i * 6, y: 400 + i }, { x: 250 + i * 6, y: 400 + i }]));
    expect(sideways.mode).not.toBe('tilt');
    expect(sideways.tilt).toBe(0);
  });
});

describe('bottom sheet handle', () => {
  it('switches between small and tall on a tap', () => {
    expect(sheetAfterDrag('small', 0)).toBe('tall');
    expect(sheetAfterDrag('tall', 3)).toBe('small');
  });

  it('goes one step the way it is dragged, past the snap distance', () => {
    expect(sheetAfterDrag('small', SHEET_SNAP_PX)).toBe('tall');
    expect(sheetAfterDrag('tall', -SHEET_SNAP_PX)).toBe('small');
    // Dragging a tall sheet further up changes nothing.
    expect(sheetAfterDrag('tall', 200)).toBe('tall');
  });

  it('closes when a small sheet is dragged down', () => {
    expect(sheetAfterDrag('small', -SHEET_SNAP_PX)).toBe('closed');
    // A tall one only comes down to small, however far it is dragged.
    expect(sheetAfterDrag('tall', -600)).toBe('small');
  });

  it('falls back to the size it had after a short drag', () => {
    expect(sheetAfterDrag('small', SHEET_SNAP_PX - 1)).toBe('small');
    expect(sheetAfterDrag('small', -(SHEET_SNAP_PX - 1))).toBe('small');
    expect(sheetAfterDrag('tall', -(SHEET_SNAP_PX - 1))).toBe('tall');
  });

  it('stops at peek instead of closing when the floor is peek', () => {
    expect(sheetAfterDrag('small', -SHEET_SNAP_PX, 'peek')).toBe('peek');
    expect(sheetAfterDrag('peek', -600, 'peek')).toBe('peek');
    expect(sheetAfterDrag('tall', -600, 'peek')).toBe('small');
  });

  it('goes up one size at a time from peek', () => {
    expect(sheetAfterDrag('peek', SHEET_SNAP_PX, 'peek')).toBe('small');
    expect(sheetAfterDrag('peek', 600, 'peek')).toBe('small');
    expect(sheetAfterDrag('small', SHEET_SNAP_PX, 'peek')).toBe('tall');
  });

  it('cycles peek, small and tall on taps', () => {
    expect(sheetAfterDrag('peek', 0, 'peek')).toBe('small');
    expect(sheetAfterDrag('small', 0, 'peek')).toBe('tall');
    expect(sheetAfterDrag('tall', 0, 'peek')).toBe('small');
    expect(sheetAfterDrag('peek', SHEET_SNAP_PX - 1, 'peek')).toBe('peek');
  });
});

describe('swiping the map legend', () => {
  it('is a tap while the finger moves less than the tap distance', () => {
    expect(legendSwipe(0, 0)).toEqual({ x: 0, y: 0, drag: false, closes: false });
    expect(legendSwipe(-(SHEET_TAP_PX - 1), 0).drag).toBe(false);
  });

  it('closes when swiped left or down past the snap distance', () => {
    expect(legendSwipe(-SHEET_SNAP_PX, 0)).toEqual({ x: -SHEET_SNAP_PX, y: 0, drag: true, closes: true });
    expect(legendSwipe(0, SHEET_SNAP_PX)).toEqual({ x: 0, y: SHEET_SNAP_PX, drag: true, closes: true });
    // A diagonal follows the axis the finger moves most.
    expect(legendSwipe(-80, 30)).toEqual({ x: -80, y: 0, drag: true, closes: true });
    expect(legendSwipe(-20, 90)).toEqual({ x: 0, y: 90, drag: true, closes: true });
  });

  it('goes back after a short swipe', () => {
    expect(legendSwipe(-(SHEET_SNAP_PX - 1), 0).closes).toBe(false);
    expect(legendSwipe(0, SHEET_SNAP_PX - 1).closes).toBe(false);
  });

  it('does not move or close right or up, but that is still a drag and not a tap', () => {
    expect(legendSwipe(120, 0)).toEqual({ x: 0, y: 0, drag: true, closes: false });
    expect(legendSwipe(10, -120)).toEqual({ x: 0, y: 0, drag: true, closes: false });
  });

  it('starts a swipe only left, or down from the top of the text', () => {
    expect(legendSwipeStarts(-10, 2, 0)).toBe(true);
    expect(legendSwipeStarts(2, 10, 0)).toBe(true);
    // Up or right: the page keeps the move.
    expect(legendSwipeStarts(10, 2, 0)).toBe(false);
    expect(legendSwipeStarts(2, -10, 0)).toBe(false);
  });

  it('lets a scrolled list scroll back up instead of closing the legend', () => {
    expect(legendSwipeStarts(2, 10, 40)).toBe(false);
    // Sideways it still closes, scrolled or not.
    expect(legendSwipeStarts(-10, 2, 40)).toBe(true);
  });
});

describe('one finger zooms like in a phone map app (#165)', () => {
  /** Taps once at (x, y), landing at `t` ms and lifting 80 ms later. */
  const tap = (state: OneFingerZoomState, x: number, y: number, t: number) =>
    oneFingerUp(oneFingerDown(state, { x, y, t }), { x, y, t: t + 80 });

  it('a second tap close in time and place is a double tap', () => {
    const first = tap(ONE_FINGER_IDLE, 200, 400, 0);
    expect(first.doubleTap).toBe(false);
    const down = oneFingerDown(first.state, { x: 210, y: 405, t: 80 + DOUBLE_TAP_MS - 1 });
    expect(down.down?.second).toBe(true);
    const up = oneFingerUp(down, { x: 210, y: 405, t: 500 });
    expect(up.doubleTap).toBe(true);
    // Done: a third tap starts over, it is not another double tap.
    expect(oneFingerDown(up.state, { x: 210, y: 405, t: 550 }).down?.second).toBe(false);
  });

  it('a second tap that comes too late or too far away is a new first tap', () => {
    const first = tap(ONE_FINGER_IDLE, 200, 400, 0).state;
    expect(oneFingerDown(first, { x: 200, y: 400, t: 80 + DOUBLE_TAP_MS + 1 }).down?.second).toBe(false);
    expect(oneFingerDown(first, { x: 200 + DOUBLE_TAP_PX + 1, y: 400, t: 150 }).down?.second).toBe(false);
  });

  it('a drag or a long press is not the first tap of a double tap', () => {
    const dragged = oneFingerMove(oneFingerDown(ONE_FINGER_IDLE, { x: 200, y: 400, t: 0 }), { x: 200 + TAP_MOVE_PX, y: 400 });
    expect(dragged.zoom).toBe(1);
    const afterDrag = oneFingerUp(dragged.state, { x: 200, y: 400, t: 80 }).state;
    expect(oneFingerDown(afterDrag, { x: 200, y: 400, t: 150 }).down?.second).toBe(false);
    const held = oneFingerUp(oneFingerDown(ONE_FINGER_IDLE, { x: 200, y: 400, t: 0 }), { x: 200, y: 400, t: TAP_MAX_MS + 1 }).state;
    expect(oneFingerDown(held, { x: 200, y: 400, t: TAP_MAX_MS + 50 }).down?.second).toBe(false);
  });

  it('dragging the second touch up zooms in and down zooms out, from where it landed', () => {
    let state = oneFingerDown(tap(ONE_FINGER_IDLE, 200, 400, 0).state, { x: 200, y: 400, t: 150 });
    // Short of a tap's move nothing happens yet.
    let step = oneFingerMove(state, { x: 200, y: 400 - (TAP_MOVE_PX - 1) });
    expect(step.zoom).toBe(1);
    step = oneFingerMove(step.state, { x: 200, y: 400 - TAP_DRAG_DOUBLING_PX });
    expect(step.zoom).toBeCloseTo(2, 9);
    // Back down past where it landed: the factor is from the start, not from the last move.
    step = oneFingerMove(step.state, { x: 205, y: 400 + TAP_DRAG_DOUBLING_PX });
    expect(step.zoom).toBeCloseTo(0.5, 9);
    state = step.state;
    // Lifted after dragging: no extra step.
    expect(oneFingerUp(state, { x: 205, y: 550, t: 900 }).doubleTap).toBe(false);
  });

  it('a second touch held still for long and let go is still a double tap', () => {
    const down = oneFingerDown(tap(ONE_FINGER_IDLE, 200, 400, 0).state, { x: 200, y: 400, t: 150 });
    expect(oneFingerUp(oneFingerMove(down, { x: 203, y: 402 }).state, { x: 203, y: 402, t: 2000 }).doubleTap).toBe(true);
  });

  it('a first touch never zooms, it is left to pan', () => {
    const down = oneFingerDown(ONE_FINGER_IDLE, { x: 200, y: 400, t: 0 });
    expect(oneFingerMove(down, { x: 200, y: 100 }).zoom).toBe(1);
  });

  it('the zoom factor of the drag is symmetric up and down', () => {
    expect(tapDragZoom(0)).toBe(1);
    expect(tapDragZoom(-75) * tapDragZoom(75)).toBeCloseTo(1, 12);
    expect(DOUBLE_TAP_ZOOM).toBeGreaterThan(1);
  });
});

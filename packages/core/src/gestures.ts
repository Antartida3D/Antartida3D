type Point = { x: number; y: number };

/**
 * Two fingers on the 3D map, like in a globe app: spreading or pinching zooms, twisting turns the
 * camera, and dragging both up or down tilts it. The gesture picks one of two modes when the
 * fingers have moved enough to tell, and keeps it until a finger lifts: a pinch never tilts by
 * accident, and a tilt never zooms.
 */
export type TwoFingerMode = 'undecided' | 'tilt' | 'zoomTurn';

export interface TwoFingerState {
  mode: TwoFingerMode;
  /** Where the fingers were when the second one landed. */
  start: readonly [Point, Point];
  /** Where they were at the last move. */
  last: readonly [Point, Point];
}

export interface TwoFingerStep {
  state: TwoFingerState;
  /** Factor to multiply the scale of the view by: over 1 zooms in. */
  zoom: number;
  /** Radians the fingers twisted, clockwise on screen positive. */
  turn: number;
  /** Px both fingers moved down the screen. */
  tilt: number;
}

/** Px a finger moves before the gesture picks its mode. */
export const TWO_FINGER_START_PX = 10;
/** Dragging both fingers this fraction of the screen height tilts through the whole range. */
export const TILT_SCREEN_FRACTION = 0.4;

const distance = ([a, b]: readonly [Point, Point]) => Math.hypot(b.x - a.x, b.y - a.y);
const angle = ([a, b]: readonly [Point, Point]) => Math.atan2(b.y - a.y, b.x - a.x);
/** Difference between two angles, in -π..π. */
const turnBetween = (from: number, to: number) => Math.atan2(Math.sin(to - from), Math.cos(to - from));

export function startTwoFingers(a: Point, b: Point): TwoFingerState {
  return { mode: 'undecided', start: [a, b], last: [a, b] };
}

function pickMode(start: readonly [Point, Point], now: readonly [Point, Point]): TwoFingerMode {
  const moved = [0, 1].map((i) => ({ x: now[i].x - start[i].x, y: now[i].y - start[i].y }));
  const spread = Math.abs(distance(now) - distance(start));
  // Arc each finger travelled around the middle while twisting.
  const twist = (Math.abs(turnBetween(angle(start), angle(now))) * distance(start)) / 2;
  // Both fingers go the same way, up or down, more than they go sideways or apart.
  const together = Math.sign(moved[0].y) === Math.sign(moved[1].y);
  const down = Math.min(Math.abs(moved[0].y), Math.abs(moved[1].y));
  const sideways = Math.max(Math.abs(moved[0].x), Math.abs(moved[1].x));
  if (together && down >= TWO_FINGER_START_PX && down > sideways && down > spread && down > twist) return 'tilt';
  if (spread >= TWO_FINGER_START_PX || twist >= TWO_FINGER_START_PX) return 'zoomTurn';
  return 'undecided';
}

/** What the fingers did since the last move. Nothing happens until the gesture has picked its mode. */
export function moveTwoFingers(state: TwoFingerState, a: Point, b: Point): TwoFingerStep {
  const now = [a, b] as const;
  const mode = state.mode === 'undecided' ? pickMode(state.start, now) : state.mode;
  // The move that picks the mode counts from the start, so the first px are not lost.
  const from = state.mode === 'undecided' ? state.start : state.last;
  const next = { mode, start: state.start, last: now };
  if (mode === 'undecided') return { state: { ...next, last: state.last }, zoom: 1, turn: 0, tilt: 0 };
  if (mode === 'tilt') return { state: next, zoom: 1, turn: 0, tilt: (a.y - from[0].y + b.y - from[1].y) / 2 };
  return { state: next, zoom: distance(now) / Math.max(distance(from), 1), turn: turnBetween(angle(from), angle(now)), tilt: 0 };
}

/**
 * One finger zooms like in a phone map app (#165). Tapping twice zooms in one step around the
 * tapped point. Tapping twice and keeping the second touch down, then dragging up zooms in and
 * dragging down zooms out, for as long as the finger moves; letting go without moving is a plain
 * double tap. The pan of one finger stays for any other touch.
 */
export interface TimedPoint {
  x: number;
  y: number;
  /** Ms, from the event's timeStamp. */
  t: number;
}

export interface OneFingerZoomState {
  /** The finger that is down: where and when it landed, whether it is the second tap of a double tap, and whether it moved past a tap. */
  down: (TimedPoint & { second: boolean; moved: boolean }) | null;
  /** The last tap that lifted, waiting for a second one. */
  lastTap: TimedPoint | null;
}

/** Ms from the first tap lifting to the second one landing. */
export const DOUBLE_TAP_MS = 300;
/** Px between the two taps of a double tap. */
export const DOUBLE_TAP_PX = 50;
/** A finger that moves less than this is still tapping. */
export const TAP_MOVE_PX = 10;
/** The first tap lifts within this many ms; a longer press is not the start of a double tap. */
export const TAP_MAX_MS = 300;
/** Factor a double tap zooms in by. */
export const DOUBLE_TAP_ZOOM = 2;
/** Dragging the second touch this many px up doubles the zoom; as many down halves it. */
export const TAP_DRAG_DOUBLING_PX = 150;

export const ONE_FINGER_IDLE: OneFingerZoomState = { down: null, lastTap: null };

/** A lone finger lands. `down.second` says it is the second tap: from now on it zooms, it does not pan. */
export function oneFingerDown(state: OneFingerZoomState, p: TimedPoint): OneFingerZoomState {
  const last = state.lastTap;
  const second =
    last !== null && p.t - last.t <= DOUBLE_TAP_MS && Math.hypot(p.x - last.x, p.y - last.y) <= DOUBLE_TAP_PX;
  return { down: { ...p, second, moved: false }, lastTap: null };
}

/**
 * The finger moved. `zoom` is the factor to multiply the scale of the view by since the second
 * touch landed (over 1 zooms in); it stays 1 until the finger moves past a tap, and for any
 * touch that is not a second tap.
 */
export function oneFingerMove(state: OneFingerZoomState, p: { x: number; y: number }): { state: OneFingerZoomState; zoom: number } {
  const d = state.down;
  if (!d) return { state, zoom: 1 };
  const moved = d.moved || Math.hypot(p.x - d.x, p.y - d.y) >= TAP_MOVE_PX;
  const next = moved === d.moved ? state : { ...state, down: { ...d, moved } };
  return { state: next, zoom: d.second && moved ? tapDragZoom(p.y - d.y) : 1 };
}

/** Zoom factor for the second touch dragged `dy` px down the screen: up zooms in, down zooms out. */
export function tapDragZoom(dy: number): number {
  return 2 ** (-dy / TAP_DRAG_DOUBLING_PX);
}

/** The finger lifts. `doubleTap` is true when it ended a double tap without dragging: zoom in one step around `down`. */
export function oneFingerUp(state: OneFingerZoomState, p: TimedPoint): { state: OneFingerZoomState; doubleTap: boolean } {
  const d = state.down;
  if (!d) return { state: ONE_FINGER_IDLE, doubleTap: false };
  const moved = d.moved || Math.hypot(p.x - d.x, p.y - d.y) >= TAP_MOVE_PX;
  if (d.second) return { state: ONE_FINGER_IDLE, doubleTap: !moved };
  const tap = !moved && p.t - d.t <= TAP_MAX_MS;
  return { state: { down: null, lastTap: tap ? { x: d.x, y: d.y, t: p.t } : null }, doubleTap: false };
}

/** Px a sheet is dragged by its handle before it snaps to the other size. */
export const SHEET_SNAP_PX = 40;
/** A press that moves less than this is a tap, not a drag. */
export const SHEET_TAP_PX = 6;

/** `peek` shows only the top of a sheet that never closes (its title and main button). */
export type SheetSize = 'peek' | 'small' | 'tall' | 'closed';

/**
 * Size of a bottom sheet after its handle is let go. `draggedUp` is how far the finger went, in
 * px, up the screen positive. A tap goes up one size (peek to small, small to tall) and from tall
 * back to small. A drag past SHEET_SNAP_PX goes one step the way it was dragged: up towards tall,
 * down towards `floor`. With the default floor, down from small closes the sheet; a sheet that must
 * stay on screen passes `floor = 'peek'` and stops there. A shorter drag keeps the size it had.
 */
export function sheetAfterDrag(
  size: 'peek' | 'small' | 'tall',
  draggedUp: number,
  floor: 'closed' | 'peek' = 'closed'
): SheetSize {
  if (Math.abs(draggedUp) < SHEET_TAP_PX) return size === 'small' ? 'tall' : 'small';
  if (draggedUp >= SHEET_SNAP_PX) return size === 'peek' ? 'small' : 'tall';
  if (draggedUp <= -SHEET_SNAP_PX) return size === 'tall' ? 'small' : floor;
  return size;
}

/**
 * A finger swiping the open map legend, `dx` and `dy` px from where it landed (right and down
 * positive). The legend sits at the bottom left of the screen, so it closes towards that corner:
 * it follows the finger only along the axis the finger moves most, and only left or down. Let go
 * past SHEET_SNAP_PX it closes; short of that it goes back. A move shorter than SHEET_TAP_PX is a
 * tap (`drag` false), so the legend button still works.
 */
export function legendSwipe(dx: number, dy: number): { x: number; y: number; drag: boolean; closes: boolean } {
  if (Math.hypot(dx, dy) < SHEET_TAP_PX) return { x: 0, y: 0, drag: false, closes: false };
  if (Math.abs(dx) >= Math.abs(dy)) {
    const x = Math.min(dx, 0);
    return { x, y: 0, drag: true, closes: -x >= SHEET_SNAP_PX };
  }
  const y = Math.max(dy, 0);
  return { x: 0, y, drag: true, closes: y >= SHEET_SNAP_PX };
}

/**
 * Whether the first move of a finger on the open legend (once it is a drag, see legendSwipe)
 * starts a swipe towards closing it: left, or down from the top of the text under the finger.
 * Up, right, or down through text scrolled `scrolledTop` px from its top leave the move to the
 * page, so a legend list that scrolls on a short screen still scrolls under the finger.
 */
export function legendSwipeStarts(dx: number, dy: number, scrolledTop: number): boolean {
  if (Math.abs(dx) >= Math.abs(dy)) return dx < 0;
  return dy > 0 && scrolledTop <= 0;
}

/** Smallest distance in screen px between the centres of two markers: more room on a wide screen. */
export const MARKER_GAP_PX = 60;
export const MARKER_GAP_WIDE_PX = 80;
export const markerGap = (vw: number) => (vw > 820 ? MARKER_GAP_WIDE_PX : MARKER_GAP_PX);

/** Height in px of the stick that holds a marker over its place in the 3D map (`--lift` in painted.css). */
export const MARKER_STICK_PX = 34;

/**
 * How high a marker moved by (dx, dy) stands over its place in the 3D map: the farther it moved the
 * taller, so the lines stay steep, and never so low that its head ends up on its own place (a marker
 * pushed down would lose its stick): the head always stands at least a stick above it.
 */
export function markerLift(dx: number, dy: number): number {
  return Math.max(MARKER_STICK_PX + Math.hypot(dx, dy) * 0.5, MARKER_STICK_PX + dy);
}

/**
 * The thin line from a marker's head to its real place, for a marker moved by (dx, dy) and standing
 * `lift` px over it: how long it is and how far to turn it from straight down (radians, clockwise).
 */
export function guideLine(dx: number, dy: number, lift: number): { length: number; angle: number } {
  const down = lift - dy;
  return { length: Math.hypot(dx, down), angle: Math.atan2(dx, down) };
}

export interface ScreenPos {
  left: number;
  top: number;
}

/** How far a marker moves on screen from its real place. */
export interface Offset {
  dx: number;
  dy: number;
}

/** Most rounds of pushing pairs apart; a crowd settles long before. */
const FAN_ROUNDS = 300;
/** A pair this close to the gap, in px, counts as apart. */
const FAN_SLACK_PX = 0.001;

/**
 * Fans out the markers that crowd each other on screen (#238). Every pair closer than `gap` px is
 * pushed apart along the line between the two, half of what is missing each, round after round until
 * every pair is `gap` px apart. Markers alone do not move. The result has one offset per entry, in order.
 *
 * Each marker moves only as far as its own neighbours need, so a chain of neighbours does not drag
 * a far marker along, and a small move of the map gives a small move of the markers: nothing jumps
 * when a pair crosses the gap (#253). Two markers `gap - e` apart move `e / 2` each, so they
 * separate smoothly while the view zooms out and come back to their real place on zooming in.
 */
export function fanOffsets(screen: readonly ScreenPos[], gap = MARKER_GAP_PX): Offset[] {
  const at = screen.map((p) => ({ x: p.left, y: p.top }));
  for (let round = 0; round < FAN_ROUNDS; round++) {
    let missing = 0;
    for (let i = 0; i < at.length; i++) {
      for (let j = i + 1; j < at.length; j++) {
        const a = at[i];
        const b = at[j];
        let ux = b.x - a.x;
        let uy = b.y - a.y;
        const d = Math.hypot(ux, uy);
        if (d >= gap) continue;
        missing = Math.max(missing, gap - d);
        if (d < 1e-6) {
          // On one spot there is no line between the two: each pair takes a direction of its own,
          // so that a crowd on one spot opens round it and not along one line.
          const angle = 2.399963 * (i * 7 + j);
          ux = Math.cos(angle);
          uy = Math.sin(angle);
        } else {
          ux /= d;
          uy /= d;
        }
        const half = (gap - d) / 2;
        a.x -= ux * half;
        a.y -= uy * half;
        b.x += ux * half;
        b.y += uy * half;
      }
    }
    if (missing < FAN_SLACK_PX) break;
  }
  return screen.map((p, i) => ({ dx: at[i].x - p.left, dy: at[i].y - p.top }));
}

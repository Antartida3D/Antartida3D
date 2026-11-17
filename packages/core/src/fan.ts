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

/**
 * Fans out the markers that crowd each other on screen (#238). Markers closer than `gap` px, one by
 * one or through a chain of neighbours, form a crowd: its members go to the corners of a regular
 * polygon around the crowd centre, just wide enough to be `gap` px apart, keeping the order they
 * had around that centre. Markers alone do not move. The result has one offset per entry, in order.
 *
 * Moving by the shortfall keeps it continuous: two markers `gap - e` apart move `e / 2` each, so
 * they separate smoothly while the view zooms out and come back to their real place on zooming in.
 */
export function fanOffsets(screen: readonly ScreenPos[], gap = MARKER_GAP_PX): Offset[] {
  const offsets = screen.map(() => ({ dx: 0, dy: 0 }));
  const seen = screen.map(() => false);

  screen.forEach((_, start) => {
    if (seen[start]) return;
    const crowd = [start];
    seen[start] = true;
    for (let k = 0; k < crowd.length; k++) {
      const a = screen[crowd[k]];
      screen.forEach((b, j) => {
        if (!seen[j] && Math.hypot(a.left - b.left, a.top - b.top) < gap) {
          seen[j] = true;
          crowd.push(j);
        }
      });
    }
    const n = crowd.length;
    if (n < 2) return;

    const cx = crowd.reduce((s, i) => s + screen[i].left, 0) / n;
    const cy = crowd.reduce((s, i) => s + screen[i].top, 0) / n;
    const around = crowd
      .map((i) => ({ i, angle: Math.atan2(screen[i].top - cy, screen[i].left - cx) }))
      .sort((p, q) => p.angle - q.angle || p.i - q.i);
    const radius = gap / (2 * Math.sin(Math.PI / n));
    // Start where the first member already is; if the crowd sits on one spot, start straight up.
    const first = screen[around[0].i];
    const start0 = Math.hypot(first.left - cx, first.top - cy) < 1e-6 ? -Math.PI / 2 : around[0].angle;
    around.forEach(({ i }, k) => {
      const angle = start0 + (2 * Math.PI * k) / n;
      offsets[i] = { dx: cx + radius * Math.cos(angle) - screen[i].left, dy: cy + radius * Math.sin(angle) - screen[i].top };
    });
  });
  return offsets;
}

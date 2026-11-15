import { VOYAGE_POINT } from './content/points.ts';
import { focusWorld, type Size, type View } from './viewport.ts';

/**
 * Zoom of the first-visit view (#115): close enough that Ushuaia stands out, wide enough that the
 * way south to the Antarctic Peninsula is still on the screen.
 */
export const WELCOME_K = 3;

/**
 * First visit: the map comes close to «Desde Ushuaia», the first expedition, so a new user knows
 * where to start (#115). On a phone the overview does not even show it. The map edge keeps
 * Ushuaia a little left of the centre (clampView).
 */
export function welcomeView(size: Size): View {
  return focusWorld(size, VOYAGE_POINT.x, VOYAGE_POINT.y, WELCOME_K);
}

/** Only on the first visit, and never once the trip from Ushuaia is done. */
export function showsWelcome(seen: boolean, explored: readonly string[]): boolean {
  return !seen && !explored.includes(VOYAGE_POINT.id);
}

/**
 * The welcome waits for the page to settle (#115): while the 3D layer, the textures and the
 * meshes load, the page stutters, and a camera move then jumps instead of easing. After the
 * page's `load`, it waits for SETTLE_FRAMES smooth frames in a row (each under SMOOTH_FRAME_MS),
 * and at least SETTLE_MIN_MS. On a slow device the frames may never get smooth: SETTLE_MAX_MS
 * after `load` it goes anyway.
 */
export const SETTLE_FRAMES = 12;
export const SMOOTH_FRAME_MS = 50;
export const SETTLE_MIN_MS = 600;
export const SETTLE_MAX_MS = 4000;

/** Counts smooth frames; `frame` returns true once the page has settled. */
export function settleTracker() {
  let smooth = 0;
  let last = NaN;
  return {
    /** `now`: milliseconds since the page's `load` (the rAF timestamp minus that moment). */
    frame(now: number): boolean {
      smooth = now - last < SMOOTH_FRAME_MS ? smooth + 1 : 0;
      last = now;
      if (now >= SETTLE_MAX_MS) return true;
      return now >= SETTLE_MIN_MS && smooth >= SETTLE_FRAMES;
    },
  };
}

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

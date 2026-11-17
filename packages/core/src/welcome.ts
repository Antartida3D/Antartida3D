import { VOYAGE_POINT, type MapPoint } from './content/points.ts';
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
export function welcomeView(size: Size, point: Pick<MapPoint, 'x' | 'y'> = VOYAGE_POINT): View {
  return focusWorld(size, point.x, point.y, WELCOME_K);
}

/** Gap kept between the card and the viewport edges, and between the pin and the card. */
export const START_HERE_MARGIN = 16;
export const START_HERE_GAP = 30;

export interface StartHerePlacement {
  /** Top-left corner of the card, in viewport pixels. */
  left: number;
  top: number;
  /** Horizontal position of the arrow inside the card, so it keeps pointing at the pin. */
  arrowX: number;
  /** False while the pin is off the screen: the card hides instead of pointing at nothing. */
  visible: boolean;
}

/**
 * Where the «Empezá acá» card (#256) goes: below the pin, kept START_HERE_MARGIN inside the
 * viewport, with its arrow aligned to the pin.
 */
export function startHerePlacement(pin: { left: number; top: number }, card: CardSize, view: Size): StartHerePlacement {
  const m = START_HERE_MARGIN;
  const left = Math.max(m, Math.min(view.vw - card.w - m, pin.left - card.w / 2));
  const top = Math.max(m, Math.min(view.vh - card.h - m, pin.top + START_HERE_GAP));
  const arrowX = Math.max(m, Math.min(card.w - m, pin.left - left));
  const visible = pin.left >= 0 && pin.left <= view.vw && pin.top >= 0 && pin.top <= view.vh;
  return { left, top, arrowX, visible };
}

interface CardSize {
  w: number;
  h: number;
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

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

/** Gap kept between the card and the viewport edges, and between the anchor and the card. */
export const GUIDE_MARGIN = 16;
export const GUIDE_GAP = 14;

/** Box of the element a guide step points at, in viewport pixels. A pin is a small box. */
export interface AnchorBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface GuidePlacement {
  /** Top-left corner of the card, in viewport pixels. */
  left: number;
  top: number;
  /** Horizontal position of the arrow inside the card, so it keeps pointing at the anchor. */
  arrowX: number;
  /** False without an anchor: no arrow, and the ring hides. */
  anchored: boolean;
  /** True when the arrow and the ring are drawn on the anchor; the card then sits `above` it or below it. */
  side: 'above' | 'below';
}

interface CardSize {
  w: number;
  h: number;
}

/**
 * Where a guide step (#256) goes: below (or `above`) its anchor, kept GUIDE_MARGIN inside the
 * viewport, with the arrow aligned to the anchor's centre. Without an anchor, or while the anchor
 * is off the screen, the card goes at the bottom centre with no arrow, so it never disappears.
 */
export function guidePlacement(
  anchor: AnchorBox | null,
  card: CardSize,
  view: Size,
  side: 'above' | 'below' = 'below',
): GuidePlacement {
  const m = GUIDE_MARGIN;
  const cx = anchor ? anchor.left + anchor.width / 2 : 0;
  const cy = anchor ? anchor.top + anchor.height / 2 : 0;
  const onScreen = anchor !== null && cx >= 0 && cx <= view.vw && cy >= 0 && cy <= view.vh;
  if (!anchor || !onScreen) {
    return { left: Math.max(m, (view.vw - card.w) / 2), top: Math.max(m, view.vh - card.h - m), arrowX: card.w / 2, anchored: false, side: 'below' };
  }
  const left = Math.max(m, Math.min(view.vw - card.w - m, cx - card.w / 2));
  const wanted = side === 'above' ? anchor.top - GUIDE_GAP - card.h : anchor.top + anchor.height + GUIDE_GAP;
  const top = Math.max(m, Math.min(view.vh - card.h - m, wanted));
  const arrowX = Math.max(m, Math.min(card.w - m, cx - left));
  return { left, top, arrowX, anchored: true, side };
}

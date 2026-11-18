import { useEffect, useRef, useState, type MouseEvent, type PointerEvent, type ReactNode, type RefObject } from 'react';
import { SHEET_TAP_PX, sheetAfterDrag, type SheetSize } from '@antartida/core';
import { trapTab, useFocusReturn } from './hooks.ts';

/** Sizes a sheet on screen can have. */
export type OpenSheetSize = Exclude<SheetSize, 'closed'>;

/** Part of the height of its container an expanded sheet takes. */
const EXPANDED = 0.92;
/** While dragged down, the sheet does not get shorter than this: the handle stays under the finger. */
const SHEET_MIN_PX = 56;

/**
 * A sheet that comes up from the bottom of a phone screen, with a handle at its top. Dragging
 * the handle, or the sheet itself, up makes the sheet taller, to read more; dragging it down brings it back, and
 * dragging it down again closes the sheet. A tap on
 * the handle, or Enter with the keyboard, switches between the two sizes. On wide screens the
 * sheet is a card in a corner and the handle is hidden (`.sheet-handle` in painted.css).
 *
 * The small size is whatever `max-height` the sheet has in CSS; the tall one is `.sheet.grows.full`.
 *
 * With `floor = 'peek'` the sheet never closes: dragged down from small it shrinks to `.peek`, which
 * the page styles to show only its title and main button. Such a sheet is part of the page, not a
 * dialog: it is a labelled region and Escape does not close it. Pass `size` and `onSize` to let the
 * page know and set the size (for example, to frame the scene above the sheet).
 *
 * A modal sheet (the default) is the one container of every dialog of the app (#264): it brings its own
 * scrim that closes it when tapped, keeps Tab inside, and gives the focus back to whoever opened it.
 */
export function BottomSheet({ className = '', labelledBy, sheetRef, onClose, floor = 'closed', modal = true, scrim, layer, initialFocus = '.btn.primary', fallbackFocus, size: sizeProp, onSize, ceiling = 'tall', children }: {
  /** Extra classes for the sheet, next to `sheet grows`. */
  className?: string;
  /** Id of the heading that names the dialog. */
  labelledBy: string;
  sheetRef: RefObject<HTMLElement | null>;
  /** Escape closes the sheet, and so does dragging it down from its small size. Unused with `floor = 'peek'`. */
  onClose?: () => void;
  /** Smallest size: 'closed' (dragging down from small closes it) or 'peek' (it never closes). */
  floor?: 'closed' | 'peek';
  /**
   * False for a panel beside the map that the map stays usable with (the claims details): a
   * labelled region, not a dialog, that still closes with Escape or dragged down.
   */
  modal?: boolean;
  /** Scrim behind the sheet; tapping it closes the sheet. On by default for a modal sheet, off for a peek or a non-modal one. */
  scrim?: boolean;
  /** `top`: a sheet opened over another one (the sources view), above its scrim too. */
  layer?: 'top';
  /** What takes the focus when a modal sheet opens (a CSS selector inside it). */
  initialFocus?: string;
  /** Where the focus goes back to on close when whoever opened the sheet is gone. */
  fallbackFocus?: () => HTMLElement | null | undefined;
  /** Size set by the page; without it the sheet keeps its own, starting small. */
  size?: OpenSheetSize;
  onSize?: (size: OpenSheetSize) => void;
  /** Tallest size: 'small' when all the content already shows at that size, so raising the sheet would only show empty paper. */
  ceiling?: 'small' | 'tall';
  children: ReactNode;
}) {
  const [ownSize, setOwnSize] = useState<OpenSheetSize>('small');
  const size = sizeProp ?? ownSize;
  const expanded = size === 'tall';
  const setSize = (wanted: OpenSheetSize) => {
    const next = ceiling === 'small' && wanted === 'tall' ? 'small' : wanted;
    setOwnSize(next);
    onSize?.(next);
  };
  /** Height of the sheet at its small size, as last seen: how far a sheet with a small ceiling follows the finger. */
  const smallHeight = useRef(0);
  const persistent = floor === 'peek';
  const isDialog = !persistent && modal;
  const showScrim = scrim ?? isDialog;
  useFocusReturn(isDialog, sheetRef, initialFocus, fallbackFocus);
  // A sheet with no main button takes the focus itself, so Tab stays inside it.
  useEffect(() => {
    const sheet = sheetRef.current;
    if (isDialog && sheet && !sheet.contains(document.activeElement)) sheet.focus({ preventScroll: true });
  }, [isDialog, sheetRef]);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ y: number; height: number } | null>(null);

  // The three steps of a drag, shared by the handle and by the body of the sheet.
  const begin = (y: number) => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    drag.current = { y, height: sheet.getBoundingClientRect().height };
    if (size === 'small') smallHeight.current = drag.current.height;
    setDragging(true);
  };
  const follow = (y: number) => {
    const sheet = sheetRef.current;
    if (!drag.current || !sheet) return;
    // The sheet follows the finger, up to its tall size.
    const tall = (sheet.parentElement?.clientHeight ?? window.innerHeight) * EXPANDED;
    const limit = ceiling === 'small' && smallHeight.current ? smallHeight.current : tall;
    sheet.style.maxHeight = `${Math.min(limit, Math.max(SHEET_MIN_PX, drag.current.height + drag.current.y - y))}px`;
  };
  const release = (y: number) => {
    const sheet = sheetRef.current;
    if (!drag.current || !sheet) return;
    const next = sheetAfterDrag(size, drag.current.y - y, floor);
    drag.current = null;
    // Dragged down from its small size, the sheet closes: it stays where the finger left it until it is gone.
    if (next === 'closed') return onClose?.();
    setSize(next);
    setDragging(false);
    // Back to the sizes of the style sheet: it eases to the one it snapped to.
    sheet.style.maxHeight = '';
  };

  const onDown = (e: PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    begin(e.clientY);
  };

  // A finger anywhere on the sheet drags it too, not only on the handle. Small, the sheet follows
  // the finger up or down. Tall, its text scrolls as usual, and a pull down from the top of the
  // text brings the sheet down. Without this, that pull down reloaded the page on a phone.
  const live = useRef({ expanded, begin, follow, release });
  live.current = { expanded, begin, follow, release };
  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    // Where the finger landed, until the move is told apart; then whether it drags the sheet.
    let press: { x: number; y: number; top: number } | null = null;
    let sheetDrag = false;
    // How far the text under the finger is scrolled: the sheet itself, or a box inside it that scrolls.
    const scrolledBy = (el: Element | null) => {
      let top = 0;
      for (let n = el; n && n !== sheet.parentElement; n = n.parentElement) top += n.scrollTop;
      return top;
    };
    const onStart = (e: TouchEvent) => {
      sheetDrag = false;
      const onHandle = (e.target as Element).closest('.sheet-handle');
      press = e.touches.length === 1 && !onHandle ? { x: e.touches[0].clientX, y: e.touches[0].clientY, top: scrolledBy(e.target as Element) } : null;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!press) return;
      const { clientX: x, clientY: y } = e.touches[0];
      if (!sheetDrag) {
        const [dx, dy] = [x - press.x, y - press.y];
        if (Math.hypot(dx, dy) < SHEET_TAP_PX) return;
        // Sideways, or the text of a tall sheet being read: not a drag of the sheet.
        const pullsDown = dy > 0 && press.top <= 0;
        if (Math.abs(dx) > Math.abs(dy) || (live.current.expanded && !pullsDown)) return void (press = null);
        sheetDrag = true;
        live.current.begin(press.y);
      }
      e.preventDefault(); // the page must not scroll or reload under the finger
      live.current.follow(y);
    };
    const onEnd = (e: TouchEvent) => {
      if (sheetDrag) {
        // No click on whatever the finger started on: it was a drag.
        if (e.cancelable) e.preventDefault();
        live.current.release(e.changedTouches[0].clientY);
      }
      press = null;
      sheetDrag = false;
    };
    sheet.addEventListener('touchstart', onStart, { passive: true });
    sheet.addEventListener('touchmove', onTouchMove, { passive: false });
    sheet.addEventListener('touchend', onEnd);
    sheet.addEventListener('touchcancel', onEnd);
    return () => {
      sheet.removeEventListener('touchstart', onStart);
      sheet.removeEventListener('touchmove', onTouchMove);
      sheet.removeEventListener('touchend', onEnd);
      sheet.removeEventListener('touchcancel', onEnd);
    };
  }, [sheetRef]);

  // A press is handled above. A click that no pointer made (detail 0) comes from the keyboard or
  // a screen reader.
  const onClick = (e: MouseEvent<HTMLButtonElement>) => {
    // A tap never closes the sheet.
    if (e.detail === 0) setSize(sheetAfterDrag(size, 0, floor) as OpenSheetSize);
  };

  return (
    <>
    {showScrim && <div className={`scrim sheet-scrim${layer ? ' sheet-top' : ''}`} onClick={onClose} />}
    <section
      className={`sheet grows${expanded ? ' full' : ''}${size === 'peek' ? ' peek' : ''}${dragging ? ' dragging' : ''}${layer ? ' sheet-top' : ''} ${className}`}
      role={persistent || !modal ? 'region' : 'dialog'}
      aria-modal={persistent || !modal ? undefined : true}
      aria-labelledby={labelledBy}
      ref={sheetRef}
      tabIndex={isDialog ? -1 : undefined}
      onKeyDown={persistent ? undefined : (e) => {
        if (e.key === 'Escape') onClose?.();
        else if (isDialog) trapTab(e, sheetRef.current);
      }}
    >
      <button
        type="button"
        className="sheet-handle"
        aria-expanded={expanded}
        aria-label={expanded ? 'Achicar el panel' : 'Agrandar el panel para ver más'}
        onPointerDown={onDown}
        onPointerMove={(e) => follow(e.clientY)}
        onPointerUp={(e) => release(e.clientY)}
        onPointerCancel={(e) => release(e.clientY)}
        onClick={onClick}
      >
        <span />
      </button>
      {children}
    </section>
    </>
  );
}

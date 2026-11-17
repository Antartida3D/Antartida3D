import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { guidePlacement, type AnchorBox } from '@antartida/core';
import { trapTab, useBackLayer, useFocusReturn } from '../hooks.ts';

export interface GuideAnchor {
  /** Selector of the element the step points at, looked up inside the stage. */
  selector: string;
  /** `round`: a circle around a pin. `box`: a rounded box the size of the element plus 8 px. */
  ring: 'round' | 'box';
}

interface GuideStepProps {
  /** The element to point at; null (or hidden, or off screen): the card goes at the bottom centre. */
  anchor: GuideAnchor | null;
  side?: 'above' | 'below';
  /** The step number: a new one puts the focus on its title. */
  step: number;
  /** Id of the title element inside `children`, which names the dialog. */
  titleId: string;
  /** Closes the guide, whatever the way out. */
  onClose: () => void;
  fallbackFocus?: () => HTMLElement | null | undefined;
  children: ReactNode;
}

const RING_PAD = 4;
/** Half the size a pin counts as: the card keeps clear of its head. */
const PIN_HALF = 20;

/**
 * One step of the first-visit guide (#256): a ring on the anchor and a card next to it, with an
 * arrow. A frame loop reads the anchor's box, so both follow it while the camera moves. The map
 * stays usable with the pointer; the keyboard stays inside the card (Tab), and Escape or the
 * browser's back button close it.
 */
export function GuideStep({ anchor, side = 'below', step, titleId, onClose, fallbackFocus, children }: GuideStepProps) {
  const ring = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLElement>(null);
  const moved = useRef(false);
  useFocusReturn(true, card, '.guide-title', fallbackFocus);
  useBackLayer(true, onClose);

  useEffect(() => {
    if (!moved.current) return void (moved.current = true);
    card.current?.querySelector<HTMLElement>('.guide-title')?.focus();
  }, [step]);

  useEffect(() => {
    let id = 0;
    const tick = () => {
      id = requestAnimationFrame(tick);
      const el = card.current;
      const root = el?.offsetParent as HTMLElement | null;
      if (!el || !root || !ring.current) return;
      const r = root.getBoundingClientRect();
      const target = anchor ? root.querySelector<HTMLElement>(anchor.selector) : null;
      const found = target?.getBoundingClientRect();
      // `display: none` has no boxes at all: the same as no anchor. A pin is a 0 x 0 point: it gets the size of its marker.
      let box: AnchorBox | null = null;
      if (found && target && target.getClientRects().length > 0) {
        box = anchor?.ring === 'round'
          ? { left: found.left - r.left + found.width / 2 - PIN_HALF, top: found.top - r.top + found.height / 2 - PIN_HALF, width: PIN_HALF * 2, height: PIN_HALF * 2 }
          : { left: found.left - r.left, top: found.top - r.top, width: found.width, height: found.height };
      }
      const p = guidePlacement(box, { w: el.offsetWidth, h: el.offsetHeight }, { vw: r.width, vh: r.height }, side);
      el.style.opacity = '1';
      el.dataset.anchored = String(p.anchored);
      el.dataset.side = p.side;
      el.style.transform = `translate3d(${p.left}px, ${p.top}px, 0)`;
      el.style.setProperty('--arrow-x', `${p.arrowX}px`);
      const ringEl = ring.current;
      ringEl.style.visibility = p.anchored ? 'visible' : 'hidden';
      if (!box || !anchor) return;
      if (anchor.ring === 'round') {
        ringEl.style.width = ringEl.style.height = '';
        ringEl.style.transform = `translate3d(${box.left + box.width / 2}px, ${box.top + box.height / 2}px, 0) translate(-50%, -50%)`;
      } else {
        ringEl.style.width = `${box.width + RING_PAD * 2}px`;
        ringEl.style.height = `${box.height + RING_PAD * 2}px`;
        ringEl.style.transform = `translate3d(${box.left - RING_PAD}px, ${box.top - RING_PAD}px, 0)`;
      }
    };
    tick();
    return () => cancelAnimationFrame(id);
  }, [anchor?.selector, anchor?.ring, side]);

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
    } else trapTab(e, card.current);
  };

  return (
    <>
      <div className={`guide-ring ${anchor?.ring ?? 'round'}`} ref={ring} aria-hidden="true" />
      <section className="guidecard" ref={card} role="dialog" aria-labelledby={titleId} onKeyDown={onKeyDown}>
        {children}
      </section>
    </>
  );
}

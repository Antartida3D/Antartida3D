import { MoreFold } from '../sheet/MoreFold.tsx';
import { useEffect, useRef, useState } from 'react';
import { CONTOUR_M, FUEGIA_VERTICAL_EXAGGERATION, MALVINAS_FLAG, VERTICAL_EXAGGERATION, legendSwipe, legendSwipeStarts } from '@antartida/core';
import { Icon } from '../ui.tsx';

export function Legend({ open, onToggle, mode = '2d' }: { open: boolean; onToggle: () => void; mode?: '2d' | '3d' }) {
  const ref = useRef<HTMLDivElement>(null);
  // Where a finger swiping the open legend has carried it; null while no finger drags it.
  const [offset, setOffset] = useState<{ x: number; y: number } | null>(null);
  const live = useRef({ open, onToggle });
  live.current = { open, onToggle };

  // A finger swiping the open legend left or down closes it (#114); the button keeps working.
  // Native listeners, as in BottomSheet: a non-passive touchmove keeps the page still under the
  // finger, and cancelling touchend drops the click, so a swipe that starts on the button does not
  // press it and open the legend again. A move up, right, or down through a scrolled list is left
  // to the page: on a short screen the lists of the 3D legend scroll (painted.css).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Where the finger landed and how far the text under it is scrolled from its top.
    let start: { x: number; y: number; top: number } | null = null;
    let dragged = false;
    let closes = false;
    const scrolledTop = (target: EventTarget | null) => {
      let top = el.scrollTop;
      for (let n = target as Element | null; n && n !== el; n = n.parentElement) top += n.scrollTop;
      return top;
    };
    const onStart = (e: TouchEvent) => {
      dragged = false;
      closes = false;
      const t = e.touches[0];
      start = live.current.open && e.touches.length === 1 ? { x: t.clientX, y: t.clientY, top: scrolledTop(e.target) } : null;
    };
    const onMove = (e: TouchEvent) => {
      if (!start) return;
      const [dx, dy] = [e.touches[0].clientX - start.x, e.touches[0].clientY - start.y];
      const swipe = legendSwipe(dx, dy);
      if (!dragged) {
        if (!swipe.drag) return;
        if (!legendSwipeStarts(dx, dy, start.top)) return void (start = null);
        dragged = true;
      }
      closes = swipe.closes;
      // Over a list that scrolls, the browser may already own the move: then it cannot be cancelled.
      if (e.cancelable) e.preventDefault();
      setOffset({ x: swipe.x, y: swipe.y });
    };
    const onEnd = (e: TouchEvent) => {
      if (dragged) {
        if (e.cancelable) e.preventDefault();
        if (closes && e.type === 'touchend') live.current.onToggle();
      }
      start = null;
      dragged = false;
      setOffset(null);
    };
    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd);
    el.addEventListener('touchcancel', onEnd);
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
    };
  }, []);

  return (
    <div
      className={'legend' + (open ? ' open' : '') + (offset ? ' swiping' : '')}
      ref={ref}
      tabIndex={mode === '3d' ? 0 : undefined}
      style={offset ? { transform: `translate3d(${offset.x}px, ${offset.y}px, 0)` } : undefined}
    >
      <button type="button" className="lt" onClick={onToggle} aria-expanded={open}>
        {Icon.legend}
        <span className="lt-label">Leyenda</span>
      </button>
      {open && (
        <>
          <ul aria-label="Contenido de la leyenda">
            <li><span className="sw"><span className="a" /></span><span><b>Expedición disponible</b></span></li>
            <li><span className="sw"><span className="b" /></span><span>Ampliación prevista</span></li>
            <li><span className="sw"><span className="c">{Icon.info}</span></span><span>Punto de interés</span></li>
            {mode === '3d' && (
              <li><span className="sw"><span className="sea">{Icon.sea}</span></span><span>Vida en el mar</span></li>
            )}
          </ul>
          {/* Sources and what is only an illustration: folded, so the legend stays short (#114). */}
          <MoreFold summary="Fuentes y aclaraciones">
            {/* In 3D this is the list that can outgrow its height and scroll: reachable by keyboard (#108). */}
            <ul tabIndex={mode === '3d' ? 0 : undefined} aria-label="Fuentes y aclaraciones">
              <li className="leg-note">{MALVINAS_FLAG.description}</li>
              {mode === '3d' && (
                <>
                  <li className="leg-note">
                    Relieve real: Bedmap3 (BAS) ×{VERTICAL_EXAGGERATION}, curvas cada {CONTOUR_M} m · Tierra del Fuego y Malvinas: IBCSO v2 ×{FUEGIA_VERTICAL_EXAGGERATION}, color según altura · Profundidad: IBCSO v2 (SCAR) · Resto del mundo, hasta 60° N: Natural Earth II, plano y sin relieve
                  </li>
                  <li className="leg-note">
                    Fauna y témpanos: ilustración, no posiciones reales
                  </li>
                </>
              )}
            </ul>
          </MoreFold>
        </>
      )}
    </div>
  );
}

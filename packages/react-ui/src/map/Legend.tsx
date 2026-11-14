import { useEffect, useRef, useState } from 'react';
import { CONTOUR_M, FUEGIA_VERTICAL_EXAGGERATION, MALVINAS_FLAG, VERTICAL_EXAGGERATION, legendSwipe } from '@antartida/core';
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
  // press it and open the legend again.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let start: { x: number; y: number } | null = null;
    let dragged = false;
    let closes = false;
    const onStart = (e: TouchEvent) => {
      dragged = false;
      closes = false;
      start = live.current.open && e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
    };
    const onMove = (e: TouchEvent) => {
      if (!start) return;
      const swipe = legendSwipe(e.touches[0].clientX - start.x, e.touches[0].clientY - start.y);
      dragged ||= swipe.drag;
      if (!dragged) return;
      closes = swipe.closes;
      e.preventDefault();
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
      className={'legend' + (offset ? ' swiping' : '')}
      ref={ref}
      style={offset ? { transform: `translate3d(${offset.x}px, ${offset.y}px, 0)` } : undefined}
    >
      <button type="button" className="lt" onClick={onToggle} aria-expanded={open}>
        {Icon.legend}
        Leyenda
      </button>
      {open && (
        <>
          <ul>
            <li><span className="sw"><span className="a" /></span><span><b>Expedición disponible</b></span></li>
            <li><span className="sw"><span className="b" /></span><span>Ampliación prevista</span></li>
            <li><span className="sw"><span className="c" /></span><span>Próximamente</span></li>
            {mode === '3d' && (
              <li><span className="sw"><span className="sea">{Icon.sea}</span></span><span>Vida en el mar</span></li>
            )}
          </ul>
          {/* Sources and what is only an illustration: folded, so the legend stays short (#114). */}
          <details>
            <summary>Fuentes y aclaraciones</summary>
            <ul>
              <li className="leg-note" style={{ fontStyle: 'italic', fontSize: '0.82em', opacity: 0.9 }}>{MALVINAS_FLAG.description}</li>
              {mode === '3d' && (
                <>
                  <li className="leg-note" style={{ fontStyle: 'italic', fontSize: '0.82em', opacity: 0.9 }}>
                    Relieve real: Bedmap3 (BAS) ×{VERTICAL_EXAGGERATION}, curvas cada {CONTOUR_M} m · Tierra del Fuego y Malvinas: IBCSO v2 ×{FUEGIA_VERTICAL_EXAGGERATION}, color según altura · Profundidad: IBCSO v2 (SCAR) · Resto del mundo, hasta 60° N: Natural Earth II, plano y sin relieve
                  </li>
                  <li className="leg-note" style={{ fontStyle: 'italic', fontSize: '0.82em', opacity: 0.9 }}>
                    Fauna y témpanos: ilustración, no posiciones reales
                  </li>
                </>
              )}
            </ul>
          </details>
        </>
      )}
    </div>
  );
}

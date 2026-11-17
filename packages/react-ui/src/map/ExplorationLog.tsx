import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { AVAILABLE_COUNT, EXPEDITIONS_IN_ORDER, nextExpedition, type MapPoint } from '@antartida/core';
import { useBackLayer } from '../hooks.ts';
import { Icon } from '../ui.tsx';

/**
 * The exploration log: how many expeditions are explored. Pressing it drops down the six
 * expeditions in the suggested order, each with whether it is explored, and opens the one chosen
 * (#235). Only expeditions: the points of interest stay in «Actividades».
 */
export function ExplorationLog({ explored, onPick }: { explored: readonly string[]; onPick: (p: MapPoint) => void }) {
  const text = `${explored.length}/${AVAILABLE_COUNT}`;
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const next = nextExpedition(explored)?.id;

  // The browser's «back» closes it like any other layer (#185).
  useBackLayer(open, () => setOpen(false));

  // A press anywhere else closes it.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  }, [open]);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Escape' || !open) return;
    e.stopPropagation();
    setOpen(false);
    buttonRef.current?.focus();
  };

  return (
    <div className="reg-wrap" ref={wrapRef} onKeyDown={onKeyDown}>
      <button
        ref={buttonRef}
        type="button"
        className={'reg' + (open ? ' open' : '')}
        aria-label={`Registro de exploración: ${text} expediciones disponibles`}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen(!open)}
      >
        <small>Registro de exploración</small>
        <b>{text}<span className="unit"> expediciones</span></b>
        <span className="reg-chev">{Icon.back}</span>
        <span className="bar"><i style={{ width: `${(100 * explored.length) / AVAILABLE_COUNT}%` }} /></span>
      </button>
      {open && (
        <div className="reg-menu" id={menuId}>
          <ol aria-label="Expediciones">
            {EXPEDITIONS_IN_ORDER.map((p, i) => {
              const done = explored.includes(p.id);
              const suggested = p.id === next;
              return (
              <li key={p.id}>
                <button
                  type="button"
                  className={'li' + (done ? ' done' : '')}
                  aria-label={p.title + (done ? ', explorada' : '') + (suggested ? ', siguiente sugerida' : '')}
                  onClick={() => { setOpen(false); onPick(p); }}
                >
                  {/* An explored expedition shows a tick instead of its number and its title struck through; its label says it. */}
                  {done
                    ? <span className="num" aria-hidden="true">{Icon.check}</span>
                    : <span className="num" aria-hidden="true">{i + 1}</span>}
                  <span className="t">
                    <strong>{p.title}</strong>
                    {suggested && <span className="go next">Siguiente sugerida</span>}
                  </span>
                </button>
              </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}

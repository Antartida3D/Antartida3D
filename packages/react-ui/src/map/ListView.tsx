import { useRef } from 'react';
import { EXPEDITION_ORDER, PTS, nextExpedition, type MapPoint, type Tier } from '@antartida/core';
import { BottomSheet } from '../BottomSheet.tsx';
import { useFocusReturn } from '../hooks.ts';
import { CompassRose } from '../Cartography.tsx';

const GROUPS: { tier: Tier; id: string; tag: string; label?: string; desc: string }[] = [
  { tier: 'A', id: 'g-a', tag: 'Disponible', label: 'Expediciones · orden sugerido', desc: 'Es una sugerencia: podés empezar por cualquiera.' },
  { tier: 'B', id: 'g-b', tag: 'Ampliación prevista', desc: 'Planificadas para la próxima etapa.' },
  { tier: 'C', id: 'g-c', tag: 'Punto de interés', desc: 'Lugares para conocer, con su ficha y fuentes.' },
];

export function ListView({ explored, onClose, onPick, points }: {
  explored: readonly string[];
  onClose: () => void;
  onPick: (p: MapPoint) => void;
  points?: readonly MapPoint[];
}) {
  const shown = points ?? PTS;
  const pick = points !== undefined;
  const ref = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLElement>(null);
  useFocusReturn(true, pick ? sheetRef : ref);
  const next = nextExpedition(explored)?.id;
  const order = (p: MapPoint) => EXPEDITION_ORDER.indexOf(p.id);

  const body = (
    <div className="inner">
      <div className="listhead">
        <div className="listhead-title">
          <CompassRose className="chart-compass list-emblem" />
          <div><span className="editorial-kicker">Índice del atlas</span><h2 id="list-title">{pick ? 'Puntos en este lugar' : 'Todos los puntos'}</h2></div>
        </div>
        <button type="button" className="btn" onClick={onClose}>{pick ? 'Volver al mapa' : 'Ver mapa'}</button>
      </div>
      {GROUPS.filter((g) => shown.some((p) => p.tier === g.tier)).map((g) => {
        const items = shown.filter((p) => p.tier === g.tier);
        if (g.tier === 'A') items.sort((a, b) => order(a) - order(b));
        const List = g.tier === 'A' ? 'ol' : 'ul';
        return (
          <section key={g.tier} aria-labelledby={g.id}>
            <h3 id={g.id}>
              <span className={'tag t' + g.tier.toLowerCase()}>{g.tag}</span>
              {g.label && ' ' + g.label}
            </h3>
            <p className="gdesc">{g.desc}</p>
            <List>
              {items.map((p) => (
                <li key={p.id}>
                  <button type="button" className="li" onClick={() => onPick(p)}>
                    {g.tier === 'A' && order(p) >= 0 && <span className="num" aria-hidden="true">{order(p) + 1}</span>}
                    <span className="t"><strong>{p.title}</strong><span className="p">{p.place}</span></span>
                    <span className={'go' + (p.id === next ? ' next' : '')}>
                      {g.tier !== 'A' ? 'Ver ficha' : explored.includes(p.id) ? 'Explorado · volver a entrar' : p.id === next ? 'Siguiente sugerida · empezar' : 'Empezar expedición'}
                    </span>
                  </button>
                </li>
              ))}
            </List>
          </section>
        );
      })}
    </div>
  );

  // The points of a group that zooming cannot separate: a bottom sheet like a point's, closed by dragging it down (DEC-75-2).
  if (pick) {
    return (
      <>
        <div className="scrim clear" onClick={onClose} />
        <BottomSheet className="half pick-sheet" labelledBy="list-title" sheetRef={sheetRef} onClose={onClose}>
          {body}
        </BottomSheet>
      </>
    );
  }
  return (
    <div
      className="listview"
      role="dialog"
      aria-modal="true"
      aria-labelledby="list-title"
      ref={ref}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      {body}
    </div>
  );
}

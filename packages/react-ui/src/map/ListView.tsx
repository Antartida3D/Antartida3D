import { useRef } from 'react';
import { PTS, type MapPoint, type Tier } from '@antartida/core';
import { useFocusReturn } from '../hooks.ts';

const GROUPS: { tier: Tier; id: string; tag: string; label?: string; desc: string }[] = [
  { tier: 'A', id: 'g-a', tag: 'Disponible', label: 'Expediciones', desc: 'Se pueden recorrer ahora.' },
  { tier: 'B', id: 'g-b', tag: 'Ampliación prevista', desc: 'Planificadas para la próxima etapa.' },
  { tier: 'C', id: 'g-c', tag: 'Punto de interés', desc: 'Lugares para conocer, con su ficha y fuentes.' },
];

/**
 * Every point of the map by tier, on its own screen. With `points`, only those, in a small window
 * over the map (`title`): the points of a group that zooming no longer separates.
 */
export function ListView({ explored, onClose, onPick, points }: {
  explored: readonly string[];
  onClose: () => void;
  onPick: (p: MapPoint) => void;
  points?: readonly MapPoint[];
}) {
  const shown = points ?? PTS;
  const pick = points !== undefined;
  const ref = useRef<HTMLDivElement>(null);
  useFocusReturn(true, ref);
  return (
    <>
    {/* A tap on the map around the window closes it. */}
    {pick && <div className="scrim" onClick={onClose} />}
    <div
      className={'listview' + (pick ? ' pick' : '')}
      role="dialog"
      aria-modal="true"
      aria-labelledby="list-title"
      ref={ref}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div className="inner">
        <div className="listhead">
          <h2 id="list-title">{pick ? 'Puntos en este lugar' : 'Todos los puntos'}</h2>
          <button type="button" className="btn" onClick={onClose}>{pick ? 'Volver al mapa' : 'Ver mapa'}</button>
        </div>
        {GROUPS.filter((g) => shown.some((p) => p.tier === g.tier)).map((g) => (
          <section key={g.tier} aria-labelledby={g.id}>
            <h3 id={g.id}>
              <span className={'tag t' + g.tier.toLowerCase()}>{g.tag}</span>
              {g.label && ' ' + g.label}
            </h3>
            <p className="gdesc">{g.desc}</p>
            <ul>
              {shown.filter((p) => p.tier === g.tier).map((p) => (
                <li key={p.id}>
                  <button type="button" className="li" onClick={() => onPick(p)}>
                    <span className="t"><strong>{p.title}</strong><span className="p">{p.place}</span></span>
                    <span className="go">
                      {g.tier === 'A' ? (explored.includes(p.id) ? 'Explorado · volver a entrar' : 'Empezar expedición') : 'Ver ficha'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
    </>
  );
}

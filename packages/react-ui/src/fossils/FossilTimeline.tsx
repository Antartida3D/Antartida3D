import type { CSSProperties } from 'react';
import { FOSSIL_TIMELINE, timelineAt, timelineFinds, type FossilState } from '@antartida/core';

const ma = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 2 });

/**
 * Geological time line from the Late Cretaceous to the end of the Eocene, to scale (ICS v2026/06).
 * Each find lights up in its period once its chapter is visited; the finds sit in their period,
 * not at an exact year, because the sources do not give one.
 */
export function FossilTimeline({ state }: { state: Pick<FossilState, 'stop' | 'visited'> }) {
  const finds = timelineFinds(state);
  const found = finds.filter((f) => f.found).length;
  const span = (from: number, to: number): CSSProperties => ({ left: `${timelineAt(from) * 100}%`, width: `${(timelineAt(to) - timelineAt(from)) * 100}%` });
  // Finds that share a period are spread inside it in chapter order, which is not an order in time.
  const slot = (i: number) => {
    const f = finds[i];
    const same = finds.filter((g) => g.from === f.from && g.to === f.to);
    const k = same.indexOf(f);
    const a = timelineAt(f.from), b = timelineAt(f.to);
    return `${(a + ((b - a) * (k + 1)) / (same.length + 1)) * 100}%`;
  };
  return (
    <figure className="fossil-timeline">
      <figcaption>
        <span>Tiempo geológico</span>
        <span>{found} de {finds.length} hallazgos</span>
      </figcaption>
      <div className="fossil-timeline-bar" aria-hidden="true">
        {FOSSIL_TIMELINE.periods.map((p) => (
          <div key={p.id} className={'fossil-period ' + p.id} style={span(p.from, p.to)}><span>{p.label}</span></div>
        ))}
        {finds.filter((f) => f.from !== FOSSIL_TIMELINE.periods[0].from || f.to !== FOSSIL_TIMELINE.periods[0].to).map((f) => (
          <div key={f.chapter} className="fossil-timeline-range" style={span(f.from, f.to)} />
        ))}
        <div className="fossil-timeline-extinction" style={{ left: `${timelineAt(FOSSIL_TIMELINE.extinction.at) * 100}%` }} />
        {finds.map((f, i) => (
          <span key={f.chapter} className={'fossil-timeline-find' + (f.found ? ' found' : '') + (f.current ? ' current' : '')} style={{ left: slot(i) }} />
        ))}
      </div>
      <div className="fossil-timeline-ages" aria-hidden="true">
        {[FOSSIL_TIMELINE.from, FOSSIL_TIMELINE.extinction.at, FOSSIL_TIMELINE.periods[2].from, FOSSIL_TIMELINE.to].map((n) => (
          <span key={n} style={{ left: `${timelineAt(n) * 100}%` }}>{ma(n)}</span>
        ))}
      </div>
      <p className="fossil-timeline-unit" aria-hidden="true">Millones de años atrás · cada hallazgo, en su período</p>
      <ul className="visually-hidden">
        {finds.map((f) => <li key={f.chapter}>{f.label}: {f.when}, {f.found ? 'encontrado' : 'por descubrir'}{f.current ? ', en este capítulo' : ''}.</li>)}
        <li>{FOSSIL_TIMELINE.extinction.label}: extinción de amonites, plesiosaurios y la mayoría de los dinosaurios.</li>
      </ul>
    </figure>
  );
}

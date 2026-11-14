import { lazy, Suspense, useRef } from 'react';
import { TIER, type MapPoint, type SeaPoint, type Source } from '@antartida/core';
import { useFocusReturn } from '../hooks.ts';
import { Icon } from '../ui.tsx';
import { POINT_MODEL_IDS } from '../voyage/pointModelIds.ts';

// Its own chunk: it needs WebGL, which the 2D map does not.
const SeaPreview = lazy(() => import('../voyage/SeaPreview.tsx').then((m) => ({ default: m.SeaPreview })));
const PointPreview = lazy(() => import('../voyage/PointPreview.tsx').then((m) => ({ default: m.PointPreview })));

function SourceList({ sources }: { sources?: readonly Source[] }) {
  if (!sources || sources.length === 0) return null;
  return (
    <div className="sheet-sources">
      <h3>Fuentes verificadas</h3>
      <ul>
        {sources.map((s, idx) => (
          <li key={idx}>
            {s.url ? (
              <a href={s.url} target="_blank" rel="noopener noreferrer">
                {s.label}
              </a>
            ) : (
              <span>{s.label}</span>
            )}
            <small>
              {s.org}
              {s.consulted ? ` · Consultado ${s.consulted}` : ''}
            </small>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PointSheet({ point, onClose, fallbackFocus, preview = false, reduced = false }: {
  point: MapPoint | SeaPoint;
  onClose: () => void;
  fallbackFocus: () => HTMLElement | null;
  /** Show the block model of the point (needs WebGL). */
  preview?: boolean;
  reduced?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  useFocusReturn(true, ref, 'button', fallbackFocus);

  const isSea = !('tier' in point);
  const hasModel = preview && POINT_MODEL_IDS.has(point.id);
  const tagLabel = isSea ? point.tag ?? 'Vida en el mar' : TIER[point.tier];
  const tagClass = isSea ? 'tag tsea' : 'tag t' + point.tier.toLowerCase();

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <section
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        ref={ref}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
      >
        <div className="grab" />
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <span className={tagClass}>{tagLabel}</span>
          <button type="button" className="iconbtn" onClick={onClose} aria-label="Cerrar ficha">{Icon.close}</button>
        </div>
        <h2 id="sheet-title">{point.title}</h2>
        <p className="place">{point.place}</p>
        {isSea ? (
          <>
            {preview && point.targetSpecies && (
              <Suspense fallback={<div className="vpreview sea" />}>
                <SeaPreview species={point.targetSpecies} reduced={reduced} />
              </Suspense>
            )}
            <div className="q">
              <p>{point.desc}</p>
            </div>
            <SourceList sources={point.sources} />
            <p className="anno" style={{ marginTop: 12 }}>
              Ilustración representativa para el cuaderno de campo antártico.
            </p>
          </>
        ) : point.desc ? (
          <>
            {hasModel && (
              <Suspense fallback={<div className="vpreview" />}>
                <PointPreview id={point.id} reduced={reduced} />
              </Suspense>
            )}
            <div className="q">
              <p>{point.q}</p>
            </div>
            <p className="sheet-desc">{point.desc}</p>
            <SourceList sources={point.sources} />
            {hasModel && <p className="anno">Ilustración representativa, no a escala.</p>}
            <p className="anno">Esta expedición todavía no está disponible. Se suma en una próxima etapa.</p>
          </>
        ) : (
          <>
            <div className="q">
              <p>{point.q}</p>
              <small>[Pregunta provisional] · [Contenido provisional]</small>
            </div>
            <p className="anno">Esta expedición todavía no está disponible. Se suma en una próxima etapa.</p>
          </>
        )}
        <div className="row" style={{ marginTop: 12 }}>
          <button type="button" className="btn" onClick={onClose}>Volver al mapa</button>
        </div>
      </section>
    </>
  );
}

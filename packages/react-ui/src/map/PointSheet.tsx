import { lazy, Suspense, useId, useRef, useState } from 'react';
import {
  ANTARCTICA_PATH,
  ICE_SHELVES_PATH,
  SOUTH_AMERICA_PATH,
  TIER,
  formatTemperature,
  formatTemperatureAge,
  type MapPoint,
  type SeaPoint,
  type Source,
} from '@antartida/core';
import { BottomSheet } from '../BottomSheet.tsx';
import { useFocusReturn } from '../hooks.ts';
import { POINT_MODEL_IDS } from '../voyage/pointModelIds.ts';
import { CompassRose } from '../Cartography.tsx';
import { useCurrentTemperatures } from './useCurrentTemperatures.ts';

// Its own chunk: it needs WebGL, which the 2D map does not.
const SeaPreview = lazy(() => import('../voyage/SeaPreview.tsx').then((m) => ({ default: m.SeaPreview })));
const PointPreview = lazy(() => import('../voyage/PointPreview.tsx').then((m) => ({ default: m.PointPreview })));

function TemperatureLine({ pointId }: { pointId: string }) {
  const { status, temperature } = useCurrentTemperatures(pointId);
  if (status === 'idle') return null;

  let text = 'Consultando temperatura…';
  if (status === 'ready' && temperature) {
    const formatted = formatTemperature(temperature.celsius, 'es');
    const age = formatTemperatureAge(temperature.time);
    text = `Temperatura actual estimada en esta zona: ${formatted} · Estimación de modelo (Open-Meteo) · ${age}`;
  } else if (status === 'error') {
    text = 'Temperatura no disponible ahora';
  }

  return (
    <>
      <p className="sheet-temp" aria-live="polite">{text}</p>
      <p className="anno sheet-temp-attr">Datos meteorológicos: Open-Meteo.com (CC BY 4.0)</p>
    </>
  );
}

/** Decorative atlas vignette; it carries no geographic interaction or measurement. */
function AtlasVignette() {
  const clipId = useId();
  return (
    <div className="point-sheet-atlas" aria-hidden="true">
      <svg className="point-sheet-chart" viewBox="-80 -80 1160 1160" focusable="false">
        <defs>
          <clipPath id={clipId}><circle cx="500" cy="500" r="530" /></clipPath>
        </defs>
        <circle className="point-sheet-ocean" cx="500" cy="500" r="530" />
        <g className="point-sheet-graticule">
          <circle cx="500" cy="500" r="139" />
          <circle cx="500" cy="500" r="280" />
          <circle cx="500" cy="500" r="426" />
          <path d="M500-30V1030M-30 500H1030M125 125l750 750M125 875l750-750" />
        </g>
        <g className="point-sheet-coast" clipPath={`url(#${clipId})`}>
          <path d={ICE_SHELVES_PATH} />
          <path d={ANTARCTICA_PATH} />
          <path d={SOUTH_AMERICA_PATH} />
        </g>
        <circle className="point-sheet-chart-rim" cx="500" cy="500" r="530" />
        <circle className="point-sheet-chart-rim" cx="500" cy="500" r="554" />
      </svg>
      <CompassRose className="chart-compass point-sheet-compass" />
    </div>
  );
}

/** Folded by default: the sources would otherwise push the sheet's content and actions out of view. */
function SourceList({ sources }: { sources?: readonly Source[] }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  if (!sources || sources.length === 0) return null;
  return (
    <div className="sheet-sources">
      <h3>
        <button type="button" className="sheet-sources-toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)}>
          Fuentes verificadas ({sources.length})
        </button>
      </h3>
      <ul id={id} hidden={!open}>
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

export function PointSheet({ point, onClose, fallbackFocus, preview = false, onMap = false, reduced = false, action }: {
  point: MapPoint | SeaPoint;
  onClose: () => void;
  fallbackFocus: () => HTMLElement | null;
  /** Show the block model of the point (needs WebGL). */
  preview?: boolean;
  /**
   * The camera flies down to the model of the point on the map (MapPoint.closeUp): the model is seen
   * above the sheet, so the sheet does not repeat it.
   */
  onMap?: boolean;
  reduced?: boolean;
  /** Extra map layer this point opens, such as the territorial claims from the South Pole. */
  action?: { label: string; onClick: () => void };
}) {
  const ref = useRef<HTMLElement>(null);
  // The title takes the focus: it names the sheet, and the sheet does not scroll to a button further down.
  useFocusReturn(true, ref, '#sheet-title', fallbackFocus);

  const isSea = !('tier' in point);
  const hasModel = preview && POINT_MODEL_IDS.has(point.id);
  const showPreview = hasModel && !onMap;
  const tagLabel = isSea ? point.tag ?? 'Vida en el mar' : TIER[point.tier];
  const tagClass = isSea ? 'tag tsea' : 'tag t' + point.tier.toLowerCase();

  return (
    <>
      {/* A tap on the map around the sheet closes it; light, so the point stays in sight above the sheet. */}
      <div className="scrim clear" onClick={onClose} />
      {/*
        On a phone it opens at half the screen, with the point on the map above it. Dragged up it shows
        more text; dragged down it closes, like the other sheets of the map. No close button: a tap
        outside, dragging it down, Escape and «Volver al mapa» close it.
      */}
      <BottomSheet className="point half point-sheet" labelledBy="sheet-title" sheetRef={ref} onClose={onClose}>
        <div className="point-sheet-masthead">
          <span>Cuaderno de campo</span>
        </div>
        <div className="point-sheet-heading">
          <div>
            <span className={tagClass}>{tagLabel}</span>
            <h2 id="sheet-title" tabIndex={-1}>{point.title}</h2>
            <p className="place">{point.place}</p>
          </div>
          <AtlasVignette />
        </div>
        {!isSea && <TemperatureLine pointId={point.id} />}
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
            {showPreview && (
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
            {point.tier === 'B' && <p className="anno">Esta expedición todavía no está disponible. Se suma en una próxima etapa.</p>}
          </>
        ) : (
          <>
            <div className="q">
              <p>{point.q}</p>
              <small>[Pregunta provisional] · [Contenido provisional]</small>
            </div>
            {point.tier === 'B' && <p className="anno">Esta expedición todavía no está disponible. Se suma en una próxima etapa.</p>}
          </>
        )}
        <div className="point-sheet-footer">
          <span className="point-sheet-rule" aria-hidden="true">✧</span>
          <div className="row" style={{ marginTop: 0 }}>
            {action && <button type="button" className="btn" onClick={action.onClick}>{action.label}</button>}
            <button type="button" className="btn" onClick={onClose}>Volver al mapa</button>
          </div>
        </div>
      </BottomSheet>
    </>
  );
}

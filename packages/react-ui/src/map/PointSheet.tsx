import { lazy, Suspense, useRef, useState } from 'react';
import {
  TIER,
  formatTemperature,
  formatTemperatureAge,
  type MapPoint,
  type SeaPoint,
  pointCited,
} from '@antartida/core';
import { BottomSheet } from '../BottomSheet.tsx';
import { KindChip } from '../orcadas/KindChip.tsx';
import { Cites } from '../sheet/Cite.tsx';
import { SheetActions } from '../sheet/SheetActions.tsx';
import { SheetHeader } from '../sheet/SheetHeader.tsx';
import { SheetText } from '../sheet/SheetText.tsx';
import { SourcesContext } from '../sheet/SourcesContext.ts';
import { SourcesView } from '../sheet/SourcesView.tsx';
import { POINT_MODEL_IDS } from '../voyage/pointModelIds.ts';
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
    </>
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
  const [openSource, setOpenSource] = useState<string | null>(null);
  const isSea = !('tier' in point);
  const hasModel = preview && POINT_MODEL_IDS.has(point.id);
  const showPreview = hasModel && !onMap;
  const tagLabel = isSea ? point.tag ?? 'Vida en el mar' : TIER[point.tier];
  const tagClass = isSea ? 'tag tsea' : 'tag t' + point.tier.toLowerCase();

  const list = (point.sources ?? []).map(pointCited);
  const cites = <Cites ids={list.map((source) => source.id)} />;
  const context = { list, open: setOpenSource };
  const illustration = isSea ? 'Ilustración representativa para el cuaderno de campo antártico' : hasModel ? 'Ilustración representativa, no a escala' : null;
  // What is an illustration is marked, in the same place on every sheet, under the heading; what is real goes without a mark.
  const kinds = illustration && (
    <p className="sheet-kinds">
      <KindChip kind="recon" label={illustration} />
    </p>
  );

  return (
    <SourcesContext.Provider value={context}>
      {/*
        On a phone it opens at half the screen, with the point on the map above it. Dragged up it shows
        more text; dragged down it closes, like the other sheets of the map. A tap outside, dragging it
        down, Escape, «Cerrar» and «Volver al mapa» close it.
      */}
      <BottomSheet className="point half point-sheet" labelledBy="sheet-title" sheetRef={ref} onClose={onClose} initialFocus="#sheet-title" fallbackFocus={fallbackFocus}>
        <div className="point-sheet-masthead">
          <span>Cuaderno de campo<span className="point-sheet-kind"> · <span className={tagClass}>{tagLabel}</span></span></span>
        </div>
        <div className="point-sheet-heading">
          <SheetHeader title={point.title} titleId="sheet-title" titleFocusable place={point.place} />
        </div>
        {!isSea && <TemperatureLine pointId={point.id} />}
        {isSea ? (
          <>
            {preview && point.targetSpecies && (
              <Suspense fallback={<div className="vpreview sea" />}>
                <SeaPreview species={point.targetSpecies} reduced={reduced} />
              </Suspense>
            )}
            {kinds}
            <SheetText text={point.desc}>{cites}</SheetText>
          </>
        ) : point.desc ? (
          <>
            {showPreview && (
              <Suspense fallback={<div className="vpreview" />}>
                <PointPreview id={point.id} reduced={reduced} />
              </Suspense>
            )}
            {kinds}
            <div className="q">
              <p>{point.q}</p>
            </div>
            <SheetText text={point.desc}>{cites}</SheetText>
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
        <SheetActions>
          {action && <button type="button" className="btn" onClick={action.onClick}>{action.label}</button>}
          <button type="button" className="btn primary" onClick={onClose}>Volver al mapa</button>
        </SheetActions>
      </BottomSheet>
      {openSource !== null && <SourcesView list={list} highlight={openSource} onClose={() => setOpenSource(null)} />}
    </SourcesContext.Provider>
  );
}

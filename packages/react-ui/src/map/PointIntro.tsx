import { lazy, Suspense } from 'react';
import { expeditionIntro, type MapPoint } from '@antartida/core';
import { ExpeditionIntro } from '../sheet/ExpeditionIntro.tsx';

// Its own chunk: it needs WebGL, which the 2D map does not.
const IntroPreview = lazy(() => import('../voyage/IntroPreview.tsx').then((m) => ({ default: m.IntroPreview })));

/** The modal before an expedition that has nothing to pick (Marambio, Océano, Fósiles, Cerro Nevado). */
export function PointIntro({ point, onStart, onExit, fallbackFocus, preview = false, reduced = false }: {
  point: MapPoint;
  onStart: () => void;
  onExit: () => void;
  fallbackFocus?: () => HTMLElement | null | undefined;
  /** Show the turning 3D model that stands for the expedition (needs WebGL). */
  preview?: boolean;
  reduced?: boolean;
}) {
  const intro = expeditionIntro(point.id);
  if (!intro) return null;
  return (
    <ExpeditionIntro
      title={point.title}
      titleId="point-intro-title"
      place={point.q ?? point.place}
      paragraphs={intro.paragraphs}
      sources={intro.sources}
      onStart={onStart}
      onExit={onExit}
      fallbackFocus={fallbackFocus}
    >
      {preview && (
        <Suspense fallback={<div className="vpreview" />}>
          <IntroPreview id={point.id} reduced={reduced} />
        </Suspense>
      )}
    </ExpeditionIntro>
  );
}

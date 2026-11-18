import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { PTS, sceneFacts, type SceneFact, type ScenePoint } from '@antartida/core';
import { BottomSheet, type OpenSheetSize } from '../BottomSheet.tsx';
import { useIsDesktop } from '../hooks.ts';
import { useSceneFrame, type ViewShiftPx } from '../sceneFrame.tsx';
import { KindChip } from '../orcadas/KindChip.tsx';
import { Quoted } from '../ui.tsx';
import { ExpeditionTop } from '../ExpeditionTop.tsx';
import { SceneLocation } from '../SceneLocation.tsx';
import { Cites } from '../sheet/Cite.tsx';
import { BackButton } from '../sheet/BackButton.tsx';
import { SheetActions } from '../sheet/SheetActions.tsx';
import { SheetHeader } from '../sheet/SheetHeader.tsx';
import { SourcesContext } from '../sheet/SourcesContext.ts';
import { SourcesView } from '../sheet/SourcesView.tsx';
import { TemperatureLine } from '../map/TemperatureLine.tsx';

/** What the screen hands its 3D scene. */
export interface SceneSlotProps<S extends string> {
  focus: S;
  sidePanel: boolean;
  overlayRef: RefObject<HTMLDivElement | null>;
  onNoWebGL: () => void;
  shift: ViewShiftPx;
}

function FactCard({ fact }: { fact: SceneFact }) {
  return (
    <article className="orc-fact-card">
      <div className="orc-fact-top">
        <KindChip kind={fact.kind} />
      </div>
      <p className="orc-fact-text">
        <Quoted text={fact.text} />
        <Cites ids={fact.sources} />
      </p>
    </article>
  );
}

/**
 * A point of interest as a scene of its own (#206, #280): the 3D scene (`scene`), its spots to visit,
 * each with its facts and sources, and the badge that says it is an illustrated reconstruction. It is
 * not an expedition: leaving it never counts in the exploration log.
 */
export function ScenePointScreen<S extends string>({
  point,
  scene,
  onLeave,
}: {
  point: ScenePoint<S>;
  scene: (props: SceneSlotProps<S>) => ReactNode;
  onLeave: () => void;
}) {
  const mapPoint = PTS.find((p) => p.id === point.id)!;
  const question = mapPoint.q;
  const isDesktop = useIsDesktop(900);
  const [index, setIndex] = useState(0);
  const [showSources, setShowSources] = useState(false);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [sheetSize, setSheetSize] = useState<OpenSheetSize>('small');
  const [noWebGL, setNoWebGL] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLElement>(null);
  const topRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const moved = useRef(false);

  const spots = point.spots;
  const spot = spots[index];
  const last = index === spots.length - 1;
  const titleId = `${point.id}-panel-title`;

  useEffect(() => {
    if (!moved.current) return;
    rootRef.current?.querySelector<HTMLElement>(`#${titleId}`)?.focus({ preventScroll: true });
  }, [index, titleId]);

  const unfold = () => setSheetSize((size) => (size === 'peek' ? 'small' : size));
  const go = (next: number) => {
    moved.current = true;
    setIndex(next);
    unfold();
  };
  const openSources = (id: string | null) => {
    setHighlight(id);
    setShowSources(true);
    unfold();
  };
  const closeSources = () => {
    setShowSources(false);
    setHighlight(null);
  };
  const onNoWebGL = useCallback(() => setNoWebGL(true), []);
  // The scene fills the screen: its view moves to the part the bar and the panel leave free.
  const shift = useSceneFrame(rootRef, topRef, panelRef, isDesktop, true);

  const panelBody = (
    <>
      <div className="orc-panel-scroll">
        <SheetHeader label={`Punto ${index + 1} de ${spots.length}`} title={spot.label} titleId={titleId} titleClass="orc-chapter-h2" titleFocusable />
        <div className="orc-chapter-content">
          {index === 0 && (
            <>
              <p className="orc-question">{question}</p>
              <TemperatureLine pointId={point.id} />
            </>
          )}
          <p className="orc-lead">{spot.subtitle}</p>
          {noWebGL && <p className="scene-pt-no3d">Sin gráficos 3D en este navegador: el recorrido sigue en palabras.</p>}
          <div className="orc-facts-list">
            {sceneFacts(point, spot.id).map((fact) => (
              <FactCard key={fact.id} fact={fact} />
            ))}
          </div>
        </div>
      </div>
      <SheetActions>
        {index > 0 && <BackButton onClick={() => go(index - 1)} />}
        <button type="button" className="btn primary" onClick={() => (last ? onLeave() : go(index + 1))}>
          {last ? 'Volver al mapa' : 'Siguiente'}
        </button>
      </SheetActions>
    </>
  );

  return (
    <SourcesContext.Provider value={{ list: point.cited, open: openSources }}>
      <section
        ref={rootRef}
        className={`orc mar scene-pt${!isDesktop && sheetSize === 'tall' ? ' is-panel-expanded' : ''}${!isDesktop && sheetSize === 'peek' ? ' is-panel-peek' : ''}`}
        aria-label={point.title}
      >
        {scene({ focus: spot.id, sidePanel: isDesktop, overlayRef, onNoWebGL, shift })}

        <SceneLocation place={mapPoint.place} detail={spot.label} />

        {!noWebGL && (
          <div className="orc-hotspots" ref={overlayRef} role="group" aria-label={`Puntos de interés: ${point.title}`}>
            {spots.map((s, i) => (
              <button
                key={s.id}
                type="button"
                data-hotspot={s.id}
                className={`orc-hs${i === index ? ' is-active' : ''}`}
                aria-label={`Punto de interés: ${s.label}`}
                aria-pressed={i === index}
                onClick={() => go(i)}
              >
                <span className="orc-hs-ring" aria-hidden="true" />
                <span className="orc-hs-dot" aria-hidden="true" />
                <span className="orc-hs-lbl">{s.shortLabel}</span>
              </button>
            ))}
          </div>
        )}

        <ExpeditionTop
          topRef={topRef}
          onMap={onLeave}
        />

        {isDesktop ? (
          <section className="orc-panel" ref={panelRef} aria-labelledby={titleId}>
            {panelBody}
          </section>
        ) : (
          <BottomSheet className="orc-panel" labelledBy={titleId} sheetRef={panelRef} floor="peek" size={sheetSize} onSize={setSheetSize}>
            {panelBody}
          </BottomSheet>
        )}
        {showSources && <SourcesView list={point.cited} kinds highlight={highlight} onClose={closeSources} place={question} />}
      </section>
    </SourcesContext.Provider>
  );
}

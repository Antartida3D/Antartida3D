import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CERRO_NEVADO_SPOTS,
  CERRO_NEVADO_TITLE,
  cerroNevadoFacts,
  PTS,
  type CerroNevadoFact,
  CERRO_NEVADO_CITED,
} from '@antartida/core';
import { BottomSheet, type OpenSheetSize } from '../BottomSheet.tsx';
import { useIsDesktop } from '../hooks.ts';
import { useSceneFrame } from '../sceneFrame.tsx';
import { KindChip } from '../orcadas/KindChip.tsx';
import { Icon, Quoted } from '../ui.tsx';
import { Cites } from '../sheet/Cite.tsx';
import { SheetActions } from '../sheet/SheetActions.tsx';
import { SheetHeader } from '../sheet/SheetHeader.tsx';
import { SourcesContext } from '../sheet/SourcesContext.ts';
import { SourcesView } from '../sheet/SourcesView.tsx';
import { CerroNevadoScene } from './CerroNevadoScene.tsx';

const QUESTION = PTS.find((p) => p.id === 'cerronevado')!.q;
const SOURCES = CERRO_NEVADO_CITED;

function FactCard({ fact }: { fact: CerroNevadoFact }) {
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
 * The emperor colony of Cerro Nevado as a scene of its own (#206): the fast ice, the colony at its
 * edge, the crèche, the camp. Four points to visit, each with its facts and sources. It is a point
 * of interest, not an expedition: leaving it never counts in the exploration log.
 */
export function CerroNevadoExpedition({ reduced, onLeave }: { reduced: boolean; onLeave: () => void }) {
  const isDesktop = useIsDesktop(900);
  const [index, setIndex] = useState(0);
  const [showSources, setShowSources] = useState(false);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [sheetSize, setSheetSize] = useState<OpenSheetSize>('small');
  const [noWebGL, setNoWebGL] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLElement>(null);
  const topRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const sourcesBtn = useRef<HTMLButtonElement>(null);
  const moved = useRef(false);

  const spot = CERRO_NEVADO_SPOTS[index];
  const last = index === CERRO_NEVADO_SPOTS.length - 1;

  useEffect(() => {
    if (!moved.current) return;
    rootRef.current?.querySelector<HTMLElement>('#cn-panel-title')?.focus({ preventScroll: true });
  }, [index]);

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
        <SheetHeader
          label={`Punto ${index + 1} de ${CERRO_NEVADO_SPOTS.length}`}
          title={spot.label}
          titleId="cn-panel-title"
          titleClass="orc-chapter-h2"
          titleFocusable
        />
        <div className="orc-chapter-content">
          {index === 0 && <p className="orc-question">{QUESTION}</p>}
          <p className="orc-lead">{spot.subtitle}</p>
          {noWebGL && <p className="cn-no3d">Sin gráficos 3D en este navegador: el recorrido sigue en palabras.</p>}
          <div className="orc-facts-list">
            {cerroNevadoFacts(spot.id).map((fact) => (
              <FactCard key={fact.id} fact={fact} />
            ))}
          </div>
        </div>
      </div>
      <SheetActions>
        {index > 0 && (
          <button type="button" className="btn" onClick={() => go(index - 1)}>
            Atrás
          </button>
        )}
        <button type="button" className="btn primary" onClick={() => (last ? onLeave() : go(index + 1))}>
          {last ? 'Volver al mapa' : 'Siguiente'}
        </button>
      </SheetActions>
    </>
  );

  return (
    <SourcesContext.Provider value={{ list: SOURCES, open: openSources }}>
    <section
      ref={rootRef}
      className={`orc mar cn${!isDesktop && sheetSize === 'tall' ? ' is-panel-expanded' : ''}${!isDesktop && sheetSize === 'peek' ? ' is-panel-peek' : ''}`}
      aria-label={CERRO_NEVADO_TITLE}
    >
      <CerroNevadoScene focus={spot.id} reduced={reduced} sidePanel={isDesktop} overlayRef={overlayRef} onNoWebGL={onNoWebGL} shift={shift} />

      <div className="orc-scene-badge">
        <div className="orc-scene-badge-row">
          <KindChip kind="recon" label="Reconstrucción ilustrada" />
          <button type="button" className="orc-scene-help-btn" aria-expanded={helpOpen} onClick={() => setHelpOpen((v) => !v)} aria-label="Ayuda sobre la reconstrucción ilustrada">
            ?
          </button>
        </div>
        {helpOpen && (
          <div className="orc-scene-help-popover" role="note">
            {cerroNevadoFacts('scene').map((f) => (
              <p key={f.id}>{f.text}</p>
            ))}
          </div>
        )}
      </div>

      {!noWebGL && (
        <div className="orc-hotspots" ref={overlayRef} role="group" aria-label="Puntos de interés de la colonia">
          {CERRO_NEVADO_SPOTS.map((s, i) => (
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

      <header className="orc-top" ref={topRef}>
        <div className="orc-top-r1">
          <button type="button" className="pill orc-top-btn" onClick={onLeave} aria-label="Volver al mapa">
            {Icon.back}
            <span>Mapa</span>
          </button>
          <div className="orc-top-title">
            <strong>{CERRO_NEVADO_TITLE}</strong>
            <span>{QUESTION}</span>
          </div>
          <button type="button" className="pill orc-top-btn" ref={sourcesBtn} aria-haspopup="dialog" onClick={() => openSources(null)}>
            Fuentes
          </button>
        </div>
      </header>

      {isDesktop ? (
        <section className="orc-panel" ref={panelRef} aria-labelledby="cn-panel-title">
          {panelBody}
        </section>
      ) : (
        <BottomSheet className="orc-panel" labelledBy="cn-panel-title" sheetRef={panelRef} floor="peek" size={sheetSize} onSize={setSheetSize}>
          {panelBody}
        </BottomSheet>
      )}
      {showSources && <SourcesView list={SOURCES} kinds highlight={highlight} onClose={closeSources} place={QUESTION} fallbackFocus={() => sourcesBtn.current} />}
    </section>
    </SourcesContext.Provider>
  );
}

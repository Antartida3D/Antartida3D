import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CERRO_NEVADO_SOURCES,
  CERRO_NEVADO_SPOTS,
  CERRO_NEVADO_TITLE,
  cerroNevadoFacts,
  PTS,
  type CerroNevadoFact,
  type CerroNevadoSourceId,
} from '@antartida/core';
import { BottomSheet, type OpenSheetSize } from '../BottomSheet.tsx';
import { useIsDesktop } from '../hooks.ts';
import { useSceneFrame } from '../sceneFrame.tsx';
import { KindChip } from '../orcadas/KindChip.tsx';
import { Icon, Quoted } from '../ui.tsx';
import { CerroNevadoScene } from './CerroNevadoScene.tsx';

const QUESTION = PTS.find((p) => p.id === 'cerronevado')!.q;
const sourceAnchor = (id: string) => `cn-source-${id}`;

function FactCard({ fact, onOpenSource }: { fact: CerroNevadoFact; onOpenSource: (id: CerroNevadoSourceId) => void }) {
  return (
    <article className="orc-fact-card">
      <div className="orc-fact-top">
        <KindChip kind={fact.kind} />
      </div>
      <p className="orc-fact-text"><Quoted text={fact.text} /></p>
      {fact.sources.length > 0 && (
        <div className="orc-fact-srcs">
          <span className="orc-src-prefix">Fuente:</span>
          {fact.sources.map((id) => (
            <button key={id} type="button" className="orc-src-link" onClick={() => onOpenSource(id)}>
              {CERRO_NEVADO_SOURCES[id].short}
            </button>
          ))}
        </div>
      )}
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
  const headingRef = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);

  const spot = CERRO_NEVADO_SPOTS[index];
  const last = index === CERRO_NEVADO_SPOTS.length - 1;

  useEffect(() => {
    if (!moved.current) return;
    headingRef.current?.focus({ preventScroll: true });
  }, [index, showSources]);

  useEffect(() => {
    if (!showSources || !highlight) return;
    document.getElementById(sourceAnchor(highlight))?.scrollIntoView({ block: 'nearest' });
  }, [showSources, highlight]);

  const unfold = () => setSheetSize((size) => (size === 'peek' ? 'small' : size));
  const go = (next: number) => {
    moved.current = true;
    setShowSources(false);
    setHighlight(null);
    setIndex(next);
    unfold();
  };
  const openSources = (id: string | null) => {
    moved.current = true;
    setHighlight(id);
    setShowSources(true);
    unfold();
  };
  const closeSources = () => {
    moved.current = true;
    setShowSources(false);
    setHighlight(null);
    unfold();
  };
  const onNoWebGL = useCallback(() => setNoWebGL(true), []);
  // The scene fills the screen: its view moves to the part the bar and the panel leave free.
  const shift = useSceneFrame(rootRef, topRef, panelRef, isDesktop, true);

  const panelBody = (
    <>
      <div className="orc-panel-scroll">
        <div className="orc-panel-head">
          <span id="cn-panel-label" className="orc-kicker hand">
            {showSources ? 'Fuentes de la colonia' : `Punto ${index + 1} de ${CERRO_NEVADO_SPOTS.length}`}
          </span>
          <h2 className="orc-chapter-h2" ref={headingRef} tabIndex={-1}>
            {showSources ? 'De dónde sale cada dato' : spot.label}
          </h2>
        </div>
        {showSources ? (
          <ul className="mar-sources">
            {(Object.entries(CERRO_NEVADO_SOURCES) as [CerroNevadoSourceId, (typeof CERRO_NEVADO_SOURCES)[CerroNevadoSourceId]][]).map(([id, src]) => (
              <li key={id} id={sourceAnchor(id)} className={`mar-source${id === highlight ? ' is-highlight' : ''}`}>
                <strong>{src.label}</strong>
                <span>{src.org}</span>
                <span>Consultado el {src.consulted.split('-').reverse().join('/')}</span>
                <a href={src.url} target="_blank" rel="noreferrer">
                  Abrir la fuente
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <div className="orc-chapter-content">
            {index === 0 && <p className="orc-question">{QUESTION}</p>}
            <p className="orc-lead">{spot.subtitle}</p>
            {noWebGL && <p className="cn-no3d">Sin gráficos 3D en este navegador: el recorrido sigue en palabras.</p>}
            <div className="orc-facts-list">
              {cerroNevadoFacts(spot.id).map((fact) => (
                <FactCard key={fact.id} fact={fact} onOpenSource={openSources} />
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="orc-bar ebar">
        {showSources ? (
          <button type="button" className="btn primary" onClick={closeSources}>
            Volver a la colonia
          </button>
        ) : (
          <>
            {index > 0 && (
              <button type="button" className="btn ghost" onClick={() => go(index - 1)}>
                Atrás
              </button>
            )}
            <button type="button" className="btn primary" onClick={() => (last ? onLeave() : go(index + 1))}>
              {last ? 'Volver al mapa' : 'Siguiente'}
            </button>
          </>
        )}
      </div>
    </>
  );

  return (
    <section
      ref={rootRef}
      className={`orc mar cn${!isDesktop && sheetSize === 'tall' ? ' is-panel-expanded' : ''}${!isDesktop && sheetSize === 'peek' ? ' is-panel-peek' : ''}`}
      aria-label={CERRO_NEVADO_TITLE}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && showSources) closeSources();
      }}
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
          <button type="button" className="pill orc-top-btn" aria-pressed={showSources} onClick={() => (showSources ? closeSources() : openSources(null))}>
            Fuentes
          </button>
        </div>
      </header>

      {isDesktop ? (
        <section className="orc-panel" ref={panelRef} aria-labelledby="cn-panel-label">
          {panelBody}
        </section>
      ) : (
        <BottomSheet className="orc-panel" labelledBy="cn-panel-label" sheetRef={panelRef} floor="peek" size={sheetSize} onSize={setSheetSize}>
          {panelBody}
        </BottomSheet>
      )}
    </section>
  );
}

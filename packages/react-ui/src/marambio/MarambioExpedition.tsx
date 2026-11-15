import { useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  MARAMBIO_GUIDING_QUESTION,
  MARAMBIO_OSM_SOURCE_ID,
  MARAMBIO_SOURCES,
  MARAMBIO_SPOTS,
  MARAMBIO_TITLE,
  marambioFacts,
  marambioSourcesOf,
  type MarambioFact,
  type MarambioSpotId,
} from '@antartida/core';
import { BottomSheet, type OpenSheetSize } from '../BottomSheet.tsx';
import { useIsDesktop } from '../hooks.ts';
import { KindChip } from '../orcadas/KindChip.tsx';
import { Icon } from '../ui.tsx';
import { MarambioScene } from './MarambioScene.tsx';
import { SPOT_VIEWS } from './spots.ts';

const sourceAnchor = (id: string) => `mar-source-${id}`;

function FactCard({ fact, onOpenSource }: { fact: MarambioFact; onOpenSource: (id: string) => void }) {
  const sources = marambioSourcesOf(fact);
  return (
    <article className="orc-fact-card">
      <div className="orc-fact-top">
        <KindChip kind={fact.kind} />
      </div>
      <p className="orc-fact-text">{fact.text}</p>
      {sources.length > 0 && (
        <div className="orc-fact-srcs">
          <span className="orc-src-prefix">Fuente:</span>
          {sources.map((src) => (
            <button key={src.id} type="button" className="orc-src-link" onClick={() => onOpenSource(src.id)}>
              {src.short}
            </button>
          ))}
        </div>
      )}
    </article>
  );
}

/** Always-visible label of the scene: it is an illustrated reconstruction, and what that means. */
function SceneBadge({ onOpenSource }: { onOpenSource: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const helpRef = useRef<HTMLButtonElement>(null);
  const facts = marambioFacts('scene');
  return (
    <div className="orc-scene-badge">
      <div className="orc-scene-badge-row">
        <KindChip kind="recon" label="Reconstrucción ilustrada" />
        <button
          type="button"
          className="orc-scene-help-btn"
          ref={helpRef}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          aria-label="Ayuda sobre la reconstrucción ilustrada"
        >
          ?
        </button>
      </div>
      {open && (
        <div className="orc-scene-help-popover" role="note">
          {facts.map((f) => (
            <p key={f.id}>{f.text}</p>
          ))}
          <p>
            <button
              type="button"
              className="orc-scene-sources-link"
              onClick={() => {
                // The link goes away with the note: the focus stays in the page, on its button.
                helpRef.current?.focus();
                setOpen(false);
                onOpenSource(MARAMBIO_OSM_SOURCE_ID);
              }}
            >
              Ver fuentes
            </button>
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Base Marambio: a diorama of the base to walk round, one point of interest at a time. First
 * delivery of the expedition (#74): no chapters yet, the visit ends at the last point.
 */
export function MarambioExpedition({ reduced, onLeave }: { reduced: boolean; onLeave: (done: boolean) => void }) {
  const isDesktop = useIsDesktop(900);
  const [index, setIndex] = useState(0);
  const [showSources, setShowSources] = useState(false);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [sheetSize, setSheetSize] = useState<OpenSheetSize>('small');
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);

  const spot = MARAMBIO_SPOTS[index];
  const last = index === MARAMBIO_SPOTS.length - 1;
  const facts = marambioFacts(spot.id);

  // After a change of point or of view, the heading takes the focus so a screen reader reads on from it.
  useEffect(() => {
    if (!moved.current) return;
    headingRef.current?.focus({ preventScroll: true });
  }, [index, showSources]);

  useEffect(() => {
    if (!showSources || !highlight) return;
    document.getElementById(sourceAnchor(highlight))?.scrollIntoView({ block: 'nearest' });
  }, [showSources, highlight]);

  const go = (next: number) => {
    moved.current = true;
    setShowSources(false);
    setHighlight(null);
    setIndex(next);
    // A sheet folded down to its title opens again on the new point.
    setSheetSize((size) => (size === 'peek' ? 'small' : size));
  };
  const openSources = (id: string | null) => {
    moved.current = true;
    setHighlight(id);
    setShowSources(true);
    setSheetSize((size) => (size === 'peek' ? 'small' : size));
  };
  const closeSources = () => {
    moved.current = true;
    setShowSources(false);
    setHighlight(null);
    setSheetSize((size) => (size === 'peek' ? 'small' : size));
  };

  const panelBody = (
    <>
      <div className="orc-panel-scroll">
        <div className="orc-panel-head">
          <span id="mar-panel-label" className="orc-kicker hand">
            {showSources ? 'Fuentes de la base' : `Punto ${index + 1} de ${MARAMBIO_SPOTS.length}`}
          </span>
          <h2 className="orc-chapter-h2" ref={headingRef} tabIndex={-1}>
            {showSources ? 'De dónde sale cada dato' : spot.label}
          </h2>
        </div>
        {showSources ? (
          <ul className="mar-sources">
            {MARAMBIO_SOURCES.map((src) => (
              <li key={src.id} id={sourceAnchor(src.id)} className={`mar-source${src.id === highlight ? ' is-highlight' : ''}`}>
                <strong>{src.label}</strong>
                <span>{src.org}</span>
                <span>
                  Consultado el {src.consulted}
                  {src.license ? ` · ${src.license}` : ''}
                </span>
                <a href={src.url} target="_blank" rel="noreferrer">
                  Abrir la fuente
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <div className="orc-chapter-content">
            {index === 0 && <p className="orc-question">{MARAMBIO_GUIDING_QUESTION}</p>}
            <p className="orc-lead">{spot.subtitle}</p>
            <div className="orc-facts-list">
              {facts.map((fact) => (
                <FactCard key={fact.id} fact={fact} onOpenSource={openSources} />
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="orc-bar ebar">
        {showSources ? (
          <button type="button" className="btn primary" onClick={closeSources}>
            Volver a la base
          </button>
        ) : (
          <>
            {index > 0 && (
              <button type="button" className="btn ghost" onClick={() => go(index - 1)}>
                Atrás
              </button>
            )}
            <button type="button" className="btn primary" onClick={() => (last ? onLeave(true) : go(index + 1))}>
              {last ? 'Terminar la visita' : 'Siguiente'}
            </button>
          </>
        )}
      </div>
    </>
  );

  return (
    <section
      className={`orc mar${!isDesktop && sheetSize === 'tall' ? ' is-panel-expanded' : ''}${!isDesktop && sheetSize === 'peek' ? ' is-panel-peek' : ''}`}
      aria-label={`Expedición ${MARAMBIO_TITLE}`}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && showSources) closeSources();
      }}
    >
      <MarambioScene focus={spot.id} reduced={reduced} sheetTall={!isDesktop && sheetSize === 'tall'} sidePanel={isDesktop} overlayRef={overlayRef} />

      <SceneBadge onOpenSource={openSources} />

      <div className="orc-hotspots" ref={overlayRef} role="group" aria-label="Puntos de interés de la base">
        {MARAMBIO_SPOTS.map((s, i) => {
          const active = i === index;
          const [left, top] = SPOT_VIEWS[s.id as MarambioSpotId].fallbackPct;
          return (
            <button
              key={s.id}
              type="button"
              data-hotspot={s.id}
              className={`orc-hs${active ? ' is-active' : ''}`}
              // Place over the drawing shown without WebGL (marambio.css); the 3D scene sets its own.
              style={{ '--fx': left, '--fy': top } as CSSProperties}
              aria-label={`Punto de interés: ${s.label}`}
              aria-pressed={active}
              onClick={() => go(i)}
            >
              <span className="orc-hs-ring" aria-hidden="true" />
              <span className="orc-hs-dot" aria-hidden="true" />
              <span className="orc-hs-lbl">{s.shortLabel}</span>
            </button>
          );
        })}
      </div>

      <header className="orc-top">
        <div className="orc-top-r1">
          <button type="button" className="pill orc-top-btn" onClick={() => onLeave(false)} aria-label="Volver al mapa">
            {Icon.back}
            <span>Mapa</span>
          </button>
          <div className="orc-top-title">
            <strong>{MARAMBIO_TITLE}</strong>
            <span>{MARAMBIO_GUIDING_QUESTION}</span>
          </div>
          <button type="button" className="pill orc-top-btn" aria-pressed={showSources} onClick={() => (showSources ? closeSources() : openSources(null))}>
            Fuentes
          </button>
        </div>
      </header>

      {isDesktop ? (
        <div className="orc-panel" role="region" aria-labelledby="mar-panel-label">
          {panelBody}
        </div>
      ) : (
        <BottomSheet className="orc-panel" labelledBy="mar-panel-label" sheetRef={panelRef} floor="peek" size={sheetSize} onSize={setSheetSize}>
          {panelBody}
        </BottomSheet>
      )}
    </section>
  );
}

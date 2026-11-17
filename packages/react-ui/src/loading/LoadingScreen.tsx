import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import {
  LOADER_FADE_MS,
  LOADER_STEP_MS,
  LOADER_STEP_TEXT,
  LOADER_STEP_TEXT_2D,
  MAP_2D_ENABLED,
  MAP3D_STEPS,
  READY_CARD,
  pacedSteps,
  loaderFact,
  map3dLoadingStore,
} from '@antartida/core';
import { CompassRose } from '../Cartography.tsx';
import { trapTab, useLoadingStore, useReducedMotion } from '../hooks.ts';
import { Icon } from '../ui.tsx';
import { Poster } from './Poster.tsx';

type LoadingMode = '2d' | '3d';

export interface LoadingScreenProps {
  mode: LoadingMode;
  initialized: boolean;
  map2dReady: boolean;
  /** The 3D map cannot be used (no WebGL, or it failed): only the sketch, and the app goes on in 2D. */
  unavailable3D: boolean;
  /** First visit (#258): when the map is ready the card turns into «Mapa listo» and waits for the person. */
  firstVisit: boolean;
  /** The ready card showed up (first visit). */
  onReady: () => void;
  /** «Exploración guiada». */
  onExplore: () => void;
  /** «Sin guía» or Escape on the ready card. */
  onSkip: () => void;
  /** Later visits: the loader fades out by itself. */
  onDone: () => void;
  onFallback2D: () => void;
}

export function LoadingScreen({
  mode, initialized, map2dReady, unavailable3D, firstVisit, onReady, onExplore, onSkip, onDone, onFallback2D,
}: LoadingScreenProps) {
  const snapshot = useLoadingStore(map3dLoadingStore);
  const reduced = useReducedMotion();
  const [leaving, setLeaving] = useState(false);
  const [showReady, setShowReady] = useState(false);
  // The ring of the focused button shows only once the keyboard is used: the card focuses «Exploración guiada» by itself.
  const [keyboard, setKeyboard] = useState(false);
  // Steps shown as done: they follow the real ones at a readable pace.
  const [shown, setShown] = useState(0);
  const card = useRef<HTMLDivElement>(null);
  const exploreRef = useRef<HTMLButtonElement>(null);
  const fact = useMemo(() => loaderFact(), []);
  const live = useRef({ firstVisit, onReady, onDone });
  live.current = { firstVisit, onReady, onDone };

  const is3D = mode === '3d';
  const texts = is3D ? snapshot.steps.map((step) => LOADER_STEP_TEXT[step]) : LOADER_STEP_TEXT_2D;
  const completed = is3D
    ? snapshot.steps.map((step) => Boolean(snapshot.done[step as (typeof MAP3D_STEPS)[number]]))
    : [initialized, map2dReady];
  const total = texts.length;
  const doneCount = completed.filter(Boolean).length;
  const ready = initialized && (is3D ? snapshot.ready : map2dReady);
  const target = ready ? total : doneCount;
  // «n de 5» counts the step under way, as the card tells it.
  const finished = ready && shown >= total;
  const n = finished ? total : Math.min(shown + 1, total);
  const text = texts[n - 1] ?? '';
  const hasError = snapshot.error !== null;

  useEffect(() => {
    const next = pacedSteps(shown, target);
    if (next === shown) return;
    // A step that went back (a reset) shows at once; a new one waits its turn.
    const id = window.setTimeout(() => setShown(next), next < shown ? 0 : LOADER_STEP_MS);
    return () => window.clearTimeout(id);
  }, [shown, target]);

  useEffect(() => {
    if (!finished) {
      setShowReady(false);
      setLeaving(false);
      return;
    }
    if (live.current.firstVisit) {
      setShowReady(true);
      live.current.onReady();
      return;
    }
    if (reduced) {
      live.current.onDone();
      return;
    }
    setLeaving(true);
    const fade = window.setTimeout(() => live.current.onDone(), LOADER_FADE_MS);
    return () => window.clearTimeout(fade);
  }, [finished, reduced]);

  useEffect(() => {
    if (showReady) exploreRef.current?.focus();
  }, [showReady]);

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Tab') setKeyboard(true);
    if (!showReady) return;
    if (e.key === 'Escape') {
      e.stopPropagation();
      onSkip();
    } else trapTab(e, card.current);
  };

  const live3DError = hasError && is3D;
  const liveAnnouncement = live3DError
    ? `Error de carga: ${snapshot.error}. Puedes continuar con el mapa 2D.`
    : showReady
      ? `${READY_CARD.status}. ${READY_CARD.title}.`
      : finished
        ? 'Mapa listo.'
        : unavailable3D
          ? 'Seguimos con el mapa en 2D.'
          : `${text}. ${n} de ${total} pasos.`;

  const brand = (
    <span className="ld-brand">
      <CompassRose />
      <span>Antártida por descubrir</span>
    </span>
  );

  return (
    <section
      className="ld"
      data-loading-variant={is3D ? 'map3d' : 'map2d'}
      data-leaving={leaving ? 'true' : undefined}
      data-keyboard={keyboard ? 'true' : undefined}
      aria-label={is3D ? 'Cargando mapa 3D de la Antártida' : 'Cargando mapa 2D de la Antártida'}
      onKeyDown={onKeyDown}
    >
      <span className="ld-sr-only" aria-live="polite">
        {liveAnnouncement}
      </span>

      <Poster progress={finished ? 1 : shown / total} sketchOnly={unavailable3D || hasError} still={reduced} />

      <div className="ld-card" ref={card}>
        <div className="ld-head">
          {brand}
          {showReady ? (
            <span className="ld-status" role="status">{Icon.check}{READY_CARD.status}</span>
          ) : unavailable3D ? (
            <span className="ld-count">Mapa 2D</span>
          ) : (
            <span className="ld-count">{n} de {total}</span>
          )}
        </div>

        {showReady ? (
          <>
            <div className="ld-bar" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={total} aria-valuetext="Completado"><i style={{ width: '100%' }} /></div>
            <h1 className="ld-title">{READY_CARD.title}</h1>
            <p className="ld-text">{READY_CARD.text}</p>
            <div className="ld-actions">
              <button type="button" className="btn" onClick={onSkip}>{READY_CARD.skip}</button>
              <button type="button" className="btn primary" ref={exploreRef} onClick={onExplore}>{READY_CARD.explore}{Icon.next}</button>
            </div>
          </>
        ) : (
          <>
            <h1 className="ld-title">{unavailable3D ? 'Seguimos con el mapa en 2D' : text}</h1>
            {unavailable3D && <p className="ld-text">El relieve 3D no pudo cargar en este dispositivo. Abrimos el mapa dibujado en su lugar.</p>}
            <div
              className="ld-bar"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={n}
              aria-valuetext={text}
            >
              <i style={{ width: `${Math.round((n / total) * 100)}%` }} />
            </div>

            {live3DError && (
              <p className="ld-error" role="alert">
                {snapshot.error} Puedes continuar con el mapa 2D.
              </p>
            )}

            {!unavailable3D && (
              <div className="ld-fact">
                <span className="ld-kicker">Mientras tanto · dato real</span>
                <p className="ld-text">{fact.sentence}</p>
                <p className="ld-source">
                  Fuentes: {fact.orgs.join(', ')} · ficha <em>“{fact.title}”</em>
                </p>
              </div>
            )}

            {/* With the 2D map off (#227) nobody picks it: the app switches to it alone if the 3D map fails. */}
            {MAP_2D_ENABLED && (
              <div className="ld-actions">
                <button type="button" className="btn ghost" onClick={onFallback2D}>
                  Ver mapa 2D
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

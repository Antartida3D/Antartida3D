import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import {
  ANTARCTICA_PATH,
  ICE_SHELF_SEAM,
  ICE_SHELVES_PATH,
  LOADER_FADE_MS,
  LOADER_STEP_MS,
  LOADER_STEP_TEXT,
  LOADER_STEP_TEXT_2D,
  MAP_2D_ENABLED,
  MAP3D_STEPS,
  READY_CARD,
  RELIEF_CONTOURS,
  loaderFact,
  map3dLoadingStore,
  pacedSteps,
  splitAntarcticaCoastline,
} from '@antartida/core';
import { trapTab, useLoadingStore, useReducedMotion } from '../hooks.ts';
import { Icon } from '../ui.tsx';

type LoadingMode = '2d' | '3d';

function StepCheckIcon() {
  return (
    <svg viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d="M2.2 6.3 4.8 8.9 9.8 3.2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Trims the Ross antimeridian seam by 2 map units at both ends so the outer front outline stays continuous. */
function trimmedShelfSeam(seam: string): string {
  const m = seam.match(/M500,([\d.]+)L500,([\d.]+)/);
  if (!m) return seam;
  return `M500,${(parseFloat(m[1]!) + 2).toFixed(1)}L500,${(parseFloat(m[2]!) - 2).toFixed(1)}`;
}

const TRIMMED_SHELF_SEAM = trimmedShelfSeam(ICE_SHELF_SEAM);
const CONTOUR_STYLES = [
  { fillOpacity: 0.45, strokeOpacity: 0.18, strokeWidth: 1.15 },
  { fillOpacity: 0.5, strokeOpacity: 0.22, strokeWidth: 1.2 },
  { fillOpacity: 0.55, strokeOpacity: 0.26, strokeWidth: 1.25 },
  { fillOpacity: 0.6, strokeOpacity: 0.32, strokeWidth: 1.3 },
  { fillOpacity: 0.7, strokeOpacity: 0.4, strokeWidth: 1.35 },
] as const;

function AntarcticaIllustration({
  progress,
  reducedMotion,
  sketchOnly,
}: {
  progress: number;
  reducedMotion: boolean;
  sketchOnly: boolean;
}) {
  const { main, islands } = useMemo(() => splitAntarcticaCoastline(ANTARCTICA_PATH), []);
  const reveal = reducedMotion ? 1 : Math.max(0.08, 0.12 + progress * 0.88);
  const shelfOpacity = Math.min(1, 0.24 + progress * 1.1);
  const landOpacity = Math.min(1, 0.24 + progress * 1.3);

  return (
    <div className="ld-cam ld-cam-map" aria-hidden="true">
      <svg viewBox="110 130 780 720" role="presentation">
        <defs>
          <radialGradient id="ld-surface" cx="44%" cy="38%" r="68%">
            <stop offset="0" stopColor="#F8F6EE" />
            <stop offset="1" stopColor="#E5EDF2" />
          </radialGradient>
          <clipPath id="ld-land-clip">
            <path d={main} />
            {islands && <path d={islands} />}
          </clipPath>
          <clipPath id="ld-reveal">
            <circle
              className="ld-reveal"
              cx="500"
              cy="500"
              r="420"
              style={{ transform: `scale(${reveal})`, transformOrigin: '500px 500px' }}
            />
          </clipPath>
        </defs>

        <g className="ld-map-rings" fill="none" stroke="currentColor" strokeWidth="1">
          <circle cx="500" cy="500" r="150" />
          <circle cx="500" cy="500" r="280" />
          <circle cx="500" cy="500" r="412" />
          <path d="M500 86V914M86 500H914M207 207 793 793M793 207 207 793" />
        </g>

        <path className="ld-map-coast-base" d={main} fill="none" />
        {islands && <path className="ld-map-coast-base" d={islands} fill="none" />}

        {!sketchOnly && (
          <g clipPath="url(#ld-reveal)" style={{ opacity: landOpacity }}>
            <path className="ld-map-wash" d={main} strokeWidth="10" opacity="0.22" />
            <path className="ld-map-wash" d={ICE_SHELVES_PATH} strokeWidth="8" opacity="0.18" />

            <g style={{ opacity: shelfOpacity }}>
              <path className="ld-map-shelves-line" d={ICE_SHELVES_PATH} />
              <path className="ld-map-shelves-fill" d={ICE_SHELVES_PATH} />
              <path className="ld-map-seam" d={TRIMMED_SHELF_SEAM} />
            </g>

            <path d={main} fill="url(#ld-surface)" />
            {islands && <path d={islands} fill="url(#ld-surface)" />}

            <g clipPath="url(#ld-land-clip)">
              {RELIEF_CONTOURS.map((band, i) => {
                const style = CONTOUR_STYLES[i] ?? CONTOUR_STYLES[CONTOUR_STYLES.length - 1]!;
                return (
                  <path
                    key={band.elevationM}
                    className="ld-map-contour"
                    d={band.path}
                    fillOpacity={style.fillOpacity}
                    strokeOpacity={style.strokeOpacity}
                    strokeWidth={style.strokeWidth}
                  />
                );
              })}
            </g>

            <path className="ld-map-coast" d={main} fill="none" />
            {islands && <path className="ld-map-coast ld-map-islands" d={islands} fill="none" />}
          </g>
        )}
      </svg>
    </div>
  );
}

export interface LoadingScreenProps {
  mode: LoadingMode;
  initialized: boolean;
  map2dReady: boolean;
  /** The 3D map cannot be used (no WebGL, or it failed): only the base sketch, and the app goes on in 2D. */
  unavailable3D: boolean;
  /** First visit (#256, #276): when the map is ready the bottom block shows «Mapa listo» and waits for the person. */
  firstVisit: boolean;
  /** The ready actions showed up (first visit). */
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
      ? `${READY_CARD.title}.`
      : finished
        ? 'Mapa listo.'
        : unavailable3D
          ? 'Seguimos con el mapa en 2D.'
          : `${text}. ${n} de ${total} pasos.`;

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

      <AntarcticaIllustration
        progress={finished ? 1 : shown / total}
        reducedMotion={reduced}
        sketchOnly={unavailable3D || hasError}
      />

      <div className="ld-card" ref={card}>
        <header className="ld-header">
          <span className="ld-eyebrow">Atlas antártico · {is3D ? 'Vista 3D' : 'Carta 2D'}</span>
          <h1 className="ld-serif">{unavailable3D ? 'Seguimos con el mapa en 2D' : 'Desplegando la carta austral'}</h1>
          {unavailable3D && (
            <p className="ld-fallback-note">
              El relieve 3D no pudo cargar en este dispositivo. Abrimos el mapa dibujado en su lugar.
            </p>
          )}
        </header>

        <div
          className="ld-bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={n}
          aria-valuetext={finished ? 'Completado' : text}
        >
          <i style={{ width: `${Math.round((n / total) * 100)}%` }} />
        </div>

        <ul className="ld-steps" style={{ '--ld-steps': total } as CSSProperties}>
          {texts.map((label, index) => {
            const isDone = finished || index < shown;
            const isCurrent = !isDone && index === shown && !live3DError;
            const stateClass = isDone ? 'done' : isCurrent ? 'now' : 'todo';
            return (
              <li key={label} className={`ld-step ${stateClass}`}>
                <span className="ld-mark" aria-hidden="true">
                  {isDone && <StepCheckIcon />}
                  {isCurrent && !reduced && <span className="ld-pulse" />}
                </span>
                <span className="ld-lbl">{label}</span>
              </li>
            );
          })}
        </ul>

        {live3DError && (
          <p className="ld-error" role="alert">
            {snapshot.error} Puedes continuar con el mapa 2D.
          </p>
        )}

        {showReady ? (
          <div className="ld-extra">
            <h2 className="ld-ready-title">{READY_CARD.title}</h2>
            <p className="ld-text">{READY_CARD.text}</p>
            <div className="ld-actions">
              <button type="button" className="btn" onClick={onSkip}>{READY_CARD.skip}</button>
              <button type="button" className="btn primary" ref={exploreRef} onClick={onExplore}>
                {READY_CARD.explore}{Icon.next}
              </button>
            </div>
          </div>
        ) : (
          !unavailable3D && (
            <div className="ld-extra ld-fact">
              <span className="ld-kicker">Mientras tanto · dato real</span>
              <p className="ld-text">{fact.sentence}</p>
              <p className="ld-source">
                Fuentes: {fact.orgs.join(', ')} · ficha <em>“{fact.title}”</em>
              </p>
            </div>
          )
        )}

        {/* With the 2D map off (#227) nobody picks it: the app switches to it alone if the 3D map fails. */}
        {MAP_2D_ENABLED && !showReady && (
          <div className="ld-actions">
            <button type="button" className="btn ghost" onClick={onFallback2D}>
              Ver mapa 2D
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

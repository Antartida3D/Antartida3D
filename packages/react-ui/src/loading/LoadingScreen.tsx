import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ANTARCTICA_PATH,
  ICE_SHELVES_PATH,
  MAP_2D_ENABLED,
  MAP3D_STEPS,
  map3dLoadingStore,
  splitAntarcticaCoastline,
} from '@antartida/core';
import { useLoadingStore, useReducedMotion } from '../hooks.ts';

type LoadingMode = '2d' | '3d';

interface StepCopy {
  readonly id: string;
  readonly label: string;
  readonly what: string;
}

const MAP3D_STEP_COPY: Record<(typeof MAP3D_STEPS)[number], StepCopy> = {
  chunk: { id: 'chunk', label: 'Motor y escena 3D', what: 'Código cartográfico' },
  terrain: { id: 'terrain', label: 'Relieve e hidrología', what: 'Malla continental y texturas' },
  ocean: { id: 'ocean', label: 'Océano Austral', what: 'Batimetría y superficies' },
  lands: { id: 'lands', label: 'Tierras australes', what: 'Costas y tonos de mapa' },
  shaders: { id: 'shaders', label: 'Luces y trazos', what: 'Compilación inicial WebGL' },
};

const MAP2D_STEP_COPY: readonly StepCopy[] = [
  { id: 'initialized', label: 'Inicialización', what: 'Preparando la carta' },
  { id: 'map2d', label: 'Carta 2D', what: 'Mapa base y trazos' },
];

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

function AntarcticaIllustration({ progress, reducedMotion }: { progress: number; reducedMotion: boolean }) {
  const { main, islands } = useMemo(() => splitAntarcticaCoastline(ANTARCTICA_PATH), []);
  const reveal = reducedMotion ? 1 : Math.max(0.08, 0.12 + progress * 0.88);
  const shelfOpacity = Math.min(1, 0.16 + progress * 1.1);
  const landOpacity = Math.min(1, 0.18 + progress * 1.35);

  return (
    <div className="ld-cam ld-cam-map" aria-hidden="true">
      <svg viewBox="40 40 920 920" role="presentation">
        <defs>
          <radialGradient id="ld-surface" cx="42%" cy="35%" r="76%">
            <stop offset="0" stopColor="#F7F1E2" />
            <stop offset="1" stopColor="#EDDFC0" />
          </radialGradient>
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

        <g clipPath="url(#ld-reveal)" style={{ opacity: landOpacity }}>
          <path className="ld-map-surface" d={main} fill="url(#ld-surface)" />
          {islands && <path className="ld-map-surface" d={islands} fill="url(#ld-surface)" />}
          <path className="ld-map-coast" d={main} fill="none" />
          {islands && <path className="ld-map-coast" d={islands} fill="none" />}
          <path className="ld-map-shelves" d={ICE_SHELVES_PATH} style={{ opacity: shelfOpacity }} />
          <path className="ld-map-hatch" d={main} />
        </g>
      </svg>
    </div>
  );
}

export interface LoadingScreenProps {
  mode: LoadingMode;
  initialized: boolean;
  map2dReady: boolean;
  onDone: () => void;
  onFallback2D: () => void;
}

export function LoadingScreen({ mode, initialized, map2dReady, onDone, onFallback2D }: LoadingScreenProps) {
  const snapshot = useLoadingStore(map3dLoadingStore);
  const reducedMotion = useReducedMotion();
  const [leaving, setLeaving] = useState(false);
  const [illustrationProgress, setIllustrationProgress] = useState(0);
  const mountedAt = useRef<number | null>(null);
  const finishing = useRef(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  const is3D = mode === '3d';
  const steps = is3D ? snapshot.steps.map((step) => MAP3D_STEP_COPY[step]) : MAP2D_STEP_COPY;
  const completed = is3D
    ? steps.map((step) => Boolean(snapshot.done[step.id as (typeof MAP3D_STEPS)[number]]))
    : [initialized, map2dReady];
  const doneCount = completed.filter(Boolean).length;
  const total = steps.length;
  const ready = initialized && (is3D ? snapshot.ready : map2dReady);
  const progress = total > 0 ? doneCount / total : 0;
  const currentIndex = completed.findIndex((done) => !done);
  const currentStep = currentIndex >= 0 ? steps[currentIndex] : null;

  useEffect(() => {
    if (mountedAt.current === null) mountedAt.current = performance.now();
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      setIllustrationProgress(progress);
      return;
    }
    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => setIllustrationProgress(progress));
    });
    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [progress, reducedMotion]);

  useEffect(() => {
    if (!ready) {
      finishing.current = false;
      return;
    }
    if (finishing.current) return;
    finishing.current = true;
    if (reducedMotion) {
      setLeaving(true);
      doneRef.current();
      return;
    }

    const started = mountedAt.current ?? performance.now();
    const minimumWait = Math.max(0, 1800 - (performance.now() - started));
    const illustrationWait = 1382;
    const wait = Math.max(minimumWait, illustrationWait);
    let fadeTimer = 0;
    const holdTimer = window.setTimeout(() => {
      setLeaving(true);
      fadeTimer = window.setTimeout(() => doneRef.current(), 550);
    }, wait);
    return () => {
      window.clearTimeout(holdTimer);
      window.clearTimeout(fadeTimer);
      finishing.current = false;
    };
  }, [ready, reducedMotion]);

  useEffect(() => {
    if (!ready && leaving) setLeaving(false);
  }, [leaving, ready]);

  const liveAnnouncement = snapshot.error && is3D
    ? `Error de carga: ${snapshot.error}. Puedes continuar con el mapa 2D.`
    : ready
      ? 'Carta lista.'
      : currentStep
        ? `${currentStep.label}. ${doneCount} de ${total} pasos.`
        : '';

  return (
    <section
      className="ld"
      data-loading-variant={is3D ? 'map3d' : 'map2d'}
      data-leaving={leaving ? 'true' : undefined}
      aria-label={is3D ? 'Cargando mapa 3D de la Antártida' : 'Cargando mapa 2D de la Antártida'}
    >
      <span className="ld-sr-only" aria-live="polite">
        {liveAnnouncement}
      </span>

      <AntarcticaIllustration progress={illustrationProgress} reducedMotion={reducedMotion} />

      <div className="ld-card ld-panel">
        <header className="ld-header">
          <span className="ld-eyebrow">Atlas antártico · {is3D ? 'Vista 3D' : 'Carta 2D'}</span>
          <h1 className="ld-serif">Desplegando la carta austral</h1>
        </header>

        <div
          className="ld-bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={doneCount}
          aria-valuetext={currentStep?.label ?? 'Completado'}
        >
          <i style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>

        <ul className="ld-steps">
          {steps.map((step, index) => {
            const isDone = completed[index] === true;
            const isCurrent = !isDone && index === currentIndex && !(is3D && snapshot.error);
            const stateClass = isDone ? 'done' : isCurrent ? 'now' : 'todo';
            return (
              <li key={step.id} className={`ld-step ${stateClass}`}>
                <span className="ld-mark" aria-hidden="true">
                  {isDone && <StepCheckIcon />}
                  {isCurrent && !reducedMotion && <span className="ld-pulse" />}
                </span>
                <span className="ld-lbl">{step.label}</span>
                <span className="ld-what">{step.what}</span>
              </li>
            );
          })}
        </ul>

        {snapshot.error && is3D && (
          <p className="ld-error" role="alert">
            {snapshot.error} Puedes continuar con el mapa 2D.
          </p>
        )}

        {/* With the 2D map off (#227) nobody picks it: the app switches to it alone if the 3D map fails. */}
        {MAP_2D_ENABLED && (
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

import { useEffect, useMemo, useState } from 'react';
import {
  ANTARCTICA_PATH,
  HOME_TILT_DEG,
  ICE_SHELVES_PATH,
  MAP3D_STEPS,
  ORCADAS_POINT,
  PTS,
  SOUTH_AMERICA_PATH,
  map3dLoadingStore,
  splitAntarcticaCoastline,
} from '@antartida/core';
import { useIsDesktop, useLoadingStore, useReducedMotion } from '../hooks.ts';

interface StepCopy {
  readonly label: string;
  readonly what: string;
}

const MAP3D_STEP_COPY: Record<(typeof MAP3D_STEPS)[number], StepCopy> = {
  chunk: { label: 'Motor y escena 3D', what: 'Código del módulo tridimensional' },
  terrain: { label: 'Relieve e hidrología', what: 'Malla continental y texturas' },
  ocean: { label: 'Océano Austral', what: 'Batimetría, olas y papel' },
  lands: { label: 'Tierras australes', what: 'Costas y tonos de mapa' },
  shaders: { label: 'Luces y trazos', what: 'Compilación inicial WebGL' },
};

const MAP3D_FACT_IDS = ['vostok', 'thwaites', 'erebus'] as const;

interface FactItem {
  readonly id: string;
  readonly text: string;
  readonly sourceLabel: string;
  readonly sourceUrl?: string;
}

function buildMap3DFacts(): FactItem[] {
  const items: FactItem[] = [];
  for (const id of MAP3D_FACT_IDS) {
    const point = PTS.find((p) => p.id === id);
    if (!point?.desc) continue;
    const firstSentence = point.desc.split(/(?<=\.)\s+/)[0] ?? point.desc;
    const src = point.sources?.[0];
    items.push({
      id,
      text: firstSentence,
      sourceLabel: src ? `${src.org} · ${src.label}` : 'Fuente verificada',
      sourceUrl: src?.url,
    });
  }
  return items;
}

function StepCheckIcon() {
  return (
    <svg viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d="M2.2 6.3 4.8 8.9 9.8 3.2"
        stroke="#1F2A36"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Map3DIllustration({
  progress,
  reducedMotion,
}: {
  progress: number;
  reducedMotion: boolean;
}) {
  const { main, islands } = useMemo(() => splitAntarcticaCoastline(ANTARCTICA_PATH), []);

  const seaOpacity = progress > 0.2 ? Math.min(1, 0.35 + progress * 0.65) : 0.15;
  const reveal = 0.28 + progress * 0.82;
  const cliffOpacity = progress >= 0.4 ? Math.min(1, (progress - 0.35) * 1.4) : 0.15;
  const landOpacity = progress >= 0.6 ? 1 : 0.35;
  const gratOpacity = progress >= 0.2 ? 0.55 : 0.25;
  const tilt = reducedMotion || progress >= 0.8 ? HOME_TILT_DEG : Math.round(progress * HOME_TILT_DEG);
  const planeTransform = `rotateX(${tilt}deg) scale(${(0.92 + progress * 0.08).toFixed(3)})`;

  return (
    <>
      <div
        className="ld-sea"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, #24486A 0%, #1C4061 45%, #183A59 100%)',
          opacity: seaOpacity,
        }}
      />
      <div className="ld-vignette" style={{ opacity: seaOpacity }} />
      <div className="ld-cam ld-cam-map">
        <div className="ld-plane" style={{ transform: planeTransform }}>
          <svg viewBox="40 40 920 920" aria-hidden="true">
            <defs>
              <filter id="ld-wc" x="-20%" y="-20%" width="140%" height="140%">
                <feTurbulence type="fractalNoise" baseFrequency="0.016" numOctaves="3" seed="7" />
                <feDisplacementMap in="SourceGraphic" scale="46" />
              </filter>
              <filter id="ld-soft" x="-10%" y="-10%" width="120%" height="120%">
                <feGaussianBlur stdDeviation="9" />
              </filter>
              <filter id="ld-relief" x="-5%" y="-5%" width="110%" height="110%">
                <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="4" seed="3" result="n" />
                <feDiffuseLighting in="n" surfaceScale="3" lightingColor="#ffffff" result="l">
                  <feDistantLight azimuth="225" elevation="42" />
                </feDiffuseLighting>
                <feComposite in="l" in2="SourceGraphic" operator="in" result="lc" />
                <feBlend in="SourceGraphic" in2="lc" mode="multiply" />
              </filter>
              <linearGradient id="ld-land" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#BFC891" />
                <stop offset="0.6" stopColor="#D0BE97" />
                <stop offset="1" stopColor="#D7CA98" />
              </linearGradient>
              <radialGradient id="ld-ice" cx="470" cy="470" r="380" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#F7FAFB" />
                <stop offset="0.6" stopColor="#EFF3F5" />
                <stop offset="1" stopColor="#D3E2EB" />
              </radialGradient>
              <radialGradient id="ld-sun" cx="380" cy="360" r="330" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.7" />
                <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
              </radialGradient>
              <mask id="ld-paint" maskUnits="userSpaceOnUse" x="40" y="40" width="920" height="920">
                <rect x="40" y="40" width="920" height="920" fill="#000" />
                <g filter="url(#ld-wc)">
                  <circle
                    className="ld-grow"
                    cx="500"
                    cy="500"
                    r="440"
                    fill="#fff"
                    style={{
                      transform: `scale(${reveal.toFixed(3)})`,
                      transformOrigin: '500px 500px',
                    }}
                  />
                </g>
              </mask>
            </defs>

            <g
              className="ld-fade"
              style={{
                opacity: gratOpacity,
                fill: 'none',
                stroke: 'rgba(243,235,221,.34)',
                strokeWidth: 1.2,
                strokeDasharray: '2 6',
              }}
            >
              <circle cx="500" cy="500" r="139" />
              <circle cx="500" cy="500" r="281" />
              <circle cx="500" cy="500" r="427" />
              <path d="M500 60V940M60 500H940M189 189L811 811M811 189L189 811" />
            </g>

            <g className="ld-fade" style={{ opacity: cliffOpacity * 0.45 }} filter="url(#ld-soft)">
              <path d={ICE_SHELVES_PATH} fill="none" stroke="#4A738C" strokeWidth="42" />
            </g>

            <path
              className="ld-fade"
              d={SOUTH_AMERICA_PATH}
              filter="url(#ld-relief)"
              style={{
                fill: 'url(#ld-land)',
                stroke: '#1F2A36',
                strokeWidth: 0.8,
                opacity: landOpacity,
              }}
            />

            <g className="ld-fade" mask="url(#ld-paint)" style={{ opacity: cliffOpacity }}>
              <path d={main} fill="#2E5876" style={{ transform: 'translateY(11.9px)' }} />
              <path d={main} fill="url(#ld-ice)" stroke="#1F2A36" strokeWidth="1.2" />
              {islands && <path d={islands} fill="url(#ld-ice)" stroke="#1F2A36" strokeWidth="0.9" />}
              <path d={ICE_SHELVES_PATH} fill="#D3E2EB" stroke="#4A738C" strokeWidth="0.8" />
              <circle cx="500" cy="500" r="380" fill="url(#ld-sun)" />
            </g>

            <g transform={`translate(${ORCADAS_POINT.x} ${ORCADAS_POINT.y})`}>
              <circle r="8" fill="#C0862F" fillOpacity="0.28" />
              <circle r="4.5" fill="#C0862F" stroke="#1F2A36" strokeWidth="1.4" />
            </g>
          </svg>
        </div>
      </div>
    </>
  );
}

export interface LoadingScreenProps {
  onDone: () => void;
  onFallback2D: () => void;
}

export function LoadingScreen({ onDone, onFallback2D }: LoadingScreenProps) {
  const snapshot = useLoadingStore(map3dLoadingStore);
  const reducedMotion = useReducedMotion();
  const isDesktop = useIsDesktop();

  const [leaving, setLeaving] = useState(false);
  const [paused, setPaused] = useState(false);
  const [factIndex, setFactIndex] = useState(0);
  const [visualDoneCount, setVisualDoneCount] = useState(0);

  const facts = useMemo(() => buildMap3DFacts(), []);

  // Pace visual step transitions so fast GPUs/caches still show the full animation (~450ms/step).
  useEffect(() => {
    if (reducedMotion || snapshot.error) return;
    if (visualDoneCount >= snapshot.doneCount) return;

    const timer = window.setTimeout(() => {
      setVisualDoneCount((prev) => Math.min(snapshot.doneCount, prev + 1));
    }, 450);
    return () => window.clearTimeout(timer);
  }, [reducedMotion, snapshot.error, snapshot.doneCount, visualDoneCount]);

  const effectiveDoneCount = reducedMotion ? snapshot.doneCount : Math.min(visualDoneCount, snapshot.doneCount);
  const effectiveReady = snapshot.ready && effectiveDoneCount >= snapshot.total;
  const effectiveCurrentStep = effectiveDoneCount < snapshot.total ? (snapshot.steps[effectiveDoneCount] ?? null) : null;

  // Rotate educational facts while loading unless paused by hover/focus or reduced motion.
  useEffect(() => {
    if (reducedMotion || paused || facts.length <= 1) return;
    const id = window.setInterval(() => {
      setFactIndex((prev) => (prev + 1) % facts.length);
    }, 6500);
    return () => window.clearInterval(id);
  }, [reducedMotion, paused, facts.length]);

  // Dismiss once all steps are visually complete; waits 600ms (paused while reading fact card).
  useEffect(() => {
    if (!effectiveReady) return;
    if (paused && !reducedMotion) return;

    const holdMs = reducedMotion ? 0 : 600;
    const fadeMs = reducedMotion ? 0 : 450;

    let fadeTimer = 0;
    const holdTimer = window.setTimeout(() => {
      setLeaving(true);
      fadeTimer = window.setTimeout(() => {
        onDone();
      }, fadeMs);
    }, holdMs);

    return () => {
      window.clearTimeout(holdTimer);
      window.clearTimeout(fadeTimer);
    };
  }, [effectiveReady, paused, reducedMotion, onDone]);

  const progressRatio = snapshot.total > 0 ? effectiveDoneCount / snapshot.total : 0;
  const progressPercent = Math.round(progressRatio * 100);
  const activeStepCopy = effectiveCurrentStep ? MAP3D_STEP_COPY[effectiveCurrentStep] : null;
  const activeFact = facts[factIndex % Math.max(1, facts.length)] ?? null;

  const liveAnnouncement = snapshot.error
    ? `Error de carga: ${snapshot.error}`
    : effectiveReady
      ? 'Escena lista.'
      : activeStepCopy
        ? `${activeStepCopy.label}. ${effectiveDoneCount} de ${snapshot.total} pasos.`
        : '';

  const headerContent = (
    <>
      <span className="ld-eyebrow">Atlas Antártico · Vista 3D</span>
      <h1 className="ld-serif" style={{ margin: '6px 0 0', fontSize: isDesktop ? 34 : 24, lineHeight: 1.12 }}>
        Desplegando la carta austral
      </h1>
    </>
  );

  const stepsContent = (
    <>
      <div
        className="ld-bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={snapshot.total}
        aria-valuenow={effectiveDoneCount}
        aria-valuetext={activeStepCopy?.label ?? 'Completado'}
        style={{ marginBottom: 12 }}
      >
        <i style={{ width: `${progressPercent}%` }} />
      </div>

      <ul className="ld-steps">
        {snapshot.steps.map((step, index) => {
          const isDone = index < effectiveDoneCount;
          const isCurrent = effectiveCurrentStep === step && !snapshot.error;
          const stateClass = isDone ? 'done' : isCurrent ? 'now' : 'todo';
          const copy = MAP3D_STEP_COPY[step];
          return (
            <li key={step} className={`ld-step ${stateClass}`}>
              <span className="ld-mark" aria-hidden="true">
                {isDone && <StepCheckIcon />}
                {isCurrent && !reducedMotion && <span className="ld-pulse" />}
              </span>
              <span className="ld-lbl">{copy.label}</span>
              <span className="ld-what">{copy.what}</span>
            </li>
          );
        })}
      </ul>

      {snapshot.error && (
        <p role="alert" style={{ margin: '10px 0 0', color: '#A4471F', fontWeight: 700, fontSize: 14 }}>
          {snapshot.error}
        </p>
      )}

      <div className="ld-actions">
        <button type="button" className="btn ghost" onClick={onFallback2D}>
          Ver mapa 2D
        </button>
      </div>
    </>
  );

  const factContent = activeFact ? (
    <div
      className="ld-factbox"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      tabIndex={0}
    >
      <span className="ld-eyebrow" style={{ marginBottom: 6 }}>
        Mientras tanto · Dato real
      </span>
      <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.4 }}>{activeFact.text}</p>
      <p className="ld-src" style={{ margin: '8px 0 0' }}>
        Fuente:{' '}
        {activeFact.sourceUrl ? (
          <a href={activeFact.sourceUrl} target="_blank" rel="noopener noreferrer">
            {activeFact.sourceLabel}
          </a>
        ) : (
          activeFact.sourceLabel
        )}
      </p>
    </div>
  ) : null;

  return (
    <section
      className="ld"
      data-loading-variant="map3d"
      data-leaving={leaving ? 'true' : undefined}
      aria-label="Cargando mapa 3D de la Antártida"
    >
      <span className="ld-sr-only" aria-live="polite">
        {liveAnnouncement}
      </span>

      <Map3DIllustration progress={progressRatio} reducedMotion={reducedMotion} />
      <div className="ld-grain" aria-hidden="true" />

      {isDesktop ? (
        <>
          <header className="ld-desktop-header ld-wash">{headerContent}</header>
          <div className="ld-card ld-desktop-progress">{stepsContent}</div>
          {factContent && <aside className="ld-card ld-desktop-fact">{factContent}</aside>}
        </>
      ) : (
        <div className="ld-mobile-wrap">
          <div className="ld-mobile-cam" aria-hidden="true" />
          <div className="ld-card ld-mobile-card ld-compact">
            <header>{headerContent}</header>
            {stepsContent}
            {factContent && <div className="ld-divide">{factContent}</div>}
          </div>
        </div>
      )}
    </section>
  );
}

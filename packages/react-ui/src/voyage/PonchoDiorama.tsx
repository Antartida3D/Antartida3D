import { lazy, Suspense, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import {
  backStep,
  dioramaOpacity,
  dioramaRemaining,
  dioramaView,
  essentialSentences,
  leaveDiorama,
  nextStep,
  openDiorama,
  timerFiredDiorama,
  type DioramaView,
  type SceneDef,
} from '@antartida/core';
import { KindChip } from '../orcadas/KindChip.tsx';

// Its own chunk: it needs three.js and WebGL, which the common card does not.
const PonchoDioramaCanvas = lazy(() => import('./PonchoDioramaCanvas.tsx').then((m) => ({ default: m.PonchoDioramaCanvas })));

/** What the panel of the stop needs to tell the tour: the step, the sentences told so far and the three buttons. */
export interface DioramaTour {
  readonly view: DioramaView;
  /** Every sentence of the stop; the panel shows the first `view.shown`. */
  readonly sentences: readonly string[];
  readonly onNext: () => void;
  readonly onBack: () => void;
  /** Leave the diorama: it fades out and then `onDone` runs. */
  readonly onLeave: () => void;
}

/**
 * The screen of the diorama of a stop of Poncho (issue #146), laid over the map: the scene at human
 * scale on its canvas, and beside it (the side panel on a wide screen, the bottom sheet on a phone) the
 * panel of the stop, which `children` draws with the tour. «Siguiente» and «Atrás» (and the arrow keys)
 * move the camera to the shot of each sentence; Escape or the last button leave. It fades in and out;
 * with reduced motion it cuts. The clock of the fade is the browser's, the rules are in
 * @antartida/core (poncho-diorama.ts).
 */
export function PonchoDiorama({ scene, essential, reduced, onDone, onLost, children }: {
  scene: SceneDef;
  /** Text of the stop, whose sentences the tour tells. */
  essential: string;
  reduced: boolean;
  /** The screen faded out: close the card. */
  onDone: () => void;
  /** The WebGL context was lost for good: the common card takes over. */
  onLost: () => void;
  children: (tour: DioramaTour) => ReactNode;
}) {
  const sentences = useMemo(() => essentialSentences(essential), [essential]);
  const [step, setStep] = useState(0);
  const [flow, setFlow] = useState(() => openDiorama(performance.now()));
  const root = useRef<HTMLDivElement>(null);
  const done = useRef(onDone);
  done.current = onDone;

  const view = dioramaView(step, sentences.length);
  const tour: DioramaTour = {
    view,
    sentences,
    onNext: () => setStep((s) => nextStep(s, sentences.length)),
    onBack: () => setStep((s) => backStep(s, sentences.length)),
    onLeave: () => setFlow((f) => leaveDiorama(f, performance.now())),
  };

  // The phase changes by itself when its time is up.
  useEffect(() => {
    const wait = dioramaRemaining(flow, performance.now(), reduced);
    if (wait === null) return;
    const timer = window.setTimeout(() => setFlow((f) => timerFiredDiorama(f, performance.now(), reduced)), wait);
    return () => window.clearTimeout(timer);
  }, [flow, reduced]);
  useEffect(() => {
    if (flow.phase === 'closed') done.current();
  }, [flow.phase]);

  // The fade is written frame by frame without re-rendering React, only while it lasts.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const paint = () => void (el.style.opacity = String(dioramaOpacity(flow, performance.now(), reduced)));
    paint();
    if (flow.phase === 'inside' || flow.phase === 'closed') return;
    let id = 0;
    const tick = () => {
      paint();
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [flow, reduced]);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.key === 'Escape') tour.onLeave();
    else if (e.key === 'ArrowRight') tour.onNext();
    else if (e.key === 'ArrowLeft') tour.onBack();
    else return;
    e.preventDefault();
  };

  return (
    <div
      ref={root}
      className={`pdio pdio-${flow.phase}`}
      // Focus goes here when the canvas is clicked, so the arrow keys keep working.
      tabIndex={-1}
      onKeyDown={onKeyDown}
    >
      <div className="pdio-stage" aria-hidden="true">
        <Suspense fallback={null}>
          <PonchoDioramaCanvas scene={scene} step={view.step} reduced={reduced} onLost={onLost} />
        </Suspense>
      </div>
      {/* One single notice that this is an illustration. */}
      <div className="pdio-badge">
        <KindChip kind="recon" label="Reconstrucción ilustrada" />
        <p>Dibujo para ver la escena a escala humana: las posturas y los lugares son una ilustración del relato, no un registro.</p>
      </div>
      {children(tour)}
    </div>
  );
}

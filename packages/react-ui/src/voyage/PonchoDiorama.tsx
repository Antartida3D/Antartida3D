import { lazy, Suspense, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import {
  dioramaOpacity,
  dioramaRemaining,
  dioramaView,
  entryStep,
  essentialSentences,
  leaveDiorama,
  openDiorama,
  timerFiredDiorama,
  type DioramaEntry,
  type DioramaView,
  type SceneDef,
} from '@antartida/core';
import type { OpenSheetSize } from '../BottomSheet.tsx';
import { KindChip } from '../orcadas/KindChip.tsx';
import { Icon } from '../ui.tsx';

// Its own chunk: it needs three.js and WebGL, which the common card does not.
const PonchoDioramaCanvas = lazy(() => import('./PonchoDioramaCanvas.tsx').then((m) => ({ default: m.PonchoDioramaCanvas })));

/** What the panel of the stop needs to tell it: the step, its sentence, the way to move and the size of the sheet on a phone. */
export interface DioramaTour {
  readonly view: DioramaView;
  /** Every sentence of the stop; the panel tells the one of the current step. */
  readonly sentences: readonly string[];
  /** «›»: the next sentence, or past the last one the next stop (or the trip going on). */
  readonly onNext: () => void;
  /** «‹»: the sentence before, or before the first one the stop before. Absent at the very first sentence of the story. */
  readonly onBack: (() => void) | null;
  /** The sheet of a phone: peek, small or tall (the scene is framed over it). */
  readonly size: OpenSheetSize;
  readonly onSize: (size: OpenSheetSize) => void;
}

/**
 * The screen of the diorama of a stop of Poncho (issues #146 and #211), laid over the map: the scene at human
 * scale on its canvas and the panel of the stop with the layout of the stops of Fósiles (a side panel on a wide
 * screen, a sheet that opens upwards on a phone), which `children` draws. The panel tells one sentence at a time;
 * «›» and «‹» (and the arrow keys) move to the next and the one before, and the scene shows something new at each
 * (the camera goes to its shot). «Volver al mapa» is always there. It fades in and out; with reduced motion it cuts.
 * The clock of the fade is the browser's, the rules are in @antartida/core (poncho-diorama.ts).
 */
export function PonchoDiorama({ scene, essential, reduced, entry, hasBefore, onNextStop, onBeforeStop, onDone, onMap, onLost, children }: {
  scene: SceneDef;
  /** Text of the stop, whose sentences the panel tells. */
  essential: string;
  reduced: boolean;
  /** At which sentence the stop is entered: the first, or the last when coming back from the next stop. */
  entry: DioramaEntry;
  /** There is a stop before this one: «‹» at the first sentence goes there. */
  hasBefore: boolean;
  /** Past the last sentence, the next stop already read (the user went back); without it the trip goes on, fading out. */
  onNextStop: (() => void) | null;
  /** Before the first sentence, the stop before. */
  onBeforeStop: () => void;
  /** The screen faded out: close the card. */
  onDone: () => void;
  /** «Volver al mapa»: leave the trip for the map, keeping where it was (it can be resumed from the map). */
  onMap: () => void;
  /** The WebGL context was lost for good: the common card takes over. */
  onLost: () => void;
  children: (tour: DioramaTour) => ReactNode;
}) {
  const sentences = useMemo(() => essentialSentences(essential), [essential]);
  const [step, setStep] = useState(() => entryStep(entry, sentences.length));
  const [size, setSize] = useState<OpenSheetSize>('small');
  const [flow, setFlow] = useState(() => openDiorama(performance.now()));
  const root = useRef<HTMLDivElement>(null);
  const done = useRef(onDone);
  done.current = onDone;

  const view = dioramaView(step, sentences.length);
  const leave = () => setFlow((f) => leaveDiorama(f, performance.now()));
  const onNext = () => {
    if (!view.last) setStep(view.step + 1);
    else if (onNextStop) onNextStop();
    else leave();
  };
  const onBack = view.first ? (hasBefore ? onBeforeStop : null) : () => setStep(view.step - 1);
  const tour: DioramaTour = { view, sentences, onNext, onBack, size, onSize: setSize };

  // A new sentence opens the sheet at its small size, as the stops of Fósiles do.
  useEffect(() => setSize('small'), [view.step]);

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
    if (e.key === 'Escape') leave();
    else if (e.key === 'ArrowRight') onNext();
    else if (e.key === 'ArrowLeft') onBack?.();
    else return;
    e.preventDefault();
  };

  return (
    <div
      ref={root}
      className={`pdio orc pdio-${flow.phase}${size === 'tall' ? ' is-panel-expanded' : ''}${size === 'peek' ? ' is-panel-peek' : ''}`}
      // Focus goes here when the canvas is clicked, so the arrow keys keep working.
      tabIndex={-1}
      onKeyDown={onKeyDown}
    >
      <div className="pdio-stage" aria-hidden="true">
        <Suspense fallback={null}>
          <PonchoDioramaCanvas scene={scene} step={view.step} reduced={reduced} onLost={onLost} />
        </Suspense>
      </div>
      <button type="button" className="btn pdio-map" onClick={onMap}>
        {Icon.back}
        <span>Volver al mapa</span>
      </button>
      {/* One single notice that this is an illustration. */}
      <div className="pdio-badge">
        <KindChip kind="recon" label="Reconstrucción ilustrada" />
        <p>Dibujo para ver la escena a escala humana: las posturas y los lugares son una ilustración del relato, no un registro.</p>
      </div>
      {children(tour)}
    </div>
  );
}

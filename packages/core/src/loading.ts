import { PTS, type MapPoint } from './content/points.ts';
import type { Source } from './content/sea.ts';

export const MAP3D_STEPS = ['chunk', 'terrain', 'ocean', 'lands', 'shaders'] as const;
export type Map3DStep = (typeof MAP3D_STEPS)[number];

export interface LoadingSnapshot<S extends string> {
  readonly steps: readonly S[];
  readonly done: Readonly<Record<S, boolean>>;
  readonly currentStep: S | null;
  readonly doneCount: number;
  readonly total: number;
  readonly error: string | null;
  readonly ready: boolean;
}

export interface LoadingStore<S extends string> {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => LoadingSnapshot<S>;
  markStepDone: (step: S) => void;
  setError: (message: string) => void;
  reset: () => void;
}

/**
 * External store tracking step completion for a loading screen without coupling
 * 3D asset loaders directly to React state.
 */
export function createLoadingStore<S extends string>(steps: readonly S[]): LoadingStore<S> {
  const listeners = new Set<() => void>();

  const buildInitialDone = (): Record<S, boolean> => {
    const map = {} as Record<S, boolean>;
    for (const step of steps) map[step] = false;
    return map;
  };

  let done = buildInitialDone();
  let error: string | null = null;

  const computeSnapshot = (): LoadingSnapshot<S> => {
    let doneCount = 0;
    let currentStep: S | null = null;
    for (const step of steps) {
      if (done[step]) {
        doneCount += 1;
      } else if (currentStep === null) {
        currentStep = step;
      }
    }
    return {
      steps,
      done: { ...done },
      currentStep,
      doneCount,
      total: steps.length,
      error,
      ready: doneCount === steps.length && error === null,
    };
  };

  let snapshot = computeSnapshot();

  const emit = () => {
    snapshot = computeSnapshot();
    for (const listener of listeners) listener();
  };

  return {
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => snapshot,
    markStepDone: (step) => {
      if (!(step in done) || done[step]) return;
      done[step] = true;
      emit();
    },
    setError: (message) => {
      if (error === message) return;
      error = message;
      emit();
    },
    reset: () => {
      const hadDone = snapshot.doneCount > 0;
      const hadError = error !== null;
      if (!hadDone && !hadError) return;
      done = buildInitialDone();
      error = null;
      emit();
    },
  };
}

export const map3dLoadingStore = createLoadingStore(MAP3D_STEPS);

/** Plain-language text for each real step of the loader (#258), in the order of MAP3D_STEPS. */
export const LOADER_STEP_TEXT: Readonly<Record<Map3DStep, string>> = {
  chunk: 'Preparando el cuaderno',
  terrain: 'Levantando el relieve',
  ocean: 'Llenando el Océano Austral',
  lands: 'Dibujando las costas',
  shaders: 'Encendiendo la luz',
};

/** The two steps of the 2D map. */
export const LOADER_STEP_TEXT_2D: readonly string[] = ['Preparando el cuaderno', 'Dibujando el mapa en 2D'];

/**
 * Time each step stays on the card before the next one shows (#258): even a cached load tells every
 * step, and the map fills in while it does. After the last step the loader leaves at once.
 */
export const LOADER_STEP_MS = 450;
/** Fade between the loader and the live map. */
export const LOADER_FADE_MS = 400;

/** Steps shown as done: it follows the real ones, one at a time, never past them. */
export function pacedSteps(shown: number, done: number): number {
  return shown < done ? shown + 1 : Math.min(shown, done);
}

/**
 * Radius, in pixels, of the colour layer of the poster. It starts at 0 and, with all the steps
 * done, covers the screen: the mask is solid up to POSTER_SOLID of its radius, so the radius is
 * enlarged by that much past the farthest corner. `pole` is the position of the South Pole in the
 * poster, in percent of its width and height.
 */
export const POSTER_SOLID = 0.6;
export function posterReveal(progress: number, size: { vw: number; vh: number }, pole: { x: number; y: number }): number {
  const p = Math.min(1, Math.max(0, progress));
  const px = (pole.x / 100) * size.vw;
  const py = (pole.y / 100) * size.vh;
  const corner = Math.hypot(Math.max(px, size.vw - px), Math.max(py, size.vh - py));
  return (corner / POSTER_SOLID) * p ** 1.5;
}

export interface LoaderFact {
  /** First sentence of the point's description, as written. */
  sentence: string;
  /** Publishers of the sources of that description, without repeating. */
  orgs: string[];
  /** Title of the point's card, the work the sentence comes from. */
  title: string;
}

const FACT_IDS = ['thwaites', 'vostok', 'erebus', 'emperador'] as const;

/** Up to the first full stop followed by a capital letter: «3.794 m» does not cut. */
export function firstSentence(text: string): string {
  const cut = text.search(/\.(?=\s+[A-ZÁÉÍÓÚÑ¿¡])/);
  return cut < 0 ? text : text.slice(0, cut + 1);
}

/**
 * «Mientras tanto · dato real» (#202, #258). Picks one of the candidates that have a description
 * and sources; `random` is injected so the choice is testable. Nothing is rewritten.
 */
export function loaderFact(random: () => number = Math.random): LoaderFact {
  const candidates = FACT_IDS.map((id) => PTS.find((p) => p.id === id)).filter(
    (p): p is MapPoint & { desc: string; sources: readonly Source[] } => Boolean(p?.desc && p.sources?.length),
  );
  const point = candidates[Math.min(candidates.length - 1, Math.floor(random() * candidates.length))]!;
  return {
    sentence: firstSentence(point.desc),
    orgs: [...new Set(point.sources.map((s) => s.org))],
    title: point.title,
  };
}


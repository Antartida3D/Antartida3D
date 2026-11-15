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

/**
 * Splits a multi-subpath SVG path into its longest closed coastline (`main`)
 * and all remaining subpaths (`islands`), keeping original coordinates intact.
 */
export function splitAntarcticaCoastline(path: string): { main: string; islands: string } {
  const parts = path
    .trim()
    .split(/(?=M)/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return { main: '', islands: '' };

  let longestIndex = 0;
  for (let i = 1; i < parts.length; i += 1) {
    if (parts[i]!.length > parts[longestIndex]!.length) longestIndex = i;
  }

  const main = parts[longestIndex]!;
  const islands = parts.filter((_, i) => i !== longestIndex).join(' ');
  return { main, islands };
}

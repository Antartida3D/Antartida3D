import { describe, expect, it, vi } from 'vitest';
import {
  ANTARCTICA_PATH,
  MAP3D_STEPS,
  createLoadingStore,
  splitAntarcticaCoastline,
} from '../src/index.ts';

describe('createLoadingStore', () => {
  it('tracks step progression without regressing on duplicate marks', () => {
    const store = createLoadingStore(MAP3D_STEPS);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    expect(store.getSnapshot()).toMatchObject({
      currentStep: 'chunk',
      doneCount: 0,
      total: 5,
      error: null,
      ready: false,
    });

    store.markStepDone('terrain');
    expect(store.getSnapshot().doneCount).toBe(1);
    expect(store.getSnapshot().currentStep).toBe('chunk');
    expect(listener).toHaveBeenCalledTimes(1);

    // Duplicate mark is a no-op
    store.markStepDone('terrain');
    expect(store.getSnapshot().doneCount).toBe(1);
    expect(listener).toHaveBeenCalledTimes(1);

    store.markStepDone('chunk');
    expect(store.getSnapshot().currentStep).toBe('ocean');
    expect(store.getSnapshot().doneCount).toBe(2);

    store.markStepDone('ocean');
    store.markStepDone('lands');
    store.markStepDone('shaders');
    expect(store.getSnapshot()).toMatchObject({
      currentStep: null,
      doneCount: 5,
      total: 5,
      ready: true,
    });

    unsubscribe();
  });

  it('captures errors and resets cleanly', () => {
    const store = createLoadingStore(MAP3D_STEPS);
    store.markStepDone('chunk');
    store.setError('WebGL context lost');

    expect(store.getSnapshot().error).toBe('WebGL context lost');
    expect(store.getSnapshot().ready).toBe(false);

    store.reset();
    expect(store.getSnapshot()).toMatchObject({
      currentStep: 'chunk',
      doneCount: 0,
      total: 5,
      error: null,
      ready: false,
    });
  });
});

describe('splitAntarcticaCoastline', () => {
  it('separates the main continental subpath from smaller islands', () => {
    const { main, islands } = splitAntarcticaCoastline(ANTARCTICA_PATH);
    expect(main.startsWith('M')).toBe(true);
    expect(islands.startsWith('M')).toBe(true);
    expect(main.length).toBeGreaterThan(islands.length);
  });

  it('handles single-subpath and empty strings', () => {
    expect(splitAntarcticaCoastline('M0 0 L10 10 Z')).toEqual({
      main: 'M0 0 L10 10 Z',
      islands: '',
    });
    expect(splitAntarcticaCoastline('')).toEqual({ main: '', islands: '' });
  });
});

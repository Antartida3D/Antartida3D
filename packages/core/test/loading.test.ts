import { describe, expect, it, vi } from 'vitest';
import {
  LOADER_STEP_MS,
  LOADER_STEP_TEXT,
  LOADER_STEP_TEXT_2D,
  MAP3D_STEPS,
  POSTER_SOLID,
  PTS,
  createLoadingStore,
  firstSentence,
  loaderFact,
  pacedSteps,
  posterReveal,
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

describe('loader texts and timing (#258)', () => {
  it('has a plain text for every real step', () => {
    for (const step of MAP3D_STEPS) expect(LOADER_STEP_TEXT[step].length).toBeGreaterThan(0);
    expect(LOADER_STEP_TEXT.terrain).toBe('Levantando el relieve');
    expect(LOADER_STEP_TEXT_2D).toHaveLength(2);
  });

  it('shows the real steps one at a time and never ahead of them', () => {
    expect(pacedSteps(0, 5)).toBe(1);
    expect(pacedSteps(4, 5)).toBe(5);
    expect(pacedSteps(5, 5)).toBe(5);
    expect(pacedSteps(2, 2)).toBe(2);
    // A reset (the real count goes back) pulls the shown one with it.
    expect(pacedSteps(4, 1)).toBe(1);
    // A whole load takes a few steps long, not a fixed wait after the end.
    expect(5 * LOADER_STEP_MS).toBeLessThan(3000);
  });

  it('grows the colour from nothing to the whole screen', () => {
    const size = { vw: 1440, vh: 900 };
    const pole = { x: 50, y: 50 };
    expect(posterReveal(0, size, pole)).toBe(0);
    const mid = posterReveal(0.5, size, pole);
    const full = posterReveal(1, size, pole);
    expect(mid).toBeGreaterThan(0);
    expect(full).toBeGreaterThan(mid);
    // The solid part of the mask reaches the farthest corner.
    const corner = Math.hypot(720, 450);
    expect(full * POSTER_SOLID).toBeGreaterThanOrEqual(corner);
    expect(posterReveal(2, size, pole)).toBe(full);
    expect(posterReveal(-1, size, pole)).toBe(0);
  });

  it('reveals further when the pole is off centre', () => {
    const size = { vw: 390, vh: 844 };
    expect(posterReveal(1, size, { x: 20, y: 30 })).toBeGreaterThan(posterReveal(1, size, { x: 50, y: 50 }));
  });
});

describe('loaderFact', () => {
  it('has every candidate card with a description and sources', () => {
    const titles = new Set([0, 0.3, 0.6, 0.99].map((r) => loaderFact(() => r).title));
    expect(titles.size).toBe(4);
  });

  it('picks a candidate by the injected random number', () => {
    const titles = [0, 0.3, 0.6, 0.99].map((r) => loaderFact(() => r).title);
    expect(new Set(titles).size).toBe(4);
    expect(loaderFact(() => 1).title).toBe(titles[3]);
  });

  it('quotes the first sentence as written and every source once', () => {
    const point = PTS.find((p) => p.title === loaderFact(() => 0).title)!;
    const fact = loaderFact(() => 0);
    expect(point.desc!.startsWith(fact.sentence)).toBe(true);
    expect(fact.sentence.endsWith('.')).toBe(true);
    expect(fact.orgs.length).toBeGreaterThan(0);
    expect(new Set(fact.orgs).size).toBe(fact.orgs.length);
    for (const s of point.sources!) expect(fact.orgs).toContain(s.org);
  });

  it('does not cut at a number with a thousands dot', () => {
    expect(firstSentence('Con 3.794 m de altura, el volcán es activo. Sus laderas tienen hielo.')).toBe('Con 3.794 m de altura, el volcán es activo.');
    expect(firstSentence('Sin punto final')).toBe('Sin punto final');
  });
});

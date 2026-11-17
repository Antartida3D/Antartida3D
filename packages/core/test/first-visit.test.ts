import { describe, expect, it } from 'vitest';
import { firstVisitStep, isGuideOpen, type FirstVisitEvent, type FirstVisitState } from '../src/index.ts';

const STATES: FirstVisitState[] = ['loading', 'ready', 'guide1', 'guide2', 'guide3', 'done'];
const EVENTS: FirstVisitEvent[] = ['ready', 'explore', 'skip', 'next', 'close', 'finish', 'open'];

describe('firstVisitStep (#256, #258)', () => {
  it('walks the whole flow', () => {
    const run = (events: FirstVisitEvent[]) => events.reduce<FirstVisitState>((s, e) => firstVisitStep(s, e).state, 'loading');
    expect(run(['ready'])).toBe('ready');
    expect(run(['ready', 'explore'])).toBe('guide1');
    expect(run(['ready', 'explore', 'next'])).toBe('guide2');
    expect(run(['ready', 'explore', 'next', 'next'])).toBe('guide3');
    expect(run(['ready', 'explore', 'next', 'next', 'next'])).toBe('done');
  });

  it('waits for the map: nothing moves before `ready`', () => {
    for (const e of ['explore', 'skip', 'next', 'close', 'finish'] as const) {
      expect(firstVisitStep('loading', e)).toEqual({ state: 'loading', markSeen: false });
    }
  });

  it('marks the visit as seen on every way out', () => {
    expect(firstVisitStep('ready', 'skip')).toEqual({ state: 'done', markSeen: true });
    expect(firstVisitStep('ready', 'close')).toEqual({ state: 'done', markSeen: true });
    for (const s of ['guide1', 'guide2', 'guide3'] as const) {
      for (const e of ['skip', 'close', 'finish'] as const) {
        expect(firstVisitStep(s, e), `${s} ${e}`).toEqual({ state: 'done', markSeen: true });
      }
    }
    expect(firstVisitStep('guide3', 'next')).toEqual({ state: 'done', markSeen: true });
  });

  it('never leaves the flow without marking it, and never marks while staying', () => {
    for (const s of STATES) {
      for (const e of EVENTS) {
        for (const hasNext of [true, false]) {
          const r = firstVisitStep(s, e, hasNext);
          if (s !== 'done' && r.state === 'done') expect(r.markSeen, `${s} ${e}`).toBe(true);
          if (r.state !== 'done') expect(r.markSeen, `${s} ${e}`).toBe(false);
        }
      }
    }
  });

  it('skips the third step when there is no suggested expedition', () => {
    expect(firstVisitStep('guide2', 'next', false)).toEqual({ state: 'done', markSeen: true });
    expect(firstVisitStep('guide2', 'next', true).state).toBe('guide3');
  });

  it('the «?» button opens the guide at the first step, without marking', () => {
    for (const s of STATES) expect(firstVisitStep(s, 'open')).toEqual({ state: 'guide1', markSeen: false });
  });

  it('knows when the guide is open', () => {
    expect(STATES.filter(isGuideOpen)).toEqual(['guide1', 'guide2', 'guide3']);
  });
});

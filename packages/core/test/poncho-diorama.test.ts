import { describe, expect, it } from 'vitest';
import {
  DIORAMA_ENTER_MS,
  DIORAMA_LEAVE_MS,
  DIORAMA_TIMER_SLACK_MS,
  clampStep,
  dioramaOpacity,
  dioramaRemaining,
  entryStep,
  dioramaView,
  leaveDiorama,
  openDiorama,
  tickDiorama,
  timerFiredDiorama,
} from '../src/index.ts';

describe('steps of the diorama', () => {
  it('keeps a step inside 0..count-1', () => {
    expect(clampStep(9, 3)).toBe(2);
    expect(clampStep(-4, 3)).toBe(0);
    expect(clampStep(NaN, 3)).toBe(0);
    expect(clampStep(1.9, 3)).toBe(1);
    expect(clampStep(5, 0)).toBe(0);
  });

  it('tells one sentence at each step: first and last are marked, the hook shows at the last', () => {
    expect([0, 1, 2].map((s) => dioramaView(s, 3).first)).toEqual([true, false, false]);
    expect([0, 1, 2].map((s) => dioramaView(s, 3).last)).toEqual([false, false, true]);
    expect([0, 1, 2].map((s) => dioramaView(s, 3).showsHook)).toEqual([false, false, true]);
    // A step past the end is the last one.
    expect(dioramaView(40, 3).step).toBe(2);
  });

  it('a stop of one step is first and last at once, and one of none shows nothing', () => {
    const one = dioramaView(0, 1);
    expect(one.first && one.last && one.count === 1).toBe(true);
    const none = dioramaView(0, 0);
    expect(none.count).toBe(0);
    expect(none.last).toBe(true);
  });

  it('enters a stop at its first sentence, or at its last when coming back from the next stop', () => {
    expect(entryStep('start', 3)).toBe(0);
    expect(entryStep('end', 3)).toBe(2);
    expect(entryStep('end', 0)).toBe(0);
  });
});

describe('flow of the diorama (injected clock)', () => {
  it('goes entering, inside on its own, and leaving, closed on request', () => {
    let flow = openDiorama(1000);
    expect(flow.phase).toBe('entering');
    expect(tickDiorama(flow, 1000 + DIORAMA_ENTER_MS - 1, false).phase).toBe('entering');
    flow = tickDiorama(flow, 1000 + DIORAMA_ENTER_MS, false);
    expect(flow.phase).toBe('inside');
    // Inside it stays however long.
    expect(tickDiorama(flow, 1e9, false).phase).toBe('inside');
    flow = leaveDiorama(flow, 5000);
    expect(flow.phase).toBe('leaving');
    expect(tickDiorama(flow, 5000 + DIORAMA_LEAVE_MS - 1, false).phase).toBe('leaving');
    expect(tickDiorama(flow, 5000 + DIORAMA_LEAVE_MS, false).phase).toBe('closed');
  });

  it('a late clock goes through every phase that is over', () => {
    const left = leaveDiorama(openDiorama(0), 10);
    expect(tickDiorama(left, 1e6, false).phase).toBe('closed');
    expect(tickDiorama(openDiorama(0), 1e6, false).phase).toBe('inside');
  });

  it('a timer that fires a fraction of a ms early still ends the phase (the screen must not get stuck leaving)', () => {
    const inside = tickDiorama(openDiorama(0), 10_000, false);
    const leaving = leaveDiorama(inside, 20_000.3);
    const early = 20_000.3 + DIORAMA_LEAVE_MS - 0.7; // the browser woke up 0.7 ms before the phase was over
    // The exact tick keeps its boundary (nothing changes): that is why it alone left the screen stuck.
    expect(tickDiorama(leaving, early, false)).toBe(leaving);
    expect(timerFiredDiorama(leaving, early, false).phase).toBe('closed');
    // A phase that is clearly not over yet does not end, even when the timer fires.
    expect(timerFiredDiorama(leaving, 20_000.3 + DIORAMA_LEAVE_MS - 2 * DIORAMA_TIMER_SLACK_MS, false)).toBe(leaving);
    // Entering finishes the same way, and an idle phase never changes.
    const entering = openDiorama(5_000.4);
    expect(timerFiredDiorama(entering, 5_000.4 + 650 - 0.9, false).phase).toBe('inside');
    expect(timerFiredDiorama(inside, 99_999, false)).toBe(inside);
  });

  it('can leave while it is still entering, and leaving twice changes nothing', () => {
    const flow = leaveDiorama(openDiorama(0), 100);
    expect(flow).toEqual({ phase: 'leaving', since: 100 });
    expect(leaveDiorama(flow, 300)).toBe(flow);
    const closed = tickDiorama(flow, 1e6, false);
    expect(leaveDiorama(closed, 2e6)).toBe(closed);
  });

  it('with reduced motion it cuts: inside at once, closed at once on leaving', () => {
    expect(tickDiorama(openDiorama(0), 0, true).phase).toBe('inside');
    expect(tickDiorama(leaveDiorama(openDiorama(0), 0), 0, true).phase).toBe('closed');
    expect(dioramaOpacity(tickDiorama(openDiorama(0), 0, true), 0, true)).toBe(1);
  });

  it('says how long until the next phase, and nothing when it waits for a request', () => {
    const flow = openDiorama(100);
    expect(dioramaRemaining(flow, 100, false)).toBe(DIORAMA_ENTER_MS);
    expect(dioramaRemaining(flow, 100 + DIORAMA_ENTER_MS + 50, false)).toBe(0);
    expect(dioramaRemaining(flow, 100, true)).toBe(0);
    expect(dioramaRemaining({ phase: 'inside', since: 0 }, 5, false)).toBeNull();
    expect(dioramaRemaining({ phase: 'closed', since: 0 }, 5, false)).toBeNull();
  });

  it('the opacity rises while entering and falls while leaving, always in 0..1', () => {
    const entering = openDiorama(0);
    let last = -1;
    for (let t = -50; t <= DIORAMA_ENTER_MS + 50; t += 25) {
      const o = dioramaOpacity(entering, t, false);
      expect(o).toBeGreaterThanOrEqual(0);
      expect(o).toBeLessThanOrEqual(1);
      expect(o).toBeGreaterThanOrEqual(last);
      last = o;
    }
    expect(dioramaOpacity({ phase: 'inside', since: 0 }, 9, false)).toBe(1);
    const leaving = leaveDiorama({ phase: 'inside', since: 0 }, 1000);
    expect(dioramaOpacity(leaving, 1000, false)).toBe(1);
    expect(dioramaOpacity(leaving, 1000 + DIORAMA_LEAVE_MS / 2, false)).toBeCloseTo(0.5, 9);
    expect(dioramaOpacity(leaving, 1000 + DIORAMA_LEAVE_MS, false)).toBe(0);
    expect(dioramaOpacity({ phase: 'closed', since: 0 }, 9, false)).toBe(0);
  });
});

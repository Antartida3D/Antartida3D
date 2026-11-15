import { describe, expect, it } from 'vitest';
import {
  DIORAMA_ENTER_MS,
  DIORAMA_LEAVE_MS,
  backStep,
  clampStep,
  dioramaOpacity,
  dioramaRemaining,
  dioramaView,
  leaveDiorama,
  nextStep,
  openDiorama,
  tickDiorama,
} from '../src/index.ts';

describe('steps of the diorama', () => {
  it('next and back stay inside 0..count-1', () => {
    expect(nextStep(0, 3)).toBe(1);
    expect(nextStep(2, 3)).toBe(2);
    expect(backStep(1, 3)).toBe(0);
    expect(backStep(0, 3)).toBe(0);
    expect(clampStep(9, 3)).toBe(2);
    expect(clampStep(-4, 3)).toBe(0);
    expect(clampStep(NaN, 3)).toBe(0);
    expect(clampStep(1.9, 3)).toBe(1);
    expect(clampStep(5, 0)).toBe(0);
  });

  it('tells one more sentence at each step', () => {
    expect([0, 1, 2].map((s) => dioramaView(s, 3).shown)).toEqual([1, 2, 3]);
    expect(dioramaView(0, 3).first).toBe(true);
    expect(dioramaView(1, 3).first).toBe(false);
  });

  it('shows the hook and «Saber más» only at the last step', () => {
    for (const step of [0, 1]) {
      const v = dioramaView(step, 3);
      expect(v.last).toBe(false);
      expect(v.showsHook).toBe(false);
      expect(v.showsMore).toBe(false);
    }
    const last = dioramaView(2, 3);
    expect(last.last && last.showsHook && last.showsMore).toBe(true);
    // A step past the end is the last one.
    expect(dioramaView(40, 3).step).toBe(2);
  });

  it('a tour of one step is first and last at once, and one of none shows nothing', () => {
    const one = dioramaView(0, 1);
    expect(one.first && one.last && one.shown === 1).toBe(true);
    const none = dioramaView(0, 0);
    expect(none.shown).toBe(0);
    expect(none.last).toBe(true);
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

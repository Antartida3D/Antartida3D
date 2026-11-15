import { describe, expect, it } from 'vitest';
import {
  SETTLE_FRAMES, SETTLE_MAX_MS, SETTLE_MIN_MS, VOYAGE_POINT, WELCOME_K, geometry, settleTracker, showsWelcome, toScreen, welcomeView,
} from '../src/index.ts';

// The e2e sizes (phone and desktop) and the compact and landscape phones of the Orcadas tests.
const SIZES = [
  { vw: 390, vh: 844 },
  { vw: 1440, vh: 900 },
  { vw: 360, vh: 740 },
  { vw: 844, vh: 390 },
];

describe('first-visit welcome', () => {
  it('comes close to Ushuaia and keeps it well inside the screen', () => {
    for (const size of SIZES) {
      const view = welcomeView(size);
      expect(view.k).toBe(WELCOME_K);
      const { left, top } = toScreen(geometry(size), view, VOYAGE_POINT.x, VOYAGE_POINT.y);
      // Room on its right for the label, which opens to that side.
      expect(left, `${size.vw}x${size.vh}`).toBeGreaterThan(size.vw * 0.15);
      expect(left, `${size.vw}x${size.vh}`).toBeLessThan(size.vw * 0.6);
      expect(top, `${size.vw}x${size.vh}`).toBeGreaterThan(size.vh * 0.3);
      expect(top, `${size.vw}x${size.vh}`).toBeLessThan(size.vh * 0.7);
    }
  });

  it('shows only on the first visit, and not once the trip from Ushuaia is done', () => {
    expect(showsWelcome(false, [])).toBe(true);
    expect(showsWelcome(false, ['orcadas'])).toBe(true);
    expect(showsWelcome(true, [])).toBe(false);
    expect(showsWelcome(false, [VOYAGE_POINT.id])).toBe(false);
  });
});

describe('the welcome waits for the page to settle', () => {
  const run = (frameMs: (i: number) => number) => {
    const t = settleTracker();
    let now = 0;
    for (let i = 0; i < 10_000; i++) {
      now += frameMs(i);
      if (t.frame(now)) return now;
    }
    return Infinity;
  };

  it('goes once frames are smooth for a while, and not before the minimum', () => {
    const at = run(() => 16);
    expect(at).toBeGreaterThanOrEqual(SETTLE_MIN_MS);
    expect(at).toBeLessThan(SETTLE_MIN_MS + 50);
  });

  it('waits while the page stutters', () => {
    // A long frame every 5 frames for the first 2 s (loading), smooth afterwards.
    let now = 0;
    const at = run((i) => {
      const ms = now < 2000 && i % 5 === 0 ? 120 : 16;
      now += ms;
      return ms;
    });
    expect(at).toBeGreaterThan(2000);
    expect(at).toBeLessThan(2000 + 16 * SETTLE_FRAMES + 200);
  });

  it('goes anyway on a device that never gets smooth', () => {
    expect(run(() => 80)).toBeGreaterThanOrEqual(SETTLE_MAX_MS);
    expect(run(() => 80)).toBeLessThan(SETTLE_MAX_MS + 80);
  });
});

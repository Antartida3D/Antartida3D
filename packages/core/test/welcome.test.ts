import { describe, expect, it } from 'vitest';
import { VOYAGE_POINT, WELCOME_K, geometry, showsWelcome, toScreen, welcomeView } from '../src/index.ts';

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

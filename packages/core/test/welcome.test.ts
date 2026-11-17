import { describe, expect, it } from 'vitest';
import {
  GUIDE_GAP, GUIDE_MARGIN, VOYAGE_POINT, WELCOME_K, geometry, guidePlacement, nextExpedition, toScreen, welcomeView,
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

  it('comes close to another destination too', () => {
    const next = nextExpedition([VOYAGE_POINT.id])!;
    for (const size of SIZES) {
      const view = welcomeView(size, next);
      const { left, top } = toScreen(geometry(size), view, next.x, next.y);
      expect(left, `${size.vw}x${size.vh}`).toBeGreaterThan(0);
      expect(left, `${size.vw}x${size.vh}`).toBeLessThan(size.vw);
      expect(top, `${size.vw}x${size.vh}`).toBeGreaterThan(0);
      expect(top, `${size.vw}x${size.vh}`).toBeLessThan(size.vh);
    }
  });
});

describe('the guide step placement (#256)', () => {
  const view = { vw: 390, vh: 844 };
  const card = { w: 300, h: 160 };
  const pin = (left: number, top: number) => ({ left: left - 10, top: top - 10, width: 20, height: 20 });

  it('goes below a centred pin, with the arrow on it', () => {
    const p = guidePlacement(pin(195, 300), card, view);
    expect(p.anchored).toBe(true);
    expect(p.left).toBe(45);
    expect(p.top).toBe(310 + GUIDE_GAP);
    expect(p.arrowX).toBe(150);
  });

  it('stays inside the margin near the edges and the arrow follows the anchor', () => {
    const l = guidePlacement(pin(20, 300), card, view);
    expect(l.left).toBe(GUIDE_MARGIN);
    expect(l.arrowX).toBe(GUIDE_MARGIN);
    const r = guidePlacement(pin(350, 300), card, view);
    expect(r.left).toBe(view.vw - card.w - GUIDE_MARGIN);
    expect(r.left + r.arrowX).toBeCloseTo(350, 0);
  });

  it('takes a box: below it and aligned to its centre', () => {
    const box = { left: 100, top: 20, width: 200, height: 40 };
    const p = guidePlacement(box, card, view);
    expect(p.top).toBe(60 + GUIDE_GAP);
    expect(p.left + p.arrowX).toBeCloseTo(200, 0);
  });

  it('goes above the anchor when asked, and the card never covers it', () => {
    const box = { left: 20, top: 700, width: 120, height: 44 };
    const p = guidePlacement(box, card, view, 'above');
    expect(p.side).toBe('above');
    expect(p.top + card.h + GUIDE_GAP).toBe(700);
  });

  it('without an anchor, or with the anchor off the screen, goes at the bottom centre with no arrow', () => {
    for (const anchor of [null, pin(-10, 300), pin(200, 900)]) {
      const p = guidePlacement(anchor, card, view);
      expect(p.anchored).toBe(false);
      expect(p.left).toBe(45);
      expect(p.top).toBe(view.vh - card.h - GUIDE_MARGIN);
    }
  });
});

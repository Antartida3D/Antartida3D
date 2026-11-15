import { describe, expect, it } from 'vitest';
import { PTS } from '../src/content/points.ts';

const VERIFIED = ['polo', 'testigos', 'vostok', 'erebus', 'thwaites', 'belgrano', 'emperador', 'fosiles', 'oceano'];

describe('points without expedition (docs/puntos-proximamente-fuentes.md)', () => {
  for (const id of VERIFIED) {
    it(`${id} has a description and verified sources`, () => {
      const p = PTS.find((q) => q.id === id)!;
      expect(p.desc?.length ?? 0).toBeGreaterThan(80);
      expect(p.sources?.length ?? 0).toBeGreaterThan(0);
      for (const s of p.sources!) {
        expect(s.url).toMatch(/^https:\/\//);
        expect(s.org.length).toBeGreaterThan(0);
        expect(s.consulted).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    });
  }

  it('leaves Poncho provisional: it has its own issues (#9, #26-#33)', () => {
    expect(PTS.find((p) => p.id === 'poncho')!.desc).toBeUndefined();
  });

  it('gives no description to the points with an expedition', () => {
    for (const p of PTS.filter((q) => q.tier === 'A')) expect(p.desc).toBeUndefined();
  });
});

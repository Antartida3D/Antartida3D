import { describe, expect, it } from 'vitest';
import { PONCHO_MILESTONES, PONCHO_PHOTOS, ponchoPhotoAt } from '../src/index.ts';

describe('photographs of Poncho stops', () => {
  it('belong to a real stop, one each', () => {
    const stops = PONCHO_PHOTOS.map((p) => p.stop);
    expect(new Set(stops).size).toBe(stops.length);
    for (const id of stops) expect(PONCHO_MILESTONES.some((m) => m.id === id)).toBe(true);
  });

  it('say where they come from, and never claim rights that are not documented', () => {
    for (const p of PONCHO_PHOTOS) {
      expect(p.alt.length).toBeGreaterThan(20);
      expect(p.caption.length).toBeGreaterThan(10);
      expect(p.source.url).toMatch(/^https:\/\/www\.marambio\.aq\//);
      expect(p.source.accessed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(p.rights).toBe('pending');
    }
  });

  it('are found by stop, and most stops have none', () => {
    expect(ponchoPhotoAt('poncho-perro-guia')?.file).toBe('poncho-pagina.jpg');
    expect(ponchoPhotoAt('nacimiento')).toBeUndefined();
  });
});

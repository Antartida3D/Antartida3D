import { describe, expect, it } from 'vitest';
import { PONCHO_MILESTONES, PONCHO_PHOTOS, ponchoPhotosAt } from '../src/index.ts';

describe('photographs of Poncho stops', () => {
  it('belong to a real stop, each file used once', () => {
    const files = PONCHO_PHOTOS.map((p) => p.file);
    expect(new Set(files).size).toBe(files.length);
    for (const p of PONCHO_PHOTOS) expect(PONCHO_MILESTONES.some((m) => m.id === p.stop)).toBe(true);
  });

  it('say where they come from, and never claim rights that are not documented', () => {
    for (const p of PONCHO_PHOTOS) {
      expect(p.alt.length).toBeGreaterThan(20);
      expect(p.caption.length).toBeGreaterThan(10);
      expect(p.source.url).toMatch(/^https:\/\/(www\.marambio\.aq|commons\.wikimedia\.org)\//);
      expect(p.source.accessed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(['pending', 'licensed']).toContain(p.rights);
    }
  });

  it('only a photograph with a free license (or in the public domain) shows as licensed, and then it names its author and license', () => {
    for (const p of PONCHO_PHOTOS) {
      if (p.rights === 'licensed') {
        expect(p.credit?.author.length).toBeGreaterThan(2);
        expect(p.credit?.license).toMatch(/^(CC |Dominio público$)/);
        // A Creative Commons license links to its text; a release to the public domain, to the page where the author makes it.
        expect(p.credit?.licenseUrl).toMatch(p.credit?.license === 'Dominio público' ? /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/ : /^https:\/\/creativecommons\.org\//);
      } else {
        expect(p.credit).toBeUndefined();
      }
    }
  });

  it('are found by stop, in order, and most stops have none', () => {
    expect(ponchoPhotosAt('poncho-perro-guia').map((p) => p.file)).toEqual(['poncho-pagina.jpg', 'san-martin.jpg']);
    expect(ponchoPhotosAt('nacimiento').map((p) => p.file)).toEqual(['esperanza.jpg']);
    expect(ponchoPhotosAt('adios-a-la-antartida')).toEqual([]);
  });
});

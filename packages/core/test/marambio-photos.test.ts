import { describe, expect, it } from 'vitest';
import { MARAMBIO_PHOTO_ARCHIVE, MARAMBIO_PHOTOS, MARAMBIO_SPOTS, marambioPhotos } from '../src/content/marambio.ts';

describe('photographs of Base Marambio (#207)', () => {
  it('are each in one real point of interest', () => {
    const ids = MARAMBIO_PHOTOS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of MARAMBIO_PHOTOS) expect(MARAMBIO_SPOTS.some((s) => s.id === p.spot), p.id).toBe(true);
  });

  it('describe what they show, and give a date only as the camera recorded it', () => {
    for (const p of MARAMBIO_PHOTOS) {
      expect(p.alt.length, p.id).toBeGreaterThan(40);
      expect(p.caption.length, p.id).toBeGreaterThan(10);
      if (p.date !== null) expect(p.date, p.id).toMatch(/^\d{1,2} de [a-z]+ de \d{4}$/);
    }
    expect(MARAMBIO_PHOTO_ARCHIVE.detail).toMatch(/autorizaci[oó]n/);
  });

  it('are found by point, and the tower has none', () => {
    expect(marambioPhotos('buildings').map((p) => p.id)).toEqual(['polar-depot', 'historic-house']);
    expect(marambioPhotos('tower')).toEqual([]);
  });
});

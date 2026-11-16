import { describe, expect, it } from 'vitest';
import {
  EXPEDITION,
  FOSSIL_PHOTOS,
  FOSSIL_SOURCES,
  FOSSIL_STOPS,
  FOSSIL_STORY,
  MARAMBIO_FACTS,
  MILESTONES,
  ORCADAS_FACTS,
  PONCHO_LOG,
  PONCHO_MILESTONES,
  PONCHO_PHOTOS,
  PONCHO_TRANSPORT,
  SIGHTINGS,
  TRANSPORTS,
  VOYAGE_SOURCES,
  VOYAGE_TOURISM_NOTE,
  VOYAGE_TRANSFER,
  quoteParts,
} from '../src/index.ts';

describe('quoteParts (#190)', () => {
  it('cuts a text at its “quoted” passages and gives back the text', () => {
    const text = 'Fue “la primera pista”. Después, “otra cosa” y el final.';
    expect(quoteParts(text)).toEqual([
      { text: 'Fue ', quoted: false },
      { text: '“la primera pista”', quoted: true },
      { text: '. Después, ', quoted: false },
      { text: '“otra cosa”', quoted: true },
      { text: ' y el final.', quoted: false },
    ]);
    expect(quoteParts(text).map((p) => p.text).join('')).toBe(text);
  });

  it('leaves a text without quotes, or with a quote left open, as it is', () => {
    expect(quoteParts('Sin citas.')).toEqual([{ text: 'Sin citas.', quoted: false }]);
    expect(quoteParts('Abre “y no cierra.')).toEqual([{ text: 'Abre “y no cierra.', quoted: false }]);
    expect(quoteParts('')).toEqual([]);
  });

  it('keeps the ‘inner’ quotes of a title inside its passage', () => {
    expect(quoteParts('“Cruzando el Drake a bordo del ‘Irízar’” (2019)')).toEqual([
      { text: '“Cruzando el Drake a bordo del ‘Irízar’”', quoted: true },
      { text: ' (2019)', quoted: false },
    ]);
  });
});

describe('quotes in the content (#190)', () => {
  const content = JSON.stringify([
    VOYAGE_SOURCES, TRANSPORTS, MILESTONES, EXPEDITION, VOYAGE_TRANSFER, VOYAGE_TOURISM_NOTE, SIGHTINGS,
    PONCHO_TRANSPORT, PONCHO_MILESTONES, PONCHO_LOG, PONCHO_PHOTOS, ORCADAS_FACTS, MARAMBIO_FACTS,
    FOSSIL_SOURCES, FOSSIL_PHOTOS, FOSSIL_STOPS, FOSSIL_STORY,
  ]);

  it('has no «angle» quotes: a quotation goes between “ and ”', () => {
    expect(/[«»]/.test(content)).toBe(false);
  });

  it('closes every quote it opens', () => {
    expect(content.match(/“/g)?.length).toBe(content.match(/”/g)?.length);
    expect(content.match(/“/g)?.length ?? 0).toBeGreaterThan(0);
  });
});

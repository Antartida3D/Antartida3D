import { describe, expect, it } from 'vitest';
import { PONCHO_EXPEDITION, PONCHO_MILESTONES, PONCHO_TRANSPORT, VOYAGE_SOURCES, voyageStops } from '../src/index.ts';

const allFacts = [
  ...PONCHO_TRANSPORT.facts,
  ...PONCHO_MILESTONES.flatMap((m) => [m.essential, ...m.more]),
  ...Object.values(PONCHO_EXPEDITION).flatMap((stop) => stop.notes.map((n) => n.fact)),
];
const sentences = (text: string) => text.match(/[.!?](?=\s|$)/g)?.length ?? 0;
const allTexts = [
  ...PONCHO_MILESTONES.map((m) => m.title),
  ...allFacts.map((f) => f.text),
  ...Object.values(PONCHO_EXPEDITION).flatMap((stop) => (stop.question ? [stop.question.prompt, ...stop.question.options] : [])),
];

describe('content of the expedition of Poncho', () => {
  it('has unique milestone ids', () => {
    const ids = PONCHO_MILESTONES.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every milestone a title and a non-empty essential', () => {
    for (const m of PONCHO_MILESTONES) {
      expect(m.title, m.id).not.toBe('');
      expect(m.essential.text.trim(), m.id).not.toBe('');
    }
  });

  it('gives every milestone a year and tells them in the order of the story', () => {
    const years = PONCHO_MILESTONES.map((m) => m.year);
    for (const year of years) expect(year).toBeGreaterThanOrEqual(1951);
    for (let i = 1; i < years.length; i++) expect(years[i]!).toBeGreaterThanOrEqual(years[i - 1]!);
  });

  it('opens the stops in the order of the story along the route', () => {
    const stops = voyageStops('dogs');
    expect(stops.map((s) => s.milestone.year)).toEqual(PONCHO_MILESTONES.map((m) => m.year));
    for (let i = 1; i < stops.length; i++) expect(stops[i].t).toBeGreaterThanOrEqual(stops[i - 1].t);
  });

  it('keeps its questions inside the milestones it has', () => {
    const ids = new Set(PONCHO_MILESTONES.map((m) => m.id));
    for (const [id, stop] of Object.entries(PONCHO_EXPEDITION)) {
      expect(ids.has(id), id).toBe(true);
      if (stop.question) {
        expect(stop.question.answer).toBeGreaterThanOrEqual(0);
        expect(stop.question.answer).toBeLessThan(stop.question.options.length);
      }
    }
  });

  it('names no person: the book leaves them out on purpose', () => {
    for (const text of allTexts) expect(text).not.toMatch(/Giró|Sosa|Villar|Urruty/);
  });

  it('leaves out the doubtful data of the book', () => {
    for (const text of allTexts) {
      expect(text, text).not.toMatch(/Círculo Polar|1956|Dusse|paracaidistas de la Segunda/);
    }
  });

  // The story was rewritten as a short tale of 9 or 10 stops, each in its own place of the route (it had 17 stops
  // that opened in a row in the same place); the data with their sources went to «Saber más».
  it('tells the story in 9 or 10 stops', () => {
    expect(PONCHO_MILESTONES.length).toBeGreaterThanOrEqual(9);
    expect(PONCHO_MILESTONES.length).toBeLessThanOrEqual(10);
  });

  it('opens each stop on a leg of the route, and no two stops in the same place of one leg', () => {
    const places = PONCHO_MILESTONES.map((m) => {
      expect(Number.isInteger(m.segment), m.id).toBe(true);
      expect(m.segment!, m.id).toBeGreaterThanOrEqual(0);
      expect(m.segment!, m.id).toBeLessThanOrEqual(5);
      return `${m.segment}:${JSON.stringify(m.place ?? m.anchor)}`;
    });
    expect(new Set(places).size).toBe(places.length);
  });

  it('tells each stop in two or three short sentences', () => {
    for (const m of PONCHO_MILESTONES) {
      expect(sentences(m.essential.text), m.id).toBeGreaterThanOrEqual(2);
      expect(sentences(m.essential.text), m.id).toBeLessThanOrEqual(3);
    }
  });

  it('cites the page of the book for every real fact of it', () => {
    for (const fact of allFacts) {
      if (fact.kind === 'real' && fact.sources.includes('P1')) {
        const page = fact.pages?.P1;
        expect(page, fact.text).toBeDefined();
        expect(Number.isInteger(page), fact.text).toBe(true);
        expect(page!, fact.text).toBeGreaterThanOrEqual(1);
        expect(page!, fact.text).toBeLessThanOrEqual(25);
      }
      for (const code of Object.keys(fact.pages ?? {})) expect(fact.sources, fact.text).toContain(code);
    }
  });

  it('links the book to its PDF, a document that has pages', () => {
    expect(VOYAGE_SOURCES.P1.url).toBe('https://www.marambio.aq/pdf/poncho.pdf');
  });

  it('does not say in every card that it is approximate or illustrative: the trip says it once', () => {
    for (const text of allTexts) expect(text, text).not.toMatch(/aproximad|ilustrativ|a definir|según el libro/i);
    expect(PONCHO_TRANSPORT.notice).toBe('El recorrido y los modelos son una ilustración, no una ruta real.');
    expect(allFacts.every((f) => f.kind === 'real')).toBe(true);
  });
});

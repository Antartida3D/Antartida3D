import { describe, expect, it } from 'vitest';
import {
  PONCHO_ACTS, PONCHO_LOG, PONCHO_MILESTONES, PONCHO_TRANSPORT, VOYAGE_SOURCES, VOYAGE_SOURCE_CODES, citationLabel, expeditionAt, logLineAt, ponchoActOpeningAt, quizScore, tripLegCount, tripLegRange, tripSourceNumber, tripSources, voyageSourceNumber, voyageStops,
} from '../src/index.ts';

const allFacts = [
  ...PONCHO_TRANSPORT.facts,
  ...PONCHO_MILESTONES.flatMap((m) => [m.essential, ...m.more]),
];
const sentences = (text: string) => text.match(/[.!?](?=\s|$)/g)?.length ?? 0;
const allTexts = [
  ...PONCHO_MILESTONES.map((m) => m.title),
  ...allFacts.map((f) => f.text),
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

  // The trip of Poncho has no questions or «así funciona» notes (issue #140): its closing card shows no score.
  it('asks no questions and has no notes: nothing to score', () => {
    for (const m of PONCHO_MILESTONES) expect(expeditionAt(m.id, 'poncho'), m.id).toEqual({ notes: [], question: null });
    expect(quizScore('poncho', {})).toEqual({ right: 0, answered: 0, total: 0 });
  });

  it('names no person: the book leaves them out on purpose', () => {
    for (const text of allTexts) expect(text).not.toMatch(/Giró|Sosa|Villar|Urruty/);
  });

  it('leaves out the doubtful data of the book', () => {
    for (const text of allTexts) {
      expect(text, text).not.toMatch(/Círculo Polar|1956|Dusse|paracaidistas de la Segunda/);
    }
  });

  // The story was rewritten as a short tale of 10 stops, each in its own place of the route (it had 17 stops
  // that opened in a row in the same place); the data with their sources went to «Saber más». Then the patrol of the
  // Paralelo 82 joined the jump (DEC-221) and the last three stops became one (DEC-223): 7 stops.
  it('tells the story in 7 stops', () => {
    expect(PONCHO_MILESTONES).toHaveLength(7);
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

  it('lists only the sources it cites, in order of first use, numbered from 1', () => {
    const codes = tripSources('poncho');
    expect(codes[0]).toBe('P1');
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes.length).toBeLessThan(VOYAGE_SOURCE_CODES.length);
    expect([...codes].sort()).toEqual([...new Set(allFacts.flatMap((f) => f.sources))].sort());
    expect(tripSourceNumber('poncho', 'P1')).toBe(1);
    expect(codes.map((c) => tripSourceNumber('poncho', c))).toEqual(codes.map((_, i) => i + 1));
    expect(tripSourceNumber('poncho', 'U1')).toBe(0);
  });

  it('keeps the global registry and numbering for the trips from Ushuaia', () => {
    for (const id of ['irizar', 'hercules'] as const) {
      expect(tripSources(id)).toEqual(VOYAGE_SOURCE_CODES);
      expect(tripSourceNumber(id, 'P1')).toBe(voyageSourceNumber('P1'));
    }
  });
});

// The hooks (closing line of each card) and the log lines tell no fact the card does not already source: the hooks
// carry no source, so nothing that looks like a fact (figure, year, name, estimate) may get in through them.
describe('hooks of the story', () => {
  const hooks = PONCHO_MILESTONES.map((m) => ({ id: m.id, hook: m.hook }));

  it('gives every stop a hook that ends with a period and asks nothing', () => {
    for (const { id, hook } of hooks) {
      expect(hook, id).toBeDefined();
      expect(hook!.trim(), id).toMatch(/\.$/);
      expect(hook, id).not.toMatch(/[?¿!]/);
      expect(sentences(hook!), id).toBe(1);
    }
  });

  it('has no figures, years, proper names (but Poncho), quotes or hedges', () => {
    for (const { id, hook } of hooks) {
      expect(hook, id).not.toMatch(/\d/);
      expect(hook, id).not.toMatch(/aproximad|ilustrativ|a definir|«|»/i);
      const words = hook!.replace(/[.,;:]/g, '').split(/\s+/).slice(1);
      for (const word of words) if (/^\p{Lu}/u.test(word)) expect(word, id).toBe('Poncho');
    }
  });

  it('names no person and no fire (the book talks about tents)', () => {
    for (const { id, hook } of hooks) {
      expect(hook, id).not.toMatch(/Giró|Sosa|Villar|Urruty|fuego|fogata/i);
    }
  });

  it('keeps the essentials free of the doubtful words too', () => {
    for (const m of PONCHO_MILESTONES) expect(m.essential.text, m.id).not.toMatch(/fuego|fogata|\?/i);
  });
});

describe('acts of the story', () => {
  it('are three, each opening at an existing stop, in the order of the story, and each with at least one stop', () => {
    expect(PONCHO_ACTS).toHaveLength(3);
    const ids = PONCHO_MILESTONES.map((m) => m.id);
    const firsts = PONCHO_ACTS.map((a) => ids.indexOf(a.firstStop));
    for (const index of firsts) expect(index).toBeGreaterThanOrEqual(0);
    expect(firsts[0]).toBe(0);
    for (let i = 1; i < firsts.length; i++) expect(firsts[i]!).toBeGreaterThan(firsts[i - 1]!);
    for (const act of PONCHO_ACTS) expect(act.title.trim()).not.toBe('');
  });

  it('finds the act that opens at a stop, and none elsewhere', () => {
    expect(ponchoActOpeningAt('nacimiento')?.number).toBe(1);
    expect(ponchoActOpeningAt('rumbo-a-belgrano')?.act.id).toBe('rescates');
    expect(ponchoActOpeningAt('paracaidas')).toBeUndefined();
    // The last stop tells the retirement too, inside the third act: no act opens there (DEC-223).
    expect(ponchoActOpeningAt('brujula-perdida')).toBeUndefined();
  });
});

describe('route log of the trip of Poncho', () => {
  // The ship back to Esperanza got its own two lines (#309), so that no leg of the trip shows an empty log: up to 14.
  it('has between 8 and 14 one-sentence lines, in order of the trip, on legs of the route', () => {
    expect(PONCHO_LOG.length).toBeGreaterThanOrEqual(8);
    expect(PONCHO_LOG.length).toBeLessThanOrEqual(14);
    for (let i = 0; i < PONCHO_LOG.length; i++) {
      const { leg, at, fact } = PONCHO_LOG[i]!;
      expect(Number.isInteger(leg)).toBe(true);
      expect(leg).toBeGreaterThanOrEqual(0);
      expect(leg).toBeLessThan(tripLegCount('dogs'));
      expect(at).toBeGreaterThanOrEqual(0);
      expect(at).toBeLessThanOrEqual(1);
      expect(sentences(fact.text), fact.text).toBe(1);
      if (i > 0) {
        const before = PONCHO_LOG[i - 1]!;
        expect(leg * 10 + at, fact.text).toBeGreaterThan(before.leg * 10 + before.at);
      }
    }
  });

  it('has only real facts of the book with the page where each is', () => {
    for (const { fact } of PONCHO_LOG) {
      expect(fact.kind).toBe('real');
      expect(fact.sources).toEqual(['P1']);
      expect(Number.isInteger(fact.pages?.P1), fact.text).toBe(true);
      expect(fact.pages!.P1!).toBeGreaterThanOrEqual(1);
      expect(fact.pages!.P1!).toBeLessThanOrEqual(25);
      expect(fact.text, fact.text).not.toMatch(/Giró|Sosa|Villar|Urruty|aproximad|ilustrativ|a definir/);
    }
  });

  it('gives the line that corresponds to the progress of the trip, on every leg', () => {
    const lines = new Set<string>();
    for (const { leg, at, fact } of PONCHO_LOG) {
      const [from, to] = tripLegRange('dogs', leg);
      expect(logLineAt('dogs', from + at * (to - from))).toBe(fact);
      lines.add(fact.text);
    }
    expect(lines.size).toBe(PONCHO_LOG.length);
    // Every leg of the trip has a line: the ship back to Esperanza too (#309), so the log is never empty.
    for (let leg = 0; leg < tripLegCount('dogs'); leg++) {
      const [from, to] = tripLegRange('dogs', leg);
      expect(logLineAt('dogs', (from + to) / 2), `leg ${leg}`).not.toBeNull();
    }
    expect(logLineAt('ship', 0.5)).toBeNull();
    // The last leg is the sled patrol at Esperanza (DEC-223): at the very end of the trip its last line still shows.
    expect(logLineAt('dogs', 1)).not.toBeNull();
  });

  it('forces a leg for the steps of a trip that does not animate the path', () => {
    const [from, to] = tripLegRange('dogs', 2);
    expect(logLineAt('dogs', (from + to) / 2, 2)).not.toBeNull();
    expect(logLineAt('dogs', 0, 3)).not.toBeNull();
  });
});

describe('citationLabel', () => {
  it('shows the short name with the page, so the book reads «Libro · p. 9»', () => {
    expect(VOYAGE_SOURCES.P1.short).toBe('Libro');
    expect(citationLabel('P1', 32, 9)).toBe('Libro · p. 9');
  });

  it('falls back to the number when the source has no short name, and shows only the number without a page', () => {
    expect(citationLabel('P2', 33, 3)).toBe('33 · p. 3');
    expect(citationLabel('P1', 32)).toBe('32');
  });
});

describe('the trip of Poncho is told in order, the others are optional (#157)', () => {
  it('opens the departure at once and stops at every milestone, while the trips from Ushuaia pass them by', async () => {
    const { advanceVoyage, startVoyage, storyInOrder, voyageStops } = await import('../src/index.ts');
    expect(storyInOrder('dogs')).toBe(true);
    expect(storyInOrder('ship')).toBe(false);
    const poncho = startVoyage('poncho');
    expect(poncho.card).toBe(0);
    // Held down for a long while, it still stops at the first milestone after the departure and opens its card.
    const first = advanceVoyage({ ...poncho, card: -1 }, 1e6);
    expect(first.card).toBe(1);
    expect(first.reached).toBe(2);
    const ushuaia = startVoyage('irizar');
    expect(ushuaia.card).toBe(-1);
    const end = advanceVoyage(ushuaia, 1e6);
    expect(end.card).toBe(voyageStops('ship').length - 1);
  });
});

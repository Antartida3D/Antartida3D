import { describe, expect, it } from 'vitest';
import {
  INITIAL_MARINE, MARINE_CHAPTERS, MARINE_LINKS, MARINE_ORGANISMS, MARINE_SOURCES, MARINE_STOPS, MARINE_VIEW_TEXT,
  SEA_POINTS, isUnderwater, linkSentence, linksOf, marineReducer, type MarineAction, type MarineState,
} from '../src/index.ts';

const run = (actions: MarineAction[], from: MarineState = INITIAL_MARINE) => actions.reduce(marineReducer, from);
const next = (n: number): MarineAction[] => Array.from({ length: n }, () => ({ type: 'next' }));

describe('Océano tour (#8)', () => {
  it('has the 7 chapters and 12 stops of the research, in chapter order', () => {
    expect(MARINE_CHAPTERS).toHaveLength(7);
    expect(MARINE_STOPS).toHaveLength(12);
    const order = MARINE_STOPS.map((s) => MARINE_CHAPTERS.findIndex((c) => c.id === s.chapter));
    expect(order).toEqual([...order].sort((a, b) => a - b));
    for (const c of MARINE_CHAPTERS) expect(MARINE_STOPS.some((s) => s.chapter === c.id)).toBe(true);
  });

  it('can be walked to the end without any optional interaction, and stays inside its bounds', () => {
    const end = run(next(MARINE_STOPS.length + 3));
    expect(end.stop).toBe(MARINE_STOPS.length - 1);
    expect(end.visited).toEqual(MARINE_STOPS.map((s) => s.id));
    expect(run([{ type: 'prev' }]).stop).toBe(0);
  });

  it('counts each stop once when going back and forth or jumping by chapter', () => {
    const s = run([...next(3), { type: 'prev' }, { type: 'next' }, { type: 'chapter', chapter: 'enter' }, { type: 'chapter', chapter: 'whales' }]);
    expect(new Set(s.visited).size).toBe(s.visited.length);
    expect(s.stop).toBe(MARINE_STOPS.findIndex((st) => st.chapter === 'whales'));
  });

  it('keeps what was observed when moving on', () => {
    const s = run([{ type: 'surface' }, ...next(3), { type: 'filter' }, ...next(4), { type: 'compare' }, ...next(3)]);
    expect(s.filtered).toBe(true);
    expect(s.compared).toBe(true);
  });

  it('opens the tour and the emperor chapter above the ice', () => {
    expect(INITIAL_MARINE.under).toBe(false);
    const dived = run([{ type: 'surface' }, ...next(4)]);
    expect(dived.under).toBe(true);
    expect(run([{ type: 'chapter', chapter: 'emperor' }], dived).under).toBe(false);
    expect(isUnderwater('ceiling', INITIAL_MARINE)).toBe(false);
    expect(isUnderwater('ceiling', dived)).toBe(true);
    expect(isUnderwater('krill', INITIAL_MARINE)).toBe(true);
    // The documented orca example is seen from above the water.
    expect(isUnderwater('orcas', INITIAL_MARINE)).toBe(true);
    expect(isUnderwater('orcas', { ...INITIAL_MARINE, example: true })).toBe(false);
  });

  it('selects and deselects organisms in the web and remembers each one only once', () => {
    const s = run([{ type: 'select', organism: 'krill' }, { type: 'select', organism: 'orca' }, { type: 'select', organism: 'krill' }, { type: 'select', organism: 'krill' }]);
    expect(s.selected).toBe(null);
    expect(s.traced).toEqual(['krill', 'orca']);
  });
});

describe('Océano food web', () => {
  it('only links organisms of the web, with sources, scope and a note', () => {
    for (const l of MARINE_LINKS) {
      expect(MARINE_ORGANISMS[l.from]).toBeDefined();
      expect(MARINE_ORGANISMS[l.to]).toBeDefined();
      expect(l.from).not.toBe(l.to);
      expect(l.sources.length).toBeGreaterThan(0);
      for (const id of l.sources) expect(MARINE_SOURCES[id]).toBeDefined();
      expect(l.scope.length).toBeGreaterThan(5);
      expect(l.note.length).toBeGreaterThan(5);
    }
  });

  it('has no repeated arrow and leaves no organism alone', () => {
    const keys = MARINE_LINKS.map((l) => `${l.from}>${l.to}`);
    expect(new Set(keys).size).toBe(keys.length);
    for (const o of Object.keys(MARINE_ORGANISMS) as (keyof typeof MARINE_ORGANISMS)[]) expect(linksOf(o).length).toBeGreaterThan(0);
  });

  it('does not invent links that the sources do not name', () => {
    const has = (from: string, to: string) => MARINE_LINKS.some((l) => l.from === from && l.to === to);
    expect(has('emperor', 'leopard')).toBe(false);
    expect(has('leopard', 'orca')).toBe(false);
    expect(has('krill', 'orca')).toBe(false);
  });

  it('says that the diet of orcas depends on the group', () => {
    for (const l of MARINE_LINKS.filter((l) => l.to === 'orca')) expect(l.note).toMatch(/depende del grupo/i);
  });

  it('reads every arrow as food first and consumer second', () => {
    expect(linkSentence(MARINE_LINKS[1])).toBe('Krill antártico sirve de alimento a jorobada.');
    expect(linkSentence(MARINE_LINKS[0])).toBe('Fitoplancton y algas del hielo sirven de alimento a krill antártico.');
  });

  it('does not reduce the leopard seal to a penguin hunter', () => {
    const food = linksOf('leopard').filter((l) => l.to === 'leopard').map((l) => l.from);
    expect(food).toEqual(expect.arrayContaining(['krill', 'fish', 'penguins-seals']));
    const card = SEA_POINTS.find((p) => p.id === 'sea-leopardo')!;
    expect(card.desc).toMatch(/krill/);
    expect(card.desc).toMatch(/peces/);
  });
});

describe('Océano sources and texts', () => {
  it('cites only catalogued sources, each with an organization, a date and a link', () => {
    for (const stop of MARINE_STOPS) {
      expect(stop.sources.length).toBeGreaterThan(0);
      for (const id of stop.sources) expect(MARINE_SOURCES[id]).toBeDefined();
    }
    for (const s of Object.values(MARINE_SOURCES)) {
      expect(s.org.length).toBeGreaterThan(3);
      expect(s.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(s.url).toMatch(/^https:\/\//);
    }
  });

  it('says when only an abstract was read', () => {
    for (const s of Object.values(MARINE_SOURCES).filter((s) => s.read === 'abstract')) expect(s.detail).toMatch(/resumen/);
  });

  it('describes every view in words for the tour without WebGL', () => {
    for (const stop of MARINE_STOPS) expect(MARINE_VIEW_TEXT[stop.view].length).toBeGreaterThan(20);
  });
});

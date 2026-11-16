import { describe, expect, it } from 'vitest';
import { FOSSIL_CHAPTERS, FOSSIL_HABITATS, FOSSIL_PHOTOS, FOSSIL_SOURCES, FOSSIL_STOPS, FOSSIL_STORY, FOSSIL_TIMELINE } from '../src/content/fossils.ts';
import { FOSSIL_CLEAN_STEPS, INITIAL_FOSSILS, fossilsReducer, timelineAt, timelineFinds } from '../src/fossils.ts';

describe('fossil expedition', () => {
  it('can complete the tour without requiring optional interactions', () => {
    let state = INITIAL_FOSSILS;
    for (let i = 1; i < FOSSIL_STOPS.length; i++) state = fossilsReducer(state, { type: 'next' });
    expect(state.stop).toBe(FOSSIL_STOPS.length - 1);
    expect(state.visited).toHaveLength(FOSSIL_STOPS.length);
    expect(state.cleaned).toBe(0);
    expect(state.column || state.tooth || state.measured).toBe(false);
    expect(fossilsReducer(state, { type: 'next' })).toEqual(state);
    expect(fossilsReducer(INITIAL_FOSSILS, { type: 'prev' })).toEqual(INITIAL_FOSSILS);
  });

  it('keeps the discoveries when revisiting a chapter without duplicating visits', () => {
    let state = fossilsReducer(INITIAL_FOSSILS, { type: 'chapter', chapter: 'ammonites' });
    for (let i = 0; i < 10; i++) state = fossilsReducer(state, { type: 'clean' });
    state = fossilsReducer(state, { type: 'column' });
    state = fossilsReducer(state, { type: 'tooth' });
    state = fossilsReducer(state, { type: 'measure' });
    const visited = state.visited;
    state = fossilsReducer(state, { type: 'chapter', chapter: 'camp' });
    state = fossilsReducer(state, { type: 'chapter', chapter: 'ammonites' });
    expect(state.cleaned).toBe(FOSSIL_CLEAN_STEPS);
    expect(state.column && state.tooth && state.measured).toBe(true);
    expect(state.visited).toEqual(visited);
  });

  it('shows the dinosaur reconstructed on arriving at its stop, like the other animals, and again on each return', () => {
    const animal = FOSSIL_STOPS.findIndex((s) => s.view === 'dinosaur');
    let state = INITIAL_FOSSILS;
    while (state.stop < animal - 1) state = fossilsReducer(state, { type: 'next' });
    expect(state.reconstructed).toBe(false);
    state = fossilsReducer(state, { type: 'next' });
    expect(state.reconstructed).toBe(true);
    // Back to the remains to compare; leaving and coming back shows the animal again.
    state = fossilsReducer(state, { type: 'reconstruct' });
    expect(state.reconstructed).toBe(false);
    state = fossilsReducer(fossilsReducer(state, { type: 'next' }), { type: 'prev' });
    expect(state.reconstructed).toBe(true);
    expect(fossilsReducer(INITIAL_FOSSILS, { type: 'chapter', chapter: 'dinosaur' }).reconstructed).toBe(false);
  });

  it('lets the user compare evidence and reconstruction and switch the three habitats', () => {
    const reconstructed = fossilsReducer(INITIAL_FOSSILS, { type: 'reconstruct' });
    expect(reconstructed.reconstructed).toBe(true);
    expect(fossilsReducer(reconstructed, { type: 'reconstruct' }).reconstructed).toBe(false);
    for (const { id } of FOSSIL_HABITATS) expect(fossilsReducer(reconstructed, { type: 'habitat', habitat: id }).habitat).toBe(id);
  });

  it('orders the chapters by the age of the fossils: Cretaceous first, Eocene stars after', () => {
    const order = FOSSIL_CHAPTERS.map((c) => c.id);
    expect(order).toEqual(['camp', 'ammonites', 'plesiosaur', 'dinosaur', 'stars', 'past']);
    expect(FOSSIL_HABITATS.find((h) => h.id === 'seafloor')?.age).toMatch(/Eoceno/);
  });

  it('has a source for every stop, a stop for every chapter and a credited photo for every reference', () => {
    expect(new Set(FOSSIL_STOPS.map((s) => s.id)).size).toBe(FOSSIL_STOPS.length);
    for (const stop of FOSSIL_STOPS) {
      expect(stop.sources.length).toBeGreaterThan(0);
      for (const id of stop.sources) {
        expect(FOSSIL_SOURCES[id].org.length).toBeGreaterThan(0);
        expect(FOSSIL_SOURCES[id].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
      for (const photo of stop.photos ?? []) {
        expect(FOSSIL_PHOTOS[photo].alt.length).toBeGreaterThan(20);
        expect(FOSSIL_PHOTOS[photo].credit.length).toBeGreaterThan(0);
        expect(FOSSIL_SOURCES[FOSSIL_PHOTOS[photo].source]).toBeDefined();
      }
    }
    for (const chapter of FOSSIL_CHAPTERS) expect(FOSSIL_STOPS.some((s) => s.chapter === chapter.id)).toBe(true);
  });

  it('the anecdote of 1986 sits on an existing stop, with its source and a credit that tells quote from summary', () => {
    expect(FOSSIL_STOPS.some((stop) => stop.id === FOSSIL_STORY.stop)).toBe(true);
    expect(FOSSIL_SOURCES[FOSSIL_STORY.source].url).toMatch(/^https:\/\/www\.infobae\.com\//);
    expect(FOSSIL_STORY.credit).toMatch(/textuales/);
    // Every quote opens and closes.
    for (const p of FOSSIL_STORY.paragraphs) expect((p.match(/“/g) ?? []).length).toBe((p.match(/”/g) ?? []).length);
  });

  it('the time line goes from the Late Cretaceous to the end of the Eocene, to scale, with the ICS boundaries', () => {
    const { periods } = FOSSIL_TIMELINE;
    expect(periods.map((p) => [p.from, p.to])).toEqual([[100.5, 66], [66, 56], [56, 33.9]]);
    expect(timelineAt(100.5)).toBe(0);
    expect(timelineAt(33.9)).toBe(1);
    // The Late Cretaceous takes about half of the line: 34.5 of 66.6 million years.
    expect(timelineAt(66)).toBeCloseTo(34.5 / 66.6, 6);
    expect(FOSSIL_SOURCES.ics.url).toMatch(/^https:\/\/stratigraphy\.org\//);
  });

  it('places every find inside one period, with sources, and lights it once its chapter is visited', () => {
    for (const f of FOSSIL_TIMELINE.finds) {
      expect(FOSSIL_TIMELINE.periods.some((p) => f.from <= p.from && f.to >= p.to), f.chapter).toBe(true);
      expect(f.sources).toContain('ics');
      for (const id of f.sources) expect(FOSSIL_SOURCES[id]).toBeDefined();
      expect(FOSSIL_STOPS.some((s) => s.chapter === f.chapter)).toBe(true);
    }
    expect(timelineFinds(INITIAL_FOSSILS).filter((f) => f.found)).toEqual([]);
    let state = fossilsReducer(INITIAL_FOSSILS, { type: 'chapter', chapter: 'plesiosaur' });
    expect(timelineFinds(state).filter((f) => f.found).map((f) => f.chapter)).toEqual(['plesiosaur']);
    expect(timelineFinds(state).find((f) => f.current)?.chapter).toBe('plesiosaur');
    // On to the end from there: every find lights up but the ammonites, whose chapter was skipped.
    for (let i = 0; i < FOSSIL_STOPS.length; i++) state = fossilsReducer(state, { type: 'next' });
    expect(timelineFinds(state).filter((f) => !f.found).map((f) => f.chapter)).toEqual(['ammonites']);
  });

  it('shows each archive photo in one stop only', () => {
    const shown = FOSSIL_STOPS.flatMap((s) => s.photos ?? []);
    expect(shown.length).toBe(new Set(shown).size);
  });

  it('marks the Tierra del Fuego forest as a modern comparison, not the Antarctic past', () => {
    expect(FOSSIL_PHOTOS['forest-tdf'].note).toMatch(/Tierra del Fuego/);
    expect(FOSSIL_PHOTOS['forest-tdf'].note).toMatch(/no la Antártida/);
  });
});

import { describe, expect, it } from 'vitest';
import { FOSSIL_CHAPTERS, FOSSIL_HABITATS, FOSSIL_PHOTOS, FOSSIL_SOURCES, FOSSIL_STOPS, FOSSIL_STORY } from '../src/content/fossils.ts';
import { FOSSIL_CLEAN_STEPS, INITIAL_FOSSILS, fossilsReducer } from '../src/fossils.ts';

describe('fossil expedition', () => {
  it('can complete the tour without requiring optional interactions', () => {
    let state = INITIAL_FOSSILS;
    for (let i = 1; i < FOSSIL_STOPS.length; i++) state = fossilsReducer(state, { type: 'next' });
    expect(state.stop).toBe(FOSSIL_STOPS.length - 1);
    expect(state.visited).toHaveLength(FOSSIL_STOPS.length);
    expect(state.cleaned).toBe(0);
    expect(state.column || state.tooth || state.reconstructed || state.measured).toBe(false);
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

  it('lets the user compare evidence and reconstruction and switch the three habitats', () => {
    const reconstructed = fossilsReducer(INITIAL_FOSSILS, { type: 'reconstruct' });
    expect(reconstructed.reconstructed).toBe(true);
    expect(fossilsReducer(reconstructed, { type: 'reconstruct' }).reconstructed).toBe(false);
    // Going back to the remains still counts the reconstruction as seen.
    expect(fossilsReducer(reconstructed, { type: 'reconstruct' }).imagined).toBe(true);
    expect(INITIAL_FOSSILS.imagined).toBe(false);
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
    for (const p of FOSSIL_STORY.paragraphs) expect((p.match(/«/g) ?? []).length).toBe((p.match(/»/g) ?? []).length);
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

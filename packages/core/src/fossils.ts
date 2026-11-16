import { FOSSIL_STOPS, FOSSIL_TIMELINE, type FossilChapter, type FossilHabitat } from './content/fossils.ts';

export interface FossilState {
  stop: number;
  cleaned: number;
  /** Plesiosaur: the visitor followed the vertebral column. */
  column: boolean;
  tooth: boolean;
  /**
   * Dinosaur: the reconstruction is showing. Arriving at its stop shows it, as the other animals are
   * shown on theirs; the button switches back to the remains to compare.
   */
  reconstructed: boolean;
  /** Stars: the visitor measured a sea star against the scale. */
  measured: boolean;
  habitat: FossilHabitat;
  visited: readonly string[];
}
export type FossilAction =
  | { type: 'next' | 'prev' | 'clean' | 'column' | 'tooth' | 'reconstruct' | 'measure' }
  | { type: 'chapter'; chapter: FossilChapter }
  | { type: 'habitat'; habitat: FossilHabitat };

export const FOSSIL_CLEAN_STEPS = 3;

export const INITIAL_FOSSILS: FossilState = {
  stop: 0, cleaned: 0, column: false, tooth: false, reconstructed: false, measured: false,
  habitat: 'sea', visited: ['arrival'],
};
export function fossilsReducer(state: FossilState, action: FossilAction): FossilState {
  const go = (stop: number): FossilState => {
    const index = Math.max(0, Math.min(FOSSIL_STOPS.length - 1, stop));
    const id = FOSSIL_STOPS[index].id;
    // Arriving at the dinosaur, the bones gather into the animal, as each animal shows on its stop.
    const arriving = index !== state.stop && FOSSIL_STOPS[index].view === 'dinosaur';
    return { ...state, stop: index, reconstructed: arriving || state.reconstructed, visited: state.visited.includes(id) ? state.visited : [...state.visited, id] };
  };
  switch (action.type) {
    case 'next': return go(state.stop + 1);
    case 'prev': return go(state.stop - 1);
    case 'chapter': {
      const index = FOSSIL_STOPS.findIndex((stop) => stop.chapter === action.chapter);
      return index < 0 ? state : go(index);
    }
    case 'clean': return { ...state, cleaned: Math.min(FOSSIL_CLEAN_STEPS, state.cleaned + 1) };
    case 'column': return { ...state, column: true };
    case 'tooth': return { ...state, tooth: true };
    case 'reconstruct': return { ...state, reconstructed: !state.reconstructed };
    case 'measure': return { ...state, measured: true };
    case 'habitat': return { ...state, habitat: action.habitat };
  }
}

/** Where an age (Ma) falls on the time line, from 0 (its oldest end) to 1 (its youngest end). */
export function timelineAt(ma: number): number {
  const { from, to } = FOSSIL_TIMELINE;
  return Math.min(1, Math.max(0, (from - ma) / (from - to)));
}

/** The finds of the time line: found once any stop of their chapter was visited; current while on it. */
export function timelineFinds(state: Pick<FossilState, 'stop' | 'visited'>) {
  const current = FOSSIL_STOPS[state.stop].chapter;
  return FOSSIL_TIMELINE.finds.map((f) => ({
    ...f,
    found: FOSSIL_STOPS.some((s) => s.chapter === f.chapter && state.visited.includes(s.id)),
    current: f.chapter === current,
  }));
}

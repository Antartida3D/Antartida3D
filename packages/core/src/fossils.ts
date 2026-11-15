import { FOSSIL_STOPS, type FossilChapter, type FossilHabitat } from './content/fossils.ts';

export interface FossilState {
  stop: number;
  cleaned: number;
  /** Plesiosaur: the visitor followed the vertebral column. */
  column: boolean;
  tooth: boolean;
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
    return { ...state, stop: index, visited: state.visited.includes(id) ? state.visited : [...state.visited, id] };
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

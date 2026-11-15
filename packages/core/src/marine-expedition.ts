import { MARINE_STOPS, type MarineChapter, type MarineOrganism } from './content/marine.ts';

/** Océano (#8): where the visitor is in the tour and which optional observations they made. */
export interface MarineState {
  stop: number;
  /** The camera is under the sea ice (otherwise above it). */
  under: boolean;
  /** Microscopic producers drawn magnified. */
  magnified: boolean;
  /** The humpback filter sequence was watched. */
  filtered: boolean;
  /** The camera followed the minke among the floes. */
  followed: boolean;
  /** An emperor dive was followed down and back up to breathe. */
  dived: boolean;
  /** Baleen and teeth were compared side by side. */
  compared: boolean;
  /** The documented orca example was opened. */
  example: boolean;
  /** Organism selected in the food web, if any. */
  selected: MarineOrganism | null;
  /** Organisms whose links were looked at, without repeats. */
  traced: readonly MarineOrganism[];
  visited: readonly string[];
}

export type MarineAction =
  | { type: 'next' | 'prev' | 'surface' | 'magnify' | 'filter' | 'follow' | 'dive' | 'compare' | 'example' }
  | { type: 'chapter'; chapter: MarineChapter }
  | { type: 'select'; organism: MarineOrganism | null };

export const INITIAL_MARINE: MarineState = {
  stop: 0, under: false, magnified: false, filtered: false, followed: false, dived: false, compared: false,
  example: false, selected: null, traced: [], visited: [MARINE_STOPS[0].id],
};

/** The tour always opens above the ice, and the emperor chapter starts where it stands, on top. */
const STARTS_ABOVE = new Set(['ceiling', 'emperor-hunt']);

export function marineReducer(state: MarineState, action: MarineAction): MarineState {
  const go = (stop: number): MarineState => {
    const index = Math.max(0, Math.min(MARINE_STOPS.length - 1, stop));
    if (index === state.stop) return state;
    const id = MARINE_STOPS[index].id;
    return {
      ...state, stop: index, under: STARTS_ABOVE.has(id) ? false : state.under,
      visited: state.visited.includes(id) ? state.visited : [...state.visited, id],
    };
  };
  switch (action.type) {
    case 'next': return go(state.stop + 1);
    case 'prev': return go(state.stop - 1);
    case 'chapter': {
      const index = MARINE_STOPS.findIndex((s) => s.chapter === action.chapter);
      return index < 0 ? state : go(index);
    }
    case 'surface': return { ...state, under: !state.under };
    case 'magnify': return { ...state, magnified: !state.magnified };
    case 'filter': return { ...state, filtered: true };
    case 'follow': return { ...state, followed: !state.followed };
    case 'dive': return { ...state, dived: true };
    case 'compare': return { ...state, compared: !state.compared };
    case 'example': return { ...state, example: !state.example };
    case 'select': {
      const o = action.organism;
      const selected = o === state.selected ? null : o;
      return { ...state, selected, traced: !selected || state.traced.includes(selected) ? state.traced : [...state.traced, selected] };
    }
  }
}

/**
 * Whether a view is drawn under the water. Two stops let the visitor choose; the documented orca
 * example is seen from above, where the wave washes over the floe.
 */
export function isUnderwater(view: (typeof MARINE_STOPS)[number]['view'], state: Pick<MarineState, 'under' | 'example'>): boolean {
  if (view === 'ceiling' || view === 'emperor') return state.under;
  if (view === 'orcas') return !state.example;
  return view !== 'closing';
}

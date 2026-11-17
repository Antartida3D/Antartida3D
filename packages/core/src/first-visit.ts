/**
 * First visit (#256, #258): the loading card turns into «Mapa listo», then a three-step guide
 * points at real things on the map. Pure state machine; the app stores `antartida:intro` whenever a
 * transition says `markSeen`.
 *
 * `loading`: the loader is up. `ready`: the map is ready and the card waits for the person.
 * `guide1` pin, `guide2` registry, `guide3` orange button. `done`: nothing to show.
 */
export type FirstVisitState = 'loading' | 'ready' | 'guide1' | 'guide2' | 'guide3' | 'done';

export type FirstVisitEvent =
  /** The loader finished and this is a first visit. */
  | 'ready'
  /** «Exploración guiada» on the ready card. */
  | 'explore'
  /** «Sin guía», or Escape on the ready card. */
  | 'skip'
  /** «Siguiente» inside the guide. */
  | 'next'
  /** Escape, the browser's back button or «Saltar guía». */
  | 'close'
  /** A final action of the guide: «Explorar por mi cuenta» or the start of the suggested expedition. */
  | 'finish'
  /** The «?» button: the guide again, from the first step. */
  | 'open';

export interface FirstVisitResult {
  state: FirstVisitState;
  /** True when the person is leaving the flow: save `antartida:intro`. */
  markSeen: boolean;
}

const stay = (state: FirstVisitState): FirstVisitResult => ({ state, markSeen: false });
const leave: FirstVisitResult = { state: 'done', markSeen: true };

/**
 * `hasNext`: there is a suggested expedition. Without it (the six are done) the guide has no third
 * step, because the orange button is not there.
 */
export function firstVisitStep(state: FirstVisitState, event: FirstVisitEvent, hasNext = true): FirstVisitResult {
  if (event === 'open') return { state: 'guide1', markSeen: false };
  switch (state) {
    case 'loading':
      return event === 'ready' ? stay('ready') : stay(state);
    case 'ready':
      if (event === 'explore') return stay('guide1');
      return event === 'skip' || event === 'close' ? leave : stay(state);
    case 'guide1':
    case 'guide2':
    case 'guide3':
      if (event === 'close' || event === 'finish' || event === 'skip') return leave;
      if (event !== 'next') return stay(state);
      if (state === 'guide1') return stay('guide2');
      if (state === 'guide2') return hasNext ? stay('guide3') : leave;
      return leave;
    case 'done':
      return stay(state);
  }
}

export const isGuideOpen = (state: FirstVisitState): boolean => state === 'guide1' || state === 'guide2' || state === 'guide3';

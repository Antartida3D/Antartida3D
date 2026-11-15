/**
 * The screen of a diorama of Poncho (issue #146), without drawing and without a clock of its own:
 * which step of the tour it is at, what the panel shows at each, and how the screen opens and closes.
 *
 * A tour has one step per sentence of the stop's `essential` text (`essentialSentences`), and one
 * camera shot per step (`SceneShot`). Step `i` (0-based) shows sentences 0..i; the hook of the stop and
 * «Saber más» wait for the last step.
 */

/** The step after `step` (stays at the last) and the one before (stays at the first); `count` is the number of steps. */
export const nextStep = (step: number, count: number): number => clampStep(step + 1, count);
export const backStep = (step: number, count: number): number => clampStep(step - 1, count);

/** A step inside 0..count-1 (0 for a tour without steps). */
export function clampStep(step: number, count: number): number {
  if (!Number.isFinite(step) || count <= 0) return 0;
  return Math.min(count - 1, Math.max(0, Math.trunc(step)));
}

/** What the panel shows at a step. */
export interface DioramaView {
  /** The step, clamped. */
  readonly step: number;
  /** How many sentences are told: the first `shown`. */
  readonly shown: number;
  readonly first: boolean;
  readonly last: boolean;
  /** The hook of the stop and «Saber más» show only at the last step. */
  readonly showsHook: boolean;
  readonly showsMore: boolean;
}

export function dioramaView(step: number, count: number): DioramaView {
  const at = clampStep(step, count);
  const last = at === count - 1 || count <= 0;
  return { step: at, shown: count <= 0 ? 0 : at + 1, first: at === 0, last, showsHook: last, showsMore: last };
}

/** Phases of the screen: the fade in, the tour, the fade out and gone. */
export type DioramaPhase = 'entering' | 'inside' | 'leaving' | 'closed';

export interface DioramaFlow {
  readonly phase: DioramaPhase;
  /** The clock (ms, the caller's) when the phase began. */
  readonly since: number;
}

/** Length of the fade in and of the fade out, in ms. With reduced motion the screen cuts: no time at all. */
export const DIORAMA_ENTER_MS = 650;
export const DIORAMA_LEAVE_MS = 450;
const lengthOf = (phase: DioramaPhase, reduced: boolean): number | null =>
  phase === 'entering' ? (reduced ? 0 : DIORAMA_ENTER_MS) : phase === 'leaving' ? (reduced ? 0 : DIORAMA_LEAVE_MS) : null;

export const openDiorama = (now: number): DioramaFlow => ({ phase: 'entering', since: now });

/** Asks to leave: from the fade in or the tour it starts the fade out; once it is leaving or closed, nothing changes. */
export const leaveDiorama = (flow: DioramaFlow, now: number): DioramaFlow =>
  flow.phase === 'entering' || flow.phase === 'inside' ? { phase: 'leaving', since: now } : flow;

/** The flow after the clock reached `now`: a phase whose time is up gives way to the next one. */
export function tickDiorama(flow: DioramaFlow, now: number, reduced: boolean): DioramaFlow {
  let at = flow;
  for (;;) {
    const length = lengthOf(at.phase, reduced);
    if (length === null || now - at.since < length) return at;
    at = { phase: at.phase === 'entering' ? 'inside' : 'closed', since: at.since + length };
  }
}

/** Timers wake up a little before their time (the browser rounds them to whole ms): this much counts as time. */
export const DIORAMA_TIMER_SLACK_MS = 4;

/**
 * The flow once the timer of its phase fired. `tickDiorama` is exact and would leave the phase as it is
 * if the timer woke up a fraction of a ms early; then nothing would re-arm the timer and the screen
 * would stay in that phase for good (it hid the map after «Seguir con Poncho»).
 */
export const timerFiredDiorama = (flow: DioramaFlow, now: number, reduced: boolean): DioramaFlow =>
  tickDiorama(flow, now + DIORAMA_TIMER_SLACK_MS, reduced);

/** Ms until the phase changes by itself (0 if it is time), or null if it only changes on request (inside, closed). */
export function dioramaRemaining(flow: DioramaFlow, now: number, reduced: boolean): number | null {
  const length = lengthOf(flow.phase, reduced);
  return length === null ? null : Math.max(0, flow.since + length - now);
}

/** Opacity of the screen, 0..1: it rises while entering, stays inside and falls while leaving. */
export function dioramaOpacity(flow: DioramaFlow, now: number, reduced: boolean): number {
  const length = lengthOf(flow.phase, reduced);
  const u = length === null ? 1 : length === 0 ? 1 : Math.min(1, Math.max(0, (now - flow.since) / length));
  switch (flow.phase) {
    case 'entering':
      return u;
    case 'inside':
      return 1;
    case 'leaving':
      return reduced ? 0 : 1 - u;
    case 'closed':
      return 0;
  }
}

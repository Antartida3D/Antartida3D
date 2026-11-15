// How the visitor arrives at Orcadas station (#135). Pure logic, no rendering.

import { prefersReducedMotion } from './motion.ts';
import { helicopterOnPad } from './orcadas.ts';
import { clamp01, smooth01 } from './voyage.ts';

/** Transport chosen in the Orcadas intro panel. */
export type ArrivalId = 'ship' | 'helicopter';

/** Duration of the diorama arrival animation, in seconds. */
export const ARRIVAL_SECONDS = 6;

/** Short duration of the diorama departure animation when leaving Orcadas, in seconds. */
export const DEPARTURE_SECONDS = 1.8;

const MONTHS_IN_YEAR = 12;

/** Visit season months (1..12), derived from `helicopterOnPad` as the single source of truth. */
const VISIT_SEASON_MONTHS: readonly number[] = Array.from(
  { length: MONTHS_IN_YEAR },
  (_, i) => i + 1
).filter(helicopterOnPad);

/** Default relative start offset (diorama units) for the Zodiac approaching from Bahía Scotia (+z). */
const ZODIAC_START_OFFSET: ArrivalPoint = { x: 0, z: 8, height: -0.15, heading: 0 };

/** Default relative start offset (diorama units) for the helicopter descending over Bahía Scotia. */
const HELI_START_OFFSET: ArrivalPoint = {
  x: -3.5,
  z: 10.5,
  height: 5.2,
  heading: Math.atan2(10.5, 3.5),
};

function normalizeMonth(month: number): number {
  const m = Math.trunc(month);
  return ((((m - 1) % MONTHS_IN_YEAR) + MONTHS_IN_YEAR) % MONTHS_IN_YEAR) + 1;
}

function resolveMonth(today: Date | number): number {
  if (today instanceof Date) {
    const time = today.getTime();
    return Number.isFinite(time) ? today.getMonth() + 1 : VISIT_SEASON_MONTHS[0];
  }
  return Number.isFinite(today) ? normalizeMonth(today) : VISIT_SEASON_MONTHS[0];
}

function shortestAngle(from: number, to: number): number {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

function circularMonthDistance(a: number, b: number): number {
  const diff = Math.abs(a - b);
  return Math.min(diff, MONTHS_IN_YEAR - diff);
}

/**
 * Closest visit-season month (1..12, November to March via `helicopterOnPad`) to `today`,
 * or `today`'s month if it is already in season.
 *
 * Accepts a `Date` or a 1..12 month number (matching `orcadas.ts`; out-of-range numbers wrap
 * modulo 12). On an exact tie — July (month 7), 4 months from both March and November — picks
 * the upcoming season moving forward in the calendar (November, 11).
 */
export function arrivalMonth(_arrival: ArrivalId, today: Date | number = new Date()): number {
  const current = resolveMonth(today);
  if (helicopterOnPad(current)) return current;

  let best = VISIT_SEASON_MONTHS[0];
  let bestDist = Infinity;
  let bestForward = Infinity;

  for (const candidate of VISIT_SEASON_MONTHS) {
    const dist = circularMonthDistance(current, candidate);
    const forward = (candidate - current + MONTHS_IN_YEAR) % MONTHS_IN_YEAR;
    if (dist < bestDist || (dist === bestDist && forward < bestForward)) {
      best = candidate;
      bestDist = dist;
      bestForward = forward;
    }
  }

  return best;
}

export interface ArrivalScene {
  /** Normalized scene month (1..12). */
  month: number;
  /** Transport arriving dynamically during the entrance. */
  arriving: ArrivalId;
  /** Other transport already resting in place, or null when absent in `month`. */
  stationary: ArrivalId | null;
  /** Whether a helicopter is present on the helipad (always true when helicopter is arriving). */
  helicopterOnPad: boolean;
}

/**
 * Describes which transport arrives, which stays resting in place, and whether the helipad
 * holds a helicopter for `month` (1..12). When `arrival` is `'helicopter'`, the helicopter
 * is always present because arrival occurs in visit season.
 */
export function arrivalScene(arrival: ArrivalId, month: number): ArrivalScene {
  const m = normalizeMonth(month);
  const onPad = arrival === 'helicopter' || helicopterOnPad(m);
  const stationary: ArrivalId | null =
    arrival === 'helicopter' ? 'ship' : onPad ? 'helicopter' : null;
  return {
    month: m,
    arriving: arrival,
    stationary,
    helicopterOnPad: onPad,
  };
}

export interface ArrivalPoint {
  /** Horizontal x offset in diorama units. */
  x: number;
  /** Horizontal z offset in diorama units. */
  z: number;
  /** Vertical height in diorama units. */
  height: number;
  /** Heading around +y in radians. */
  heading: number;
}

export interface ArrivalPose extends ArrivalPoint {
  /** Normalized remaining speed factor in [0, 1] (0 at rest). */
  speed: number;
}

export interface ArrivalCurveOptions {
  /** Starting pose; defaults to `to` plus the transport's default relative offset. */
  from?: Partial<ArrivalPoint>;
  /** Final resting pose; defaults to `{ x: 0, z: 0, height: 0, heading: 0 }`. */
  to?: Partial<ArrivalPoint>;
  /** Duration in seconds; defaults to `ARRIVAL_SECONDS`. */
  duration?: number;
  /** When true (or when `prefersReducedMotion()` holds if omitted), jumps directly to `to`. */
  reduced?: boolean;
}

function resolveEndpoints(
  defaultOffset: ArrivalPoint,
  options?: ArrivalCurveOptions,
  defaultDuration = ARRIVAL_SECONDS
): { from: ArrivalPoint; to: ArrivalPoint; duration: number; reduced: boolean } {
  const to: ArrivalPoint = {
    x: options?.to?.x ?? 0,
    z: options?.to?.z ?? 0,
    height: options?.to?.height ?? 0,
    heading: options?.to?.heading ?? 0,
  };
  const from: ArrivalPoint = {
    x: options?.from?.x ?? to.x + defaultOffset.x,
    z: options?.from?.z ?? to.z + defaultOffset.z,
    height: options?.from?.height ?? to.height + defaultOffset.height,
    heading: options?.from?.heading ?? to.heading + defaultOffset.heading,
  };
  return {
    from,
    to,
    duration: options?.duration ?? defaultDuration,
    reduced: options?.reduced ?? prefersReducedMotion(),
  };
}

function normalizeTime(t: number, duration: number): number {
  if (!Number.isFinite(t) || duration <= 0) return t > 0 ? 1 : 0;
  return clamp01(t / duration);
}

/** Returns the resting final pose with zero speed, used when arrival ends or motion is reduced. */
export function arrivalFinalPose(to?: Partial<ArrivalPoint>): ArrivalPose {
  return {
    x: to?.x ?? 0,
    z: to?.z ?? 0,
    height: to?.height ?? 0,
    heading: to?.heading ?? 0,
    speed: 0,
  };
}

/**
 * Zodiac approach curve from Bahía Scotia to the gravel beach, parameterized by `t` in seconds
 * (`0` to `ARRIVAL_SECONDS`). Returns pose relative to `{ x: 0, z: 0, height: 0, heading: 0 }`
 * unless `options.from`/`options.to` are provided, reaching the exact final pose with `speed: 0`
 * at `t >= duration` (or immediately when reduced motion is active).
 */
export function zodiacApproach(t: number, options?: ArrivalCurveOptions): ArrivalPose {
  const { from, to, duration, reduced } = resolveEndpoints(ZODIAC_START_OFFSET, options);
  const u = normalizeTime(t, duration);
  if (reduced || duration <= 0 || u >= 1) {
    return arrivalFinalPose(to);
  }

  const ease = 1 - (1 - u) ** 2.3;
  const climb = smooth01((u - 0.68) / 0.32);
  const turn = smooth01(u);

  return {
    x: from.x + (to.x - from.x) * ease,
    z: from.z + (to.z - from.z) * ease,
    height: from.height + (to.height - from.height) * climb,
    heading: from.heading + shortestAngle(from.heading, to.heading) * turn,
    speed: (1 - u) ** 1.3,
  };
}

/**
 * Helicopter landing curve descending onto the helipad, parameterized by `t` in seconds
 * (`0` to `ARRIVAL_SECONDS`). Returns pose relative to `{ x: 0, z: 0, height: 0, heading: 0 }`
 * unless `options.from`/`options.to` are provided, reaching the exact final pose with `speed: 0`
 * at `t >= duration` (or immediately when reduced motion is active).
 */
export function helicopterLanding(t: number, options?: ArrivalCurveOptions): ArrivalPose {
  const { from, to, duration, reduced } = resolveEndpoints(HELI_START_OFFSET, options);
  const u = normalizeTime(t, duration);
  if (reduced || duration <= 0 || u >= 1) {
    return arrivalFinalPose(to);
  }

  const horiz = 1 - (1 - u) ** 2.2;
  const vert = smooth01(u);

  return {
    x: from.x + (to.x - from.x) * horiz,
    z: from.z + (to.z - from.z) * horiz,
    height: from.height + (to.height - from.height) * vert,
    heading: from.heading + shortestAngle(from.heading, to.heading) * vert,
    speed: (1 - u) ** 1.2,
  };
}

const ZODIAC_UNBEACH_END = 0.16;
const ZODIAC_TURN_END = 0.48;
const ZODIAC_UNBEACH_FRAC = 0.1;

const HELI_LIFTOFF_END = 0.24;
const HELI_TURN_END = 0.52;
const HELI_HOVER_CLIMB_FRAC = 0.22;

function departureHeading(from: ArrivalPoint, to: ArrivalPoint): number {
  const dx = from.x - to.x;
  const dz = from.z - to.z;
  if (Math.hypot(dx, dz) < 1e-6) return to.heading + Math.PI;
  return Math.atan2(-dz, dx);
}

function departureEndpoints(
  defaultOffset: ArrivalPoint,
  options?: ArrivalCurveOptions
): { from: ArrivalPoint; to: ArrivalPoint; duration: number; reduced: boolean; outHeading: number } {
  const endpoints = resolveEndpoints(defaultOffset, options, DEPARTURE_SECONDS);
  const outHeading =
    endpoints.to.heading +
    shortestAngle(endpoints.to.heading, departureHeading(endpoints.from, endpoints.to));
  return { ...endpoints, outHeading };
}

function departureBoundary(
  u: number,
  duration: number,
  reduced: boolean,
  from: ArrivalPoint,
  to: ArrivalPoint,
  outHeading: number
): ArrivalPose | null {
  if (reduced || duration <= 0) return arrivalFinalPose({ ...from, heading: outHeading });
  if (u <= 0) return arrivalFinalPose(to);
  if (u >= 1) return { x: from.x, z: from.z, height: from.height, heading: outHeading, speed: 1 };
  return null;
}

/**
 * Zodiac departure curve from the beach resting pose (`to`) back into Bahía Scotia (`from`),
 * parameterized by `t` in seconds (`0` to `DEPARTURE_SECONDS`): short unbeach, in-place turn
 * toward the bay via the shortest angular path, then forward acceleration out into the bay.
 */
export function zodiacDeparture(t: number, options?: ArrivalCurveOptions): ArrivalPose {
  const { from, to, duration, reduced, outHeading } = departureEndpoints(
    ZODIAC_START_OFFSET,
    options
  );
  const u = normalizeTime(t, duration);
  const boundary = departureBoundary(u, duration, reduced, from, to, outHeading);
  if (boundary) return boundary;

  if (u <= ZODIAC_UNBEACH_END) {
    const p = smooth01(u / ZODIAC_UNBEACH_END);
    const progress = ZODIAC_UNBEACH_FRAC * p;
    return {
      x: to.x + (from.x - to.x) * progress,
      z: to.z + (from.z - to.z) * progress,
      height: to.height + (from.height - to.height) * p,
      heading: to.heading,
      speed: 0,
    };
  }

  if (u <= ZODIAC_TURN_END) {
    const turn = smooth01((u - ZODIAC_UNBEACH_END) / (ZODIAC_TURN_END - ZODIAC_UNBEACH_END));
    return {
      x: to.x + (from.x - to.x) * ZODIAC_UNBEACH_FRAC,
      z: to.z + (from.z - to.z) * ZODIAC_UNBEACH_FRAC,
      height: from.height,
      heading: to.heading + (outHeading - to.heading) * turn,
      speed: 0,
    };
  }

  const s = (u - ZODIAC_TURN_END) / (1 - ZODIAC_TURN_END);
  const progress = ZODIAC_UNBEACH_FRAC + (1 - ZODIAC_UNBEACH_FRAC) * s ** 1.8;
  return {
    x: to.x + (from.x - to.x) * progress,
    z: to.z + (from.z - to.z) * progress,
    height: from.height,
    heading: outHeading,
    speed: smooth01(s / 0.35),
  };
}

/**
 * Helicopter departure curve lifting off from the helipad (`to`), turning in the air toward the
 * departure heading via the shortest angular path, then accelerating forward and climbing out to `from`.
 */
export function helicopterDeparture(t: number, options?: ArrivalCurveOptions): ArrivalPose {
  const { from, to, duration, reduced, outHeading } = departureEndpoints(
    HELI_START_OFFSET,
    options
  );
  const u = normalizeTime(t, duration);
  const boundary = departureBoundary(u, duration, reduced, from, to, outHeading);
  if (boundary) return boundary;

  if (u <= HELI_LIFTOFF_END) {
    const lift = smooth01(u / HELI_LIFTOFF_END);
    return {
      x: to.x,
      z: to.z,
      height: to.height + (from.height - to.height) * (HELI_HOVER_CLIMB_FRAC * lift),
      heading: to.heading,
      speed: 0,
    };
  }

  if (u <= HELI_TURN_END) {
    const turn = smooth01((u - HELI_LIFTOFF_END) / (HELI_TURN_END - HELI_LIFTOFF_END));
    return {
      x: to.x,
      z: to.z,
      height: to.height + (from.height - to.height) * HELI_HOVER_CLIMB_FRAC,
      heading: to.heading + (outHeading - to.heading) * turn,
      speed: 0,
    };
  }

  const s = (u - HELI_TURN_END) / (1 - HELI_TURN_END);
  const horiz = s ** 1.7;
  const climb = HELI_HOVER_CLIMB_FRAC + (1 - HELI_HOVER_CLIMB_FRAC) * s ** 1.3;
  return {
    x: to.x + (from.x - to.x) * horiz,
    z: to.z + (from.z - to.z) * horiz,
    height: to.height + (from.height - to.height) * climb,
    heading: outHeading,
    speed: smooth01(s / 0.35),
  };
}

import {
  EXPEDITION, MILESTONES, SIGHTINGS, TRANSPORTS,
  type Milestone, type Sighting, type Transport, type TransportId, type TransportKind, type VehicleKind, type VoyageFact, type VoyageQuestion,
} from './content/ushuaia.ts';
import { PONCHO_EXPEDITION, PONCHO_MILESTONES, PONCHO_SEGMENTS, PONCHO_TRANSPORT } from './content/poncho.ts';
import { FLIGHT_GROUND_M } from './flight-ground.ts';
import { FLIGHT_GROUND_STEP, flightAt } from './flight-path.ts';
import { fuegiaWorldHeight } from './fuegia.ts';
import { project, unproject } from './projection.ts';
import { worldHeight } from './relief.ts';
import { ROUTE_LENGTH, buildCurve, routeAt } from './route.ts';
import { stormCeiling } from './storm.ts';
import { heightAt, type TerrainMesh } from './terrain.ts';

type Point = { x: number; y: number };

/** The transports of every trip: the ones of Ushuaia and the team of Poncho. */
const ALL_TRANSPORTS: readonly Transport[] = [...TRANSPORTS, PONCHO_TRANSPORT];
export const findTransport = (id: TransportId): Transport => ALL_TRANSPORTS.find((v) => v.id === id)!;
const ALL_EXPEDITION = { ...EXPEDITION, ...PONCHO_EXPEDITION };

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const smooth01 = (v: number) => {
  const c = clamp01(v);
  return c * c * (3 - 2 * c);
};

/** Clear air kept over the relief, in world units: less over Tierra del Fuego, drawn at x10, than over Antarctica, at x50. */
const FUEGIA_MARGIN = 0.6;
const ANTARCTIC_MARGIN = 1.5;
/** Trip fraction over which the plane leaves the ground and comes back to it (about 15 km). */
const FLIGHT_WINDOW = 0.012;
/** Trip fraction of relief looked at ahead and behind (about 37 km): the wider, the gentler the climbs. */
const FLIGHT_LOOK = 0.03;
/** Map units looked at to each side of the path over Antarctica: the drawn plane is much wider than a real one. */
const FLIGHT_SIDES = [-2.5, -1.25, 0, 1.25, 2.5];

/**
 * Cruise height: 10,000 ft (3048 m) at the x10 exaggeration of the regional relief, reached with a
 * long steady climb. ILLUSTRATIVE: not a real flight level of the C-130.
 */
export const FLIGHT_CRUISE = fuegiaWorldHeight(3048);
const CLIMB_SPAN = 0.25;
const DESCENT_SPAN = 0.08;

/** Land under and beside the path over Tierra del Fuego (baked from IBCSO), in world units. */
function fuegiaGround(t: number): number {
  const at = t / FLIGHT_GROUND_STEP;
  const i = Math.floor(at);
  const a = FLIGHT_GROUND_M[i] ?? 0;
  const b = FLIGHT_GROUND_M[i + 1] ?? 0;
  // Never below either neighbouring sample.
  return fuegiaWorldHeight(at === i ? a : Math.max(a, b));
}

/** Height that clears the ground under and beside the flight path within FLIGHT_LOOK of `at`, in world units. */
function clearEnvelope(at: number, mesh?: TerrainMesh): number {
  let top = 0;
  for (let k = -8; k <= 8; k++) {
    const u = clamp01(at + (k * FLIGHT_LOOK) / 8);
    const fuegia = fuegiaGround(u);
    if (fuegia > 0) top = Math.max(top, fuegia + FUEGIA_MARGIN);
    const p = flightAt(u);
    const heading = voyageHeading('plane', u);
    for (const side of FLIGHT_SIDES) {
      const ground = worldHeight(heightAt(p.x - Math.sin(heading) * side, p.y + Math.cos(heading) * side, mesh));
      if (ground > 0) top = Math.max(top, ground + ANTARCTIC_MARGIN);
    }
  }
  return top;
}

/**
 * World height of the flight at fraction `t`. The plane climbs only as much as it needs to pass
 * over the relief under and beside its path, keeps climbing steadily to FLIGHT_CRUISE, and comes
 * down to the Marambio plateau, rising again over the Antarctic relief on the way. The clearance is
 * averaged over a span no wider than its own window, so the line is smooth and still never goes
 * below the ground, and it passes over the storm of the Drake. ILLUSTRATIVE: not a real flight profile.
 */
export function flightClearance(t: number, mesh?: TerrainMesh): number {
  const at = clamp01(t);
  let clear = 0;
  for (let k = -3; k <= 3; k++) clear += clearEnvelope(clamp01(at + (k * FLIGHT_LOOK) / 3), mesh) / 7;
  const cruise = FLIGHT_CRUISE * Math.min(smooth01(at / CLIMB_SPAN), smooth01((1 - at) / DESCENT_SPAN));
  const end = flightAt(1);
  const runway = at < 0.5 ? 0 : worldHeight(heightAt(end.x, end.y, mesh));
  const airborne = Math.min(smooth01(at / FLIGHT_WINDOW), smooth01((1 - at) / FLIGHT_WINDOW));
  // Over the storm of the Drake the plane flies above the clouds, not through them.
  const over = flightAt(at);
  return runway + (Math.max(clear, cruise, stormCeiling(over.x, over.y)) - runway) * airborne;
}

/**
 * A ship starts its trip this many map units (about 10 km) into the sea route, out in the bay:
 * Ushuaia is drawn where the route begins, and a ship waiting there would cover it. The route
 * itself keeps its two ends.
 */
export const SHIP_HEAD_START = 1.3;
const SHIP_START = SHIP_HEAD_START / ROUTE_LENGTH;

/** A leg of a trip as the engine walks it: a vehicle along a path, for some seconds of steady advance. */
export interface TripLeg {
  vehicle: VehicleKind;
  /** Position in map space at fraction `u` (0..1) of the leg. */
  at: (u: number) => Point;
  seconds: number;
}

export interface Trip {
  /** Seconds of steady advance along the whole trip. */
  seconds: number;
  legCount: number;
  /** Position in map space at fraction `t` of the trip. A leg takes the share of the trip that its seconds are of the total. */
  at: (t: number) => Point;
  /** Vehicle of the leg that `t` falls in. */
  vehicleAt: (t: number) => VehicleKind;
  /** Fractions of the trip where a leg starts and ends. */
  legRange: (leg: number) => readonly [from: number, to: number];
}

/** Joins legs into one trip. The end of a leg must be the start of the next one: the vehicle changes at a port, it does not jump. */
export function buildTrip(legs: readonly TripLeg[]): Trip {
  const seconds = legs.reduce((sum, leg) => sum + leg.seconds, 0);
  const starts = legs.map((_, i) => legs.slice(0, i).reduce((sum, leg) => sum + leg.seconds, 0) / seconds);
  const locate = (t: number) => {
    const at = clamp01(t);
    let i = legs.length - 1;
    while (i > 0 && at < starts[i]) i--;
    const span = legs[i].seconds / seconds;
    return { i, u: clamp01((at - starts[i]) / span) };
  };
  return {
    seconds,
    legCount: legs.length,
    at: (t) => {
      const { i, u } = locate(t);
      return legs[i].at(u);
    },
    vehicleAt: (t) => legs[locate(t).i].vehicle,
    legRange: (leg) => [starts[leg], leg + 1 < legs.length ? starts[leg + 1] : 1],
  };
}

/** The ship leaves Ushuaia a little into the sea route (see SHIP_HEAD_START); the plane flies the great circle. */
const TRIPS: Record<TransportKind, Trip> = {
  ship: buildTrip([{ vehicle: 'ship', seconds: 48, at: (u) => routeAt(SHIP_START + u * (1 - SHIP_START)) }]),
  plane: buildTrip([{ vehicle: 'plane', seconds: 30, at: flightAt }]),
  // The dogs: one curve per leg, drawn with the same curve as the sea route.
  dogs: buildTrip(
    PONCHO_SEGMENTS.map((leg) => ({
      vehicle: leg.vehicle,
      seconds: leg.seconds,
      at: buildCurve(leg.waypoints.map(([lon, lat]) => project(lon, lat))).at,
    })),
  ),
};

/** Position in map space at fraction `t` of the trip (0 = departure, 1 = arrival: Ushuaia to Marambio, or the story of the dogs). */
export const voyageAt = (kind: TransportKind, t: number): Point => TRIPS[kind].at(t);

/** What is drawn at fraction `t` of the trip: a trip of the dogs changes vehicle with its legs. */
export const vehicleAt = (kind: TransportKind, t: number): VehicleKind => TRIPS[kind].vehicleAt(t);

const PATH_SAMPLES = 400;
const pathLength = (kind: TransportKind) => {
  let total = 0;
  for (let i = 1; i <= PATH_SAMPLES; i++) {
    const a = voyageAt(kind, (i - 1) / PATH_SAMPLES);
    const b = voyageAt(kind, i / PATH_SAMPLES);
    total += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return total;
};
const LENGTHS: Record<TransportKind, number> = { ship: pathLength('ship'), plane: pathLength('plane'), dogs: pathLength('dogs') };

/** Length of the whole trip in map units. */
export const voyageLength = (kind: TransportKind) => LENGTHS[kind];

const EARTH_RADIUS_KM = 6371;
const RAD = Math.PI / 180;
/** Great-circle distance in km between two points of the map space. */
const groundKm = (a: Point, b: Point) => {
  const from = unproject(a.x, a.y);
  const to = unproject(b.x, b.y);
  const h =
    Math.sin(((to.lat - from.lat) * RAD) / 2) ** 2 +
    Math.cos(from.lat * RAD) * Math.cos(to.lat * RAD) * Math.sin(((to.lon - from.lon) * RAD) / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
};
/** Km travelled at each sample of the path. Map units would not do: the projection stretches them with latitude. */
const pathKm = (kind: TransportKind) => {
  const km = [0];
  for (let i = 1; i <= PATH_SAMPLES; i++) {
    km.push(km[i - 1] + groundKm(voyageAt(kind, (i - 1) / PATH_SAMPLES), voyageAt(kind, i / PATH_SAMPLES)));
  }
  return km;
};
const KM: Record<TransportKind, readonly number[]> = { ship: pathKm('ship'), plane: pathKm('plane'), dogs: pathKm('dogs') };

export interface VoyageProgress {
  /** Km travelled along the drawn path. */
  km: number;
  /** Km of the whole trip. */
  totalKm: number;
  /** Hours it takes to travel `km` at the cruise speed of the transport, without stops. */
  hours: number;
}

/**
 * Distance and time travelled at fraction `t` of the trip. An estimate, not a logged trip: the
 * path is the drawn one and the speed is the cruise speed of the transport.
 */
export function voyageProgress(transport: TransportId, t: number): VoyageProgress {
  const { kind, cruiseKmh } = findTransport(transport);
  const at = clamp01(t) * PATH_SAMPLES;
  const i = Math.min(PATH_SAMPLES - 1, Math.floor(at));
  const km = KM[kind][i] + (KM[kind][i + 1] - KM[kind][i]) * (at - i);
  return { km, totalKm: KM[kind][PATH_SAMPLES], hours: km / cruiseKmh };
}

/** Direction of travel at `t` in map space, as an angle from +x towards +y (radians). */
export function voyageHeading(kind: TransportKind, t: number): number {
  const step = 0.002;
  const from = voyageAt(kind, Math.max(0, clamp01(t) - step));
  const to = voyageAt(kind, Math.min(1, clamp01(t) + step));
  return Math.atan2(to.y - from.y, to.x - from.x);
}

export interface VoyageStop {
  milestone: Milestone;
  /** Fraction of the trip where the milestone opens. */
  t: number;
  /** Where its pin stands, in map space: the place of the milestone if it has one, else the point of the path. */
  pin: Point;
}

const STOP_SAMPLES = 800;

function buildStops(kind: TransportKind): VoyageStop[] {
  const samples = Array.from({ length: STOP_SAMPLES + 1 }, (_, i) => voyageAt(kind, i / STOP_SAMPLES));
  const stops = [...MILESTONES, ...PONCHO_MILESTONES].filter((m) => m.kinds.includes(kind)).map((milestone) => {
    const { anchor } = milestone;
    // A milestone of a leg looks for its place only along that leg.
    const [from, to] = milestone.segment === undefined ? [0, 1] : TRIPS[kind].legRange(milestone.segment);
    const lo = Math.floor(from * STOP_SAMPLES);
    const hi = Math.ceil(to * STOP_SAMPLES);
    let index: number;
    if ('lat' in anchor) {
      index = samples.findIndex((p, i) => i >= lo && i <= hi && unproject(p.x, p.y).lat <= anchor.lat);
      if (index < 0) index = hi;
    } else {
      const target = project(anchor[0], anchor[1]);
      const gap = (i: number) => Math.hypot(samples[i].x - target.x, samples[i].y - target.y);
      index = lo;
      for (let i = lo + 1; i <= hi; i++) if (gap(i) < gap(index)) index = i;
    }
    const pin = milestone.place ? project(milestone.place[0], milestone.place[1]) : samples[index];
    return { milestone, t: index / STOP_SAMPLES, pin: { x: pin.x, y: pin.y } };
  });
  return stops;
}

const STOPS: Record<TransportKind, VoyageStop[]> = { ship: buildStops('ship'), plane: buildStops('plane'), dogs: buildStops('dogs') };

/** Milestones a transport passes, in trip order, with the fraction where each one opens. */
export function voyageStops(kind: TransportKind): readonly VoyageStop[] {
  return STOPS[kind];
}

/** Trip fraction during which a sighting can be spotted (about 3.5 s of steady advance at normal speed). */
export const SIGHTING_WINDOW = 0.07;
export const SIGHTING_WINDOW_BRIEF = 0.03;
/** A sighting whose window opens within this fraction of the trip is in view from the departure. */
export const SIGHTING_AT_DEPARTURE = 0.03;

export interface SightingSpot {
  sighting: Sighting;
  /** The animal is in view while the trip fraction is between these. Measured in progress, not time: pausing does not lose it. */
  from: number;
  to: number;
  /** Where it is drawn, in map space. */
  x: number;
  y: number;
}

/** Sightings of the sea trip (animals and places) with their windows and positions, in trip order. A plane sees none. */
const SPOTS: SightingSpot[] = SIGHTINGS.map((sighting) => {
  const target = project(sighting.anchor[0], sighting.anchor[1]);
  let at = 0;
  let best = Infinity;
  for (let i = 0; i <= STOP_SAMPLES; i++) {
    const p = voyageAt('ship', i / STOP_SAMPLES);
    const d = Math.hypot(p.x - target.x, p.y - target.y);
    if (d < best) [best, at] = [d, i / STOP_SAMPLES];
  }
  const p = voyageAt('ship', at);
  const heading = voyageHeading('ship', at);
  const half = (sighting.brief ? SIGHTING_WINDOW_BRIEF : SIGHTING_WINDOW) / 2;
  return {
    sighting,
    // What is close to the departure is already there when the trip starts, not popping in a moment later.
    from: at - half <= SIGHTING_AT_DEPARTURE ? 0 : at - half,
    to: Math.min(0.996, at + half),
    // An animal goes beside the route; a place stays where it is.
    ...(sighting.place
      ? project(sighting.place[0], sighting.place[1])
      : { x: p.x - Math.sin(heading) * sighting.offset, y: p.y + Math.cos(heading) * sighting.offset }),
  };
});

export function voyageSightings(kind: TransportKind): readonly SightingSpot[] {
  return kind === 'ship' ? SPOTS : [];
}

/** Sightings in view at fraction `t`, spotted or not. */
export function sightingsInView(kind: TransportKind, t: number): SightingSpot[] {
  return voyageSightings(kind).filter((s) => t >= s.from && t <= s.to);
}

const kindOf = (transport: TransportId) => findTransport(transport).kind;

/**
 * «Así funciona la expedición» at a milestone for the chosen transport: only the notes that hold
 * for it (nothing about the icebreaker on the plane), and the question if it is asked on it.
 */
export function expeditionAt(milestoneId: string, transport: TransportId): { notes: VoyageFact[]; question: VoyageQuestion | null } {
  const stop = ALL_EXPEDITION[milestoneId];
  const kind = kindOf(transport);
  const notes = (stop?.notes ?? [])
    .filter((n) => (!n.kind || n.kind === kind) && (!n.only || n.only === transport))
    .map((n) => n.fact);
  const question = stop?.question && (!stop.question.kind || stop.question.kind === kind) ? stop.question : null;
  return { notes, question };
}

/** How many questions of the trip were answered right. `answers` holds the option chosen at each milestone id. */
export function quizScore(transport: TransportId, answers: Readonly<Record<string, number>>): { right: number; total: number } {
  const asked = voyageStops(kindOf(transport))
    .map((stop) => ({ id: stop.milestone.id, question: expeditionAt(stop.milestone.id, transport).question }))
    .filter((q) => q.question);
  return { right: asked.filter((q) => answers[q.id] === q.question!.answer).length, total: asked.length };
}

/** Seconds the whole trip takes while the user keeps advancing. Not a real duration. */
export const VOYAGE_SECONDS: Record<TransportKind, number> = { ship: TRIPS.ship.seconds, plane: TRIPS.plane.seconds, dogs: TRIPS.dogs.seconds };

/**
 * Speed multipliers of "advance". Pressing again right after the previous press shifts up one
 * gear, for whoever is in a hurry; a slower press goes back to the first.
 */
export const VOYAGE_GEARS = [1, 2, 3.5] as const;
export const GEAR_TAP_MS = 450;

/** Gear (index into VOYAGE_GEARS) for a press that comes `msSincePress` after the previous one. */
export function nextGear(gear: number, msSincePress: number): number {
  return msSincePress <= GEAR_TAP_MS ? Math.min(VOYAGE_GEARS.length - 1, gear + 1) : 0;
}

export interface VoyageState {
  transport: TransportId;
  kind: TransportKind;
  /** Fraction of the trip travelled. */
  t: number;
  /** Stops already opened (index into voyageStops). */
  reached: number;
  /** Index of the stop whose card is open, or -1. The trip does not advance while a card is open. */
  card: number;
}

export function startVoyage(transport: TransportId): VoyageState {
  const kind = findTransport(transport).kind;
  // The first milestone is the departure: its card opens right away.
  return { transport, kind, t: 0, reached: 1, card: 0 };
}

export const voyageArrived = (s: VoyageState) => s.reached >= voyageStops(s.kind).length;

/**
 * Advances the trip by `seconds` of the user holding "advance". Stops exactly at the next
 * milestone and opens its card, so the user sets the pace and never skips one.
 */
export function advanceVoyage(s: VoyageState, seconds: number): VoyageState {
  if (s.card >= 0 || voyageArrived(s) || seconds <= 0) return s;
  const next = voyageStops(s.kind)[s.reached];
  const t = s.t + seconds / VOYAGE_SECONDS[s.kind];
  if (t < next.t) return { ...s, t };
  return { ...s, t: next.t, reached: s.reached + 1, card: s.reached };
}

/**
 * Goes back along the trip by `seconds` of the user holding "go back", to look again at something
 * missed. Milestones already opened stay opened: going forward again does not repeat their cards.
 */
export function retreatVoyage(s: VoyageState, seconds: number): VoyageState {
  if (s.card >= 0 || s.t <= 0 || seconds <= 0) return s;
  return { ...s, t: Math.max(0, s.t - seconds / VOYAGE_SECONDS[s.kind]) };
}

/** Jumps to the next milestone: the step-by-step trip for reduced motion and the 2D map. */
export function skipToNextStop(s: VoyageState): VoyageState {
  if (s.card >= 0 || voyageArrived(s)) return s;
  return { ...s, t: voyageStops(s.kind)[s.reached].t, reached: s.reached + 1, card: s.reached };
}

export function closeVoyageCard(s: VoyageState): VoyageState {
  return s.card < 0 ? s : { ...s, card: -1 };
}

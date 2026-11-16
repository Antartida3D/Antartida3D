import { toWorld } from './camera.ts';
import { ORCADAS_POINT } from './content/points.ts';
import {
  EXPEDITION, MILESTONES, SIGHTINGS, TRANSPORTS, VOYAGE_SOURCE_CODES,
  type Milestone, type Sighting, type Transport, type TransportId, type TransportKind, type VehicleKind, type VoyageFact, type VoyageQuestion, type VoyageSourceCode,
} from './content/ushuaia.ts';
import { PONCHO_MILESTONES, PONCHO_TRANSPORT } from './content/poncho.ts';
import { PONCHO_SEGMENTS } from './content/poncho-route.ts';
import { FLIGHT_GROUND_M } from './flight-ground.ts';
import { FLIGHT_GROUND_STEP, flightAt } from './flight-path.ts';
import { fuegiaWorldHeight } from './fuegia.ts';
import type { ArrivalId } from './orcadas-arrival.ts';
import { project, unproject } from './projection.ts';
import { worldHeight } from './relief.ts';
import { ROUTE_LENGTH, buildCurve, routeAt } from './route.ts';
import { stormCeiling } from './storm.ts';
import { heightAt, type TerrainMesh } from './terrain.ts';

type Point = { x: number; y: number };

/** The transports of every trip: the ones of Ushuaia and the team of Poncho. */
const ALL_TRANSPORTS: readonly Transport[] = [...TRANSPORTS, PONCHO_TRANSPORT];
export const findTransport = (id: TransportId): Transport => ALL_TRANSPORTS.find((v) => v.id === id)!;

export const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
/** Smoothstep on [0, 1], clamped. */
export const smooth01 = (v: number) => {
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
 * Cruise height: 10,000 ft (3048 m) at the exaggeration of the regional relief, reached with a
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

/**
 * A ship ends its trip this many map units short of the end of the sea route, off the island: the
 * base stands on a plateau and no ship reaches it. ILLUSTRATIVE: source O24 only says that the
 * icebreaker worked "frente a la base", not where it stayed. It is this far (about 50 km) because
 * the ship is drawn much larger than it is: at the closest the camera gets here it is 4.5 map
 * units long, and nearer the base it would cover the island. The route itself keeps its two ends.
 */
export const SHIP_ANCHORAGE = 7;
const SHIP_END = 1 - SHIP_ANCHORAGE / ROUTE_LENGTH;

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

const TRIPS: Record<TransportKind, Trip> = {
  // The ship starts a little into the sea route and stops off the island; the plane flies the great circle.
  ship: buildTrip([{ vehicle: 'ship', seconds: 48, at: (u) => routeAt(SHIP_START + u * (SHIP_END - SHIP_START)) }]),
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

/**
 * Position in map space at fraction `t` of the trip: 0 is the departure and 1 the arrival. From
 * Ushuaia, at Base Marambio by plane and off its island by ship; for the dogs, the end of their story.
 */
export const voyageAt = (kind: TransportKind, t: number): Point => TRIPS[kind].at(t);

/** What is drawn at fraction `t` of the trip: a trip of the dogs changes vehicle with its legs. */
export const vehicleAt = (kind: TransportKind, t: number): VehicleKind => TRIPS[kind].vehicleAt(t);

/** Fractions of the trip where leg `leg` of a transport starts and ends, and how many legs it has. */
export const tripLegRange = (kind: TransportKind, leg: number) => TRIPS[kind].legRange(leg);
export const tripLegCount = (kind: TransportKind) => TRIPS[kind].legCount;

/** Direction of travel at `t` in map space, as an angle from +x towards +y (radians). */
export function voyageHeading(kind: TransportKind, t: number): number {
  const step = 0.002;
  const from = voyageAt(kind, Math.max(0, clamp01(t) - step));
  const to = voyageAt(kind, Math.min(1, clamp01(t) + step));
  return Math.atan2(to.y - from.y, to.x - from.x);
}

/** Seconds the helicopter takes from the ship to the base. Not a real duration. */
export const TRANSFER_SECONDS = 6;
/** Fraction of the hop the helicopter spends going straight up at the start, and straight down at the end. */
const TRANSFER_HOVER = 0.12;
/** Fraction of the hop it takes to climb to its flying height, and to come down from it. */
const TRANSFER_CLIMB = 0.35;
/** Clear air it keeps over the highest ground under its path, in world units. */
const TRANSFER_MARGIN = 1.5;
const TRANSFER_SAMPLES = 24;

export interface TransferPose extends Point {
  /** World height. */
  height: number;
  /** Direction the nose points, measured like voyageHeading. */
  heading: number;
}

export interface TransferOptions {
  /** Destination point in map space; defaults to Base Marambio (`routeAt(1)`). */
  to?: Point;
  /** Fraction of the hop spent hovering horizontally at the start; defaults to `TRANSFER_HOVER`. */
  startHover?: number;
  /** Minimum cruise height in world units; when set, cruise stays at least `minTop`. */
  minTop?: number;
}

/**
 * Where the helicopter is at fraction `u` of its hop to Base Marambio (or `options.to`) from `from`,
 * the flight deck of the ship as it is drawn. It lifts off, turns to the base, flies level over
 * the highest ground on its way and comes down on the plateau, never under the relief. ILLUSTRATIVE:
 * source O24 says the transfer is made by Sea King, not the path the helicopter flies.
 */
export function transferAt(
  from: TransferPose,
  u: number,
  mesh?: TerrainMesh,
  options?: TransferOptions,
): TransferPose {
  const c = clamp01(u);
  const base = options?.to ?? routeAt(1);
  const startHover = options?.startHover ?? TRANSFER_HOVER;
  const along = (k: number): Point => ({ x: from.x + (base.x - from.x) * k, y: from.y + (base.y - from.y) * k });
  const ground = (p: Point) => Math.max(0, worldHeight(heightAt(p.x, p.y, mesh)));
  let maxGround = 0;
  for (let i = 0; i <= TRANSFER_SAMPLES; i++) maxGround = Math.max(maxGround, ground(along(i / TRANSFER_SAMPLES)));
  const top = options?.minTop !== undefined
    ? Math.max(options.minTop, maxGround + TRANSFER_MARGIN)
    : Math.max(from.height, maxGround) + TRANSFER_MARGIN;
  const pad = ground(base);
  const moveSpan = Math.max(1e-6, 1 - startHover - TRANSFER_HOVER);
  const at = along(smooth01((c - startHover) / moveSpan));
  const height = c < 0.5
    ? from.height + (top - from.height) * smooth01(c / TRANSFER_CLIMB)
    : pad + (top - pad) * smooth01((1 - c) / TRANSFER_CLIMB);
  // It turns the short way round while it climbs.
  const bearing = Math.atan2(base.y - from.y, base.x - from.x);
  const turn = Math.atan2(Math.sin(bearing - from.heading), Math.cos(bearing - from.heading));
  return { ...at, height: Math.max(height, ground(at)), heading: from.heading + turn * smooth01(c / TRANSFER_CLIMB) };
}

/** Vehicle length as a fraction of the camera distance: a 120 m ship is invisible on a 4000 km map. */
export const VEHICLE_SIZE_PER_DISTANCE = 0.075;
export const VEHICLE_MIN_SIZE = 0.5;
/** Ship draft below water surface in ship lengths. */
export const SHIP_DRAFT = 0.02;
/** Flight deck of the icebreaker in its model: how far aft of the middle and how high, in ship lengths. */
export const IRIZAR_DECK_AFT = 0.33;
export const IRIZAR_DECK_TOP = 0.091;
/** Half-beam of the Irízar hull (including lifeboats) in ship lengths. */
export const IRIZAR_HALF_BEAM = 0.11;
/**
 * Length of the helicopter in ship lengths. ILLUSTRATIVE: drawn larger than real scale so it
 * stays visible from the map camera.
 */
export const HELICOPTER_SHIP_RATIO = 0.55;
/**
 * Zodiac length as a fraction of the Irízar's length. ILLUSTRATIVE: exaggerated from real
 * proportions so the boat remains visible on the 3D map.
 */
export const ZODIAC_SHIP_RATIO = 1 / 8;

/** World length of a voyage vehicle at `distance` from the camera. */
export function vehicleSize(distance: number): number {
  return Math.max(VEHICLE_MIN_SIZE, distance * VEHICLE_SIZE_PER_DISTANCE);
}

/** World Y height of a ship sitting slightly into the water, given its world length `size`. */
export function shipWaterY(size: number): number {
  return -size * SHIP_DRAFT;
}

/** Flight-deck takeoff pose for a ship at `{ x, y, height, heading }` with world length `size`. */
export function shipDeckPose(
  ship: { x: number; y: number; height: number; heading: number },
  size: number,
): TransferPose {
  return {
    x: ship.x - Math.cos(ship.heading) * IRIZAR_DECK_AFT * size,
    y: ship.y - Math.sin(ship.heading) * IRIZAR_DECK_AFT * size,
    height: ship.height + IRIZAR_DECK_TOP * size,
    heading: ship.heading,
  };
}

/** Map-space pose where the Irízar comes to rest at the end of the trip from Ushuaia off Isla Marambio. */
export const IRIZAR_ARRIVAL_POSE: Readonly<{ x: number; y: number; heading: number }> = {
  ...voyageAt('ship', 1),
  heading: voyageHeading('ship', 1),
};

/**
 * World-space pose of the Irízar and its flight deck at the end of the Ushuaia trip, given its
 * camera-scaled world length `size` and optional vertical heave `lift`.
 */
export function irizarArrivalWorldPose(size: number, lift = 0) {
  const world = toWorld(IRIZAR_ARRIVAL_POSE.x, IRIZAR_ARRIVAL_POSE.y, shipWaterY(size) + lift * size);
  const mapPose = { ...IRIZAR_ARRIVAL_POSE, height: world.y };
  return {
    ...mapPose,
    world,
    size,
    deck: shipDeckPose(mapPose, size),
  };
}

/** Duration of each Orcadas travel leg on the 3D map, in seconds. ILLUSTRATIVE: not real trip times. */
export const ORCADAS_SHIP_SECONDS = 7;
export const ORCADAS_ZODIAC_SECONDS = 4;
export const ORCADAS_HELICOPTER_SECONDS = 8;
export const ORCADAS_TRAVEL_SECONDS: Readonly<Record<ArrivalId, number>> = {
  ship: ORCADAS_SHIP_SECONDS + ORCADAS_ZODIAC_SECONDS,
  helicopter: ORCADAS_HELICOPTER_SECONDS,
};
/** Fraction of the ship travel phase spent aboard the Irízar before deploying the Zodiac. */
export const ORCADAS_SHIP_PHASE = ORCADAS_SHIP_SECONDS / ORCADAS_TRAVEL_SECONDS.ship;

/** Total duration in milliseconds of the Orcadas travel phase for the chosen transport. */
export function orcadasTravelMs(arrival: ArrivalId): number {
  return ORCADAS_TRAVEL_SECONDS[arrival] * 1000;
}

/**
 * Map units short of `ORCADAS_POINT` where the Zodiac stops off the shore of Laurie Island.
 * ILLUSTRATIVE: keeps the boat on water right at the coastline without climbing onto land.
 */
export const ORCADAS_SHORE = 1;

/** Default Irízar world length when `orcadasTravelAt` is called without camera context (e.g. unit tests). */
export const ORCADAS_DEFAULT_SHIP_SIZE = 4;
/** Fraction of the Zodiac leg spent lowering the boat down from the Irízar's side into the water. */
export const ZODIAC_LOWER_PHASE = 0.2;
/** Zodiac launch position relative to the anchored Irízar (in ship lengths): waist, starboard outside hull, rail height. */
export const ZODIAC_LAUNCH_ALONG = 0.05;
export const ZODIAC_LAUNCH_SIDE = 0.2;
export const ZODIAC_LAUNCH_HEIGHT = 0.11;
/** Distance along the approach centerline from the Irízar's anchorage to the Laurie Island shore. */
export const ORCADAS_ZODIAC_WATER_LENGTH = Math.max(0, SHIP_ANCHORAGE - ORCADAS_SHORE);

// From the Marambio arrival pose, the Irízar turns cleanly to port over open water onto the tangent
// bearing toward Laurie Island (`ORCADAS_POINT`) and sails to `SHIP_ANCHORAGE`.
const ORCADAS_TURN_RADIUS = 3;
const ORCADAS_TURN_CENTER: Point = {
  x: IRIZAR_ARRIVAL_POSE.x + ORCADAS_TURN_RADIUS * Math.sin(IRIZAR_ARRIVAL_POSE.heading),
  y: IRIZAR_ARRIVAL_POSE.y - ORCADAS_TURN_RADIUS * Math.cos(IRIZAR_ARRIVAL_POSE.heading),
};
const ORCADAS_TURN_THETA0 = IRIZAR_ARRIVAL_POSE.heading + Math.PI / 2;
const ORCADAS_TURN_DIST = Math.hypot(ORCADAS_POINT.x - ORCADAS_TURN_CENTER.x, ORCADAS_POINT.y - ORCADAS_TURN_CENTER.y);
const ORCADAS_TURN_PHI = Math.atan2(ORCADAS_POINT.y - ORCADAS_TURN_CENTER.y, ORCADAS_POINT.x - ORCADAS_TURN_CENTER.x);
const ORCADAS_TURN_THETA1 = ORCADAS_TURN_PHI + Math.acos(ORCADAS_TURN_RADIUS / ORCADAS_TURN_DIST);
const ORCADAS_TURN_RAW_DELTA = Math.atan2(
  Math.sin(ORCADAS_TURN_THETA1 - ORCADAS_TURN_THETA0),
  Math.cos(ORCADAS_TURN_THETA1 - ORCADAS_TURN_THETA0),
);
const ORCADAS_TURN_DELTA = ORCADAS_TURN_RAW_DELTA > 0 ? ORCADAS_TURN_RAW_DELTA - Math.PI * 2 : ORCADAS_TURN_RAW_DELTA;
const ORCADAS_SHIP_ARC_LENGTH = ORCADAS_TURN_RADIUS * -ORCADAS_TURN_DELTA;
const ORCADAS_SHIP_TANGENT_START: Point = {
  x: ORCADAS_TURN_CENTER.x + ORCADAS_TURN_RADIUS * Math.cos(ORCADAS_TURN_THETA1),
  y: ORCADAS_TURN_CENTER.y + ORCADAS_TURN_RADIUS * Math.sin(ORCADAS_TURN_THETA1),
};
const ORCADAS_SHIP_ANCHOR_HEADING = ORCADAS_TURN_THETA1 - Math.PI / 2;
const ORCADAS_SHIP_LINE_LENGTH = Math.max(
  0,
  Math.hypot(ORCADAS_POINT.x - ORCADAS_SHIP_TANGENT_START.x, ORCADAS_POINT.y - ORCADAS_SHIP_TANGENT_START.y) -
    SHIP_ANCHORAGE,
);
/** Map-space length of the Irízar's sailing leg from Marambio anchorage to Laurie anchorage. */
export const ORCADAS_SHIP_LENGTH = ORCADAS_SHIP_ARC_LENGTH + ORCADAS_SHIP_LINE_LENGTH;

/** Pose along the Irízar's Marambio-to-Laurie sailing path at arc-length `distance` in map units. */
export function orcadasShipAtDistance(distance: number): { x: number; y: number; heading: number } {
  const s = Math.min(ORCADAS_SHIP_LENGTH, Math.max(0, distance));
  if (s <= ORCADAS_SHIP_ARC_LENGTH) {
    const theta = ORCADAS_TURN_THETA0 - s / ORCADAS_TURN_RADIUS;
    return {
      x: ORCADAS_TURN_CENTER.x + ORCADAS_TURN_RADIUS * Math.cos(theta),
      y: ORCADAS_TURN_CENTER.y + ORCADAS_TURN_RADIUS * Math.sin(theta),
      heading: theta - Math.PI / 2,
    };
  }
  const d = s - ORCADAS_SHIP_ARC_LENGTH;
  return {
    x: ORCADAS_SHIP_TANGENT_START.x + Math.cos(ORCADAS_SHIP_ANCHOR_HEADING) * d,
    y: ORCADAS_SHIP_TANGENT_START.y + Math.sin(ORCADAS_SHIP_ANCHOR_HEADING) * d,
    heading: ORCADAS_SHIP_ANCHOR_HEADING,
  };
}

const ORCADAS_SHIP_ANCHOR = orcadasShipAtDistance(ORCADAS_SHIP_LENGTH);

/** Pose on water of the deployed Zodiac at fraction `u` (0..1) from alongside the Irízar to Laurie shore. */
export function orcadasZodiacWaterAt(
  u: number,
  shipSize = ORCADAS_DEFAULT_SHIP_SIZE,
): { x: number; y: number; heading: number } {
  const c = clamp01(u);
  const cosH = Math.cos(ORCADAS_SHIP_ANCHOR.heading);
  const sinH = Math.sin(ORCADAS_SHIP_ANCHOR.heading);
  const f0 = ZODIAC_LAUNCH_ALONG * shipSize;
  const f1 = ORCADAS_ZODIAC_WATER_LENGTH;
  const l0 = ZODIAC_LAUNCH_SIDE * shipSize;
  const f = f0 + (f1 - f0) * c;
  const l = l0 * (1 - smooth01(c));
  const df = f1 - f0;
  const dl = -l0 * 6 * c * (1 - c);
  return {
    x: ORCADAS_SHIP_ANCHOR.x + cosH * f - sinH * l,
    y: ORCADAS_SHIP_ANCHOR.y + sinH * f + cosH * l,
    heading: Math.atan2(sinH * df + cosH * dl, cosH * df - sinH * dl),
  };
}

export interface OrcadasTravelOptions {
  /** World length of the Irízar used to locate its flight deck and side-deployed Zodiac. */
  shipSize?: number;
}

/** Map-space length of the Orcadas travel leg from Isla Marambio to Laurie Island. */
export function orcadasTravelLength(arrival: ArrivalId, options?: OrcadasTravelOptions): number {
  if (arrival === 'ship') return ORCADAS_SHIP_LENGTH + ORCADAS_ZODIAC_WATER_LENGTH;
  const deck = irizarArrivalWorldPose(options?.shipSize ?? ORCADAS_DEFAULT_SHIP_SIZE).deck;
  return Math.hypot(ORCADAS_POINT.x - deck.x, ORCADAS_POINT.y - deck.y);
}

/**
 * Pose at fraction `t` (0..1) of the Orcadas travel leg from Isla Marambio to Laurie Island
 * (`ORCADAS_POINT`). Both transports depart from the Irízar's exact Ushuaia arrival pose
 * (`IRIZAR_ARRIVAL_POSE`):
 * - By ship (`t <= ORCADAS_SHIP_PHASE`), the Irízar turns smoothly onto the Laurie bearing and
 *   sails to `SHIP_ANCHORAGE`; then (`t > ORCADAS_SHIP_PHASE`), the Zodiac deploys outside the
 *   starboard hull, lowers to the water, and motors to the shore (`ORCADAS_SHORE`).
 * - By helicopter, the aircraft lifts off the Irízar's aft flight deck (`shipDeckPose`), cruises
 *   over `FLIGHT_CRUISE`, and descends onto Laurie Island via `transferAt`. ILLUSTRATIVE: not a real track.
 */
export function orcadasTravelAt(
  arrival: ArrivalId,
  t: number,
  mesh?: TerrainMesh,
  options?: OrcadasTravelOptions,
): TransferPose {
  const c = clamp01(t);
  const shipSize = options?.shipSize ?? ORCADAS_DEFAULT_SHIP_SIZE;
  if (arrival === 'ship') {
    if (c <= ORCADAS_SHIP_PHASE) {
      const p = orcadasShipAtDistance(smooth01(c / ORCADAS_SHIP_PHASE) * ORCADAS_SHIP_LENGTH);
      return { ...p, height: 0 };
    }
    const z = (c - ORCADAS_SHIP_PHASE) / (1 - ORCADAS_SHIP_PHASE);
    if (z <= ZODIAC_LOWER_PHASE) {
      const start = orcadasZodiacWaterAt(0, shipSize);
      const drop = smooth01(z / ZODIAC_LOWER_PHASE);
      return {
        ...start,
        height: ZODIAC_LAUNCH_HEIGHT * shipSize * (1 - drop),
      };
    }
    const u = smooth01((z - ZODIAC_LOWER_PHASE) / (1 - ZODIAC_LOWER_PHASE));
    return { ...orcadasZodiacWaterAt(u, shipSize), height: 0 };
  }
  const deck = irizarArrivalWorldPose(shipSize).deck;
  return transferAt(deck, c, mesh, { to: ORCADAS_POINT, minTop: FLIGHT_CRUISE });
}

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
  const stop = EXPEDITION[milestoneId];
  const kind = kindOf(transport);
  const notes = (stop?.notes ?? [])
    .filter((n) => (!n.kind || n.kind === kind) && (!n.only || n.only === transport))
    .map((n) => n.fact);
  const asked = stop?.question;
  const question = asked && (!asked.kind || asked.kind === kind) && (!asked.only || asked.only === transport) ? asked : null;
  return { notes, question };
}

/**
 * How many questions of the trip were answered right. `answers` holds the option chosen at each
 * milestone id. The questions are optional (#157): `answered` says how many were answered at all.
 */
export function quizScore(transport: TransportId, answers: Readonly<Record<string, number>>): { right: number; answered: number; total: number } {
  const asked = voyageStops(kindOf(transport))
    .map((stop) => ({ id: stop.milestone.id, question: expeditionAt(stop.milestone.id, transport).question }))
    .filter((q) => q.question);
  return {
    right: asked.filter((q) => answers[q.id] === q.question!.answer).length,
    answered: asked.filter((q) => q.id in answers).length,
    total: asked.length,
  };
}

/**
 * Sources a trip lists, in the order it cites them. The trips from Ushuaia share the whole registry (numbered as
 * `voyageSourceNumber`); the team of Poncho lists only what it cites, numbered from 1.
 */
export function tripSources(transport: TransportId): VoyageSourceCode[] {
  if (kindOf(transport) !== 'dogs') return VOYAGE_SOURCE_CODES;
  const codes = new Set<VoyageSourceCode>();
  for (const fact of [...PONCHO_TRANSPORT.facts, ...PONCHO_MILESTONES.flatMap((m) => [m.essential, ...m.more])]) {
    for (const code of fact.sources) codes.add(code);
  }
  return [...codes];
}

/** Number of a source in the list of the trip (see `tripSources`). */
export const tripSourceNumber = (transport: TransportId, code: VoyageSourceCode) => tripSources(transport).indexOf(code) + 1;

/** Seconds the whole trip takes while the user keeps advancing. Not a real duration. */
export const VOYAGE_SECONDS: Record<TransportKind, number> = { ship: TRIPS.ship.seconds, plane: TRIPS.plane.seconds, dogs: TRIPS.dogs.seconds };

/**
 * Holding "advance" the trip picks up speed little by little (#166): it sets off at ×1 and in
 * VOYAGE_RAMP_SECONDS of holding reaches VOYAGE_TOP_SPEED times as fast, then stays there.
 */
export const VOYAGE_TOP_SPEED = 4;
export const VOYAGE_RAMP_SECONDS = 3;
/** Letting go, the speed gained unwinds this many times faster than it built up: a quick new press keeps most of it. */
export const VOYAGE_RAMP_UNWIND = 2;

/** Speed multiplier of "advance" after holding it `heldSeconds`: from ×1 up to VOYAGE_TOP_SPEED, easing in and out. */
export function rampSpeed(heldSeconds: number): number {
  const u = Math.min(1, Math.max(0, heldSeconds / VOYAGE_RAMP_SECONDS));
  return 1 + (VOYAGE_TOP_SPEED - 1) * u * u * (3 - 2 * u);
}

/** Seconds of holding that count for the speed after `dt` more seconds, held or let go. */
export function nextHeld(heldSeconds: number, dt: number, pressed: boolean): number {
  if (pressed) return Math.min(VOYAGE_RAMP_SECONDS, heldSeconds + dt);
  return Math.max(0, heldSeconds - dt * VOYAGE_RAMP_UNWIND);
}

/**
 * Camera distance at which the trip goes at its own pace: about the closest the camera gets over
 * open sea (ICE_MIN_DISTANCE). The vehicle is drawn at a size that grows with the distance, so it
 * looks the same however far the camera is; the trip moves the same number of ship lengths per
 * second from up to VOYAGE_PACE_TOP times farther, and so looks as fast on the screen (#168).
 */
export const VOYAGE_PACE_DISTANCE = 25;
export const VOYAGE_PACE_TOP = 4;

/** Speed multiplier of the trip for a camera at `distance` from the vehicle: ×1 up close, faster from farther. */
export function voyagePace(distance: number): number {
  return Math.min(VOYAGE_PACE_TOP, Math.max(1, distance / VOYAGE_PACE_DISTANCE));
}

export interface VoyageState {
  transport: TransportId;
  kind: TransportKind;
  /** Fraction of the trip travelled. */
  t: number;
  /** Stops already passed (index into voyageStops). The departure is passed from the start. */
  reached: number;
  /** Index of the stop whose card is open, or -1. The trip does not advance while a card is open. */
  card: number;
}

/** The trip of Poncho is a story told in order: every milestone stops the trip and opens its card (the others are optional, #157). */
export const storyInOrder = (kind: TransportKind): boolean => kind === 'dogs';

/** Index of the arrival, the last stop: the only one whose card opens by itself. */
const lastStop = (kind: TransportKind) => voyageStops(kind).length - 1;

export function startVoyage(transport: TransportId): VoyageState {
  const kind = findTransport(transport).kind;
  // The departure is passed at once, its card closed: it is offered, not shown (#157). Poncho's story
  // is told in order, so there the first milestone is the departure and its card opens right away.
  return { transport, kind, t: 0, reached: 1, card: storyInOrder(kind) ? 0 : -1 };
}

export const voyageArrived = (s: VoyageState) => s.reached >= voyageStops(s.kind).length;

/**
 * Advances the trip by `seconds` of the user holding "advance". The milestones on the way are
 * passed without stopping: their cards are offered, not opened (#157), for whoever does not want
 * to read them all. Only the arrival stops the trip and opens its card.
 */
export function advanceVoyage(s: VoyageState, seconds: number): VoyageState {
  if (s.card >= 0 || voyageArrived(s) || seconds <= 0) return s;
  const stops = voyageStops(s.kind);
  const last = lastStop(s.kind);
  const t = s.t + seconds / VOYAGE_SECONDS[s.kind];
  if (storyInOrder(s.kind)) {
    // Stops exactly at the next milestone and opens its card: the user sets the pace and never skips one.
    const next = stops[s.reached];
    return t < next.t ? { ...s, t } : { ...s, t: next.t, reached: s.reached + 1, card: s.reached };
  }
  let reached = s.reached;
  while (reached < stops.length && t >= stops[reached].t) {
    if (reached === last) return { ...s, t: stops[last].t, reached: last + 1, card: last };
    reached++;
  }
  return { ...s, t, reached };
}

/**
 * Goes back along the trip by `seconds` of the user holding "go back", to look again at something
 * missed. Milestones already passed stay passed.
 */
export function retreatVoyage(s: VoyageState, seconds: number): VoyageState {
  if (s.card >= 0 || s.t <= 0 || seconds <= 0) return s;
  return { ...s, t: Math.max(0, s.t - seconds / VOYAGE_SECONDS[s.kind]) };
}

/** Jumps to the next milestone without opening it, except the arrival: the step-by-step trip for reduced motion and the 2D map. */
export function skipToNextStop(s: VoyageState): VoyageState {
  if (s.card >= 0 || voyageArrived(s)) return s;
  const arriving = storyInOrder(s.kind) || s.reached === lastStop(s.kind);
  return { ...s, t: voyageStops(s.kind)[s.reached].t, reached: s.reached + 1, card: arriving ? s.reached : -1 };
}

/**
 * The milestone the vehicle is at or last went by, offered to be read: the last passed stop not
 * ahead of the vehicle (it may have gone back). -1 once arrived: the arrival card is open.
 */
export function voyageStopAt(s: VoyageState): number {
  if (voyageArrived(s)) return -1;
  const stops = voyageStops(s.kind);
  let at = 0;
  for (let i = 1; i < s.reached; i++) if (stops[i].t <= s.t + 1e-9) at = i;
  return at;
}

/** Opens the card of a milestone already passed, when the user asks for it. */
export function openVoyageCard(s: VoyageState, index: number): VoyageState {
  if (index < 0 || index >= s.reached || index === s.card) return s;
  return { ...s, card: index };
}

/** Closes the open card. Once arrived, closing another card goes back to the one of the arrival. */
export function closeVoyageCard(s: VoyageState): VoyageState {
  if (s.card < 0) return s;
  const last = lastStop(s.kind);
  if (voyageArrived(s)) return s.card === last ? { ...s, card: -1 } : { ...s, card: last };
  return { ...s, card: -1 };
}

import { toWorld } from './camera.ts';
import { ORCADAS_POINT } from './content/points.ts';
import {
  EXPEDITION, MILESTONES, SIGHTINGS, TRANSPORTS,
  type Milestone, type Sighting, type TransportId, type TransportKind, type VoyageFact, type VoyageQuestion,
} from './content/ushuaia.ts';
import { FLIGHT_GROUND_M } from './flight-ground.ts';
import { FLIGHT_GROUND_STEP, flightAt } from './flight-path.ts';
import { fuegiaWorldHeight } from './fuegia.ts';
import type { ArrivalId } from './orcadas-arrival.ts';
import { project, unproject } from './projection.ts';
import { worldHeight } from './relief.ts';
import { ROUTE_LENGTH, routeAt } from './route.ts';
import { stormCeiling } from './storm.ts';
import { heightAt, type TerrainMesh } from './terrain.ts';

type Point = { x: number; y: number };

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

/**
 * Position in map space at fraction `t` of the trip: 0 is the departure from Ushuaia and 1 the
 * arrival, at Base Marambio by plane and off its island by ship.
 */
export function voyageAt(kind: TransportKind, t: number): Point {
  return kind === 'plane' ? flightAt(clamp01(t)) : routeAt(SHIP_START + clamp01(t) * (SHIP_END - SHIP_START));
}

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
const pathLength =(kind: TransportKind) => {
  let total = 0;
  for (let i = 1; i <= PATH_SAMPLES; i++) {
    const a = voyageAt(kind, (i - 1) / PATH_SAMPLES);
    const b = voyageAt(kind, i / PATH_SAMPLES);
    total += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return total;
};
const LENGTHS: Record<TransportKind, number> = { ship: pathLength('ship'), plane: pathLength('plane') };

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
const KM: Record<TransportKind, readonly number[]> = { ship: pathKm('ship'), plane: pathKm('plane') };

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
  const { kind, cruiseKmh } = TRANSPORTS.find((v) => v.id === transport)!;
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
  const stops = MILESTONES.filter((m) => m.kinds.includes(kind)).map((milestone) => {
    const { anchor } = milestone;
    let index: number;
    if ('lat' in anchor) {
      index = samples.findIndex((p) => unproject(p.x, p.y).lat <= anchor.lat);
      if (index < 0) index = STOP_SAMPLES;
    } else {
      const target = project(anchor[0], anchor[1]);
      index = samples.reduce((best, p, i) => (Math.hypot(p.x - target.x, p.y - target.y) < Math.hypot(samples[best].x - target.x, samples[best].y - target.y) ? i : best), 0);
    }
    const pin = milestone.place ? project(milestone.place[0], milestone.place[1]) : samples[index];
    return { milestone, t: index / STOP_SAMPLES, pin: { x: pin.x, y: pin.y } };
  });
  return stops;
}

const STOPS: Record<TransportKind, VoyageStop[]> = { ship: buildStops('ship'), plane: buildStops('plane') };

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

const kindOf = (transport: TransportId) => TRANSPORTS.find((v) => v.id === transport)!.kind;

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

/** How many questions of the trip were answered right. `answers` holds the option chosen at each milestone id. */
export function quizScore(transport: TransportId, answers: Readonly<Record<string, number>>): { right: number; total: number } {
  const asked = voyageStops(kindOf(transport))
    .map((stop) => ({ id: stop.milestone.id, question: expeditionAt(stop.milestone.id, transport).question }))
    .filter((q) => q.question);
  return { right: asked.filter((q) => answers[q.id] === q.question!.answer).length, total: asked.length };
}

/** Seconds the whole trip takes while the user keeps advancing. Not a real duration. */
export const VOYAGE_SECONDS: Record<TransportKind, number> = { ship: 48, plane: 30 };

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
  const kind = TRANSPORTS.find((v) => v.id === transport)!.kind;
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

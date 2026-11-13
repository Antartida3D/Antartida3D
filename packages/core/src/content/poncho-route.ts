/**
 * Places and legs of the trip of the dogs (issue #78): where the team goes and by what vehicle. The stories
 * and the facts are in poncho.ts; this file only says where things are.
 */
import { ROUTE_WAYPOINTS } from '../route.ts';
import type { TripSegment } from './ushuaia.ts';

/**
 * Places of the team as [lon, lat]: Base Esperanza (where Poncho was born in 1961), the Foca nunataks and
 * Base San Martín (the winter expedition of 1962), the Belgrano area on the Filchner ice shelf (1964-66), the
 * Santa Fe peak (the «Paralelo 82» patrol of 1965) and, in 1967, Duse Bay near Esperanza.
 *
 * Verified places: docs/expediciones/poncho-fuentes.md, section 3. Belgrano I has no verified coordinate, so it
 * is drawn on the Filchner ice shelf, and the way back to it is a second, nearby point (both APPROXIMATE).
 */
// Places as [lon, lat].
export const ESPERANZA = [-57.0, -63.4] as const;
export const FOCA_NUNATAKS = [-60.25, -65.07] as const;
export const SAN_MARTIN = [-67.1, -68.13] as const;
/** APPROXIMATE: central point of the Filchner ice shelf (SCAR gazetteer), standing for Base Belgrano I. */
export const BELGRANO_AREA = [-40, -79] as const;
export const SANTA_FE_PEAK = [-41.33, -82.05] as const;
/** APPROXIMATE and ILLUSTRATIVE: a point near Belgrano for the way back of the patrol, only to draw the curve. */
export const BELGRANO_RETURN = [-41, -79.6] as const;
export const DUSE_BAY = [-57.33, -63.5] as const;
/** Ushuaia as the trip «Desde Ushuaia» marks it (`[Fuente a definir]` there too). */
export const USHUAIA = [-68.3, -54.81] as const;
export const SOUTH_POLE = [0, -90] as const;

type LonLat = readonly [number, number];

/**
 * APPROXIMATE and ILLUSTRATIVE: the port of Base Esperanza, on the water at the tip of the peninsula, where the
 * sled hands over to the ship and the ship to the sled. Not a surveyed pier.
 */
export const ESPERANZA_PORT = [-56.82, -63.34] as const;
/** Antarctic Sound point of the sea route of route.ts (Ushuaia–Marambio): the way to Ushuaia is derived from it. */
const ANTARCTIC_SOUND = [-56.72, -63.3] as const;
/**
 * APPROXIMATE and ILLUSTRATIVE: the port at the front of the Filchner ice shelf, on the water just north of
 * Belgrano. Belgrano I has no verified coordinate (BELGRANO_AREA is only the central point of the shelf), so
 * neither the port nor the way in is a real place or track.
 */
export const FILCHNER_PORT = [-40, -77.6] as const;

const reversed = (points: readonly LonLat[]): LonLat[] => [...points].reverse();

// Peninsula 1961-62: out over the land of the relief to the Foca nunataks and San Martín and back (the book says the
// team was back at Esperanza in October 1962). ILLUSTRATIVE: points over the land of the relief, between verified
// places; the way back is a second, nearby line. Both ends are on the coast, so the last stretch to the port is on the water.
const PENINSULA_ROUND_TRIP: LonLat[] = [
  ESPERANZA,
  [-56.89, -63.42],
  [-56.98, -63.45],
  [-57.83, -63.88],
  [-57.9, -64.04],
  [-58.72, -64.13],
  [-59.19, -64.32],
  [-59.77, -64.34],
  [-60.43, -64.55],
  [-60.91, -64.66],
  [-60.8, -65],
  [-60.38, -65.05],
  FOCA_NUNATAKS,
  [-61.52, -64.99],
  [-62.36, -65.47],
  [-63.51, -66.64],
  [-65.35, -67.56],
  [-66.38, -67.83],
  SAN_MARTIN,
  [-66.67, -67.91],
  [-64.81, -67.31],
  [-63.55, -66.66],
  [-62.09, -65.18],
  [-61.9, -64.95],
  [-60.34, -65.01],
  [-60.48, -65.07],
  [-60.89, -64.86],
  [-60.72, -64.75],
  [-60.62, -64.46],
  [-59.75, -64.33],
  [-59.04, -64.35],
  [-58.68, -64.12],
  [-57.73, -64.06],
  [-57.59, -63.82],
  [-57.39, -63.54],
  [-56.97, -63.46],
  ESPERANZA,
  ESPERANZA_PORT,
];

// Sea of Weddell, east of the peninsula, from the port of Esperanza to the front of the Filchner ice shelf. ILLUSTRATIVE.
const WEDDELL_SEA: LonLat[] = [
  ESPERANZA_PORT,
  ANTARCTIC_SOUND,
  [-56.6, -63.45],
  [-56.38, -63.57],
  [-55.2, -65],
  [-52.5, -69],
  [-50.3, -73],
  [-46.5, -76.3],
  [-42.5, -77.4],
  FILCHNER_PORT,
];

// Patrol of 1967 along the coast, to Duse Bay and a little beyond, and back (the sea ice is drawn along the coast). ILLUSTRATIVE.
const ESPERANZA_PATROL: LonLat[] = [
  ESPERANZA_PORT,
  ESPERANZA,
  [-57.15, -63.39],
  DUSE_BAY,
  [-57.79, -63.48],
  [-58.2, -63.68],
  [-57.66, -63.55],
  [-57.42, -63.56],
  ESPERANZA,
  ESPERANZA_PORT,
];

// Over the Filchner ice shelf, from its front to the Belgrano area, to the Santa Fe peak and back in a loop. ILLUSTRATIVE.
const FILCHNER_LOOP: LonLat[] = [FILCHNER_PORT, BELGRANO_AREA, [-40.8, -80.6], SANTA_FE_PEAK, [-42.6, -80.6], BELGRANO_RETURN, FILCHNER_PORT];

/** From the port of Esperanza to Ushuaia: the sea route of route.ts, from the Antarctic Sound back, derived and not copied. */
const TO_USHUAIA: LonLat[] = (() => {
  const at = ROUTE_WAYPOINTS.findIndex(([lon, lat]) => lon === ANTARCTIC_SOUND[0] && lat === ANTARCTIC_SOUND[1]);
  return [ESPERANZA_PORT, ...reversed(ROUTE_WAYPOINTS.slice(0, at + 1))];
})();

/**
 * Contract of the legs (index, vehicle, where). Poncho's milestones point at them with `segment` (poncho.ts).
 *  0 sled: Peninsula 1961-62. Esperanza -> Foca nunataks -> San Martín and back, ends at the port of Esperanza.
 *  1 ship: move to Belgrano (1964). Port of Esperanza -> Weddell Sea -> front of the Filchner ice shelf.
 *  2 sled: Belgrano and the Pole (1964-66). Front of the shelf -> Belgrano area -> Santa Fe peak -> loop back to the front.
 *  3 ship: back to the peninsula (1967). Front of the Filchner ice shelf -> Weddell Sea -> port of Esperanza.
 *  4 sled: Esperanza (1967). Short patrol along the coast to Duse Bay and back to the port of Esperanza.
 *  5 ship: towards Ushuaia (1973). Port of Esperanza -> Ushuaia, over the sea route of route.ts reversed.
 * The end of each leg is the start of the next one (the vehicle changes at the port).
 * Points between verified places are ILLUSTRATIVE, not a real track. Belgrano I, Jardinero cove and the site
 * of the AE-205 have no verified coordinate, so they are only drawn as approximate points on the ice shelf.
 * The sled legs stay on land or ice and the ship legs on water, checked against the relief in poncho-route.test.ts.
 */
export const PONCHO_SEGMENTS: readonly TripSegment[] = [
  { vehicle: 'sled', seconds: 30, waypoints: PENINSULA_ROUND_TRIP },
  { vehicle: 'ship', seconds: 14, waypoints: WEDDELL_SEA },
  { vehicle: 'sled', seconds: 30, waypoints: FILCHNER_LOOP },
  { vehicle: 'ship', seconds: 12, waypoints: reversed(WEDDELL_SEA) },
  { vehicle: 'sled', seconds: 12, waypoints: ESPERANZA_PATROL },
  { vehicle: 'ship', seconds: 24, waypoints: TO_USHUAIA },
];

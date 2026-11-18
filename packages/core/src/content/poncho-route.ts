/**
 * Places and legs of the trip of the dogs (issue #78): where the team goes and by what vehicle. The stories
 * and the facts are in poncho.ts; this file only says where things are.
 */
import type { TripSegment } from './ushuaia.ts';

/**
 * Places of the team as [lon, lat]: Base Esperanza (where Poncho was born in 1961), the Foca nunataks and
 * Base San Martín (the winter expedition of 1962), the Belgrano area on the Filchner ice shelf (1964-66) and, in 1967,
 * Duse Bay near Esperanza.
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
/**
 * APPROXIMATE and ILLUSTRATIVE: a point near Belgrano for the stop of the jump of 1966, only to draw the curve. The book puts the jump
 * about 30 km south of the base (p. 19), but the base has no verified coordinate, so this point is not that place.
 */
export const BELGRANO_RETURN = [-41, -79.6] as const;
export const DUSE_BAY = [-57.33, -63.5] as const;
export const SOUTH_POLE = [0, -90] as const;

type LonLat = readonly [number, number];

/**
 * APPROXIMATE and ILLUSTRATIVE: the port of Base Esperanza, on the shore of the Antarctic Sound (the lowest land
 * cell of the relief next to the sea, about 7 m), where the sled hands over to the ship and the ship to the sled.
 * Not a surveyed pier. It is on land because the end of a leg is the start of the next one (`buildTrip`): the ship
 * starts half on the shore, an illustration.
 */
export const ESPERANZA_PORT = [-56.9, -63.4] as const;
/** Antarctic Sound point of the sea route of route.ts (Ushuaia–Marambio), where the ship to Belgrano goes out to the Weddell Sea. */
const ANTARCTIC_SOUND = [-56.72, -63.3] as const;
/**
 * APPROXIMATE and ILLUSTRATIVE: the port at the front of the Filchner ice shelf, on the ice at the edge of the
 * water (about 7 m in the relief), north of Belgrano. Belgrano I has no verified coordinate (BELGRANO_AREA is
 * only the central point of the shelf), so neither the port nor the way in is a real place or track. It is on the
 * ice because the end of a leg is the start of the next one: the ship starts half on the edge, an illustration.
 */
export const FILCHNER_PORT = [-40, -77.89] as const;

const reversed = (points: readonly LonLat[]): LonLat[] => [...points].reverse();

// Peninsula 1961-62: out over the land of the relief to the Foca nunataks and San Martín and back (the book says the
// team was back at Esperanza in October 1962). ILLUSTRATIVE: points over the land of the relief, between verified
// places, found by a search against the relief (inland, never on the water, mostly 40 m or more above the sea); the way
// back is a second, nearby line. Both ends are on the shore: the port is the lowest land next to the sea.
const PENINSULA_ROUND_TRIP: LonLat[] = [
  ESPERANZA,
  [-57.02, -63.3],
  [-57.1, -63.27],
  [-57.78, -63.86],
  [-58.05, -64.06],
  [-58.97, -64.14],
  [-59.55, -64.31],
  [-60.31, -64.29],
  [-60.49, -64.44],
  [-60.56, -64.57],
  [-60.94, -64.94],
  [-60.51, -65.04],
  FOCA_NUNATAKS,
  [-61.77, -64.89],
  [-62.54, -65.49],
  [-64.46, -66.8],
  [-66.24, -67.52],
  [-67.01, -68.11],
  SAN_MARTIN,
  [-66.02, -67.62],
  [-64.77, -66.83],
  [-64.11, -66.36],
  [-62.37, -65.02],
  [-62.04, -64.72],
  [-60.92, -64.71],
  [-60.64, -64.7],
  [-60.71, -64.61],
  [-60.59, -64.31],
  [-60.47, -64.04],
  [-60.15, -64.19],
  [-59.6, -64.26],
  [-58.95, -64.14],
  [-57.84, -64.09],
  [-58.07, -64.23],
  [-57.86, -63.94],
  [-57.06, -63.37],
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

// Patrol of 1967 from Esperanza to Duse Bay and back, kept inland on the land of the relief (the bay itself is a verified place). ILLUSTRATIVE.
const ESPERANZA_PATROL: LonLat[] = [
  ESPERANZA_PORT,
  ESPERANZA,
  [-57.26, -63.22],
  DUSE_BAY,
  [-57.31, -63.46],
  [-57.23, -63.44],
  [-57.2, -63.23],
  [-57.05, -63.6],
  ESPERANZA,
  ESPERANZA_PORT,
];

// Over the Filchner ice shelf, from its front to the Belgrano area, straight on to the place of the jump and back to the front.
// ILLUSTRATIVE. The patrol of the Paralelo 82 is no longer a stop (DEC-221), so the leg no longer goes down to the Santa Fe peak.
const FILCHNER_LOOP: LonLat[] = [FILCHNER_PORT, BELGRANO_AREA, BELGRANO_RETURN, FILCHNER_PORT];

/**
 * Contract of the legs (index, vehicle, where). Poncho's milestones point at them with `segment` (poncho.ts).
 *  0 sled: Peninsula 1961-62. Esperanza -> Foca nunataks -> San Martín and back, ends at the port of Esperanza.
 *  1 ship: move to Belgrano (1964). Port of Esperanza -> Weddell Sea -> front of the Filchner ice shelf.
 *  2 sled: Belgrano (1964-66). Front of the shelf -> Belgrano area -> place of the jump -> back to the front.
 *  3 ship: back to the peninsula (1967). Front of the Filchner ice shelf -> Weddell Sea -> port of Esperanza.
 *  4 sled: Esperanza (1967). Short patrol inland to Duse Bay and back to the port of Esperanza, where the trip ends: the
 *    way to Ushuaia (1973) is told in the last stop, not travelled (DEC-223).
 * The end of each leg is the start of the next one (the vehicle changes at the port).
 * Points between verified places are ILLUSTRATIVE, not a real track. Belgrano I, Jardinero cove and the site
 * of the AE-205 have no verified coordinate, so they are only drawn as approximate points on the ice shelf.
 * The sled legs never touch the water and keep 40 m or more above the sea (the ports apart) and the ship legs stay on
 * water (the ports apart: they are on the shore), checked against the relief in poncho-route.test.ts.
 */
export const PONCHO_SEGMENTS: readonly TripSegment[] = [
  { vehicle: 'sled', seconds: 30, waypoints: PENINSULA_ROUND_TRIP },
  { vehicle: 'ship', seconds: 14, waypoints: WEDDELL_SEA },
  { vehicle: 'sled', seconds: 14, waypoints: FILCHNER_LOOP },
  { vehicle: 'ship', seconds: 12, waypoints: reversed(WEDDELL_SEA) },
  { vehicle: 'sled', seconds: 12, waypoints: ESPERANZA_PATROL },
];

/**
 * Places and legs of the trip of the dogs (issue #78): where the team goes and by what vehicle. The stories
 * and the facts are in poncho.ts; this file only says where things are.
 */
import type { TripSegment } from './ushuaia.ts';

/**
 * Route of the team as [lon, lat] waypoints, in the order of the story: Base Esperanza (where Poncho was
 * born in 1961), the Foca nunataks and Base San Martín (the winter expedition of 1962), the Belgrano
 * area on the Filchner ice shelf (1964-66), the Santa Fe peak (the «Paralelo 82» patrol of 1965), back to
 * the Belgrano area and, in 1967, Duse Bay near Esperanza.
 *
 * ILLUSTRATIVE: it is not a logged track. The curve joins places whose coordinates are verified
 * (docs/expediciones/poncho-fuentes.md, section 3) and two approximate ones: Belgrano I has no verified
 * coordinate, so it is drawn on the Filchner ice shelf, and the way back to it is a second, nearby point.
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

/** The legs of the trip of the team, in the order of the story. For now a single leg on the sled: see the waypoints above. */
export const PONCHO_SEGMENTS: readonly TripSegment[] = [
  {
    vehicle: 'sled',
    seconds: 60,
    waypoints: [ESPERANZA, FOCA_NUNATAKS, SAN_MARTIN, BELGRANO_AREA, SANTA_FE_PEAK, BELGRANO_RETURN, DUSE_BAY],
  },
];


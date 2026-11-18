import { project } from '../projection.ts';
import type { Source } from './sea.ts';
import { MARAMBIO_GUIDING_QUESTION } from './marambio.ts';
import { ORCADAS_GUIDING_QUESTION } from './orcadas.ts';
import { POINT_DETAILS } from './point-details.ts';
import { FOSSIL_QUESTION } from './fossils.ts';

export type Tier = 'A' | 'B' | 'C';

export interface MapPoint {
  id: string;
  tier: Tier;
  title: string;
  place: string;
  /** Position in the 0..1000 map space (polar stereographic, see projection.ts). */
  x: number;
  y: number;
  q: string;
  /** Verified first description of a point without expedition. Without it the card is provisional. */
  desc?: string;
  /** Sources of `desc`: every sentence of it rests on one of them. */
  sources?: readonly Source[];
  /**
   * The point has a low-poly model on the 3D map: picking it flies the camera this close (world
   * units, 1 = 8 km) and the camera may come this close around it.
   */
  closeUp?: number;
}

/** Base Esperanza, where Poncho was born and where his trip starts (content/poncho.ts). */
const ESPERANZA = project(-57.0, -63.4);
/** Emperor colony of Snow Hill Island, on the sea ice off its south coast: 64°32' S, 57°26' W (Coria & Montalti 2000). */
const SNOW_HILL = project(-57.433, -64.533);

const POINTS: readonly MapPoint[] = [
  { id: 'marambio', tier: 'A', title: 'Base Marambio', place: 'Isla Marambio', x: 196, y: 300, q: MARAMBIO_GUIDING_QUESTION },
  { id: 'fosiles', tier: 'A', title: 'Fósiles', place: 'Isla James Ross', x: 188, y: 306, q: FOSSIL_QUESTION },
  { id: 'oceano', tier: 'A', title: 'Océano', place: 'Mar de Weddell', x: 322, y: 322, q: '¿Qué pasa debajo del hielo marino del Mar de Weddell?' },
  { id: 'poncho', tier: 'A', title: 'Poncho', place: 'Península Antártica · Base Esperanza', x: ESPERANZA.x, y: ESPERANZA.y, q: '¿Qué historia puede contar un perro polar argentino de trineo?' },
  { id: 'campana', tier: 'A', title: 'Desde Ushuaia', place: 'Ushuaia', x: 31.4, y: 313.5, q: '¿Cómo se llega desde Ushuaia hasta la Antártida?' },
  { id: 'orcadas', tier: 'A', title: 'Estación Orcadas', place: 'Islas Orcadas del Sur', x: 208, y: 205, q: ORCADAS_GUIDING_QUESTION },
  { id: 'polo', tier: 'C', title: 'El Polo Sur', place: 'Centro del continente', x: 500, y: 500, q: '¿Qué hay en el punto más austral del planeta?' },
  { id: 'testigos', tier: 'C', title: 'Testigos de hielo', place: 'Domo C', x: 674, y: 614, q: '¿Cómo puede el hielo guardar aire de otras épocas?' },
  { id: 'vostok', tier: 'C', title: 'Un lago bajo el hielo', place: 'Lago Vostok', x: 667, y: 548, q: '¿Puede haber agua líquida debajo de kilómetros de hielo?' },
  { id: 'erebus', tier: 'C', title: 'Volcán en el hielo', place: 'Monte Erebus, Isla de Ross', x: 539, y: 670, q: '¿Cómo conviven un volcán activo y el hielo?' },
  { id: 'thwaites', tier: 'C', title: 'Glaciares que cambian', place: 'Glaciar Thwaites, Mar de Amundsen', x: 301, y: 557, q: '¿Por qué la ciencia sigue tan de cerca a este glaciar?' },
  { id: 'belgrano', tier: 'C', title: 'Base Belgrano II', place: 'Sur del Mar de Weddell', x: 404, y: 361, q: '¿Cómo se trabaja tan cerca del Polo?' },
  { id: 'cerronevado', tier: 'C', title: 'Pingüinos de Cerro Nevado', place: 'Isla Cerro Nevado (Snow Hill), Mar de Weddell', x: SNOW_HILL.x, y: SNOW_HILL.y, q: '¿Por qué importa la colonia de emperador más al norte?' },
];

/** Close-up camera distance of the points with a model (closeUp). Erebus is a whole summit, seen from farther. */
const CLOSE_UP: Readonly<Record<string, number>> = { polo: 2.6, testigos: 2.6, vostok: 3.2, belgrano: 2.8, thwaites: 4.5, cerronevado: 2.2, erebus: 7 };

export const PTS: readonly MapPoint[] = POINTS.map((p) => ({ ...p, ...POINT_DETAILS[p.id], ...(CLOSE_UP[p.id] ? { closeUp: CLOSE_UP[p.id] } : {}) }));

export const TIER: Record<Tier, string> = { A: 'Expedición disponible', B: 'Ampliación prevista', C: 'Punto de interés' };

export const ORCADAS_POINT = PTS.find((p) => p.id === 'orcadas')!;
export const MARAMBIO_POINT = PTS.find((p) => p.id === 'marambio')!;
export const EXPEDITION_POINT = ORCADAS_POINT;
/** The trip from Ushuaia happens on the map itself, not on a separate screen. */
export const VOYAGE_POINT = PTS.find((p) => p.id === 'campana')!;
/** Poncho's trip also happens on the map, with the same engine as the one from Ushuaia. */
export const PONCHO_POINT = PTS.find((p) => p.id === 'poncho')!;
/** Points whose expedition is a trip over the map (not a separate screen). */
export const VOYAGE_POINTS: readonly MapPoint[] = [VOYAGE_POINT, PONCHO_POINT];
export const AVAILABLE_COUNT = PTS.filter((p) => p.tier === 'A').length;
/** Text of the map button that opens the list of points (#236). The e2e tests look it up by this name too. */
export const LIST_BUTTON_LABEL = 'Actividades';

import type { RoofShape, SiteColour, SiteConfidence } from './orcadas-site.ts';

/**
 * Measured site of Base Marambio (issue #74). Footprints, positions, bearings, names and colours
 * come from OpenStreetMap (ODbL 1.0, © colaboradores de OpenStreetMap), read on 14 Nov 2026 with
 * the Overpass API over the box -64.252, -56.665, -64.228, -56.600 (changeset 134877913, 13 Apr
 * 2023). See docs/expediciones/base-marambio-diseno.md.
 *
 * Positions are in the frame of the runway, in metres: `along` runs with the runway towards the
 * north-east (bearing 64.7°, measured on the OSM way) from its middle, `across` goes from its
 * centreline towards the south-east, the side where the whole base stands.
 */

/** Compass bearing of the runway axis in OpenStreetMap (way 155947844), degrees. */
export const MARAMBIO_RUNWAY_BEARING_DEG = 64.7;

export type MarambioKind = 'runway' | 'apron' | 'hangar' | 'terminal' | 'module' | 'commTower';

export interface MarambioElement {
  id: string;
  kind: MarambioKind;
  /** Name in OpenStreetMap; only named elements carry one. */
  name?: string;
  /** OpenStreetMap object the measures come from. */
  osm: string;
  /** Centre in the runway frame, metres: [along, across]. */
  center: readonly [number, number];
  /** Plan size in metres: [long side, short side]. */
  footprint: readonly [number, number];
  /** Compass bearing of the long side, degrees (0 = north, 90 = east). */
  bearingDeg: number;
  /** Height in metres. No source gives it: estimated from the reference photos. */
  heightM: number;
  colour?: SiteColour;
  roof?: RoofShape;
  source: string;
  /** `medido`: plan from OpenStreetMap. `estimado`: something of the element is not in the source. */
  confidence: SiteConfidence;
}

const OSM = 'OpenStreetMap (ODbL), consultado el 14 de noviembre de 2026';
/** One storey on stilts, as the reference photos show the modules. Estimated. */
const MODULE_HEIGHT_M = 4.5;

const building = (
  id: string,
  name: string,
  way: number,
  center: readonly [number, number],
  footprint: readonly [number, number],
  bearingDeg: number,
  heightM = MODULE_HEIGHT_M
): MarambioElement => ({
  id,
  kind: 'module',
  name,
  osm: `way ${way}`,
  center,
  footprint,
  bearingDeg,
  heightM,
  colour: 'orange',
  // OSM tags the two warehouses as gabled; the photos show the same roof on the other modules.
  roof: 'gabled',
  source: OSM,
  confidence: 'medido',
});

export const MARAMBIO_ELEMENTS: readonly MarambioElement[] = [
  {
    id: 'runway',
    kind: 'runway',
    osm: 'way 155947844',
    center: [0, 0],
    // Length measured on the OSM way (its `length` tag says 1260). The 40 m width is not in OpenStreetMap: it comes from the
    // aerodrome chart (SkyVector SAWB), which was not re-opened in this verification, so it is a measure of the model only.
    // The scene shows only a stretch.
    footprint: [1218, 40],
    bearingDeg: MARAMBIO_RUNWAY_BEARING_DEG,
    heightM: 0,
    source: OSM,
    confidence: 'estimado',
  },
  {
    id: 'apron',
    kind: 'apron',
    osm: 'way 1162265350',
    center: [102, 319],
    footprint: [62.8, 38.6],
    bearingDeg: 112,
    heightM: 0,
    source: OSM,
    confidence: 'medido',
  },
  {
    id: 'hangar',
    kind: 'hangar',
    osm: 'way 155947845',
    center: [142, 362],
    footprint: [33.9, 24.9],
    bearingDeg: 110,
    // Arched roof seen in the photos; its height has no source.
    heightM: 10,
    colour: 'orange',
    roof: 'round',
    source: OSM,
    confidence: 'medido',
  },
  {
    id: 'terminal',
    kind: 'terminal',
    name: 'Terminal Pasajeros',
    osm: 'way 203320555',
    center: [227, 100],
    footprint: [15.9, 7],
    bearingDeg: 60,
    heightM: MODULE_HEIGHT_M,
    colour: 'orange',
    roof: 'gabled',
    source: OSM,
    // The control tower drawn at its end is read from a photo, not mapped in OSM.
    confidence: 'estimado',
  },
  building('jp1', 'Batería JP1', 203320552, [265, 141], [22.1, 6.3], 49, 3.5),
  building('abastecimiento', 'Abastecimiento', 203320532, [131, 138], [16.9, 9.2], 17),
  building('deposito', 'Depósito', 203320540, [119, 151], [16.9, 9.2], 17),
  {
    id: 'commTower',
    kind: 'commTower',
    osm: 'node 10809166786',
    center: [107, 173],
    footprint: [4, 4],
    bearingDeg: MARAMBIO_RUNWAY_BEARING_DEG,
    // OSM maps only its position.
    heightM: 24,
    source: OSM,
    confidence: 'estimado',
  },
  building('sanidad', 'Sanidad', 313639733, [246, 376], [34.6, 18.2], 21, 5.5),
  building('jefatura', 'Jefatura', 313639732, [258, 404], [34.1, 12.9], 21),
  building('palermo', 'Alojamiento Palermo', 313639730, [280, 418], [35.9, 10.2], 21),
  building('comedor', 'Comedor y Sala de Juegos', 313639731, [317, 453], [35.2, 17.3], 21, 5.5),
  building('usina', 'Usina', 203320535, [-12, 379], [29.1, 11.4], 20, 5.5),
  building('obrador', 'Obrador', 203320543, [68, 406], [29.2, 11.5], 20, 5.5),
];

export function marambioElement(id: string): MarambioElement {
  const e = MARAMBIO_ELEMENTS.find((s) => s.id === id);
  if (!e) throw new Error(`Unknown Marambio site element: ${id}`);
  return e;
}

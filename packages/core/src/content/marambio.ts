import type { FactKind } from './orcadas.ts';
import { VOYAGE_SOURCES, type VoyageSourceCode } from './ushuaia.ts';

/**
 * Content of the Base Marambio diorama (issue #74): a few points of interest to walk, each with
 * short facts. Every sentence and the quote that holds it are in docs/expediciones/base-marambio.md.
 */

export type MarambioSpotId = 'runway' | 'hercules' | 'hangar' | 'tower' | 'buildings' | 'plateau';

export interface MarambioSource {
  id: string;
  label: string;
  /** Short name for the clickable reference under each fact. */
  short: string;
  org: string;
  url: string;
  consulted: string;
  license?: string;
}

export interface MarambioFact {
  id: string;
  /** The point of interest it belongs to, or the scene label («Reconstrucción ilustrada»). */
  spot: MarambioSpotId | 'scene';
  kind: FactKind;
  text: string;
  sourceIds: readonly string[];
}

export interface MarambioSpot {
  id: MarambioSpotId;
  label: string;
  shortLabel: string;
  subtitle: string;
}

export const MARAMBIO_TITLE = 'Base Marambio';
export const MARAMBIO_GUIDING_QUESTION = '¿Cómo funciona una base donde aterrizan aviones sobre una meseta congelada?';

/** Every source below was opened again on this date, also the ones shared with «Desde Ushuaia». */
const CONSULTED = '14 de noviembre de 2026';

/** A source the trip from Ushuaia already cites: same organisation, title and URL, read again for this content. */
const shared = (code: VoyageSourceCode, id: string, short: string): MarambioSource => {
  const { org, title, url } = VOYAGE_SOURCES[code];
  return { id, label: title, short, org, url, consulted: CONSULTED };
};

export const MARAMBIO_OSM_SOURCE_ID = 'osm';

export const MARAMBIO_SOURCES: readonly MarambioSource[] = [
  {
    id: 'dna-base',
    label: 'Base Marambio',
    short: 'Cancillería',
    org: 'Cancillería Argentina · Dirección Nacional del Antártico',
    url: 'https://cancilleria.gob.ar/es/iniciativas/dna/antartida-argentina/bases/marambio',
    consulted: CONSULTED,
  },
  shared('O2', 'armada-bases', 'Armada'),
  shared('O24', 'armada-irizar', 'Armada, 2025'),
  shared('O45', 'faa-aniversario', 'Fuerza Aérea, 2020'),
  shared('O12', 'dna-historia', 'Cancillería, línea histórica'),
  shared('O13', 'cancilleria-c130', 'Cancillería, primer C-130'),
  shared('O10', 'dna-logistica', 'Cancillería, logística'),
  shared('O14', 'faa-escuadron', 'Fuerza Aérea, 2023'),
  {
    id: MARAMBIO_OSM_SOURCE_ID,
    label: 'OpenStreetMap: pista, plataforma, hangar y edificios de la Base Marambio',
    short: 'OpenStreetMap',
    org: 'colaboradores de OpenStreetMap',
    url: 'https://www.openstreetmap.org/#map=16/-64.2400/-56.6300',
    consulted: CONSULTED,
    license: 'ODbL 1.0 (© colaboradores de OpenStreetMap)',
  },
];

const SOURCE_MAP = new Map<string, MarambioSource>(MARAMBIO_SOURCES.map((src) => [src.id, src]));

export const MARAMBIO_FACTS: readonly MarambioFact[] = [
  // scene: what the «Reconstrucción ilustrada» label says
  {
    id: 'scene-diorama',
    spot: 'scene',
    kind: 'recon',
    text: 'El diorama de la base es una reconstrucción ilustrada, no un modelo a escala. Las plantas, los nombres y los colores de los edificios salen de OpenStreetMap, un mapa colaborativo; los lugares donde están se acercaron, en el mismo orden, para que la base entre en una sola vista.',
    sourceIds: [MARAMBIO_OSM_SOURCE_ID],
  },
  {
    id: 'scene-recortes',
    spot: 'scene',
    kind: 'recon',
    text: 'La pista tiene unos 1,2 km de largo en OpenStreetMap y acá se dibuja solo un tramo; el borde de la meseta está dibujado más cerca y más bajo. La torre de control, las alturas, los techos y la pintura del avión son ilustrativos: se tomaron de fotos de referencia.',
    sourceIds: [MARAMBIO_OSM_SOURCE_ID],
  },

  // plateau
  {
    id: 'plateau-meseta',
    spot: 'plateau',
    kind: 'real',
    text: 'La base está sobre una meseta de la Isla Marambio, en el Mar de Weddell, a unos 200 m sobre el nivel del mar.',
    sourceIds: ['armada-irizar', 'armada-bases'],
  },
  {
    id: 'plateau-fundacion',
    spot: 'plateau',
    kind: 'real',
    text: 'Se fundó el 29 de octubre de 1969. Es la única base argentina con pista de aterrizaje para aviones de carga y pasajeros.',
    sourceIds: ['armada-bases'],
  },
  {
    id: 'plateau-puerta',
    spot: 'plateau',
    kind: 'real',
    text: 'Es la principal puerta de entrada de la logística argentina en la Antártida. Desde acá sale el mayor número de campamentos científicos en la campaña de verano.',
    sourceIds: ['dna-base'],
  },

  // runway
  {
    id: 'runway-permafrost',
    spot: 'runway',
    kind: 'real',
    text: 'Fue «la primera pista de aterrizaje de tierra, precisamente permafrost, en el Continente Antártico». Los aviones aterrizan sobre una mezcla congelada de tierra, hielo y piedra.',
    sourceIds: ['dna-historia', 'faa-escuadron'],
  },
  {
    id: 'runway-patrulla',
    spot: 'runway',
    kind: 'real',
    text: 'El 30 de agosto de 1969 un grupo de la Fuerza Aérea Argentina, la Patrulla Soberanía, acampó en la meseta y empezó la pista. La abrieron 21 hombres con barretas, picos y palas.',
    sourceIds: ['dna-base', 'faa-aniversario'],
  },
  {
    id: 'runway-medidas',
    spot: 'runway',
    kind: 'real',
    // The 1,200 x 35 m figure is in the present tense in a 2020 note, so it is dated, not given as the runway as first built.
    // The source does not say the aircraft that used the 300 m strip was the first one (see «Pendientes» in the docs).
    text: 'A las pocas semanas de trabajo ya aterrizó un avión en una pista de 300 m. A fines de octubre de 1969 llegó a 800 m. En 2020 la Fuerza Aérea le daba 1.200 m de largo por 35 m de ancho.',
    sourceIds: ['dna-base', 'faa-aniversario'],
  },

  // hercules
  {
    id: 'hercules-primero',
    spot: 'hercules',
    kind: 'real',
    text: 'El primer Hércules C-130 aterrizó con ruedas en Marambio el 11 de abril de 1970. Era el TC-61 y había despegado de Río Gallegos.',
    sourceIds: ['cancilleria-c130', 'dna-base'],
  },
  {
    id: 'hercules-puente',
    spot: 'hercules',
    kind: 'real',
    text: 'Los Hércules cruzan desde Río Gallegos o Ushuaia. Desde Río Gallegos el vuelo dura tres horas y media.',
    sourceIds: ['dna-logistica', 'faa-escuadron'],
  },
  {
    id: 'hercules-carga',
    spot: 'hercules',
    kind: 'real',
    // In the source the subject of the first sentence is the runway (the air link), not the Hercules.
    text: 'Con la pista, el avión se sumó a la logística antártica: traslado de pasajeros, víveres, equipos y maquinaria, y evacuaciones sanitarias en una emergencia. Los Hércules C-130 son el único medio aéreo que mantiene el puente aéreo, durante todo el año.',
    sourceIds: ['faa-aniversario'],
  },
  {
    id: 'hercules-ilustracion',
    spot: 'hercules',
    kind: 'recon',
    text: 'El avión del diorama es una ilustración: su pintura se tomó de fotos de referencia y está estacionado en la plataforma para que se vea junto a la base.',
    sourceIds: [],
  },

  // hangar
  {
    id: 'hangar-osm',
    spot: 'hangar',
    // Rests only on a collaborative map: not labelled «Dato real».
    kind: 'recon',
    text: 'OpenStreetMap, un mapa colaborativo, ubica un hangar junto a la plataforma donde estacionan los aviones. De ahí lo toma esta reconstrucción.',
    sourceIds: [MARAMBIO_OSM_SOURCE_ID],
  },
  {
    id: 'hangar-twin-otter',
    spot: 'hangar',
    kind: 'real',
    text: 'En Marambio hay un avión Twin Otter DHC-6 apostado en forma permanente. En verano también operan desde la base helicópteros Bell 412.',
    sourceIds: ['dna-logistica'],
  },
  {
    id: 'hangar-forma',
    spot: 'hangar',
    kind: 'recon',
    text: 'La planta del hangar sale de OpenStreetMap. Su techo curvo y su altura son una reconstrucción a partir de fotos de referencia.',
    sourceIds: [MARAMBIO_OSM_SOURCE_ID],
  },

  // tower
  {
    id: 'tower-foto',
    spot: 'tower',
    kind: 'recon',
    text: 'La torre de control es una reconstrucción a partir de una foto. No figura en los datos de OpenStreetMap que usamos: la dibujamos en la punta del edificio que ese mapa llama «Terminal Pasajeros».',
    sourceIds: [MARAMBIO_OSM_SOURCE_ID],
  },
  {
    id: 'tower-comunicaciones',
    spot: 'tower',
    kind: 'recon',
    text: 'La torre de comunicaciones sí está en OpenStreetMap, que solo marca dónde se encuentra. Su altura en el diorama es ilustrativa.',
    sourceIds: [MARAMBIO_OSM_SOURCE_ID],
  },

  // buildings
  {
    id: 'buildings-gente',
    spot: 'buildings',
    kind: 'real',
    text: 'En la base viven en promedio 70 personas en invierno y 170 en verano.',
    sourceIds: ['faa-aniversario'],
  },
  {
    id: 'buildings-ciencia',
    spot: 'buildings',
    kind: 'real',
    text: 'Desde 1994 funciona en la base el Laboratorio Antártico Multidisciplinario Marambio (LAMBI), que registra el ozono. El Servicio Meteorológico Nacional estudia el tiempo de la zona y hace radiosondeos.',
    sourceIds: ['dna-base'],
  },
  {
    id: 'buildings-nombres',
    spot: 'buildings',
    // Rests only on a collaborative map: not labelled «Dato real».
    kind: 'recon',
    text: 'En esta reconstrucción, los nombres de los edificios salen de OpenStreetMap, un mapa colaborativo: Sanidad, Jefatura, Alojamiento Palermo, Comedor y Sala de Juegos, Usina, Obrador, Abastecimiento, Depósito y Batería JP1.',
    sourceIds: [MARAMBIO_OSM_SOURCE_ID],
  },
  {
    id: 'buildings-forma',
    spot: 'buildings',
    kind: 'recon',
    text: 'El diorama muestra una selección de edificios. El color naranja es el que les da OpenStreetMap; las alturas y los techos son ilustrativos, tomados de fotos de referencia.',
    sourceIds: [MARAMBIO_OSM_SOURCE_ID],
  },
];

/** In tour order. */
export const MARAMBIO_SPOTS: readonly MarambioSpot[] = [
  { id: 'plateau', label: 'La meseta', shortLabel: 'Meseta', subtitle: 'Isla Marambio, Mar de Weddell' },
  { id: 'runway', label: 'La pista', shortLabel: 'Pista', subtitle: 'Pista de tierra sobre permafrost' },
  { id: 'hercules', label: 'Hércules C-130', shortLabel: 'Hércules', subtitle: 'El avión del puente aéreo' },
  { id: 'hangar', label: 'El hangar', shortLabel: 'Hangar', subtitle: 'Junto a la plataforma' },
  { id: 'tower', label: 'La torre de control', shortLabel: 'Torre', subtitle: 'Reconstruida a partir de una foto' },
  { id: 'buildings', label: 'Los edificios', shortLabel: 'Edificios', subtitle: 'Donde se vive y se trabaja' },
];

export function marambioFacts(spot: MarambioSpotId | 'scene'): readonly MarambioFact[] {
  return MARAMBIO_FACTS.filter((fact) => fact.spot === spot);
}

export function marambioSourcesOf(fact: MarambioFact): readonly MarambioSource[] {
  return fact.sourceIds.map((id) => SOURCE_MAP.get(id)).filter((src): src is MarambioSource => src !== undefined);
}

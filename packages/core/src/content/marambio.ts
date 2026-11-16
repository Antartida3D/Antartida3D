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
  spot: MarambioSpotId | 'scene' | 'months';
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
  {
    id: 'smn-normales',
    label: 'Estadísticas Climatológicas Normales: República Argentina, período 1991-2020 (Base Marambio, pp. 792-799)',
    short: 'SMN, normales 1991-2020',
    org: 'Servicio Meteorológico Nacional',
    url: 'https://repositorio.smn.gob.ar/bitstream/handle/20.500.12160/2506/estad%C3%ADsticas_climatol%C3%B3gicas_normales_1991-2020.pdf?sequence=4&isAllowed=y',
    consulted: '15 de noviembre de 2026',
  },
  {
    id: 'smn-clima',
    label: 'Clima en Argentina: Base Marambio (copia del Internet Archive del 4 de septiembre de 2017)',
    short: 'SMN, clima de Marambio',
    org: 'Servicio Meteorológico Nacional',
    url: 'https://web.archive.org/web/20170904145118/http://www.smn.gov.ar/serviciosclimaticos/?mod=elclima&id=69',
    consulted: '15 de noviembre de 2026',
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
    text: 'Fue “la primera pista de aterrizaje de tierra, precisamente permafrost, en el Continente Antártico”. Los aviones aterrizan sobre una mezcla congelada de tierra, hielo y piedra.',
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
    text: 'La torre de control es una reconstrucción a partir de una foto. No figura en los datos de OpenStreetMap que usamos: la dibujamos en la punta del edificio que ese mapa llama “Terminal Pasajeros”.',
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

  // months: the strip of months and the blizzard of the scene
  {
    id: 'months-ventisca',
    spot: 'months',
    kind: 'real',
    text: 'El Servicio Meteorológico Nacional cuenta los días con ventisca en Marambio. En julio hay en promedio 12 días con ventisca alta; en enero, 2 (promedio de 1991 a 2020).',
    sourceIds: ['smn-normales'],
  },
  {
    id: 'months-clima',
    spot: 'months',
    kind: 'real',
    text: 'El Servicio Meteorológico Nacional describe un clima riguroso, con temperaturas medias que rara vez superan los 0 °C y fuertes vientos.',
    sourceIds: ['smn-clima'],
  },
  {
    id: 'months-temperatura',
    spot: 'months',
    kind: 'real',
    text: 'La temperatura media va de -0,8 °C en enero a -14,9 °C en junio y en julio (promedio de 1991 a 2020).',
    sourceIds: ['smn-normales'],
  },
  {
    id: 'months-simulacion',
    spot: 'months',
    kind: 'sim',
    text: 'La nieve que vuela en la escena es una simulación: es más intensa en los meses con más días de ventisca alta según el Servicio Meteorológico Nacional. No muestra la fuerza real del viento.',
    sourceIds: ['smn-normales'],
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

/**
 * The photographs of Eduardo Olivero shown at the points of interest (#207). A family archive has
 * no URL, so it is not one of MARAMBIO_SOURCES; the sources panel lists it apart.
 */
export const MARAMBIO_PHOTO_ARCHIVE = {
  label: 'Archivo fotográfico de E. B. Olivero',
  org: 'Familia Olivero',
  consulted: '16 de noviembre de 2026',
  detail: 'Fotografías tomadas por Eduardo Olivero en sus campañas antárticas, aportadas por la familia con autorización para publicarlas en este proyecto. Las fechas son las que registró la cámara; la foto del grupo es un escaneo y no guarda fecha ni lugar.',
} as const;

export type MarambioPhotoId =
  | 'hercules-runway' | 'hercules-anniversary' | 'hercules-group' | 'hangar-cargo'
  | 'polar-depot' | 'historic-house' | 'field-helicopter';

export interface MarambioPhoto {
  id: MarambioPhotoId;
  /** The point of interest that shows it: each photograph is in one point only. */
  spot: MarambioSpotId;
  alt: string;
  caption: string;
  /** As the camera recorded it; null when the file keeps no date. */
  date: string | null;
}

export const MARAMBIO_PHOTO_CREDIT = 'Foto: Eduardo Olivero · Archivo E. B. Olivero, publicación autorizada por la familia';

/** In the order they are shown inside each point. */
export const MARAMBIO_PHOTOS: readonly MarambioPhoto[] = [
  {
    id: 'field-helicopter', spot: 'plateau', date: '22 de febrero de 2011',
    alt: 'Un helicóptero blanco y naranja de la Fuerza Aérea Argentina, con la matrícula H-81, descarga equipos sobre un suelo de piedras junto al mar con hielo flotante; dos personas ordenan bolsos y otra saca fotos',
    caption: 'Un helicóptero deja a un equipo y su carga en el campo',
  },
  {
    id: 'hercules-runway', spot: 'runway', date: '3 de febrero de 2014',
    alt: 'Un Hércules C-130 pasa a baja altura sobre la pista de tierra con manchas de nieve, bajo un cielo gris; adelante, una baranda roja y tambores naranjas',
    caption: 'Un Hércules sobre la pista de tierra',
  },
  {
    id: 'hercules-anniversary', spot: 'hercules', date: '21 de enero de 2009',
    alt: 'Un Hércules C-130 con camuflaje verde y marrón estacionado sobre la pista; en la cola, la bandera argentina y un escudo con el número 40 y la palabra «Aniversario». Personas con camperas naranjas caminan alrededor',
    caption: 'Un Hércules en la plataforma, con «40 Aniversario» en la cola',
  },
  {
    id: 'hercules-group', spot: 'hercules', date: null,
    alt: 'Un grupo de unas treinta personas, casi todas con camperas y pantalones naranjas de abrigo, posa frente a un Hércules C-130 con la matrícula TC-68, sobre una plataforma sin nieve',
    caption: 'Un grupo de campaña antártica frente al Hércules TC-68',
  },
  {
    id: 'hangar-cargo', spot: 'hangar', date: '27 de enero de 2011',
    alt: 'Cajones de madera, bolsos y bultos naranjas apilados frente a un hangar rojo de techo curvo con la palabra MARAMBIO pintada en celeste y blanco; varias personas con ropa de abrigo esperan al lado',
    caption: 'Carga de una campaña frente al hangar',
  },
  {
    id: 'polar-depot', spot: 'buildings', date: '24 de enero de 2009',
    alt: 'Una casilla roja de chapa con techo a dos aguas, la bandera argentina, un escudo redondo y un cartel que dice «Depósito Polar Adelantado», sobre una plataforma verde con escarcha',
    caption: 'La casilla del «Depósito Polar Adelantado»',
  },
  {
    id: 'historic-house', spot: 'buildings', date: '24 de enero de 2009',
    alt: 'Una casilla roja y gastada con un cartel que dice «Casa Histórica - I, año 1970», junto a una pasarela con baranda y nieve; atrás, la casilla del Depósito Polar Adelantado',
    caption: 'La «Casa Histórica - I», con un cartel que dice «año 1970»',
  },
];

export function marambioPhotos(spot: MarambioSpotId): readonly MarambioPhoto[] {
  return MARAMBIO_PHOTOS.filter((photo) => photo.spot === spot);
}

export function marambioFacts(spot: MarambioSpotId | 'scene' | 'months'): readonly MarambioFact[] {
  return MARAMBIO_FACTS.filter((fact) => fact.spot === spot);
}

export function marambioSourcesOf(fact: MarambioFact): readonly MarambioSource[] {
  return fact.sourceIds.map((id) => SOURCE_MAP.get(id)).filter((src): src is MarambioSource => src !== undefined);
}

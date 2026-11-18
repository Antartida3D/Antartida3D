import type { Chapter } from '../orcadas.ts';

export const ORCADAS_GUIDING_QUESTION = '¿Cuánto cambió el clima de la isla Laurie en 120 años?';

/** Activity summary for the pre-expedition intro sheet (describes user actions, not scientific data). */
export const ORCADAS_INTRO_DESC =
  'Recorré la base, medí el tiempo como si estuvieras de guardia y revisá más de cien años de datos para responder la pregunta.';

/** Short chapter names (buttons, Sources panel) and panel headings. Single source for the UI. */
export const CHAPTER_NAMES: Record<Chapter, string> = {
  arrival: 'Llegar',
  observation: 'Observar',
  journey: 'Viajar',
  answer: 'Responder',
};

export const CHAPTER_HEADINGS: Record<Chapter, string> = {
  // The top bar already names the station: the first chapter opens with the question.
  arrival: ORCADAS_GUIDING_QUESTION,
  observation: 'Observación del día',
  journey: 'Viaje en el tiempo',
  answer: 'La respuesta',
};

/** Real, sourced facts highlighted in the pre-expedition intro sheet. */
export const ORCADAS_INTRO_FACT_IDS = [
  'arrival-antiguedad',
  'obs-registro-1903',
  'eras-traspaso-1904',
] as const;

export type FactKind = 'real' | 'sim' | 'recon' | 'calc';

export const FACT_KIND_LABEL: Record<FactKind, string> = {
  real: 'Dato real',
  sim: 'Simulación',
  recon: 'Reconstrucción',
  calc: 'Cálculo',
};

export interface OrcadasSource {
  id: string;
  label: string;
  /** Short name for the clickable reference under each fact. */
  short: string;
  org: string;
  url: string;
  consulted: string;
  license?: string;
  verified: boolean;
}

/**
 * Where a fact is shown: a chapter, the month strip that stays on screen in every chapter,
 * or the scene label («Reconstrucción ilustrada»).
 */
export type FactPlace = Chapter | 'months' | 'scene';

export interface OrcadasFact {
  id: string;
  chapter: FactPlace;
  kind: FactKind;
  title?: string;
  text: string;
  sourceIds: readonly string[];
}

export const ORCADAS_SOURCES: readonly OrcadasSource[] = [
  {
    id: 'cancilleria',
    label: 'Base Orcadas',
    short: 'Cancillería',
    org: 'Cancillería Argentina · Dirección Nacional del Antártico',
    url: 'https://cancilleria.gob.ar/es/iniciativas/dna/antartida-argentina/bases/orcadas',
    consulted: '11 de noviembre de 2026',
    verified: true,
  },
  {
    id: 'armada',
    label: 'Bases permanentes',
    short: 'Armada',
    org: 'Armada Argentina',
    url: 'https://www.argentina.gob.ar/armada/antartida/bases-permanentes',
    consulted: '11 de noviembre de 2026',
    verified: true,
  },
  {
    id: 'reader',
    label: 'READER: datos de superficie de Orcadas',
    short: 'SCAR READER',
    org: 'SCAR · British Antarctic Survey',
    url: 'https://legacy.bas.ac.uk/met/READER/surface/Orcadas.All.temperature.html',
    consulted: '11 de noviembre de 2026',
    license: 'Open Government Licence v3.0',
    verified: true,
  },
  {
    id: 'zazulie2010',
    label: 'Zazulie, Rusticucci y Solomon (2010)',
    short: 'Zazulie y otros (2010)',
    org: 'Journal of Climate 23(1)',
    url: 'https://doi.org/10.1175/2009JCLI3074.1',
    consulted: '11 de noviembre de 2026',
    verified: true,
  },
  {
    id: 'mossman1907',
    label: 'R. C. Mossman (1907)',
    short: 'Mossman (1907)',
    org: 'Report on the Scientific Results of the Voyage of S.Y. Scotia, vol. II, Meteorology',
    url: 'https://archive.org/details/reportonscientif02scot',
    consulted: '12 de noviembre de 2026',
    verified: true,
  },
  {
    id: 'oscar',
    label: 'OMM · OSCAR/Surface, estación 88968',
    short: 'OMM',
    org: 'OMM',
    url: 'https://oscar.wmo.int/surface/#/search/station/stationReportDetails/12480',
    consulted: '11 de noviembre de 2026',
    verified: true,
  },
  {
    id: 'comnap',
    label: 'Antarctic Station Catalogue (Argentina)',
    short: 'COMNAP',
    org: 'COMNAP',
    url: 'https://www.comnap.aq/s/Argentina_Catalogue_Aug2017.pdf',
    consulted: '12 de noviembre de 2026',
    verified: true,
  },
  {
    id: 'hsm42',
    label: 'Sitio y Monumento Histórico N.º 42',
    short: 'Tratado Antártico',
    org: 'Secretaría del Tratado Antártico',
    url: 'https://www.ats.aq/devph/en/apa-database/119',
    consulted: '12 de noviembre de 2026',
    verified: true,
  },
  {
    id: 'armada-relevo-2025',
    label: 'El rompehielos ARA "Almirante Irízar" avanza en la Campaña Antártica de Verano (15 dic 2025)',
    short: 'Armada, 2025',
    org: 'Armada Argentina',
    url: 'https://www.argentina.gob.ar/noticias/el-rompehielos-ara-almirante-irizar-avanza-en-la-campana-antartica-de-verano',
    consulted: '13 de noviembre de 2026',
    verified: true,
  },
] as const;

const SOURCE_MAP = new Map<string, OrcadasSource>(
  ORCADAS_SOURCES.map((src) => [src.id, src])
);

export const ORCADAS_FACTS: readonly OrcadasFact[] = [
  // arrival
  {
    id: 'arrival-istmo',
    chapter: 'arrival',
    kind: 'real',
    title: 'Entre dos bahías',
    text: 'La Base Orcadas está en el istmo Ibarguren, una franja angosta de tierra en la isla Laurie (Orcadas del Sur), con la bahía Scotia de un lado y la bahía Uruguay del otro.',
    sourceIds: ['cancilleria'],
  },
  {
    id: 'arrival-antiguedad',
    chapter: 'arrival',
    kind: 'real',
    title: 'La base más antigua',
    text: 'Orcadas es la base más antigua de toda la Antártida y el primer lugar del continente con presencia humana estable.',
    sourceIds: ['cancilleria', 'armada'],
  },
  {
    id: 'arrival-fauna',
    chapter: 'arrival',
    kind: 'real',
    title: 'Fauna de la isla',
    text: 'Alrededor de la base hay colonias de pingüinos barbijo y adelia. Por el aire andan skúas, gaviotas cocineras y tres tipos de petreles (de las tormentas, de las nieves y damero), y sobre la costa descansan elefantes marinos, lobos finos antárticos y focas de Weddell y cangrejeras.',
    sourceIds: ['cancilleria'],
  },
  {
    id: 'arrival-transporte',
    chapter: 'arrival',
    kind: 'real',
    title: 'Cómo se llega y se descarga',
    text: 'Solo se puede llegar en barco o en helicóptero entre noviembre y marzo, cuando la base recibe unas 25 visitas de buques por año. Como no tiene muelle, la dotación y los víveres bajan en la playa con dos botes Zodiac con motor fuera de borda.',
    sourceIds: ['comnap'],
  },
  {
    id: 'arrival-relevo-sea-king',
    chapter: 'arrival',
    kind: 'real',
    title: 'Cuando el hielo frena al buque',
    text: 'En diciembre de 2025 el hielo no dejó pasar al rompehielos Irízar, que se tuvo que quedar en la bahía Scotia. Entonces un helicóptero Sea King hizo 23 vuelos en poco más de dos horas para bajar combustible, científicos y a las 21 personas de la nueva dotación al helipuerto.',
    sourceIds: ['armada-relevo-2025', 'comnap'],
  },
  {
    id: 'arrival-diorama',
    chapter: 'scene',
    kind: 'recon',
    title: 'Sobre esta escena 3D',
    text: 'Esta maqueta es una reconstrucción ilustrada para recorrer la base, no un plano a escala real.',
    sourceIds: [],
  },

  // observation
  {
    id: 'obs-registro-1903',
    chapter: 'observation',
    kind: 'real',
    title: 'Más de 120 años sin parar',
    text: 'Desde abril de 1903 se anota todos los meses la temperatura en la estación. Ese registro sigue abierto hasta hoy.',
    sourceIds: ['reader'],
  },
  {
    id: 'obs-simulacion',
    chapter: 'observation',
    kind: 'sim',
    title: 'Qué estás midiendo acá',
    text: 'El día que vas a medir acá es una simulación: armamos un día posible usando los promedios y variaciones reales de ese mes en Orcadas.',
    sourceIds: [],
  },
  {
    id: 'obs-estacion-centenaria',
    chapter: 'observation',
    kind: 'real',
    title: 'Estación centenaria de la OMM',
    text: 'La Organización Meteorológica Mundial reconoce a Orcadas como estación centenaria por llevar más de cien años midiendo el tiempo en el mismo lugar. En la red mundial figura con el código 0-20000-0-88968.',
    sourceIds: ['oscar'],
  },
  {
    id: 'obs-instrumental-1903',
    chapter: 'observation',
    kind: 'real',
    title: 'Los instrumentos de 1903',
    text: 'En 1903 el observatorio ya tenía cuatro de estas casillas (abrigos meteorológicos) con termómetros para medir temperatura, humedad, máximas y mínimas, equipos que dibujaban los cambios en papel, un barómetro para la presión y una esfera de vidrio para contar las horas de sol. El medidor de viento estaba en la cubierta del barco Scotia, anclado en la bahía.',
    sourceIds: ['mossman1907'],
  },

  // months (month strip)
  {
    id: 'year-sol-luz',
    chapter: 'months',
    kind: 'calc',
    title: 'Cómo se calcula la luz',
    text: 'Las horas de luz y la altura del sol se calculan según la latitud de la base (60° 44′ sur).',
    sourceIds: [],
  },
  {
    id: 'year-hielo-bahia',
    chapter: 'months',
    kind: 'sim',
    title: 'El hielo en la escena',
    text: 'El hielo de la bahía mes a mes es una simulación ilustrativa para mostrar las estaciones, no una medición real.',
    sourceIds: [],
  },
  {
    id: 'year-hielo-octubre',
    chapter: 'months',
    kind: 'real',
    title: 'Cuándo se abre la bahía',
    text: 'En octubre empieza a romperse el hielo marino que cierra la bahía frente a la base.',
    sourceIds: ['comnap'],
  },
  {
    id: 'year-fauna-meses',
    chapter: 'months',
    kind: 'sim',
    title: 'La fauna mes a mes',
    text: 'Acá mostramos a los animales de forma ilustrativa para ver cómo cambian entre verano e invierno, no como un conteo real.',
    sourceIds: [],
  },

  // journey: eras
  {
    id: 'eras-expedicion-bruce',
    chapter: 'journey',
    kind: 'real',
    title: '1903: el observatorio escocés',
    text: 'El 1 de abril de 1903 la expedición escocesa de William Speirs Bruce inauguró el observatorio en la isla Laurie. Así empezó la serie de mediciones más larga de la Antártida.',
    sourceIds: ['cancilleria'],
  },
  {
    id: 'eras-decreto-1904',
    chapter: 'journey',
    kind: 'real',
    title: '1904: el acuerdo de traspaso',
    text: 'El 2 de enero de 1904, por el decreto 3073, la Argentina aceptó las instalaciones de la expedición escocesa y se las dejó a cargo de la Oficina Meteorológica Argentina.',
    sourceIds: ['cancilleria'],
  },
  {
    id: 'eras-traspaso-1904',
    chapter: 'journey',
    kind: 'real',
    title: 'La bandera desde 1904',
    text: 'El 22 de febrero de 1904 la estación pasó a manos argentinas. Desde ese día la bandera argentina flamea ahí sin parar.',
    sourceIds: ['cancilleria'],
  },
  {
    id: 'eras-hugo-acuna',
    chapter: 'journey',
    kind: 'real',
    title: 'El diario de Hugo Acuña',
    text: 'En esa primera dotación viajó Hugo Acuña, un joven estafeta encargado del correo postal que dejó un diario contando cómo fue pasar ese primer invierno.',
    sourceIds: ['cancilleria'],
  },
  {
    id: 'eras-casa-moneta-1905',
    chapter: 'journey',
    kind: 'real',
    title: '1905: nace Casa Moneta',
    text: 'En 1905 se levantó la casa principal junto al pequeño observatorio de piedra de 1903 (Casa Omond). Hoy esa casa funciona como museo y se llama Casa Moneta.',
    sourceIds: ['cancilleria'],
  },
  {
    id: 'eras-radio-1927',
    chapter: 'journey',
    kind: 'real',
    title: '1927: la primera radio antártica',
    text: 'En 1927 se inauguró en Orcadas la primera estación de radio de la Antártida, que logró la primera comunicación radiotelegráfica con el territorio argentino en el continente americano.',
    sourceIds: ['cancilleria'],
  },
  {
    id: 'eras-dotacion-nativa-1927',
    chapter: 'journey',
    kind: 'real',
    title: 'Primera dotación de argentinos nativos',
    text: 'Ese mismo año invernó en la base la primera dotación formada entera por argentinos nativos, con José Moneta como jefe.',
    sourceIds: ['armada'],
  },
  {
    id: 'eras-jose-moneta',
    chapter: 'journey',
    kind: 'real',
    title: 'Las películas y libros de Moneta',
    text: 'José Manuel Moneta, técnico del Servicio Meteorológico, pasó cuatro inviernos en la isla. Contó esa experiencia en el libro “Cuatro años en las Orcadas del Sur” y en 1927 filmó “Entre los hielos de las Islas Orcadas”.',
    sourceIds: ['cancilleria'],
  },
  {
    id: 'eras-unica-base',
    chapter: 'journey',
    kind: 'real',
    title: 'Cuarenta años en soledad',
    text: 'Durante sus primeros cuarenta años, Orcadas fue la única base argentina y la única estación en todas las islas Orcadas del Sur.',
    sourceIds: ['cancilleria'],
  },
  {
    id: 'eras-traspaso-armada',
    chapter: 'journey',
    kind: 'real',
    title: 'El paso a la Armada',
    text: 'En 1951 el observatorio pasó a depender de la Armada Argentina como Destacamento Naval Orcadas del Sur (según la Armada fue en 1951; Cancillería registra 1952).',
    sourceIds: ['armada', 'cancilleria'],
  },

  // journey: century
  {
    id: 'century-promedios-temp',
    chapter: 'journey',
    kind: 'calc',
    title: 'El mes más frío y el menos frío',
    text: 'Si promediamos más de un siglo de datos, julio es el mes más frío (−10,0 °C) y febrero el más templado, apenas arriba de cero (+0,8 °C).',
    sourceIds: ['reader'],
  },
  {
    id: 'century-record-frio',
    chapter: 'journey',
    kind: 'real',
    title: 'El récord de 1930',
    text: 'En julio de 1930 se midió el mes más frío de toda la historia de la base: −21,2 °C de promedio mensual.',
    sourceIds: ['reader'],
  },
  {
    id: 'century-tendencia-zazulie',
    chapter: 'journey',
    kind: 'real',
    title: 'Qué cambió desde 1950',
    text: 'Un estudio sobre los registros diarios de Orcadas mostró algo claro: entre 1903 y 1950 la temperatura no siguió una dirección definida, pero desde 1950 viene subiendo de forma sostenida en las cuatro estaciones del año.',
    sourceIds: ['zazulie2010'],
  },

  // answer
  {
    id: 'done-monumento-hsm42',
    chapter: 'answer',
    kind: 'real',
    title: 'Sitio y Monumento Histórico N.º 42',
    text: 'La vieja casa de piedra de 1903 (Casa Omond), la casa principal de 1905 (Casa Moneta) y el cementerio de al lado forman el Sitio y Monumento Histórico N.º 42 del Tratado Antártico.',
    sourceIds: ['cancilleria', 'hsm42'],
  },
  {
    id: 'done-laborc-actual',
    chapter: 'answer',
    kind: 'real',
    title: 'Lo que se investiga hoy en Orcadas',
    text: 'Más de cien años después de aquella casilla de piedra, en Orcadas se sigue investigando todo el año. Gran parte del trabajo se hace en el laboratorio LABORC, donde estudian el clima en superficie y en altura, los glaciares, las rocas, el magnetismo terrestre, la atmósfera y la biología.',
    sourceIds: ['cancilleria'],
  },
] as const;

/** A 'real' fact is shown only if every one of its sources is verified; other kinds are always shown, labelled. */
export function isPublishable(fact: OrcadasFact): boolean {
  if (fact.kind !== 'real') return true;
  if (fact.sourceIds.length === 0) return false;
  return fact.sourceIds.every((id) => SOURCE_MAP.get(id)?.verified === true);
}

export function factsFor(chapter: FactPlace): OrcadasFact[] {
  return ORCADAS_FACTS.filter((fact) => fact.chapter === chapter && isPublishable(fact));
}

export function sourcesOf(fact: OrcadasFact): OrcadasSource[] {
  return fact.sourceIds
    .map((id) => SOURCE_MAP.get(id))
    .filter((src): src is OrcadasSource => src !== undefined);
}

export type BuildingId = 'omond' | 'flag' | 'windMast' | 'moneta' | 'radioMast' | 'modern';
export type EraId = 'omond' | 'traspaso' | 'moneta' | 'radio' | 'navy' | 'today';

export interface OrcadasEra {
  id: EraId;
  fromYear: number;
  /** True when `fromYear` is only an illustrative boundary without a source: the UI hides the year. */
  illustrativeStart?: boolean;
  title: string;
  summary: string;
  buildings: readonly BuildingId[];
  factIds: readonly string[];
}

export const ORCADAS_ERAS: readonly OrcadasEra[] = [
  {
    id: 'omond',
    fromYear: 1903,
    title: 'Casa Omond',
    summary: 'La expedición escocesa de William Bruce levanta el observatorio de piedra.',
    // In 1903 the anemometer stood on the Scotia's deck, not on land (Mossman 1907), and no flag flew yet.
    buildings: ['omond'],
    factIds: ['eras-expedicion-bruce'],
  },
  {
    id: 'traspaso',
    fromYear: 1904,
    title: 'Traspaso a la Argentina',
    summary: 'La estación pasa a la Argentina y se iza la bandera que sigue flameando hasta hoy.',
    buildings: ['omond', 'flag'],
    factIds: ['eras-decreto-1904', 'eras-traspaso-1904', 'eras-hugo-acuna'],
  },
  {
    id: 'moneta',
    fromYear: 1905,
    title: 'Casa Moneta',
    summary: 'Junto al observatorio de piedra se construye la casa principal de madera.',
    // The land wind mast from 1905 is a reconstruction: its start year is [Fuente a definir].
    buildings: ['omond', 'flag', 'windMast', 'moneta'],
    factIds: ['eras-casa-moneta-1905'],
  },
  {
    id: 'radio',
    fromYear: 1927,
    title: 'Primera estación de radio',
    summary: 'Llega la primera radio antártica y la primera dotación de argentinos nativos.',
    buildings: ['omond', 'flag', 'windMast', 'moneta', 'radioMast'],
    factIds: [
      'eras-radio-1927',
      'eras-dotacion-nativa-1927',
      'eras-jose-moneta',
      'eras-unica-base',
      'century-record-frio',
    ],
  },
  {
    id: 'navy',
    fromYear: 1951,
    title: 'Destacamento Naval',
    summary: 'El observatorio pasa a depender de la Armada Argentina.',
    buildings: ['omond', 'flag', 'windMast', 'moneta', 'radioMast'],
    factIds: ['eras-traspaso-armada', 'century-tendencia-zazulie'],
  },
  {
    // No sourced date was found for LABORC or the current modules (Cancillería, COMNAP, Nov 2026):
    // 2000 is only the internal boundary of the era and is never shown as a date.
    id: 'today',
    fromYear: 2000,
    illustrativeStart: true,
    title: 'Hoy',
    summary: 'La ciencia sigue todo el año en los módulos actuales y el laboratorio LABORC.',
    buildings: ['omond', 'flag', 'windMast', 'moneta', 'radioMast', 'modern'],
    factIds: ['century-promedios-temp'],
  },
] as const;

export type OrcadasHotspotId = 'screen' | 'mast' | 'house' | 'flag' | 'bay' | 'colony' | 'boat' | 'helipad';

export interface OrcadasTourStop {
  id: string;
  chapter: Chapter;
  spot: OrcadasHotspotId | 'overview';
  factId: string;
  /** Short 1-2 line summary (<= 120 chars), derived only from the fact text. */
  line: string;
  /** Journey stops only: the year the stop sets ('now' = maxYear). */
  year?: number | 'now';
  /**
   * Facts folded under the stop's «Saber más»: what the line leaves out. The stop's own fact is
   * listed only when the line shortens it; otherwise «Saber más» would repeat the line.
   */
  more: readonly string[];
}

export const ORCADAS_TOUR: readonly OrcadasTourStop[] = [
  // arrival
  {
    id: 'arrival-istmo',
    chapter: 'arrival',
    spot: 'overview',
    factId: 'arrival-istmo',
    line: 'Está en el istmo Ibarguren, una franja angosta entre las bahías Scotia y Uruguay, en la isla Laurie.',
    more: [],
  },
  {
    id: 'arrival-antiguedad',
    chapter: 'arrival',
    spot: 'flag',
    factId: 'arrival-antiguedad',
    line: 'Es la base más antigua de la Antártida: desde 1903 hay presencia humana estable todo el año.',
    more: [],
  },
  {
    id: 'arrival-monumento',
    chapter: 'arrival',
    spot: 'house',
    factId: 'done-monumento-hsm42',
    line: 'Las primeras casas (Omond y Moneta) y su cementerio son Monumento Histórico del Tratado Antártico.',
    more: [],
  },
  {
    id: 'arrival-fauna',
    chapter: 'arrival',
    spot: 'colony',
    factId: 'arrival-fauna',
    line: 'En la isla anidan pingüinos y aves marinas, y en las playas descansan focas y elefantes marinos.',
    more: [],
  },

  // observation
  {
    id: 'obs-abrigo',
    chapter: 'observation',
    spot: 'screen',
    factId: 'obs-instrumental-1903',
    line: 'Para medir sin que el sol falsee los datos, los termómetros van dentro de esta casilla ventilada.',
    more: ['obs-instrumental-1903', 'obs-registro-1903', 'obs-simulacion'],
  },

  // journey
  {
    id: 'journey-1903',
    chapter: 'journey',
    spot: 'overview',
    factId: 'eras-expedicion-bruce',
    year: 1903,
    line: 'El 1 de abril de 1903 la expedición escocesa de William Bruce abrió el observatorio en la isla Laurie.',
    more: ['eras-decreto-1904', 'eras-traspaso-1904', 'eras-hugo-acuna', 'eras-casa-moneta-1905'],
  },
  {
    id: 'journey-1927',
    chapter: 'journey',
    spot: 'overview',
    factId: 'eras-radio-1927',
    year: 1927,
    line: 'En 1927 Orcadas rompió el aislamiento con la primera estación radiotelegráfica antártica.',
    more: ['eras-radio-1927', 'eras-dotacion-nativa-1927', 'eras-jose-moneta'],
  },
  {
    id: 'journey-1951',
    chapter: 'journey',
    spot: 'overview',
    factId: 'eras-traspaso-armada',
    year: 1951,
    line: 'En 1951 la Armada asumió la base como Destacamento Naval (1952 según Cancillería).',
    more: ['eras-unica-base'],
  },
  {
    id: 'journey-now',
    chapter: 'journey',
    spot: 'overview',
    factId: 'century-tendencia-zazulie',
    year: 'now',
    line: 'Desde 1950 las temperaturas subieron en las cuatro estaciones del año.',
    more: ['century-tendencia-zazulie', 'century-promedios-temp', 'century-record-frio'],
  },
] as const;

const FACT_MAP = new Map<string, OrcadasFact>(ORCADAS_FACTS.map((f) => [f.id, f]));
const TOUR_FACT_IDS = new Set(ORCADAS_TOUR.flatMap((stop) => [stop.factId, ...stop.more]));

export function factById(id: string): OrcadasFact | null {
  return FACT_MAP.get(id) ?? null;
}

/** Publishable real facts highlighted on the pre-expedition intro sheet. */
export function introFacts(): OrcadasFact[] {
  return ORCADAS_INTRO_FACT_IDS.map((id) => FACT_MAP.get(id)).filter(
    (f): f is OrcadasFact => f !== undefined && f.kind === 'real' && isPublishable(f)
  );
}

/** Publishable guided-tour stops for a chapter, in declared order. */
export function tourStops(chapter: Chapter): OrcadasTourStop[] {
  return ORCADAS_TOUR.filter((stop) => {
    if (stop.chapter !== chapter) return false;
    const fact = FACT_MAP.get(stop.factId);
    return fact !== undefined && isPublishable(fact);
  });
}

/** Publishable facts folded under a stop's «Saber más», in declared order. */
export function stopMoreFacts(stop: OrcadasTourStop): OrcadasFact[] {
  return stop.more
    .map((id) => FACT_MAP.get(id))
    .filter((f): f is OrcadasFact => f !== undefined && isPublishable(f));
}

/** Guided-tour stop at `index` for `chapter`, or null if out of range. */
export function tourStop(chapter: Chapter, index: number): OrcadasTourStop | null {
  const stops = tourStops(chapter);
  const idx = Math.trunc(index);
  if (idx < 0 || idx >= stops.length) return null;
  return stops[idx];
}

/** Facts shown on each scene hotspot card. Explicit ids: one fact never appears on two hotspots. */
export const ORCADAS_HOTSPOT_FACTS: Record<OrcadasHotspotId, readonly string[]> = {
  screen: ['obs-instrumental-1903'],
  mast: ['obs-estacion-centenaria'],
  house: ['done-monumento-hsm42'],
  flag: ['arrival-antiguedad'],
  bay: ['year-hielo-octubre'],
  boat: ['arrival-transporte'],
  colony: ['arrival-fauna'],
  helipad: ['arrival-relevo-sea-king'],
};

/** Facts a panel shows at once; the rest go folded under «Saber más». */
export const PANEL_VISIBLE_FACTS = 2;

/**
 * Facts for a panel (a chapter or the month strip): never the ones a hotspot card or a tour stop
 * shows, so the same fact is not on screen twice. Split into the visible ones and the folded rest.
 */
export function panelFacts(facts: readonly OrcadasFact[]): {
  visible: OrcadasFact[];
  more: OrcadasFact[];
} {
  const onHotspots = new Set(Object.values(ORCADAS_HOTSPOT_FACTS).flat());
  const own = facts.filter((f) => !onHotspots.has(f.id) && !TOUR_FACT_IDS.has(f.id));
  return { visible: own.slice(0, PANEL_VISIBLE_FACTS), more: own.slice(PANEL_VISIBLE_FACTS) };
}

/** Publishable facts of a hotspot, in declared order. */
export function hotspotFacts(id: OrcadasHotspotId): OrcadasFact[] {
  return ORCADAS_HOTSPOT_FACTS[id]
    .map((factId) => ORCADAS_FACTS.find((f) => f.id === factId))
    .filter((f): f is OrcadasFact => f !== undefined && isPublishable(f));
}

/** Scene element a hotspot points at, when that element depends on the era. */
export const HOTSPOT_BUILDING: Partial<Record<OrcadasHotspotId, BuildingId>> = {
  flag: 'flag',
  mast: 'windMast',
};

/** Facts of the journey chapter for the active era, in the era's order. */
export function journeyFacts(year: number): OrcadasFact[] {
  return eraAt(year)
    .factIds.map((id) => ORCADAS_FACTS.find((f) => f.id === id))
    .filter((f): f is OrcadasFact => f !== undefined && isPublishable(f));
}

export function eraAt(year: number): OrcadasEra {
  for (let i = ORCADAS_ERAS.length - 1; i >= 0; i--) {
    if (year >= ORCADAS_ERAS[i].fromYear) {
      return ORCADAS_ERAS[i];
    }
  }
  return ORCADAS_ERAS[0];
}

/** Illustrative sea-ice cover of the bay per month (1..12), 0..1. Simulation, not data. */
export function seaIceAt(month: number): number {
  switch (month) {
    case 1:
    case 2:
    case 3:
    case 4:
    case 12:
      return 0;
    case 5:
    case 11:
      return 0.3;
    case 6:
    case 10:
      return 0.7;
    case 7:
    case 8:
    case 9:
      return 1;
    default:
      return 0;
  }
}

export interface OrcadasAnimal {
  id: 'adelie' | 'chinstrap' | 'weddell' | 'elephant' | 'skua' | 'snowPetrel';
  name: string;
  months: readonly number[]; /* illustrative presence */
}

export const ORCADAS_FAUNA: readonly OrcadasAnimal[] = [
  {
    id: 'adelie',
    name: 'Pingüino adelia',
    months: [10, 11, 12, 1, 2, 3],
  },
  {
    id: 'chinstrap',
    name: 'Pingüino barbijo',
    months: [10, 11, 12, 1, 2, 3],
  },
  {
    id: 'weddell',
    name: 'Foca de Weddell',
    months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  },
  {
    id: 'elephant',
    name: 'Elefante marino',
    months: [10, 11, 12, 1, 2, 3, 4],
  },
  {
    id: 'skua',
    name: 'Skúa',
    months: [10, 11, 12, 1, 2, 3],
  },
  {
    id: 'snowPetrel',
    name: 'Petrel de las nieves',
    months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  },
] as const;

export const MONTH_NAMES: readonly string[] = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const;

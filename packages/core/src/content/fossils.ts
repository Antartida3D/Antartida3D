export type FossilChapter = 'camp' | 'ammonites' | 'plesiosaur' | 'dinosaur' | 'stars' | 'past';
export type FossilView =
  | 'camp' | 'ammonite-rock' | 'ammonite' | 'plesio-dig' | 'plesiosaur' | 'jaw' | 'dig' | 'dinosaur'
  | 'star-slab' | 'seafloor' | 'habitat' | 'closing';
export type FossilHabitat = 'sea' | 'land' | 'seafloor';

export const FOSSIL_QUESTION = '¿Qué nos cuentan los fósiles sobre la Antártida del pasado?';
export const FOSSIL_CHAPTERS: readonly { id: FossilChapter; label: string }[] = [
  { id: 'camp', label: 'Llegar' },
  { id: 'ammonites', label: 'Amonites' },
  { id: 'plesiosaur', label: 'Plesiosaurio' },
  { id: 'dinosaur', label: 'Dinosaurio' },
  { id: 'stars', label: 'Estrellas' },
  { id: 'past', label: 'El pasado' },
];

/** Ages as the sources state them; the Eocene stars are tens of millions of years younger. */
export const FOSSIL_HABITATS: readonly { id: FossilHabitat; label: string; age: string }[] = [
  { id: 'sea', label: 'El mar de los amonites', age: 'Cretácico tardío' },
  { id: 'land', label: 'La tierra del dinosaurio', age: 'Cretácico tardío' },
  { id: 'seafloor', label: 'El fondo de las estrellas', age: 'Eoceno medio tardío' },
];

export const FOSSIL_SOURCES = {
  interview: {
    title: 'Eduardo Olivero cuenta el hallazgo', org: 'Florencia Illbele · Infobae', date: '2026-11-14',
    url: 'https://www.infobae.com/sociedad/2021/04/22/el-otro-gol-a-los-ingleses-memorias-del-geologo-argentino-que-descubrio-el-primer-dinosaurio-en-la-antartida-en-1986/',
    detail: 'Entrevista publicada el 22/04/2021. Fuente del relato personal, de la campaña de 1989 a la isla Vega y del esqueleto casi completo de Vegasaurus molyi; los datos anatómicos se contrastan con las publicaciones científicas.',
  },
  conicet: {
    title: 'El primer dinosaurio de Antártida', org: 'CONICET · Mariela López Cordero', date: '2026-11-13',
    url: 'https://www.conicet.gov.ar/homenaje-al-cientifico-del-cadic-que-encontro-el-primer-dinosaurio-de-antartida/',
    detail: 'Nota institucional del 29/03/2021. Identifica al equipo, el hallazgo de 1986 y a Antarctopelta oliveroi. Foto: gentileza del investigador. Contenidos bajo CC BY 2.5 Argentina.',
  },
  paper: {
    title: 'Primer registro de dinosaurios · 1991', org: 'E. B. Olivero, Z. Gasparini, C. A. Rinaldi y R. Scasso', date: '2026-11-13',
    url: null,
    detail: 'First record of dinosaurs in Antarctica (Upper Cretaceous, James Ross Island): palaeogeographical implications. Geological Evolution of Antarctica, Cambridge University Press, pp. 617–622. Copia consultada aportada por la familia. No se redistribuye la publicación.',
  },
  lupa: {
    title: 'Un paseo por el pasado · pp. 9–12', org: 'M. E. Raffi y F. Milanese · La Lupa / CADIC', date: '2026-11-13',
    url: 'https://revistalalupa.org/wp-content/uploads/2025/06/LLB_RGB.pdf#page=11',
    detail: 'Edición bilingüe, año 2023, n.º 1. Describe amonites con conchillas de alrededor de 70 cm y ambientes cretácicos del archipiélago James Ross. Foto del amonite: Eduardo Olivero.',
  },
  lupa2018: {
    title: 'Un paseo por el pasado de la Península Antártica', org: 'M. E. Raffi y F. Milanese · La Lupa n.º 13 / CADIC', date: '2026-11-14',
    url: null,
    detail: 'La Lupa, año 8, n.º 13, 2018, pp. 6–8. Mar de unos 18 °C hace aproximadamente 80 millones de años, con plesiosaurios, mosasaurios, tiburones y peces; bosques de coníferas, cycadas, angiospermas y helechos reconocidos por troncos, hojas, polen, semillas y frutos fósiles; extinción de fines del Cretácico. Copia aportada por la familia.',
  },
  asteroids: {
    title: 'Nuevas estrellas de mar del Eoceno antártico', org: 'M. I. López Cabrera y E. B. Olivero · Ameghiniana', date: '2026-11-14',
    url: 'https://doi.org/10.5710/AMGH.16.09.2024.3616',
    detail: 'New late middle Eocene Antarctic goniasterids (Asteroidea, Echinodermata) from La Meseta Formation. Ameghiniana 61(5): 213–229, 2024. Describe Billaster blakei (género y especie nuevos) y Buterminaster elegans de la localidad Bill Hill, isla Marambio (Seymour). El enlace lleva al resumen en la página de la revista: el texto completo requiere suscripción.',
  },
  chiton: {
    title: 'Leptochiton sp. · primer quitón fósil articulado', org: 'M. I. López Cabrera y E. Olivero · La Lupa n.º 1 / CADIC', date: '2026-11-14',
    url: null,
    detail: 'La Lupa, n.º 1, 2011, pp. 9–13. Quitón de 9,4 mm de largo con sus ocho valvas articuladas, adherido a un braquiópodo, en capas del Eoceno de la Formación La Meseta, isla Marambio. Copia aportada por la familia.',
  },
  ics: {
    title: 'Tabla Cronoestratigráfica Internacional v2026/06', org: 'Comisión Internacional de Estratigrafía (ICS)', date: '2026-11-15',
    url: 'https://stratigraphy.org/ICSchart/ChronostratChart2026-06.pdf',
    detail: 'International Chronostratigraphic Chart, versión 2026/06. Edades de los límites de la línea de tiempo: base del Cretácico superior 100,5 ± 0,1 Ma; límite Cretácico–Paleógeno 66,00 Ma; base del Eoceno 56,00 Ma; fin del Eoceno 33,9 Ma; Eoceno medio entre 48,07 y 37,71 Ma.',
  },
  archive: {
    title: 'Archivo fotográfico de E. B. Olivero', org: 'Familia Olivero', date: '2026-11-14',
    url: null,
    detail: 'Fotografías de campañas y de material fósil aportadas por la familia, con autorización para usarlas y publicarlas en este proyecto. Fecha, lugar y autoría de cada toma: a confirmar con Eduardo cuando no constan en el epígrafe.',
  },
} as const;
export type FossilSourceId = keyof typeof FOSSIL_SOURCES;

export type FossilPhotoId =
  | 'olivero' | 'ammonite' | 'ammonite-outcrop' | 'ammonite-section' | 'ammonite-lift'
  | 'plesio-site' | 'plesio-prep' | 'plesio-skeleton'
  | 'dino-site' | 'dino-remains' | 'trunk' | 'forest-tdf' | 'stars' | 'chiton';

export interface FossilPhoto {
  alt: string;
  caption: string;
  credit: string;
  source: FossilSourceId;
  /** Shown on the photo: a modern comparison, not the Antarctica of the past. */
  note?: string;
}

const ARCHIVE = 'Archivo E. B. Olivero · publicación autorizada por la familia';

export const FOSSIL_PHOTOS: Readonly<Record<FossilPhotoId, FossilPhoto>> = {
  olivero: { alt: 'Eduardo Olivero en el sitio del hallazgo, sosteniendo fragmentos de huesos preservados en la roca', caption: 'Eduardo Olivero · isla James Ross, 1988', credit: 'Gentileza de Eduardo Olivero / CONICET · CC BY 2.5 Argentina', source: 'conicet' },
  ammonite: { alt: 'Fósil de un amonite gigante de conchilla enrollada, junto a un martillo de campo', caption: 'Amonite gigante · archivo fotográfico', credit: 'Foto: Eduardo Olivero · La Lupa, edición bilingüe 2023, p. 9', source: 'lupa' },
  'ammonite-outcrop': { alt: 'Amonite gigante de conchilla clara asomando de una ladera de grava, con un martillo de geólogo al lado como escala', caption: 'Un amonite gigante en el afloramiento', credit: ARCHIVE, source: 'archive' },
  'ammonite-section': { alt: 'Amonite cortado y pulido: la espiral muestra las cámaras separadas por tabiques, dentro de la roca gris', caption: 'Corte pulido de un amonite: se ven las cámaras de la conchilla', credit: ARCHIVE, source: 'archive' },
  'ammonite-lift': { alt: 'Dos personas con camperas de abrigo atan un amonite grande sobre una lona, en una planicie de grava junto al mar con témpanos', caption: 'Preparar un amonite para trasladarlo', credit: ARCHIVE, source: 'archive' },
  'plesio-site': { alt: 'Tres personas junto a restos óseos que asoman del sedimento, en una ladera con nieve y montañas detrás', caption: 'Trabajo en el sitio de un esqueleto de plesiosaurio', credit: ARCHIVE, source: 'archive' },
  'plesio-prep': { alt: 'Un investigador en una carpa naranja, junto a una mesa con una hilera de vértebras fósiles ordenadas', caption: 'Vértebras ordenadas sobre una mesa, dentro de la carpa del campamento', credit: ARCHIVE, source: 'archive' },
  'plesio-skeleton': { alt: 'Huesos y vértebras de un plesiosaurio dispuestos en el sedimento, vistos desde arriba', caption: 'Esqueleto de plesiosaurio en el sedimento · isla Vega', credit: ARCHIVE, source: 'archive' },
  'dino-site': { alt: 'Dos personas con ropa de abrigo naranja trabajan agachadas en una planicie de grava, con el mar y mesetas detrás', caption: 'Trabajo de campo en una planicie de la isla James Ross', credit: ARCHIVE, source: 'archive' },
  'dino-remains': { alt: 'Cinco restos fósiles numerados sobre fondo blanco: un maxilar con dientes, dientes sueltos y vértebras', caption: 'Antarctopelta oliveroi: maxilar, dientes y vértebras recuperados', credit: `${ARCHIVE} · publicación de origen de la lámina a confirmar`, source: 'archive' },
  trunk: { alt: 'Tronco fósil gris y estriado acostado sobre la grava, junto a un arroyo de deshielo con nieve', caption: 'Un tronco fosilizado: la pista de que hubo bosques', credit: ARCHIVE, source: 'archive' },
  'forest-tdf': { alt: 'Vista desde una altura de un bosque extenso y verde en Tierra del Fuego, con lagunas al fondo', caption: 'Bosque actual de Tierra del Fuego', credit: ARCHIVE, source: 'archive', note: 'Comparación actual: es Tierra del Fuego, no la Antártida del pasado.' },
  stars: { alt: 'Fósiles sobre el suelo junto a una escala: dos pequeñas estrellas de mar anaranjadas, braquiópodos, briozoos y erizos', caption: 'Estrellas de mar y fauna de Bill Hill, isla Marambio', credit: ARCHIVE, source: 'archive' },
  chiton: { alt: 'Primer plano de un quitón fósil: ocho placas articuladas como una armadura alargada', caption: 'Leptochiton sp., el quitón articulado de Bill Hill', credit: ARCHIVE, source: 'archive' },
};

export interface FossilStop {
  id: string;
  chapter: FossilChapter;
  view: FossilView;
  /** Label of the place on the scene: a real site, or a reconstructed past. */
  place: string;
  eyebrow: string;
  title: string;
  line: string;
  more: string;
  sources: readonly FossilSourceId[];
  photos?: readonly FossilPhotoId[];
}

export const FOSSIL_STOPS: readonly FossilStop[] = [
  {
    id: 'arrival', chapter: 'camp', view: 'camp', place: 'Isla James Ross', eyebrow: 'Isla James Ross · verano de 1986',
    title: 'Las rocas recuerdan',
    line: 'Eduardo Olivero y sus compañeros salieron a estudiar las rocas. Entre ellas apareció una historia que nadie había encontrado antes en la Antártida.',
    more: 'La campaña estudiaba la estratigrafía: las relaciones entre las capas de roca y los acontecimientos que registran. La expedición de Fósiles recorre el archipiélago James Ross; la visita a la Base Marambio tiene su propio recorrido.',
    sources: ['interview', 'paper'], photos: ['olivero'],
  },
  {
    id: 'looking', chapter: 'camp', view: 'camp', place: 'Isla James Ross', eyebrow: 'Un cuaderno, muchas campañas',
    title: 'Aprender a mirar',
    line: 'Olivero hizo su primera campaña antártica en 1974. Años de observar rocas lo acompañaban en cada caminata.',
    more: 'Las investigaciones continuaron en el Laboratorio de Geología Andina del CADIC, en Ushuaia. El descubrimiento fue un trabajo de equipo, con apoyo del Instituto Antártico Argentino.',
    sources: ['conicet'],
  },
  {
    id: 'spiral', chapter: 'ammonites', view: 'ammonite-rock', place: 'Isla James Ross', eyebrow: 'Primera pista · la conchilla',
    title: 'Una espiral en la roca',
    line: 'Una forma enrollada aparece entre las capas. Acercate y descubrí el amonite que guarda esta roca.',
    more: 'La limpieza es una simulación educativa. La posición del fósil, el sedimento y el número de pasadas son ilustrativos. Las fotografías muestran amonites gigantes del archivo de Eduardo Olivero.',
    sources: ['lupa', 'archive'], photos: ['ammonite-outcrop', 'ammonite-lift'],
  },
  {
    id: 'giants', chapter: 'ammonites', view: 'ammonite', place: 'Mar del Cretácico · reconstrucción', eyebrow: 'Un habitante del mar',
    title: 'Amonites gigantes',
    line: 'Los amonites eran parientes de los calamares actuales. Algunos alcanzaron un tamaño extraordinario.',
    more: 'La Lupa describe conchillas de alrededor de 70 cm de diámetro en la región. Es una referencia publicada, no una medida de este modelo. Por dentro, la conchilla estaba dividida en cámaras, como muestra el corte pulido. La especie y las dimensiones de los ejemplares de esta expedición se completarán con Eduardo.',
    sources: ['lupa', 'archive'], photos: ['ammonite-section', 'ammonite'],
  },
  {
    id: 'vega', chapter: 'plesiosaur', view: 'plesio-dig', place: 'Isla Vega', eyebrow: 'Isla Vega · campaña de 1989',
    title: 'Una columna en el suelo',
    line: 'En 1989 Eduardo viajó a la isla Vega con paleontólogos de vertebrados del Museo de La Plata. Allí se registró un esqueleto casi completo de plesiosaurio.',
    more: 'Según la entrevista, el esqueleto corresponde a Vegasaurus molyi. La disposición de los huesos en esta escena es ilustrativa; las fotografías del archivo muestran el trabajo en el sitio y las vértebras ordenadas en el campamento.',
    sources: ['interview', 'archive'], photos: ['plesio-site', 'plesio-prep', 'plesio-skeleton'],
  },
  {
    id: 'swimmer', chapter: 'plesiosaur', view: 'plesiosaur', place: 'Mar del Cretácico · reconstrucción', eyebrow: 'Un reptil en el mar',
    title: 'Cuello largo, aletas grandes',
    line: 'Los plesiosaurios eran grandes reptiles marinos. Hace unos 80 millones de años nadaban en un mar de alrededor de 18 °C, junto a mosasaurios, tiburones, peces y amonites.',
    more: 'Desaparecieron al final del Cretácico, en la extinción masiva que también terminó con la mayoría de los dinosaurios, los mosasaurios y los amonites. En la entrevista, Eduardo cuenta que en esas rocas abundan los dientes cónicos de reptiles marinos: recordá esa forma para el próximo capítulo. El cuerpo, los colores y el nado de esta escena son ilustrativos.',
    sources: ['lupa2018', 'interview'],
  },
  {
    id: 'detour', chapter: 'dinosaur', view: 'jaw', place: 'Isla James Ross', eyebrow: '1986 · un desvío en el camino',
    title: 'Algo asomaba de la roca',
    line: 'En una caminata, Eduardo se apartó del grupo. Encontró un fragmento de mandíbula con un diente y volvió a buscar a sus compañeros.',
    more: 'En su entrevista recuerda la luz de aquel día y cómo le evocó el paisaje de Ischigualasto. El episodio aparece aquí resumido: no se presenta como una cita literal ni como una grabación de su voz.',
    sources: ['interview'],
  },
  {
    id: 'tooth', chapter: 'dinosaur', view: 'jaw', place: 'Isla James Ross', eyebrow: 'Segunda pista · el diente',
    title: 'Una pista muy pequeña',
    line: 'No era un diente cónico de reptil marino. La forma le llamó la atención y abría una pregunta enorme: ¿habían encontrado un dinosaurio?',
    more: 'La publicación de 1991 describe un fragmento de mandíbula izquierda con un diente de corona baja, con forma de hoja. La pieza es una de las evidencias conservadas; el dibujo de bloques permite observar esa pista sin reproducir cada detalle anatómico.',
    sources: ['paper', 'interview'], photos: ['dino-remains'],
  },
  {
    id: 'seasons', chapter: 'dinosaur', view: 'dig', place: 'Isla James Ross', eyebrow: 'La investigación continúa',
    title: 'El hallazgo llevó años',
    line: 'El suelo congelado dificultaba la extracción. El equipo recuperó los restos durante varias campañas.',
    more: 'Encontrar una pieza fue el comienzo. En su testimonio, Olivero relata que rescataron lo que estaba descongelado y regresaron después por los demás restos.',
    sources: ['interview'], photos: ['dino-site'],
  },
  {
    id: 'animal', chapter: 'dinosaur', view: 'dinosaur', place: 'Isla James Ross', eyebrow: 'Antarctopelta oliveroi',
    title: 'De los restos al animal',
    line: 'Los huesos y las placas de armadura permitieron reconocer un dinosaurio herbívoro acorazado.',
    more: 'El artículo de 1991 documenta un esqueleto parcial, con mandíbula, vértebras, costillas, fragmentos de extremidades y placas óseas. CONICET identifica al animal como Antarctopelta oliveroi. La forma completa, los colores y los movimientos de esta escena son una reconstrucción ilustrativa.',
    sources: ['paper', 'conicet'],
  },
  {
    id: 'slab', chapter: 'stars', view: 'star-slab', place: 'Isla Marambio · Bill Hill', eyebrow: 'Isla Marambio · Eoceno medio tardío',
    title: 'Estrellas enteras',
    line: 'Mucho después de los amonites, en las rocas de la Formación La Meseta quedaron estrellas de mar enteras. Son muy pequeñas.',
    more: 'López Cabrera y Olivero describieron en 2024 dos ejemplares de la localidad Bill Hill: Billaster blakei, un género y una especie nuevos, y Buterminaster elegans. El esqueleto de una estrella de mar está hecho de piezas sueltas que se dispersan al morir; conservarla entera exige un enterramiento rápido.',
    sources: ['asteroids', 'archive'], photos: ['stars'],
  },
  {
    id: 'reef', chapter: 'stars', view: 'seafloor', place: 'Mar del Eoceno · reconstrucción', eyebrow: 'Un fondo duro, lleno de vida',
    title: 'Vecinos del fondo',
    line: 'Vivían sobre fondos duros, junto a briozoos, braquiópodos, erizos, serpúlidos y un quitón. Probablemente se alimentaban de briozoos y braquiópodos adheridos a la roca.',
    more: 'Las estrellas de mar antárticas actuales son muy distintas. Sus parientes más cercanos viven hoy lejos: en Nueva Caledonia y Kermadec, y en el Atlántico tropical hasta Uruguay. El quitón de Bill Hill, Leptochiton sp., mide 9,4 mm y conserva sus ocho valvas articuladas. La escena es una reconstrucción ilustrativa.',
    sources: ['asteroids', 'chiton'], photos: ['chiton'],
  },
  {
    id: 'environments', chapter: 'past', view: 'habitat', place: 'El pasado, a partir de sus pistas', eyebrow: 'La Antártida antes del hielo',
    title: 'Un mar. Una costa con bosques.',
    line: 'Las rocas conservan pistas de ambientes muy diferentes a los actuales. Explorá el mar de los amonites, la tierra del dinosaurio y el fondo de las estrellas.',
    more: 'Troncos, hojas, polen, semillas y frutos fósiles permitieron reconocer bosques de coníferas, con cycadas, angiospermas y helechos. Los amonites y el plesiosaurio corresponden a la vida marina; el dinosaurio era terrestre, aunque sus restos se encontraron en sedimentos marinos. Las estrellas son del Eoceno, decenas de millones de años más jóvenes. Estas vistas resumen ambientes: no muestran a todos los animales juntos en un mismo lugar y momento.',
    sources: ['lupa2018', 'paper', 'asteroids', 'archive'], photos: ['trunk', 'forest-tdf'],
  },
  {
    id: 'notebook', chapter: 'past', view: 'closing', place: 'Isla James Ross', eyebrow: 'Tu cuaderno de campo',
    title: 'Cuatro hallazgos. Nuevas preguntas.',
    line: 'Una conchilla, una columna, un diente y unas estrellas diminutas nos acercan a otra Antártida. Cada descubrimiento continúa cuando alguien vuelve a mirar.',
    more: 'Este recorrido une evidencias publicadas, el archivo fotográfico y el testimonio de Eduardo. La historia particular de los amonites gigantes y del plesiosaurio se ampliará con sus recuerdos, sus materiales y las publicaciones correspondientes.',
    sources: ['lupa', 'interview', 'paper', 'asteroids'],
  },
];

/**
 * A note the visitor can open: how the first dinosaur of Antarctica was found, told by Eduardo
 * Olivero to Infobae (source `interview`). Our own summary; the words between “ ” are his, word for
 * word, checked against the article on 2026-11-15. The eleven metres the article mentions are left
 * out on purpose (docs/expediciones/fosiles-fuentes.md).
 */
export const FOSSIL_STORY = {
  stop: 'detour',
  title: 'El desvío de 1986',
  paragraphs: [
    'En enero de 1986, después de una década sin pisar la Antártida, Eduardo volvió a la isla James Ross para estudiar las capas de roca. Quería acampar donde en otras campañas habían aparecido amonites, pero ese lugar estaba ocupado por un campamento británico, y el grupo se instaló a 15 km.',
    'Camino a la zona de trabajo, se apartó del grupo para mirar el terreno: “Habré hecho 100 pasos y, entre las huellas que dejaban los cuatriciclos de los investigadores británicos, veo un pedacito de huesos saliendo de una roca.” Cuenta que la luz de ese día le hizo acordar al paisaje del Parque Provincial Ischigualasto.',
    '“Me acerco y encuentro un fragmento de mandíbula con un diente”. No era un diente cónico de reptil marino: “Este era un diente aplanado con la corona dispuesta como para masticar vegetales.” Entonces: “Rápidamente me fui a buscar a mis compañeros y volvimos lo más rápido posible.”',
    'Los británicos pasaban por ahí con sus vehículos: “Es decir que pasaban todos los días por ahí, pero nunca los vieron”. El equipo guardó el secreto: “Lo ocultamos hasta tenerlo publicado.”',
    'El suelo congelado era muy duro: “rescatamos lo que en ese momento estaba descongelado, y el resto lo fuimos recuperando a lo largo de varios años”. En 1989, al ver llegar el buque británico John Biscoe, armaron una carpa sobre su zona de trabajo para reservar el lugar.',
  ],
  credit: 'Relato de Eduardo Olivero en una entrevista de Florencia Illbele (Infobae, 22/04/2021). Las frases entre comillas son textuales de la nota; el resto es un resumen.',
  source: 'interview',
} as const satisfies { stop: string; title: string; paragraphs: readonly string[]; credit: string; source: FossilSourceId };

/**
 * Geological time line of the expedition, from the Late Cretaceous to the end of the Eocene, to scale.
 * Boundaries from the ICS chart v2026/06 (source `ics`), in millions of years ago (Ma). Each find
 * is placed only in the span its sources give, never at an exact year: the dinosaur in the Upper
 * Cretaceous (paper of 1991), the ammonites and the plesiosaur in the Late Cretaceous sea of about 80 Ma
 * that ends with their extinction (La Lupa 2018), and the sea stars in the late middle Eocene (Ameghiniana 2024).
 */
export const FOSSIL_TIMELINE = {
  from: 100.5,
  to: 33.9,
  periods: [
    { id: 'late-cretaceous', label: 'Cretácico tardío', from: 100.5, to: 66 },
    { id: 'paleocene', label: 'Paleoceno', from: 66, to: 56 },
    { id: 'eocene', label: 'Eoceno', from: 56, to: 33.9 },
  ],
  /** The end-Cretaceous extinction, told on the plesiosaur stop (La Lupa). */
  extinction: { at: 66, label: 'Fin del Cretácico · 66 Ma' },
  finds: [
    { chapter: 'ammonites', label: 'Amonites', when: 'Cretácico tardío', from: 100.5, to: 66, sources: ['lupa', 'lupa2018', 'ics'] },
    { chapter: 'plesiosaur', label: 'Plesiosaurio', when: 'Cretácico tardío', from: 100.5, to: 66, sources: ['lupa2018', 'ics'] },
    { chapter: 'dinosaur', label: 'Dinosaurio', when: 'Cretácico tardío', from: 100.5, to: 66, sources: ['paper', 'ics'] },
    { chapter: 'stars', label: 'Estrellas de mar', when: 'Eoceno medio tardío', from: 48.07, to: 37.71, sources: ['asteroids', 'ics'] },
  ],
} as const satisfies {
  from: number; to: number;
  periods: readonly { id: string; label: string; from: number; to: number }[];
  extinction: { at: number; label: string };
  finds: readonly { chapter: FossilChapter; label: string; when: string; from: number; to: number; sources: readonly FossilSourceId[] }[];
};

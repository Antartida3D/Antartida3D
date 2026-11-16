/**
 * Océano (#8): a guided dive under the sea ice to watch five animals feed and connect them through
 * what they eat. Every sentence keeps its source and the place where that source was studied: the
 * scene is an illustration inspired by Antarctic seas, not a record of one community in the Weddell.
 * Research notes: docs/expediciones/oceano-fuentes.md.
 */

export const MARINE_QUESTION = '¿Cómo se alimenta la vida que encontramos bajo el hielo?';

export type MarineChapter = 'enter' | 'small' | 'whales' | 'emperor' | 'leopard' | 'orcas' | 'connect';
export type MarineView =
  | 'ceiling' | 'micro' | 'krill' | 'humpback' | 'minke' | 'emperor' | 'emperor-dive' | 'leopard' | 'teeth' | 'orcas' | 'web' | 'closing';
export type MarineSourceId =
  | 'L13' | 'P01' | 'P02' | 'P03' | 'P04' | 'P05' | 'P06' | 'P07'
  | 'D01' | 'D02' | 'D03' | 'D04' | 'D05' | 'D06' | 'D07' | 'D08';

export interface MarineSource {
  title: string;
  org: string;
  /** Where and how the source was studied, and what it does not cover. */
  detail: string;
  date: string;
  url: string;
  /** Whether the full text was read or only the abstract the publisher shows. */
  read: 'full' | 'abstract' | 'page';
}

const CONSULTED = '2026-11-14';

export const MARINE_SOURCES: Readonly<Record<MarineSourceId, MarineSource>> = {
  L13: {
    title: 'La Lupa Nº 13: «Nada es lo que era» y ficha «Foca leopardo»',
    org: 'CADIC-CONICET · T. I. Marina, G. Cordone y F. R. Momo; ficha de A. San Martín',
    detail: 'Revista de divulgación, octubre de 2018. Explica qué es una red trófica con el ejemplo de caleta Potter (Isla 25 de Mayo) y resume la dieta de la foca leopardo.',
    date: CONSULTED, url: 'https://revistalalupa.org/wp-content/uploads/2025/06/La-Lupa-13web3.pdf', read: 'full',
  },
  P01: {
    title: 'The Food Web of Potter Cove (Antarctica): complexity, structure and function',
    org: 'Marina y colaboradores · Estuarine, Coastal and Shelf Science 200: 141–151 (2018)',
    detail: 'Red alimentaria de caleta Potter, un estudio local. Respalda la idea de red con varias vías; no es una medición del mar de Weddell.',
    date: CONSULTED, url: 'https://doi.org/10.1016/j.ecss.2017.10.015', read: 'full',
  },
  P02: {
    title: 'Super-Aggregations of Krill and Humpback Whales in Wilhelmina Bay, Antarctic Peninsula',
    org: 'Nowacek y colaboradores · PLOS ONE 6(4): e19173 (2011)',
    detail: 'Bahía Wilhelmina, oeste de la Península Antártica, otoño austral de 2009. Jorobadas alimentándose de un enjambre enorme de krill.',
    date: CONSULTED, url: 'https://doi.org/10.1371/journal.pone.0019173', read: 'full',
  },
  P03: {
    title: 'Feeding rates and under-ice foraging strategies of the smallest lunge filter feeder, the Antarctic minke whale',
    org: 'Friedlaender y colaboradores · Journal of Experimental Biology 217: 2851–2854 (2014)',
    detail: 'Consultado en su resumen (PubMed 25122916). Minkes con sensores alimentándose alrededor y debajo del hielo marino.',
    date: CONSULTED, url: 'https://pubmed.ncbi.nlm.nih.gov/25122916/', read: 'abstract',
  },
  P04: {
    title: 'Leopard seals (Hydrurga leptonyx) use suction and filter feeding when hunting small prey underwater',
    org: 'Hocking, Evans y Fitzgerald · Polar Biology 36: 211–222 (2013)',
    detail: 'Observaciones de focas leopardo en cautiverio, con presas chicas. Describe la succión y la filtración con los dientes poscaninos.',
    date: CONSULTED, url: 'https://doi.org/10.1007/s00300-012-1253-9', read: 'full',
  },
  P05: {
    title: 'Complementary use of stable isotopes and fatty acids for quantitative diet estimation of sympatric predators, the Antarctic pack-ice seals',
    org: 'Guerrero, Pinnock, Negrete y Rogers · Oecologia 197: 729–742 (2021)',
    detail: 'Costa Danco, oeste de la Península Antártica, verano de 2015: dieta estimada de 13 focas leopardo. Muestreo autorizado por la Dirección Nacional del Antártico.',
    date: CONSULTED, url: 'https://doi.org/10.1007/s00442-021-05045-z', read: 'full',
  },
  P06: {
    title: 'Cooperative hunting behavior, prey selectivity and prey handling by pack ice killer whales (Orcinus orca), type B, in Antarctic Peninsula waters',
    org: 'Pitman y Durban · Marine Mammal Science 28(1): 16–36 (2012)',
    detail: 'Consultado en su resumen del editor. Oeste de la Península Antártica, enero de 2009: tres grupos de orcas tipo B.',
    date: CONSULTED, url: 'https://doi.org/10.1111/j.1748-7692.2010.00453.x', read: 'abstract',
  },
  P07: {
    title: 'The post-moult diet of Emperor Penguins (Aptenodytes forsteri) in the eastern Weddell Sea, Antarctica',
    org: 'Pütz · Polar Biology 15: 457–463 (1995)',
    detail: 'Consultado en su resumen. Drescher Inlet, este del mar de Weddell, al final del verano.',
    date: CONSULTED, url: 'https://doi.org/10.1007/BF00237459', read: 'abstract',
  },
  D01: {
    title: 'Especialistas del CONICET observan alteraciones en el fitoplancton en la Antártida',
    org: 'CADIC-CONICET · equipos de Irene Schloss y Gastón Almandoz · 18 de marzo de 2024',
    detail: 'Tres décadas de muestreo en caleta Potter (Isla 25 de Mayo), con apoyo de la base Carlini.',
    date: CONSULTED, url: 'https://cadic.conicet.gov.ar/especialistas-del-conicet-observan-alteraciones-en-el-fitoplancton-en-la-antartida-y-lo-vinculan-con-el-cambio-climatico/', read: 'page',
  },
  D02: {
    title: 'Emperor penguin', org: 'Australian Antarctic Program (Australian Antarctic Division)',
    detail: 'Ficha oficial: dieta variable, buceo y regreso a la superficie.',
    date: CONSULTED, url: 'https://www.antarctica.gov.au/about-antarctica/animals/penguins/emperor-penguin/', read: 'page',
  },
  D03: {
    title: 'Krill', org: 'Australian Antarctic Program (Australian Antarctic Division)',
    detail: 'Ficha oficial del krill antártico: enjambres, tamaño y alimento.',
    date: CONSULTED, url: 'https://www.antarctica.gov.au/about-antarctica/animals/krill/', read: 'page',
  },
  D04: {
    title: 'Minke Whale', org: 'NOAA Fisheries',
    detail: 'Perfil oficial: cómo distinguir la minke antártica de las otras minkes.',
    date: CONSULTED, url: 'https://www.fisheries.noaa.gov/species/minke-whale', read: 'page',
  },
  D05: {
    title: 'First tagging study of Antarctic minke whales shows unique feeding',
    org: 'Oregon State University · 18 de agosto de 2014',
    detail: 'Comunicación del estudio P03, con los datos de buceo de las minkes marcadas.',
    date: CONSULTED, url: 'https://news.oregonstate.edu/news/first-tagging-study-antarctic-minke-whales-shows-unique-feeding', read: 'page',
  },
  D06: {
    title: 'Killer whale', org: 'Australian Antarctic Program (Australian Antarctic Division)',
    detail: 'Ficha oficial: grupos familiares, caza coordinada y presas de la especie.',
    date: CONSULTED, url: 'https://www.antarctica.gov.au/about-antarctica/animals/whales/killer-whale/', read: 'page',
  },
  D07: {
    title: 'Minke whale', org: 'Australian Antarctic Program (Australian Antarctic Division)',
    detail: 'Ficha oficial: dieta en aguas antárticas y vida entre el hielo marino.',
    date: CONSULTED, url: 'https://www.antarctica.gov.au/about-antarctica/animals/whales/minke-whale/', read: 'page',
  },
  D08: {
    title: 'Humpback Whale', org: 'NOAA Fisheries',
    detail: 'Perfil oficial de la especie en todo el mundo: filtración con barbas.',
    date: CONSULTED, url: 'https://www.fisheries.noaa.gov/species/humpback-whale', read: 'page',
  },
};

export const MARINE_CHAPTERS: readonly { id: MarineChapter; label: string }[] = [
  { id: 'enter', label: 'Entrar' },
  { id: 'small', label: 'Alimento pequeño' },
  { id: 'whales', label: 'Ballenas' },
  { id: 'emperor', label: 'Emperador' },
  { id: 'leopard', label: 'Foca leopardo' },
  { id: 'orcas', label: 'Orcas' },
  { id: 'connect', label: 'Conectar' },
];

export interface MarineStop {
  id: string;
  chapter: MarineChapter;
  view: MarineView;
  eyebrow: string;
  title: string;
  line: string;
  more: string;
  sources: readonly MarineSourceId[];
}

export const MARINE_STOPS: readonly MarineStop[] = [
  {
    id: 'ceiling', chapter: 'enter', view: 'ceiling', eyebrow: 'Mar de Weddell · escena ilustrativa',
    title: 'El hielo es un techo',
    line: 'Desde arriba se ve hielo marino y agua abierta. Debajo, la luz entra por las grietas y hay vida que desde la superficie no se ve.',
    more: 'El krill puede alimentarse de algas que crecen en la cara de abajo del hielo marino, y la minke antártica busca krill alrededor y debajo del hielo. La escena reúne animales que no siempre comparten el mismo lugar: cada caso lleva su fuente y el sitio donde se estudió.',
    sources: ['D03', 'P03'],
  },
  {
    id: 'tiny', chapter: 'small', view: 'micro', eyebrow: 'Productores microscópicos',
    title: 'Ver lo diminuto',
    line: 'El fitoplancton son algas microscópicas que flotan donde llega la luz. Junto con las macroalgas, está en la base de la alimentación del mar antártico.',
    more: 'Desde la década de 1990, equipos del CONICET muestrean el plancton de caleta Potter (Isla 25 de Mayo) durante todo el año. Entre 2010 y 2020 registraron más floraciones intensas de una diatomea pequeña, de menos de 20 micrones. Advierten que podría afectar al krill, que prefiere células más grandes. Es un resultado de ese lugar; no se extiende solo a toda la Antártida.',
    sources: ['D01', 'D03'],
  },
  {
    id: 'swarm', chapter: 'small', view: 'krill', eyebrow: 'Euphausia superba',
    title: 'Encontrar el krill',
    line: 'El krill antártico es un crustáceo de unos 6 cm que vive en enjambres. Come sobre todo fitoplancton, y varios de los animales que vamos a ver se alimentan de él.',
    more: 'Es casi transparente, con manchitas rojas y ojos negros grandes; a veces se le ve el intestino verde por lo que comió. En invierno, cuando hay poco fitoplancton, usa otros alimentos: algas de debajo del hielo, restos del fondo u otros animales. Que el krill sea importante no quiere decir que todos los animales del mar coman solo krill.',
    sources: ['D03', 'L13'],
  },
  {
    id: 'humpback', chapter: 'whales', view: 'humpback', eyebrow: 'Megaptera novaeangliae',
    title: 'La jorobada',
    line: 'Abre la boca dentro del enjambre, traga agua con krill y la expulsa a través de las barbas, que retienen el alimento como un colador.',
    more: 'En bahía Wilhelmina, al oeste de la Península Antártica, un estudio de otoño de 2009 siguió a muchas jorobadas que se alimentaban de un enjambre enorme de krill: de día descansaban y de noche, cuando el krill subía, comían sin parar. En otras partes del mundo las jorobadas también usan burbujas para juntar a sus presas; acá mostramos solo la filtración.',
    sources: ['P02', 'D08'],
  },
  {
    id: 'minke', chapter: 'whales', view: 'minke', eyebrow: 'Balaenoptera bonaerensis',
    title: 'La minke, entre el hielo',
    line: 'Es una de las ballenas con barbas más chicas. En aguas antárticas come casi solo krill y lo busca alrededor y debajo del hielo marino, con muchas embestidas cortas.',
    more: 'Un estudio con sensores mostró que, por su tamaño chico, llega a krill entre el hielo donde a las ballenas grandes les cuesta entrar. En hielo muy cerrado respira asomando la cabeza por grietas angostas. A diferencia de otras minkes, sus aletas pectorales suelen ser grises, sin la banda blanca marcada.',
    sources: ['D07', 'P03', 'D05', 'D04'],
  },
  {
    id: 'emperor-hunt', chapter: 'emperor', view: 'emperor', eyebrow: 'Aptenodytes forsteri',
    title: 'Del hielo al agua',
    line: 'El emperador camina sobre el hielo, pero se alimenta en el agua: bucea para atrapar peces, krill y algunos calamares, de a una presa por vez.',
    more: 'Su menú cambia con la estación y el lugar. En Drescher Inlet, al este del mar de Weddell, un estudio de fin del verano encontró que por número de presas predominaba el krill, pero por peso predominaban los peces. Por eso no decimos que tenga una presa «principal» en todas partes.',
    sources: ['D02', 'P07'],
  },
  {
    id: 'emperor-dive', chapter: 'emperor', view: 'emperor-dive', eyebrow: 'Una inmersión',
    title: 'Volver a respirar',
    line: 'Cada inmersión termina en la superficie: el emperador respira aire, descansa y vuelve a bajar.',
    more: 'La ficha oficial indica que suele buscar alimento entre 150 y 250 metros y que las inmersiones duran en promedio de 3 a 6 minutos. Los récords registrados son mucho mayores, pero son excepciones. La escena comprime la profundidad y el tiempo.',
    sources: ['D02'],
  },
  {
    id: 'leopard', chapter: 'leopard', view: 'leopard', eyebrow: 'Hydrurga leptonyx',
    title: 'Más de una estrategia',
    line: 'La foca leopardo tiene una de las dietas más variadas entre las focas del hielo: come krill, peces, pingüinos y otras focas.',
    more: 'Con sus caninos grandes sujeta presas grandes. En la costa Danco, al oeste de la Península, un estudio de 2015 estimó la dieta de 13 focas leopardo y en todas sus estimaciones el krill fue el componente principal. Es un resultado de ese lugar: no es una receta fija para todas las focas leopardo.',
    sources: ['L13', 'P05', 'P04'],
  },
  {
    id: 'teeth', chapter: 'leopard', view: 'teeth', eyebrow: 'Dientes y barbas',
    title: 'Filtrar con dientes',
    line: 'Para presas chicas, chupa agua con krill y la expulsa entre sus dientes de atrás, que tienen puntas y dejan pasar el agua. La ballena filtra con barbas; la foca, con dientes.',
    more: 'La filtración se observó por primera vez en focas leopardo en cautiverio, con presas chicas. Sus caninos y dientes de adelante muestran desgaste, pero los de atrás no: parecen usarse para colar, no para morder. Lo que hacen las focas silvestres con el krill se conoce por otros estudios de dieta.',
    sources: ['P04', 'P05', 'D08'],
  },
  {
    id: 'orcas', chapter: 'orcas', view: 'orcas', eyebrow: 'Orcinus orca',
    title: 'Una familia, distintas dietas',
    line: 'Las orcas pasan toda la vida en su grupo familiar y cazan muy coordinadas. Qué comen depende del grupo: en aguas antárticas se reconocen tres tipos.',
    more: 'Como especie, las orcas comen peces, calamares, pingüinos, focas y hasta otras ballenas. Pero eso no es el menú de cada grupo. Se comunican con llamados mientras cazan, y las hembras enseñan las técnicas a sus crías. Cada orca atrapa sus presas de a una: no filtra como las ballenas con barbas.',
    sources: ['D06', 'P06'],
  },
  {
    id: 'web', chapter: 'connect', view: 'web', eyebrow: 'Red alimentaria · esquema',
    title: 'Seguir el alimento',
    line: 'Cada flecha va del alimento a quien lo come. Elegí un organismo para ver sus conexiones.',
    more: 'Antes se pensaba en una cadena simple: fitoplancton, krill y grandes animales. Hoy se habla de una red, con muchos más actores y relaciones que cambian según la estación. Este esquema reúne relaciones documentadas en distintos lugares de la Antártida: no es una red medida en el mar de Weddell, no tiene cantidades y no predice qué pasaría si algo cambia.',
    sources: ['L13', 'P01'],
  },
  {
    id: 'notebook', chapter: 'connect', view: 'closing', eyebrow: 'Cuaderno de la expedición',
    title: 'Lo que vimos bajo el hielo',
    line: 'Cinco animales, tres maneras de alimentarse: filtrar con barbas, filtrar con dientes y atrapar presas de a una. El krill, los peces y otros alimentos los conectan en una red.',
    more: 'Las escenas son ilustraciones: los tamaños, las distancias y los tiempos están exagerados o comprimidos para poder verlos. Los datos vienen de estudios hechos en lugares concretos, citados en cada parada.',
    sources: ['L13', 'P03'],
  },
];

// --- Food web --------------------------------------------------------------------------------

export type MarineOrganism =
  | 'producers' | 'krill' | 'fish' | 'squid' | 'penguins-seals' | 'humpback' | 'minke' | 'emperor' | 'leopard' | 'orca';

export const MARINE_ORGANISMS: Readonly<Record<MarineOrganism, { label: string; latin?: string; group?: true }>> = {
  producers: { label: 'Fitoplancton y algas del hielo', group: true },
  krill: { label: 'Krill antártico', latin: 'Euphausia superba' },
  fish: { label: 'Peces', group: true },
  squid: { label: 'Calamares', group: true },
  'penguins-seals': { label: 'Otros pingüinos y focas', group: true },
  humpback: { label: 'Jorobada', latin: 'Megaptera novaeangliae' },
  minke: { label: 'Minke antártica', latin: 'Balaenoptera bonaerensis' },
  emperor: { label: 'Pingüino emperador', latin: 'Aptenodytes forsteri' },
  leopard: { label: 'Foca leopardo', latin: 'Hydrurga leptonyx' },
  orca: { label: 'Orca', latin: 'Orcinus orca' },
};

export interface MarineLink {
  /** The food: the arrow starts here. */
  from: MarineOrganism;
  /** Who eats it: the arrow ends here. */
  to: MarineOrganism;
  sources: readonly MarineSourceId[];
  /** Where the evidence comes from. */
  scope: string;
  /** What the link does not say. */
  note: string;
}

/**
 * Documented links only. Two models in the same scene do not make a link: there is no
 * «emperor → leopard seal» or «leopard seal → orca» here because the sources do not name them.
 */
export const MARINE_LINKS: readonly MarineLink[] = [
  { from: 'producers', to: 'krill', sources: ['D03', 'D01'], scope: 'Antártida, en general',
    note: 'Es su alimento principal, no el único: en invierno también come algas de debajo del hielo y otros recursos.' },
  { from: 'krill', to: 'humpback', sources: ['P02', 'D08'], scope: 'Bahía Wilhelmina, oeste de la Península',
    note: 'Un caso estudiado en otoño de 2009; no es un censo del mar de Weddell.' },
  { from: 'krill', to: 'minke', sources: ['D07', 'P03', 'D05'], scope: 'Aguas antárticas',
    note: 'En aguas antárticas come casi solo krill.' },
  { from: 'krill', to: 'emperor', sources: ['P07', 'D02'], scope: 'Drescher Inlet, este del Weddell',
    note: 'Su importancia cambia con el lugar y la estación.' },
  { from: 'fish', to: 'emperor', sources: ['P07', 'D02'], scope: 'Drescher Inlet, este del Weddell',
    note: '«Peces» es un grupo: incluye varias especies.' },
  { from: 'squid', to: 'emperor', sources: ['D02', 'P07'], scope: 'Antártida, en general',
    note: 'Algunas especies; en Drescher Inlet fueron una parte muy chica de la dieta.' },
  { from: 'krill', to: 'leopard', sources: ['P05', 'P04', 'L13'], scope: 'Costa Danco, oeste de la Península',
    note: 'La dieta silvestre (costa Danco) y el mecanismo de filtración (cautiverio) son evidencias distintas.' },
  { from: 'fish', to: 'leopard', sources: ['P05', 'L13'], scope: 'Costa Danco, oeste de la Península',
    note: 'Una parte secundaria de la dieta estimada.' },
  { from: 'penguins-seals', to: 'leopard', sources: ['L13', 'P05'], scope: 'Antártida, en general',
    note: 'Las fuentes nombran pingüinos y focas en general, no al emperador en particular.' },
  { from: 'fish', to: 'orca', sources: ['D06'], scope: 'Antártida, en general',
    note: 'Depende del grupo: no todas las orcas comen peces.' },
  { from: 'penguins-seals', to: 'orca', sources: ['D06', 'P06'], scope: 'Oeste de la Península (orcas tipo B)',
    note: 'Depende del grupo: las orcas tipo B estudiadas cazaron casi solo focas de Weddell y evitaron a las focas leopardo.' },
];

/** «X sirve de alimento a Y», the sentence shown for every arrow. Groups are plural: «sirven». */
export function linkSentence(link: MarineLink): string {
  const food = MARINE_ORGANISMS[link.from];
  return `${food.label} ${food.group ? 'sirven' : 'sirve'} de alimento a ${MARINE_ORGANISMS[link.to].label.toLowerCase()}.`;
}

/** The links that start or end at an organism. */
export function linksOf(organism: MarineOrganism): readonly MarineLink[] {
  return MARINE_LINKS.filter((l) => l.from === organism || l.to === organism);
}

/** Without WebGL each view is described in words, so the tour keeps its meaning. */
export const MARINE_VIEW_TEXT: Readonly<Record<MarineView, string>> = {
  ceiling: 'Témpanos de hielo marino flotan sobre el agua oscura. Abajo, la cara del hielo tiene un tinte verdoso de algas y la luz baja en franjas por las grietas.',
  micro: 'Diatomeas aumentadas muchísimas veces: discos con rayos y cadenas de células. En la realidad no se ven a simple vista.',
  krill: 'Un enjambre de krill rojizo y transparente nada bajo el hielo. Cada uno mide unos 6 cm.',
  humpback: 'Una jorobada de aletas pectorales blancas y larguísimas abre la boca en el enjambre de krill. La garganta se infla con agua y después se cierra.',
  minke: 'Una minke, más chica y de hocico puntiagudo, nada entre los témpanos y sube a respirar por una grieta.',
  emperor: 'Emperadores parados en el borde del hielo; uno nada bajo el agua, con las aletas extendidas, entre peces plateados y krill.',
  'emperor-dive': 'Un emperador baja en diagonal hacia los peces y vuelve a subir a respirar por una abertura del hielo.',
  leopard: 'Una foca leopardo, gris y moteada, de cabeza grande, nada bajo el hielo entre peces y krill.',
  teeth: 'Dos estructuras lado a lado: las barbas de una ballena, como un peine de flecos, y los dientes de atrás de la foca leopardo, con tres puntas cada uno.',
  orcas: 'Un grupo de orcas nada en formación cerca del borde del hielo; las aletas dorsales altas sobresalen del agua.',
  web: 'Esquema de flechas: cada una va del alimento a quien lo come.',
  closing: 'El cuaderno abierto con los cinco animales observados.',
};

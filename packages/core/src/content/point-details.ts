import type { Source } from './sea.ts';

/**
 * Verified first description of the map points without an expedition (tier B and C), by point id.
 * Every sentence rests on a quote of one of its sources: docs/puntos-proximamente-fuentes.md.
 */
export const POINT_DETAILS: Readonly<Record<string, { desc: string; sources: readonly Source[] }>> = {
  polo: {
    desc: 'En el Polo Sur geográfico (90° S), sobre el hielo a unos 2.835 m de altura, funciona desde 1956 la Estación Amundsen-Scott, con estudios de astronomía, meteorología y glaciología, entre otros. Su edificio elevado se puede levantar para no quedar enterrado por la nieve, y allí funciona IceCube, un enorme detector de neutrinos dentro del hielo. El 10 de diciembre de 1965 llegó al Polo la Operación 90, la primera expedición terrestre argentina, comandada por Jorge Edgar Leal.',
    sources: [
      { label: 'Amundsen-Scott South Pole Station', org: 'U.S. National Science Foundation (NSF) · Office of Polar Programs', url: 'https://www.nsf.gov/od/opp/ail/amundson-scott-south-pole-station', consulted: '2026-11-13' },
      { label: 'Science on the Ice: The United States Antarctic Program (5.ª edición)', org: 'U.S. National Science Foundation (NSF)', url: 'https://nsf-gov-resources.nsf.gov/files/NSF-Science-on-the-Ice-fifth-edition.pdf', consulted: '2026-11-13' },
      { label: 'Decreto 181/2006: primera expedición terrestre argentina al Polo Sur (10 de diciembre de 1965)', org: 'InfoLEG · Argentina.gob.ar', url: 'https://www.argentina.gob.ar/normativa/nacional/norma-114203/actualizacion', consulted: '2026-11-13' },
      { label: 'Base Belgrano II (reseña de la Operación 90)', org: 'Cancillería Argentina · Dirección Nacional del Antártico (DNA)', url: 'https://cancilleria.gob.ar/es/iniciativas/dna/antartida-argentina/bases/belgrano-ii', consulted: '2026-11-13' },
    ],
  },
  testigos: {
    desc: 'Cuando la nieve se compacta y se vuelve hielo, el aire que quedaba entre los cristales queda encerrado en burbujas: son muestras de la atmósfera de otras épocas. En el Domo C, el proyecto europeo EPICA perforó hasta 3.260 m y obtuvo un registro de unos 800.000 años. En 2025, Beyond EPICA llegó a la roca a 2.800 m en Little Dome C, con hielo que guarda un registro continuo del clima de hasta 1,2 millones de años.',
    sources: [
      { label: 'Paleoclimatology: The Ice Core Record', org: 'NASA Science · Earth Observatory', url: 'https://science.nasa.gov/earth/earth-observatory/paleoclimatology-the-ice-core-record/', consulted: '2026-11-13' },
      { label: 'Science on the Ice: The United States Antarctic Program (5.ª edición)', org: 'U.S. National Science Foundation (NSF)', url: 'https://nsf-gov-resources.nsf.gov/files/NSF-Science-on-the-Ice-fifth-edition.pdf', consulted: '2026-11-13' },
      { label: 'Two EPICA ice cores revealing 800,000 years of climate history: an overview', org: 'Alfred Wegener Institute (AWI)', url: 'https://epic.awi.de/id/eprint/18400/', consulted: '2026-11-13' },
      { label: 'Antarctica: Historic Drilling Campaign Reaches more than 1.2-Million-Year-Old Ice (comunicado, 2025)', org: 'Beyond EPICA · CNR-ISP', url: 'https://www.beyondepica.eu/fileadmin/user_upload/www.beyondepica.eu/user_upload/Beyond_EPICA_upload/Clara/New_Events/Press_Release/PR_Antarctica_Beyond_Epica_bedrock_4th_drilling_campaign_2025.pdf', consulted: '2026-11-13' },
    ],
  },
  belgrano: {
    desc: 'La Base Belgrano II se inauguró el 5 de febrero de 1979 sobre roca firme, en el nunatak Bertrab, al sur del Mar de Weddell. Es la base más austral de la Argentina, a 1.300 km del Polo Sur. Tiene cuatro meses de noche polar, vientos fuertes y temperaturas de hasta -54 °C, y se abastece una vez por año, sobre todo con el rompehielos Almirante Irízar. De noche se ven abundantes auroras polares. En el Laboratorio Belgrano (LABEL), científicos del Instituto Antártico Argentino estudian el ozono, el magnetismo, el clima y los sismos.',
    sources: [
      { label: 'Base Belgrano II', org: 'Cancillería Argentina · Dirección Nacional del Antártico (DNA)', url: 'https://cancilleria.gob.ar/es/iniciativas/dna/antartida-argentina/bases/belgrano-ii', consulted: '2026-11-13' },
      { label: 'Base Belgrano II', org: 'Ejército Argentino · Argentina.gob.ar', url: 'https://www.argentina.gob.ar/ejercito/antartida/base-belgrano2', consulted: '2026-11-13' },
      { label: 'Historia de las Fuerzas Armadas en la Antártida', org: 'Comando Conjunto Antártico · Argentina.gob.ar', url: 'https://www.argentina.gob.ar/informacion-sobre-el-comando-conjunto-antartico/historia-de-las-fuerzas-armadas-en-la-antartida', consulted: '2026-11-13' },
      { label: '47° aniversario de la Base Conjunta Antártica Belgrano 2', org: 'Ministerio de Defensa · Argentina.gob.ar', url: 'https://www.argentina.gob.ar/noticias/47deg-aniversario-de-la-base-conjunta-antartica-belgrano-2', consulted: '2026-11-13' },
    ],
  },
  vostok: {
    desc: 'El Lago Vostok es el mayor lago bajo el hielo de la Antártida: cubre 15.690 km², tiene hasta 510 m de profundidad y está debajo de 3.700 a 4.200 m de hielo. Sigue líquido porque el hielo aísla del frío el calor que llega desde la roca, y la presión baja el punto de fusión del agua. Podría guardar ecosistemas aislados durante millones de años, y su estudio ayuda a pensar si hay vida bajo el hielo de Europa, una luna de Júpiter.',
    sources: [
      { label: 'Ecology of Subglacial Lake Vostok (Antarctica), Based on Metagenomic/Metatranscriptomic Analyses of Accretion Ice', org: 'Biology (MDPI) · PubMed Central (NIH)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3960894/', consulted: '2026-11-13' },
      { label: 'Recent advances in understanding Antarctic subglacial lakes and hydrology', org: 'Philosophical Transactions of the Royal Society A · PubMed Central (NIH)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4685968/', consulted: '2026-11-13' },
      { label: 'Science on the Ice: The United States Antarctic Program (5.ª edición)', org: 'U.S. National Science Foundation (NSF)', url: 'https://nsf-gov-resources.nsf.gov/files/NSF-Science-on-the-Ice-fifth-edition.pdf', consulted: '2026-11-13' },
      { label: 'Newly Discovered Antarctic Lakes', org: 'NASA Science · Earth Observatory', url: 'https://science.nasa.gov/earth/earth-observatory/newly-discovered-antarctic-lakes-6258/', consulted: '2026-11-13' },
    ],
  },
  erebus: {
    desc: 'Con 3.794 m de altura en la Isla de Ross, el Monte Erebus es el volcán activo más austral del planeta. Sus laderas están cubiertas de glaciares, pero en su cráter hay un lago de lava activo desde por lo menos 1972, que cada tanto lanza bombas de lava sobre el borde. De su cumbre salen con regularidad columnas de gas y vapor. El vapor de sus fumarolas abre cuevas bajo el hielo y, al congelarse, forma chimeneas huecas de hielo de hasta 10 m.',
    sources: [
      { label: 'Mount Erebus, Antarctica', org: 'NASA Science · Earth Observatory', url: 'https://science.nasa.gov/earth/earth-observatory/mount-erebus-antarctica-87444/', consulted: '2026-11-13' },
      { label: 'Erebus Breaks Through', org: 'NASA Science · Earth Observatory', url: 'https://science.nasa.gov/earth/earth-observatory/erebus-breaks-through-152134/', consulted: '2026-11-13' },
      { label: 'Mt. Erebus, Antarctica', org: 'NASA Science · Photojournal (JPL)', url: 'https://science.nasa.gov/photojournal/mt-erebus-antarctica/', consulted: '2026-11-13' },
      { label: 'The Ice Towers of Mt. Erebus as analogues of biological refuges on Mars', org: 'Lunar and Planetary Institute (USRA)', url: 'https://www.lpi.usra.edu/meetings/sixthmars2003/pdf/3105.pdf', consulted: '2026-11-13' },
    ],
  },
  thwaites: {
    desc: 'El Glaciar Thwaites, en la Antártida Occidental, es el más ancho de la Tierra: unos 120 km. Cada año pierde unos 50.000 millones de toneladas de hielo más de lo que recibe como nieve, y el hielo que fluye al mar se duplicó en tres décadas. Agua de mar unos grados más cálida que el punto de congelación derrite su plataforma flotante desde abajo. Si colapsara por completo, el nivel del mar subiría unos 65 cm.',
    sources: [
      { label: 'Thwaites Glacier Facts', org: 'International Thwaites Glacier Collaboration (ITGC · NSF / NERC)', url: 'https://thwaitesglacier.org/about/facts', consulted: '2026-11-13' },
      { label: 'Thwaites Glacier Transformed', org: 'NASA Science · Earth Observatory', url: 'https://science.nasa.gov/earth/earth-observatory/thwaites-glacier-transformed-146247/', consulted: '2026-11-13' },
    ],
  },
  emperador: {
    desc: 'El pingüino emperador es el único animal que se reproduce en el invierno antártico, sobre el hielo marino fijo a la costa. Solo el macho incuba el huevo sobre sus patas: cuando nace el pichón lleva unos 4 meses de ayuno. Para resistir el frío se agrupan y se turnan los lugares más abrigados, lo que reduce hasta un 50 % la pérdida de calor. Desde satélites se ubican sus colonias por las manchas de guano sobre el hielo, también en la Tierra de la Reina Maud.',
    sources: [
      { label: 'Emperor penguin', org: 'Australian Antarctic Division (AAD)', url: 'https://www.antarctica.gov.au/about-antarctica/animals/penguins/emperor-penguin/', consulted: '2026-11-13' },
      { label: 'Emperor penguin breeding cycle', org: 'Australian Antarctic Division (AAD)', url: 'https://www.antarctica.gov.au/about-antarctica/animals/penguins/emperor-penguin/breeding-cycle/', consulted: '2026-11-13' },
      { label: 'A Changing World for Emperor Penguins', org: 'NASA Science · Earth Observatory', url: 'https://science.nasa.gov/earth/earth-observatory/a-changing-world-for-emperor-penguins/', consulted: '2026-11-13' },
      { label: 'Four unreported emperor penguin colonies discovered by satellite', org: 'Antarctic Science (Cambridge University Press)', url: 'https://www.cambridge.org/core/journals/antarctic-science/article/four-unreported-emperor-penguin-colonies-discovered-by-satellite/20956FD3E80F3604C21D0E2AA80FEF9B', consulted: '2026-11-13' },
    ],
  },
  fosiles: {
    desc: 'La Isla Marambio tiene laderas sin hielo con fósiles de plantas, invertebrados y vertebrados. Sus maderas fósiles muestran que en el Eoceno crecían allí bosques de coníferas, en un clima templado. Cerca de la Base Marambio, un investigador del CONICET halló en 2018 al reptil marino Marambionectes molinai, de unos 67 millones de años. De la misma época es el ave buceadora Pujatopouli soberana, que nadaba en un mar mucho más templado que el actual.',
    sources: [
      { label: 'Cretaceous – Paleogene transition at Seymour (Marambio) Island', org: 'International Union of Geological Sciences (IUGS) · Geoheritage', url: 'https://iugs-geoheritage.org/geoheritage_sites/cretaceous-paleogene-k-pg-transition-at-seymour-marambio-island-antarctica/', consulted: '2026-11-13' },
      { label: 'New insights into the Eocene Western Antarctic forests: fossil woods from La Meseta Formation', org: 'CONICET · Bicyt', url: 'https://bicyt.conicet.gov.ar/fichas/produccion/11775307', consulted: '2026-11-13' },
      { label: 'Hallan en la Antártida restos de una nueva especie de un reptil extinto hace 67 millones de años', org: 'CONICET', url: 'https://www.conicet.gov.ar/web-accesible/?nota_id=136847', consulted: '2026-11-13' },
      { label: 'Reportan el hallazgo de un nuevo género y especie de ave buceadora que habitó la Antártida hace 67 millones de años', org: 'CONICET La Plata', url: 'https://laplata.conicet.gov.ar/reportan-el-hallazgo-de-un-nuevo-genero-y-especie-de-ave-buceadora-que-habito-la-antartida-hace-67-millones-de-anos/', consulted: '2026-11-13' },
    ],
  },
  oceano: {
    desc: 'Bajo el hielo marino viven microalgas que alimentan al krill en invierno y primavera, y casi todos los animales grandes de la Antártida dependen del krill. En el Mar de Weddell, el agua muy fría y salada se hunde hasta el fondo: es el Agua de Fondo Antártica, que ayuda a mover la circulación de todo el océano. Esa agua lleva oxígeno a las profundidades y guarda carbono lejos de la atmósfera durante siglos. Bajo el hielo fijo vive la foca de Weddell, que mantiene abiertos sus respiraderos raspando el hielo con los dientes.',
    sources: [
      { label: 'Sea ice algae put spring in krill growth', org: 'Australian Antarctic Division (AAD)', url: 'https://www.antarctica.gov.au/news/2008/sea-ice-algae-put-spring-in-krill-growth/', consulted: '2026-11-13' },
      { label: 'Antarctic krill', org: 'Australian Antarctic Division (AAD)', url: 'https://www.antarctica.gov.au/about-antarctica/animals/krill/', consulted: '2026-11-13' },
      { label: 'Antarctic Bottom Water: How it Contributes to the Global Ocean Circulation', org: 'SCAR · Antarctic Environments Portal', url: 'https://environments.aq/resources/antarctic-bottom-water-how-it-contributes-to-the-global-ocean-circulation/', consulted: '2026-11-13' },
      { label: 'Weddell seal', org: 'Australian Antarctic Division (AAD)', url: 'https://www.antarctica.gov.au/about-antarctica/animals/seals/weddell-seal/', consulted: '2026-11-13' },
    ],
  },
};

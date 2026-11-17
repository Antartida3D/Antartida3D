import type { FactKind } from './orcadas.ts';

/**
 * Content of the scene of the emperor colony of Cerro Nevado (Snow Hill Island, #206): four points
 * of interest to visit, each with short facts. Every sentence and the quote that holds it are in
 * docs/puntos-proximamente-fuentes.md. It is a point of interest, not an expedition: it does not
 * count in the exploration log.
 */

export type CerroNevadoSpotId = 'colony' | 'edge' | 'creche' | 'camp';
export type CerroNevadoSourceId = 'coria2000' | 'iaa' | 'schiel2019' | 'nsidc';

export interface CerroNevadoSource {
  label: string;
  /** Short name for the clickable reference under each fact. */
  short: string;
  org: string;
  url: string;
  consulted: string;
}

export const CERRO_NEVADO_SOURCES: Readonly<Record<CerroNevadoSourceId, CerroNevadoSource>> = {
  coria2000: {
    label: 'A newly discovered breeding colony of Emperor Penguins (Coria y Montalti, Marine Ornithology 28, 2000)',
    short: 'Coria y Montalti, 2000',
    org: 'Instituto Antártico Argentino · Marine Ornithology',
    url: 'https://www.marineornithology.org/PDF/28_2/28_2_5.pdf',
    consulted: '2026-11-17',
  },
  iaa: {
    label: 'Pingüino emperador (M. M. Libertelli)',
    short: 'IAA',
    org: 'Instituto Antártico Argentino · Cancillería Argentina',
    url: 'https://cancilleria.gob.ar/userfiles/ut/pinguinoemperador.pdf',
    consulted: '2026-11-17',
  },
  schiel2019: {
    label: 'Population size and condition of the Emperor Penguin colony of Snow Hill Island (Schiel, Güpner y Spitzenberger, Marine Ornithology 47, 2019)',
    short: 'Schiel et al., 2019',
    org: 'Marine Ornithology',
    url: 'https://www.marineornithology.org/PDF/47_2/47_2_189-192.pdf',
    consulted: '2026-11-17',
  },
  nsidc: {
    label: 'Cryosphere glossary: fast ice',
    short: 'NSIDC',
    org: 'National Snow and Ice Data Center (NSIDC)',
    url: 'https://nsidc.org/learn/cryosphere-glossary/fast-ice',
    consulted: '2026-11-17',
  },
};

export interface CerroNevadoFact {
  id: string;
  spot: CerroNevadoSpotId | 'scene';
  kind: FactKind;
  text: string;
  sources: readonly CerroNevadoSourceId[];
}

export interface CerroNevadoSpot {
  id: CerroNevadoSpotId;
  label: string;
  shortLabel: string;
  subtitle: string;
}

/** The map point that opens this scene instead of a card. */
export const CERRO_NEVADO_ID = 'cerronevado';

export const CERRO_NEVADO_TITLE = 'Pingüinos de Cerro Nevado';

/** In visit order. */
export const CERRO_NEVADO_SPOTS: readonly CerroNevadoSpot[] = [
  { id: 'colony', label: 'La colonia', shortLabel: 'Colonia', subtitle: 'La colonia de emperador más al norte' },
  { id: 'edge', label: 'El borde del hielo', shortLabel: 'Borde', subtitle: 'Hielo fijo y hielo suelto' },
  { id: 'creche', label: 'La guardería', shortLabel: 'Guardería', subtitle: 'Pichones al reparo de un témpano' },
  { id: 'camp', label: 'El campamento', shortLabel: 'Campamento', subtitle: 'Desde Base Marambio, sobre el hielo' },
];

export const CERRO_NEVADO_FACTS: readonly CerroNevadoFact[] = [
  {
    id: 'scene-recon',
    spot: 'scene',
    kind: 'recon',
    text: 'La escena es una reconstrucción ilustrada: la cantidad de pingüinos no es un conteo, las distancias están acortadas y el saludo con la aleta es un recurso del dibujo, no algo que hagan los emperadores.',
    sources: [],
  },

  {
    id: 'colony-north',
    spot: 'colony',
    kind: 'real',
    text: 'Frente a la costa sur de la isla Cerro Nevado, sobre el hielo marino fijo, está la colonia de pingüino emperador más al norte que se conoce.',
    sources: ['coria2000', 'schiel2019'],
  },
  {
    id: 'colony-found',
    spot: 'colony',
    kind: 'real',
    text: 'La descubrieron científicos del Instituto Antártico Argentino desde un avión Twin Otter, el 20 de julio de 1997. Estimaron unas 1.200 parejas a partir de fotografías.',
    sources: ['coria2000'],
  },
  {
    id: 'colony-counts',
    spot: 'colony',
    kind: 'real',
    text: 'Según el año, los censos publicados van de 1.200 a unas 4.000 parejas.',
    sources: ['schiel2019'],
  },
  {
    id: 'colony-climate',
    spot: 'colony',
    kind: 'real',
    text: 'Está en una zona donde el clima cambia rápido: por eso seguirla es clave.',
    sources: ['schiel2019', 'iaa'],
  },

  {
    id: 'edge-fast',
    spot: 'edge',
    kind: 'real',
    text: 'El hielo fijo es hielo marino agarrado a la costa: no se mueve con el viento ni con las corrientes.',
    sources: ['nsidc'],
  },
  {
    id: 'edge-colony',
    spot: 'edge',
    kind: 'real',
    text: 'A fines de diciembre de 2018 los pingüinos estaban repartidos a lo largo del borde del hielo fijo, en una franja de unos 3 km, casi todos en zonas planas.',
    sources: ['schiel2019'],
  },
  {
    id: 'edge-pack',
    spot: 'edge',
    kind: 'real',
    text: 'Delante del borde había una franja angosta de hielo suelto, con grupos chicos de pichones sobre los témpanos.',
    sources: ['schiel2019'],
  },

  {
    id: 'creche-largest',
    spot: 'creche',
    kind: 'real',
    text: 'Los pichones se juntan en guarderías. La más grande que se vio en 2018 tenía 144 pichones, al reparo de un témpano.',
    sources: ['schiel2019'],
  },
  {
    id: 'creche-mask',
    spot: 'creche',
    kind: 'real',
    text: 'Mientras cambian el plumón por las plumas, casi todos conservan la máscara blanca de la cara.',
    sources: ['schiel2019'],
  },
  {
    id: 'creche-september',
    spot: 'creche',
    kind: 'real',
    text: 'Las guarderías se forman hacia fines de septiembre: unos pocos adultos cuidan a los pichones mientras los demás van al mar a buscar comida.',
    sources: ['iaa'],
  },

  {
    id: 'camp-since',
    spot: 'camp',
    kind: 'real',
    text: 'Desde 2013 científicos argentinos estudian la colonia en campañas de agosto y septiembre.',
    sources: ['iaa'],
  },
  {
    id: 'camp-route',
    spot: 'camp',
    kind: 'real',
    text: 'Salen de Base Marambio, a unos 65 km: primero sobrevuelan la colonia en un Twin Otter y después cruzan el hielo durante unas 4 horas en motos de nieve y trineos.',
    sources: ['iaa'],
  },
  {
    id: 'camp-ice',
    spot: 'camp',
    kind: 'real',
    text: 'Acampan sobre el hielo a unos 300 m de la colonia, al reparo de un témpano. La temperatura puede bajar de -45 °C y el viento pasar los 130 km/h.',
    sources: ['iaa'],
  },
];

export function cerroNevadoFacts(spot: CerroNevadoSpotId | 'scene'): readonly CerroNevadoFact[] {
  return CERRO_NEVADO_FACTS.filter((f) => f.spot === spot);
}

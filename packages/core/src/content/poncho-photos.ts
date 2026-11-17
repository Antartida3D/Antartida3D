/**
 * Photographs shown at some stops of Poncho's trip. Each one keeps where it was taken from (URL, who
 * publishes it, date consulted) and the state of its rights: nothing is invented. The page of the
 * Fundación Marambio gives no caption, date or photographer for two of them, so none is claimed; their rights are
 * `pending` (docs/expediciones/poncho-fuentes.md, 4.2) until the team attaches the permission. The photograph of
 * Base Esperanza is `licensed`: it has a free license and shows its author and license where it is shown.
 */
export interface PonchoPhoto {
  /** Id of the milestone (PONCHO_MILESTONES) whose card shows it. */
  readonly stop: string;
  /** Name of the file in `@antartida/core/assets/poncho/`. */
  readonly file: 'poncho-pagina.jpg' | 'perros-trineo.jpg' | 'esperanza.jpg' | 'san-martin.jpg';
  readonly alt: string;
  /** What is seen, in our own words (the source gives no caption). */
  readonly caption: string;
  readonly source: { readonly url: string; readonly publisher: string; readonly accessed: string };
  readonly rights: 'pending' | 'licensed';
  /** A licensed (or public-domain) photograph shows its author and license (and the link to the license or the release) with it. */
  readonly credit?: { readonly author: string; readonly license: string; readonly licenseUrl: string };
}

const FUNDACION = 'Fundación Marambio';
const COMMONS = 'Wikimedia Commons';
const ACCESSED = '2026-11-15';

export const PONCHO_PHOTOS: readonly PonchoPhoto[] = [
  {
    stop: 'poncho-perro-guia',
    file: 'poncho-pagina.jpg',
    alt: 'Dos fotos en blanco y negro: a la izquierda, perros de trineo sobre la nieve con una persona detrás; a la derecha, un perro de pelo espeso en primer plano.',
    caption: 'Imagen de la página “Poncho” de la Fundación Marambio. La página no indica autor, fecha ni pie de foto.',
    source: { url: 'https://www.marambio.aq/images/poncho1.jpg', publisher: FUNDACION, accessed: ACCESSED },
    rights: 'pending',
  },
  {
    stop: 'poncho-perro-guia',
    file: 'san-martin.jpg',
    alt: 'La Base San Martín vista desde el mar congelado: casas rojas de techo oscuro al pie de lomas de roca y nieve, mástiles de antena y, detrás, el frente azul de un glaciar.',
    caption: 'La Base San Martín, en la bahía Margarita, desde el mar congelado, en agosto de 2008. Es una foto actual, no de 1962.',
    source: { url: 'https://commons.wikimedia.org/wiki/File:San_Mart%C3%ADn_Base,_Antarctica.jpg', publisher: COMMONS, accessed: '2026-11-17' },
    rights: 'licensed',
    credit: { author: 'Antartico', license: 'Dominio público', licenseUrl: 'https://commons.wikimedia.org/wiki/File:San_Mart%C3%ADn_Base,_Antarctica.jpg' },
  },
  {
    stop: 'patrulla-paralelo-82',
    file: 'perros-trineo.jpg',
    alt: 'Una persona en un trineo, abrigada de rojo, tirado por una jauría de perros sobre una llanura de nieve bajo el cielo azul.',
    caption: 'Un equipo de perros polares tirando de un trineo, de la página “El perro polar”. Fotografía ilustrativa: no indica autor ni fecha, y no es de esta patrulla.',
    source: { url: 'https://www.marambio.aq/galeria/fauna/perros/PERROS04.jpg', publisher: FUNDACION, accessed: ACCESSED },
    rights: 'pending',
  },
  {
    stop: 'nacimiento',
    file: 'esperanza.jpg',
    alt: 'La Base Esperanza vista desde el agua: casas de madera de color rojo anaranjado con zócalo amarillo, repartidas por una ladera de roca oscura y nieve, con un témpano en la orilla.',
    caption: 'La Base Esperanza, en la bahía Esperanza, vista desde el mar en enero de 2016. Es una foto actual, no de 1961.',
    source: {
      url: 'https://commons.wikimedia.org/wiki/File:Hope_Bay-2016-Trinity_Peninsula%E2%80%93Esperanza_Station_02.jpg',
      publisher: COMMONS,
      accessed: '2026-11-16',
    },
    rights: 'licensed',
    credit: { author: 'Godot13 (Andrew Shiva)', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' },
  },
];

/** The photographs of a stop, in order (none for most stops). */
export const ponchoPhotosAt = (stopId: string): readonly PonchoPhoto[] => PONCHO_PHOTOS.filter((p) => p.stop === stopId);

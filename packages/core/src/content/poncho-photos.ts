/**
 * Photographs shown at some stops of Poncho's trip. Each one keeps where it was taken from (URL, who
 * publishes it, date consulted) and the state of its rights: nothing is invented. The page of the
 * Fundación Marambio gives no caption, date or photographer for these two, so none is claimed.
 * Rights are `pending` (docs/expediciones/poncho-fuentes.md, 4.2) until the team attaches the permission.
 */
export interface PonchoPhoto {
  /** Id of the milestone (PONCHO_MILESTONES) whose card shows it. */
  readonly stop: string;
  /** The photograph shows from this sentence of the stop on (0: the first), when the story reaches what it shows. */
  readonly fromStep: number;
  /** Name of the file in `@antartida/core/assets/poncho/`. */
  readonly file: 'poncho-pagina.jpg' | 'perros-trineo.jpg';
  readonly alt: string;
  /** What is seen, in our own words (the source gives no caption). */
  readonly caption: string;
  readonly source: { readonly url: string; readonly publisher: string; readonly accessed: string };
  readonly rights: 'pending';
}

const FUNDACION = 'Fundación Marambio';
const ACCESSED = '2026-11-15';

export const PONCHO_PHOTOS: readonly PonchoPhoto[] = [
  {
    stop: 'poncho-perro-guia',
    fromStep: 1,
    file: 'poncho-pagina.jpg',
    alt: 'Dos fotos en blanco y negro: a la izquierda, perros de trineo sobre la nieve con una persona detrás; a la derecha, un perro de pelo espeso en primer plano.',
    caption: 'Imagen de la página «Poncho» de la Fundación Marambio. La página no indica autor, fecha ni pie de foto.',
    source: { url: 'https://www.marambio.aq/images/poncho1.jpg', publisher: FUNDACION, accessed: ACCESSED },
    rights: 'pending',
  },
  {
    stop: 'patrulla-paralelo-82',
    fromStep: 0,
    file: 'perros-trineo.jpg',
    alt: 'Una persona en un trineo, abrigada de rojo, tirado por una jauría de perros sobre una llanura de nieve bajo el cielo azul.',
    caption: 'Un equipo de perros polares tirando de un trineo, de la página «El perro polar». Fotografía ilustrativa: no indica autor ni fecha, y no es de esta patrulla.',
    source: { url: 'https://www.marambio.aq/galeria/fauna/perros/PERROS04.jpg', publisher: FUNDACION, accessed: ACCESSED },
    rights: 'pending',
  },
];

/** The photograph of a stop, if it has one. */
export const ponchoPhotoAt = (stopId: string): PonchoPhoto | undefined => PONCHO_PHOTOS.find((p) => p.stop === stopId);

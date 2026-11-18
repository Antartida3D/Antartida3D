import { POINT_DETAILS } from './point-details.ts';
import { PTS } from './points.ts';
import { pointCited } from '../sources.ts';
import type { ScenePoint } from './scene-point.ts';

/**
 * The scene of Belgrano II (#287). Its facts are the verified sentences of the point's card
 * (point-details.ts): nothing new is said, so nothing new needs a source. Every sentence and its
 * quote are in docs/puntos-proximamente-fuentes.md. Source ids are their place in the card's list:
 * 0 Cancillería (DNA), 1 Ejército Argentino, 2 Comando Conjunto Antártico, 3 Ministerio de Defensa.
 */

export type BelgranoSpotId = 'nunatak' | 'south' | 'winter' | 'label';

const POINT = PTS.find((p) => p.id === 'belgrano')!;

export const BELGRANO_SCENE: ScenePoint<BelgranoSpotId> = {
  id: 'belgrano',
  title: POINT.title,
  spots: [
    { id: 'nunatak', label: 'Una base sobre la roca', shortLabel: 'Nunatak', subtitle: 'El nunatak Bertrab, al sur del Mar de Weddell' },
    { id: 'south', label: 'La base más austral', shortLabel: 'Más austral', subtitle: 'La bandera, a 1.300 km del Polo Sur' },
    { id: 'winter', label: 'Noche, viento y frío', shortLabel: 'Invierno', subtitle: 'Cuatro meses de noche y un barco por año' },
    { id: 'label', label: 'El Laboratorio Belgrano', shortLabel: 'LABEL', subtitle: 'Ozono, magnetismo, clima y sismos' },
  ],
  facts: [
    {
      id: 'scene-recon',
      spot: 'scene',
      kind: 'recon',
      text: 'La escena es una reconstrucción ilustrada: el nunatak, los edificios, sus colores, su tamaño y su lugar son un dibujo, no un plano. Es de día: la noche polar y las auroras no se dibujan.',
      sources: [],
    },
    {
      id: 'nunatak-1979',
      spot: 'nunatak',
      kind: 'real',
      text: 'La Base Belgrano II se inauguró el 5 de febrero de 1979 sobre roca firme, en el nunatak Bertrab, al sur del Mar de Weddell.',
      sources: ['0', '2'],
    },
    {
      id: 'south-pole',
      spot: 'south',
      kind: 'real',
      text: 'Es la base más austral de la Argentina, a 1.300 km del Polo Sur.',
      sources: ['0', '1'],
    },
    {
      id: 'winter-night',
      spot: 'winter',
      kind: 'real',
      text: 'Tiene cuatro meses de noche polar, vientos fuertes y temperaturas de hasta -54 °C, y se abastece una vez por año, sobre todo con el rompehielos Almirante Irízar.',
      sources: ['0', '3'],
    },
    {
      id: 'winter-aurora',
      spot: 'winter',
      kind: 'real',
      text: 'De noche se ven abundantes auroras polares.',
      sources: ['1'],
    },
    {
      id: 'label-science',
      spot: 'label',
      kind: 'real',
      text: 'En el Laboratorio Belgrano (LABEL), científicos del Instituto Antártico Argentino estudian el ozono, el magnetismo, el clima y los sismos.',
      sources: ['1', '0'],
    },
  ],
  cited: POINT_DETAILS.belgrano.sources.map(pointCited),
};

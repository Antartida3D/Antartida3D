import { POINT_DETAILS } from './point-details.ts';
import { PTS } from './points.ts';
import { pointCited } from '../sources.ts';
import type { ScenePoint } from './scene-point.ts';

/**
 * The scene of the South Pole (#286). Its facts are the verified sentences of the point's card
 * (point-details.ts), one per spot: nothing new is said, so nothing new needs a source. Every
 * sentence and its quote are in docs/puntos-proximamente-fuentes.md. Source ids are their place in
 * the card's list: 0 NSF station page, 1 NSF Science on the Ice, 2 Decreto 181/2006, 3 Cancillería.
 */

export type PoloSpotId = 'station' | 'raised' | 'op90';

const POINT = PTS.find((p) => p.id === 'polo')!;

export const POLO_SCENE: ScenePoint<PoloSpotId> = {
  id: 'polo',
  title: POINT.title,
  spots: [
    { id: 'station', label: 'Una estación en el Polo', shortLabel: 'Estación', subtitle: 'Sobre el hielo, en el punto más austral del planeta' },
    { id: 'raised', label: 'Un edificio que se levanta', shortLabel: 'Pilotes', subtitle: 'Sobre pilotes, para que la nieve no lo entierre' },
    { id: 'op90', label: 'La Operación 90', shortLabel: 'Operación 90', subtitle: 'La primera expedición terrestre argentina al Polo' },
  ],
  facts: [
    {
      id: 'scene-recon',
      spot: 'scene',
      kind: 'recon',
      text: 'La escena es una reconstrucción ilustrada: los edificios, sus colores, su tamaño y su lugar son un dibujo, no un plano, y las banderas del anillo son ilustrativas.',
      sources: [],
    },
    {
      id: 'station-ice',
      spot: 'station',
      kind: 'real',
      text: 'En el Polo Sur geográfico (90° S), sobre el hielo a unos 2.835 m de altura, funciona desde 1956 la Estación Amundsen-Scott, con estudios de astronomía, meteorología y glaciología, entre otros.',
      sources: ['0'],
    },
    {
      id: 'raised-icecube',
      spot: 'raised',
      kind: 'real',
      text: 'Su edificio elevado se puede levantar para no quedar enterrado por la nieve, y allí funciona IceCube, un enorme detector de neutrinos dentro del hielo.',
      sources: ['1', '0'],
    },
    {
      id: 'op90-1965',
      spot: 'op90',
      kind: 'real',
      text: 'El 10 de diciembre de 1965 llegó al Polo la Operación 90, la primera expedición terrestre argentina, comandada por Jorge Edgar Leal.',
      sources: ['2', '3'],
    },
  ],
  cited: POINT_DETAILS.polo.sources.map(pointCited),
};

import { POINT_DETAILS } from './point-details.ts';
import { PTS } from './points.ts';
import { pointCited } from '../sources.ts';
import type { ScenePoint } from './scene-point.ts';

/**
 * The scene of Thwaites Glacier (#280). Its facts are the verified sentences of the point's card
 * (point-details.ts), split among the spots: nothing new is said, so nothing new needs a source.
 * Every sentence and its quote are in docs/puntos-proximamente-fuentes.md. Source ids are their
 * place in the card's list: 0 ITGC, 1 NASA Earth Observatory.
 */

export type ThwaitesSpotId = 'front' | 'loss' | 'below' | 'sea';

const POINT = PTS.find((p) => p.id === 'thwaites')!;

export const THWAITES_SCENE: ScenePoint<ThwaitesSpotId> = {
  id: 'thwaites',
  title: POINT.title,
  spots: [
    { id: 'front', label: 'El frente del glaciar', shortLabel: 'Frente', subtitle: 'Donde el hielo llega al Mar de Amundsen' },
    { id: 'loss', label: 'El hielo que se va', shortLabel: 'Pérdida', subtitle: 'Más hielo sale al mar del que llega como nieve' },
    { id: 'below', label: 'Desde abajo', shortLabel: 'Abajo', subtitle: 'El agua de mar debajo de la plataforma' },
    { id: 'sea', label: 'El nivel del mar', shortLabel: 'Mar', subtitle: 'Por qué la ciencia lo sigue tan de cerca' },
  ],
  facts: [
    {
      id: 'scene-recon',
      spot: 'scene',
      kind: 'recon',
      text: 'La escena es una reconstrucción ilustrada: el frente y el hielo están dibujados más altos de lo que son, el ancho está acortado y los desprendimientos están acelerados.',
      sources: [],
    },
    {
      id: 'front-width',
      spot: 'front',
      kind: 'real',
      text: 'El Glaciar Thwaites, en la Antártida Occidental, es el más ancho de la Tierra: unos 120 km.',
      sources: ['0'],
    },
    {
      id: 'loss-balance',
      spot: 'loss',
      kind: 'real',
      text: 'Cada año pierde unos 50.000 millones de toneladas de hielo más de lo que recibe como nieve, y el hielo que fluye al mar se duplicó en tres décadas.',
      sources: ['0', '1'],
    },
    {
      id: 'below-melt',
      spot: 'below',
      kind: 'real',
      text: 'Agua de mar unos grados más cálida que el punto de congelación derrite su plataforma flotante desde abajo.',
      sources: ['1'],
    },
    {
      id: 'sea-level',
      spot: 'sea',
      kind: 'real',
      text: 'Si colapsara por completo, el nivel del mar subiría unos 65 cm.',
      sources: ['0'],
    },
  ],
  cited: POINT_DETAILS.thwaites.sources.map(pointCited),
};

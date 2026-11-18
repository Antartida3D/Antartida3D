import { POINT_DETAILS } from './point-details.ts';
import { PTS } from './points.ts';
import { pointCited } from '../sources.ts';
import type { ScenePoint } from './scene-point.ts';

/**
 * The scene of the ice cores (#288). Its facts are the verified sentences of the point's card
 * (point-details.ts), one per spot: nothing new is said, so nothing new needs a source. Every
 * sentence and its quote are in docs/puntos-proximamente-fuentes.md. Source ids are their place in
 * the card's list: 0 NASA Earth Observatory, 1 NSF Science on the Ice, 2 AWI (EPICA), 3 Beyond EPICA.
 */

export type TestigosSpotId = 'bubbles' | 'epica' | 'beyond';

const POINT = PTS.find((p) => p.id === 'testigos')!;

export const TESTIGOS_SCENE: ScenePoint<TestigosSpotId> = {
  id: 'testigos',
  title: POINT.title,
  spots: [
    { id: 'bubbles', label: 'Aire guardado en burbujas', shortLabel: 'Burbujas', subtitle: 'La nieve se vuelve hielo y encierra aire' },
    { id: 'epica', label: 'EPICA, en el Domo C', shortLabel: 'EPICA', subtitle: 'Una perforación de miles de metros' },
    { id: 'beyond', label: 'Hasta la roca', shortLabel: 'Roca', subtitle: 'Beyond EPICA, en Little Dome C' },
  ],
  facts: [
    {
      id: 'scene-recon',
      spot: 'scene',
      kind: 'recon',
      text: 'La escena es una reconstrucción ilustrada: el campamento, el corte del hielo, sus capas y sus burbujas son un dibujo y no están a escala. Un solo corte muestra las dos perforaciones, que se hicieron en lugares distintos: el Domo C y Little Dome C.',
      sources: [],
    },
    {
      id: 'bubbles-air',
      spot: 'bubbles',
      kind: 'real',
      text: 'Cuando la nieve se compacta y se vuelve hielo, el aire que quedaba entre los cristales queda encerrado en burbujas: son muestras de la atmósfera de otras épocas.',
      sources: ['0', '1'],
    },
    {
      id: 'epica-800k',
      spot: 'epica',
      kind: 'real',
      text: 'En el Domo C, el proyecto europeo EPICA perforó hasta 3.260 m y obtuvo un registro de unos 800.000 años.',
      sources: ['2'],
    },
    {
      id: 'beyond-bedrock',
      spot: 'beyond',
      kind: 'real',
      text: 'En 2025, Beyond EPICA llegó a la roca a 2.800 m en Little Dome C, con hielo que guarda un registro continuo del clima de hasta 1,2 millones de años.',
      sources: ['3'],
    },
  ],
  cited: POINT_DETAILS.testigos.sources.map(pointCited),
};

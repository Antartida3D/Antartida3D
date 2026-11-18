import { POINT_DETAILS } from './point-details.ts';
import { PTS } from './points.ts';
import { pointCited } from '../sources.ts';
import type { ScenePoint } from './scene-point.ts';

/**
 * The scene of Lake Vostok (#281). Its facts are the verified sentences of the point's card
 * (point-details.ts), one per spot: nothing new is said, so nothing new needs a source. Every
 * sentence and its quote are in docs/puntos-proximamente-fuentes.md. Source ids are their place in
 * the card's list: 0 PMC3960894, 1 PMC4685968, 2 NSF, 3 NASA Earth Observatory.
 */

export type VostokSpotId = 'lake' | 'liquid' | 'life';

const POINT = PTS.find((p) => p.id === 'vostok')!;

export const VOSTOK_SCENE: ScenePoint<VostokSpotId> = {
  id: 'vostok',
  title: POINT.title,
  spots: [
    { id: 'lake', label: 'El lago bajo el hielo', shortLabel: 'Lago', subtitle: 'Un corte de la capa de hielo, de la nieve a la roca' },
    { id: 'liquid', label: 'Por qué sigue líquido', shortLabel: 'Líquido', subtitle: 'El calor de la roca y el peso del hielo' },
    { id: 'life', label: 'Vida aislada', shortLabel: 'Vida', subtitle: 'Millones de años sin contacto con el exterior' },
  ],
  facts: [
    {
      id: 'scene-recon',
      spot: 'scene',
      kind: 'recon',
      text: 'La escena es una reconstrucción ilustrada: el corte no está a escala. El lago y la estación están dibujados mucho más grandes de lo que son al lado del hielo.',
      sources: [],
    },
    {
      id: 'lake-size',
      spot: 'lake',
      kind: 'real',
      text: 'El Lago Vostok es el mayor lago bajo el hielo de la Antártida: cubre 15.690 km², tiene hasta 510 m de profundidad y está debajo de 3.700 a 4.200 m de hielo.',
      sources: ['0'],
    },
    {
      id: 'liquid-why',
      spot: 'liquid',
      kind: 'real',
      text: 'Sigue líquido porque el hielo aísla del frío el calor que llega desde la roca, y la presión baja el punto de fusión del agua.',
      sources: ['1', '2'],
    },
    {
      id: 'life-isolated',
      spot: 'life',
      kind: 'real',
      text: 'Podría guardar ecosistemas aislados durante millones de años, y su estudio ayuda a pensar si hay vida bajo el hielo de Europa, una luna de Júpiter.',
      sources: ['3'],
    },
  ],
  cited: POINT_DETAILS.vostok.sources.map(pointCited),
};

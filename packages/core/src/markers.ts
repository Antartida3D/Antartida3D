import { PTS, TIER, type MapPoint } from './content/points.ts';
import type { SeaPoint } from './content/sea.ts';
import { fanOffsets, markerGap } from './fan.ts';
import { labelSide, type LabelSide } from './labels.ts';
import { geometry, toScreen, type Size, type View } from './viewport.ts';

/**
 * What a press on a marker does. Any activation — touch, mouse or keyboard — opens the marker
 * directly on the first press, while hover, keyboard focus or the guide still surface its label.
 */
export function markerPress(_shown: string | null, _key: string, _touch: boolean): 'show' | 'open' {
  return 'open';
}

interface MarkerBase {
  key: string;
  /** Position in screen px for the current view. */
  left: number;
  top: number;
  /** Map space coordinates (0..1000). */
  x: number;
  y: number;
  cls: string;
  aria: string;
}

export interface PointMarker extends MarkerBase {
  kind: 'point';
  point: MapPoint;
  /**
   * `left` and `top` are where the marker is drawn. When markers crowd each other it is moved from its
   * real place by (dx, dy) px, with a thin line back to it (#238); both are 0 when it stands alone.
   */
  dx: number;
  dy: number;
  pulse: boolean;
  check: boolean;
  next: boolean;
  label: { title: string; sub: string; side: LabelSide } | null;
}

export interface SeaMarker extends MarkerBase {
  kind: 'sea';
  point: SeaPoint;
  label: { title: string; sub: string; side: LabelSide } | null;
}

export type Marker = PointMarker | SeaMarker;

export type ScreenProjector = (x: number, y: number) => { left: number; top: number; visible?: boolean };

/** Everything a framework needs to render the marker overlay for a given view. */
export function buildMarkers(
  size: Size,
  view: View,
  /** Ids of the expeditions already completed. */
  explored: readonly string[],
  points: readonly MapPoint[] = PTS,
  toScreenFn?: ScreenProjector,
  /** Id of the suggested next expedition. */
  next?: string,
  /** Id of the unfinished expedition «Continuar» offers: it gets the same halo as `next`. */
  resume?: string
): Marker[] {
  const geo = geometry(size);
  const projector: ScreenProjector = toScreenFn || ((x, y) => toScreen(geo, view, x, y));
  const markers: Marker[] = [];

  // Markers that crowd each other fan out (#238); a marker the projector hides takes no room.
  const shown = points.flatMap((p) => {
    const pos = projector(p.x, p.y);
    return pos.visible === false ? [] : [{ p, pos }];
  });
  const offsets = fanOffsets(shown.map((s) => s.pos), markerGap(size.vw));
  shown.forEach(({ p, pos }, i) => {
    const { dx, dy } = offsets[i];
    const isA = p.tier === 'A';
    const done = isA && explored.includes(p.id);
    const isResume = resume !== undefined && p.id === resume && !done;
    const isNext = (next !== undefined && p.id === next) || isResume;
    markers.push({
      kind: 'point',
      key: p.id,
      left: pos.left + dx,
      top: pos.top + dy,
      dx,
      dy,
      x: p.x,
      y: p.y,
      point: p,
      pulse: isNext && !done,
      check: done,
      next: isNext,
      label: null,
      cls: 'mk t' + p.tier.toLowerCase() + (done ? ' done' : '') + (isNext ? ' next' : ''),
      aria: p.title + ', ' + p.place + '. ' +
        (isA
          ? (done
              ? 'Expedición explorada. Volver a recorrerla.'
              : isResume
                ? 'Expedición a medias. Continuar.'
                : isNext
                ? 'Expedición sugerida para seguir. Empezar.'
                : 'Expedición disponible. Empezar.')
          : TIER[p.tier] + '. Ver ficha.'),
    });
  });

  // Every marker carries its label; the interface shows one at a time (markerPress).
  for (const m of markers) {
    if (m.kind !== 'point') continue;
    const sub = m.point.tier === 'A'
      ? (m.check ? 'Explorado · ' + m.point.place : m.next ? (resume === m.key ? 'Continuar · ' : 'Siguiente · ') + m.point.place : m.point.place)
      : TIER[m.point.tier];
    const side = labelSide(m.left, m.point.title, sub, size.vw);
    m.label = { title: m.point.title, sub, side };
    if (side === 'left') m.cls += ' lbl-left';
  }
  return markers;
}

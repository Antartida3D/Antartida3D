import { PTS, TIER, type MapPoint } from './content/points.ts';
import type { SeaPoint } from './content/sea.ts';
import { centroid, clusterPoints, separationZoom } from './clustering.ts';
import { labelSide, type LabelSide } from './labels.ts';
import { MAX_K, focusWorld, geometry, toScreen, type Size, type View } from './viewport.ts';

/**
 * What a press on a marker does. Labels are closed: a finger has no hover, so its first press
 * shows the label and the second one opens; a mouse or the keyboard already see the label
 * (hover, focus) and open at once.
 */
export function markerPress(shown: string | null, key: string, touch: boolean): 'show' | 'open' {
  return touch && shown !== key ? 'show' : 'open';
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

export interface ClusterMarker extends MarkerBase {
  kind: 'cluster';
  count: number;
  /** View that separates the cluster when tapped. */
  target: View;
  /** The points in it. */
  points: readonly MapPoint[];
  /**
   * Zooming no longer separates it: the view is already at the closest zoom, or its points are so
   * close (Base Marambio, Fósiles and Poncho, #7) that they stay together even there. Tapping it lets
   * the visitor pick one of its points instead.
   */
  pick: boolean;
  hasNext: boolean;
  nextPoint: MapPoint | null;
}

export type Marker = PointMarker | SeaMarker | ClusterMarker;

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
  next?: string
): Marker[] {
  const geo = geometry(size);
  const projector: ScreenProjector = toScreenFn || ((x, y) => toScreen(geo, view, x, y));
  const markers: Marker[] = [];

  for (const group of clusterPoints(points, projector)) {
    if (group.length > 1) {
      const c = centroid(group);
      const pos = projector(c.x, c.y);
      if (pos.visible === false) continue;
      const apart = separationZoom(group, geo.S);
      const nk = Math.max(view.k * 1.8, apart);
      // Zooming in all the way would not split it (Base Marambio, Fósiles and, on a phone, Poncho): pick instead.
      const pick = view.k >= MAX_K || clusterPoints(group, (geo.S * MAX_K) / 1000).length === 1;
      const nextPoint = next ? (group.find((g) => g.id === next) ?? null) : null;
      const hasNext = nextPoint !== null;
      markers.push({
        kind: 'cluster',
        key: 'c:' + group.map((g) => g.id).join(','),
        left: pos.left,
        top: pos.top,
        x: c.x,
        y: c.y,
        count: group.length,
        cls: 'mk cluster' + (group.some((g) => g.tier === 'A') ? ' has-a' : '') + (hasNext ? ' has-next' : ''),
        aria: 'Grupo de ' + group.length + ' puntos: ' + group.map((g) => g.title).join(', ') +
          (nextPoint ? '. Incluye la siguiente sugerida: ' + nextPoint.title : '') +
          (pick ? '. Tocá para elegir uno.' : '. Tocá para acercar.'),
        target: focusWorld(size, c.x, c.y, nk),
        points: group,
        pick,
        hasNext,
        nextPoint,
      });
      continue;
    }
    const p = group[0];
    const pos = projector(p.x, p.y);
    if (pos.visible === false) continue;
    const isA = p.tier === 'A';
    const done = isA && explored.includes(p.id);
    const isNext = next !== undefined && p.id === next;
    markers.push({
      kind: 'point',
      key: p.id,
      left: pos.left,
      top: pos.top,
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
              : isNext
                ? 'Expedición sugerida para seguir. Empezar.'
                : 'Expedición disponible. Empezar.')
          : TIER[p.tier] + '. Ver ficha.'),
    });
  }

  // Every marker carries its label; the interface shows one at a time (markerPress).
  for (const m of markers) {
    if (m.kind !== 'point') continue;
    const sub = m.point.tier === 'A'
      ? (m.check ? 'Explorado · ' + m.point.place : m.next ? 'Siguiente · ' + m.point.place : m.point.place)
      : TIER[m.point.tier];
    const side = labelSide(m.left, m.point.title, sub, size.vw);
    m.label = { title: m.point.title, sub, side };
    if (side === 'left') m.cls += ' lbl-left';
  }
  return markers;
}

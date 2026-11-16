import { MARAMBIO_POINT, ORCADAS_POINT, PONCHO_POINT, PTS, VOYAGE_POINT, type MapPoint } from './content/points.ts';

/** Suggested expedition order (D1): geographic progression from Ushuaia to the Weddell Sea. */
export const EXPEDITION_ORDER: readonly string[] = [
  VOYAGE_POINT.id,
  MARAMBIO_POINT.id,
  'fosiles',
  PONCHO_POINT.id,
  ORCADAS_POINT.id,
  'oceano',
];

const BY_ID: ReadonlyMap<string, MapPoint> = new Map(PTS.map((p) => [p.id, p]));

/** First expedition in `EXPEDITION_ORDER` not yet in `explored` (unknown ids are ignored). */
export function nextExpedition(explored: readonly string[]): MapPoint | null {
  const done = new Set(explored);
  for (const id of EXPEDITION_ORDER) {
    if (!done.has(id)) return BY_ID.get(id) ?? null;
  }
  return null;
}

/**
 * Suggestion shown on the map after completing `doneId` (`explored` already includes `doneId`).
 * Finishing Marambio also offers the Irizar voyage to Orcadas, unless Orcadas is already next.
 */
export function afterExpedition(
  doneId: string,
  explored: readonly string[],
): { next: MapPoint | null; offerIrizar: boolean } {
  const next = nextExpedition(explored);
  const offerIrizar = doneId === MARAMBIO_POINT.id && next !== null && next.id !== ORCADAS_POINT.id;
  return { next, offerIrizar };
}

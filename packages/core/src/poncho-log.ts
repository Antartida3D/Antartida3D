import type { TransportKind, VoyageFact } from './content/ushuaia.ts';
import { PONCHO_LOG } from './content/poncho.ts';
import { tripLegCount, tripLegRange } from './voyage.ts';

/**
 * The route log: the line to show while the team travels between stops. Lines belong to a leg; the one nearest
 * to `t` among those of its leg is chosen, so the line changes as the trip moves on. A leg without lines
 * (the ship legs) shows none. `leg` forces the leg, for the steps of a trip that does not animate the path.
 */
export function logLineAt(kind: TransportKind, t: number, leg?: number): VoyageFact | null {
  if (kind !== 'dogs') return null;
  const legs = tripLegCount(kind);
  let at = leg;
  if (at === undefined) {
    at = legs - 1;
    for (let i = 0; i < legs; i++) {
      if (t < tripLegRange(kind, i)[1]) {
        at = i;
        break;
      }
    }
  }
  const [from, to] = tripLegRange(kind, at);
  let best: VoyageFact | null = null;
  let gap = Infinity;
  for (const entry of PONCHO_LOG) {
    if (entry.leg !== at) continue;
    const d = Math.abs(from + entry.at * (to - from) - t);
    if (d < gap) {
      gap = d;
      best = entry.fact;
    }
  }
  return best;
}

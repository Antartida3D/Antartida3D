import { FOSSIL_STOPS } from './content/fossils.ts';
import { MARAMBIO_SPOTS } from './content/marambio.ts';
import { MARINE_STOPS } from './content/marine.ts';
import { PONCHO_TRANSPORT } from './content/poncho.ts';
import { TRANSPORTS } from './content/ushuaia.ts';
import { CHAPTERS } from './orcadas.ts';
import type { ResumePoint } from './storage.ts';
import { findTransport, voyageStops } from './voyage.ts';

const EXPEDITION_TOTALS = {
  marambio: { count: MARAMBIO_SPOTS.length, unit: 'punto' },
  fosiles: { count: FOSSIL_STOPS.length, unit: 'parada' },
  oceano: { count: MARINE_STOPS.length, unit: 'parada' },
  orcadas: { count: CHAPTERS.length, unit: 'capítulo' },
} as const;

type ResumableId = keyof typeof EXPEDITION_TOTALS;
type VoyageId = 'campana' | 'poncho';

function isResumableId(id: string): id is ResumableId {
  return id in EXPEDITION_TOTALS;
}

function isVoyageId(id: string): id is VoyageId {
  return id === 'campana' || id === 'poncho';
}

function voyageCount(id: VoyageId, sub?: number): number | null {
  if (id === 'poncho') {
    if (sub !== undefined && (!Number.isInteger(sub) || sub !== 0)) return null;
    return voyageStops(findTransport(PONCHO_TRANSPORT.id).kind).length;
  }
  if (sub === undefined || !Number.isInteger(sub) || sub < 0 || sub >= TRANSPORTS.length) return null;
  return voyageStops(findTransport(TRANSPORTS[sub].id).kind).length;
}

/** Whether `point` refers to an expedition with tracked steps and a valid in-range step. */
export function isValidResume(point: ResumePoint): boolean {
  if (!Number.isInteger(point.step) || point.step < 0) return false;
  if (isVoyageId(point.id)) {
    if (point.id === 'campana' && point.sub === undefined) return point.step === 0;
    const count = voyageCount(point.id, point.sub);
    return count !== null && point.step < count - 1;
  }
  if (!isResumableId(point.id)) return false;
  const { count } = EXPEDITION_TOTALS[point.id];
  if (point.step >= count) return false;
  if (point.sub !== undefined && (!Number.isInteger(point.sub) || point.sub < 0)) return false;
  return true;
}

/** Human-readable step detail for the resume button, or null at the very start / out of range. */
export function resumeDetail(id: string, step: number, sub?: number): string | null {
  if (!isValidResume({ id, step, sub })) return null;
  if (isVoyageId(id)) {
    if (step <= 1) return null;
    const count = voyageCount(id, sub);
    return count !== null ? `hito ${step} de ${count}` : null;
  }
  if (step === 0 && (sub === undefined || sub === 0)) return null;
  const { count, unit } = EXPEDITION_TOTALS[id as ResumableId];
  return `${unit} ${step + 1} de ${count}`;
}

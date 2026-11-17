import { EXPEDITION_POINT } from './content/points.ts';

export const EXPLORED_KEY = 'antartida:explored';
export const VIEW_MODE_KEY = 'antartida:view';
/** The first-visit intro letter (#256) was already shown. */
export const INTRO_KEY = 'antartida:intro';
/** Last opened expedition and step (#186), cleared once completed. */
export const LAST_EXPEDITION_KEY = 'antartida:last';

export interface ResumePoint {
  id: string;
  step: number;
  sub?: number;
}

/** Ids of the completed expeditions. The old format ('1') meant only Fósiles. */
export function loadExplored(): string[] {
  try {
    const raw = localStorage.getItem(EXPLORED_KEY);
    if (raw === '1') return [EXPEDITION_POINT.id];
    const ids: unknown = JSON.parse(raw ?? '[]');
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function saveExplored(ids: readonly string[]): void {
  try {
    localStorage.setItem(EXPLORED_KEY, JSON.stringify(ids));
  } catch {
    // Storage unavailable (private mode, blocked cookies): keep the in-memory state only.
  }
}

export function loadViewMode(): '2d' | '3d' | null {
  try {
    const val = localStorage.getItem(VIEW_MODE_KEY);
    return val === '2d' || val === '3d' ? val : null;
  } catch {
    return null;
  }
}

export function saveViewMode(mode: '2d' | '3d'): void {
  try {
    localStorage.setItem(VIEW_MODE_KEY, mode);
  } catch {
    // Storage unavailable
  }
}

/** Without storage it reads as not seen: the intro then shows once per visit. */
export function loadIntroSeen(): boolean {
  try {
    return localStorage.getItem(INTRO_KEY) === '1';
  } catch {
    return false;
  }
}

export function saveIntroSeen(): void {
  try {
    localStorage.setItem(INTRO_KEY, '1');
  } catch {
    // Storage unavailable: the intro shows again on the next visit.
  }
}

const isNonNegativeInt = (v: unknown): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0;

export function loadLastExpedition(): ResumePoint | null {
  try {
    const raw = localStorage.getItem(LAST_EXPEDITION_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
    const record = parsed as Record<string, unknown>;
    if (typeof record.id !== 'string' || record.id.length === 0) return null;
    if (!isNonNegativeInt(record.step)) return null;
    if (record.sub !== undefined && !isNonNegativeInt(record.sub)) return null;
    return record.sub !== undefined
      ? { id: record.id, step: record.step, sub: record.sub }
      : { id: record.id, step: record.step };
  } catch {
    return null;
  }
}

export function saveLastExpedition(point: ResumePoint | null): void {
  try {
    if (point === null) localStorage.removeItem(LAST_EXPEDITION_KEY);
    else localStorage.setItem(LAST_EXPEDITION_KEY, JSON.stringify(point));
  } catch {
    // Storage unavailable
  }
}

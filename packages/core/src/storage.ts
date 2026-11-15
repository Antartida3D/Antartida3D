import { EXPEDITION_POINT } from './content/points.ts';

export const EXPLORED_KEY = 'antartida:explored';
export const VIEW_MODE_KEY = 'antartida:view';
/** The first-visit welcome (#115) was already shown. */
export const WELCOME_KEY = 'antartida:welcome';

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

/** Without storage it reads as not seen: the welcome then shows once per visit. */
export function loadWelcomeSeen(): boolean {
  try {
    return localStorage.getItem(WELCOME_KEY) === '1';
  } catch {
    return false;
  }
}

export function saveWelcomeSeen(): void {
  try {
    localStorage.setItem(WELCOME_KEY, '1');
  } catch {
    // Storage unavailable: the welcome shows again on the next visit.
  }
}

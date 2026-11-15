/** Whether this browser can open a WebGL context: without one the 3D scenes show a drawing instead. */
export function canUseWebGL(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/** How long a lost WebGL context has to come back before a scene falls back to its drawing. */
export const CONTEXT_RESTORE_MS = 4000;

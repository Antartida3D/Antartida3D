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

const failureListeners = new Set<() => void>();
let sceneFailed = false;

/**
 * Whether a 3D canvas of the app failed to draw since the page loaded (#242). `CanvasGuard`
 * reports it and the app shows `Failed3DNotice`. It stays until a reload: the notice asks for one.
 */
export const scene3DFailure = {
  report(): void {
    if (sceneFailed) return;
    sceneFailed = true;
    for (const listener of failureListeners) listener();
  },
  subscribe(listener: () => void): () => void {
    failureListeners.add(listener);
    return () => failureListeners.delete(listener);
  },
  getSnapshot: (): boolean => sceneFailed,
};

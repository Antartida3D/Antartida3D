import { Component, type KeyboardEvent, type ReactNode } from 'react';
import { scene3DFailure } from './webgl.ts';

/**
 * Goes around every 3D canvas. A canvas that cannot draw (for example, the browser refuses a WebGL
 * context after the app started) throws while it mounts: without a guard the error unmounts the
 * whole app and leaves a blank page (#242). The guard takes the canvas away, reports the failure
 * for the notice (`Failed3DNotice`) and calls `onFail`, where the screen switches to its fallback.
 */
export class CanvasGuard extends Component<{ onFail?: () => void; children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch() {
    scene3DFailure.report();
    this.props.onFail?.();
  }

  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** Tells that the 3D could not be drawn and what to do. It does not block the app, which goes on with its fallback. */
export function Failed3DNotice({ onClose }: { onClose: () => void }) {
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };
  return (
    <div className="webgl-note fail3d" role="alert" onKeyDown={onKey}>
      <p className="wn-title">No pudimos mostrar el 3D en este dispositivo</p>
      <p>El navegador no pudo dibujar la parte 3D. Recargá la página para intentarlo de nuevo. Si vuelve a fallar, probá con otro navegador o con otro dispositivo.</p>
      <p>Mientras tanto, la aplicación sigue con una vista más simple.</p>
      <div className="wn-actions">
        <button type="button" className="btn" onClick={onClose}>Entendido</button>
        <button type="button" className="btn primary" onClick={() => window.location.reload()}>Recargar la página</button>
      </div>
    </div>
  );
}

import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { useFocusReturn } from '../hooks.ts';

/**
 * Switches between the 2D map and the 3D relief. Without WebGL (for example, hardware
 * acceleration turned off in the browser) «Relieve 3D» stays on screen, marked as not available,
 * and opens a note on how to turn it on (#123).
 */
export function ViewToggle({
  mode,
  available3D = true,
  onChange,
}: {
  mode: '2d' | '3d';
  available3D?: boolean;
  onChange: (mode: '2d' | '3d') => void;
}) {
  const [note, setNote] = useState(false);
  const noteRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useFocusReturn(note, noteRef);

  const onNoteKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') setNote(false);
  };

  return (
    <>
      {note && (
        <div ref={noteRef} className="webgl-note" role="dialog" aria-labelledby={titleId} onKeyDown={onNoteKey}>
          <p className="wn-title" id={titleId}>El relieve 3D está apagado en este navegador</p>
          <p>Para dibujar el 3D, la página usa la placa de video (WebGL), y este navegador la tiene desactivada. Para activarla:</p>
          <ol>
            <li>Abrí la configuración del navegador y buscá «aceleración por hardware».</li>
            <li>Activá «Usar aceleración por hardware cuando esté disponible».</li>
            <li>Cerrá el navegador, volvé a abrirlo y recargá esta página.</li>
          </ol>
          <p>Mientras tanto, podés seguir en el mapa 2D.</p>
          <button type="button" className="btn" onClick={() => setNote(false)}>Entendido</button>
        </div>
      )}
      <div className="view-toggle" role="group" aria-label="Modo de vista">
        <button
          type="button"
          className={'chip' + (mode === '2d' ? ' active' : '')}
          aria-pressed={mode === '2d'}
          onClick={() => onChange('2d')}
        >
          Mapa 2D
        </button>
        {available3D ? (
          <button
            type="button"
            className={'chip' + (mode === '3d' ? ' active' : '')}
            aria-pressed={mode === '3d'}
            onClick={() => onChange('3d')}
          >
            Relieve 3D
          </button>
        ) : (
          // Not disabled: it opens the note. «apagado» is in its text and its name.
          <button
            type="button"
            className="chip off"
            aria-expanded={note}
            aria-label="Relieve 3D apagado: ver cómo activarlo"
            onClick={() => setNote((open) => !open)}
          >
            Relieve 3D · apagado
          </button>
        )}
      </div>
    </>
  );
}

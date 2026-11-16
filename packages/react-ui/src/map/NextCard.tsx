import { useEffect, useRef } from 'react';
import type { MapPoint } from '@antartida/core';
import { BottomSheet } from '../BottomSheet.tsx';

/**
 * Card shown on the map after an expedition ends (#75): says what was explored and offers the
 * suggested next one. It never blocks anything; the map stays usable beside it.
 */
export function NextCard({ doneLine, doneId, next, offerIrizar, onStart, onIrizar, onClose }: {
  /** «X quedó explorado. Registro de exploración: n/6». */
  doneLine: string;
  /** Id of the expedition just finished. */
  doneId: string;
  /** The suggested next expedition; null when all are explored. */
  next: MapPoint | null;
  /** Also offer the Irízar trip to Orcadas as a second option (after Marambio). */
  offerIrizar: boolean;
  onStart: (point: MapPoint) => void;
  onIrizar: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const primary = useRef<HTMLButtonElement>(null);
  // The card appears after the map is back: its main button takes focus once.
  useEffect(() => {
    primary.current?.focus();
  }, []);
  // Right after Marambio, Orcadas is reached on the Irízar, as from the diorama (S8, D4).
  const irizarMain = doneId === 'marambio' && next?.id === 'orcadas';
  return (
    <BottomSheet className="half next-sheet" labelledBy="next-title" sheetRef={ref} onClose={onClose} modal={false}>
      <div id="next-card" className="next-card">
        <h2 id="next-title" className="next-done">{doneLine}</h2>
        {next ? (
          <>
            <p className="next-kicker">Siguiente sugerida</p>
            <p className="next-name"><strong>{next.title}</strong><span className="place">{next.place}</span></p>
            {next.q && <p className="next-q">{next.q}</p>}
          </>
        ) : (
          <p className="next-name"><strong>Exploraste las seis expediciones</strong></p>
        )}
        <div className={'next-actions n' + ((offerIrizar ? 1 : 0) + 1 + (next ? 1 : 0))}>
          {offerIrizar && (
            <button type="button" className="btn next-irizar" onClick={onIrizar}>Viajar a Orcadas en el Irízar</button>
          )}
          <button type="button" className="btn" onClick={onClose}>{next ? 'Quedarme en el mapa' : 'Cerrar'}</button>
          {next && (
            <button ref={primary} type="button" className="btn primary" onClick={() => (irizarMain ? onIrizar() : onStart(next))}>
              {irizarMain ? 'Viajar a Orcadas en el Irízar' : next.title}
            </button>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}

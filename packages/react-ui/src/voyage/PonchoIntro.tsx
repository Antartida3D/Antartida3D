import { useRef } from 'react';
import type { Transport } from '@antartida/core';
import { BottomSheet } from '../BottomSheet.tsx';
import { useFocusReturn } from '../hooks.ts';
import { KindChip } from '../orcadas/KindChip.tsx';
import { Fact, type OpenSources } from './Fact.tsx';

/**
 * Start panel of a trip that is not picked (the team of Poncho), laid out like the intro of Orcadas: a sheet with
 * what the trip is, the chip that says it is an illustration, a link to the sources and «Comenzar».
 */
export function PonchoIntro({ transport, onStart, onExit, onSource }: {
  transport: Transport;
  onStart: () => void;
  onExit: () => void;
  onSource: OpenSources;
}) {
  const ref = useRef<HTMLElement>(null);
  useFocusReturn(true, ref, '.btn.primary');
  return (
    <>
      {/* Touching the map outside the sheet closes it, like the Picker of the trip from Ushuaia. */}
      <div className="scrim vscrim" onClick={onExit} />
      <BottomSheet className="voyage" labelledBy="poncho-intro-title" sheetRef={ref} onClose={onExit}>
        <h2 id="poncho-intro-title">Poncho, perro polar argentino</h2>
        <p className="place">{transport.pitch}</p>
        <ul className="vfacts">
          {transport.facts.map((f) => <Fact key={f.text} fact={f} onSource={onSource} />)}
        </ul>
        <p className="orc-intro-recon">
          <KindChip kind="recon" label="Reconstrucción ilustrada" />
          {transport.notice && <span className="vsmall">{transport.notice}</span>}
        </p>
        <p className="vsmall">
          <button type="button" className="btn ghost" onClick={() => onSource(transport.facts[0].sources[0])}>Ver las fuentes</button>
        </p>
        <div className="row vactions">
          <button type="button" className="btn primary" onClick={onStart}>Comenzar</button>
          <button type="button" className="btn" onClick={onExit}>Volver al mapa</button>
        </div>
      </BottomSheet>
    </>
  );
}

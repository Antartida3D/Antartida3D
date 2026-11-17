import { lazy, Suspense, useRef } from 'react';
import type { Transport } from '@antartida/core';
import { BottomSheet } from '../BottomSheet.tsx';
import { KindChip } from '../orcadas/KindChip.tsx';
import { SheetActions } from '../sheet/SheetActions.tsx';
import { SheetHeader } from '../sheet/SheetHeader.tsx';
import { Fact } from './Fact.tsx';

// Its own chunk: it needs WebGL, which the 2D fallback does not.
const IntroPreview = lazy(() => import('./IntroPreview.tsx').then((m) => ({ default: m.IntroPreview })));

/**
 * Start panel of a trip that is not picked (the team of Poncho), laid out like the intro of Orcadas: a sheet with
 * what the trip is, the chip that says it is an illustration and «Comenzar expedición». Its sources are the numbers of its facts.
 */
export function PonchoIntro({ transport, onStart, onExit, preview = false, reduced = false }: {
  transport: Transport;
  onStart: () => void;
  onExit: () => void;
  /** Show the turning 3D model of Poncho (needs WebGL). */
  preview?: boolean;
  reduced?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  return (
    <BottomSheet className="voyage" labelledBy="poncho-intro-title" sheetRef={ref} onClose={onExit}>
      <SheetHeader title="Poncho, perro polar argentino" titleId="poncho-intro-title" place={transport.pitch} />
      {preview && (
        <Suspense fallback={<div className="vpreview" />}>
          <IntroPreview id="poncho" reduced={reduced} />
        </Suspense>
      )}
      <ul className="vfacts">
        {transport.facts.map((f) => <Fact key={f.text} fact={f} />)}
      </ul>
      <p className="orc-intro-recon">
        <KindChip kind="recon" label="Reconstrucción ilustrada" />
        {transport.notice && <span className="vsmall">{transport.notice}</span>}
      </p>
      <SheetActions>
        <button type="button" className="btn" onClick={onExit}>Volver al mapa</button>
        <button type="button" className="btn primary" onClick={onStart}>Comenzar expedición</button>
      </SheetActions>
    </BottomSheet>
  );
}

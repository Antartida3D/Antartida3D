import { useMemo, useState } from 'react';
import {
  ORCADAS_GUIDING_QUESTION,
  ORCADAS_INTRO_DESC,
  introFacts,
  orcadasUsedCited,
  type ArrivalId,
} from '@antartida/core';
import { ExpeditionIntro } from '../sheet/ExpeditionIntro.tsx';
import { ArrivalPicker } from './ArrivalPicker.tsx';

/** The modal before Estación Orcadas: like the others, plus the choice of how to arrive. */
export function OrcadasIntro({
  onStart,
  onExit,
  fallbackFocus,
  preview = false,
  reduced = false,
}: {
  onStart: (arrival: ArrivalId) => void;
  onExit: () => void;
  fallbackFocus?: () => HTMLElement | null;
  /** Show the turning 3D model of the chosen arrival vehicle (needs WebGL). */
  preview?: boolean;
  reduced?: boolean;
}) {
  const [arrival, setArrival] = useState<ArrivalId>('ship');
  const paragraphs = useMemo(() => introFacts().map((f) => ({ text: f.text, sourceIds: f.sourceIds })), []);
  const sources = useMemo(() => orcadasUsedCited(), []);

  return (
    <ExpeditionIntro
      title="Estación Orcadas"
      titleId="orcadas-intro-title"
      place={ORCADAS_GUIDING_QUESTION}
      lead={ORCADAS_INTRO_DESC}
      paragraphs={paragraphs}
      sources={sources}
      illustrated={false}
      onStart={() => onStart(arrival)}
      onExit={onExit}
      fallbackFocus={fallbackFocus}
    >
      <ArrivalPicker value={arrival} onChange={setArrival} preview={preview} reduced={reduced} />
    </ExpeditionIntro>
  );
}

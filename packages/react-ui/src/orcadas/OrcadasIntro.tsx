import { useMemo, useRef, useState } from 'react';
import {
  ORCADAS_GUIDING_QUESTION,
  ORCADAS_INTRO_DESC,
  introFacts,
  type ArrivalId,
} from '@antartida/core';
import { BottomSheet } from '../BottomSheet.tsx';
import { trapTab, useFocusReturn } from '../hooks.ts';
import { ArrivalPicker } from './ArrivalPicker.tsx';
import { FactList, SourceContext } from './FactList.tsx';
import { SourcesPanel } from './SourcesPanel.tsx';

/** Pre-expedition intro sheet for Estación Orcadas, matching the Voyage Picker layout. */
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
  const ref = useRef<HTMLElement>(null);
  const [arrival, setArrival] = useState<ArrivalId>('ship');
  const [openSource, setOpenSource] = useState<string | null>(null);
  const facts = useMemo(() => introFacts(), []);
  useFocusReturn(true, ref, '.btn.primary', fallbackFocus);

  return (
    <>
      <div onKeyDown={(e) => trapTab(e, ref.current)}>
        {/* Touching the map outside the sheet closes it, like the Picker of the trip from Ushuaia. */}
        <div className="scrim vscrim orc-intro" onClick={onExit} />
        <BottomSheet className="voyage orc-intro" labelledBy="orcadas-intro-title" sheetRef={ref} onClose={onExit}>
          <h2 id="orcadas-intro-title">Estación Orcadas</h2>
          <p className="place">{ORCADAS_GUIDING_QUESTION}</p>
          <p>{ORCADAS_INTRO_DESC}</p>
          <SourceContext.Provider value={setOpenSource}>
            <ArrivalPicker value={arrival} onChange={setArrival} preview={preview} reduced={reduced} />
            <FactList facts={facts} fold={false} />
          </SourceContext.Provider>
          <div className="row vactions">
            <button type="button" className="btn" onClick={onExit}>
              Volver al mapa
            </button>
            <button type="button" className="btn primary" onClick={() => onStart(arrival)}>
              Comenzar expedición
            </button>
          </div>
        </BottomSheet>
      </div>
      {openSource && (
        <div className="orc-intro-sources">
          <SourcesPanel
            chapter="arrival"
            highlightSource={openSource}
            onClose={() => setOpenSource(null)}
          />
        </div>
      )}
    </>
  );
}

import { lazy, Suspense, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import {
  ORCADAS_GUIDING_QUESTION,
  ORCADAS_INTRO_DESC,
  introFacts,
} from '@antartida/core';
import { BottomSheet } from '../BottomSheet.tsx';
import { useFocusReturn } from '../hooks.ts';
import { FactList, SourceContext } from './FactList.tsx';
import { KindChip } from './KindChip.tsx';
import { SourcesPanel } from './SourcesPanel.tsx';

// Its own chunk: it needs WebGL, which the 2D map does not.
const OrcadasSitePreview = lazy(() => import('./OrcadasSitePreview.tsx').then((m) => ({ default: m.OrcadasSitePreview })));

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function trapTab(e: KeyboardEvent<HTMLElement>, container: HTMLElement | null) {
  if (e.key !== 'Tab' || !container) return;
  const focusables = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => el.getClientRects().length > 0
  );
  if (focusables.length === 0) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  const active = document.activeElement as HTMLElement | null;
  if (!active || !container.contains(active)) {
    e.preventDefault();
    first.focus();
  } else if (e.shiftKey && active === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && active === last) {
    e.preventDefault();
    first.focus();
  }
}

/** Pre-expedition intro sheet for Estación Orcadas, matching the Voyage Picker layout. */
export function OrcadasIntro({
  onStart,
  onExit,
  fallbackFocus,
  preview = false,
  reduced = false,
}: {
  onStart: () => void;
  onExit: () => void;
  fallbackFocus?: () => HTMLElement | null;
  /** Show the turning 3D model of the station site (needs WebGL). */
  preview?: boolean;
  reduced?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
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
          {preview && (
            <div className="orc-intro-preview">
              <Suspense fallback={<div className="vpreview" />}>
                <OrcadasSitePreview reduced={reduced} />
              </Suspense>
              <p className="orc-intro-recon">
                <KindChip kind="recon" label="Reconstrucción ilustrada" />
                <span className="vsmall">Vista ilustrativa de la base, no a escala.</span>
              </p>
            </div>
          )}
          <p>{ORCADAS_INTRO_DESC}</p>
          <SourceContext.Provider value={setOpenSource}>
            <FactList facts={facts} fold={false} />
          </SourceContext.Provider>
          <div className="row vactions">
            <button type="button" className="btn primary" onClick={onStart}>
              Comenzar expedición
            </button>
            <button type="button" className="btn" onClick={onExit}>
              Volver al mapa
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

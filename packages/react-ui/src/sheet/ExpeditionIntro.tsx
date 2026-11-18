import { useMemo, useRef, useState, type ReactNode } from 'react';
import type { CitedSource, IntroParagraph } from '@antartida/core';
import { BottomSheet } from '../BottomSheet.tsx';
import { KindChip } from '../orcadas/KindChip.tsx';
import { Quoted } from '../ui.tsx';
import { Cites } from './Cite.tsx';
import { SheetActions } from './SheetActions.tsx';
import { SheetHeader } from './SheetHeader.tsx';
import { SourcesContext } from './SourcesContext.ts';
import { SourcesView } from './SourcesView.tsx';

/**
 * The modal that opens before every expedition (#264): its question, a short text with its citations `[N]`, what is only an
 * illustration, and «Volver al mapa» / «Comenzar expedición» (`startLabel`). The ones with something to pick (Ushuaia, Orcadas) put it in `children`.
 */
export function ExpeditionIntro({ title, titleId, place, lead, paragraphs, sources, illustrated = true, startLabel = 'Comenzar expedición', onStart, onExit, fallbackFocus, action, children }: {
  title: string;
  titleId: string;
  /** The guiding question. */
  place: string;
  /** A first paragraph without citations. */
  lead?: string;
  paragraphs: readonly IntroParagraph[];
  sources: readonly CitedSource[];
  /** The scene is a drawing, not a photograph: say so with the same mark everywhere. */
  illustrated?: boolean;
  /** The main action: a point of interest with a scene of its own is not an expedition (#280). */
  startLabel?: string;
  onStart: () => void;
  onExit: () => void;
  fallbackFocus?: () => HTMLElement | null | undefined;
  /** Extra map layer this point opens, such as the territorial claims from the South Pole (#128, #286). */
  action?: { label: string; onClick: () => void };
  /** A picker between the text and the actions. */
  children?: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const [openSource, setOpenSource] = useState<string | null>(null);
  const context = useMemo(() => ({ list: sources, open: setOpenSource }), [sources]);
  return (
    <SourcesContext.Provider value={context}>
      <BottomSheet className="voyage expedition-intro" labelledBy={titleId} sheetRef={ref} onClose={onExit} fallbackFocus={fallbackFocus}>
        <SheetHeader title={title} titleId={titleId} place={place} />
        {lead && <p className="sheet-lead">{lead}</p>}
        {children}
        <ul className="vfacts">
          {paragraphs.map((p) => (
            <li key={p.text} className="vfact">
              <span>
                <Quoted text={p.text} />
                <Cites ids={p.sourceIds} />
              </span>
            </li>
          ))}
        </ul>
        {illustrated && (
          <p className="sheet-kinds">
            <KindChip kind="recon" label="Reconstrucción ilustrada" />
          </p>
        )}
        <SheetActions>
          <button type="button" className="btn" onClick={onExit}>Volver al mapa</button>
          {action && <button type="button" className="btn" onClick={action.onClick}>{action.label}</button>}
          <button type="button" className="btn primary" onClick={onStart}>{startLabel}</button>
        </SheetActions>
      </BottomSheet>
      {openSource && <SourcesView list={sources} highlight={openSource} onClose={() => setOpenSource(null)} />}
    </SourcesContext.Provider>
  );
}

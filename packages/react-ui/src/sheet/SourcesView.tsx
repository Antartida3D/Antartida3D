import { useEffect, useRef } from 'react';
import { formatConsulted, type CitedSource } from '@antartida/core';
import { Quoted } from '../ui.tsx';
import { BottomSheet } from '../BottomSheet.tsx';
import { KindChip } from '../orcadas/KindChip.tsx';
import { SheetActions } from './SheetActions.tsx';
import { SheetHeader } from './SheetHeader.tsx';

/** What each kind of content is, for expeditions that mark their statements as real, simulated, reconstructed or calculated. */
function KindDefs() {
  return (
    <dl className="sources-defs" aria-label="Tipos de contenido">
      <div><dt><KindChip kind="sim" /></dt><dd>sorteado o ilustrado dentro de valores reales; no es una medición.</dd></div>
      <div><dt><KindChip kind="recon" /></dt><dd>dibujo o modelo hecho a partir de fuentes; no es una foto ni un plano.</dd></div>
      <div><dt><KindChip kind="calc" /></dt><dd>resultado de una cuenta sobre datos reales.</dd></div>
    </dl>
  );
}

/**
 * The one sources view of the app (#264): every source of a trip, expedition or point, numbered as
 * the citations `[N]` say, with the one that was tapped marked. A card gives the title as a link,
 * who publishes it, what it covers and when it was read.
 */
export function SourcesView({ list, highlight, title = 'Fuentes', place, notice, kinds = false, onClose, fallbackFocus }: {
  list: readonly CitedSource[];
  highlight?: string | null;
  title?: string;
  place?: string;
  /** A note under the title: what the numbers are, or what the sources of this trip are not. */
  notice?: string | readonly string[];
  /** Show what the real / simulation / reconstruction / calculation marks mean. */
  kinds?: boolean;
  onClose: () => void;
  fallbackFocus?: () => HTMLElement | null | undefined;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!highlight) return;
    ref.current?.querySelector<HTMLElement>(`[data-source-id="${CSS.escape(highlight)}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [highlight]);
  return (
    <BottomSheet className="sources-sheet" layer="top" labelledBy="sources-title" sheetRef={ref} onClose={onClose} initialFocus=".sources-sheet [aria-current] a, .sources-sheet .btn.primary" fallbackFocus={fallbackFocus}>
      <SheetHeader label="Registro documental" title={title} titleId="sources-title" place={place} />
      {notice && (typeof notice === 'string' ? [notice] : notice).map((line) => <p key={line} className="sources-notice">{line}</p>)}
      {kinds && <KindDefs />}
      <ol className="sources-list">
        {list.map((source, i) => {
          const current = highlight === source.id;
          const consulted = formatConsulted(source.consulted);
          return (
            <li key={source.id} className="sources-card" data-source-id={source.id} aria-current={current ? 'true' : undefined}>
              <span className="sources-num" aria-hidden="true">[{i + 1}]</span>
              <div>
                <strong>{source.url ? <a href={source.url} target="_blank" rel="noopener noreferrer"><Quoted text={source.title} /></a> : <Quoted text={source.title} />}</strong>
                <span className="sources-org">{source.org}</span>
                {source.detail && <span className="sources-detail">{source.detail}</span>}
                <small>
                  {consulted && `Consultado el ${consulted}`}
                  {source.license && ` · Licencia: ${source.license}`}
                </small>
              </div>
            </li>
          );
        })}
      </ol>
      <SheetActions>
        <button type="button" className="btn primary" onClick={onClose}>Volver</button>
      </SheetActions>
    </BottomSheet>
  );
}

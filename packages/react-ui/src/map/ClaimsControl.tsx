import { useRef, type RefObject } from 'react';
import { ANTARCTIC_CLAIMS, ANTARCTIC_CLAIMS_CONTEXT, type ClaimId, type ClaimsCoverage } from '@antartida/core';
import { BottomSheet } from '../BottomSheet.tsx';

export type ClaimsStatus = 'loading' | 'ready' | 'error';
export type ClaimsSelection = ClaimId | 'all';

/** The switch of the claims layer and the button that shows or hides its details, beside the legend. */
export function ClaimsControl({ enabled, details, onToggle, onDetails, switchRef, detailsRef }: {
  enabled: boolean;
  /** Whether the details sheet (ClaimsDetails) is open. */
  details: boolean;
  onToggle: () => void;
  onDetails: (open: boolean) => void;
  switchRef?: RefObject<HTMLButtonElement | null>;
  /** The details button: it takes the focus back when the details close. */
  detailsRef?: RefObject<HTMLButtonElement | null>;
}) {
  return (
    <div className="claims-control">
      <div className="claims-actions">
        <button className="btn" type="button" role="switch" aria-checked={enabled} ref={switchRef}
          onClick={() => { if (!enabled) onDetails(true); onToggle(); }}>
          <span className="claims-switch" aria-hidden="true" />Reclamos territoriales
        </button>
        {enabled && <button className="iconbtn" type="button" ref={detailsRef}
          aria-label="Detalles de reclamos" aria-expanded={details} aria-controls={details ? 'claims-details' : undefined}
          onClick={() => onDetails(!details)}>ⓘ</button>}
      </div>
    </div>
  );
}

/**
 * The details of the claims layer, in the same sheet as the point sheets (BottomSheet, #148): on a
 * phone it opens at half the screen, dragged up it shows all of it and dragged down it hides. It is
 * not a dialog: the map stays usable to see the sectors while it is open. Escape hides it too.
 */
export function ClaimsDetails({ selection, coverage, status, onSelect, onCoverage, onClose }: {
  selection: ClaimsSelection;
  coverage: ClaimsCoverage;
  status: ClaimsStatus;
  onSelect: (selection: ClaimsSelection) => void;
  onCoverage: (coverage: ClaimsCoverage) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const selected = ANTARCTIC_CLAIMS.find((claim) => claim.id === selection);
  return (
    <BottomSheet className="half claims-sheet" labelledBy="claims-title" sheetRef={ref} onClose={onClose} modal={false}>
      {/* Escape hides only the details, not the map's own Escape (MapView). */}
      <div id="claims-details" onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); onClose(); } }}>
        <h2 id="claims-title" className="claims-heading">Reclamos antárticos</h2>
        <p>Siete países mantienen reclamos. Existen superposiciones; no son fronteras acordadas.</p>
        <label className="claims-coverage">Superficie visible
          <select value={coverage} onChange={(event) => onCoverage(event.target.value as ClaimsCoverage)}>
            <option value="sectors">Sectores con mar</option>
            <option value="land">Solo tierra y hielo</option>
          </select>
        </label>
        <p className="claims-note">{coverage === 'sectors'
          ? 'Referencia geográfica hasta 60° S, sobre tierra, hielo y mar. El color sobre el océano no representa una ZEE ni soberanía sobre esas aguas. El paralelo es un recorte visual, no una frontera norte de Chile o Noruega.'
          : 'Superficies recortadas al relieve visible. Incluyen plataformas de hielo; no delimitan aguas.'}</p>
        <div className="claims-countries" role="group" aria-label="País reclamante">
          <button className="btn" type="button" aria-pressed={selection === 'all'} onClick={() => onSelect('all')}>Todos</button>
          {ANTARCTIC_CLAIMS.map((claim) => (
            <button className="btn" type="button" key={claim.id} aria-pressed={selection === claim.id} onClick={() => onSelect(claim.id)}>
              <span className="claims-swatch" style={{ background: claim.color }} aria-hidden="true" />{claim.name}
            </button>
          ))}
        </div>
        <p className="claims-status" role="status">
          {status === 'loading' ? 'Cargando áreas y banderas…' : status === 'error'
            ? 'No se pudieron cargar los datos de los reclamos. Apagá y volvé a encender la capa para reintentar.'
            : selected ? selected.description : 'Argentina, Chile y Reino Unido se superponen. Elegí un país para distinguir su extensión.'}
        </p>
        <p className="claims-note">{ANTARCTIC_CLAIMS_CONTEXT.cartography} Noruega incluye Tierra de la Reina Maud y la isla Pedro I.</p>
        {selected && <p><a href={selected.source.url} target="_blank" rel="noreferrer">Fuente: {selected.source.organization}</a></p>}
        <p className="claims-note"><a href={ANTARCTIC_CLAIMS_CONTEXT.source.url} target="_blank" rel="noreferrer">Tratado Antártico, artículos IV y VI</a>: preserva las posiciones sobre soberanía y los derechos relativos a la alta mar. Consulta: 14/11/2026.</p>
      </div>
    </BottomSheet>
  );
}

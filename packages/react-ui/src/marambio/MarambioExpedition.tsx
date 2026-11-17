import { useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  MARAMBIO_GUIDING_QUESTION,
  MARAMBIO_LAT,
  MONTH_NAMES,
  marambioBlizzard,
  marambioClimate,
  MARAMBIO_OSM_SOURCE_ID,
  MARAMBIO_PHOTO_CREDIT,
  MARAMBIO_SPOTS,
  MARAMBIO_STORM_MONTH,
  MARAMBIO_TITLE,
  marambioFacts,
  marambioPhotos,
  type MarambioFact,
  type MarambioPhoto,
  type MarambioPhotoId,
  type MarambioSpotId,
  MARAMBIO_CITED,
} from '@antartida/core';
import { BottomSheet, type OpenSheetSize } from '../BottomSheet.tsx';
import { useIsDesktop } from '../hooks.ts';
import { KindChip } from '../orcadas/KindChip.tsx';
import { MonthStrip, type MonthStripSeason } from '../orcadas/MonthStrip.tsx';
import { Icon, Quoted } from '../ui.tsx';
import { Cite, Cites } from '../sheet/Cite.tsx';
import { SheetActions } from '../sheet/SheetActions.tsx';
import { SheetHeader } from '../sheet/SheetHeader.tsx';
import { SheetText } from '../sheet/SheetText.tsx';
import { SourcesContext } from '../sheet/SourcesContext.ts';
import { SourcesView } from '../sheet/SourcesView.tsx';
import { MarambioScene } from './MarambioScene.tsx';
import { IRIZAR_DOT, SPOT_VIEWS } from './spots.ts';
import herculesRunway from '@antartida/core/assets/marambio/hercules-pista.webp';
import herculesAnniversary from '@antartida/core/assets/marambio/hercules-aniversario.webp';
import herculesGroup from '@antartida/core/assets/marambio/hercules-grupo.webp';
import hangarCargo from '@antartida/core/assets/marambio/hangar-carga.webp';
import polarDepot from '@antartida/core/assets/marambio/deposito-polar.webp';
import historicHouse from '@antartida/core/assets/marambio/casa-historica.webp';
import fieldHelicopter from '@antartida/core/assets/marambio/helicoptero-campamento.webp';

const PHOTO_URL: Readonly<Record<MarambioPhotoId, string>> = {
  'hercules-runway': herculesRunway, 'hercules-anniversary': herculesAnniversary, 'hercules-group': herculesGroup,
  'hangar-cargo': hangarCargo, 'polar-depot': polarDepot, 'historic-house': historicHouse, 'field-helicopter': fieldHelicopter,
};

const SOURCES = MARAMBIO_CITED;

function FactCard({ fact }: { fact: MarambioFact }) {
  return (
    <article className="orc-fact-card">
      <div className="orc-fact-top">
        <KindChip kind={fact.kind} />
      </div>
      <p className="orc-fact-text">
        <Quoted text={fact.text} />
        <Cites ids={fact.sourceIds} />
      </p>
    </article>
  );
}

const decimal = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 1 });

/**
 * The strip of months of Marambio: daylight at its latitude and, under each month, its days with
 * «ventisca alta» (SMN normals 1991-2020). The details hold the month facts with their sources.
 */
function marambioSeason(): MonthStripSeason {
  return {
    latitude: MARAMBIO_LAT,
    stripe: marambioBlizzard,
    stripeClass: 'is-blizzard',
    stripeLegend: 'Días con ventisca (SMN)',
    stripeLine: (m) => {
      const c = marambioClimate(m);
      const name = MONTH_NAMES[m - 1] ?? '';
      return {
        kind: 'real',
        text: `En ${name}: ${decimal(c.blizzardHighDays)} días con ventisca alta y ${decimal(c.tempMeanC)} °C de temperatura media (SMN, 1991-2020).`,
      };
    },
    details: () => (
      <div className="orc-facts-list">
        {marambioFacts('months').map((fact) => (
          <FactCard key={fact.id} fact={fact} />
        ))}
      </div>
    ),
    groupLabel: 'Mes en la base',
    asideLabel: 'Control estacional de la base',
  };
}

const SEASON = marambioSeason();

/** Always-visible label of the scene: it is an illustrated reconstruction, and what that means. */
function SceneBadge({ onOpenSource, storm, onStorm }: { onOpenSource: (id: string) => void; storm: boolean; onStorm: () => void }) {
  const [open, setOpen] = useState(false);
  const helpRef = useRef<HTMLButtonElement>(null);
  const facts = marambioFacts('scene');
  return (
    <div className="orc-scene-badge">
      <div className="orc-scene-badge-row">
        <KindChip kind="recon" label="Reconstrucción ilustrada" />
        <button
          type="button"
          className="orc-scene-help-btn"
          ref={helpRef}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          aria-label="Ayuda sobre la reconstrucción ilustrada"
        >
          ?
        </button>
      </div>
      {/* Blows a blizzard over the base and explains it (#263): its own row, over the label. */}
      <button type="button" className="btn mar-storm-btn" aria-pressed={storm} onClick={onStorm}>
        {storm ? 'Calmar la ventisca' : 'Ver una ventisca'}
      </button>
      {open && (
        <div className="orc-scene-help-popover" role="note">
          {facts.map((f) => (
            <p key={f.id}><Quoted text={f.text} /></p>
          ))}
          <p>
            <button
              type="button"
              className="orc-scene-sources-link"
              onClick={() => {
                // The link goes away with the note: the focus stays in the page, on its button.
                helpRef.current?.focus();
                setOpen(false);
                onOpenSource(MARAMBIO_OSM_SOURCE_ID);
              }}
            >
              Ver fuentes
            </button>
          </p>
        </div>
      )}
    </div>
  );
}

/** A photograph of the archive, full size with its caption and credit. Escape, a tap outside or «Cerrar» close it. */
function PhotoDialog({ photo, onClose }: { photo: MarambioPhoto; onClose: () => void }) {
  const ref = useRef<HTMLElement>(null);
  return (
    <BottomSheet className="voyage mar-photo" labelledBy="mar-photo-title" sheetRef={ref} onClose={onClose} layer="top">
      <SheetHeader title="Archivo fotográfico" titleId="mar-photo-title" />
      <figure>
        <img src={PHOTO_URL[photo.id]} alt={photo.alt} />
        <figcaption>
          <b>{photo.caption}</b>
          <span>{photo.date ? `Fecha de la cámara: ${photo.date}` : 'Sin fecha ni lugar registrados'}</span>
          <span>{MARAMBIO_PHOTO_CREDIT}</span>
          <Cite id="photo-archive" />
        </figcaption>
      </figure>
      <SheetActions>
        <button type="button" className="btn primary" onClick={onClose}>Volver</button>
      </SheetActions>
    </BottomSheet>
  );
}

/**
 * Base Marambio: a diorama of the base to walk round, one point of interest at a time. First
 * delivery of the expedition (#74): no chapters yet, the visit ends at the last point.
 */
/** Asks whether to sail to Orcadas on the Irízar. A dialog: Escape, a tap outside or «Seguir en Marambio» close it. */
function TripDialog({ onTravel, onClose }: { onTravel: () => void; onClose: () => void }) {
  const ref = useRef<HTMLElement>(null);
  return (
    <BottomSheet className="voyage mar-trip" labelledBy="mar-trip-title" sheetRef={ref} onClose={onClose} layer="top">
      <SheetHeader label="El Irízar" title="¿Querés empezar el viaje a la Estación Orcadas?" titleId="mar-trip-title" />
      <SheetText text="El rompehielos ARA Almirante Irízar espera frente a la base. Si subís, salís de Marambio y navegás hasta las Islas Orcadas del Sur." />
      <p className="mar-trip-note">
        <KindChip kind="recon" label="Recorrido ilustrativo" /> El camino del barco en el mapa es un dibujo: no hay una fuente pública de su derrota.
      </p>
      <SheetActions>
        <button type="button" className="btn" onClick={onClose}>
          Seguir en Marambio
        </button>
        <button type="button" className="btn primary" onClick={onTravel}>
          Viajar a Orcadas
        </button>
      </SheetActions>
    </BottomSheet>
  );
}

export function MarambioExpedition({
  reduced,
  resume,
  onProgress,
  onLeave,
  onTravelToOrcadas,
}: {
  reduced: boolean;
  resume?: { step: number; sub?: number };
  onProgress?: (step: number, sub?: number) => void;
  onLeave: (done: boolean) => void;
  /** Leaves Marambio on the Irízar towards Orcadas. `done`: the visit reached its last point. */
  onTravelToOrcadas: (done: boolean) => void;
}) {
  const [trip, setTrip] = useState(false);
  const [photo, setPhoto] = useState<MarambioPhoto | null>(null);
  // The month the visit starts in is today's: the blizzard of the season the visitor is in.
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const reachedEnd = useRef(false);
  const isDesktop = useIsDesktop(900);
  const [index, setIndex] = useState(() =>
    Math.max(0, Math.min(MARAMBIO_SPOTS.length - 1, Math.trunc(resume?.step ?? 0)))
  );
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;
  useEffect(() => {
    onProgressRef.current?.(index);
  }, [index]);
  const [showSources, setShowSources] = useState(false);
  // The blizzard of the button: the scene blows it and the panel explains it (#263).
  const [storm, setStorm] = useState(false);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [sheetSize, setSheetSize] = useState<OpenSheetSize>('small');
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const rootRef = useRef<HTMLElement>(null);
  const sourcesBtn = useRef<HTMLButtonElement>(null);
  const moved = useRef(false);

  const spot = MARAMBIO_SPOTS[index];
  const last = index === MARAMBIO_SPOTS.length - 1;
  if (last) reachedEnd.current = true;
  const facts = marambioFacts(spot.id);
  const photos = marambioPhotos(spot.id);

  // After a change of point or of view, the heading takes the focus so a screen reader reads on from it.
  useEffect(() => {
    if (!moved.current) return;
    rootRef.current?.querySelector<HTMLElement>('#mar-panel-title')?.focus({ preventScroll: true });
  }, [index, storm]);

  const go = (next: number) => {
    moved.current = true;
    setStorm(false);
    setIndex(next);
    // A sheet folded down to its title opens again on the new point.
    setSheetSize((size) => (size === 'peek' ? 'small' : size));
  };
  const openSources = (id: string | null) => {
    setHighlight(id);
    setShowSources(true);
  };
  const toggleStorm = () => {
    moved.current = true;
    // It blows in the month with most days of «ventisca alta», the one its facts speak of.
    if (!storm) setMonth(MARAMBIO_STORM_MONTH);
    setStorm(!storm);
    setSheetSize((size) => (size === 'peek' ? 'small' : size));
  };
  const closeSources = () => {
    setShowSources(false);
    setHighlight(null);
  };

  const panelBody = (
    <>
      <div className="orc-panel-scroll">
        <SheetHeader
          label={storm ? 'Ventisca en la base' : `Punto ${index + 1} de ${MARAMBIO_SPOTS.length}`}
          title={storm ? '¿Qué es una ventisca?' : spot.label}
          titleId="mar-panel-title"
          titleClass="orc-chapter-h2"
          titleFocusable
        />
        {storm ? (
          <div className="orc-facts-list">
            {marambioFacts('storm').map((fact) => (
              <FactCard key={fact.id} fact={fact} />
            ))}
          </div>
        ) : (
        <div className="orc-chapter-content">
            {index === 0 && <p className="orc-question">{MARAMBIO_GUIDING_QUESTION}</p>}
            <p className="orc-lead">{spot.subtitle}</p>
            <div className="orc-facts-list">
              {facts.map((fact) => (
                <FactCard key={fact.id} fact={fact} />
              ))}
            </div>
            {photos.length > 0 && (
              <div className="mar-archive-list" role="group" aria-label="Archivo fotográfico">
                {photos.map((p, i) => (
                  <button
                    key={p.id}
                    type="button"
                    className="mar-archive"
                    style={{ '--tilt': `${i % 2 ? 2.5 : -3}deg` } as CSSProperties}
                    aria-haspopup="dialog"
                    aria-label={`Abrir fotografía: ${p.caption}`}
                    onClick={() => setPhoto(p)}
                  >
                    <img src={PHOTO_URL[p.id]} alt="" loading="lazy" />
                    <span>
                      <small>Archivo fotográfico{p.date ? ` · ${p.date.split(' de ').pop()}` : ''}</small>
                      <b>{p.caption}</b>
                      <span>Ver fotografía ↗</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <SheetActions>
        {storm ? (
          <button type="button" className="btn primary" onClick={toggleStorm}>
            Calmar la ventisca
          </button>
        ) : (
          <>
            {index > 0 && (
              <button type="button" className="btn" onClick={() => go(index - 1)}>
                Atrás
              </button>
            )}
            <button type="button" className="btn primary" onClick={() => (last ? onLeave(true) : go(index + 1))}>
              {last ? 'Terminar expedición' : 'Siguiente'}
            </button>
          </>
        )}
      </SheetActions>
    </>
  );

  return (
    <SourcesContext.Provider value={{ list: SOURCES, open: openSources }}>
    <section
      className={`orc mar${!isDesktop && sheetSize === 'tall' ? ' is-panel-expanded' : ''}${!isDesktop && sheetSize === 'peek' ? ' is-panel-peek' : ''}`}
      aria-label={`Expedición ${MARAMBIO_TITLE}`}
      ref={rootRef}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && storm) toggleStorm();
      }}
    >
      <MarambioScene
        focus={spot.id}
        reduced={reduced}
        sheetTall={!isDesktop && sheetSize === 'tall'}
        sidePanel={isDesktop}
        overlayRef={overlayRef}
        onIrizar={() => setTrip(true)}
        month={month}
        storm={storm}
      />

      <MonthStrip month={month} onMonth={setMonth} season={SEASON} />

      <SceneBadge onOpenSource={openSources} storm={storm} onStorm={toggleStorm} />

      <div className="orc-hotspots" ref={overlayRef} role="group" aria-label="Puntos de interés de la base">
        {MARAMBIO_SPOTS.map((s, i) => {
          const active = i === index;
          const [left, top] = SPOT_VIEWS[s.id as MarambioSpotId].fallbackPct;
          return (
            <button
              key={s.id}
              type="button"
              data-hotspot={s.id}
              className={`orc-hs${active ? ' is-active' : ''}`}
              // Place over the drawing shown without WebGL (marambio.css); the 3D scene sets its own.
              style={{ '--fx': left, '--fy': top } as CSSProperties}
              aria-label={`Punto de interés: ${s.label}`}
              aria-pressed={active}
              onClick={() => go(i)}
            >
              <span className="orc-hs-ring" aria-hidden="true" />
              <span className="orc-hs-dot" aria-hidden="true" />
              <span className="orc-hs-lbl">{s.shortLabel}</span>
            </button>
          );
        })}
        <button
          type="button"
          data-hotspot={IRIZAR_DOT.id}
          className="orc-hs mar-hs-ship"
          style={{ '--fx': IRIZAR_DOT.fallbackPct[0], '--fy': IRIZAR_DOT.fallbackPct[1] } as CSSProperties}
          aria-label="El Irízar: viajar a la Estación Orcadas"
          aria-haspopup="dialog"
          onClick={() => setTrip(true)}
        >
          <span className="orc-hs-dot" aria-hidden="true" />
          <span className="orc-hs-lbl">Irízar · viajar a Orcadas</span>
        </button>
      </div>

      <header className="orc-top">
        <div className="orc-top-r1">
          <button type="button" className="pill orc-top-btn" onClick={() => onLeave(false)} aria-label="Volver al mapa">
            {Icon.back}
            <span>Mapa</span>
          </button>
          <div className="orc-top-title">
            <strong>{MARAMBIO_TITLE}</strong>
            <span>{MARAMBIO_GUIDING_QUESTION}</span>
          </div>
          <button type="button" className="pill orc-top-btn" ref={sourcesBtn} aria-haspopup="dialog" onClick={() => openSources(null)}>
            Fuentes
          </button>
        </div>
      </header>

      {isDesktop ? (
        <div className="orc-panel" role="region" aria-labelledby="mar-panel-title">
          {panelBody}
        </div>
      ) : (
        <BottomSheet className="orc-panel" labelledBy="mar-panel-title" sheetRef={panelRef} floor="peek" size={sheetSize} onSize={setSheetSize}>
          {panelBody}
        </BottomSheet>
      )}

      {showSources && <SourcesView list={SOURCES} kinds highlight={highlight} onClose={closeSources} place={MARAMBIO_GUIDING_QUESTION} fallbackFocus={() => sourcesBtn.current} />}
      {photo && <PhotoDialog photo={photo} onClose={() => setPhoto(null)} />}
      {trip && <TripDialog onClose={() => setTrip(false)} onTravel={() => onTravelToOrcadas(reachedEnd.current)} />}
    </section>
    </SourcesContext.Provider>
  );
}

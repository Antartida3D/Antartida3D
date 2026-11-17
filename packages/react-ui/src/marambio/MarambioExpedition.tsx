import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  MARAMBIO_GUIDING_QUESTION,
  MARAMBIO_LAT,
  MONTH_NAMES,
  marambioBlizzard,
  marambioClimate,
  MARAMBIO_OSM_SOURCE_ID,
  MARAMBIO_PHOTO_ARCHIVE,
  MARAMBIO_PHOTO_CREDIT,
  MARAMBIO_SOURCES,
  MARAMBIO_SPOTS,
  MARAMBIO_STORM_MONTH,
  MARAMBIO_TITLE,
  marambioFacts,
  marambioPhotos,
  marambioSourcesOf,
  type MarambioFact,
  type MarambioPhoto,
  type MarambioPhotoId,
  type MarambioSpotId,
} from '@antartida/core';
import { BottomSheet, type OpenSheetSize } from '../BottomSheet.tsx';
import { useFocusReturn, useIsDesktop } from '../hooks.ts';
import { KindChip } from '../orcadas/KindChip.tsx';
import { MonthStrip, type MonthStripSeason } from '../orcadas/MonthStrip.tsx';
import { Icon, Quoted } from '../ui.tsx';
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

const sourceAnchor = (id: string) => `mar-source-${id}`;

function FactCard({ fact, onOpenSource }: { fact: MarambioFact; onOpenSource: (id: string) => void }) {
  const sources = marambioSourcesOf(fact);
  return (
    <article className="orc-fact-card">
      <div className="orc-fact-top">
        <KindChip kind={fact.kind} />
      </div>
      <p className="orc-fact-text"><Quoted text={fact.text} /></p>
      {sources.length > 0 && (
        <div className="orc-fact-srcs">
          <span className="orc-src-prefix">Fuente:</span>
          {sources.map((src) => (
            <button key={src.id} type="button" className="orc-src-link" onClick={() => onOpenSource(src.id)}>
              {src.short}
            </button>
          ))}
        </div>
      )}
    </article>
  );
}

const decimal = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 1 });

/**
 * The strip of months of Marambio: daylight at its latitude and, under each month, its days with
 * «ventisca alta» (SMN normals 1991-2020). The details hold the month facts with their sources.
 */
function marambioSeason(onOpenSource: (id: string) => void): MonthStripSeason {
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
          <FactCard key={fact.id} fact={fact} onOpenSource={onOpenSource} />
        ))}
      </div>
    ),
    groupLabel: 'Mes en la base',
    asideLabel: 'Control estacional de la base',
  };
}

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

/** A photograph of the archive, full size with its caption and credit. Escape or «Cerrar» close it. */
function PhotoDialog({ photo, onClose }: { photo: MarambioPhoto; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  // Focus goes to the close button, and back to the photo card when it closes.
  useFocusReturn(true, ref, '.iconbtn');
  return (
    <div className="mar-trip-scrim" onClick={onClose}>
      <div
        ref={ref}
        className="mar-photo"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mar-photo-title"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            onClose();
          }
          // The close button is the only stop: Tab stays on it.
          if (e.key === 'Tab') e.preventDefault();
        }}
      >
        <div className="mar-photo-head">
          <h2 id="mar-photo-title">Archivo fotográfico</h2>
          <button type="button" className="iconbtn" aria-label="Cerrar" onClick={onClose}>
            {Icon.close}
          </button>
        </div>
        <figure>
          <img src={PHOTO_URL[photo.id]} alt={photo.alt} />
          <figcaption>
            <b>{photo.caption}</b>
            <span>{photo.date ? `Fecha de la cámara: ${photo.date}` : 'Sin fecha ni lugar registrados'}</span>
            <span>{MARAMBIO_PHOTO_CREDIT}</span>
          </figcaption>
        </figure>
      </div>
    </div>
  );
}

/**
 * Base Marambio: a diorama of the base to walk round, one point of interest at a time. First
 * delivery of the expedition (#74): no chapters yet, the visit ends at the last point.
 */
/** Asks whether to sail to Orcadas on the Irízar. A dialog: Escape or «Seguir en Marambio» close it. */
function TripDialog({ onTravel, onClose }: { onTravel: () => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  // Focus goes to the trip button, and back to whatever opened the dialog when it closes.
  useFocusReturn(true, ref, '.btn.primary');
  return (
    <div className="mar-trip-scrim" onClick={onClose}>
      <div
        ref={ref}
        className="mar-trip"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mar-trip-title"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            onClose();
          }
          // Tab stays inside the dialog.
          if (e.key === 'Tab') {
            const buttons = [...(ref.current?.querySelectorAll<HTMLElement>('button') ?? [])];
            const i = buttons.indexOf(document.activeElement as HTMLElement);
            const next = e.shiftKey ? (i <= 0 ? buttons.length - 1 : i - 1) : (i + 1) % buttons.length;
            e.preventDefault();
            buttons[next]?.focus();
          }
        }}
      >
        <span className="orc-kicker hand">El Irízar</span>
        <h2 id="mar-trip-title">¿Querés empezar el viaje a la Estación Orcadas?</h2>
        <p>El rompehielos ARA Almirante Irízar espera frente a la base. Si subís, salís de Marambio y navegás hasta las Islas Orcadas del Sur.</p>
        <p className="mar-trip-note">
          <KindChip kind="recon" label="Recorrido ilustrativo" /> El camino del barco en el mapa es un dibujo: no hay una fuente pública de su derrota.
        </p>
        <div className="mar-trip-bar">
          <button type="button" className="btn ghost" onClick={onClose}>
            Seguir en Marambio
          </button>
          <button type="button" className="btn primary" onClick={onTravel}>
            Viajar a Orcadas
          </button>
        </div>
      </div>
    </div>
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
  const headingRef = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);

  const spot = MARAMBIO_SPOTS[index];
  const last = index === MARAMBIO_SPOTS.length - 1;
  if (last) reachedEnd.current = true;
  const facts = marambioFacts(spot.id);
  const photos = marambioPhotos(spot.id);

  // After a change of point or of view, the heading takes the focus so a screen reader reads on from it.
  useEffect(() => {
    if (!moved.current) return;
    headingRef.current?.focus({ preventScroll: true });
  }, [index, showSources, storm]);

  useEffect(() => {
    if (!showSources || !highlight) return;
    document.getElementById(sourceAnchor(highlight))?.scrollIntoView({ block: 'nearest' });
  }, [showSources, highlight]);

  const go = (next: number) => {
    moved.current = true;
    setStorm(false);
    setShowSources(false);
    setHighlight(null);
    setIndex(next);
    // A sheet folded down to its title opens again on the new point.
    setSheetSize((size) => (size === 'peek' ? 'small' : size));
  };
  const openSources = (id: string | null) => {
    moved.current = true;
    setHighlight(id);
    setShowSources(true);
    setSheetSize((size) => (size === 'peek' ? 'small' : size));
  };
  const closeSources = () => {
    moved.current = true;
    setShowSources(false);
    setHighlight(null);
    setSheetSize((size) => (size === 'peek' ? 'small' : size));
  };
  const toggleStorm = () => {
    moved.current = true;
    setShowSources(false);
    setHighlight(null);
    // It blows in the month with most days of «ventisca alta», the one its facts speak of.
    if (!storm) setMonth(MARAMBIO_STORM_MONTH);
    setStorm(!storm);
    setSheetSize((size) => (size === 'peek' ? 'small' : size));
  };
  // One season for the whole visit: its source links reach the latest openSources through a ref.
  const openSourcesRef = useRef(openSources);
  openSourcesRef.current = openSources;
  const season = useMemo(() => marambioSeason((id) => openSourcesRef.current(id)), []);

  const panelBody = (
    <>
      <div className="orc-panel-scroll">
        <div className="orc-panel-head">
          <span id="mar-panel-label" className="orc-kicker hand">
            {showSources ? 'Fuentes de la base' : storm ? 'Ventisca en la base' : `Punto ${index + 1} de ${MARAMBIO_SPOTS.length}`}
          </span>
          <h2 className="orc-chapter-h2" ref={headingRef} tabIndex={-1}>
            {showSources ? 'De dónde sale cada dato' : storm ? '¿Qué es una ventisca?' : spot.label}
          </h2>
        </div>
        {showSources ? (
          <ul className="mar-sources">
            {MARAMBIO_SOURCES.map((src) => (
              <li key={src.id} id={sourceAnchor(src.id)} className={`mar-source${src.id === highlight ? ' is-highlight' : ''}`}>
                <strong>{src.label}</strong>
                <span>{src.org}</span>
                <span>
                  Consultado el {src.consulted}
                  {src.license ? ` · ${src.license}` : ''}
                </span>
                <a href={src.url} target="_blank" rel="noreferrer">
                  Abrir la fuente
                </a>
              </li>
            ))}
            <li className="mar-source">
              <strong>{MARAMBIO_PHOTO_ARCHIVE.label}</strong>
              <span>{MARAMBIO_PHOTO_ARCHIVE.org}</span>
              <span>{MARAMBIO_PHOTO_ARCHIVE.detail}</span>
              <span>Consultado el {MARAMBIO_PHOTO_ARCHIVE.consulted} · archivo familiar, sin enlace público</span>
            </li>
          </ul>
        ) : storm ? (
          <div className="orc-facts-list">
            {marambioFacts('storm').map((fact) => (
              <FactCard key={fact.id} fact={fact} onOpenSource={openSources} />
            ))}
          </div>
        ) : (
          <div className="orc-chapter-content">
            {index === 0 && <p className="orc-question">{MARAMBIO_GUIDING_QUESTION}</p>}
            <p className="orc-lead">{spot.subtitle}</p>
            <div className="orc-facts-list">
              {facts.map((fact) => (
                <FactCard key={fact.id} fact={fact} onOpenSource={openSources} />
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
      <div className="orc-bar ebar">
        {showSources ? (
          <button type="button" className="btn primary" onClick={closeSources}>
            {storm ? 'Volver a la ventisca' : 'Volver a la base'}
          </button>
        ) : storm ? (
          <button type="button" className="btn primary" onClick={toggleStorm}>
            Calmar la ventisca
          </button>
        ) : (
          <>
            {index > 0 && (
              <button type="button" className="btn ghost" onClick={() => go(index - 1)}>
                Atrás
              </button>
            )}
            <button type="button" className="btn primary" onClick={() => (last ? onLeave(true) : go(index + 1))}>
              {last ? 'Terminar la visita' : 'Siguiente'}
            </button>
          </>
        )}
      </div>
    </>
  );

  return (
    <section
      className={`orc mar${!isDesktop && sheetSize === 'tall' ? ' is-panel-expanded' : ''}${!isDesktop && sheetSize === 'peek' ? ' is-panel-peek' : ''}`}
      aria-label={`Expedición ${MARAMBIO_TITLE}`}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && showSources) closeSources();
        else if (e.key === 'Escape' && storm) toggleStorm();
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

      <MonthStrip month={month} onMonth={setMonth} season={season} />

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
          <button type="button" className="pill orc-top-btn" aria-pressed={showSources} onClick={() => (showSources ? closeSources() : openSources(null))}>
            Fuentes
          </button>
        </div>
      </header>

      {isDesktop ? (
        <div className="orc-panel" role="region" aria-labelledby="mar-panel-label">
          {panelBody}
        </div>
      ) : (
        <BottomSheet className="orc-panel" labelledBy="mar-panel-label" sheetRef={panelRef} floor="peek" size={sheetSize} onSize={setSheetSize}>
          {panelBody}
        </BottomSheet>
      )}

      {photo && <PhotoDialog photo={photo} onClose={() => setPhoto(null)} />}
      {trip && <TripDialog onClose={() => setTrip(false)} onTravel={() => onTravelToOrcadas(reachedEnd.current)} />}
    </section>
  );
}

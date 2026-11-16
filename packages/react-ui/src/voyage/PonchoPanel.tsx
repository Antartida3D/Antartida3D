import { useEffect, useRef, useState, type RefObject } from 'react';
import { ponchoActOpeningAt, ponchoPhotoAt, previousVoyageCard, nextVoyageCard, voyageStops, type PonchoPhoto } from '@antartida/core';
import ponchoPageUrl from '@antartida/core/assets/poncho/poncho-pagina.jpg';
import sledTeamUrl from '@antartida/core/assets/poncho/perros-trineo.jpg';
import esperanzaUrl from '@antartida/core/assets/poncho/esperanza.jpg';
import { BottomSheet } from '../BottomSheet.tsx';
import { useIsDesktop } from '../hooks.ts';
import { Icon, Quoted } from '../ui.tsx';
import { Fact, type OpenSources } from './Fact.tsx';
import type { DioramaTour } from './PonchoDiorama.tsx';
import type { VoyageController } from './useVoyage.ts';

/** File of each photograph of a stop (PONCHO_PHOTOS in @antartida/core). */
export const PONCHO_PHOTO_URL = { 'poncho-pagina.jpg': ponchoPageUrl, 'perros-trineo.jpg': sledTeamUrl, 'esperanza.jpg': esperanzaUrl } as const;

/**
 * «‹ Hito N de M ›» of the common card of a story told in order (where there is no scene): goes back to a stop already
 * read and forward again up to the last one passed (#214). Without a stop to go to, the arrow is not there.
 */
export function HitoNav({ voyage }: { voyage: VoyageController }) {
  const state = voyage.state!;
  const stops = voyageStops(state.kind);
  const prev = previousVoyageCard(state);
  const next = nextVoyageCard(state);
  return (
    <div className="vstepbar">
      {prev !== null && (
        <button type="button" className="btn ghost vstepgo" onClick={() => voyage.openMilestone(prev)} aria-label={`Hito anterior: ${stops[prev].milestone.title}`}>
          {Icon.back}
        </button>
      )}
      <small className="vstep">Hito {state.card + 1} de {stops.length}</small>
      {next !== null && (
        <button type="button" className="btn ghost vstepgo vstepnext" onClick={() => voyage.openMilestone(next)} aria-label={`Hito siguiente: ${stops[next].milestone.title}`}>
          {Icon.back}
        </button>
      )}
    </div>
  );
}

/** The source of a photograph and, when it has a free license, its author and license: shown wherever the photograph is. */
export function PhotoCredit({ photo }: { photo: PonchoPhoto }) {
  return (
    <>
      {photo.credit && (
        <span>Foto: {photo.credit.author}. Licencia <a href={photo.credit.licenseUrl} target="_blank" rel="noreferrer">{photo.credit.license}</a>.</span>
      )}
      <span>Fuente: <a href={photo.source.url} target="_blank" rel="noreferrer">{photo.source.publisher}</a>, consultada el {photo.source.accessed}.</span>
    </>
  );
}

/** The photograph of a stop in a modal, big, with its caption and its source (the format of the photographs of Fósiles). */
function PhotoDialog({ photo, onClose }: { photo: PonchoPhoto; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = dialog.current;
    if (el && !el.open) el.showModal();
    return () => el?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="poncho-dialog"
      aria-labelledby="poncho-photo-title"
      onClose={onClose}
      // Escape and the arrows are the dialog's: the diorama behind it does not leave or change step with them.
      onKeyDown={(e) => e.stopPropagation()}
      // A press on the dark behind it closes it.
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="poncho-dialog-head">
        <h2 id="poncho-photo-title">Archivo fotográfico</h2>
        <button type="button" className="iconbtn" aria-label="Cerrar" onClick={onClose}>{Icon.close}</button>
      </div>
      <figure className="poncho-photo">
        <img src={PONCHO_PHOTO_URL[photo.file]} alt={photo.alt} />
        <figcaption>
          <Quoted text={photo.caption} />
          <PhotoCredit photo={photo} />
        </figcaption>
      </figure>
    </dialog>
  );
}

/**
 * The panel of a stop of Poncho (issue #211), with the layout of the stops of Fósiles: a side panel on a wide screen and
 * a sheet that opens upwards on a phone, over the scene that fills the screen. It shows the act and the stop, its title and the
 * story of the stop, which grows a sentence at each «Siguiente» while the scene shows something new; at the last one come
 * «Saber más» (it unfolds in place) and the photograph. «Atrás» goes back a sentence, or into the stop before.
 */
export function PonchoPanel({ voyage, tour, onSource }: { voyage: VoyageController; tour: DioramaTour; onSource: OpenSources }) {
  const state = voyage.state!;
  const desktop = useIsDesktop();
  const panel = tour.panelRef;
  const scroll = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const [photoOpen, setPhotoOpen] = useState(false);
  const stops = voyageStops(state.kind);
  const last = state.card === stops.length - 1;
  const { milestone } = stops[state.card];
  const act = ponchoActOpeningAt(milestone.id);
  const photo = ponchoPhotoAt(milestone.id);
  const { view } = tour;
  // The sentences told so far: each «Siguiente» adds one. The source of the book goes with the last one told.
  const told = tour.sentences.slice(0, view.step + 1);

  // A new stop or sentence starts at the top of the panel, and the title takes the focus (as the stops of Fósiles do).
  useEffect(() => {
    title.current?.focus({ preventScroll: true });
    if (scroll.current) scroll.current.scrollTop = 0;
  }, [state.card, view.step]);

  const leaves = view.last && nextVoyageCard(state) === null;
  const content = (
    <>
      <div className="orc-panel-scroll poncho-panel-content" ref={scroll}>
        <div className="orc-panel-head">
          <div className="orc-panel-head-title">
            <span className="orc-kicker">{act ? `Acto ${act.number} · ` : ''}hito {state.card + 1} de {stops.length}</span>
            <h2 id="poncho-title" className="orc-chapter-h2" ref={title} tabIndex={-1}>{milestone.title}</h2>
          </div>
        </div>
        <ul className="vfacts poncho-line" aria-live="polite">
          {told.map((text, i) => (
            <Fact key={text} fact={{ ...milestone.essential, text, sources: i === told.length - 1 ? milestone.essential.sources : [] }} onSource={onSource} />
          ))}
        </ul>
        {view.showsHook && milestone.hook && <p className="vhook">{milestone.hook}</p>}
        {/* The rest waits for the end of the story of the stop. */}
        {view.last && photo && (
          <button type="button" className="poncho-archive" onClick={() => setPhotoOpen(true)} aria-label="Abrir fotografía del archivo">
            <img src={PONCHO_PHOTO_URL[photo.file]} alt="" loading="lazy" />
            <span><small>Archivo fotográfico</small><b>{photo.caption}</b><span>Ver fotografía ↗</span></span>
          </button>
        )}
        {view.last && milestone.more.length > 0 && (
          <details className="poncho-more" key={milestone.id}>
            <summary>Saber más</summary>
            <ul className="vfacts">{milestone.more.map((f) => <Fact key={f.text} fact={f} onSource={onSource} />)}</ul>
          </details>
        )}
      </div>
      <div className="orc-bar ebar">
        {tour.onBack && (
          <button type="button" className="btn ghost poncho-prev" onClick={tour.onBack}>
            <span className="poncho-prev-arrow" aria-hidden="true">{Icon.back}</span>Atrás
          </button>
        )}
        <button type="button" className="btn primary poncho-next" onClick={tour.onNext}>
          {leaves ? (last ? 'Terminar el viaje' : 'Seguir con Poncho') : 'Siguiente'}
          <span className="poncho-arrow" aria-hidden="true">{Icon.back}</span>
        </button>
      </div>
      {photo && photoOpen && <PhotoDialog photo={photo} onClose={() => setPhotoOpen(false)} />}
    </>
  );
  return desktop ? (
    <section className="orc-panel poncho-panel" ref={panel as RefObject<HTMLElement>} aria-labelledby="poncho-title">{content}</section>
  ) : (
    <BottomSheet className="orc-panel poncho-panel" labelledBy="poncho-title" sheetRef={panel} floor="peek" size={tour.size} onSize={tour.onSize}>{content}</BottomSheet>
  );
}

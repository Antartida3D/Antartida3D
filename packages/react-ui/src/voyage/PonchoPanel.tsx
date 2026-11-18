import { useEffect, useRef, useState, type RefObject } from 'react';
import { ponchoActOpeningAt, ponchoPhotosAt, previousVoyageCard, nextVoyageCard, voyageStops, type PonchoPhoto } from '@antartida/core';
import ponchoPageUrl from '@antartida/core/assets/poncho/poncho-pagina.jpg';
import sledTeamUrl from '@antartida/core/assets/poncho/perros-trineo.jpg';
import esperanzaUrl from '@antartida/core/assets/poncho/esperanza.jpg';
import sanMartinUrl from '@antartida/core/assets/poncho/san-martin.jpg';
import { BottomSheet } from '../BottomSheet.tsx';
import { useIsDesktop } from '../hooks.ts';
import { Icon, Quoted } from '../ui.tsx';
import { MoreFold } from '../sheet/MoreFold.tsx';
import { Cite } from '../sheet/Cite.tsx';
import { PhotoModal } from '../sheet/PhotoModal.tsx';
import { SheetActions } from '../sheet/SheetActions.tsx';
import { BackButton } from '../sheet/BackButton.tsx';
import { SheetHeader } from '../sheet/SheetHeader.tsx';
import { Fact } from './Fact.tsx';
import type { DioramaTour } from './PonchoDiorama.tsx';
import type { VoyageController } from './useVoyage.ts';

/** File of each photograph of a stop (PONCHO_PHOTOS in @antartida/core). */
export const PONCHO_PHOTO_URL = { 'poncho-pagina.jpg': ponchoPageUrl, 'perros-trineo.jpg': sledTeamUrl, 'esperanza.jpg': esperanzaUrl, 'san-martin.jpg': sanMartinUrl } as const;

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

/** The author and license of a photograph, when it has a free one, and the citation of its source: shown wherever the photograph is. */
export function PhotoCredit({ photo }: { photo: PonchoPhoto }) {
  return (
    <>
      {photo.credit && (
        <span>Foto: {photo.credit.author}. Licencia <a href={photo.credit.licenseUrl} target="_blank" rel="noreferrer">{photo.credit.license}</a>.</span>
      )}
      <Cite id={`photo:${photo.file}`} />
    </>
  );
}

/** The photograph of a stop, big in the middle of the screen, with its caption and source: the modal of every expedition (#309). */
function PhotoDialog({ photo, onClose }: { photo: PonchoPhoto; onClose: () => void }) {
  return (
    <PhotoModal src={PONCHO_PHOTO_URL[photo.file]} alt={photo.alt} onClose={onClose}>
      {/* One line of text, so its quotation marks do not break it in pieces. */}
      <span><Quoted text={photo.caption} /></span>
      <PhotoCredit photo={photo} />
    </PhotoModal>
  );
}

/**
 * The panel of a stop of Poncho (issue #211), with the layout of the stops of Fósiles: a side panel on a wide screen and
 * a sheet that opens upwards on a phone, over the scene that fills the screen. It shows the act and the stop, its title and the
 * story of the stop, which grows a sentence at each «Siguiente» while the scene shows something new; at the last one come
 * «Saber más» (it unfolds in place) and the photograph. «Atrás» goes back a sentence, or into the stop before.
 */
export function PonchoPanel({ voyage, tour }: { voyage: VoyageController; tour: DioramaTour }) {
  const state = voyage.state!;
  const desktop = useIsDesktop();
  const panel = tour.panelRef;
  const scroll = useRef<HTMLDivElement>(null);
  // The photograph open in its modal, or null.
  const [photoOpen, setPhotoOpen] = useState<PonchoPhoto | null>(null);
  const stops = voyageStops(state.kind);
  const last = state.card === stops.length - 1;
  const { milestone } = stops[state.card];
  const act = ponchoActOpeningAt(milestone.id);
  const photos = ponchoPhotosAt(milestone.id);
  const { view } = tour;
  // The sentences told so far: each «Siguiente» adds one. The source of the book goes with the last one told.
  const told = tour.sentences.slice(0, view.step + 1);

  // A new stop or sentence starts at the top of the panel, and the title takes the focus (as the stops of Fósiles do).
  useEffect(() => {
    document.getElementById('poncho-title')?.focus({ preventScroll: true });
    if (scroll.current) scroll.current.scrollTop = 0;
  }, [state.card, view.step]);

  const leaves = view.last && nextVoyageCard(state) === null;
  const content = (
    <>
      <div className="orc-panel-scroll poncho-panel-content" ref={scroll}>
        <SheetHeader
        label={`${act ? `Acto ${act.number} · ` : ''}hito ${state.card + 1} de ${stops.length}`}
        title={milestone.title}
        titleId="poncho-title"
        titleClass="orc-chapter-h2"
        titleFocusable
      />
        <ul className="vfacts poncho-line" aria-live="polite">
          {told.map((text, i) => (
            <Fact key={text} fact={{ ...milestone.essential, text, sources: i === told.length - 1 ? milestone.essential.sources : [] }} />
          ))}
        </ul>
        {view.showsHook && milestone.hook && <p className="vhook">{milestone.hook}</p>}
        {/* The rest waits for the end of the story of the stop. */}
        {view.last && photos.map((photo) => (
          <button key={photo.file} type="button" className="poncho-archive" onClick={() => setPhotoOpen(photo)} aria-label={photos.length > 1 ? `Abrir fotografía del archivo: ${photo.alt}` : 'Abrir fotografía del archivo'}>
            <img src={PONCHO_PHOTO_URL[photo.file]} alt="" loading="lazy" />
            <span><small>Archivo fotográfico</small><b>{photo.caption}</b><span>Ver fotografía ↗</span></span>
          </button>
        ))}
        {view.last && milestone.more.length > 0 && (
          <MoreFold key={milestone.id}>
            <ul className="vfacts">{milestone.more.map((f) => <Fact key={f.text} fact={f} />)}</ul>
          </MoreFold>
        )}
      </div>
      <SheetActions>
        {tour.onBack && (
          <BackButton onClick={tour.onBack} />
        )}
        <button type="button" className="btn primary poncho-next" onClick={tour.onNext}>
          {leaves ? (last ? 'Terminar expedición' : 'Seguir con Poncho') : 'Siguiente'}
          <span className="poncho-arrow" aria-hidden="true">{Icon.back}</span>
        </button>
      </SheetActions>

      {photoOpen && <PhotoDialog photo={photoOpen} onClose={() => setPhotoOpen(null)} />}
    </>
  );
  return desktop ? (
    <section className="orc-panel poncho-panel" ref={panel as RefObject<HTMLElement>} aria-labelledby="poncho-title">{content}</section>
  ) : (
    <BottomSheet className="orc-panel poncho-panel" labelledBy="poncho-title" sheetRef={panel} floor="peek" size={tour.size} onSize={tour.onSize}>{content}</BottomSheet>
  );
}

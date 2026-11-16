import { lazy, Suspense, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import {
  SIGHTINGS,
  expeditionAt,
  findTransport,
  formatIsoDate,
  logLineAt,
  ponchoActOpeningAt,
  ponchoPhotoAt,
  quizScore,
  sceneOf,
  tripSources,
  FAUNA_COUNT,
  PLACES_COUNT,
  sightingNote,
  TRANSPORTS,
  VOYAGE_SOURCES,
  VOYAGE_SOURCES_CONSULTED,
  VOYAGE_SOURCE_CODES,
  VOYAGE_TOURISM_NOTE,
  VOYAGE_TRANSFER,
  storyInOrder,
  voyageArrived,
  voyageProgress,
  voyageSightings,
  voyageStopAt,
  voyageStops,
  type TransportId,
  type VoyageFact,
  type VoyageState,
  type VoyageSource,
  type VoyageSourceCode,
} from '@antartida/core';
import ponchoPageUrl from '@antartida/core/assets/poncho/poncho-pagina.jpg';
import sledTeamUrl from '@antartida/core/assets/poncho/perros-trineo.jpg';
import { BottomSheet } from '../BottomSheet.tsx';
import { useFocusReturn, useMediaQuery } from '../hooks.ts';
import { Fact, TripContext, type OpenSources } from './Fact.tsx';
import { PonchoDiorama, type DioramaTour } from './PonchoDiorama.tsx';
import { PonchoIntro } from './PonchoIntro.tsx';
import { SightingIcon } from './SightingIcon.tsx';
import { NARROW_PX, type VoyageController } from './useVoyage.ts';

// Its own chunk: it needs WebGL, which the 2D fallback of the trip does not.
const VehiclePreview = lazy(() => import('./VehiclePreview.tsx').then((m) => ({ default: m.VehiclePreview })));

/** Date a source was read, when it is not the date the page gives for all of them. */
const sourceConsulted = (code: VoyageSourceCode) => (VOYAGE_SOURCES[code] as VoyageSource).consulted;

/** Separate page with the sources of the trip, numbered as the facts cite them. */
function SourcesPage({ focus, transport, notice, onClose }: { focus: VoyageSourceCode; transport?: TransportId; notice?: string; onClose: () => void }) {
  // Poncho lists only what it cites, numbered from 1; the trips from Ushuaia list the whole registry.
  const codes = transport ? tripSources(transport) : VOYAGE_SOURCE_CODES;
  const ref = useRef<HTMLDivElement>(null);
  useFocusReturn(true, ref, `[data-source="${focus}"] a`);
  return (
    <div
      className="listview vsources"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sources-title"
      ref={ref}
      onKeyDown={(e) => {
        if (e.key !== 'Escape') return;
        e.stopPropagation();
        onClose();
      }}
    >
      <div className="inner">
        <div className="listhead">
          <h2 id="sources-title">Fuentes</h2>
          <button type="button" className="btn" onClick={onClose}>Volver al viaje</button>
        </div>
        <p className="gdesc">Cada dato del viaje lleva un número entre corchetes. Acá está de dónde sale. Consultadas el {formatIsoDate(VOYAGE_SOURCES_CONSULTED)}, salvo las que dan otra fecha.</p>
        {notice && <p className="gdesc">{notice}</p>}
        <ol className="vsrclist">
          {codes.map((code) => (
            <li key={code} data-source={code} className={code === focus ? 'on' : undefined}>
              <strong>{VOYAGE_SOURCES[code].org}</strong>
              <span>{VOYAGE_SOURCES[code].title}</span>
              {sourceConsulted(code) && <span>Consultada el {formatIsoDate(sourceConsulted(code)!)}.</span>}
              <a href={VOYAGE_SOURCES[code].url} target="_blank" rel="noopener noreferrer">Abrir la fuente</a>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function Picker({ onStart, onExit, onSource, preview, reduced }: {
  onStart: (id: TransportId) => void;
  onExit: () => void;
  onSource: OpenSources;
  /** Show the turning 3D model of the picked vehicle (needs WebGL). */
  preview: boolean;
  reduced: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const [picked, setPicked] = useState<TransportId>(TRANSPORTS[0].id);
  useFocusReturn(true, ref, '[aria-pressed="true"]');
  const transport = TRANSPORTS.find((v) => v.id === picked)!;
  return (
    <>
    {/* Touching the map outside the sheet closes it, like the sheet of a point. */}
    <div className="scrim vscrim" onClick={onExit} />
    <BottomSheet className="voyage" labelledBy="voyage-title" sheetRef={ref} onClose={onExit}>
      {/* No close button: the sheet is dragged down, and «Volver al mapa» is below. */}
      <h2 id="voyage-title">Desde Ushuaia</h2>
      <p className="place">Elegí cómo cruzar a la Antártida. Son los medios que usa la ciencia argentina.</p>
      <div className="vpick" role="group" aria-label="Medio de transporte">
        {TRANSPORTS.map((v) => (
          <button key={v.id} type="button" className="vopt" aria-pressed={v.id === picked} onClick={() => setPicked(v.id)}>
            <small>{v.type}</small>
            <strong>{v.name}</strong>
          </button>
        ))}
      </div>
      {preview && (
        <Suspense fallback={<div className="vpreview" />}>
          <VehiclePreview id={picked} reduced={reduced} />
        </Suspense>
      )}
      <p>{transport.pitch}</p>
      <ul className="vfacts">
        {transport.facts.map((f) => <Fact key={f.text} fact={f} onSource={onSource} />)}
        <Fact fact={VOYAGE_TOURISM_NOTE} onSource={onSource} />
      </ul>
      <div className="row vactions">
        <button type="button" className="btn" onClick={onExit}>Volver al mapa</button>
        <button type="button" className="btn primary" onClick={() => onStart(picked)}>
          {transport.kind === 'plane' ? 'Despegar' : 'Zarpar'}
        </button>
      </div>
    </BottomSheet>
    </>
  );
}

/** Card of an animal the traveller touched on the map. */
function SightingCard({ voyage, onSource }: { voyage: VoyageController; onSource: OpenSources }) {
  const ref = useRef<HTMLElement>(null);
  useFocusReturn(true, ref, '.btn.primary');
  const sighting = SIGHTINGS.find((s) => s.id === voyage.sighting)!;
  return (
    <section
      className="sheet voyage"
      role="dialog"
      aria-modal="true"
      aria-labelledby="voyage-title"
      ref={ref}
      onKeyDown={(e) => e.key === 'Escape' && voyage.closeSighting()}
    >
      <small className="vstep">Avistaje {voyage.seen.length} de {SIGHTINGS.length}</small>
      <h2 id="voyage-title" className="vsighting"><SightingIcon icon={sighting.icon} />{sighting.name}</h2>
      <p className="vlatin">{sighting.latin}</p>
      <ul className="vfacts"><Fact fact={sighting.fact} onSource={onSource} /></ul>
      {sightingNote(sighting) && <p className="vsmall">{sightingNote(sighting)}</p>}
      <div className="row vactions">
        <button type="button" className="btn primary" onClick={voyage.closeSighting}>Seguir viaje</button>
      </div>
    </section>
  );
}

/**
 * Field notebook shown on arrival: the animals spotted can be opened again; the ones missed stay
 * as silhouettes, an invitation to do the trip again. Without the animated trip there is no
 * chance to spot them on the map, so every one opens from here.
 */
function Notebook({ voyage, animated }: { voyage: VoyageController; animated: boolean }) {
  const seenFauna = SIGHTINGS.filter((s) => !s.place && voyage.seen.includes(s.id)).length;
  return (
    <div className="vnotebook">
      <p>
        <strong>Cuaderno de avistajes:</strong>{' '}
        {animated
          ? `viste ${seenFauna} de ${FAUNA_COUNT} animales y ${voyage.seen.length - seenFauna} de ${PLACES_COUNT} lugares`
          : `${FAUNA_COUNT} animales y ${PLACES_COUNT} lugares de esta ruta`}
      </p>
      <ul>
        {SIGHTINGS.map((s) => {
          const open = !animated || voyage.seen.includes(s.id);
          return (
            <li key={s.id}>
              {open ? (
                <button type="button" className="vnote" onClick={() => voyage.openSighting(s.id)}>
                  <SightingIcon icon={s.icon} />{s.name}
                </button>
              ) : (
                <span className="vnote missed"><SightingIcon icon={s.icon} />Sin ver</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** File of each photograph of a stop (PONCHO_PHOTOS in @antartida/core). */
const PONCHO_PHOTO_URL = { 'poncho-pagina.jpg': ponchoPageUrl, 'perros-trineo.jpg': sledTeamUrl } as const;

/**
 * Milestones of the trip on arrival, like the notebook of the animals: the ones read and the ones
 * passed by without opening (#157). Every one opens from here, read or not.
 */
function MilestoneLog({ voyage }: { voyage: VoyageController }) {
  const state = voyage.state!;
  // The arrival is the card this is in: it is not listed.
  const stops = voyageStops(state.kind).slice(0, -1);
  const read = stops.filter((s) => voyage.opened.includes(s.milestone.id)).length;
  return (
    <div className="vnotebook">
      <p><strong>Hitos del viaje:</strong> abriste {read} de {stops.length}</p>
      <ul>
        {stops.map(({ milestone }, i) => {
          const open = voyage.opened.includes(milestone.id);
          return (
            <li key={milestone.id}>
              <button
                type="button"
                className={'vnote' + (open ? '' : ' missed')}
                onClick={() => voyage.openMilestone(i)}
                aria-label={open ? `${milestone.title}, abierto. Volver a leerlo.` : `${milestone.title}, sin abrir. Leerlo.`}
              >
                {milestone.title}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Card of a milestone. With `tour` (the diorama of the stop, voyage/PonchoDiorama.tsx) it tells the stop
 * a sentence at a time: «Atrás» and «Siguiente» move the tour; the hook and «Saber más» wait for the
 * last sentence; it is a side panel on a wide screen and a bottom sheet on a phone.
 */
function MilestoneCard({ voyage, animated, onExit, onSource, tour }: {
  voyage: VoyageController;
  animated: boolean;
  onExit: (done: boolean) => void;
  onSource: OpenSources;
  tour?: DioramaTour;
}) {
  const state = voyage.state!;
  const ref = useRef<HTMLElement>(null);
  const [more, setMore] = useState(false);
  const wide = useMediaQuery(`(min-width: ${NARROW_PX + 1}px)`);
  useFocusReturn(true, ref, tour ? '#voyage-title' : '.btn.primary');
  const stops = voyageStops(state.kind);
  const { milestone } = stops[state.card];
  const { notes, question } = expeditionAt(milestone.id, state.transport);
  const chosen = voyage.answers[milestone.id];
  const answered = chosen !== undefined;
  const [asked, setAsked] = useState(voyage.asking);
  const score = quizScore(state.transport, voyage.answers);
  const arrived = voyageArrived(state);
  // The card of the arrival. Once arrived, the other milestones open again from it, and close back to it.
  const last = state.card === stops.length - 1;
  // On the Irízar the arrival ends with the helicopter hop to the base, always shown: «Continuar» plays it.
  const hop = animated && last && state.transport === VOYAGE_TRANSFER.transport;
  const beforeHop = hop && voyage.transfer === 'none';
  const afterHop = hop && voyage.transfer === 'landed';
  // The question is optional (#157): on the way it waits behind a button, unless the card was opened
  // for it. On arrival it is asked at once, with no extra button. The hop answers it: once seen, an
  // unanswered question gives way to the notes.
  const quiz = !!question && (answered || (!afterHop && (asked || last)));
  const next = () => (beforeHop ? voyage.startTransfer() : last ? onExit(true) : voyage.closeCard());
  // The trip of Poncho is told in order, in acts: the first stop of each one shows its title above its own.
  const story = storyInOrder(state.kind);
  const photo = story ? ponchoPhotoAt(milestone.id) : undefined;
  const act = story ? ponchoActOpeningAt(milestone.id) : undefined;
  const body = (
    <>
      <small className="vstep">Hito {state.card + 1} de {stops.length}</small>
      {act && <small className="vact">Acto {act.number} · {act.act.title}</small>}
      <h2 id="voyage-title" tabIndex={tour ? -1 : undefined}>{milestone.title}</h2>
      {photo && (!tour || tour.view.step >= photo.fromStep) && (
        <figure className="vphoto">
          <img src={PONCHO_PHOTO_URL[photo.file]} alt={photo.alt} loading="lazy" />
          <figcaption>
            {photo.caption} Fuente: <a href={photo.source.url} target="_blank" rel="noreferrer">{photo.source.publisher}</a>, consultada el {photo.source.accessed}.
          </figcaption>
        </figure>
      )}
      {tour && (
        <div className="vdots" role="img" aria-label={`Toma ${tour.view.step + 1} de ${tour.sentences.length}`}>
          {tour.sentences.map((_, i) => <i key={i} className={i <= tour.view.step ? 'on' : undefined} />)}
        </div>
      )}
      <ul className="vfacts" aria-live={tour ? 'polite' : undefined}>
        {tour ? (
          // The sentences told so far; the citation of the book goes with the last one told.
          tour.sentences.slice(0, tour.view.shown).map((text, i) => (
            <Fact key={text} fact={{ ...milestone.essential, text, sources: i === tour.view.shown - 1 ? milestone.essential.sources : [] }} onSource={onSource} />
          ))
        ) : (
          <Fact fact={milestone.essential} onSource={onSource} />
        )}
        {more && (!tour || tour.view.showsMore) && milestone.more.map((f) => <Fact key={f.text} fact={f} onSource={onSource} />)}
      </ul>
      {notes.length > 0 && (
        <div className="vexp" role="group" aria-label="Cómo funciona la expedición">
          {question && !quiz && !last && (
            <button
              type="button"
              className="btn vask"
              onClick={() => {
                setAsked(true);
                // The button gives way to the question: the focus goes to its first option.
                requestAnimationFrame(() => ref.current?.querySelector<HTMLElement>('.vquiz .btn')?.focus());
              }}
            >
              Responder una pregunta
            </button>
          )}
          {question && quiz && (
            <fieldset className="vquiz">
              <legend>{question.prompt}</legend>
              {question.options.map((option, i) => (
                <button
                  key={option}
                  type="button"
                  className={'btn' + (answered && i === question.answer ? ' right' : answered && i === chosen ? ' wrong' : '')}
                  aria-pressed={i === chosen}
                  disabled={answered}
                  onClick={() => voyage.answer(milestone.id, i)}
                >
                  {option}
                </button>
              ))}
              <p className="vsmall" role="status">
                {answered && (chosen === question.answer ? 'Correcto.' : `No era esa. La respuesta es: ${question.options[question.answer]}.`)}
              </p>
            </fieldset>
          )}
          {/* The notes answer the question: they wait for it, or for the hop that shows the answer. */}
          {(!question || answered || afterHop) && (
            <ul className="vfacts">{notes.map((f) => <Fact key={f.text} fact={f} onSource={onSource} />)}</ul>
          )}
        </div>
      )}
      {/* The summary of the trip waits for the hop: before it, the card only asks and goes on. */}
      {last && !beforeHop && (
        <>
          {score.total > 0 && (
            <p>
              <strong>Preguntas del viaje:</strong>{' '}
              {score.answered === 0
                ? `no respondiste ninguna de las ${score.total}. Se abren desde los hitos de abajo.`
                : `respondiste ${score.answered} de ${score.total} y acertaste ${score.right}.${score.right === score.total ? ' ¡Todas!' : ''}`}
            </p>
          )}
          {!story && <MilestoneLog voyage={voyage} />}
          {voyageSightings(state.kind).length > 0 && <Notebook voyage={voyage} animated={animated} />}
          <p className="anno">{story ? 'Podés volver a recorrer su historia cuando quieras.' : 'Si te quedó curiosidad por otro medio, volvé a hacer la expedición.'}</p>
        </>
      )}
      {milestone.hook && (!tour || tour.view.showsHook) && <p className="vhook">{milestone.hook}</p>}
      <div className="row vactions">
        {tour && <button type="button" className="btn" disabled={tour.view.first} onClick={tour.onBack}>Atrás</button>}
        {!beforeHop && (!tour || tour.view.showsMore) && (
          <button type="button" className="btn ghost" aria-expanded={more} onClick={() => setMore((m) => !m)}>
            {more ? 'Ver menos' : 'Saber más'}
          </button>
        )}
        {/* The one main button, last on the right, where the thumb reaches on a phone (#177). */}
        {tour && !tour.view.last ? (
          <button type="button" className="btn primary" onClick={tour.onNext}>Siguiente</button>
        ) : (
          <button type="button" className="btn primary" onClick={tour ? tour.onLeave : next}>
            {story
              ? (last ? 'Terminar el viaje' : tour ? 'Seguir con Poncho' : state.card === 0 ? 'Partir' : 'Continuar')
              : beforeHop ? 'Continuar' : last ? 'Terminar el viaje' : arrived ? 'Volver a la llegada' : 'Seguir viaje'}
          </button>
        )}
      </div>
    </>
  );
  if (!tour) {
    return (
      <section
        className="sheet voyage"
        role="dialog"
        aria-modal="true"
        aria-labelledby="voyage-title"
        ref={ref}
        onKeyDown={(e) => e.key === 'Escape' && next()}
      >
        {body}
      </section>
    );
  }
  // The diorama screen handles the keys (arrows, Escape). Wide: a side panel; a phone: a sheet that can be dragged down to see the scene.
  return wide ? (
    <section className="sheet voyage vdiorama" role="dialog" aria-modal="true" aria-labelledby="voyage-title" ref={ref}>
      {body}
    </section>
  ) : (
    <BottomSheet className="voyage vdiorama" labelledBy="voyage-title" sheetRef={ref} floor="peek">
      {body}
    </BottomSheet>
  );
}

/**
 * Shown while the helicopter flies from the ship to the base: the arrival card steps aside, so the
 * map shows. The hop is part of the arrival and cannot be skipped: it lasts a few seconds.
 */
function TransferBar({ onSource }: { onSource: OpenSources }) {
  const ref = useRef<HTMLDivElement>(null);
  // No button to take the focus: the title holds it, so it is not lost while the hop plays.
  useFocusReturn(true, ref, '.vnext');
  return (
    <div className="vbar" role="group" aria-label={VOYAGE_TRANSFER.title} ref={ref}>
      <p className="vnext" tabIndex={-1}><strong>{VOYAGE_TRANSFER.title}</strong></p>
      <ul className="vfacts">
        {VOYAGE_TRANSFER.facts.map((f) => <Fact key={f.text} fact={f} onSource={onSource} />)}
      </ul>
    </div>
  );
}

const WHOLE = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });

/** Hours for the trip line: with minutes while they still matter (the flight), whole hours after that (the ships). */
function formatTripHours(hours: number): string {
  if (hours >= 10) return `${Math.round(hours)} h`;
  const minutes = Math.round(hours * 60);
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')} min`;
}

/** Distance and time travelled so far. Always an estimate, and the text says so. */
function tripLine({ transport, kind, t, reached }: VoyageState): string {
  // A life of 17 years is not measured in hours, nor in km of a line the map only draws: it goes by milestones.
  if (kind === 'dogs') return `${reached} de ${voyageStops(kind).length} hitos de su historia`;
  const { km, totalKm, hours } = voyageProgress(transport, t);
  return `Estimación: ≈ ${WHOLE.format(km)} de ${WHOLE.format(totalKm)} km · ≈ ${formatTripHours(hours)} ${kind === 'plane' ? 'de vuelo' : 'de navegación'}`;
}

/**
 * Line of the route log for the trip at this moment, if the trip has one. When the path is not animated (2D map,
 * reduced motion) the trip goes from stop to stop: the line is the one of the leg of the next stop, halfway there.
 */
function routeLogLine(state: VoyageState, animated: boolean): VoyageFact | null {
  if (state.kind !== 'dogs') return null;
  if (animated) return logLineAt(state.kind, state.t);
  const stops = voyageStops(state.kind);
  const next = stops[state.reached];
  if (!next) return null;
  const from = state.reached > 0 ? stops[state.reached - 1].t : 0;
  return logLineAt(state.kind, (from + next.t) / 2, next.milestone.segment);
}

function TravelBar({ voyage, animated, onExit, onSource }: { voyage: VoyageController; animated: boolean; onExit: () => void; onSource: OpenSources }) {
  const state = voyage.state!;
  const bar = useRef<HTMLElement>(null);
  const trip = useRef<HTMLParagraphElement>(null);
  const gear = useRef<HTMLSpanElement>(null);
  const { bus } = voyage;
  const [atStart, setAtStart] = useState(state.t <= 0);
  const [log, setLog] = useState<VoyageFact | null>(() => routeLogLine(state, animated));
  // The milestone the vehicle is at or just went by: going back can take it behind the last one passed.
  const [here, setHere] = useState(voyageStopAt(state));

  // The progress bar follows the trip frame by frame without re-rendering React.
  useEffect(() => {
    const paint = () => {
      if (bar.current && bus.state) bar.current.style.transform = `scaleX(${bus.state.t})`;
      if (trip.current && bus.state) {
        // Written only when it changes: the text moves by whole km and minutes, not every frame.
        const text = tripLine(bus.state);
        if (trip.current.textContent !== text) trip.current.textContent = text;
      }
      if (gear.current) {
        // How fast "advance" is going while held, by half steps: it picks up little by little (#166).
        const speed = Math.round(bus.speed * 2) / 2;
        const text = speed >= 1.5 ? `×${String(speed).replace('.', ',')}` : '';
        if (gear.current.textContent !== text) {
          gear.current.textContent = text;
          gear.current.hidden = !text;
        }
      }
      if (bus.state) {
        // Re-render only when they change.
        setAtStart(bus.state.t <= 0);
        setHere(voyageStopAt(bus.state));
        setLog(routeLogLine(bus.state, animated)); // so does the line of the route log: a line is a constant
      }
    };
    paint();
    bus.listeners.add(paint);
    return () => void bus.listeners.delete(paint);
  }, [bus, animated]);

  const next = voyageStops(state.kind)[state.reached].milestone;
  // The trip of Poncho opens every milestone by itself: there is none to offer.
  const stop = here >= 0 && !storyInOrder(state.kind) ? voyageStops(state.kind)[here].milestone : null;
  const question = stop ? expeditionAt(stop.id, state.transport).question : null;
  const read = stop ? voyage.opened.includes(stop.id) : false;
  /** Handlers of a press-and-hold button that moves the trip forward or back. */
  const holdProps = (back: boolean) => {
    const press = () => voyage.hold(true, back);
    const release = () => voyage.hold(false, back);
    const key = (on: boolean) => (e: KeyboardEvent) => {
      if (e.key !== ' ' && e.key !== 'Enter') return;
      e.preventDefault();
      if (e.repeat) return;
      if (on) press();
      else release();
    };
    return {
      onPointerDown: press,
      onPointerUp: release,
      onPointerLeave: release,
      onPointerCancel: release,
      onKeyDown: key(true),
      onKeyUp: key(false),
      onBlur: release,
      onContextMenu: (e: { preventDefault: () => void }) => e.preventDefault(),
    };
  };
  return (
    <div className="vbar" role="group" aria-label="Controles del viaje">
      {/* The route log: a line of the book while the team travels between stops. Where the path is not animated, one per step. */}
      {state.kind === 'dogs' && (
        <ul className="vfacts vlog" aria-live="polite" aria-label="Diario de ruta">
          {log && <Fact key={log.text} fact={log} onSource={onSource} />}
        </ul>
      )}
      <div className="vprog" aria-hidden="true"><i ref={bar} /></div>
      {/* Filled frame by frame, like the bar. Not a live region: it would be announced without pause. */}
      <p className="vtrip" ref={trip} />
      <p className="vnext">
        <span>Próximo hito: <strong>{next.title}</strong></span>
        {animated && voyageSightings(state.kind).length > 0 && (
          <span className="vcount" role="status" aria-label={`Avistajes: ${voyage.seen.length} de ${SIGHTINGS.length}`}>
            <SightingIcon icon="bird" />{voyage.seen.length}/{SIGHTINGS.length}
          </span>
        )}
      </p>
      {/* The milestone just passed and its question are offered, not opened: the trip goes on (#157). */}
      {stop && (
        <div className="vsuggest" role="group" aria-label="Hito por el que pasás">
          <button
            type="button"
            className={'vchip' + (read ? ' read' : '')}
            onClick={() => voyage.openMilestone(here)}
            aria-label={`${read ? 'Volver a leer' : 'Leer'} el hito: ${stop.title}`}
          >
            <span className="vchipk">{read ? 'Leído' : 'Leer'}</span>{stop.title}
          </button>
          {question && voyage.answers[stop.id] === undefined && (
            <button
              type="button"
              className="vchip ask"
              onClick={() => voyage.openMilestone(here, true)}
              aria-label={`Responder la pregunta del hito: ${stop.title}`}
            >
              ¿Una pregunta?
            </button>
          )}
        </div>
      )}
      {/* One row, with the main button at the same corner as "Seguir viaje" in the milestone card: the pointer stays put.
          It is the last one, on the right, where the thumb reaches on a phone (#177). */}
      <div className="row">
        <button type="button" className="btn ghost vexit" onClick={onExit} aria-label="Salir del viaje" title="Salir del viaje">✕</button>
        {/* Where the trip is not animated (2D map, reduced motion) it goes step by step. Animated, holding
            «avanzar» picks up speed (#166): a button to jump ahead was one too many (#190). */}
        {!animated && <button type="button" className="btn primary" onClick={voyage.skip}>Próximo hito</button>}
        {animated && (
          <button
            type="button"
            className="btn vback"
            {...holdProps(true)}
            disabled={atStart}
            aria-label="Mantené para retroceder"
            title="Mantené para retroceder, por si te perdiste algo"
          >
            ◀
          </button>
        )}
        {animated && (
          <button
            type="button"
            className="btn primary vhold"
            {...holdProps(false)}
            aria-label="Mantené para avanzar"
            title="Mantené apretado: va tomando velocidad"
          >
            <span className="vwide">Mantené para avanzar</span>
            <span className="vnarrow">Avanzar ▶</span>
            <span className="vgear" ref={gear} aria-hidden="true" hidden />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Interface of the trip from Ushuaia, laid over the live map: pick a transport, set the pace,
 * read each milestone. `animated` is false on the 2D map and under reduced motion: the trip then
 * advances milestone by milestone.
 */
export function VoyagePanel({ voyage, transport, animated, webgl, reduced, onExit }: {
  voyage: VoyageController;
  /** Transport of a trip that is not picked (Poncho's team): it starts at once, without the picker. */
  transport?: TransportId;
  animated: boolean;
  /** The 3D map is on, so WebGL works: the picker can show the vehicle model. */
  webgl: boolean;
  reduced: boolean;
  onExit: (done: boolean) => void;
}) {
  const { state } = voyage;
  // The source the sources page is open at, or null while it is closed.
  const [sources, setSources] = useState<VoyageSourceCode | null>(null);
  // Stops whose diorama lost its WebGL context for good: they show the common card from then on.
  const [lost, setLost] = useState<readonly string[]>([]);
  // A trip that is not picked (Poncho) opens with its start panel; «Comenzar» starts it.
  // The 3D scene opens a source from the card it shows next to an animal.
  voyage.bus.openSource = setSources;
  // A stop of Poncho with a scene opens its diorama (a screen of its own) when WebGL is on; the rest, and every fallback, show the card.
  const diorama = (at: VoyageState) => {
    const { milestone } = voyageStops(at.kind)[at.card];
    const scene = at.kind === 'dogs' && webgl && !lost.includes(milestone.id) ? sceneOf(milestone.id) : undefined;
    const card = (tour?: DioramaTour) => <MilestoneCard key={at.card} voyage={voyage} animated={animated} onExit={onExit} onSource={setSources} tour={tour} />;
    if (!scene) return card();
    return (
      <PonchoDiorama
        key={at.card}
        scene={scene}
        essential={milestone.essential.text}
        reduced={reduced}
        onDone={() => (voyageArrived(at) ? onExit(true) : voyage.closeCard())}
        onLost={() => setLost((l) => [...l, milestone.id])}
      >
        {card}
      </PonchoDiorama>
    );
  };
  // On a wide screen an animal touched on the map opens beside it, and the trip controls stay put.
  const stage = voyage.sighting && !voyage.popover
    ? <SightingCard voyage={voyage} onSource={setSources} />
    : !state
      ? transport ? <PonchoIntro transport={findTransport(transport)} onStart={() => voyage.start(transport)} onExit={() => onExit(false)} onSource={setSources} /> : <Picker onStart={voyage.start} onExit={() => onExit(false)} onSource={setSources} preview={webgl} reduced={reduced} />
    : voyage.transfer === 'flying'
      ? <TransferBar onSource={setSources} />
    : state.card >= 0
      ? diorama(state)
      : <TravelBar voyage={voyage} animated={animated} onExit={() => onExit(false)} onSource={setSources} />;
  const trip = state?.transport ?? transport;
  return (
    <TripContext.Provider value={trip && findTransport(trip).kind === 'dogs' ? trip : undefined}>
      {stage}
      {sources && <SourcesPage focus={sources} transport={trip} notice={trip ? findTransport(trip).notice : undefined} onClose={() => setSources(null)} />}
    </TripContext.Provider>
  );
}

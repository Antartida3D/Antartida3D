import { lazy, Suspense, useEffect, useReducer, useRef, useState, type CSSProperties } from 'react';
import {
  FOSSIL_CHAPTERS, FOSSIL_CLEAN_STEPS, FOSSIL_HABITATS, FOSSIL_PHOTOS, FOSSIL_QUESTION, FOSSIL_SOURCES, FOSSIL_STOPS,
  INITIAL_FOSSILS, fossilsReducer, type FossilPhotoId, type FossilSourceId,
} from '@antartida/core';
import oliveroPhoto from '@antartida/core/assets/fossils/olivero-campana.webp';
import ammonitePhoto from '@antartida/core/assets/fossils/amonite-archivo.webp';
import ammoniteOutcrop from '@antartida/core/assets/fossils/amonite-afloramiento.webp';
import ammoniteSection from '@antartida/core/assets/fossils/amonite-corte.webp';
import ammoniteLift from '@antartida/core/assets/fossils/amonite-traslado.webp';
import plesioSite from '@antartida/core/assets/fossils/plesiosaurio-sitio.webp';
import plesioPrep from '@antartida/core/assets/fossils/plesiosaurio-preparacion.webp';
import plesioSkeleton from '@antartida/core/assets/fossils/plesiosaurio-esqueleto.webp';
import dinoSite from '@antartida/core/assets/fossils/antarctopelta-sitio.webp';
import dinoRemains from '@antartida/core/assets/fossils/antarctopelta-restos.webp';
import trunkPhoto from '@antartida/core/assets/fossils/tronco-fosil.webp';
import forestPhoto from '@antartida/core/assets/fossils/bosque-tdf.webp';
import starsPhoto from '@antartida/core/assets/fossils/estrellas-bill-hill.webp';
import chitonPhoto from '@antartida/core/assets/fossils/quiton.webp';
import { BottomSheet, type OpenSheetSize } from '../BottomSheet.tsx';
import { useIsDesktop } from '../hooks.ts';
import { Icon } from '../ui.tsx';

const Scene = lazy(() => import('./FossilScene.tsx').then((m) => ({ default: m.FossilScene })));
const PHOTO_URL: Readonly<Record<FossilPhotoId, string>> = {
  olivero: oliveroPhoto, ammonite: ammonitePhoto, 'ammonite-outcrop': ammoniteOutcrop, 'ammonite-section': ammoniteSection,
  'ammonite-lift': ammoniteLift, 'plesio-site': plesioSite, 'plesio-prep': plesioPrep, 'plesio-skeleton': plesioSkeleton,
  'dino-site': dinoSite, 'dino-remains': dinoRemains, trunk: trunkPhoto, 'forest-tdf': forestPhoto, stars: starsPhoto, chiton: chitonPhoto,
};
/** Photograph shown instead of the scene when there is no WebGL and the stop has none of its own. */
const CHAPTER_PHOTO = {
  camp: 'olivero', ammonites: 'ammonite-outcrop', plesiosaur: 'plesio-site', dinosaur: 'dino-remains', stars: 'stars', past: 'trunk',
} as const satisfies Record<string, FossilPhotoId>;

function SourceLink({ id }: { id: FossilSourceId }) {
  const source = FOSSIL_SOURCES[id];
  return source.url ? <a href={source.url} target="_blank" rel="noopener noreferrer">{source.title} ↗</a> : <span>{source.title}</span>;
}

type Modal = { kind: 'sources' } | { kind: 'photo'; id: FossilPhotoId } | null;

export function FossilExpedition({ reduced, webgl, onLeave }: {
  reduced: boolean; webgl: boolean; onLeave: (done: boolean) => void;
}) {
  const [state, dispatch] = useReducer(fossilsReducer, INITIAL_FOSSILS);
  const [sheetSize, setSheetSize] = useState<OpenSheetSize>('small');
  const [reset, setReset] = useState(0);
  const [modal, setModal] = useState<Modal>(null);
  const [graphicsLost, setGraphicsLost] = useState(false);
  const root = useRef<HTMLElement>(null);
  const panel = useRef<HTMLElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const desktop = useIsDesktop();
  const stop = FOSSIL_STOPS[state.stop];
  const chapter = FOSSIL_CHAPTERS.findIndex((c) => c.id === stop.chapter);
  const last = state.stop === FOSSIL_STOPS.length - 1;
  const fallbackId = stop.photos?.[0] ?? CHAPTER_PHOTO[stop.chapter];
  const fallback = FOSSIL_PHOTOS[fallbackId];
  const use3D = webgl && !graphicsLost;
  const shown = modal?.kind === 'photo' ? modal.id : fallbackId;
  const place = stop.id === 'animal' && state.reconstructed ? 'Bosque del Cretácico · reconstrucción'
    : stop.id === 'environments' ? `${FOSSIL_HABITATS.find((h) => h.id === state.habitat)?.age} · reconstrucción` : stop.place;

  useEffect(() => {
    title.current?.focus({ preventScroll: true });
    if (scroll.current) scroll.current.scrollTop = 0;
    setSheetSize('small');
  }, [state.stop]);

  useEffect(() => {
    const el = panel.current;
    if (!el) return;
    const measure = () => root.current?.style.setProperty('--fossil-panel-h', `${el.getBoundingClientRect().height}px`);
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    measure();
    return () => observer.disconnect();
  }, [desktop]);

  useEffect(() => {
    const el = root.current;
    const lost = () => setGraphicsLost(true);
    el?.addEventListener('webglcontextlost', lost, true);
    return () => el?.removeEventListener('webglcontextlost', lost, true);
  }, []);

  useEffect(() => {
    const el = dialog.current;
    if (modal && el && !el.open) el.showModal();
    else if (!modal && el?.open) el.close();
  }, [modal]);

  const content = <>
    <div className="fossil-panel-content" ref={scroll}>
      <div className="fossil-section-line"><span>Cuaderno de campo</span><span>{String(state.stop + 1).padStart(2, '0')} / {FOSSIL_STOPS.length}</span></div>
      <p className="fossil-eyebrow">{stop.eyebrow}</p>
      <h2 id="fossil-title" ref={title} tabIndex={-1}>{stop.title}</h2>
      <p className="fossil-line" aria-live="polite">{stop.line}</p>

      {stop.id === 'spiral' && <div className="fossil-interaction">
        <div className="fossil-rubbing" role="group" aria-label="Limpieza ilustrativa del amonite">
          {Array.from({ length: FOSSIL_CLEAN_STEPS }, (_, i) => <span key={i} className={state.cleaned > i ? 'is-done' : ''} aria-hidden="true" />)}
          <span role="status">{state.cleaned === FOSSIL_CLEAN_STEPS ? 'Amonite descubierto' : `${state.cleaned} de ${FOSSIL_CLEAN_STEPS} pasadas`}</span>
        </div>
        <button className="btn fossil-action" disabled={state.cleaned === FOSSIL_CLEAN_STEPS} onClick={() => dispatch({ type: 'clean' })}>{state.cleaned === FOSSIL_CLEAN_STEPS ? 'Ya se ve la espiral' : 'Limpiar el sedimento'}</button>
        <small>Simulación educativa · también podés seguir sin limpiar.</small>
      </div>}

      {stop.id === 'vega' && <div className="fossil-interaction">
        <button className="btn fossil-action" aria-pressed={state.column} onClick={() => dispatch({ type: 'column' })}>{state.column ? 'Siguiendo la columna' : 'Seguir la columna'}</button>
        {state.column && <p className="fossil-observation" role="status">De la cabeza a la cola: las vértebras chicas del cuello largo, las grandes del tronco y las de la cola, que se afinan.</p>}
        <small>Disposición ilustrativa de los huesos.</small>
      </div>}

      {/* Only on «Una pista muy pequeña», the stop about the shape of the tooth: «Algo asomaba de la roca» is the find itself. */}
      {stop.id === 'tooth' && <div className="fossil-interaction">
        <button className="btn fossil-action" aria-pressed={state.tooth} onClick={() => dispatch({ type: 'tooth' })}>{state.tooth ? 'El diente, más cerca' : 'Examinar el diente'}</button>
        {state.tooth && <p className="fossil-observation" role="status">Observá la corona baja y ancha, con forma de hoja. No es cónica como la de un reptil marino.</p>}
      </div>}

      {stop.id === 'animal' && <div className="fossil-interaction">
        <button className="btn fossil-action" aria-pressed={state.reconstructed} onClick={() => dispatch({ type: 'reconstruct' })}>{state.reconstructed ? 'Volver a los restos' : 'Imaginar el animal completo'}</button>
        <small>{state.reconstructed ? 'Reconstrucción artística · forma, color y movimiento ilustrativos.' : 'Los fragmentos son la evidencia; la figura completa es una interpretación.'}</small>
      </div>}

      {stop.id === 'slab' && <div className="fossil-interaction">
        <button className="btn fossil-action" aria-pressed={state.measured} onClick={() => dispatch({ type: 'measure' })}>{state.measured ? 'Estrella medida' : 'Medir una estrella'}</button>
        {state.measured && <p className="fossil-observation" role="status">Del centro a la punta de un brazo: 17 mm en Billaster blakei y 15 mm en Buterminaster elegans.</p>}
        <small>Escala dibujada en centímetros · el resto de la escena no está a escala.</small>
      </div>}

      {stop.id === 'environments' && <div className="fossil-habitats" role="group" aria-label="Ambiente del pasado">
        {FOSSIL_HABITATS.map((h) => (
          <button key={h.id} aria-pressed={state.habitat === h.id} onClick={() => dispatch({ type: 'habitat', habitat: h.id })}>{h.label}<small>{h.age}</small></button>
        ))}
      </div>}

      {last && <ul className="fossil-checklist" aria-label="Tu registro de la expedición">
        <li><span>{state.cleaned === FOSSIL_CLEAN_STEPS ? '✓' : '○'}</span>{state.cleaned === FOSSIL_CLEAN_STEPS ? 'Descubriste la espiral del amonite' : 'Limpieza del amonite: opcional'}</li>
        <li><span>{state.column ? '✓' : '○'}</span>{state.column ? 'Seguiste la columna del plesiosaurio' : 'Columna del plesiosaurio: opcional'}</li>
        <li><span>{state.tooth ? '✓' : '○'}</span>{state.tooth ? 'Observaste el diente de cerca' : 'Observación del diente: opcional'}</li>
        <li><span>{state.imagined ? '✓' : '○'}</span>{state.imagined ? 'Imaginaste el dinosaurio completo' : 'Imaginar el animal completo: opcional'}</li>
        <li><span>{state.measured ? '✓' : '○'}</span>{state.measured ? 'Mediste una estrella de mar' : 'Medición de la estrella: opcional'}</li>
        <li><span>✓</span>Recorriste {state.visited.length} de {FOSSIL_STOPS.length} paradas</li>
      </ul>}

      <div className="fossil-source-line"><span>Fuente</span>{stop.sources.map((id) => <SourceLink key={id} id={id} />)}</div>
      <details className="fossil-more" key={stop.id}><summary>Saber más</summary><p>{stop.more}</p></details>
      {stop.photos && <div className="fossil-archive-list" role="group" aria-label="Archivo fotográfico">
        {stop.photos.map((id, i) => {
          const photo = FOSSIL_PHOTOS[id];
          return <button key={id} className="fossil-archive" style={{ '--tilt': `${i % 2 ? 2.5 : -3}deg` } as CSSProperties} onClick={() => setModal({ kind: 'photo', id })} aria-label={`Abrir fotografía: ${photo.caption}`}>
            <img src={PHOTO_URL[id]} alt="" loading="lazy" /><span><small>{photo.note ? 'Comparación actual' : 'Archivo fotográfico'}</small><b>{photo.caption}</b><span>Ver fotografía ↗</span></span>
          </button>;
        })}
      </div>}
    </div>
    <div className="fossil-panel-footer">
      <button className="btn fossil-prev" aria-label="Parada anterior" disabled={state.stop === 0} onClick={() => dispatch({ type: 'prev' })}>{Icon.back}</button>
      <button className="btn primary fossil-next" onClick={() => last ? onLeave(true) : dispatch({ type: 'next' })}>{last ? 'Terminar expedición' : chapter !== FOSSIL_CHAPTERS.findIndex((c) => c.id === FOSSIL_STOPS[state.stop + 1].chapter) ? `Seguir a ${FOSSIL_CHAPTERS[chapter + 1].label}` : 'Seguir explorando'}<span aria-hidden="true">{last ? '✓' : '→'}</span></button>
    </div>
  </>;

  const photo = FOSSIL_PHOTOS[shown];
  return <section className="fossil-expedition" ref={root} aria-label="Expedición Fósiles">
    <header className="fossil-header">
      <button className="fossil-map" onClick={() => onLeave(false)}>{Icon.back}<span>Mapa</span></button>
      <div className="fossil-brand"><b>Fósiles</b><span>La Antártida antes del hielo</span></div>
      <button className="fossil-sources-button" onClick={() => setModal({ kind: 'sources' })}>Fuentes</button>
    </header>
    <nav className="fossil-chapters" aria-label="Capítulos de Fósiles">
      {FOSSIL_CHAPTERS.map((c, i) => <button key={c.id} aria-current={c.id === stop.chapter ? 'step' : undefined} onClick={() => dispatch({ type: 'chapter', chapter: c.id })}><span>{String(i + 1).padStart(2, '0')}</span>{c.label}</button>)}
    </nav>
    <div className="fossil-workspace">
      <div className="fossil-stage">
        {use3D ? <Suspense fallback={<div className="fossil-loading" role="status">Abriendo el cuaderno de campo…</div>}><Scene view={stop.view} state={state} reduced={reduced} reset={reset} /></Suspense> : <figure className="fossil-fallback"><img src={PHOTO_URL[fallbackId]} alt={fallback.alt} /><figcaption>{fallback.caption}<br />{fallback.credit}{fallback.note && <span>{fallback.note}</span>}<span>Recorrido en fotografías · todas las paradas e interacciones siguen disponibles.</span>{stop.id === 'animal' && state.reconstructed && <span>Reconstrucción ilustrativa: un dinosaurio herbívoro, de cuerpo bajo y protegido por placas óseas.</span>}</figcaption></figure>}
        <div className="fossil-location"><span className="fossil-location-dot" /><span>{place}<small>{stop.chapter === 'past' ? 'Ambientes reconstruidos' : 'Antártida · cuaderno de expedición'}</small></span></div>
        {use3D && <button className="fossil-reset" aria-label="Restablecer vista de la escena" onClick={() => setReset((v) => v + 1)}>{Icon.reset}</button>}
        <div className="fossil-scene-note"><span>{use3D ? 'Reconstrucción ilustrativa' : 'Fotografía de archivo'}</span><small>{use3D ? 'Arrastrá para mirar alrededor · tamaños exagerados' : 'Archivo fotográfico con créditos al abrir la foto'}</small></div>
        {stop.id === 'spiral' && state.cleaned === FOSSIL_CLEAN_STEPS && <div className="fossil-found" role="status">01 · La espiral apareció</div>}
        {stop.id === 'giants' && <div className="fossil-found">01 · Amonite gigante<small>Forma y movimiento ilustrativos</small></div>}
        {stop.id === 'vega' && state.column && <div className="fossil-found">02 · Una columna, de la cabeza a la cola</div>}
        {stop.id === 'swimmer' && <div className="fossil-found">02 · Un reptil marino<small>Forma, color y nado ilustrativos</small></div>}
        {stop.id === 'tooth' && state.tooth && <div className="fossil-found">03 · Una mandíbula. Un diente.</div>}
        {stop.id === 'slab' && state.measured && <div className="fossil-found">04 · 17 mm, del centro a la punta</div>}
      </div>
      {desktop ? <section className="fossil-panel" ref={panel} aria-labelledby="fossil-title">{content}</section> : <BottomSheet className="fossil-panel" labelledBy="fossil-title" sheetRef={panel} floor="peek" size={sheetSize} onSize={setSheetSize}>{content}</BottomSheet>}
    </div>
    <dialog className="fossil-dialog" ref={dialog} aria-labelledby="fossil-dialog-title" onClose={() => setModal(null)} onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
      <div className="fossil-dialog-heading"><h2 id="fossil-dialog-title">{modal?.kind === 'sources' ? 'Fuentes del recorrido' : 'Archivo de campo'}</h2><button className="iconbtn" aria-label="Cerrar archivo y fuentes" onClick={() => setModal(null)}>{Icon.close}</button></div>
      {modal?.kind === 'sources' ? <>
        <p>{FOSSIL_QUESTION}</p><p>Las escenas son ilustrativas. Cada parada identifica la fuente de su relato y de sus evidencias.</p>
        {Object.entries(FOSSIL_SOURCES).map(([id, source]) => <article className="fossil-source-entry" key={id}><h3><SourceLink id={id as FossilSourceId} /></h3><p>{source.org}</p><p>{source.detail}</p><small>Consultado: {source.date.split('-').reverse().join('/')}</small></article>)}
        <p className="fossil-pending">Para seguir completando con Eduardo: especie y medidas de los amonites elegidos, relato de su hallazgo, fecha y lugar de cada fotografía del archivo y nuevos testimonios. Los modelos de los animales son una primera interpretación visual.</p>
      </> : <figure className="fossil-archive-full"><img src={PHOTO_URL[shown]} alt={photo.alt} /><figcaption><b>{photo.caption}</b>{photo.note && <span className="fossil-photo-note">{photo.note}</span>}<span>{photo.credit}</span><SourceLink id={photo.source} /></figcaption></figure>}
    </dialog>
  </section>;
}

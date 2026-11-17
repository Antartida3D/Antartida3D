import { lazy, Suspense, useEffect, useReducer, useRef, useState, type CSSProperties } from 'react';
import {
  FOSSIL_CHAPTERS, FOSSIL_CLEAN_STEPS, FOSSIL_HABITATS, FOSSIL_PHOTOS, FOSSIL_QUESTION, FOSSIL_STOPS, FOSSIL_STORY,
  INITIAL_FOSSILS, fossilsReducer, type FossilPhotoId,
  FOSSIL_CITED,
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
import { FossilTimeline } from './FossilTimeline.tsx';
import { useIsDesktop } from '../hooks.ts';
import { CanvasGuard } from '../CanvasGuard.tsx';
import { KindChip } from '../orcadas/KindChip.tsx';
import { useSceneFrame } from '../sceneFrame.tsx';
import { Icon, Quoted } from '../ui.tsx';
import { Cites } from '../sheet/Cite.tsx';
import { MoreFold } from '../sheet/MoreFold.tsx';
import { SheetActions } from '../sheet/SheetActions.tsx';
import { SheetHeader } from '../sheet/SheetHeader.tsx';
import { SourcesContext } from '../sheet/SourcesContext.ts';
import { SourcesView } from '../sheet/SourcesView.tsx';

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

const SOURCES = FOSSIL_CITED;

type Modal = { kind: 'sources'; id: string | null } | { kind: 'story' } | { kind: 'photo'; id: FossilPhotoId } | null;

export function FossilExpedition({ reduced, webgl, resume, onProgress, onLeave }: {
  reduced: boolean; webgl: boolean; resume?: { step: number; sub?: number }; onProgress?: (step: number, sub?: number) => void; onLeave: (done: boolean) => void;
}) {
  const [state, dispatch] = useReducer(fossilsReducer, resume?.step ?? 0, (step) => {
    const target = Math.max(0, Math.min(FOSSIL_STOPS.length - 1, Math.trunc(step)));
    let s = INITIAL_FOSSILS;
    for (let i = 0; i < target; i++) s = fossilsReducer(s, { type: 'next' });
    return s;
  });
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;
  useEffect(() => {
    onProgressRef.current?.(state.stop);
  }, [state.stop]);
  const [sheetSize, setSheetSize] = useState<OpenSheetSize>('small');
  const [reset, setReset] = useState(0);
  const [modal, setModal] = useState<Modal>(null);
  const [graphicsLost, setGraphicsLost] = useState(false);
  const root = useRef<HTMLElement>(null);
  const panel = useRef<HTMLElement>(null);
  const top = useRef<HTMLElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
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
    root.current?.querySelector<HTMLElement>('#fossil-title')?.focus({ preventScroll: true });
    if (scroll.current) scroll.current.scrollTop = 0;
    setSheetSize('small');
  }, [state.stop]);

  const shift = useSceneFrame(root, top, panel, desktop);
  const visitedChapters = new Set(state.visited.map((id) => FOSSIL_STOPS.find((s) => s.id === id)?.chapter));

  useEffect(() => {
    const el = root.current;
    const lost = () => setGraphicsLost(true);
    el?.addEventListener('webglcontextlost', lost, true);
    return () => el?.removeEventListener('webglcontextlost', lost, true);
  }, []);

  const dialog = useRef<HTMLElement>(null);
  const sourcesBtn = useRef<HTMLButtonElement>(null);
  const openSource = (id: string | null) => setModal({ kind: 'sources', id });

  const content = <>
    <div className="orc-panel-scroll fossil-panel-content" ref={scroll}>
      <SheetHeader
        label={<>{FOSSIL_CHAPTERS[chapter].label} · parada {state.stop + 1} de {FOSSIL_STOPS.length}</>}
        title={stop.title}
        titleId="fossil-title"
        titleClass="orc-chapter-h2"
        titleFocusable
      />
      <FossilTimeline state={state} />
      <p className="fossil-eyebrow">{stop.eyebrow}</p>
      <p className="fossil-line" aria-live="polite">{stop.line}<Cites ids={stop.sources} /></p>

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
        <button className="btn fossil-action" aria-pressed={state.reconstructed} onClick={() => dispatch({ type: 'reconstruct' })}>{state.reconstructed ? 'Ver los restos' : 'Ver el animal completo'}</button>
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
        <li><span>{state.measured ? '✓' : '○'}</span>{state.measured ? 'Mediste una estrella de mar' : 'Medición de la estrella: opcional'}</li>
        <li><span>✓</span>Recorriste {state.visited.length} de {FOSSIL_STOPS.length} paradas</li>
      </ul>}

      <MoreFold key={stop.id}><p>{stop.more}</p></MoreFold>
      {stop.id === FOSSIL_STORY.stop && <button className="fossil-note" onClick={() => setModal({ kind: 'story' })} aria-label={`Abrir nota: ${FOSSIL_STORY.title}`}>
        <small>Nota de campo · relato de Eduardo</small><b>{FOSSIL_STORY.title}</b><span>Leer la anécdota ↗</span>
      </button>}
      {stop.photos && <div className="fossil-archive-list" role="group" aria-label="Archivo fotográfico">
        {stop.photos.map((id, i) => {
          const photo = FOSSIL_PHOTOS[id];
          return <button key={id} className="fossil-archive" style={{ '--tilt': `${i % 2 ? 2.5 : -3}deg` } as CSSProperties} onClick={() => setModal({ kind: 'photo', id })} aria-label={`Abrir fotografía: ${photo.caption}`}>
            <img src={PHOTO_URL[id]} alt="" loading="lazy" /><span><small>{photo.note ? 'Comparación actual' : 'Archivo fotográfico'}</small><b>{photo.caption}</b><span>Ver fotografía ↗</span></span>
          </button>;
        })}
      </div>}
    </div>
    <SheetActions>
      {state.stop > 0 && <button type="button" className="btn fossil-prev" onClick={() => dispatch({ type: 'prev' })}>Atrás</button>}
      <button type="button" className="btn primary fossil-next" onClick={() => last ? onLeave(true) : dispatch({ type: 'next' })}>{last ? 'Terminar expedición' : 'Siguiente'}</button>
    </SheetActions>
  </>;

  const photo = FOSSIL_PHOTOS[shown];
  return <SourcesContext.Provider value={{ list: SOURCES, open: openSource }}><section className={`orc fossil-expedition${!desktop && sheetSize === 'tall' ? ' is-panel-expanded' : ''}${!desktop && sheetSize === 'peek' ? ' is-panel-peek' : ''}`} ref={root} aria-label="Expedición Fósiles">
    <div className="fossil-stage">
      {use3D ? <CanvasGuard onFail={() => setGraphicsLost(true)}><Suspense fallback={<div className="fossil-loading" role="status">Abriendo el cuaderno de campo…</div>}><Scene view={stop.view} state={state} reduced={reduced} reset={reset} shift={shift} /></Suspense></CanvasGuard> : <figure className="fossil-fallback"><img src={PHOTO_URL[fallbackId]} alt={fallback.alt} /><figcaption>{fallback.caption}<br />{fallback.credit}{fallback.note && <span>{fallback.note}</span>}<span>Recorrido en fotografías · todas las paradas e interacciones siguen disponibles.</span>{stop.id === 'animal' && state.reconstructed && <span>Reconstrucción ilustrativa: un dinosaurio herbívoro, de cuerpo bajo y protegido por placas óseas.</span>}</figcaption></figure>}
    </div>
    <div className="fossil-location"><span className="fossil-location-dot" /><span>{place}<small>{stop.chapter === 'past' ? 'Ambientes reconstruidos' : 'Antártida · cuaderno de expedición'}</small></span></div>
    {use3D && <button type="button" className="fossil-reset" aria-label="Restablecer vista de la escena" onClick={() => setReset((v) => v + 1)}>{Icon.reset}</button>}
    <div className="orc-scene-badge fossil-scene-note">
      <div className="orc-scene-badge-row"><KindChip kind={use3D ? 'recon' : 'real'} label={use3D ? 'Reconstrucción ilustrativa' : 'Fotografía de archivo'} /></div>
      <small>{use3D ? 'Arrastrá para mirar alrededor · tamaños exagerados' : 'Archivo fotográfico con créditos al abrir la foto'}</small>
    </div>
    {stop.id === 'spiral' && state.cleaned === FOSSIL_CLEAN_STEPS && <div className="fossil-found" role="status">01 · La espiral apareció</div>}
    {stop.id === 'giants' && <div className="fossil-found">01 · Amonite gigante<small>Forma y movimiento ilustrativos</small></div>}
    {stop.id === 'vega' && state.column && <div className="fossil-found">02 · Una columna, de la cabeza a la cola</div>}
    {stop.id === 'swimmer' && <div className="fossil-found">02 · Un reptil marino<small>Forma, color y nado ilustrativos</small></div>}
    {stop.id === 'tooth' && state.tooth && <div className="fossil-found">03 · Una mandíbula. Un diente.</div>}
    {stop.id === 'slab' && state.measured && <div className="fossil-found">04 · 17 mm, del centro a la punta</div>}
    <header className="orc-top" ref={top}>
      <div className="orc-top-r1">
        <button type="button" className="pill orc-top-btn" aria-label="Volver al mapa" onClick={() => onLeave(false)}>{Icon.back}<span>Mapa</span></button>
        <div className="orc-top-title"><strong>Fósiles</strong><span>{FOSSIL_QUESTION}</span></div>
        <button type="button" className="pill orc-top-btn" aria-haspopup="dialog" ref={sourcesBtn} onClick={() => openSource(null)}>Fuentes</button>
      </div>
      <nav className="orc-steps-nav" aria-label="Capítulos de Fósiles">
        <ol className="orc-steps">
          {FOSSIL_CHAPTERS.map((c, i) => {
            const current = c.id === stop.chapter;
            return <li key={c.id} className="orc-step-item">
              <button type="button" className={`orc-step-btn${current ? ' is-current' : visitedChapters.has(c.id) ? ' is-visited' : ''}`} aria-current={current ? 'step' : undefined} aria-label={`${i + 1} ${c.label}`} onClick={() => dispatch({ type: 'chapter', chapter: c.id })}>
                <span className="orc-step-num" aria-hidden="true">{i + 1}</span><span className="orc-step-name">{c.label}</span>
              </button>
            </li>;
          })}
        </ol>
      </nav>
    </header>
    {desktop ? <section className="orc-panel fossil-panel" ref={panel} aria-labelledby="fossil-title">{content}</section> : <BottomSheet className="orc-panel fossil-panel" labelledBy="fossil-title" sheetRef={panel} floor="peek" size={sheetSize} onSize={setSheetSize}>{content}</BottomSheet>}
    {modal?.kind === 'sources' && <SourcesView list={SOURCES} highlight={modal.id} place={FOSSIL_QUESTION}
      notice={['Las escenas son ilustrativas. Cada parada identifica la fuente de su relato y de sus evidencias.', 'Para seguir completando con Eduardo: especie y medidas de los amonites elegidos, relato de su hallazgo, fecha y lugar de cada fotografía del archivo y nuevos testimonios. Los modelos de los animales son una primera interpretación visual.']}
      onClose={() => setModal(null)} fallbackFocus={() => sourcesBtn.current} />}
    {modal?.kind === 'story' && <BottomSheet className="voyage fossil-sheet" labelledBy="fossil-story-title" sheetRef={dialog} onClose={() => setModal(null)}>
      <SheetHeader label="Nota de campo · relato de Eduardo" title={FOSSIL_STORY.title} titleId="fossil-story-title" />
      <article className="fossil-story">
        {FOSSIL_STORY.paragraphs.map((text) => <p key={text}><Quoted text={text} /></p>)}
        <footer><span>{FOSSIL_STORY.credit}</span><Cites ids={[FOSSIL_STORY.source]} /></footer>
      </article>
      <SheetActions><button type="button" className="btn primary" onClick={() => setModal(null)}>Volver</button></SheetActions>
    </BottomSheet>}
    {modal?.kind === 'photo' && <BottomSheet className="voyage fossil-sheet" labelledBy="fossil-photo-title" sheetRef={dialog} onClose={() => setModal(null)}>
      <SheetHeader title="Archivo de campo" titleId="fossil-photo-title" />
      <figure className="fossil-archive-full"><img src={PHOTO_URL[shown]} alt={photo.alt} /><figcaption><b>{photo.caption}</b>{photo.note && <span className="fossil-photo-note">{photo.note}</span>}<span>{photo.credit}<Cites ids={[photo.source]} /></span></figcaption></figure>
      <SheetActions><button type="button" className="btn primary" onClick={() => setModal(null)}>Volver</button></SheetActions>
    </BottomSheet>}
  </section></SourcesContext.Provider>;
}

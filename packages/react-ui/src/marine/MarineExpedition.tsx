import { lazy, Suspense, useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react';
import {
  INITIAL_MARINE, MARINE_CHAPTERS, MARINE_ORGANISMS, MARINE_QUESTION, MARINE_STOPS, MARINE_VIEW_TEXT,
  isUnderwater, linksOf, marineReducer,
  MARINE_CITED,
} from '@antartida/core';
import { BottomSheet, type OpenSheetSize } from '../BottomSheet.tsx';
import { useIsDesktop } from '../hooks.ts';
import { CanvasGuard } from '../CanvasGuard.tsx';
import { useSceneFrame } from '../sceneFrame.tsx';
import { Icon } from '../ui.tsx';
import { Cites } from '../sheet/Cite.tsx';
import { SheetActions } from '../sheet/SheetActions.tsx';
import { SheetHeader } from '../sheet/SheetHeader.tsx';
import { SourcesContext } from '../sheet/SourcesContext.ts';
import { SourcesView } from '../sheet/SourcesView.tsx';
import { FoodWebPanel, WebDiagram } from './FoodWeb.tsx';
import { MagnifyButton } from './MagnifyButton.tsx';
import { PinIcon } from '../voyage/PinIcon.tsx';

const Scene = lazy(() => import('./MarineScene.tsx').then((m) => ({ default: m.MarineScene })));

const SOURCES = MARINE_CITED;
/** Part of the screen the small sheet takes on a phone (`--orc-sheet` of `.orc` in orcadas.css). */
const SMALL_SHEET = 0.45;

/** «a, b y c». */
const list = (items: readonly string[]) => items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
const eatersOf = (o: 'krill') => linksOf(o).filter((l) => l.from === o).map((l) => MARINE_ORGANISMS[l.to].label.toLowerCase());
const foodOf = (o: 'leopard') => linksOf(o).filter((l) => l.to === o).map((l) => MARINE_ORGANISMS[l.from].label);

export function MarineExpedition({ reduced, webgl, resume, onProgress, onLeave }: {
  reduced: boolean; webgl: boolean; resume?: { step: number; sub?: number }; onProgress?: (step: number, sub?: number) => void; onLeave: (done: boolean) => void;
}) {
  const [state, dispatch] = useReducer(marineReducer, resume?.step ?? 0, (step) => {
    const target = Math.max(0, Math.min(MARINE_STOPS.length - 1, Math.trunc(step)));
    let s = INITIAL_MARINE;
    for (let i = 0; i < target; i++) s = marineReducer(s, { type: 'next' });
    return s;
  });
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;
  useEffect(() => {
    onProgressRef.current?.(state.stop);
  }, [state.stop]);
  const [sheetSize, setSheetSize] = useState<OpenSheetSize>('small');
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [graphicsLost, setGraphicsLost] = useState(false);
  const root = useRef<HTMLElement>(null);
  const panel = useRef<HTMLElement>(null);
  const top = useRef<HTMLElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const desktop = useIsDesktop();
  const stop = MARINE_STOPS[state.stop];
  const chapter = MARINE_CHAPTERS.findIndex((c) => c.id === stop.chapter);
  const last = state.stop === MARINE_STOPS.length - 1;
  const use3D = webgl && !graphicsLost;
  const under = isUnderwater(stop.view, state);
  // Three stops have two looks: the opening and the emperor stops above the ice and under it, the orca stop the family
  // and then the documented example. «Siguiente» shows the second look before it goes on, and the back arrow the first.
  const atCeiling = stop.id === 'ceiling';
  const atOrcas = stop.id === 'orcas';
  const twoLooks = atCeiling || stop.id === 'emperor-hunt' || atOrcas;
  const second = atOrcas ? state.example : state.under;
  const above = twoLooks && !second;
  const below = twoLooks && second;
  const lookAction = atOrcas ? 'example' as const : 'surface' as const;
  const lookLabel = atCeiling ? 'Mirar bajo el hielo' : atOrcas ? 'Ver un ejemplo documentado' : 'Mirar bajo el agua';
  const atCeilingUnder = atCeiling && state.under;
  // Every stop says all its text at once, with no «Saber más»; the opening one tells one part above the ice and the
  // other under it. The phytoplankton stop also drops the line over its text, to gain room.
  const allAtOnce = !atCeiling;

  useEffect(() => {
    root.current?.querySelector<HTMLElement>('#marine-title')?.focus({ preventScroll: true });
    if (scroll.current) scroll.current.scrollTop = 0;
    setSheetSize('small');
  }, [state.stop]);

  const frame = useSceneFrame(root, top, panel, desktop);
  // On a phone the stage fills the screen and the view sits above the small sheet, whatever size the sheet has now:
  // folding or raising it must not move the camera.
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setHeight(el.clientHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  // A landscape phone has the side panel instead (orcadas.css, max-height 500px).
  const sheetOver = !desktop && height > 500;
  const shift = sheetOver ? { x: 0, y: Math.round((height * SMALL_SHEET) / 2) } : frame;

  // On a phone the sheet is raised to read more. When the stop already shows whole at the small size
  // there is nothing more to read, and raising it would only show empty paper.
  const [overflows, setOverflows] = useState(true);
  useLayoutEffect(() => {
    const box = scroll.current;
    if (box && sheetSize === 'small') setOverflows(box.scrollHeight > box.clientHeight + 1);
  });

  useEffect(() => {
    const el = root.current;
    const lost = () => setGraphicsLost(true);
    el?.addEventListener('webglcontextlost', lost, true);
    return () => el?.removeEventListener('webglcontextlost', lost, true);
  }, []);

  const magnify = () => dispatch({ type: 'magnify' });

  const openSource = (id: string | null) => {
    setHighlight(id);
    setSourcesOpen(true);
  };

  const content = <>
    <div className="orc-panel-scroll marine-panel-content" ref={scroll}>
      <SheetHeader
        label={<>{MARINE_CHAPTERS[chapter].label} · parada {state.stop + 1} de {MARINE_STOPS.length}</>}
        title={stop.title}
        titleId="marine-title"
        titleClass="orc-chapter-h2"
        titleFocusable
      />
      {stop.id !== 'tiny' && <p className="marine-eyebrow">{stop.eyebrow}</p>}
      {/* The opening stop tells one thing per look: its line above the ice and its «more» under it, where the krill is in view. */}
      <p className="marine-line" aria-live="polite">{atCeilingUnder ? stop.more : stop.line}{!allAtOnce && <Cites ids={stop.sources} />}</p>

      {/* The sources of the stop go after all its text. */}
      {allAtOnce && <p className="marine-line">{stop.more}<Cites ids={stop.sources} /></p>}


      {stop.id === 'swarm' && <p className="marine-line">En este recorrido, el krill sirve de alimento a {list(eatersOf('krill'))}. Lo vas a ver en cada parada.</p>}

      {/* The sequence plays as soon as the stop opens (marineReducer sets `filtered`). */}
      {stop.id === 'humpback' && <div className="marine-interaction">
        <ol className="marine-steps">
          <li>Abre la boca dentro del enjambre.</li>
          <li>La garganta se estira y se llena de agua con krill.</li>
          <li>Cierra la boca y empuja el agua afuera entre las barbas: el krill queda adentro.</li>
        </ol>
        <small>Secuencia ilustrativa · el krill está dibujado mucho más grande.</small>
      </div>}

      {/* The camera follows the minke as soon as the stop opens (marineReducer sets `followed`). */}
      {stop.id === 'minke' && <div className="marine-interaction">
        <small>Recorrido ilustrativo: bajo los témpanos embiste los parches de krill; después sube a respirar por la grieta.</small>
      </div>}

      {/* The camera follows a dive as soon as the stop opens (marineReducer sets `dived`). */}
      {stop.id === 'emperor-dive' && <div className="marine-interaction">
        <p className="marine-observation">Baja desde la abertura del hielo, busca peces y krill, y vuelve a subir a respirar.</p>
        <small>Profundidad y tiempo comprimidos: no es una inmersión real.</small>
      </div>}

      {stop.id === 'leopard' && <div className="marine-interaction">
        <ul className="marine-chips" aria-label="Alimentos de la foca leopardo en el esquema">
          {foodOf('leopard').map((f) => <li key={f}>{f}</li>)}
        </ul>
        <small>En la escena: abre grande la boca para morder a los peces y la abre a medias para chupar el krill. Ilustrativo.</small>
      </div>}

      {stop.id === 'orcas' && <div className="marine-interaction">
        {state.example && <p className="marine-observation" role="status">Oeste de la Península Antártica, enero de 2009: tres grupos de orcas tipo B cazaron casi solo focas de Weddell, aunque había muchas más cangrejeras, y evitaron a las focas leopardo. La mayoría de las veces las sacaron de los témpanos con olas que formaban nadando juntas.</p>}
        <small>{state.example ? 'Ilustración del ejemplo: el grupo nada junto hacia el témpano y la ola lo barre. No se muestra la captura. Pitman y Durban (2012), consultado en su resumen.' : 'Después, un caso con lugar, fecha y tipo de orca.'}</small>
      </div>}

      {stop.id === 'web' && <FoodWebPanel selected={state.selected} onSelect={(organism) => dispatch({ type: 'select', organism })} />}

      {last && <ul className="marine-checklist" aria-label="Tu registro de la expedición">
        <li><span>{state.magnified ? '✓' : '○'}</span>{state.magnified ? 'Ampliaste el fitoplancton' : 'Aumentar el fitoplancton: opcional'}</li>
        <li><span>{state.traced.length ? '✓' : '○'}</span>{state.traced.length ? `Seguiste las conexiones de ${state.traced.length} organismo${state.traced.length > 1 ? 's' : ''}` : 'Red alimentaria: opcional'}</li>
        <li><span>✓</span>Recorriste {state.visited.length} de {MARINE_STOPS.length} paradas</li>
      </ul>}

    </div>
    <SheetActions>
      {(state.stop > 0 || below) && <button type="button" className="btn marine-prev" aria-label={below ? (atOrcas ? 'Ocultar el ejemplo' : 'Volver a la superficie') : 'Atrás'} onClick={() => dispatch({ type: below ? lookAction : 'prev' })}>{Icon.back}</button>}
      <button type="button" className="btn primary marine-next" onClick={() => last ? onLeave(true) : dispatch({ type: above ? lookAction : 'next' })}>{last ? 'Terminar expedición' : above ? lookLabel : 'Siguiente'}</button>
    </SheetActions>
  </>;

  return <SourcesContext.Provider value={{ list: SOURCES, open: openSource }}><section className={`orc marine-expedition${!desktop && sheetSize === 'tall' ? ' is-panel-expanded' : ''}${!desktop && sheetSize === 'peek' ? ' is-panel-peek' : ''}`} ref={root} aria-label="Expedición Océano">
    <div className={`marine-stage${under ? ' is-under' : ''}`}>
      {use3D
        ? <CanvasGuard onFail={() => setGraphicsLost(true)}><Suspense fallback={<div className="marine-loading" role="status">Bajando bajo el hielo…</div>}><Scene view={stop.view} state={state} reduced={reduced} shift={shift} visible={sheetOver ? 1 - SMALL_SHEET : 1} onMagnify={magnify} /></Suspense></CanvasGuard>
        : <figure className="marine-fallback">
          {stop.view === 'web' ? <WebDiagram selected={state.selected} /> : <p>{MARINE_VIEW_TEXT[stop.view]}</p>}
          <figcaption>Recorrido en texto · todas las paradas e interacciones siguen disponibles.</figcaption>
        </figure>}
    </div>
    <div className="marine-location"><PinIcon /><span>Mar de Weddell · escena ilustrativa<small>{under ? 'Bajo el hielo marino' : 'Sobre el hielo marino'}</small></span></div>
    {/* The magnifying glass hangs from an alga of the 3D scene (MarineScene); without 3D it floats over the stage. */}
    {stop.id === 'tiny' && !use3D && <MagnifyButton floating magnified={state.magnified} onToggle={magnify} />}
    {stop.id === 'tiny' && state.magnified && <div className="marine-found">Aumento esquemático<small>En la realidad no se ven a simple vista</small></div>}
    {stop.id === 'humpback' && state.filtered && <div className="marine-found">Filtra con barbas</div>}
    {stop.id === 'emperor-dive' && state.dived && <div className="marine-found">Atrapa presas de a una</div>}
    {stop.id === 'teeth' && <div className="marine-found">Filtra con dientes<small>Entra el krill · sale el agua por los costados</small></div>}
    {stop.id === 'orcas' && <div className="marine-found">{state.example ? 'Una ola hecha en grupo' : 'Una familia que caza junta'}{state.example && <small>Orcas tipo B · oeste de la Península · ilustración</small>}</div>}
    {stop.id === 'minke' && <div className="marine-found">Embestidas cortas<small>Contra los parches de krill, bajo el hielo</small></div>}
    {stop.id === 'leopard' && <div className="marine-found">Morder y chupar</div>}
    <header className="orc-top" ref={top}>
      <div className="orc-top-r1">
        <button type="button" className="pill orc-top-btn" aria-label="Volver al mapa" onClick={() => onLeave(false)}>{Icon.back}<span>Mapa</span></button>
        <div className="orc-top-title"><strong>Océano</strong><span>{MARINE_QUESTION}</span></div>
      </div>
      <nav className="orc-steps-nav" aria-label="Capítulos de Océano">
        <ol className="orc-steps">
          {MARINE_CHAPTERS.map((c, i) => {
            const current = c.id === stop.chapter;
            return <li key={c.id} className="orc-step-item">
              <button type="button" className={`orc-step-btn${current ? ' is-current' : ''}`} aria-current={current ? 'step' : undefined} aria-label={`${i + 1} ${c.label}`} onClick={() => dispatch({ type: 'chapter', chapter: c.id })}>
                <span className="orc-step-num" aria-hidden="true">{i + 1}</span><span className="orc-step-name">{c.label}</span>
              </button>
            </li>;
          })}
        </ol>
      </nav>
    </header>
    {desktop
      ? <section className="orc-panel marine-panel" ref={panel} aria-labelledby="marine-title">{content}</section>
      : <BottomSheet className="orc-panel marine-panel" labelledBy="marine-title" sheetRef={panel} floor="peek" ceiling={overflows ? 'tall' : 'small'} size={sheetSize} onSize={setSheetSize}>{content}</BottomSheet>}
    {sourcesOpen && <SourcesView list={SOURCES} highlight={highlight} place={MARINE_QUESTION}
      notice="Las escenas son ilustraciones inspiradas en mares antárticos, no el registro de un lugar. Cada estudio conserva el sitio donde se hizo."
      onClose={() => setSourcesOpen(false)} />}
  </section></SourcesContext.Provider>;
}

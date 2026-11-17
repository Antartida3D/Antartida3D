import { lazy, Suspense, useEffect, useReducer, useRef, useState } from 'react';
import {
  INITIAL_MARINE, MARINE_CHAPTERS, MARINE_ORGANISMS, MARINE_QUESTION, MARINE_STOPS, MARINE_VIEW_TEXT,
  isUnderwater, linksOf, marineReducer,
  MARINE_CITED,
} from '@antartida/core';
import { BottomSheet, type OpenSheetSize } from '../BottomSheet.tsx';
import { useIsDesktop } from '../hooks.ts';
import { CanvasGuard } from '../CanvasGuard.tsx';
import { KindChip } from '../orcadas/KindChip.tsx';
import { useSceneFrame } from '../sceneFrame.tsx';
import { Icon } from '../ui.tsx';
import { Cites } from '../sheet/Cite.tsx';
import { MoreFold } from '../sheet/MoreFold.tsx';
import { SheetActions } from '../sheet/SheetActions.tsx';
import { SheetHeader } from '../sheet/SheetHeader.tsx';
import { SourcesContext } from '../sheet/SourcesContext.ts';
import { SourcesView } from '../sheet/SourcesView.tsx';
import { FoodWebPanel, WebDiagram } from './FoodWeb.tsx';

const Scene = lazy(() => import('./MarineScene.tsx').then((m) => ({ default: m.MarineScene })));

const SOURCES = MARINE_CITED;

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
  const [reset, setReset] = useState(0);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [highlight, setHighlight] = useState<string | null>(null);
  const sourcesBtn = useRef<HTMLButtonElement>(null);
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

  useEffect(() => {
    root.current?.querySelector<HTMLElement>('#marine-title')?.focus({ preventScroll: true });
    if (scroll.current) scroll.current.scrollTop = 0;
    setSheetSize('small');
  }, [state.stop]);

  const shift = useSceneFrame(root, top, panel, desktop);
  const visitedChapters = new Set(state.visited.map((id) => MARINE_STOPS.find((s) => s.id === id)?.chapter));

  useEffect(() => {
    const el = root.current;
    const lost = () => setGraphicsLost(true);
    el?.addEventListener('webglcontextlost', lost, true);
    return () => el?.removeEventListener('webglcontextlost', lost, true);
  }, []);

  const openSource = (id: string | null) => {
    setHighlight(id);
    setSourcesOpen(true);
  };

  const toggle = (pressed: boolean, on: string, off: string, action: () => void, note?: string) => <div className="marine-interaction">
    <button className="btn marine-action" aria-pressed={pressed} onClick={action}>{pressed ? on : off}</button>
    {note && <small>{note}</small>}
  </div>;

  const content = <>
    <div className="orc-panel-scroll marine-panel-content" ref={scroll}>
      <SheetHeader
        label={<>{MARINE_CHAPTERS[chapter].label} · parada {state.stop + 1} de {MARINE_STOPS.length}</>}
        title={stop.title}
        titleId="marine-title"
        titleClass="orc-chapter-h2"
        titleFocusable
      />
      <p className="marine-eyebrow">{stop.eyebrow}</p>
      <p className="marine-line" aria-live="polite">{stop.line}<Cites ids={stop.sources} /></p>

      {(stop.id === 'ceiling' || stop.id === 'emperor-hunt') && toggle(state.under, 'Volver a la superficie', stop.id === 'ceiling' ? 'Mirar bajo el hielo' : 'Mirar bajo el agua', () => dispatch({ type: 'surface' }))}

      {stop.id === 'tiny' && toggle(state.magnified, 'Volver al tamaño real', 'Ampliar lo diminuto', () => dispatch({ type: 'magnify' }),
        'Aumento esquemático: en la realidad estas algas no se ven a simple vista.')}

      {stop.id === 'swarm' && <div className="marine-interaction">
        <button className="btn marine-action" aria-pressed={state.selected === 'krill'} onClick={() => dispatch({ type: 'select', organism: 'krill' })}>{state.selected === 'krill' ? 'Conexiones resaltadas' : 'Resaltar sus conexiones'}</button>
        {state.selected === 'krill' && <p className="marine-observation" role="status">En este recorrido, el krill sirve de alimento a {list(eatersOf('krill'))}. Lo vas a ver en cada parada.</p>}
      </div>}

      {stop.id === 'humpback' && <div className="marine-interaction">
        <button className="btn marine-action" aria-pressed={state.filtered} onClick={() => dispatch({ type: 'filter' })}>{state.filtered ? 'Mirando la filtración' : 'Ver cómo filtra'}</button>
        {state.filtered && <ol className="marine-steps" role="status">
          <li>Abre la boca dentro del enjambre.</li>
          <li>La garganta se estira y se llena de agua con krill.</li>
          <li>Cierra la boca y empuja el agua afuera entre las barbas: el krill queda adentro.</li>
        </ol>}
        <small>Secuencia ilustrativa · el krill está dibujado mucho más grande.</small>
      </div>}

      {stop.id === 'minke' && toggle(state.followed, 'Dejar de seguirla', 'Seguir a la minke', () => dispatch({ type: 'follow' }),
        'Recorrido ilustrativo: bajo los témpanos embiste los parches de krill con la boca abierta y la garganta estirada; después sube a respirar por la grieta.')}

      {stop.id === 'emperor-dive' && <div className="marine-interaction">
        <button className="btn marine-action" aria-pressed={state.dived} onClick={() => dispatch({ type: 'dive' })}>{state.dived ? 'Siguiendo la inmersión' : 'Seguir una inmersión'}</button>
        {state.dived && <p className="marine-observation" role="status">Baja desde la abertura del hielo, busca peces y krill, y vuelve a subir a respirar.</p>}
        <small>Profundidad y tiempo comprimidos: no es una inmersión real.</small>
      </div>}

      {stop.id === 'leopard' && <div className="marine-interaction">
        <ul className="marine-chips" aria-label="Alimentos de la foca leopardo en el esquema">
          {foodOf('leopard').map((f) => <li key={f}>{f}</li>)}
        </ul>
        <small>En la escena: abre grande la boca para morder a los peces y la abre a medias para chupar el krill. Ilustrativo.</small>
      </div>}

      {stop.id === 'teeth' && <div className="marine-interaction">
        <button className="btn marine-action" aria-pressed={state.compared} onClick={() => dispatch({ type: 'compare' })}>{state.compared ? 'Comparando' : 'Comparar barbas y dientes'}</button>
        {state.compared && <dl className="marine-compare" role="status">
          <div><dt>Barbas · ballenas</dt><dd>Placas con flecos que cuelgan de la mandíbula de arriba. No son dientes.</dd></div>
          <div><dt>Dientes · foca leopardo</dt><dd>Los de atrás tienen tres puntas; el agua sale por los espacios entre ellos.</dd></div>
        </dl>}
        <small>Detalles ampliados e ilustrativos.</small>
      </div>}

      {stop.id === 'orcas' && <div className="marine-interaction">
        <button className="btn marine-action" aria-pressed={state.example} onClick={() => dispatch({ type: 'example' })}>{state.example ? 'Ocultar el ejemplo' : 'Ver un ejemplo documentado'}</button>
        {state.example && <p className="marine-observation" role="status">Oeste de la Península Antártica, enero de 2009: tres grupos de orcas tipo B cazaron casi solo focas de Weddell, aunque había muchas más cangrejeras, y evitaron a las focas leopardo. La mayoría de las veces las sacaron de los témpanos con olas que formaban nadando juntas.</p>}
        <small>{state.example ? 'Ilustración del ejemplo: el grupo nada junto hacia el témpano y la ola lo barre. No se muestra la captura. Pitman y Durban (2012), consultado en su resumen.' : 'Opcional · un caso con lugar, fecha y tipo de orca.'}</small>
      </div>}

      {stop.id === 'web' && <FoodWebPanel selected={state.selected} onSelect={(organism) => dispatch({ type: 'select', organism })} />}

      {last && <ul className="marine-checklist" aria-label="Tu registro de la expedición">
        <li><span>{state.magnified ? '✓' : '○'}</span>{state.magnified ? 'Ampliaste el fitoplancton' : 'Ampliar lo diminuto: opcional'}</li>
        <li><span>{state.filtered ? '✓' : '○'}</span>{state.filtered ? 'Viste filtrar a la jorobada con sus barbas' : 'Filtración de la jorobada: opcional'}</li>
        <li><span>{state.followed ? '✓' : '○'}</span>{state.followed ? 'Seguiste a la minke entre el hielo' : 'Seguir a la minke: opcional'}</li>
        <li><span>{state.dived ? '✓' : '○'}</span>{state.dived ? 'Acompañaste una inmersión del emperador' : 'Inmersión del emperador: opcional'}</li>
        <li><span>{state.compared ? '✓' : '○'}</span>{state.compared ? 'Comparaste barbas y dientes' : 'Barbas y dientes: opcional'}</li>
        <li><span>{state.traced.length ? '✓' : '○'}</span>{state.traced.length ? `Seguiste las conexiones de ${state.traced.length} organismo${state.traced.length > 1 ? 's' : ''}` : 'Red alimentaria: opcional'}</li>
        <li><span>✓</span>Recorriste {state.visited.length} de {MARINE_STOPS.length} paradas</li>
      </ul>}

      <MoreFold key={stop.id}><p>{stop.more}</p></MoreFold>
    </div>
    <SheetActions>
      {state.stop > 0 && <button type="button" className="btn marine-prev" onClick={() => dispatch({ type: 'prev' })}>Atrás</button>}
      <button type="button" className="btn primary marine-next" onClick={() => last ? onLeave(true) : dispatch({ type: 'next' })}>{last ? 'Terminar expedición' : 'Siguiente'}</button>
    </SheetActions>
  </>;

  return <SourcesContext.Provider value={{ list: SOURCES, open: openSource }}><section className={`orc marine-expedition${!desktop && sheetSize === 'tall' ? ' is-panel-expanded' : ''}${!desktop && sheetSize === 'peek' ? ' is-panel-peek' : ''}`} ref={root} aria-label="Expedición Océano">
    <div className={`marine-stage${under ? ' is-under' : ''}`}>
      {use3D
        ? <CanvasGuard onFail={() => setGraphicsLost(true)}><Suspense fallback={<div className="marine-loading" role="status">Bajando bajo el hielo…</div>}><Scene view={stop.view} state={state} reduced={reduced} reset={reset} shift={shift} /></Suspense></CanvasGuard>
        : <figure className="marine-fallback">
          {stop.view === 'web' ? <WebDiagram selected={state.selected} /> : <p>{MARINE_VIEW_TEXT[stop.view]}</p>}
          <figcaption>Recorrido en texto · todas las paradas e interacciones siguen disponibles.</figcaption>
        </figure>}
    </div>
    <div className="marine-location"><span className="marine-location-dot" /><span>Mar de Weddell · escena ilustrativa<small>{under ? 'Bajo el hielo marino' : 'Sobre el hielo marino'}</small></span></div>
    {use3D && <button type="button" className="marine-reset" aria-label="Restablecer vista de la escena" onClick={() => setReset((v) => v + 1)}>{Icon.reset}</button>}
    <div className="orc-scene-badge marine-scene-note">
      <div className="orc-scene-badge-row"><KindChip kind="recon" label={use3D ? 'Ilustración' : 'Descripción de la escena'} /></div>
      <small>{use3D ? 'Arrastrá para mirar alrededor · tamaños y tiempos exagerados' : 'Sin gráficos 3D en este navegador'}</small>
    </div>
    {stop.id === 'tiny' && state.magnified && <div className="marine-found">Aumento esquemático<small>En la realidad no se ven a simple vista</small></div>}
    {stop.id === 'humpback' && state.filtered && <div className="marine-found">Filtra con barbas</div>}
    {stop.id === 'emperor-dive' && state.dived && <div className="marine-found">Atrapa presas de a una</div>}
    {stop.id === 'teeth' && (state.compared
      ? <div className="marine-found">Barbas · dientes<small>Ballena a la izquierda · foca leopardo a la derecha</small></div>
      : <div className="marine-found">Filtra con dientes<small>Entra el krill · sale el agua por los costados</small></div>)}
    {stop.id === 'orcas' && <div className="marine-found">{state.example ? 'Una ola hecha en grupo' : 'Una familia que caza junta'}{state.example && <small>Orcas tipo B · oeste de la Península · ilustración</small>}</div>}
    {stop.id === 'minke' && <div className="marine-found">Embestidas cortas<small>Boca abierta en el krill, bajo el hielo</small></div>}
    {stop.id === 'leopard' && <div className="marine-found">Morder y chupar</div>}
    <header className="orc-top" ref={top}>
      <div className="orc-top-r1">
        <button type="button" className="pill orc-top-btn" aria-label="Volver al mapa" onClick={() => onLeave(false)}>{Icon.back}<span>Mapa</span></button>
        <div className="orc-top-title"><strong>Océano</strong><span>{MARINE_QUESTION}</span></div>
        <button type="button" className="pill orc-top-btn" aria-haspopup="dialog" ref={sourcesBtn} onClick={() => openSource(null)}>Fuentes</button>
      </div>
      <nav className="orc-steps-nav" aria-label="Capítulos de Océano">
        <ol className="orc-steps">
          {MARINE_CHAPTERS.map((c, i) => {
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
    {desktop
      ? <section className="orc-panel marine-panel" ref={panel} aria-labelledby="marine-title">{content}</section>
      : <BottomSheet className="orc-panel marine-panel" labelledBy="marine-title" sheetRef={panel} floor="peek" size={sheetSize} onSize={setSheetSize}>{content}</BottomSheet>}
    {sourcesOpen && <SourcesView list={SOURCES} highlight={highlight} place={MARINE_QUESTION}
      notice="Las escenas son ilustraciones inspiradas en mares antárticos, no el registro de un lugar. Cada estudio conserva el sitio donde se hizo."
      onClose={() => setSourcesOpen(false)} fallbackFocus={() => sourcesBtn.current} />}
  </section></SourcesContext.Provider>;
}

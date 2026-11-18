import { lazy, Suspense, useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import {
  APPROACH_MS,
  DIVE_MS,
  FADE_MS,
  AVAILABLE_COUNT,
  EXPEDITION_POINT,
  MARAMBIO_POINT,
  ORCADAS_POINT,
  PONCHO_POINT,
  orcadasTravelMs,
  RETURN_MS,
  VOYAGE_POINT,
  returnToast,
  loadExplored,
  saveExplored,
  loadViewMode,
  saveViewMode,
  firstVisitStep,
  loadIntroSeen,
  nextExpedition,
  saveIntroSeen,
  loadLastExpedition,
  saveLastExpedition,
  isValidResume,
  map3dLoadingStore,
  initialViewMode,
  MAP_2D_ENABLED,
  PTS,
  isScenePoint,
  type ArrivalId,
  type FirstVisitEvent,
  type FirstVisitState,
  type MapPoint,
  type ResumePoint,
} from '@antartida/core';
import { Failed3DNotice } from './CanvasGuard.tsx';
import { useBackLayer, useLoadingStore, useReducedMotion, useTimers } from './hooks.ts';
import { LoadingScreen } from './loading/LoadingScreen.tsx';
import { MapView, type Layer3DProps, type Phase, type ViewMode } from './map/MapView.tsx';
import { Filters } from './ui.tsx';
import { NARROW_PX } from './voyage/useVoyage.ts';
import { scene3DFailure } from './webgl.ts';

const loadOrcadas = () => import('./orcadas/OrcadasExpedition.tsx');
const OrcadasExpedition = lazy(() => loadOrcadas().then((m) => ({ default: m.OrcadasExpedition })));

const loadMarambio = () => import('./marambio/MarambioExpedition.tsx');
const MarambioExpedition = lazy(() => loadMarambio().then((m) => ({ default: m.MarambioExpedition })));

const loadFossils = () => import('./fossils/FossilExpedition.tsx');
const FossilExpedition = lazy(() => loadFossils().then((m) => ({ default: m.FossilExpedition })));

const loadMarine = () => import('./marine/MarineExpedition.tsx');
const MarineExpedition = lazy(() => loadMarine().then((m) => ({ default: m.MarineExpedition })));
const loadThwaites = () => import('./thwaites/ThwaitesExpedition.tsx');
const ThwaitesExpedition = lazy(() => loadThwaites().then((m) => ({ default: m.ThwaitesExpedition })));
const loadVostok = () => import('./vostok/VostokExpedition.tsx');
const VostokExpedition = lazy(() => loadVostok().then((m) => ({ default: m.VostokExpedition })));

/** The screens a map point opens. Thwaites and Vostok are points of interest with a scene of their own (#280, #281), not expeditions (isScenePoint). */
const EXPEDITIONS = { orcadas: loadOrcadas, marambio: loadMarambio, fosiles: loadFossils, oceano: loadMarine, thwaites: loadThwaites, vostok: loadVostok } as const;
type ExpeditionId = keyof typeof EXPEDITIONS;
const isExpedition = (id: string): id is ExpeditionId => id in EXPEDITIONS;
/** `?expedicion=fosiles` or `?expedicion=oceano` opens that expedition directly, to share it or review it. */
const directScreen = (): 'map' | ExpeditionId => {
  if (typeof window === 'undefined') return 'map';
  const id = new URLSearchParams(window.location.search).get('expedicion');
  return id === 'fosiles' || id === 'oceano' ? id : 'map';
};

const loadMap3D = () =>
  import('./map3d/Map3DLayer.tsx').then(
    (m) => {
      map3dLoadingStore.markStepDone('chunk');
      return m;
    },
    (err: unknown) => {
      map3dLoadingStore.setError('No pudimos cargar el mapa 3D.');
      throw err;
    }
  );
const Map3DLayerLazy = lazy(() => loadMap3D().then((m) => ({ default: m.Map3DLayer })));

// Module-level so its identity is stable: an inline arrow would be a new component type on every
// render and remount the whole 3D scene (resetting the camera) when, say, the legend toggles.
function Layer3D(props: Layer3DProps) {
  return (
    <Suspense fallback={null}>
      <Map3DLayerLazy {...props} />
    </Suspense>
  );
}

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

export function AntarcticaApp() {
  const [screen, setScreen] = useState<'map' | ExpeditionId>(directScreen);
  const [phase, setPhase] = useState<Phase>('idle');
  const [arrival, setArrival] = useState<ArrivalId>('ship');
  const [explored, setExplored] = useState<string[]>([]);
  const [lastExpedition, setLastExpedition] = useState<ResumePoint | null>(null);
  const [resuming, setResuming] = useState(false);
  const [voyaging, setVoyaging] = useState(false);
  // The point whose trip is on the map: Ushuaia (the traveller picks a vehicle) or Poncho (one team, no picking).
  const [voyagePoint, setVoyagePoint] = useState<MapPoint>(VOYAGE_POINT);
  const [activePoint, setActivePoint] = useState<MapPoint>(() => PTS.find((p) => p.id === directScreen()) ?? EXPEDITION_POINT);
  // Expedition just finished: the map offers the next one in a card (#75).
  const [finished, setFinished] = useState<{ id: string; line: string } | null>(null);
  // On a phone the legend starts closed: open, it covers much of the map (#114). Also on its side, where it covers the suggested marker.
  const [legend, setLegend] = useState(() => typeof window === 'undefined' || (window.innerWidth >= NARROW_PX && window.innerHeight > 500));
  const [returned, setReturned] = useState(false);
  // null until checked: the view toggle waits for it, so it does not flash as «not available».
  const [webglSupported, setWebglSupported] = useState<boolean | null>(() =>
    MAP_2D_ENABLED || typeof window === 'undefined' ? null : hasWebGL()
  );
  // With the 2D map off (#227) the first render already picks 3D, so the 2D map never mounts behind the loader.
  const [mode, setMode] = useState<ViewMode>(() => (webglSupported ? '3d' : '2d'));
  // With the 2D map off, a 3D load error (or a lost WebGL context) switches to the 2D map on its own.
  const failed3D = useLoadingStore(map3dLoadingStore).error !== null && !MAP_2D_ENABLED;
  const can3D = webglSupported === true && !failed3D;
  // A 3D canvas that failed after the start, on the map or in an expedition: the app tells it once (#242).
  const sceneFailed = useSyncExternalStore(scene3DFailure.subscribe, scene3DFailure.getSnapshot, () => false);
  const [failNoticeClosed, setFailNoticeClosed] = useState(false);
  // First visit (#256, #258): the loading card turns into «Mapa listo» and a three-step guide follows.
  // A saved `antartida:intro` skips all of it.
  const [flow, setFlow] = useState<FirstVisitState>(() => (loadIntroSeen() ? 'done' : 'loading'));
  const [map3dLoaderDismissed, setMap3dLoaderDismissed] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [map2dReady, setMap2dReady] = useState(false);

  const reduced = useReducedMotion();
  const later = useTimers();

  useEffect(() => {
    setExplored(loadExplored());
    setLastExpedition(loadLastExpedition());
    const webgl = webglSupported ?? hasWebGL();
    setWebglSupported(webgl);

    if (webgl) {
      // Idle preload 3D layer
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(() => void loadMap3D());
      } else {
        setTimeout(() => void loadMap3D(), 1000);
      }
    }
    // Check S7: initial view (prefers-reduced-motion, Save-Data or a saved 2D only count while the 2D map is on).
    const saveData =
      (navigator as unknown as { connection?: { saveData?: boolean } }).connection?.saveData === true;
    setMode(initialViewMode({ webgl, saved: loadViewMode(), reduced, saveData }));
    setInitialized(true);
  }, [reduced]);

  useEffect(() => {
    if (failed3D) setMode('2d');
  }, [failed3D]);

  const guide = (event: FirstVisitEvent) => {
    const result = firstVisitStep(flow, event, nextExpedition(explored) !== null);
    if (result.markSeen) saveIntroSeen();
    setFlow(result.state);
  };

  const map2DReady = useCallback(() => setMap2dReady(true), []);
  const loadingDone = useCallback(() => setMap3dLoaderDismissed(true), []);

  const toggleMode = (next: ViewMode) => {
    // A transition into an expedition is tied to the view it started on.
    if (phase !== 'idle') return;
    // Without WebGL the toggle explains how to turn it on instead (ViewToggle, #123).
    if (next === '3d' && !can3D) return;
    setMode(next);
    saveViewMode(next);
    if (next === '3d' && !map3dLoadingStore.getSnapshot().ready) setMap3dLoaderDismissed(false);
  };
  const fallback2D = useCallback(() => toggleMode('2d'), [phase, can3D]);

  const enterApproach = (id: ExpeditionId) => {
    setPhase('approach');
    later(
      'enter',
      () => {
        setScreen(id);
        setPhase('idle');
      },
      APPROACH_MS
    );
  };

  const skipTravel = () => {
    // Only the way to Orcadas is a trip on the map (#135).
    if (phase !== 'travel' || !isExpedition(activePoint.id)) return;
    later('travel', () => {}, 0);
    enterApproach(activePoint.id);
  };

  /** Opens an expedition: on the 3D map (`can3D`) with its trip or camera approach, else with the dive. */
  const begin = (point: MapPoint, id: ExpeditionId, chosenArrival: ArrivalId, can3D: boolean, isResuming = false) => {
    setFinished(null);
    setActivePoint(point);
    setResuming(isResuming);
    // A scene that is not an expedition is not offered again with «Continuar».
    if (!isScenePoint(id) && (!isResuming || lastExpedition?.id !== id)) {
      const fresh: ResumePoint = { id, step: 0 };
      setLastExpedition(fresh);
      saveLastExpedition(fresh);
    }
    void EXPEDITIONS[id]();
    if (id === 'orcadas') {
      setArrival(chosenArrival);
      // Orcadas on the 3D map: animate the final Scotia Sea leg first, then zoom down to the island.
      if (can3D) {
        setPhase('travel');
        later('travel', () => enterApproach(id), orcadasTravelMs(chosenArrival));
        return;
      }
    } else if (can3D) {
      // Any other expedition: the camera zooms all the way down to the place, like the trip from Ushuaia.
      enterApproach(id);
      return;
    }
    setPhase(reduced ? 'fade' : 'dive');
    later(
      'enter',
      () => {
        setScreen(id);
        setPhase('idle');
      },
      reduced ? FADE_MS : DIVE_MS
    );
  };

  const start = (point: MapPoint, chosenArrival: ArrivalId = 'ship', isResuming = false) => {
    const id = point.id;
    if (phase !== 'idle' || !isExpedition(id)) return;
    begin(point, id, chosenArrival, !reduced && mode === '3d' && document.querySelector('.stage.m3d canvas') !== null, isResuming);
  };

  /**
   * From the Irízar in the Marambio diorama: back to the map, which shows the trip from Isla
   * Marambio to Orcadas on the ship (#135), and then the Orcadas expedition. A visit that reached
   * its last point counts as explored, without a toast that would cover the trip.
   */
  const travelFromMarambio = (done: boolean) => {
    if (done && !explored.includes(MARAMBIO_POINT.id)) {
      const ids = [...explored, MARAMBIO_POINT.id];
      setExplored(ids);
      saveExplored(ids);
    }
    setScreen('map');
    setPhase('idle');
    // The 3D map comes back with the screen, so the trip can be shown on it whenever it is the view in use.
    begin(ORCADAS_POINT, 'orcadas', 'ship', !reduced && mode === '3d' && can3D);
  };

  const recordProgress = useCallback((id: string, step: number, sub?: number, card?: number) => {
    const next: ResumePoint = { id, step, ...(sub !== undefined ? { sub } : {}), ...(card !== undefined ? { card } : {}) };
    setLastExpedition((prev) => {
      if (prev && prev.id === next.id && prev.step === next.step && prev.sub === next.sub && prev.card === next.card) return prev;
      saveLastExpedition(next);
      return next;
    });
  }, []);

  /** Marks an expedition as explored and announces it. */
  const complete = (point: { id: string; title: string }) => {
    const ids = explored.includes(point.id) ? explored : [...explored, point.id];
    setExplored(ids);
    saveExplored(ids);
    setLastExpedition(null);
    saveLastExpedition(null);
    setResuming(false);
    setFinished({ id: point.id, line: returnToast(point.title, ids.length, AVAILABLE_COUNT) });
  };

  // The trips happen on the 3D map; without WebGL they advance step by step on the 2D one.
  const startVoyage = (point: MapPoint, resumePoint?: ResumePoint) => {
    setFinished(null);
    setVoyagePoint(point);
    const isResuming = !!resumePoint && resumePoint.id === point.id;
    setResuming(isResuming);
    if (!isResuming) {
      const fresh: ResumePoint = { id: point.id, step: 0 };
      setLastExpedition(fresh);
      saveLastExpedition(fresh);
    }
    if (can3D) {
      setMode('3d');
      if (!map3dLoadingStore.getSnapshot().ready) setMap3dLoaderDismissed(false);
    }
    setVoyaging(true);
  };

  const endVoyage = (done: boolean) => {
    setVoyaging(false);
    setResuming(false);
    if (done) complete(voyagePoint);
  };

  const leave = (done: boolean) => {
    setScreen('map');
    setPhase('ret');
    setReturned(true);
    setResuming(false);
    if (done && !isScenePoint(activePoint.id)) complete(activePoint);
    else setFinished(null);
    later('ret', () => setPhase('idle'), RETURN_MS);
  };

  // Browser «back» inside an expedition returns to the map, like «Volver al mapa» (#185).
  useBackLayer(screen !== 'map', () => leave(false));

  const resume =
    lastExpedition && isValidResume(lastExpedition) && !explored.includes(lastExpedition.id)
      ? lastExpedition
      : null;
  const activeResume = resuming && lastExpedition?.id === screen ? lastExpedition : undefined;
  const activeVoyageResume =
    voyaging && resuming && lastExpedition?.id === voyagePoint.id ? lastExpedition : null;

  return (
    <div className="app">
      <Filters />
      {screen === 'map' ? (
        <>
          <MapView
            phase={phase}
            arrival={arrival}
            explored={explored}
            resume={resume}
            voyaging={voyaging}
            // Poncho has one team: his trip starts without a vehicle picker.
            voyageTransport={voyagePoint.id === PONCHO_POINT.id ? 'poncho' : undefined}
            voyageResume={activeVoyageResume}
            diveTarget={activePoint}
            finished={finished}
            onDismissFinished={() => setFinished(null)}
            onTravelIrizar={() => travelFromMarambio(false)}
            legend={legend}
            focusExpedition={returned}
            // The guide starts from the ready card, which closes the loading screen first.
            guideStep={flow}
            onGuide={guide}
            mode={mode}
            showToggle={webglSupported !== null}
            available3D={can3D}
            Layer3D={Layer3D}
            onToggleLegend={() => setLegend((l) => !l)}
            onToggleMode={toggleMode}
            onStart={start}
            onSkipTravel={skipTravel}
            onStartVoyage={startVoyage}
            onEndVoyage={endVoyage}
            onVoyageProgress={(step, sub, card) => recordProgress(voyagePoint.id, step, sub, card)}
            onMap2DReady={map2DReady}
          />
          {!map3dLoaderDismissed && (
            <LoadingScreen
              mode={mode}
              initialized={initialized}
              map2dReady={map2dReady}
              unavailable3D={!can3D}
              firstVisit={flow === 'loading' || flow === 'ready'}
              onReady={() => guide('ready')}
              onExplore={() => {
                guide('explore');
                loadingDone();
              }}
              onSkip={() => {
                guide('skip');
                loadingDone();
              }}
              onDone={loadingDone}
              onFallback2D={fallback2D}
            />
          )}
        </>
      ) : (
        <Suspense fallback={null}>
          {screen === 'marambio' ? (
            <MarambioExpedition
              reduced={reduced}
              resume={activeResume}
              onProgress={(step, sub) => recordProgress('marambio', step, sub)}
              onLeave={leave}
              onTravelToOrcadas={travelFromMarambio}
            />
          ) : screen === 'fosiles' ? (
            <FossilExpedition
              reduced={reduced}
              webgl={webglSupported === true}
              resume={activeResume}
              onProgress={(step, sub) => recordProgress('fosiles', step, sub)}
              onLeave={leave}
            />
          ) : screen === 'thwaites' ? (
            <ThwaitesExpedition reduced={reduced} onLeave={() => leave(false)} />
          ) : screen === 'vostok' ? (
            <VostokExpedition reduced={reduced} onLeave={() => leave(false)} />
          ) : screen === 'oceano' ? (
            <MarineExpedition
              reduced={reduced}
              webgl={webglSupported === true}
              resume={activeResume}
              onProgress={(step, sub) => recordProgress('oceano', step, sub)}
              onLeave={leave}
            />
          ) : (
            <OrcadasExpedition
              reduced={reduced}
              arrival={arrival}
              resume={activeResume}
              onProgress={(step, sub) => recordProgress('orcadas', step, sub)}
              onLeave={leave}
            />
          )}
        </Suspense>
      )}
      {/* On the map the notice waits for the loading screen, which tells the error itself while it is up. */}
      {(failed3D || sceneFailed) && !failNoticeClosed && (screen !== 'map' || map3dLoaderDismissed) && (
        <Failed3DNotice onClose={() => setFailNoticeClosed(true)} />
      )}
    </div>
  );
}

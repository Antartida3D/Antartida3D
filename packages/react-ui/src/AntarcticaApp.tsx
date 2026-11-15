import { lazy, Suspense, useEffect, useState } from 'react';
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
  TOAST_MS,
  loadExplored,
  saveExplored,
  loadViewMode,
  saveViewMode,
  loadWelcomeSeen,
  saveWelcomeSeen,
  showsWelcome,
  map3dLoadingStore,
  PTS,
  type ArrivalId,
  type MapPoint,
} from '@antartida/core';
import { useBackLayer, useReducedMotion, useTimers } from './hooks.ts';
import { LoadingScreen } from './loading/LoadingScreen.tsx';
import { MapView, type Layer3DProps, type Phase, type ViewMode } from './map/MapView.tsx';
import { Filters } from './ui.tsx';
import { NARROW_PX } from './voyage/useVoyage.ts';

const loadOrcadas = () => import('./orcadas/OrcadasExpedition.tsx');
const OrcadasExpedition = lazy(() => loadOrcadas().then((m) => ({ default: m.OrcadasExpedition })));

const loadMarambio = () => import('./marambio/MarambioExpedition.tsx');
const MarambioExpedition = lazy(() => loadMarambio().then((m) => ({ default: m.MarambioExpedition })));

const loadFossils = () => import('./fossils/FossilExpedition.tsx');
const FossilExpedition = lazy(() => loadFossils().then((m) => ({ default: m.FossilExpedition })));

/** Expeditions with a screen of their own, by the id of their point on the map. */
const EXPEDITIONS = { orcadas: loadOrcadas, marambio: loadMarambio, fosiles: loadFossils } as const;
type ExpeditionId = keyof typeof EXPEDITIONS;
const isExpedition = (id: string): id is ExpeditionId => id in EXPEDITIONS;
/** `?expedicion=fosiles` opens Fósiles directly, to share it or review it. */
const directScreen = (): 'map' | ExpeditionId => {
  if (typeof window === 'undefined') return 'map';
  const id = new URLSearchParams(window.location.search).get('expedicion');
  return id === 'fosiles' ? id : 'map';
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
  const [voyaging, setVoyaging] = useState(false);
  // The point whose trip is on the map: Ushuaia (the traveller picks a vehicle) or Poncho (one team, no picking).
  const [voyagePoint, setVoyagePoint] = useState<MapPoint>(VOYAGE_POINT);
  const [activePoint, setActivePoint] = useState<MapPoint>(() => PTS.find((p) => p.id === directScreen()) ?? EXPEDITION_POINT);
  const [toast, setToast] = useState('');
  // On a phone the legend starts closed: open, it covers much of the map (#114).
  const [legend, setLegend] = useState(() => typeof window === 'undefined' || window.innerWidth >= NARROW_PX);
  const [returned, setReturned] = useState(false);
  const [mode, setMode] = useState<ViewMode>('2d');
  // null until checked: the view toggle waits for it, so it does not flash as «not available».
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null);
  // First visit: the map comes close to «Desde Ushuaia» (#115). True until MapView has shown it.
  const [welcome, setWelcome] = useState(false);
  const [map3dLoaderDismissed, setMap3dLoaderDismissed] = useState(false);

  const reduced = useReducedMotion();
  const later = useTimers();

  useEffect(() => {
    setExplored(loadExplored());
    const webgl = hasWebGL();
    setWebglSupported(webgl);

    if (webgl) {
      // Idle preload 3D layer
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(() => void loadMap3D());
      } else {
        setTimeout(() => void loadMap3D(), 1000);
      }

      // Check S7: initial view
      // If prefers-reduced-motion, Save-Data or previous choice of 2D -> starts in 2D
      const saved = loadViewMode();
      const saveData =
        (navigator as unknown as { connection?: { saveData?: boolean } }).connection?.saveData;

      if (saved) {
        setMode(saved);
      } else if (reduced || saveData) {
        setMode('2d');
      } else {
        setMode('3d');
      }
    } else {
      setMode('2d');
    }
  }, [reduced]);

  // Decided once, in the same render as the starting view above, so MapView zooms in the right mode.
  useEffect(() => {
    setWelcome(showsWelcome(loadWelcomeSeen(), loadExplored()));
  }, []);

  const welcomeShown = () => {
    saveWelcomeSeen();
    setWelcome(false);
  };

  const toggleMode = (next: ViewMode) => {
    // A transition into an expedition is tied to the view it started on.
    if (phase !== 'idle') return;
    // Without WebGL the toggle explains how to turn it on instead (ViewToggle, #123).
    if (next === '3d' && !webglSupported) return;
    setMode(next);
    saveViewMode(next);
  };

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
  const begin = (point: MapPoint, id: ExpeditionId, chosenArrival: ArrivalId, can3D: boolean) => {
    setToast('');
    setActivePoint(point);
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

  const start = (point: MapPoint, chosenArrival: ArrivalId = 'ship') => {
    const id = point.id;
    if (phase !== 'idle' || !isExpedition(id)) return;
    begin(point, id, chosenArrival, !reduced && mode === '3d' && document.querySelector('.stage.m3d canvas') !== null);
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
    begin(ORCADAS_POINT, 'orcadas', 'ship', !reduced && mode === '3d' && webglSupported === true);
  };

  /** Marks an expedition as explored and announces it. */
  const complete = (point: { id: string; title: string }) => {
    const ids = explored.includes(point.id) ? explored : [...explored, point.id];
    setExplored(ids);
    saveExplored(ids);
    setToast(returnToast(point.title, ids.length, AVAILABLE_COUNT));
    later('toast', () => setToast(''), TOAST_MS);
  };

  // The trips happen on the 3D map; without WebGL they advance step by step on the 2D one.
  const startVoyage = (point: MapPoint) => {
    setToast('');
    setVoyagePoint(point);
    if (webglSupported) setMode('3d');
    setVoyaging(true);
  };

  const endVoyage = (done: boolean) => {
    setVoyaging(false);
    if (done) complete(voyagePoint);
  };

  const leave = (done: boolean) => {
    setScreen('map');
    setPhase('ret');
    setReturned(true);
    if (done) complete(activePoint);
    else setToast('');
    later('ret', () => setPhase('idle'), RETURN_MS);
  };

  // Browser «back» inside an expedition returns to the map, like «Volver al mapa» (#185).
  useBackLayer(screen !== 'map', () => leave(false));

  return (
    <div className="app">
      <Filters />
      {screen === 'map' ? (
        <>
          <MapView
            phase={phase}
            arrival={arrival}
            explored={explored}
            voyaging={voyaging}
            // Poncho has one team: his trip starts without a vehicle picker.
            voyageTransport={voyagePoint.id === PONCHO_POINT.id ? 'poncho' : undefined}
            diveTarget={activePoint}
            toast={toast}
            legend={legend}
            focusExpedition={returned}
            welcome={welcome}
            onWelcomeShown={welcomeShown}
            mode={mode}
            showToggle={webglSupported !== null}
            available3D={webglSupported === true}
            Layer3D={Layer3D}
            onToggleLegend={() => setLegend((l) => !l)}
            onToggleMode={toggleMode}
            onStart={start}
            onSkipTravel={skipTravel}
            onStartVoyage={startVoyage}
            onEndVoyage={endVoyage}
          />
          {mode === '3d' && !map3dLoaderDismissed && (
            <LoadingScreen
              onDone={() => setMap3dLoaderDismissed(true)}
              onFallback2D={() => toggleMode('2d')}
            />
          )}
        </>
      ) : (
        <Suspense fallback={null}>
          {screen === 'marambio' ? (
            <MarambioExpedition reduced={reduced} onLeave={leave} onTravelToOrcadas={travelFromMarambio} />
          ) : screen === 'fosiles' ? (
            <FossilExpedition reduced={reduced} webgl={webglSupported === true} onLeave={leave} />
          ) : (
            <OrcadasExpedition reduced={reduced} arrival={arrival} onLeave={leave} />
          )}
        </Suspense>
      )}
    </div>
  );
}

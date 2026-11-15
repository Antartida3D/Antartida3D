import { lazy, Suspense, useEffect, useState } from 'react';
import {
  APPROACH_MS,
  DIVE_MS,
  FADE_MS,
  AVAILABLE_COUNT,
  EXPEDITION_POINT,
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
  type ArrivalId,
  type MapPoint,
} from '@antartida/core';
import { useReducedMotion, useTimers } from './hooks.ts';
import { MapView, type Layer3DProps, type Phase, type ViewMode } from './map/MapView.tsx';
import { Filters } from './ui.tsx';
import { NARROW_PX } from './voyage/useVoyage.ts';

const loadOrcadas = () => import('./orcadas/OrcadasExpedition.tsx');
const OrcadasExpedition = lazy(() => loadOrcadas().then((m) => ({ default: m.OrcadasExpedition })));

const loadMap3D = () => import('./map3d/Map3DLayer.tsx');
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
  const [screen, setScreen] = useState<'map' | 'orcadas'>('map');
  const [phase, setPhase] = useState<Phase>('idle');
  const [arrival, setArrival] = useState<ArrivalId>('ship');
  const [explored, setExplored] = useState<string[]>([]);
  const [voyaging, setVoyaging] = useState(false);
  // The point whose trip is on the map: Ushuaia (the traveller picks a vehicle) or Poncho (one team, no picking).
  const [voyagePoint, setVoyagePoint] = useState<MapPoint>(VOYAGE_POINT);
  const [activePoint, setActivePoint] = useState<MapPoint>(EXPEDITION_POINT);
  const [toast, setToast] = useState('');
  // On a phone the legend starts closed: open, it covers much of the map (#114).
  const [legend, setLegend] = useState(() => typeof window === 'undefined' || window.innerWidth >= NARROW_PX);
  const [returned, setReturned] = useState(false);
  const [mode, setMode] = useState<ViewMode>('2d');
  // null until checked: the view toggle waits for it, so it does not flash as «not available».
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null);
  // First visit: the map comes close to «Desde Ushuaia» (#115). True until MapView has shown it.
  const [welcome, setWelcome] = useState(false);

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

  const enterApproach = () => {
    setPhase('approach');
    later(
      'enter',
      () => {
        setScreen('orcadas');
        setPhase('idle');
      },
      APPROACH_MS
    );
  };

  const skipTravel = () => {
    if (phase !== 'travel') return;
    later('travel', () => {}, 0);
    enterApproach();
  };

  const start = (point: MapPoint, chosenArrival: ArrivalId = 'ship') => {
    if (phase !== 'idle' || point.id !== 'orcadas') return;
    setArrival(chosenArrival);
    setToast('');
    setActivePoint(point);
    void loadOrcadas();
    // Orcadas on the 3D map: animate the final Scotia Sea leg first, then zoom down to the island.
    const can3D = !reduced && mode === '3d' && document.querySelector('.stage.m3d canvas') !== null;
    if (can3D) {
      setPhase('travel');
      later('travel', enterApproach, orcadasTravelMs(chosenArrival));
      return;
    }
    setPhase(reduced ? 'fade' : 'dive');
    later(
      'enter',
      () => {
        setScreen('orcadas');
        setPhase('idle');
      },
      reduced ? FADE_MS : DIVE_MS
    );
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

  return (
    <div className="app">
      <Filters />
      {screen === 'map' ? (
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
      ) : (
        <Suspense fallback={null}>
          <OrcadasExpedition reduced={reduced} arrival={arrival} onLeave={leave} />
        </Suspense>
      )}
    </div>
  );
}

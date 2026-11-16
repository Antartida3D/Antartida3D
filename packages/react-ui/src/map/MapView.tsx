import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import {
  DOUBLE_TAP_ZOOM, DRAG_THRESHOLD, EXPEDITION_POINT, HOME, KEY_PAN, MIN_K, ONE_FINGER_IDLE, PONCHO_POINT, PONCHO_TRANSPORT, PTS, TRANSPORTS, VOYAGE_POINT, VOYAGE_POINTS, ZOOM_MS,
  afterExpedition, buildMarkers, diveView, focusWorld, freeArea, needsFraming, markerPress, geometry, isWheelNotch, keyView, nextExpedition, oneFingerDown, oneFingerMove, oneFingerUp, panBy, resumeDetail, welcomeView, wheelFactor, zoomAround, zoomCenter,
  type ArrivalId, type MapPoint, type Marker, type OneFingerZoomState, type ResumePoint, type SeaPoint, type Size, type TransportId, type View, type ClaimsCoverage,
} from '@antartida/core';
import { useBackLayer, usePageSettled, useReducedMotion, useTimers } from '../hooks.ts';
import { useVoyage, type VoyageBus } from '../voyage/useVoyage.ts';
import { Icon } from '../ui.tsx';
import { CompassRose } from '../Cartography.tsx';
import { ExplorationLog } from './ExplorationLog.tsx';
import { Legend } from './Legend.tsx';
import { ClaimsControl, ClaimsDetails, type ClaimsSelection, type ClaimsStatus } from './ClaimsControl.tsx';
import { ListView } from './ListView.tsx';
import { NextCard } from './NextCard.tsx';
import { PointSheet } from './PointSheet.tsx';
import { KindChip } from '../orcadas/KindChip.tsx';
import { OrcadasIntro } from '../orcadas/OrcadasIntro.tsx';
import { ViewToggle } from './ViewToggle.tsx';
import { Map2DLayer, type LayerProps } from './Map2DLayer.tsx';
import { ctrlZoomWheelDelta, dispatchWheelAtCenter } from '../keyboardWheel.ts';

const VoyagePanel = lazy(() => import('../voyage/VoyagePanel.tsx').then((m) => ({ default: m.VoyagePanel })));

/** `travel`: final approach leg on the 3D map before `approach`; `approach`: camera zooms down to the point. */
export type Phase = 'idle' | 'travel' | 'dive' | 'approach' | 'fade' | 'ret';
export type Anim = '' | 'zoom' | 'wheel' | 'dive';
export type ViewMode = '2d' | '3d';

const WHEEL_MS = 200;
/** The territorial claims open from this point's sheet: the claimed sectors meet at the pole. */
const CLAIMS_POINT_ID = 'polo';

/**
 * A request from the shared controls (buttons, keys, cluster clicks) to the 3D camera. In 3D the
 * orbit camera owns zoom and pan, so the controls ask it to move instead of rewriting `view`.
 */
export type Camera3DCommand =
  | { type: 'zoom'; factor: number }
  | { type: 'home' }
  | { type: 'focus'; view: View }
  /** Fly down to the model of a point, this close (world units): MapPoint.closeUp. */
  | { type: 'visit'; id: string; distance: number }
  | { type: 'pan'; dx: number; dy: number }
  | { type: 'rotate'; deg: number };

export type Layer3DProps = LayerProps & {
  size: Size;
  diveTarget: MapPoint;
  arrival?: ArrivalId;
  /** `n` grows with every request so repeating the same command still fires. */
  command: { n: number; cmd: Camera3DCommand } | null;
  /** The camera came to rest: the 2D-style view it shows, for clustering and the 2D switch. */
  onCameraRest: (view: View) => void;
  /** The trip from Ushuaia while it is under way: the scene draws the vehicle and follows it. */
  voyage: VoyageBus | null;
  /** The trip opens on the vehicle picker (Ushuaia): the camera goes to the departure before one is picked (#190). */
  voyagePicker: boolean;
  claims: { selection: ClaimsSelection; coverage: ClaimsCoverage } | null;
  onClaimsStatus: (status: ClaimsStatus) => void;
};

export interface MapViewProps {
  phase: Phase;
  explored: readonly string[];
  /** Unfinished expedition offered to resume from the map (#186). */
  resume?: ResumePoint | null;
  /** Chosen Orcadas arrival transport for the 3D travel phase. */
  arrival?: ArrivalId;
  /** The trip from Ushuaia is open: its panel replaces the map's own controls. */
  voyaging?: boolean;
  diveTarget?: MapPoint;
  /** Expedition just finished: the card offers the next one (#75). Null: no card. */
  finished?: { id: string; line: string } | null;
  onDismissFinished?: () => void;
  /** The card's «Viajar a Orcadas en el Irízar»: the trip from Marambio on the ship. */
  onTravelIrizar?: () => void;
  legend: boolean;
  /** Move focus to the expedition marker on mount (coming back from the expedition). */
  focusExpedition: boolean;
  /** First visit (#115): come close to «Desde Ushuaia», show its label and say to start there. */
  welcome?: boolean;
  /** The welcome is on screen: it must not show again. */
  onWelcomeShown?: () => void;
  mode?: ViewMode;
  showToggle?: boolean;
  /** False without WebGL: «Relieve 3D» explains how to turn it on (#123). */
  available3D?: boolean;
  Layer3D?: (props: Layer3DProps) => React.ReactNode;
  onToggleLegend: () => void;
  onToggleMode?: (next: ViewMode) => void;
  onStart: (point: MapPoint, arrival?: ArrivalId, resuming?: boolean) => void;
  onSkipTravel?: () => void;
  /** Transport the trip starts with when it is not picked (Poncho's team); undefined: the traveller picks. */
  voyageTransport?: TransportId;
  /** Unfinished voyage step to resume directly without the picker (#186). */
  voyageResume?: ResumePoint | null;
  onStartVoyage?: (point: MapPoint, resume?: ResumePoint) => void;
  onEndVoyage?: (done: boolean) => void;
  onVoyageProgress?: (step: number, sub: number) => void;
  /** The 2D base image and optional ink layer reached a usable state. */
  onMap2DReady?: () => void;
}

/** Keyboard navigation of the 3D camera: same keys as 2D, plus Q and E to turn. */
function keyCommand3D(key: string): Camera3DCommand | null {
  if (key === 'ArrowLeft') return { type: 'pan', dx: KEY_PAN, dy: 0 };
  if (key === 'ArrowRight') return { type: 'pan', dx: -KEY_PAN, dy: 0 };
  if (key === 'ArrowUp') return { type: 'pan', dx: 0, dy: KEY_PAN };
  if (key === 'ArrowDown') return { type: 'pan', dx: 0, dy: -KEY_PAN };
  if (key === '+' || key === '=') return { type: 'zoom', factor: 1.5 };
  if (key === '-' || key === '_') return { type: 'zoom', factor: 1 / 1.5 };
  if (key === 'q' || key === 'Q') return { type: 'rotate', deg: 15 };
  if (key === 'e' || key === 'E') return { type: 'rotate', deg: -15 };
  return null;
}

/** Overlay shown during the 3D travel leg to Laurie Island, allowing keyboard/pointer skip. */
function OrcadasTravelBar({ arrival, onSkip }: { arrival: ArrivalId; onSkip?: () => void }) {
  const skipRef = useRef<HTMLButtonElement>(null);
  const onSkipRef = useRef(onSkip);
  onSkipRef.current = onSkip;
  useEffect(() => {
    skipRef.current?.focus();
    const onEscape = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onSkipRef.current?.();
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, []);
  return (
    <div className="vbar" role="group" aria-label="Viaje hacia Isla Laurie">
      <p className="vnext">
        <strong>{arrival === 'helicopter' ? 'Rumbo a Isla Laurie · Helicóptero' : 'Rumbo a Isla Laurie · Irízar y Zodiac'}</strong>
      </p>
      <p className="orc-intro-recon">
        <KindChip kind="recon" label="Reconstrucción ilustrada" />
        <span className="vsmall">Tramo ilustrativo desde Isla Marambio hasta Isla Laurie; el vehículo está agrandado para que se vea.</span>
      </p>
      <div className="row end">
        <button ref={skipRef} type="button" className="btn primary" onClick={() => onSkipRef.current?.()}>
          Saltar viaje
        </button>
      </div>
    </div>
  );
}

export function MapView({
  phase,
  explored,
  arrival = 'ship',
  voyaging = false,
  diveTarget = EXPEDITION_POINT,
  finished = null,
  onDismissFinished,
  onTravelIrizar,
  legend,
  focusExpedition,
  welcome = false,
  onWelcomeShown,
  mode = '2d',
  resume = null,
  showToggle = false,
  available3D = true,
  Layer3D,
  onToggleLegend,
  onToggleMode,
  onStart,
  onSkipTravel,
  voyageTransport,
  voyageResume = null,
  onStartVoyage,
  onEndVoyage,
  onVoyageProgress,
  onMap2DReady,
}: MapViewProps) {
  const vpRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Marker[]>([]);
  const [size, setSize] = useState<Size>({ vw: 390, vh: 844 });
  const [view, setView] = useState<View>(HOME);
  const [anim, setAnim] = useState<Anim>('');
  const [touched, setTouched] = useState(false);
  const [sheet, setSheet] = useState<MapPoint | SeaPoint | null>(null);
  const [pendingOrcadas, setPendingOrcadas] = useState<MapPoint | null>(null);
  // Key of the marker whose label a first touch brought into view.
  const [shown, setShown] = useState<string | null>(null);
  const [list, setList] = useState(false);
  // Points of a group that zooming no longer separates, while the visitor picks one of them.
  const [picking, setPicking] = useState<readonly MapPoint[] | null>(null);
  const [claimsEnabled, setClaimsEnabled] = useState(false);
  const [claimsSelection, setClaimsSelection] = useState<ClaimsSelection>('all');
  const [claimsCoverage, setClaimsCoverage] = useState<ClaimsCoverage>('sectors');
  const [claimsStatus, setClaimsStatus] = useState<ClaimsStatus>('loading');
  const claimsSwitch = useRef<HTMLButtonElement>(null);
  // The claims details sheet: open when the layer turns on, hidden and shown with its button.
  const [claimsDetails, setClaimsDetails] = useState(true);
  const claimsDetailsButton = useRef<HTMLButtonElement>(null);
  const closeClaimsDetails = () => {
    setClaimsDetails(false);
    claimsDetailsButton.current?.focus();
  };
  const later = useTimers();
  const reduced = useReducedMotion();
  const voyage = useVoyage();
  const resumeTransport = (r: ResumePoint): TransportId | undefined =>
    r.id === PONCHO_POINT.id ? PONCHO_TRANSPORT.id : TRANSPORTS[r.sub ?? -1]?.id;

  useEffect(() => {
    if (!voyaging) {
      voyage.reset();
      return;
    }
    if (!voyage.bus.state && voyageResume && voyageResume.step >= 1) {
      const transport = resumeTransport(voyageResume);
      if (transport) voyage.start(transport, voyageResume.step);
    }
  }, [voyaging, voyageResume]);

  const onVoyageProgressRef = useRef(onVoyageProgress);
  onVoyageProgressRef.current = onVoyageProgress;
  useEffect(() => {
    if (!voyaging || !voyage.state) return;
    const { transport, reached } = voyage.state;
    const sub = transport === PONCHO_TRANSPORT.id ? 0 : TRANSPORTS.findIndex((t) => t.id === transport);
    if (sub >= 0) onVoyageProgressRef.current?.(reached, sub);
  }, [voyaging, voyage.state]);

  const is3D = mode === '3d' && !!Layer3D;
  // The card shows once the map is back and still (S9), one layer at a time.
  const showCard = !!finished && phase === 'idle' && !voyaging;
  const dismissCard = () => {
    onDismissFinished?.();
    vpRef.current?.focus();
  };
  const [command, setCommand] = useState<Layer3DProps['command']>(null);
  const live = useRef({ size, view, phase, is3D });
  live.current = { size, view, phase, is3D };

  // Browser «back» closes the top layer instead of leaving the app (#185).
  useBackLayer(list, () => setList(false));
  useBackLayer(!!picking, () => setPicking(null));
  useBackLayer(!!sheet, () => setSheet(null));
  useBackLayer(!!pendingOrcadas && phase === 'idle', () => setPendingOrcadas(null));
  useBackLayer(voyaging, () => onEndVoyage?.(false));
  useBackLayer(showCard, dismissCard);
  useBackLayer(is3D && claimsEnabled && claimsDetails && !sheet, closeClaimsDetails);

  /** Moves the 3D camera; `send3D` when the user asked for it. */
  const queue3D = (cmd: Camera3DCommand) => setCommand((c) => ({ n: (c?.n ?? 0) + 1, cmd }));
  const send3D = (cmd: Camera3DCommand) => {
    queue3D(cmd);
    setTouched(true);
  };

  useEffect(() => {
    if (is3D) return;
    // A pending camera command must not replay when the 3D scene mounts again later.
    setCommand(null);
    // The 3D camera can zoom out past the overview (k < 1); the 2D map cannot.
    setView((v) => (v.k < MIN_K ? HOME : v));
  }, [is3D]);
  const ptrs = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{
    dragged: boolean;
    pan: null | { x: number; y: number; px: number; py: number };
    pinch: null | (View & { d: number });
    /** One finger (#165): the taps so far, and on the 2D map the view when the second touch of a double tap landed. */
    taps: OneFingerZoomState;
    second: View | null;
  }>({ dragged: false, pan: null, pinch: null, taps: ONE_FINGER_IDLE, second: null });

  useLayoutEffect(() => {
    const el = vpRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0) setSize((s) => (Math.abs(r.width - s.vw) > 1 || Math.abs(r.height - s.vh) > 1 ? { vw: r.width, vh: r.height } : s));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Title of the expedition the user came back from: only read when the map mounts again.
  const returnTitle = useRef(diveTarget.title);
  useEffect(() => {
    // The card takes focus itself: two automatic focuses would fight.
    if (!focusExpedition || finished) return;
    // Back from an expedition: focus its own marker, or the group that holds it.
    // The 3D markers appear once the layer has loaded, so look for them over a few frames.
    let id = 0;
    let tries = 0;
    const title = returnTitle.current;
    const focus = () => {
      const markers = Array.from(vpRef.current?.querySelectorAll<HTMLElement>('.mk') ?? []);
      const el = markers.find((m) => m.getAttribute('aria-label')?.includes(title)) ?? vpRef.current?.querySelector<HTMLElement>('.mk.ta, .mk.has-a');
      if (el) el.focus();
      else if (++tries < 120) id = requestAnimationFrame(focus);
    };
    focus();
    return () => cancelAnimationFrame(id);
  }, [focusExpedition]);

  // The card must not cover the suggested marker: if it ends up under the card or off screen, the
  // map moves it into the free area beside the card. Only pans (same zoom), at once with reduced motion.
  useEffect(() => {
    if (!showCard) return;
    let id = 0;
    let tries = 0;
    const frame = () => {
      const vp = vpRef.current;
      const card = vp?.parentElement?.querySelector<HTMLElement>('.next-sheet');
      const mk = vp?.querySelector<HTMLElement>('.mk.next, .mk.has-next');
      if (!vp || !card || !mk) {
        if (++tries < 60) id = requestAnimationFrame(frame);
        return;
      }
      const v = vp.getBoundingClientRect();
      const c = card.getBoundingClientRect();
      const m = mk.getBoundingClientRect();
      const free = freeArea(live.current.size, { left: c.left - v.left, top: c.top - v.top, right: c.right - v.left, bottom: c.bottom - v.top });
      // On wide screens the legend and buttons sit at the left edge: the free area starts after them.
      const lc = vp.parentElement?.querySelector<HTMLElement>('.leftcol')?.getBoundingClientRect();
      if (lc && free.bottom === live.current.size.vh && free.right < live.current.size.vw) free.left = Math.min(Math.max(free.left, lc.right - v.left), free.right - 96);
      const at = { left: m.left + m.width / 2 - v.left, top: m.top + m.height / 2 - v.top };
      if (!needsFraming(at, free)) return;
      const marker = markersRef.current.find((k) => (k.kind === 'point' && k.next) || (k.kind === 'cluster' && k.hasNext));
      if (!marker) return;
      const sz = live.current.size;
      const next = focusWorld(sz, marker.x, marker.y, live.current.view.k, ((free.top + free.bottom) / 2) / sz.vh, ((free.left + free.right) / 2) / sz.vw);
      if (live.current.is3D) queue3D({ type: 'focus', view: next });
      else if (reduced) { setView(next); setAnim(''); }
      else glide(next);
    };
    id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, [showCard]);

  // A sheet, the list or the Orcadas intro replaces the card.
  useEffect(() => {
    if (finished && (sheet || list || picking || pendingOrcadas)) onDismissFinished?.();
  }, [finished, sheet, list, picking, pendingOrcadas]);

  useEffect(() => {
    if (phase !== 'dive' && phase !== 'fade') return;
    setSheet(null);
    setList(false);
    if (phase === 'fade') return;
    setAnim('dive');
    setView(diveView(live.current.size, diveTarget.x, diveTarget.y));
  }, [phase, diveTarget]);

  /** Eases the 2D map to `next`; `animateTo` when the user asked for it. */
  const glide = (next: View) => {
    setView(next);
    setAnim('zoom');
    later('zoom', () => setAnim(''), ZOOM_MS);
  };
  const animateTo = (next: View) => {
    glide(next);
    setTouched(true);
  };

  // First visit (#115): once the page has loaded and stopped stuttering, the map comes close to
  // «Desde Ushuaia», its label opens (one more touch starts the trip) and the hint says to start
  // there. The move is not the user's, so it does not count as `touched`; anything the user does
  // afterwards ends the welcome. Someone who already moved the map while it loaded gets no welcome.
  const [welcoming, setWelcoming] = useState(false);
  const settled = usePageSettled(welcome);
  const welcomeMove = () => {
    const next = welcomeView(live.current.size);
    if (live.current.is3D) queue3D({ type: 'focus', view: next });
    else glide(next);
  };
  useEffect(() => {
    if (!welcome || !settled) return;
    if (touched || phase !== 'idle' || voyaging) return void onWelcomeShown?.();
    welcomeMove();
    setShown(VOYAGE_POINT.id);
    setWelcoming(true);
    onWelcomeShown?.();
  }, [welcome, settled]);
  // The map can still switch between 3D and 2D during the welcome: the starting view changes once
  // reduced motion is read (useReducedMotion), and the user may switch it. Stay close to Ushuaia.
  useEffect(() => {
    if (welcoming) welcomeMove();
  }, [is3D]);
  useEffect(() => {
    if (touched || voyaging || phase !== 'idle') setWelcoming(false);
  }, [touched, voyaging, phase]);

  const rel = (e: { clientX: number; clientY: number }) => {
    const r = vpRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onDown = (e: PointerEvent) => {
    const onMarker = !!(e.target as Element).closest?.('.mk');
    // A press anywhere else puts the label away.
    if (!onMarker) setShown(null);
    if (phase !== 'idle') return;
    const p = rel(e);
    const g = gesture.current;
    ptrs.current.set(e.pointerId, p);
    if (ptrs.current.size === 1) {
      g.dragged = false;
      g.pan = { ...p, px: view.px, py: view.py };
      // One finger also zooms (#165), off the markers: their own first and second touch show and
      // open them (#54). In 3D the camera zooms itself (useMapGestures); the taps are followed
      // here too, with the same rule, only to keep the second one off the markers.
      g.taps = !onMarker && e.pointerType === 'touch' ? oneFingerDown(g.taps, { ...p, t: e.timeStamp }) : ONE_FINGER_IDLE;
      if (g.taps.down?.second) {
        // The browser can send the tap to a marker close by (touch adjustment): it is a zoom, the
        // marker must not take it (onPick skips a drag).
        g.dragged = true;
        // On the 2D map the second touch of a double tap zooms instead of panning.
        if (!is3D) {
          g.second = view;
          g.pan = null;
        }
      }
    } else if (ptrs.current.size === 2) {
      const [a, b] = [...ptrs.current.values()];
      g.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), ...view };
      g.dragged = true;
      g.taps = ONE_FINGER_IDLE;
      g.second = null;
    }
  };

  const onMove = (e: PointerEvent) => {
    if (!ptrs.current.has(e.pointerId)) return;
    const p = rel(e);
    const g = gesture.current;
    const { size: sz, view: v } = live.current;
    ptrs.current.set(e.pointerId, p);
    if (is3D) {
      // The orbit camera handles drag and pinch itself; only track the drag so a marker under
      // the pointer is not opened at the end of it.
      if (g.pan && !g.dragged && Math.hypot(p.x - g.pan.x, p.y - g.pan.y) > DRAG_THRESHOLD) {
        g.dragged = true;
        setTouched(true);
      }
      return;
    }
    if (ptrs.current.size === 1 && g.taps.down) {
      const step = oneFingerMove(g.taps, p);
      g.taps = step.state;
      if (g.second) {
        // Up zooms in and down zooms out, around where the second touch landed.
        if (step.zoom !== 1) {
          setView(zoomAround(sz, g.second, step.state.down!.x, step.state.down!.y, g.second.k * step.zoom));
          setAnim('');
          setTouched(true);
          g.dragged = true;
        }
        return;
      }
    }
    if (ptrs.current.size >= 2 && g.pinch) {
      const [a, b] = [...ptrs.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      setView(zoomAround(sz, g.pinch, (a.x + b.x) / 2, (a.y + b.y) / 2, g.pinch.k * (d / Math.max(1, g.pinch.d))));
      setAnim('');
      setTouched(true);
      return;
    }
    if (!g.pan) return;
    const dx = p.x - g.pan.x, dy = p.y - g.pan.y;
    if (!g.dragged && Math.hypot(dx, dy) > DRAG_THRESHOLD) g.dragged = true;
    if (g.dragged) {
      setView(panBy(sz, { k: v.k, px: g.pan.px, py: g.pan.py }, dx, dy));
      setAnim('');
      setTouched(true);
    }
  };

  const onUp = (e: PointerEvent) => {
    const g = gesture.current;
    const lone = ptrs.current.size === 1;
    if (!ptrs.current.delete(e.pointerId)) return;
    if (ptrs.current.size < 2) g.pinch = null;
    if (ptrs.current.size === 1) {
      const [p] = [...ptrs.current.values()];
      g.pan = { ...p, px: live.current.view.px, py: live.current.view.py };
    }
    if (ptrs.current.size === 0) g.pan = null;
    if (!lone) return;
    const at = g.taps.down;
    const second = g.second;
    g.second = null;
    if (e.type !== 'pointerup') {
      g.taps = ONE_FINGER_IDLE;
      return;
    }
    const up = oneFingerUp(g.taps, { ...rel(e), t: e.timeStamp });
    g.taps = up.state;
    // A double tap: one step closer around the tapped point, at once with reduced motion.
    if (up.doubleTap && at && second && phase === 'idle' && !is3D) {
      const { size: sz, view: v } = live.current;
      const next = zoomAround(sz, v, at.x, at.y, v.k * DOUBLE_TAP_ZOOM);
      if (reduced) {
        setView(next);
        setAnim('');
        setTouched(true);
      } else animateTo(next);
    }
  };

  // Native non-passive listener: preventDefault keeps trackpad pinch (ctrl+wheel) from zooming the whole page.
  useEffect(() => {
    const el = vpRef.current;
    if (!el) return;
    const onWheel = (e: globalThis.WheelEvent) => {
      e.preventDefault();
      const { size: sz, view: v, phase: ph, is3D: in3D } = live.current;
      if (ph !== 'idle') return;
      if (in3D) {
        setTouched(true); // the orbit camera zooms on the wheel itself
        return;
      }
      const p = rel(e);
      // Compound from the latest target so quick notches add up instead of restarting.
      const next = zoomAround(sz, v, p.x, p.y, v.k * wheelFactor(e.deltaY, e.deltaMode));
      live.current.view = next;
      setView(next);
      setTouched(true);
      if (isWheelNotch(e.deltaY, e.deltaMode)) {
        setAnim('wheel');
        later('wheel', () => setAnim(''), WHEEL_MS);
      } else setAnim('');
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const onKey = (e: KeyboardEvent) => {
    if (e.target !== vpRef.current) return;
    const deltaY = ctrlZoomWheelDelta(e.nativeEvent);
    if (deltaY !== null) {
      e.preventDefault();
      dispatchWheelAtCenter(vpRef.current, deltaY);
      return;
    }
    if (e.metaKey || e.altKey || e.ctrlKey) return;
    if (is3D) {
      const cmd = keyCommand3D(e.key);
      if (cmd) {
        e.preventDefault();
        send3D(cmd);
      }
      return;
    }
    const next = keyView(size, view, e.key);
    if (next) {
      e.preventDefault();
      animateTo(next);
    }
  };

  const openPoint = (p: MapPoint | SeaPoint) => {
    if (onStartVoyage && VOYAGE_POINTS.some((v) => v.id === p.id)) onStartVoyage(p as MapPoint);
    else if ('tier' in p && p.tier === 'A') {
      if (phase === 'idle') {
        // One sheet at a time: the intro replaces the trip from Ushuaia, as starting Orcadas did before.
        if (voyaging) onEndVoyage?.(false);
        setSheet(null);
        // Orcadas first shows its intro, where the visitor picks how to arrive (#125, #135); any
        // other expedition starts at once.
        if (p.id === EXPEDITION_POINT.id) setPendingOrcadas(p);
        else onStart(p);
      }
    } else {
      if (is3D && 'closeUp' in p && p.closeUp) send3D({ type: 'visit', id: p.id, distance: p.closeUp });
      setSheet(p);
      setTouched(true);
    }
  };

  /** From the South Pole sheet: closes it, turns the claims layer on, shows the whole continent and focuses the control. */
  const showClaims = () => {
    setSheet(null);
    setClaimsDetails(true);
    if (!claimsEnabled) {
      if (legend) onToggleLegend();
      setClaimsEnabled(true);
      setClaimsStatus('loading');
    }
    // Pull back to the whole continent: the sectors only read as a whole.
    send3D({ type: 'home' });
    // After the sheet returns focus to its opener.
    requestAnimationFrame(() => claimsSwitch.current?.focus());
  };

  const onPick = (m: Marker, touch: boolean) => {
    if (gesture.current.dragged) return;
    setWelcoming(false);
    if (m.kind === 'cluster') {
      setShown(null);
      if (m.pick) setPicking(m.points);
      else if (is3D) send3D({ type: 'focus', view: m.target });
      else animateTo(m.target);
    } else if (markerPress(shown, m.key, touch) === 'show') setShown(m.key);
    else {
      setShown(null);
      openPoint(m.point);
    }
  };

  const next = useMemo(() => nextExpedition(explored), [explored]);
  // The welcome, «Continuar» and a trip already point somewhere: no suggestion then (S6).
  const suggest = !welcome && !welcoming && !resume && !voyaging;
  const markers = useMemo(() => buildMarkers(size, view, explored, PTS, undefined, suggest ? next?.id : undefined), [size, view, explored, next, suggest]);
  markersRef.current = markers;
  const after = finished ? afterExpedition(finished.id, explored) : null;
  const geo = geometry(size);
  const stageCls = 'stage' + (is3D ? ' m3d' : '') + (voyaging ? ' voyaging' : '') + (phase === 'travel' ? ' travel' : phase === 'dive' ? ' dive' : phase === 'approach' ? ' approach' : phase === 'fade' ? ' fade' : phase === 'ret' ? ' ret' : '');

  return (
    <div className="stagewrap">
      <div className={stageCls}>
        <div
          className="vp"
          ref={vpRef}
          tabIndex={0}
          role="application"
          aria-label={
            mode === '3d'
              ? 'Mapa en relieve 3D de la Antártida. Arrastrá para mover, y con el botón derecho o con dos dedos para girar e inclinar. Usá las flechas para desplazarte, las teclas más y menos para acercar, y las teclas Q y E para girar.'
              : 'Mapa de la Antártida. Arrastrá para mover, usá las flechas para desplazarte y las teclas más y menos para acercar.'
          }
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onPointerLeave={onUp}
          onKeyDown={onKey}
        >
          {mode === '3d' && Layer3D ? (
            <Layer3D
              size={size}
              geo={geo}
              view={view}
              anim={anim}
              phase={phase}
              arrival={arrival}
              diveTarget={diveTarget}
              markers={markers}
              shown={shown}
              onPick={onPick}
              command={command}
              onCameraRest={setView}
              voyage={voyaging ? voyage.bus : null}
              voyagePicker={!voyageTransport}
              claims={claimsEnabled && !voyaging ? { selection: claimsSelection, coverage: claimsCoverage } : null}
              onClaimsStatus={setClaimsStatus}
            />
          ) : (
            <Map2DLayer
              geo={geo}
              view={view}
              anim={anim}
              phase={phase}
              markers={markers}
              shown={shown}
              onPick={onPick}
              onReady={onMap2DReady}
            />
          )}
        </div>

        <svg className="grain" aria-hidden="true" focusable="false"><rect width="100%" height="100%" filter="url(#paperf)" /></svg>

        <header className="top">
          <div className="brand">
            <CompassRose />
            <h1>Antártida por descubrir</h1>
            <p>cuaderno de campo · desde Ushuaia</p>
          </div>
          <ExplorationLog explored={explored} />
        </header>

        {welcoming ? (
          <div className="hint" role="status">Tocá <strong>Desde Ushuaia</strong> para empezar</div>
        ) : (
          !touched && !voyaging && phase === 'idle' && <div className="hint">arrastrá para mover · pellizcá para acercar</div>
        )}
        {/* Always mounted, so a screen reader reads the card's text when it changes. */}
        <div className="next-live" role="status">
          {showCard && finished ? `${finished.line}. ${after?.next ? `Siguiente sugerida: ${after.next.title}.` : 'Exploraste las seis expediciones.'}` : ''}
        </div>

        {phase !== 'travel' && (
        <div className="bottom">
          {voyaging ? <span /> : (
          <div className="leftcol">
            <Legend open={legend} onToggle={onToggleLegend} mode={mode} />
            {/* Off, the claims open from the South Pole sheet; on, this control turns them off. */}
            {is3D && claimsEnabled && <ClaimsControl enabled details={claimsDetails} onDetails={setClaimsDetails}
              switchRef={claimsSwitch} detailsRef={claimsDetailsButton}
              onToggle={() => {
                setClaimsEnabled(false);
                setClaimsStatus('loading');
                vpRef.current?.focus();
              }} />}
            {(() => {
              const resumePoint = resume && phase === 'idle' && !voyaging && !welcome && !welcoming
                ? PTS.find((p) => p.id === resume.id)
                : null;
              const detail = resumePoint && resume ? resumeDetail(resumePoint.id, resume.step, resume.sub) : null;
              // The welcome already points at Ushuaia; «Continuar» wins over the suggestion (S6).
              const nextPoint = !resumePoint && next && phase === 'idle' && !voyaging && !welcome && !welcoming && !showCard ? next : null;
              if (nextPoint) {
                return (
                  <button type="button" className="btn resume next-btn" aria-label={`Siguiente: ${nextPoint.title}`} onClick={() => { setSheet(null); setPendingOrcadas(null); openPoint(nextPoint); }}>
                    <span className="lbl">Siguiente: </span>{nextPoint.title}
                  </button>
                );
              }
              return resumePoint ? (
                <button
                  type="button"
                  className="btn resume"
                  aria-label={`Continuar: ${resumePoint.title}${detail ? ` · ${detail}` : ''}`}
                  onClick={() => {
                    setSheet(null);
                    setPendingOrcadas(null);
                    if (VOYAGE_POINTS.some((v) => v.id === resumePoint.id)) {
                      if (resume && resume.step >= 1) {
                        const transport = resumeTransport(resume);
                        if (transport) voyage.start(transport, resume.step);
                      }
                      onStartVoyage?.(resumePoint, resume ?? undefined);
                    } else {
                      onStart(resumePoint, undefined, true);
                    }
                  }}
                >
                  Continuar: {resumePoint.title}{detail && <span className="rdetail">{` · ${detail}`}</span>}
                </button>
              ) : null;
            })()}
            <button type="button" className="btn" onClick={() => { setSheet(null); setPendingOrcadas(null); setList(true); }}>
              {Icon.list}
              Ver como lista
            </button>
            {showToggle && onToggleMode && (
              <ViewToggle mode={mode} available3D={available3D} onChange={onToggleMode} />
            )}
          </div>
          )}
          <div className="zoom">
            <button type="button" className="iconbtn" onClick={() => (is3D ? send3D({ type: 'zoom', factor: 1.6 }) : animateTo(zoomCenter(size, view, 1.6)))} aria-label="Acercar">{Icon.plus}</button>
            <button type="button" className="iconbtn" onClick={() => (is3D ? send3D({ type: 'zoom', factor: 1 / 1.6 }) : animateTo(zoomCenter(size, view, 1 / 1.6)))} aria-label="Alejar">{Icon.minus}</button>
            <button type="button" className="iconbtn" onClick={() => (is3D ? send3D({ type: 'home' }) : animateTo(HOME))} aria-label="Ver todo el continente">{Icon.reset}</button>
          </div>
        </div>
        )}
        {phase === 'travel' && <OrcadasTravelBar arrival={arrival} onSkip={onSkipTravel} />}

        {list && (
          <ListView
            explored={explored}
            onClose={() => setList(false)}
            onPick={(p) => { setList(false); openPoint(p); }}
          />
        )}
        {picking && (
          <ListView
            explored={explored}
            points={picking}
            onClose={() => setPicking(null)}
            onPick={(p) => { setPicking(null); openPoint(p); }}
          />
        )}
        {showCard && finished && after && (
          <NextCard
            key={finished.id}
            doneLine={finished.line}
            doneId={finished.id}
            next={after.next}
            offerIrizar={after.offerIrizar}
            onStart={(p) => { onDismissFinished?.(); openPoint(p); }}
            onIrizar={() => { onDismissFinished?.(); onTravelIrizar?.(); }}
            onClose={dismissCard}
          />
        )}
        {voyaging && onEndVoyage && (
          <Suspense fallback={null}>
            <VoyagePanel voyage={voyage} transport={voyageTransport} animated={is3D && !reduced} webgl={is3D} reduced={reduced} onExit={onEndVoyage} />
          </Suspense>
        )}
        {/* One sheet at a time: a point sheet hides the claims details until it closes. */}
        {is3D && claimsEnabled && claimsDetails && !sheet && (
          <ClaimsDetails selection={claimsSelection} coverage={claimsCoverage} status={claimsStatus}
            onSelect={setClaimsSelection} onCoverage={setClaimsCoverage} onClose={closeClaimsDetails} />
        )}
        {sheet && <PointSheet point={sheet} onClose={() => setSheet(null)} fallbackFocus={() => vpRef.current} preview={is3D} reduced={reduced}
          onMap={is3D && 'closeUp' in sheet && !!sheet.closeUp}
          action={is3D && sheet.id === CLAIMS_POINT_ID ? { label: claimsEnabled ? 'Ver reclamos en el mapa' : 'Ver reclamos territoriales', onClick: showClaims } : undefined} />}
        {pendingOrcadas && phase === 'idle' && (
          <OrcadasIntro
            onStart={(arrival) => {
              const point = pendingOrcadas;
              setPendingOrcadas(null);
              onStart(point, arrival);
            }}
            onExit={() => setPendingOrcadas(null)}
            fallbackFocus={() => vpRef.current}
            preview={is3D}
            reduced={reduced}
          />
        )}
      </div>
      <div className={'veil' + (phase === 'dive' ? ' on' : phase === 'approach' ? ' late' : '')} />
    </div>
  );
}

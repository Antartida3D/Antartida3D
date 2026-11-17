import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Box3, Spherical, Vector3 } from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { CameraControls, PerformanceMonitor } from '@react-three/drei';
import { EffectComposer } from '@react-three/postprocessing';
import {
  homePose3D,
  performanceBounds,
  APPROACH_MS,
  approachPose3D,
  type CameraPose,
  divePose3D,
  FOV,
  liftToward,
  distanceFromK3D,
  generateSeaLifeInstances,
  groundTarget,
  homeDistance3D,
  cameraZoomAvailability,
  voyageMaxDistance3D,
  loadOceanDepth,
  poseFromView,
  viewFrom3D,
  toWorld,
  project,
  heightAt,
  worldHeight,
  fromWorld,
  minCameraDistance,
  MAX_POLAR_DEG,
  PAN_LIMIT,
  SEA_HINT_MIN_PX,
  screenPx,
  ICE_MIN_DISTANCE,
  irizarStateAtTime,
  fanOffsets,
  guideLine,
  markerGap,
  markerLift,
  SEA_POINTS,
  type Geometry,
  type MapPoint,
  type Marker,
  type OceanDepthGrid,
  type SeaLifeInstance,
  type SeaMarker,
  type Size,
  type View,
  type ZoomAvailability,
  map3dLoadingStore,
} from '@antartida/core';
import { MarkerButton } from '../map/Markers.tsx';
import { useLoadingStore, useReducedMotion } from '../hooks.ts';
import { CanvasGuard } from '../CanvasGuard.tsx';
import type { Layer3DProps, Phase } from '../map/MapView.tsx';
import { ShaderWarmup } from './ShaderWarmup.tsx';
import { Ocean } from './Ocean.tsx';
import { SeaLife } from './SeaLife.tsx';
import { Terrain } from './Terrain.tsx';
import { SouthernLands } from './SouthernLands.tsx';
import { Fuegia } from './Fuegia.tsx';
import { MalvinasFlag } from './MalvinasFlag.tsx';
import { Claims3D } from './Claims3D.tsx';
import { Graticule3D } from './Graticule3D.tsx';
import { InkEffect } from './InkEffect.ts';
import { useMapGestures } from './useMapGestures.ts';
import { SeaTimeContext, useAnimationClock } from './useAnimationClock.ts';
import { Town3D } from '../voyage/Town3D.tsx';
import { Storm3D } from '../voyage/Storm3D.tsx';
import { OrcadasSite } from './OrcadasSite.tsx';
import { MarambioSite } from './MarambioSite.tsx';
import { PointModels, pointFocus } from './PointModels.tsx';
import { OrcadasTravel3D } from '../voyage/OrcadasTravel3D.tsx';
import { Voyage3D } from '../voyage/Voyage3D.tsx';

function SceneContent({
  wide,
  lowQuality,
  phase,
  arrival,
  diveTarget,
  reduced,
  size,
  geo,
  command,
  onCameraRest,
  onZoomAvailabilityChange,
  markers,
  overlayRef,
  enablePost,
  voyage,
  voyagePicker,
  seaMarkers,
  claims,
  onClaimsStatus,
}: {
  wide: boolean;
  lowQuality: boolean;
  phase: Phase;
  arrival: Layer3DProps['arrival'];
  diveTarget: MapPoint;
  reduced: boolean;
  size: Size;
  geo: Geometry;
  command: Layer3DProps['command'];
  onCameraRest: (view: View) => void;
  onZoomAvailabilityChange: Layer3DProps['onZoomAvailabilityChange'];
  markers: Marker[];
  overlayRef: RefObject<HTMLDivElement | null>;
  enablePost: boolean;
  voyage: Layer3DProps['voyage'];
  voyagePicker: Layer3DProps['voyagePicker'];
  seaMarkers: SeaMarker[];
  claims: Layer3DProps['claims'];
  onClaimsStatus: Layer3DProps['onClaimsStatus'];
}) {
  const seaTime = useAnimationClock({ lowQuality });
  const invalidate = useThree((s) => s.invalidate);
  const [depthGrid, setDepthGrid] = useState<OceanDepthGrid | null>(null);

  useEffect(() => {
    let alive = true;
    loadOceanDepth().then((grid) => {
      if (!alive) return;
      setDepthGrid(grid);
      invalidate();
    });
    return () => {
      alive = false;
    };
  }, [invalidate]);

  const seaLifeInstances = useMemo(
    () =>
      depthGrid
        ? generateSeaLifeInstances({
            seed: 202611,
            mobile: !wide,
            customGrid: depthGrid,
          })
        : [],
    [wide, depthGrid]
  );

  // Expose render frame count for tests
  useFrame(() => {
    if (typeof window !== 'undefined') {
      const win = window as unknown as { __frames?: number };
      win.__frames = (win.__frames ?? 0) + 1;
    }
  });

  return (
    <SeaTimeContext.Provider value={seaTime}>
      <Ocean wide={wide} timeUniform={seaTime} instances={seaLifeInstances} />
      <Terrain wide={wide} />
      {claims && <Claims3D wide={wide} selection={claims.selection} coverage={claims.coverage} onStatus={onClaimsStatus} />}
      <SouthernLands />
      <Fuegia wide={wide} />
      <MalvinasFlag wide={wide} />
      <Graticule3D />
      <SeaLife visible={phase !== 'dive' && phase !== 'travel'} timeUniform={seaTime} instances={seaLifeInstances} voyage={voyage} />
      <Town3D reduced={reduced} wide={wide} overlay={overlayRef} />
      <OrcadasSite reduced={reduced} />
      <MarambioSite reduced={reduced} hidden={Boolean(voyage)} />
      <PointModels reduced={reduced} />
      <Storm3D />
      {phase === 'travel' && <OrcadasTravel3D arrival={arrival ?? 'ship'} reduced={reduced} />}
      {voyage && <Voyage3D bus={voyage} picker={voyagePicker} reduced={reduced} overlay={overlayRef} />}
      {enablePost && (
        <EffectComposer multisampling={0}>
          <InkEffect />
        </EffectComposer>
      )}
      <ControlsBridge
        phase={phase}
        diveTarget={diveTarget}
        reduced={reduced}
        size={size}
        geo={geo}
        command={command}
        onCameraRest={onCameraRest}
        onZoomAvailabilityChange={onZoomAvailabilityChange}
        voyaging={Boolean(voyage)}
      />
      <ProjectMarkers
        markers={markers}
        seaMarkers={seaMarkers}
        overlayRef={overlayRef}
        phase={phase}
        timeUniform={seaTime}
        instances={seaLifeInstances}
        voyage={voyage}
      />
    </SeaTimeContext.Provider>
  );
}

export type Map3DLayerProps = Layer3DProps;

// Zoom range of the orbit camera, as a distance to its target. The closest is ICE_MIN_DISTANCE
// (@antartida/core), lower only around Tierra del Fuego, the Drake and the points with a model
// (minCameraDistance). The farthest view is the overview (homeDistance3D: ~800 on desktop and ~2250
// on a phone), where the whole continent fits; farther the camera would see past the lands of the
// rest of the world (WORLD_FADE_END). During the trip from Ushuaia it is voyageMaxDistance3D (#167).
/** Angle from straight down of the close-up of a point with a model: the model is seen at a slant, on its ground. */
const VISIT_POLAR = (52 * Math.PI) / 180;
/** From this window width the point card is a side panel, not a bottom sheet (painted.css). */
const VISIT_WIDE_PX = 820;
/**
 * On a phone the point sheet opens at half the screen (painted.css, #148): the model is seen this
 * high on screen (-1 bottom, 1 top), in the middle of the free half above the sheet.
 */
const VISIT_PHONE_NDC_Y = 0.5;
// Closer than NEAR_FROM the near plane comes in too, or the land in front of the target would be clipped.
const NEAR = 10;
const NEAR_FROM = 60;
/** Near plane closer than NEAR_FROM: the close-up of a point with a model gets about 1 unit from it. */
const NEAR_CLOSE = 0.5;

function ControlsBridge({
  phase,
  diveTarget,
  reduced,
  size,
  geo,
  command,
  onCameraRest,
  onZoomAvailabilityChange,
  voyaging,
}: {
  phase: Phase;
  diveTarget: MapPoint;
  reduced: boolean;
  size: Size;
  geo: Geometry;
  command: Layer3DProps['command'];
  onCameraRest: (view: View) => void;
  onZoomAvailabilityChange: Layer3DProps['onZoomAvailabilityChange'];
  /** On a trip the target follows the vehicle, up in the air with the plane. */
  voyaging: boolean;
}) {
  const controlsRef = useRef<CameraControls>(null);
  const invalidate = useThree((s) => s.invalidate);
  const scene = useThree((s) => s.scene);
  const gl = useThree((s) => s.gl);
  const initialized = useRef(false);
  const approach = useRef<{ from: CameraPose; to: CameraPose; startMs: number } | null>(null);
  const live = useRef({ size, geo, onCameraRest, onZoomAvailabilityChange });
  live.current = { size, geo, onCameraRest, onZoomAvailabilityChange };
  const lastZoomAvailability = useRef<ZoomAvailability | null>(null);
  // Boundary box enclosing continent and surrounding ocean navigation area
  const boundary = useMemo(
    () => new Box3(new Vector3(-PAN_LIMIT, -50, -PAN_LIMIT), new Vector3(PAN_LIMIT, 2500, PAN_LIMIT)),
    []
  );

  useMapGestures(controlsRef, {
    minPolarAngle: 0,
    maxPolarAngle: (MAX_POLAR_DEG * Math.PI) / 180,
    smoothTime: 0.25,
    boundary,
    invalidate,
    normalizeCtrlWheel: true,
  });

  useLayoutEffect(() => {
    const cc = controlsRef.current;
    if (!cc) return;

    (window as unknown as { __cameraControls?: CameraControls }).__cameraControls = cc;
    (window as unknown as { __invalidate?: () => void }).__invalidate = invalidate;
    (window as unknown as { __scene?: unknown }).__scene = scene;
    (window as unknown as { __gl?: unknown }).__gl = gl;

    if (phase === 'approach') {
      const from = { pos: cc.getPosition(new Vector3()), target: cc.getTarget(new Vector3()) };
      approach.current = { from, to: divePose3D(diveTarget), startMs: performance.now() };
      invalidate();
    } else if (phase === 'dive') {
      const dur = reduced ? 0 : 1.5;
      const dive = divePose3D(diveTarget);
      cc.setLookAt(
        dive.pos.x,
        dive.pos.y,
        dive.pos.z,
        dive.target.x,
        dive.target.y,
        dive.target.z,
        dur > 0
      );
    } else if (!initialized.current) {
      initialized.current = true;
      const home = homePose3D(size.vw / size.vh);
      cc.setLookAt(home.pos.x, home.pos.y, home.pos.z, home.target.x, home.target.y, home.target.z, false);
    }
  }, [phase, reduced, diveTarget]);

  // Continuous zoom down to the point: the camera follows approachPose3D on every frame.
  useFrame(() => {
    const cc = controlsRef.current;
    const run = approach.current;
    if (!cc || !run) return;
    const u = Math.min(1, (performance.now() - run.startMs) / APPROACH_MS);
    const pose = approachPose3D(run.from, run.to, u * u * (3 - 2 * u));
    void cc.setLookAt(pose.pos.x, pose.pos.y, pose.pos.z, pose.target.x, pose.target.y, pose.target.z, false);
    if (u < 1) invalidate();
    else approach.current = null;
  });

  // Report where the camera settled, so the markers and the 2D view follow the orbit camera.
  useEffect(() => {
    const cc = controlsRef.current;
    if (!cc) return;
    const onRest = () => {
      const t = cc.getTarget(new Vector3());
      const { size: sz, geo: g, onCameraRest: report } = live.current;
      report(viewFrom3D(sz, g, t, cc.distance));
    };
    // The library reports 'rest' only when it sees the last, tiny step of a move. A move that
    // ends within one frame (slow device, quick gesture) only goes to 'sleep': the camera would
    // stay `active` for ever, the markers would not regroup and frames would keep being drawn.
    const onSleep = () => {
      if (!cc.active) return;
      (cc as unknown as { _hasRested: boolean })._hasRested = true;
      cc.dispatchEvent({ type: 'rest' });
    };
    cc.addEventListener('rest', onRest);
    cc.addEventListener('sleep', onSleep);
    return () => {
      cc.removeEventListener('rest', onRest);
      cc.removeEventListener('sleep', onSleep);
    };
  }, []);

  // Buttons and keys move the camera from where it is now; they never rebuild
  // a pose from the 2D view, which used to undo the user's orbit and zoom.
  useEffect(() => {
    const cc = controlsRef.current;
    if (!cc || !command || phase === 'dive' || phase === 'approach') return;
    const smooth = !reduced;
    const { cmd } = command;
    const aspect = size.vw / size.vh;
    const clampDistance = (d: number) => Math.min(cc.maxDistance, Math.max(cc.minDistance, d));
    // Where the camera ends up; reported right away so markers separate as soon as you zoom,
    // without waiting for the 'rest' event (instant moves under reduced motion may not fire it).
    let endDistance = cc.distance;
    if (cmd.type === 'zoom') {
      endDistance = clampDistance(cc.distance / cmd.factor);
      cc.dollyTo(endDistance, smooth);
    } else if (cmd.type === 'home' && voyaging) {
      // The camera stays on the vehicle: the overview of the trip is as far as it may go.
      endDistance = cc.maxDistance;
      cc.dollyTo(endDistance, smooth);
    } else if (cmd.type === 'home') {
      const home = homePose3D(aspect);
      endDistance = homeDistance3D(aspect);
      cc.setLookAt(home.pos.x, home.pos.y, home.pos.z, home.target.x, home.target.y, home.target.z, smooth);
    } else if (cmd.type === 'focus') {
      const t = poseFromView(size, geo, cmd.view).target;
      endDistance = clampDistance(distanceFromK3D(aspect, cmd.view.k));
      cc.moveTo(t.x, 0, t.z, smooth);
      cc.dollyTo(endDistance, smooth);
    } else if (cmd.type === 'visit') {
      // Down to the model on the relief, looking at it from above at an angle, from where the camera is.
      const at = pointFocus(cmd.id);
      endDistance = cmd.distance;
      cc.minDistance = Math.min(cc.minDistance, cmd.distance);
      // The card covers the right side of a wide screen and the bottom of a phone: aim beside it, so
      // the model sits in the free part (to the left, or higher up, seen from the camera).
      const wide = size.vw >= VISIT_WIDE_PX;
      const across = wide ? 0.14 * 2 * cmd.distance * Math.tan((FOV * Math.PI) / 360) * aspect : 0;
      const toward = wide ? 0 : liftToward(cmd.distance, VISIT_POLAR, VISIT_PHONE_NDC_Y);
      const az = cc.azimuthAngle;
      void cc.moveTo(
        at.x + Math.cos(az) * across + Math.sin(az) * toward,
        at.y,
        at.z - Math.sin(az) * across + Math.cos(az) * toward,
        smooth
      );
      void cc.dollyTo(cmd.distance, smooth);
      void cc.rotatePolarTo(VISIT_POLAR, smooth);
    } else if (cmd.type === 'pan') {
      // Move the target over the ground, in the camera's own left/right and forward directions.
      const upp = (2 * cc.distance * Math.tan((FOV * Math.PI) / 360)) / size.vh; // world units per px
      const az = cc.azimuthAngle;
      const rx = -cmd.dx * upp;
      const fz = cmd.dy * upp;
      const t = cc.getTarget(new Vector3());
      cc.moveTo(
        t.x + Math.cos(az) * rx - Math.sin(az) * fz,
        t.y,
        t.z - Math.sin(az) * rx - Math.cos(az) * fz,
        smooth
      );
    } else if (cmd.type === 'rotate') {
      cc.rotate((cmd.deg * Math.PI) / 180, 0, smooth);
    }
    onCameraRest(viewFrom3D(size, geo, cc.getTarget(new Vector3()), endDistance));
    invalidate();
  }, [command]);

  const target = useRef(new Vector3());
  const eye = useRef(new Vector3());
  const sphere = useRef(new Spherical());
  useFrame(({ camera }) => {
    const cc = controlsRef.current;
    if (!cc) return;
    // Zooming towards the cursor lifts the target into the air or sinks it under the map, and the
    // camera follows it in (#127): slide it back to sea level along the line of sight.
    if (!voyaging && phase !== 'approach' && phase !== 'dive' && phase !== 'travel') {
      const ground = groundTarget(cc.getPosition(eye.current, true), cc.getTarget(target.current, true));
      if (ground) void cc.setTarget(ground.x, ground.y, ground.z, !reduced);
    }
    const at = fromWorld(cc.getTarget(target.current));
    cc.minDistance = minCameraDistance(at.x, at.y);
    // Measured where the camera is heading, not where it is: a move passing by on its way (the trip
    // from the overview down to the ship at departure) would be cut short at the limit (#181).
    const heading = cc.getSpherical(sphere.current, true).radius;
    // Panning out of Tierra del Fuego while close: back off before reaching the ice plateau.
    if (heading < cc.minDistance - 0.01) void cc.dollyTo(cc.minDistance, !reduced);
    // A narrower window has a farther overview: come back in when the window gets wider.
    if (heading > cc.maxDistance + 0.01) void cc.dollyTo(cc.maxDistance, !reduced);
    // The destination determines whether more zoom is available. Waiting for the rendered
    // distance would leave the button visible throughout the tail of the damped animation.
    const zoom = cameraZoomAvailability(cc.getSpherical(sphere.current, true).radius, cc.minDistance, cc.maxDistance);
    const previous = lastZoomAvailability.current;
    if (!previous || zoom.canZoomIn !== previous.canZoomIn || zoom.canZoomOut !== previous.canZoomOut) {
      lastZoomAvailability.current = zoom;
      live.current.onZoomAvailabilityChange(zoom);
    }
    const near = cc.distance < NEAR_FROM ? NEAR_CLOSE : NEAR;
    if (camera.near !== near) {
      camera.near = near;
      camera.updateProjectionMatrix();
    }
    if (cc.active) invalidate();
  });

  return (
    <CameraControls
      ref={controlsRef}
      makeDefault
      dollyToCursor
      // The zoom into an expedition drives the camera on every frame: gestures would fight it.
      enabled={phase !== 'approach' && phase !== 'dive' && phase !== 'travel'}
      minDistance={ICE_MIN_DISTANCE}
      // Travelling, the camera stays near the vehicle: farther it gets lost among the lands (#167).
      maxDistance={voyaging ? voyageMaxDistance3D(size.vw / size.vh) : homeDistance3D(size.vw / size.vh)}
    />
  );
}

function ProjectMarkers({
  markers,
  seaMarkers,
  overlayRef,
  phase,
  timeUniform,
  instances,
  voyage,
}: {
  markers: Marker[];
  seaMarkers: SeaMarker[];
  voyage: Layer3DProps['voyage'];
  overlayRef: RefObject<HTMLDivElement | null>;
  phase: Phase;
  timeUniform: { value: number };
  instances: readonly SeaLifeInstance[];
}) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);

  useFrame(() => {
    const el = overlayRef.current;
    if (!el || phase === 'dive' || phase === 'approach' || phase === 'travel') return;

    // CameraControls updates camera.position/quaternion in useFrame(-1) without updating matrixWorldInverse;
    // WebGLRenderer.render() updates it later, so project() here would lag behind the rendered frame.
    camera.updateMatrixWorld();

    // 1. Position expedition markers. Those that crowd each other on screen fan out around their
    // places, each with a line back to its own (#238): the spread is worked out here, from where the
    // camera really puts them, since the tilt and the turn change how close they look. Sea markers
    // stay out of it, and go behind: a moving ship must not push the points around.
    const placed: { btn: HTMLElement; guide: HTMLElement | null; left: number; top: number }[] = [];
    for (const m of markers) {
      const btn = el.querySelector<HTMLElement>(`[data-key="${m.key}"]`);
      if (!btn) continue;
      const guide = el.querySelector<HTMLElement>(`[data-guide="${m.key}"]`);

      const elevM = heightAt(m.x, m.y);
      const groundH = worldHeight(elevM);
      const wPos = toWorld(m.x, m.y, groundH + 3.0);
      const p = new Vector3(wPos.x, wPos.y, wPos.z);
      p.project(camera);

      const visible = p.z < 1.0 && p.x >= -1.1 && p.x <= 1.1 && p.y >= -1.1 && p.y <= 1.1;
      if (!visible) {
        btn.style.display = 'none';
        if (guide) guide.style.display = 'none';
        continue;
      }

      btn.style.display = '';
      placed.push({ btn, guide, left: ((p.x + 1) * size.width) / 2, top: ((-p.y + 1) * size.height) / 2 });
    }
    const offsets = fanOffsets(placed, markerGap(size.width));
    placed.forEach(({ btn, guide, left, top }, i) => {
      const { dx, dy } = offsets[i];
      const lift = markerLift(dx, dy);
      btn.style.transform = `translate3d(${(left + dx).toFixed(1)}px, ${(top + dy).toFixed(1)}px, 0px) translate(-50%, -50%)`;
      btn.style.setProperty('--lift', `${lift.toFixed(1)}px`);
      if (!guide) return;
      // From the head of the marker down to its place.
      const { length, angle } = guideLine(dx, dy, lift);
      guide.style.display = '';
      guide.style.height = `${length.toFixed(1)}px`;
      guide.style.transform = `translate3d(${(left + dx).toFixed(1)}px, ${(top + dy - lift).toFixed(1)}px, 0px) rotate(${angle.toFixed(3)}rad)`;
    });

    // 2. Position sea markers
    const uTime = timeUniform.value;
    for (const sm of seaMarkers) {
      const btn = el.querySelector<HTMLElement>(`[data-key="${sm.key}"]`);
      if (!btn) continue;
      // During the trip the sea life is hidden (SeaLife): its markers go with it.
      if (voyage?.state) {
        btn.style.display = 'none';
        continue;
      }

      let mapX = sm.x;
      let mapY = sm.y;

      if (sm.point.id === 'sea-irizar') {
        const state = irizarStateAtTime(uTime);
        mapX = state.x;
        mapY = state.y;
      } else if (sm.point.targetSpecies) {
        const inst = instances.find((i) => i.species === sm.point.targetSpecies);
        if (inst) {
          mapX = inst.x;
          mapY = inst.y;
        } else if (instances.length) {
          // The animal is not drawn on this screen (fewer animals on a phone): no marker over empty sea.
          btn.style.display = 'none';
          continue;
        }
      }

      const { over } = sm.point;
      const wPos = toWorld(mapX, mapY, over?.height ?? 0.4);
      const p = new Vector3(wPos.x, wPos.y, wPos.z);
      // A hint over something drawn goes away with it: from afar it would point at nothing.
      const shown = !over || screenPx(over.width, camera.position.distanceTo(p), size.height) >= SEA_HINT_MIN_PX;
      p.project(camera);

      const visible = shown && p.z < 1.0 && p.x >= -1.1 && p.x <= 1.1 && p.y >= -1.1 && p.y <= 1.1;
      if (!visible) {
        btn.style.display = 'none';
        continue;
      }

      btn.style.display = '';
      const sx = ((p.x + 1) * size.width) / 2;
      const sy = ((-p.y + 1) * size.height) / 2;
      btn.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0px) translate(-50%, -50%)`;
    }

    // 3. Position graticule labels: "0° Greenwich" and "60° S" calculated with project(lon, lat)
    const updateGraticuleLabel = (selector: string, mapCoord: { x: number; y: number }) => {
      const label = el.querySelector<HTMLElement>(selector);
      if (!label) return;
      const wPos = toWorld(mapCoord.x, mapCoord.y, 0.2);
      const p = new Vector3(wPos.x, wPos.y, wPos.z);
      p.project(camera);

      const visible = p.z < 1.0 && p.x >= -1.1 && p.x <= 1.1 && p.y >= -1.1 && p.y <= 1.1;
      if (!visible) {
        label.style.display = 'none';
        return;
      }

      label.style.display = '';
      const sx = ((p.x + 1) * size.width) / 2;
      const sy = ((-p.y + 1) * size.height) / 2;
      label.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0px) translate(-50%, -50%)`;
    };

    // Greenwich: lon 0, lat ~ -57; 60° S: on circle of -60° lat on a meridian free of markers (lon 45)
    updateGraticuleLabel('[data-graticule="greenwich"]', project(0, -57));
    updateGraticuleLabel('[data-graticule="60s"]', project(45, -60));
  });

  return null;
}

export function Map3DLayer({
  size,
  geo,
  phase,
  arrival,
  diveTarget,
  markers,
  shown,
  onPick,
  command,
  onCameraRest,
  onZoomAvailabilityChange,
  voyage,
  voyagePicker,
  claims,
  onClaimsStatus,
}: Map3DLayerProps) {
  const reduced = useReducedMotion();
  const loadingSnapshot = useLoadingStore(map3dLoadingStore);
  const shadersReady = loadingSnapshot.done.terrain && loadingSnapshot.done.ocean && loadingSnapshot.done.lands;
  const overlayRef = useRef<HTMLDivElement>(null);
  const [dpr, setDpr] = useState(1.5);
  const [enablePost, setEnablePost] = useState(true);
  const [lowQuality, setLowQuality] = useState(false);

  const homeStart = homePose3D(size.vw / size.vh);

  const seaMarkers = useMemo<SeaMarker[]>(
    () =>
      SEA_POINTS.map((sp) => ({
        kind: 'sea',
        key: sp.id,
        left: 0,
        top: 0,
        x: sp.fallbackX,
        y: sp.fallbackY,
        point: sp,
        cls: 'mk tsea',
        aria: `${sp.title}, ${sp.place}. ${sp.tag ?? 'Vida en el mar'}. Ver ficha.`,
        label: {
          title: sp.title,
          sub: sp.place,
          side: sp.fallbackX > 500 ? 'left' : 'right',
        },
      })),
    []
  );

  return (
    <>
      <CanvasGuard onFail={() => map3dLoadingStore.setError('El navegador no pudo dibujar el relieve 3D.')}>
        <Canvas
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 0,
            background: 'var(--paper, #EAE0D0)',
          }}
          frameloop="demand"
          dpr={dpr}
          gl={{
            antialias: true,
            powerPreference: 'high-performance',
            alpha: true,
            preserveDrawingBuffer: true,
          }}
          camera={{
            fov: 40,
            near: NEAR,
            far: 20000,
            position: [homeStart.pos.x, homeStart.pos.y, homeStart.pos.z],
          }}
          aria-hidden="true"
        >
          <PerformanceMonitor
            bounds={() => performanceBounds(lowQuality)}
            onIncline={() => {
              setLowQuality(false);
              if (!enablePost) setEnablePost(true);
              else if (dpr < 1.5) setDpr(1.5);
            }}
            onDecline={() => {
              setLowQuality(true);
              if (dpr > 1) setDpr(1);
              else if (enablePost) setEnablePost(false);
            }}
            onFallback={() => {
              setLowQuality(true);
              setDpr(1);
              setEnablePost(false);
            }}
          />
          <ShaderWarmup
            ready={shadersReady}
            onCompiled={() => map3dLoadingStore.markStepDone('shaders')}
            onError={(msg) => map3dLoadingStore.setError(msg)}
          />
          <SceneContent
            wide={size.vw > 820}
            lowQuality={lowQuality}
            phase={phase}
            arrival={arrival}
            diveTarget={diveTarget}
            reduced={reduced}
            size={size}
            geo={geo}
            command={command}
            onCameraRest={onCameraRest}
            onZoomAvailabilityChange={onZoomAvailabilityChange}
            markers={markers}
            overlayRef={overlayRef}
            enablePost={enablePost}
            voyage={voyage}
            voyagePicker={voyagePicker}
            seaMarkers={seaMarkers}
            claims={claims}
            onClaimsStatus={onClaimsStatus}
          />
        </Canvas>
      </CanvasGuard>
      <div
        className={'ov' + (phase === 'dive' || phase === 'approach' || phase === 'travel' ? ' hide' : '')}
        ref={overlayRef}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      >
        {phase !== 'dive' && phase !== 'approach' && phase !== 'travel' && (
          <>
            <span
              data-graticule="greenwich"
              className="hand"
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                color: 'var(--ice, #F7FAFB)',
                fontSize: 17,
                opacity: 0.85,
                textShadow: '0 1px 2px rgba(31,42,54,0.6)',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                willChange: 'transform',
                userSelect: 'none',
              }}
            >
              0° Greenwich
            </span>
            <span
              data-graticule="60s"
              className="hand"
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                color: 'var(--ice, #F7FAFB)',
                fontSize: 17,
                opacity: 0.85,
                textShadow: '0 1px 2px rgba(31,42,54,0.6)',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                willChange: 'transform',
                userSelect: 'none',
              }}
            >
              60° S
            </span>
            {/* The stick of each expedition point, under every marker: no line covers another one's dot (#238). */}
            {markers.map((m) => (m.kind === 'point' ? <span key={'g:' + m.key} data-guide={m.key} className="guide" aria-hidden="true" style={{ zIndex: 0 }} /> : null))}
            {markers.map((m) => {
              const zIndex = m.kind === 'point' && m.point.tier === 'A' ? 2 : 1;
              return (
                <div
                  key={m.key}
                  data-key={m.key}
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    pointerEvents: 'auto',
                    willChange: 'transform',
                    zIndex,
                  }}
                >
                  <MarkerButton m={m} style={{ left: 0, top: 0 }} shown={m.key === shown} onPick={onPick} />
                </div>
              );
            })}
            {seaMarkers.map((sm) => {
              const zIndex = sm.point.id === 'sea-irizar' ? 0 : 2;
              return (
                <div
                  key={sm.key}
                  data-key={sm.key}
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    pointerEvents: 'auto',
                    willChange: 'transform',
                    zIndex,
                  }}
                >
                  <MarkerButton m={sm} style={{ left: 0, top: 0 }} shown={sm.key === shown} onPick={onPick} />
                </div>
              );
            })}
          </>
        )}
      </div>
    </>
  );
}

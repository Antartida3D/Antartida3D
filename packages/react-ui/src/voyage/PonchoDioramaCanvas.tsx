import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { BackSide, BufferAttribute, Color, MeshBasicMaterial, SphereGeometry } from 'three';
import { Canvas, useThree } from '@react-three/fiber';
import { CameraControls, CameraControlsImpl, PerformanceMonitor } from '@react-three/drei';
import { SHOT_DISTANCE, shotPose, type SceneDef } from '@antartida/core';
import { CanvasGuard } from '../CanvasGuard.tsx';
import { ViewShift, type ViewShiftPx } from '../sceneFrame.tsx';
import { buildPolyGeometry } from './lowPoly.ts';
import { DioramaActors } from './PonchoDioramaActors.tsx';
import { DIORAMA_FOG_FAR, buildDioramaWorld } from './ponchoDioramaGround.ts';
import { SKY_HAZE, skyColorAt } from './ponchoSky.ts';
import { vehicleMaterial } from './vehicles.ts';

/**
 * The canvas of the diorama of a stop of Poncho (issue #146): its own WebGL context, open only while
 * the screen is, with the same options as the station of Orcadas (on demand, no shadows, quality that
 * drops on a slow GPU) and the same recovery from a lost context. The camera visits one shot per step
 * of the tour and the visitor can still turn it round and zoom, within limits.
 */

/** How long a lost WebGL context has to come back before the screen gives up and the common card shows. */
const CONTEXT_RESTORE_MS = 4000;
/** Field of view of the camera, as in the station of Orcadas. */
const FOV = 42;
/** The first shot is reached from this much farther and higher, so the visit starts with a zoom in. */
const ENTRY_DISTANCE_FACTOR = 1.7;
const ENTRY_ELEVATION_BONUS_DEG = 14;
/** Seconds the camera takes to settle on a shot (camera-controls smoothTime), and while it is dragged. */
const SHOT_SMOOTH_S = 0.55;
const DRAG_SMOOTH_S = 0.12;
/** How far the visitor can zoom in and out from the stage, and how low or high the camera may go (degrees over the horizon). */
const ZOOM_MIN = SHOT_DISTANCE[0] * 0.55;
const ZOOM_MAX = 22;
const ELEVATION_LIMITS_DEG: readonly [number, number] = [6, 82];
const DEG = Math.PI / 180;

/** Where the fog begins (scene units from the camera): the stage is clear, the far ground fades to the haze of the sky. */
const FOG_NEAR = 55;
/** Radius of the dome of the sky, and how far the camera sees: past the fog, which already hides the ground. */
const SKY_RADIUS = 300;
const CAMERA_FAR = 400;
const skyMaterial = new MeshBasicMaterial({ vertexColors: true, side: BackSide, fog: false, depthWrite: false });

/** A mesh built once per scene, with its geometry freed when it goes. */
function Faces({ geometry }: { geometry: ReturnType<typeof buildPolyGeometry> }) {
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} material={vehicleMaterial} frustumCulled={false} />;
}

/** The sky: a dome with a vertical gradient (skyColorAt), drawn first and never fogged. */
function Sky() {
  const geometry = useMemo(() => {
    const g = new SphereGeometry(SKY_RADIUS, 20, 12);
    const pos = g.getAttribute('position');
    const colors = new Float32Array(pos.count * 3);
    const c = new Color();
    for (let i = 0; i < pos.count; i++) {
      c.setHex(skyColorAt(pos.getY(i) / SKY_RADIUS));
      colors.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new BufferAttribute(colors, 3));
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} material={skyMaterial} renderOrder={-1} frustumCulled={false} />;
}

/** Takes the camera to the shot of the step: with a glide, or at once with reduced motion. */
function ShotCamera({ scene, step, reduced }: { scene: SceneDef; step: number; reduced: boolean }) {
  const controls = useRef<CameraControlsImpl>(null);
  const invalidate = useThree((s) => s.invalidate);
  const entered = useRef(false);

  useLayoutEffect(() => {
    const cc = controls.current;
    if (!cc) return;
    // Turn and zoom with one finger or the left button, pinch or wheel to zoom; no panning: the stage stays in view.
    const { ACTION } = CameraControlsImpl;
    cc.mouseButtons.left = ACTION.ROTATE;
    cc.mouseButtons.right = ACTION.NONE;
    cc.mouseButtons.wheel = ACTION.DOLLY;
    cc.touches.one = ACTION.TOUCH_ROTATE;
    cc.touches.two = ACTION.TOUCH_DOLLY;
    cc.touches.three = ACTION.NONE;
    cc.minDistance = ZOOM_MIN;
    cc.maxDistance = ZOOM_MAX;
    cc.minPolarAngle = (90 - ELEVATION_LIMITS_DEG[1]) * DEG;
    cc.maxPolarAngle = (90 - ELEVATION_LIMITS_DEG[0]) * DEG;
    cc.smoothTime = SHOT_SMOOTH_S;
    cc.draggingSmoothTime = DRAG_SMOOTH_S;
  }, []);

  useEffect(() => {
    const cc = controls.current;
    const shot = scene.shots[Math.min(step, scene.shots.length - 1)];
    if (!cc || !shot) return;
    if (!entered.current) {
      entered.current = true;
      // The visit begins farther and higher, and zooms in to the first shot.
      if (!reduced) {
        const from = shotPose({ ...shot, distance: shot.distance * ENTRY_DISTANCE_FACTOR, elevation: Math.min(80, shot.elevation + ENTRY_ELEVATION_BONUS_DEG) });
        void cc.setLookAt(...from.eye, ...from.target, false);
      }
    }
    const pose = shotPose(shot);
    void cc.setLookAt(...pose.eye, ...pose.target, !reduced);
    invalidate();
  }, [scene, step, reduced, invalidate]);

  return <CameraControls ref={controls} makeDefault />;
}

/** The scene: sky, ground and sea out to the horizon, and the actors, with the camera on its shot. Mounted inside the Canvas. */
function Stage({ scene, step, reduced }: { scene: SceneDef; step: number; reduced: boolean }) {
  const world = useMemo(() => buildDioramaWorld(scene), [scene]);
  const land = useMemo(() => buildPolyGeometry(world.land), [world]);
  const sea = useMemo(() => (world.sea.length ? buildPolyGeometry(world.sea) : null), [world]);
  return (
    <>
      <fog attach="fog" args={[SKY_HAZE, FOG_NEAR, DIORAMA_FOG_FAR]} />
      <Sky />
      <Faces geometry={land} />
      {sea && <Faces geometry={sea} />}
      <DioramaActors scene={scene} step={step} ground={world.ground} reduced={reduced} />
      <ShotCamera scene={scene} step={step} reduced={reduced} />
    </>
  );
}

export function PonchoDioramaCanvas({ scene, step, reduced, shift, onLost }: {
  scene: SceneDef;
  step: number;
  reduced: boolean;
  /** Pixels the centre of the view moves, so the stage stays in what the panel leaves free. */
  shift: ViewShiftPx;
  /** The WebGL context was lost and did not come back: the screen gives way to the common card. */
  onLost: () => void;
}) {
  const [lowQuality, setLowQuality] = useState(false);
  const lost = useRef(onLost);
  lost.current = onLost;
  const fallbackTimer = useRef(0);
  // Closing the screen cancels the wait: a context that went with it is not a failure.
  useEffect(() => () => window.clearTimeout(fallbackTimer.current), []);
  const first = shotPose(scene.shots[0]);
  return (
    <CanvasGuard onFail={() => lost.current()}>
      <Canvas
        className="pdio-canvas"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', background: `#${SKY_HAZE.toString(16)}` }}
        frameloop="demand"
        // Low quality also renders fewer pixels, as in the station of Orcadas.
        dpr={lowQuality ? 0.7 : 1}
        shadows={false}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        camera={{ fov: FOV, near: 0.1, far: CAMERA_FAR, position: first.eye }}
        onCreated={({ gl }) => {
          const dom = gl.domElement;
          // A browser may drop the context of a page in the background and give it back on return: wait for it.
          dom.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            fallbackTimer.current = window.setTimeout(() => lost.current(), CONTEXT_RESTORE_MS);
          });
          dom.addEventListener('webglcontextrestored', () => window.clearTimeout(fallbackTimer.current));
        }}
      >
        {/* Reduced motion draws on demand: sparse frames would read as a slow GPU. */}
        {!reduced && <PerformanceMonitor bounds={() => (lowQuality ? [24, 27] : [36, 42])} flipflops={4} onIncline={() => setLowQuality(false)} onDecline={() => setLowQuality(true)} />}
        <ViewShift shift={shift} />
        <Stage scene={scene} step={step} reduced={reduced} />
      </Canvas>
    </CanvasGuard>
  );
}

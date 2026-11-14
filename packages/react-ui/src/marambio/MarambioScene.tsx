import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { BackSide, Box3, CircleGeometry, MeshBasicMaterial, ShaderMaterial, SphereGeometry, Vector2, Vector3 } from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { CameraControls } from '@react-three/drei';
import { EffectComposer } from '@react-three/postprocessing';
import {
  DIORAMA_METERS_PER_UNIT,
  HERCULES_LENGTH_M,
  MARAMBIO_ELEMENTS,
  MARAMBIO_HERCULES,
  MARAMBIO_SPOTS,
  marambioLayoutOf,
  type MarambioSpotId,
} from '@antartida/core';
import { InkEffect } from '../map3d/InkEffect.ts';
import { buildModuleTris, buildRadioTowerTris } from '../orcadas/lowPolyBuildings.ts';
import { stationSkyFragmentShader, stationSkyVertexShader } from '../orcadas/stationSky.glsl.ts';
import { HERCULES_PARKED_POLY } from '../voyage/herculesModel.ts';
import { ICEBERG_DRAFT, ICEBERG_PEAKS_POLY, ICEBERG_TABULAR_POLY, waterline, waterMaterial } from '../voyage/icebergs.ts';
import { boxShade, buildPolyGeometry, scaled, shift, turn, type Tri, type Vec3 } from '../voyage/lowPoly.ts';
import { vehicleMaterial } from '../voyage/vehicles.ts';
import { canUseWebGL, CONTEXT_RESTORE_MS } from '../webgl.ts';
import { buildHangarTris, buildMarambioWalkwaysTris, buildTerminalTris } from './lowPolyMarambio.ts';
import { buildMarambioGroundTris, buildMarambioRocksTris, buildMarambioSurfacesTris } from './marambioGround.ts';
import { MarambioFallback } from './MarambioFallback.tsx';
import { poseForSpot, SPOT_VIEWS, VIEW_BOUNDARY, VIEW_ELEVATION_DEG, VIEW_MAX_DISTANCE, VIEW_MIN_DISTANCE } from './spots.ts';

export interface MarambioSceneProps {
  focus: MarambioSpotId | null;
  reduced: boolean;
  /** The phone sheet is at its tall size. */
  sheetTall: boolean;
  /** The panel is a card on the right side (wide screens). */
  sidePanel: boolean;
  overlayRef: RefObject<HTMLDivElement | null>;
}

/**
 * One sun for the whole model, low in the north-west (towards -x and -z, the side the base is
 * first seen from): the fixed face light of the block models, turned to face it. The geometry is
 * merged in world space, so every building is lit from the same side whatever its bearing.
 */
const sceneShade = (n: Vec3) => boxShade([-n[0], n[1], -n[2]]);
const SUN_DIR = new Vector3(-0.42, 0.6, -0.68).normalize();
const SEA = 0x44718f;
const SKY_RADIUS = 320;

/** Everything that stands still, in world space: ground, runway, walkways, buildings and the aircraft. */
function buildStageTris(): Tri[] {
  const out: Tri[] = [...buildMarambioGroundTris(), ...buildMarambioSurfacesTris(), ...buildMarambioRocksTris(), ...buildMarambioWalkwaysTris()];
  for (const e of MARAMBIO_ELEMENTS) {
    const { position, rotationY, footprint } = marambioLayoutOf(e.id);
    const [length, width] = footprint;
    const height = e.heightM / DIORAMA_METERS_PER_UNIT;
    let local: Tri[];
    switch (e.kind) {
      case 'hangar':
        local = buildHangarTris(length, width, height);
        break;
      case 'terminal':
        local = buildTerminalTris(length, width, height);
        break;
      case 'module':
        local = buildModuleTris(length, width, height, e.colour, e.roof);
        break;
      case 'commTower':
        local = buildRadioTowerTris(height);
        break;
      default:
        continue;
    }
    out.push(...shift(turn(local, rotationY), position[0], position[1], position[2]));
  }
  const plane = scaled(HERCULES_PARKED_POLY, HERCULES_LENGTH_M / DIORAMA_METERS_PER_UNIT);
  const [px, py, pz] = MARAMBIO_HERCULES.position;
  out.push(...shift(turn(plane, MARAMBIO_HERCULES.rotationY), px, py, pz));
  return out;
}

function Stage() {
  const geo = useMemo(() => buildPolyGeometry(buildStageTris(), sceneShade), []);
  useEffect(() => () => geo.dispose(), [geo]);
  return <mesh geometry={geo} material={vehicleMaterial} />;
}

function Sky() {
  const geo = useMemo(() => new SphereGeometry(SKY_RADIUS, 32, 20), []);
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: stationSkyVertexShader,
        fragmentShader: stationSkyFragmentShader,
        uniforms: {
          uSunDir: { value: SUN_DIR },
          uCloudCover: { value: 0.35 },
          uTime: { value: 0 },
          uWindVec: { value: new Vector2(0.6, 0.2) },
        },
        side: BackSide,
        depthWrite: false,
      }),
    []
  );
  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat]
  );
  return <mesh geometry={geo} material={mat} renderOrder={-1} />;
}

/** Icebergs of the sea round the plateau: [x, z, size, turn, tabular]. Illustrative. */
const ICEBERGS: readonly (readonly [number, number, number, number, boolean])[] = [
  [-84, 38, 15, 0.4, true],
  [72, 62, 11, 2.1, false],
  [-30, 78, 9, 1.2, false],
  [96, -8, 13, 3.0, true],
  [18, -62, 12, 0.9, true],
  [-92, -34, 9, 4.2, false],
];

function Sea() {
  const sea = useMemo(() => new CircleGeometry(SKY_RADIUS, 48), []);
  const seaMat = useMemo(() => new MeshBasicMaterial({ color: SEA }), []);
  const bergs = useMemo(
    () => ({
      tabular: buildPolyGeometry(ICEBERG_TABULAR_POLY, sceneShade),
      peaks: buildPolyGeometry(ICEBERG_PEAKS_POLY, sceneShade),
      lines: { tabular: waterline('iceberg-lg'), peaks: waterline('iceberg-sm') },
      water: waterMaterial(),
    }),
    []
  );
  useEffect(
    () => () => {
      sea.dispose();
      seaMat.dispose();
      bergs.tabular.dispose();
      bergs.peaks.dispose();
      for (const w of Object.values(bergs.lines)) {
        w.glow.dispose();
        w.foam.dispose();
        w.ripple.dispose();
      }
      bergs.water.dispose();
    },
    [sea, seaMat, bergs]
  );
  return (
    <>
      <mesh geometry={sea} material={seaMat} rotation={[-Math.PI / 2, 0, 0]} />
      {ICEBERGS.map(([x, z, size, angle, tabular], i) => {
        const kind = tabular ? 'tabular' : 'peaks';
        return (
          <group key={i} position={[x, 0, z]} rotation={[0, angle, 0]} scale={size}>
            <mesh geometry={bergs.lines[kind].glow} material={bergs.water} position={[0, 0.002, 0]} renderOrder={1} />
            <mesh geometry={bergs.lines[kind].foam} material={bergs.water} position={[0, 0.004, 0]} renderOrder={2} />
            <mesh geometry={bergs[kind]} material={vehicleMaterial} position={[0, -ICEBERG_DRAFT, 0]} />
          </group>
        );
      })}
    </>
  );
}

function CameraAndDots({ focus, reduced, sheetTall, sidePanel, overlayRef }: MarambioSceneProps) {
  const controlsRef = useRef<CameraControls>(null);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const started = useRef(false);
  const placed = useRef(false);
  const ready = useRef(false);
  const lastPos = useRef(new Vector3(Infinity, 0, 0));
  const lastSize = useRef({ width: 0, height: 0 });
  const buttons = useRef(new Map<string, HTMLElement>());
  const projected = useMemo(() => new Vector3(), []);

  const portrait = size.width < 900 && size.height > size.width;

  useLayoutEffect(() => {
    const cc = controlsRef.current;
    if (!cc) return;
    (window as unknown as { __marambioCamera?: CameraControls }).__marambioCamera = cc;
    const deg = Math.PI / 180;
    cc.minPolarAngle = (90 - VIEW_ELEVATION_DEG[1]) * deg;
    cc.maxPolarAngle = (90 - VIEW_ELEVATION_DEG[0]) * deg;
    cc.minDistance = VIEW_MIN_DISTANCE;
    cc.maxDistance = VIEW_MAX_DISTANCE;
    cc.smoothTime = 0.32;
    // The point looked at stays over the plateau, so the model cannot be dragged out of view.
    cc.setBoundary(new Box3(new Vector3(...VIEW_BOUNDARY.min), new Vector3(...VIEW_BOUNDARY.max)));

    const pose = poseForSpot(focus, portrait, sheetTall, sidePanel);
    placed.current = false;
    const first = !started.current;
    if (first) {
      // Every visit starts from the same view, without an entry flight.
      started.current = true;
      camera.position.set(...pose.pos);
      camera.lookAt(new Vector3(...pose.target));
      camera.updateMatrixWorld(true);
    }
    void cc.setLookAt(...pose.pos, ...pose.target, !first && !reduced);
    invalidate();
  }, [focus, portrait, sheetTall, sidePanel, reduced, camera, invalidate]);

  // Keyboard: arrows orbit, + and - zoom.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Browser shortcuts (zoom with Ctrl and +) and the keys of the panel, which scrolls, stay theirs.
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName) || el.closest?.('.orc-panel-scroll'))) return;
      const cc = controlsRef.current;
      if (!cc) return;
      const smooth = !reduced;
      if (e.key === 'ArrowLeft') void cc.rotate(-0.18, 0, smooth);
      else if (e.key === 'ArrowRight') void cc.rotate(0.18, 0, smooth);
      else if (e.key === 'ArrowUp') void cc.rotate(0, -0.12, smooth);
      else if (e.key === 'ArrowDown') void cc.rotate(0, 0.12, smooth);
      else if (e.key === '+' || e.key === '=') void cc.dollyTo(Math.max(cc.minDistance, cc.distance * 0.8), smooth);
      else if (e.key === '-' || e.key === '_') void cc.dollyTo(Math.min(cc.maxDistance, cc.distance * 1.25), smooth);
      else return;
      invalidate();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [reduced, invalidate]);

  // The phone sheet changes height without the camera moving: place the dots again.
  useEffect(() => {
    const panel = document.querySelector('.mar .orc-panel');
    if (!panel) return;
    const ro = new ResizeObserver(() => {
      placed.current = false;
      invalidate();
    });
    ro.observe(panel);
    return () => ro.disconnect();
  }, [sidePanel, invalidate]);

  useFrame(() => {
    const cc = controlsRef.current;
    const moving = Boolean(cc?.active);
    if (moving) invalidate();
    const overlay = overlayRef.current;
    if (!overlay) {
      invalidate();
      return;
    }
    const map = buttons.current;
    if (map.size !== MARAMBIO_SPOTS.length) {
      map.clear();
      for (const spot of MARAMBIO_SPOTS) {
        const btn = overlay.querySelector<HTMLElement>(`[data-hotspot="${spot.id}"]`);
        if (btn) map.set(spot.id, btn);
      }
      if (map.size === 0) {
        invalidate();
        return;
      }
    }
    const sized = lastSize.current.width !== size.width || lastSize.current.height !== size.height;
    if (placed.current && !moving && !sized && lastPos.current.distanceToSquared(camera.position) < 1e-5) return;
    placed.current = true;
    lastPos.current.copy(camera.position);
    lastSize.current = { width: size.width, height: size.height };

    // Dots stay clear of the top bar and of the panel: above the sheet on a phone, left of the card elsewhere.
    const box = overlay.getBoundingClientRect();
    const panel = document.querySelector('.mar .orc-panel')?.getBoundingClientRect();
    const minY = 96;
    const maxY = panel && !sidePanel ? panel.top - box.top - 26 : size.height - 60;
    const maxX = panel && sidePanel ? panel.left - box.left - 30 : size.width - 30;
    for (const spot of MARAMBIO_SPOTS) {
      const btn = map.get(spot.id);
      if (!btn) continue;
      projected.set(...SPOT_VIEWS[spot.id].worldPos).project(camera);
      const sx = ((projected.x + 1) * size.width) / 2;
      const sy = ((1 - projected.y) * size.height) / 2;
      const inside = projected.z < 1 && sx >= 30 && sx <= maxX && sy >= minY && sy <= maxY;
      if (!inside && spot.id !== focus) {
        btn.style.opacity = '0';
        btn.style.pointerEvents = 'none';
        continue;
      }
      const x = Math.max(30, Math.min(maxX, sx));
      const y = Math.max(minY, Math.min(Math.max(minY, maxY), sy));
      btn.style.opacity = '1';
      btn.style.pointerEvents = 'auto';
      btn.style.left = '0px';
      btn.style.top = '0px';
      btn.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0px) translate(-50%, -50%)`;
    }
    if (!ready.current) {
      ready.current = true;
      // The dots show once they stand on the scene, not before it is drawn (marambio.css).
      overlay.dataset.ready = "true";
      (window as unknown as { __marambioReady?: boolean }).__marambioReady = true;
    }
  });

  return <CameraControls ref={controlsRef} makeDefault dollyToCursor />;
}

export const MarambioScene = memo(function MarambioScene(props: MarambioSceneProps) {
  const [webglOk, setWebglOk] = useState(() => canUseWebGL());
  const { overlayRef } = props;
  // When a lost context turns the scene into the drawing, the dots go back to their places over it:
  // what the 3D scene wrote on them is cleared.
  useLayoutEffect(() => {
    if (webglOk) return;
    for (const btn of overlayRef.current?.querySelectorAll<HTMLElement>('[data-hotspot]') ?? []) {
      for (const prop of ['left', 'top', 'transform', 'opacity', 'pointer-events']) btn.style.removeProperty(prop);
    }
  }, [webglOk, overlayRef]);
  if (!webglOk) return <MarambioFallback />;
  const start = poseForSpot(props.focus, false, false, props.sidePanel);
  return (
    <div className="orc-scene-wrap" aria-hidden="true">
      <Canvas
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', background: 'var(--paper, #F3EBDD)' }}
        // Nothing moves but the camera: frames are drawn only when it does.
        frameloop="demand"
        dpr={[1, 1.5]}
        shadows={false}
        gl={{ antialias: true, powerPreference: 'high-performance', alpha: false, preserveDrawingBuffer: true }}
        camera={{ fov: 42, near: 0.5, far: 900, position: [start.pos[0], start.pos[1], start.pos[2]] }}
        onCreated={({ gl, invalidate }) => {
          const dom = gl.domElement;
          let fallbackTimer = 0;
          dom.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            fallbackTimer = window.setTimeout(() => setWebglOk(false), CONTEXT_RESTORE_MS);
          });
          // Nothing else draws a frame on its own: without this the canvas would stay empty.
          dom.addEventListener('webglcontextrestored', () => {
            window.clearTimeout(fallbackTimer);
            invalidate();
          });
        }}
      >
        <Sky />
        <Sea />
        <Stage />
        <EffectComposer multisampling={0}>
          <InkEffect />
        </EffectComposer>
        <CameraAndDots {...props} />
      </Canvas>
    </div>
  );
});

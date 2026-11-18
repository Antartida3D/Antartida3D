import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { BackSide, Box3, CircleGeometry, MeshBasicMaterial, ShaderMaterial, SphereGeometry, Vector2, Vector3 } from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { CameraControls } from '@react-three/drei';
import { EffectComposer } from '@react-three/postprocessing';
import { CanvasGuard } from '../CanvasGuard.tsx';
import { InkEffect } from '../map3d/InkEffect.ts';
import { useMapGestures } from '../map3d/useMapGestures.ts';
import { SEA_ICE_FLOE_POLY_VARIANTS } from '../orcadas/lowPolyProps.ts';
import { stationSkyFragmentShader, stationSkyVertexShader } from '../orcadas/stationSky.glsl.ts';
import { ICEBERG_DRAFT, ICEBERG_PEAKS_POLY, ICEBERG_TABULAR_POLY, waterline, waterMaterial } from '../voyage/icebergs.ts';
import { boxShade, buildPolyGeometry, type Tri, type Vec3 } from '../voyage/lowPoly.ts';
import { vehicleMaterial } from '../voyage/vehicles.ts';
import { ViewShift, type ViewShiftPx } from '../sceneFrame.tsx';
import { canUseWebGL, CONTEXT_RESTORE_MS } from '../webgl.ts';
import { poseOf, type SceneFloe, type SceneIceberg, type SpotView } from './sceneView.ts';

/** Where the camera may go: the point it looks at stays in `boundary`, so the scene cannot be dragged away. */
export interface SceneLimits {
  boundary: readonly [Vec3, Vec3];
  minDistance: number;
  maxDistance: number;
  /** Camera elevation over the horizon, in degrees. */
  minElevationDeg: number;
  maxElevationDeg: number;
}

export interface PointScene3DProps<S extends string> {
  spots: readonly { id: S }[];
  views: Readonly<Record<S, SpotView>>;
  focus: S;
  reduced: boolean;
  /** The panel is a card on the right side (wide screens). */
  sidePanel: boolean;
  overlayRef: RefObject<HTMLDivElement | null>;
  /** WebGL is missing or was lost: the screen shows the visit in words. */
  onNoWebGL: () => void;
  /** Moves the view into the part of the screen the bar and the panel leave free. */
  shift: ViewShiftPx;
  /** Everything that stands still; called once. */
  stage: () => Tri[];
  icebergs?: readonly SceneIceberg[];
  floes?: readonly SceneFloe[];
  limits: SceneLimits;
  /** The moving parts of the scene, inside the canvas. */
  children?: ReactNode;
}

/** One sun for the whole scene, low in the north (behind the land, as in the southern summer at noon). */
export const sceneShade = (n: Vec3) => boxShade([-n[0], n[1], -n[2]]);
const SUN_DIR = new Vector3(0.3, 0.42, -0.85).normalize();
const SEA = 0x44718f;
const SKY_RADIUS = 340;
const DEG = Math.PI / 180;

function Sky() {
  const geo = useMemo(() => new SphereGeometry(SKY_RADIUS, 32, 20), []);
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: stationSkyVertexShader,
        fragmentShader: stationSkyFragmentShader,
        uniforms: {
          uSunDir: { value: SUN_DIR.clone() },
          uCloudCover: { value: 0.3 },
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

/** The sea, the icebergs (free ones with their waterline, the ones held in the ice without) and the pack ice. */
function SeaAndIce({ icebergs, floes }: { icebergs: readonly SceneIceberg[]; floes: readonly SceneFloe[] }) {
  const sea = useMemo(() => new CircleGeometry(SKY_RADIUS, 48), []);
  const seaMat = useMemo(() => new MeshBasicMaterial({ color: SEA }), []);
  const ice = useMemo(
    () => ({
      tabular: buildPolyGeometry(ICEBERG_TABULAR_POLY, sceneShade),
      peaks: buildPolyGeometry(ICEBERG_PEAKS_POLY, sceneShade),
      lines: { tabular: waterline('iceberg-lg'), peaks: waterline('iceberg-sm') },
      floes: SEA_ICE_FLOE_POLY_VARIANTS.map((v) => buildPolyGeometry(v.tris, sceneShade)),
      floeLines: SEA_ICE_FLOE_POLY_VARIANTS.map((v) => v.createWaterline()),
      water: waterMaterial(),
    }),
    []
  );
  useEffect(
    () => () => {
      sea.dispose();
      seaMat.dispose();
      ice.tabular.dispose();
      ice.peaks.dispose();
      for (const w of Object.values(ice.lines)) {
        w.glow.dispose();
        w.foam.dispose();
        w.ripple.dispose();
      }
      for (const g of [...ice.floes, ...ice.floeLines]) g.dispose();
      ice.water.dispose();
    },
    [sea, seaMat, ice]
  );
  return (
    <>
      <mesh geometry={sea} material={seaMat} rotation={[-Math.PI / 2, 0, 0]} />
      {icebergs.map(([x, z, size, angle, tabular, held], i) => {
        const kind = tabular ? 'tabular' : 'peaks';
        return (
          <group key={i} position={[x, 0, z]} rotation={[0, angle, 0]} scale={size}>
            {!held && <mesh geometry={ice.lines[kind].glow} material={ice.water} position={[0, 0.002, 0]} renderOrder={1} />}
            {!held && <mesh geometry={ice.lines[kind].foam} material={ice.water} position={[0, 0.004, 0]} renderOrder={2} />}
            <mesh geometry={ice[kind]} material={vehicleMaterial} position={[0, -ICEBERG_DRAFT, 0]} />
          </group>
        );
      })}
      {floes.map(([x, z, size, angle, variant], i) => (
        <group key={`f${i}`} position={[x, 0, z]} rotation={[0, angle, 0]} scale={size}>
          <mesh geometry={ice.floeLines[variant]} material={ice.water} position={[0, 0.003, 0]} renderOrder={1} />
          <mesh geometry={ice.floes[variant]} material={vehicleMaterial} />
        </group>
      ))}
    </>
  );
}

function Stage({ build }: { build: () => Tri[] }) {
  const geo = useMemo(() => buildPolyGeometry(build(), sceneShade), [build]);
  useEffect(() => () => geo.dispose(), [geo]);
  return <mesh geometry={geo} material={vehicleMaterial} />;
}

/** On a portrait phone the view is narrow: the camera stands farther back to keep the scene in it. */
const PORTRAIT_FARTHER = 1.6;

type CameraProps<S extends string> = Pick<PointScene3DProps<S>, 'spots' | 'views' | 'focus' | 'reduced' | 'sidePanel' | 'overlayRef' | 'limits'>;

function CameraAndDots<S extends string>({ spots, views, focus, reduced, sidePanel, overlayRef, limits }: CameraProps<S>) {
  const controlsRef = useRef<CameraControls>(null);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const started = useRef(false);
  const ready = useRef(false);
  const projected = useMemo(() => new Vector3(), []);
  const portrait = size.width < 900 && size.height > size.width;

  const boundary = useMemo(() => new Box3(new Vector3(...limits.boundary[0]), new Vector3(...limits.boundary[1])), [limits]);
  useMapGestures(controlsRef, {
    minPolarAngle: (90 - limits.maxElevationDeg) * DEG,
    maxPolarAngle: (90 - limits.minElevationDeg) * DEG,
    minDistance: limits.minDistance,
    maxDistance: limits.maxDistance,
    smoothTime: 0.32,
    boundary,
    invalidate,
  });

  useLayoutEffect(() => {
    const cc = controlsRef.current;
    if (!cc) return;
    (window as unknown as { __scenePointCamera?: CameraControls }).__scenePointCamera = cc;
    const view = views[focus];
    const { pos, target } = poseOf(portrait ? { ...view, distance: view.distance * PORTRAIT_FARTHER } : view);
    const first = !started.current;
    if (first) {
      started.current = true;
      camera.position.set(...pos);
      camera.lookAt(new Vector3(...target));
      camera.updateMatrixWorld(true);
    }
    void cc.setLookAt(...pos, ...target, !first && !reduced);
    cc.normalizeRotations();
    invalidate();
  }, [focus, views, portrait, reduced, camera, invalidate]);

  useFrame(() => {
    const cc = controlsRef.current;
    if (cc?.active) invalidate();
    const overlay = overlayRef.current;
    if (!overlay) return;
    // Dots stay clear of the top bar and of the panel: above the sheet on a phone, left of the card elsewhere.
    const box = overlay.getBoundingClientRect();
    const panel = overlay.parentElement?.querySelector('.orc-panel')?.getBoundingClientRect();
    const minY = 96;
    const maxY = panel && !sidePanel ? panel.top - box.top - 26 : size.height - 60;
    const maxX = panel && sidePanel ? panel.left - box.left - 30 : size.width - 30;
    camera.updateMatrixWorld();
    for (const spot of spots) {
      const btn = overlay.querySelector<HTMLElement>(`[data-hotspot="${spot.id}"]`);
      if (!btn) continue;
      projected.set(...views[spot.id].worldPos).project(camera);
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
      overlay.dataset.ready = 'true';
      (window as unknown as { __scenePointReady?: boolean }).__scenePointReady = true;
    }
  });

  return <CameraControls ref={controlsRef} makeDefault dollyToCursor />;
}

/**
 * The 3D scene of a point of interest with a scene of its own (#206, #280): sky, sea and ice, its
 * stage, its moving parts, the ink effect and a camera that flies to each spot. Inside CanvasGuard:
 * if the canvas fails, the screen goes on in words (onNoWebGL).
 */
export function PointScene3D<S extends string>(props: PointScene3DProps<S>) {
  const [webglOk, setWebglOk] = useState(() => canUseWebGL());
  const { onNoWebGL } = props;
  useEffect(() => {
    if (!webglOk) onNoWebGL();
  }, [webglOk, onNoWebGL]);
  if (!webglOk) return null;
  const start = poseOf(props.views[props.focus]);
  return (
    <div className="orc-scene-wrap" aria-hidden="true">
      <CanvasGuard onFail={() => setWebglOk(false)}>
        <Canvas
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', background: 'var(--paper, #F3EBDD)' }}
          frameloop="demand"
          dpr={[1, 1.5]}
          gl={{ antialias: true, powerPreference: 'high-performance', alpha: false, preserveDrawingBuffer: true }}
          camera={{ fov: 42, near: 0.3, far: 900, position: start.pos }}
          onCreated={({ gl, invalidate }) => {
            const dom = gl.domElement;
            let fallbackTimer = 0;
            dom.addEventListener('webglcontextlost', (e) => {
              e.preventDefault();
              fallbackTimer = window.setTimeout(() => setWebglOk(false), CONTEXT_RESTORE_MS);
            });
            dom.addEventListener('webglcontextrestored', () => {
              window.clearTimeout(fallbackTimer);
              invalidate();
            });
          }}
        >
          <Sky />
          <SeaAndIce icebergs={props.icebergs ?? []} floes={props.floes ?? []} />
          <Stage build={props.stage} />
          {props.children}
          <ViewShift shift={props.shift} />
          <EffectComposer multisampling={0}>
            <InkEffect />
          </EffectComposer>
          <CameraAndDots
            spots={props.spots}
            views={props.views}
            focus={props.focus}
            reduced={props.reduced}
            sidePanel={props.sidePanel}
            overlayRef={props.overlayRef}
            limits={props.limits}
          />
        </Canvas>
      </CanvasGuard>
    </div>
  );
}

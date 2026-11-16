import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';
import {
  BackSide,
  Box3,
  BufferAttribute,
  BufferGeometry,
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PlaneGeometry,
  ShaderMaterial,
  SphereGeometry,
  Vector2,
  Vector3,
} from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { CameraControls, PerformanceMonitor } from '@react-three/drei';
import { EffectComposer } from '@react-three/postprocessing';
import {
  ARRIVAL_SECONDS,
  DEPARTURE_SECONDS,
  ORCADAS_LAT,
  DIORAMA_METERS_PER_UNIT,
  DIORAMA_PROP_SCALE,
  DIORAMA_ELEMENTS,
  arrivalFinalPose,
  arrivalScene,
  helicopterDeparture,
  helicopterLanding,
  layoutOf,
  worldCoastDistance,
  midMonthDayOfYear,
  orcadasWind,
  shouldLightWindows,
  shouldTick,
  solarAzimuthDeg,
  solarElevationDeg,
  zodiacApproach,
  zodiacDeparture,
  type ArrivalId,
  type ArrivalPoint,
  type ArrivalPose,
  type BuildingId,
} from '@antartida/core';
import { InkEffect } from '../map3d/InkEffect.ts';
import { useMapGestures } from '../map3d/useMapGestures.ts';
import { ctrlZoomWheelDelta, dispatchWheelAtCenter, isFormControlTarget } from '../keyboardWheel.ts';
import {
  ICEBERG_DRAFT,
  ICEBERG_PEAKS_POLY,
  ICEBERG_RIPPLE_SECONDS,
  ICEBERG_RIPPLES,
  ICEBERG_TABULAR_POLY,
  icebergSwell,
  rippleAt,
  waterline,
  waterMaterial,
} from '../voyage/icebergs.ts';
import { boxShade, buildPolyGeometry, type Tri } from '../voyage/lowPoly.ts';
import { vehicleMaterial } from '../voyage/vehicles.ts';
import { canUseWebGL, CONTEXT_RESTORE_MS } from '../webgl.ts';
import {
  HOTSPOTS,
  VIEW_BEARING_DEG,
  VIEW_ELEVATION_DEG,
  VIEW_MAX_ZOOM_OUT,
  VIEW_ORBIT_DEG,
  poseForHotspot,
  type CameraPose,
  type HotspotId,
} from './Hotspots.tsx';
import { StationFallback } from './StationFallback.tsx';
import { PenguinColony } from './PenguinColony.tsx';
import {
  PENGUIN_SWIM_CLEARANCE,
  beachPoint,
  buildPenguinRoute,
  penguinSwimCorridor,
} from './penguins.ts';
import {
  SCREEN_DOOR_DURATION,
  SCREEN_DOOR_HINGE,
  buildFlagpoleBaseTris,
  buildHelipadTris,
  buildModuleTris,
  buildOmondTris,
  buildRadioTowerTris,
  buildStevensonDoorTris,
  buildStevensonInstrumentsTris,
  buildStevensonScreenTris,
  buildWindMastBaseTris,
  clamp01,
  screenDoorAngle,
  smooth01,
} from './lowPolyBuildings.ts';
import {
  SEA_ICE_FLOE_POLY_VARIANTS,
  buildBoatChocksTris,
  buildHelicopterRotorTris,
  buildHelicopterTris,
  buildSnowPuffTris,
  buildZodiacTris,
  buildZodiacWakeGeometry,
  buildZodiacWaterlineGeometry,
  zodiacBottomY,
} from './lowPolyProps.ts';
import {
  buildElephantSealPolyParts,
  buildSealContactGeometry,
  buildWeddellSealPolyParts,
} from './lowPolyAnimals.ts';
import {
  HELICOPTER_ROTOR_ORIGIN,
  HELIPAD_TOP_Y,
  buildStageDetailTris,
  createIsthmusTerrainGeometry,
  evaluateIsthmusTerrain,
  generateIcebergs,
  floeVisibility,
  generateSeaIcePlates,
  type SeaIcePlate,
} from './stationModels.ts';
import { icebergDriftAt } from './icebergDrift.ts';
import {
  CAMERA_TRANSITION_SECONDS,
  ERA_MIN_SCALE,
  ERA_VISIBLE_THRESHOLD,
  stepEraPresence,
} from './lifeDetails.ts';
import { LifeDetails } from './LifeDetails.tsx';
import { StationSnowfall } from './WeatherDetails.tsx';
import { WindDetails, WindFlag, WindMastInstruments } from './WindDetails.tsx';
import {
  ELEPHANT_FLIPPER_L,
  ELEPHANT_FLIPPER_R,
  ELEPHANT_JAW,
  ELEPHANT_NECK,
  ELEPHANT_TAIL,
  WEDDELL_FLIPPER_L,
  WEDDELL_FLIPPER_R,
  WEDDELL_NECK,
  WEDDELL_TAIL,
  buildSealColony,
  residentPose as sealResidentPose,
  restPose as restSealPose,
  travellerPose as sealTravellerPose,
  type SealPose,
} from './seals.ts';
import {
  stationSkyFragmentShader,
  stationSkyVertexShader,
  stationTerrainFragmentShader,
  stationTerrainVertexShader,
  stationWaterFragmentShader,
  stationWaterVertexShader,
} from './stationSky.glsl.ts';

export interface StationSceneProps {
  arrival?: ArrivalId;
  month: number;
  hour: number;
  windKmh: number;
  windDirDeg: number;
  cloudOktas: number;
  seaIce: number;
  buildings: readonly BuildingId[];
  animals: readonly string[];
  focus: HotspotId | null;
  reduced: boolean;
  screenOpen?: boolean;
  leaving?: boolean;
  panelExpanded?: boolean;
  panelHidden?: boolean;
  onReady?: () => void;
  onDepartureDone?: () => void;
  overlayRef?: RefObject<HTMLDivElement | null>;
}

function computeSunDirection(month: number, hour: number): {
  dir: Vector3;
  elevationDeg: number;
} {
  const doy = midMonthDayOfYear(month);
  const elDeg = solarElevationDeg(ORCADAS_LAT, doy, hour);
  const azDeg = solarAzimuthDeg(ORCADAS_LAT, doy, hour);
  const elRad = (elDeg * Math.PI) / 180;
  const azRad = (azDeg * Math.PI) / 180;
  const cosEl = Math.cos(elRad);
  const x = cosEl * Math.sin(azRad);
  const y = Math.sin(elRad);
  const z = -cosEl * Math.cos(azRad);
  return {
    dir: new Vector3(x, y, z).normalize(),
    elevationDeg: elDeg,
  };
}

function computeWindVector(windDirDeg: number, windKmh: number): Vector2 {
  const {
    toDir: [toX, toZ],
  } = orcadasWind(windDirDeg, windKmh);
  const speedNorm = Math.min(2.5, Math.max(0.05, windKmh / 28));
  return new Vector2(toX * speedNorm, toZ * speedNorm);
}

function SkyAndLighting({
  sunDir,
  sunElevationDeg,
  cloudOktas,
  windVec,
  reduced,
}: {
  sunDir: Vector3;
  sunElevationDeg: number;
  cloudOktas: number;
  windVec: Vector2;
  reduced: boolean;
}) {
  const skyGeo = useMemo(() => new SphereGeometry(96, 32, 20), []);
  const uniforms = useMemo(
    () => ({
      uSunDir: { value: new Vector3(0, 0.5, -0.8) },
      uCloudCover: { value: 0.5 },
      uTime: { value: 0 },
      uWindVec: { value: new Vector2(0.5, 0) },
    }),
    []
  );

  const skyMat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: stationSkyVertexShader,
        fragmentShader: stationSkyFragmentShader,
        uniforms,
        side: BackSide,
        depthWrite: false,
      }),
    [uniforms]
  );

  useEffect(() => {
    return () => {
      skyGeo.dispose();
      skyMat.dispose();
    };
  }, [skyGeo, skyMat]);

  useLayoutEffect(() => {
    uniforms.uSunDir.value.copy(sunDir);
    uniforms.uCloudCover.value = Math.max(0, Math.min(1, cloudOktas / 8));
    uniforms.uWindVec.value.copy(windVec);
  }, [sunDir, cloudOktas, windVec, uniforms]);

  useFrame(({ clock }) => {
    if (!reduced) {
      uniforms.uTime.value = clock.getElapsedTime();
    }
  });

  const dayRatio = Math.max(0, Math.min(1, (sunElevationDeg + 6) / 28));
  const cloudAtten = 1 - (cloudOktas / 8) * 0.38;
  const dirIntensity = (0.35 + dayRatio * 1.25) * cloudAtten;
  const ambIntensity = 0.48 + dayRatio * 0.45;
  const lightPos: [number, number, number] = [
    sunDir.x * 42,
    Math.max(8, sunDir.y * 42),
    sunDir.z * 42,
  ];

  return (
    <>
      <mesh geometry={skyGeo} material={skyMat} renderOrder={-1} />
      <ambientLight
        intensity={ambIntensity}
        color={dayRatio > 0.25 ? '#F3EBDD' : '#7FA8C4'}
      />
      <hemisphereLight
        args={[
          dayRatio > 0.25 ? '#DCE8EF' : '#385A7C',
          '#6E6459',
          0.45 + dayRatio * 0.25,
        ]}
      />
      <directionalLight
        position={lightPos}
        intensity={dirIntensity}
        color={sunElevationDeg < 6 ? '#E8A864' : '#FFF7E8'}
      />
    </>
  );
}

/** Paths, loose rocks and snow patches of the stage: low-poly ground details in one geometry. */
function StageDetails() {
  const geo = useMemo(() => buildPolyGeometry(buildStageDetailTris(), boxShade), []);
  useEffect(() => () => geo.dispose(), [geo]);
  return <mesh geometry={geo} material={vehicleMaterial} />;
}

function IsthmusTerrain({
  sunDir,
  sunElevationDeg,
}: {
  sunDir: Vector3;
  sunElevationDeg: number;
}) {
  const geo = useMemo(() => createIsthmusTerrainGeometry(19040222), []);
  const uniforms = useMemo(
    () => ({
      uSunDir: { value: new Vector3(0, 0.5, -0.8) },
      uAmbient: { value: 0.45 },
    }),
    []
  );

  const mat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: stationTerrainVertexShader,
        fragmentShader: stationTerrainFragmentShader,
        uniforms,
      }),
    [uniforms]
  );

  useEffect(() => {
    return () => {
      geo.dispose();
      mat.dispose();
    };
  }, [geo, mat]);

  useLayoutEffect(() => {
    uniforms.uSunDir.value.copy(sunDir);
    const dayRatio = Math.max(0, Math.min(1, (sunElevationDeg + 8) / 30));
    uniforms.uAmbient.value = 0.34 + dayRatio * 0.24;
  }, [sunDir, sunElevationDeg, uniforms]);

  return <mesh geometry={geo} material={mat} receiveShadow />;
}

/** Matches stationWaterVertexShader wave displacement at (x, z) and time t. */
function bayWaveY(x: number, z: number, t: number, windKmh: number, seaIce: number): number {
  const iceDamp = 1 - Math.min(1, Math.max(0, seaIce)) * 0.85;
  const waveAmp = Math.min(0.22, Math.max(0.02, windKmh / 80)) * iceDamp;
  const d = -worldCoastDistance(x, z);
  const s = Math.min(1, Math.max(0, (d - 0.5) / 3.5));
  const shoreMask = s * s * (3 - 2 * s);
  return Math.sin(x * 0.45 + t * 1.8) * Math.cos(z * 0.38 + t * 1.4) * waveAmp * shoreMask;
}

function BayOcean({
  month,
  sunDir,
  windKmh,
  windVec,
  seaIce,
  reduced,
}: {
  month: number;
  sunDir: Vector3;
  windKmh: number;
  windVec: Vector2;
  seaIce: number;
  reduced: boolean;
}) {
  const waterGeo = useMemo(() => {
    // Fine enough near the stage for the shore-based ice and surf (about 1.25 units per cell).
    const g = new PlaneGeometry(200, 200, 160, 160);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    const coast = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) coast[i] = worldCoastDistance(pos.getX(i), pos.getZ(i));
    g.setAttribute('aCoast', new BufferAttribute(coast, 1));
    return g;
  }, []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSunDir: { value: new Vector3(0, 0.5, -0.8) },
      uWindSpeed: { value: 20 },
      uWindVec: { value: new Vector2(0.5, 0) },
      uSeaIce: { value: 0 },
    }),
    []
  );

  const waterMat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: stationWaterVertexShader,
        fragmentShader: stationWaterFragmentShader,
        uniforms,
      }),
    [uniforms]
  );

  const swimCorridor = useMemo(
    () => penguinSwimCorridor(buildPenguinRoute((x, z) => evaluateIsthmusTerrain(x, z).y)),
    []
  );
  const plates = useMemo(
    () => generateSeaIcePlates(190406, swimCorridor, PENGUIN_SWIM_CLEARANCE),
    [swimCorridor]
  );
  const floeGeos = useMemo(
    () => SEA_ICE_FLOE_POLY_VARIANTS.map((v) => buildPolyGeometry(v.tris, boxShade)),
    []
  );
  const floeWaterGeos = useMemo(
    () => SEA_ICE_FLOE_POLY_VARIANTS.map((v) => v.createWaterline()),
    []
  );
  const floeWaterMat = useMemo(waterMaterial, []);
  const variantPlates = useMemo(() => {
    const list: SeaIcePlate[][] = [[], [], [], []];
    for (const p of plates) {
      list[p.variant % 4].push(p);
    }
    return list;
  }, [plates]);
  const platesRefs = useRef<(InstancedMesh | null)[]>([]);
  const plateWaterRefs = useRef<(InstancedMesh | null)[]>([]);

  const icebergs = useMemo(
    () => generateIcebergs(190409, swimCorridor, PENGUIN_SWIM_CLEARANCE),
    [swimCorridor]
  );
  const tabularGeo = useMemo(() => buildPolyGeometry(ICEBERG_TABULAR_POLY, boxShade), []);
  const pinnacleGeo = useMemo(() => buildPolyGeometry(ICEBERG_PEAKS_POLY, boxShade), []);
  const waterlines = useMemo(
    () => ({
      'iceberg-lg': waterline('iceberg-lg'),
      'iceberg-sm': waterline('iceberg-sm'),
    }),
    []
  );
  const glowMaterial = useMemo(waterMaterial, []);
  const bergWaterMaterials = useMemo(
    () => Array.from({ length: icebergs.length * (ICEBERG_RIPPLES + 1) }, waterMaterial),
    [icebergs.length]
  );
  const bergGroups = useRef<(Group | null)[]>([]);
  const bergBodies = useRef<(Group | null)[]>([]);
  const bergFoams = useRef<(Mesh | null)[]>([]);
  const bergRipples = useRef<(Mesh | null)[]>([]);
  const dummy = useMemo(() => new Object3D(), []);

  useEffect(() => {
    return () => {
      waterGeo.dispose();
      waterMat.dispose();
      for (const g of floeGeos) g.dispose();
      for (const g of floeWaterGeos) g.dispose();
      floeWaterMat.dispose();
      tabularGeo.dispose();
      pinnacleGeo.dispose();
      for (const w of Object.values(waterlines)) {
        w.glow.dispose();
        w.foam.dispose();
        w.ripple.dispose();
      }
      glowMaterial.dispose();
      for (const m of bergWaterMaterials) m.dispose();
    };
  }, [
    waterGeo,
    waterMat,
    floeGeos,
    floeWaterGeos,
    floeWaterMat,
    tabularGeo,
    pinnacleGeo,
    waterlines,
    glowMaterial,
    bergWaterMaterials,
  ]);

  useLayoutEffect(() => {
    uniforms.uSunDir.value.copy(sunDir);
    uniforms.uWindSpeed.value = windKmh;
    uniforms.uWindVec.value.copy(windVec);
    uniforms.uSeaIce.value = seaIce;
  }, [sunDir, windKmh, windVec, seaIce, uniforms]);

  // Update sea-ice floe plates initially (t = 0) and whenever seaIce or windKmh changes
  useLayoutEffect(() => {
    const isClosed = seaIce >= 0.9;
    variantPlates.forEach((group, v) => {
      const mesh = platesRefs.current[v];
      const waterMesh = plateWaterRefs.current[v];
      if (!mesh) return;
      if (waterMesh) waterMesh.visible = !isClosed;
      for (let i = 0; i < group.length; i++) {
        const p = group[i];
        if (isClosed) {
          // On the closed sheet (seaIce >= 0.9) keep only about 1 in 6 as low rubble, rest hidden
          if (i % 6 === 0) {
            dummy.position.set(p.x, 0.01, p.z);
            dummy.rotation.set(0, p.rotY, 0);
            dummy.scale.set(p.sizeX * 0.65, 0.25, p.sizeZ * 0.65);
          } else {
            dummy.scale.set(0, 0, 0);
          }
        } else {
          const cov = floeVisibility(p.threshold, seaIce);
          const k = cov / 0.9;
          const wy = cov > 0.01 ? bayWaveY(p.x, p.z, 0, windKmh, seaIce) : 0;
          dummy.position.set(p.x, wy, p.z);
          dummy.rotation.set(0, p.rotY, 0);
          dummy.scale.set(p.sizeX * k, cov > 0.01 ? 0.9 : 0, p.sizeZ * k);
        }
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        if (waterMesh && !isClosed) waterMesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (waterMesh && !isClosed) waterMesh.instanceMatrix.needsUpdate = true;
    });
  }, [variantPlates, seaIce, windKmh, dummy]);

  // Initialize icebergs and waterlines (t = 0 so reduced mode starts settled and still)
  useLayoutEffect(() => {
    const openWater = Math.max(0, 1 - seaIce / 0.85);
    glowMaterial.opacity = 0.85 * openWater;
    icebergs.forEach((b, i) => {
      const g = bergGroups.current[i];
      const body = bergBodies.current[i];
      const pose = icebergDriftAt(b, 0, seaIce, month, reduced);
      if (g) {
        g.position.set(pose.x, bayWaveY(pose.x, pose.z, 0, windKmh, seaIce), pose.z);
        g.rotation.set(0, pose.rotY, 0);
        g.scale.set(b.scaleX, b.scaleY, b.scaleZ);
      }
      if (body) {
        body.position.y = -ICEBERG_DRAFT;
        body.rotation.set(0, 0, 0);
      }
      const foam = bergFoams.current[i];
      if (foam) {
        foam.visible = openWater > 0.02;
        (foam.material as MeshBasicMaterial).opacity = 0.55 * openWater;
      }
      for (let r = 0; r < ICEBERG_RIPPLES; r++) {
        const m = bergRipples.current[i * ICEBERG_RIPPLES + r];
        if (!m) continue;
        m.visible = openWater > 0.02;
        const { scale, opacity } = rippleAt((r / ICEBERG_RIPPLES + 0.15) % 1);
        m.scale.set(scale, 1, scale);
        (m.material as MeshBasicMaterial).opacity = opacity * openWater;
      }
    });
  }, [icebergs, seaIce, month, windKmh, reduced, glowMaterial]);

  useFrame(({ clock }) => {
    if (reduced) return;
    const t = clock.getElapsedTime();
    uniforms.uTime.value = t;

    const isClosed = seaIce >= 0.9;
    if (!isClosed) {
      variantPlates.forEach((group, v) => {
        const mesh = platesRefs.current[v];
        const waterMesh = plateWaterRefs.current[v];
        if (!mesh) return;
        let touched = false;
        for (let i = 0; i < group.length; i++) {
          const p = group[i];
          const cov = floeVisibility(p.threshold, seaIce);
          if (cov <= 0.01) continue;
          const k = cov / 0.9;
          const wy = bayWaveY(p.x, p.z, t, windKmh, seaIce);
          dummy.position.set(p.x, wy, p.z);
          dummy.rotation.set(0, p.rotY, 0);
          dummy.scale.set(p.sizeX * k, 0.9, p.sizeZ * k);
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
          if (waterMesh) waterMesh.setMatrixAt(i, dummy.matrix);
          touched = true;
        }
        if (touched) {
          mesh.instanceMatrix.needsUpdate = true;
          if (waterMesh) waterMesh.instanceMatrix.needsUpdate = true;
        }
      });
    }

    // Icebergs ride the swell: heave, gentle pitch/roll, foam thickening on dip, two ripples half a cycle apart.
    const damp = 1 - seaIce;
    const openWater = Math.max(0, 1 - seaIce / 0.85);
    icebergs.forEach((b, i) => {
      const pose = icebergDriftAt(b, t, seaIce, month, reduced);
      const g = bergGroups.current[i];
      if (g) {
        g.position.set(pose.x, bayWaveY(pose.x, pose.z, t, windKmh, seaIce), pose.z);
        g.rotation.y = pose.rotY;
      }
      const heave = icebergSwell(t, b.phase) * damp;
      const sway = t * 0.4 + b.phase * Math.PI * 2;
      const body = bergBodies.current[i];
      if (body) {
        body.position.y = heave - ICEBERG_DRAFT;
        body.rotation.set(
          Math.sin(sway) * 0.045 * damp,
          0,
          Math.sin(sway * 1.2 + 0.7) * 0.035 * damp
        );
      }
      const foam = bergFoams.current[i];
      if (foam) {
        foam.visible = openWater > 0.02;
        (foam.material as MeshBasicMaterial).opacity =
          (0.55 + 0.45 * Math.min(1, Math.max(0, -heave / 0.012))) * openWater;
      }
      for (let r = 0; r < ICEBERG_RIPPLES; r++) {
        const m = bergRipples.current[i * ICEBERG_RIPPLES + r];
        if (!m) continue;
        m.visible = openWater > 0.02;
        const { scale, opacity } = rippleAt(
          ((t + b.phase * 7) / ICEBERG_RIPPLE_SECONDS + r / ICEBERG_RIPPLES) % 1
        );
        m.scale.set(scale, 1, scale);
        (m.material as MeshBasicMaterial).opacity = opacity * openWater;
      }
    });
  });

  const openWater = Math.max(0, 1 - seaIce / 0.85);

  return (
    <group>
      <mesh geometry={waterGeo} material={waterMat} position={[0, 0, 0]} />
      {variantPlates.map((group, v) => (
        <group key={v}>
          <instancedMesh
            ref={(node) => {
              platesRefs.current[v] = node;
            }}
            args={[floeGeos[v], vehicleMaterial, group.length]}
            frustumCulled={false}
          />
          <instancedMesh
            ref={(node) => {
              plateWaterRefs.current[v] = node;
            }}
            args={[floeWaterGeos[v], floeWaterMat, group.length]}
            renderOrder={1}
            frustumCulled={false}
          />
        </group>
      ))}
      {icebergs.map((b, i) => {
        const kind = b.variant === 'tabular' ? 'iceberg-lg' : 'iceberg-sm';
        const geo = b.variant === 'tabular' ? tabularGeo : pinnacleGeo;
        const w = waterlines[kind];
        return (
          <group
            key={`${b.variant}-${i}`}
            ref={(node) => {
              bergGroups.current[i] = node;
            }}
          >
            <group
              ref={(node) => {
                bergBodies.current[i] = node;
              }}
            >
              <mesh geometry={geo} material={vehicleMaterial} />
            </group>
            <mesh
              geometry={w.glow}
              material={glowMaterial}
              position-y={0.012}
              visible={openWater > 0.02}
              renderOrder={1}
            />
            {Array.from({ length: ICEBERG_RIPPLES }, (_, r) => (
              <mesh
                key={r}
                ref={(node) => {
                  bergRipples.current[i * ICEBERG_RIPPLES + r] = node;
                }}
                geometry={w.ripple}
                material={bergWaterMaterials[i * ICEBERG_RIPPLES + r]}
                position-y={0.015}
                renderOrder={2}
              />
            ))}
            <mesh
              ref={(node) => {
                bergFoams.current[i] = node;
              }}
              geometry={w.foam}
              material={bergWaterMaterials[icebergs.length * ICEBERG_RIPPLES + i]}
              position-y={0.018}
              renderOrder={3}
            />
          </group>
        );
      })}
    </group>
  );
}

/** Keeps each element group smoothly fading/scaling in as its era enters `buildings`. */

/** The boat model is 2.3 units long; the measured Zodiac is 5 m. */
const BOAT_SCALE = 5 / DIORAMA_METERS_PER_UNIT / 2.3;
const BOAT_ARRIVAL_DISTANCE = 8.0;
const WAKE_COUNT = 26;
/** Rotor blade length in HELICOPTER_BOXES; scaled so the rotor matches the helipad side. */
const HELICOPTER_ROTOR_SPAN = 0.84;
const HELI_ROTOR_COAST_DURATION = 1.2;
const HELI_TOTAL_ARRIVAL_DURATION = ARRIVAL_SECONDS + HELI_ROTOR_COAST_DURATION;
const HELI_ROTOR_CRUISE_SPEED = 22;
const HELI_SNOW_COUNT = 36;
const HELI_START_PITCH = -0.12;

const ERA_BUILDING_IDS: readonly BuildingId[] = [
  'omond',
  'flag',
  'windMast',
  'radioMast',
  'modern',
];

function StationElements({
  arrival,
  buildings,
  isNight,
  windKmh,
  windDirDeg,
  reduced,
  seaIce,
  showHelicopter,
  screenOpen = false,
  leaving = false,
  onVehicleArrivalDone,
  onDepartureDone,
}: {
  arrival: ArrivalId;
  buildings: readonly BuildingId[];
  isNight: boolean;
  windKmh: number;
  windDirDeg: number;
  reduced: boolean;
  seaIce: number;
  showHelicopter: boolean;
  screenOpen?: boolean;
  leaving?: boolean;
  onVehicleArrivalDone?: () => void;
  onDepartureDone?: () => void;
}) {
  const boatRef = useRef<Group>(null);
  const wakeRef = useRef<InstancedMesh>(null);
  const boatWaterRef = useRef<Mesh>(null);
  const heliRef = useRef<Group>(null);
  const heliRotorRef = useRef<Group>(null);
  const heliSnowRef = useRef<InstancedMesh>(null);
  const screenDoorRef = useRef<Group>(null);
  const doorStateRef = useRef<{ open: boolean; elapsed: number }>({
    open: screenOpen,
    elapsed: screenOpen ? 0 : SCREEN_DOOR_DURATION,
  });
  const elementRefs = useRef<Record<string, Group | null>>({});

  const presences = useRef<Record<BuildingId, number>>({
    omond: buildings.includes('omond') ? 1 : 0,
    flag: buildings.includes('flag') ? 1 : 0,
    windMast: buildings.includes('windMast') ? 1 : 0,
    moneta: buildings.includes('moneta') ? 1 : 0,
    radioMast: buildings.includes('radioMast') ? 1 : 0,
    modern: buildings.includes('modern') ? 1 : 0,
  });

  const invalidate = useThree((s) => s.invalidate);

  const buildingElements = useMemo(
    () => DIORAMA_ELEMENTS.filter((e) => e.kind !== 'boat'),
    []
  );

  const boatLayout = useMemo(() => layoutOf('boat'), []);
  const [bx, , bz] = boatLayout.position;
  const bRotY = boatLayout.rotationY;
  const fwdX = Math.cos(bRotY);
  const fwdZ = -Math.sin(bRotY);
  const rightX = Math.sin(bRotY);
  const rightZ = Math.cos(bRotY);
  const isFrozen = seaIce >= 0.5;

  const arrivalRef = useRef<{ active: boolean; elapsed: number }>({
    active: arrival === 'ship' && !isFrozen && !reduced,
    elapsed: 0,
  });

  const heliArrivalRef = useRef<{ active: boolean; elapsed: number }>({
    active: arrival === 'helicopter' && showHelicopter && !reduced,
    elapsed: 0,
  });
  const vehicleDoneFiredRef = useRef(false);

  const onDepartureDoneRef = useRef(onDepartureDone);
  onDepartureDoneRef.current = onDepartureDone;
  const departRef = useRef<{
    started: boolean;
    active: boolean;
    elapsed: number;
    duration: number;
    boatTo: ArrivalPoint | null;
    heliTo: ArrivalPoint | null;
  }>({
    started: false,
    active: false,
    elapsed: 0,
    duration: DEPARTURE_SECONDS,
    boatTo: null,
    heliTo: null,
  });
  const departDoneFiredRef = useRef(false);

  // Pulled up for the winter onto the flat gravel above the beach, so the chocks stay short.
  const boatBeachRest = useMemo(() => {
    const [rx, rz] = beachPoint([boatLayout.position[0], boatLayout.position[2]], 1.9);
    let maxGroundY = -Infinity;
    for (let u = -0.7; u <= 0.7; u += 0.08) {
      for (let v = -0.32; v <= 0.32; v += 0.08) {
        const wx = rx + u * fwdX + v * rightX;
        const wz = rz + u * fwdZ + v * rightZ;
        const gy = evaluateIsthmusTerrain(wx, wz).y;
        if (gy > maxGroundY) maxGroundY = gy;
      }
    }
    const chockTopY = maxGroundY + 0.04;
    const stations = [0.35, -0.35].map((u) => {
      const wx = rx + u * fwdX;
      const wz = rz + u * fwdZ;
      const gy = evaluateIsthmusTerrain(wx, wz).y;
      return { wx, wz, gy, chockTopY };
    });
    return {
      x: rx,
      z: rz,
      chockTopY,
      chockGeo: buildPolyGeometry(buildBoatChocksTris(stations, fwdX, fwdZ, rightX, rightZ), boxShade),
    };
  }, [boatLayout, fwdX, fwdZ, rightX, rightZ]);

  // Open-water stranded pose: bow resting on the gravel beach, stern floating in the bay.
  const strandedPose = useMemo(() => {
    const [sx, sz] = beachPoint([bx, bz], -0.03);
    const roll = 0.08;
    const sternU = -0.82 * BOAT_SCALE;
    const sternWaterY = -0.025;
    let maxSlope = 0.06;

    for (let localX = -0.3; localX <= 1.04; localX += 0.06) {
      const u = localX * BOAT_SCALE;
      const zSpan = localX > 0.72 ? 0.14 : 0.36;
      for (const localZ of [-zSpan, -0.15, 0, 0.15, zSpan]) {
        const v = localZ * BOAT_SCALE;
        const bottomY = zodiacBottomY(localX, localZ) * BOAT_SCALE - v * Math.sin(roll);
        const wx = sx + u * fwdX + v * rightX;
        const wz = sz + u * fwdZ + v * rightZ;
        const gy = evaluateIsthmusTerrain(wx, wz).y;
        const slope = (gy - bottomY - sternWaterY) / (u - sternU);
        if (slope > maxSlope) maxSlope = slope;
      }
    }

    const pitch = Math.atan(maxSlope);
    const y = sternWaterY - sternU * maxSlope;
    return { x: sx, y, z: sz, pitch, roll };
  }, [bx, bz, fwdX, fwdZ, rightX, rightZ]);

  const boatTo = useMemo(
    () => ({ x: strandedPose.x, z: strandedPose.z, height: strandedPose.y, heading: bRotY }),
    [strandedPose, bRotY]
  );
  const boatFrom = useMemo(
    () => ({
      x: strandedPose.x - BOAT_ARRIVAL_DISTANCE * fwdX,
      z: strandedPose.z - BOAT_ARRIVAL_DISTANCE * fwdZ,
      height: -0.025,
      heading: bRotY,
    }),
    [strandedPose, fwdX, fwdZ, bRotY]
  );
  const heliTo = useMemo(() => ({ x: 0, z: 0, height: HELIPAD_TOP_Y, heading: 0 }), []);
  const heliFrom = useMemo(() => helicopterLanding(0, { to: heliTo, reduced: false }), [heliTo]);

  const boatGeo = useMemo(() => buildPolyGeometry(buildZodiacTris(), boxShade), []);
  const wakeGeo = useMemo(() => buildZodiacWakeGeometry(), []);
  const wakeMat = useMemo(waterMaterial, []);
  const boatWaterGeo = useMemo(() => buildZodiacWaterlineGeometry(), []);
  const boatWaterMat = useMemo(waterMaterial, []);
  const wakeDummy = useMemo(() => new Object3D(), []);
  const heliSnowGeo = useMemo(() => buildPolyGeometry(buildSnowPuffTris(), boxShade), []);
  const heliSnowDummy = useMemo(() => new Object3D(), []);

  const geometries = useMemo(() => {
    const map = new Map<string, BufferGeometry>();
    for (const el of buildingElements) {
      let tris: readonly Tri[];
      const [length, width] = layoutOf(el.id).footprint;
      const height = el.heightM / DIORAMA_METERS_PER_UNIT;
      switch (el.kind) {
        case 'omond':
          tris = buildOmondTris(isNight);
          break;
        case 'module':
          tris = buildModuleTris(
            length,
            width,
            height,
            el.colour ?? 'unknown',
            el.roof ?? 'flat',
            isNight
          );
          break;
        case 'radioTower':
          tris = buildRadioTowerTris(height);
          break;
        case 'screen':
          tris = buildStevensonScreenTris();
          break;
        case 'windMast':
          tris = buildWindMastBaseTris();
          break;
        case 'flag':
          tris = buildFlagpoleBaseTris();
          break;
        case 'helipad':
          tris = buildHelipadTris(length);
          break;
        default:
          tris = [];
      }
      map.set(el.id, buildPolyGeometry(tris, boxShade));
    }
    return map;
  }, [buildingElements, isNight]);

  const heliGeo = useMemo(() => buildPolyGeometry(buildHelicopterTris(), boxShade), []);
  const heliRotorGeo = useMemo(() => buildPolyGeometry(buildHelicopterRotorTris(), boxShade), []);
  const screenDoorGeo = useMemo(() => buildPolyGeometry(buildStevensonDoorTris(), boxShade), []);
  const screenInstrumentsGeo = useMemo(() => buildPolyGeometry(buildStevensonInstrumentsTris(), boxShade), []);

  useEffect(() => {
    return () => {
      for (const geo of geometries.values()) {
        geo.dispose();
      }
      heliGeo.dispose();
      heliRotorGeo.dispose();
      screenDoorGeo.dispose();
      screenInstrumentsGeo.dispose();
      boatBeachRest.chockGeo.dispose();
      boatGeo.dispose();
      wakeGeo.dispose();
      wakeMat.dispose();
      boatWaterGeo.dispose();
      boatWaterMat.dispose();
      heliSnowGeo.dispose();
    };
  }, [
    geometries,
    heliGeo,
    heliRotorGeo,
    screenDoorGeo,
    screenInstrumentsGeo,
    boatBeachRest,
    boatGeo,
    wakeGeo,
    wakeMat,
    boatWaterGeo,
    boatWaterMat,
    heliSnowGeo,
  ]);

  const applyBoatPoseAndWake = useCallback(
    (pose: ArrivalPose, t: number) => {
      if (!boatRef.current) return;
      const climbDenom = Math.max(1e-4, boatTo.height - boatFrom.height);
      const climbProgress = clamp01((pose.height - boatFrom.height) / climbDenom);
      const waveDamp = 1 - climbProgress;
      const swell = Math.min(1.0, Math.max(0.22, windKmh / 35));
      const waveBob = Math.sin(t * 2.8) * 0.025 * swell * waveDamp;
      const wavePitch = Math.sin(t * 3.2 + 0.5) * 0.045 * swell * waveDamp + 0.035 * pose.speed;
      const waveRoll = Math.cos(t * 2.4) * 0.055 * swell * waveDamp;

      const py = pose.height + waveBob * waveDamp;
      const pitch = wavePitch + (strandedPose.pitch - wavePitch) * climbProgress;
      const roll = waveRoll + (strandedPose.roll - waveRoll) * climbProgress;
      boatRef.current.position.set(pose.x, py, pose.z);
      boatRef.current.rotation.set(roll, pose.heading, pitch);

      const wakeFade = pose.speed * (1 - climbProgress);
      const boatWaterMesh = boatWaterRef.current;
      if (boatWaterMesh) {
        if (wakeFade > 0.02 && worldCoastDistance(pose.x, pose.z) < 0.25) {
          boatWaterMesh.visible = true;
          boatWaterMesh.position.set(
            pose.x,
            bayWaveY(pose.x, pose.z, t, windKmh, seaIce) + 0.014,
            pose.z
          );
          boatWaterMesh.rotation.set(0, pose.heading, 0);
          boatWaterMat.opacity = Math.min(1, wakeFade * 1.15);
        } else {
          boatWaterMesh.visible = false;
        }
      }

      const wakeMesh = wakeRef.current;
      if (wakeMesh) {
        if (wakeFade > 0.02) {
          const cosH = Math.cos(pose.heading);
          const sinH = Math.sin(pose.heading);
          const axX = cosH;
          const axZ = -sinH;
          const sideX = sinH;
          const sideZ = cosH;
          wakeMesh.visible = true;
          for (let i = 0; i < WAKE_COUNT; i++) {
            let lag: number;
            let side: number;
            let sx: number;
            let sy: number;
            let sz: number;
            let yawOffset = 0;

            if (i < 10) {
              const k = i / 9;
              lag = 0.72 + k * 2.4;
              side = Math.sin(i * 2.4 + t * 8) * 0.055 * (1 + k);
              const s = wakeFade * (1 - k * 0.55) * (0.85 + 0.25 * Math.sin(t * 10 - i * 1.3));
              sx = 0.22 * s;
              sy = 0.036 * s;
              sz = 0.18 * s;
            } else {
              const arm = i < 18 ? -1 : 1;
              const idx = i < 18 ? i - 10 : i - 18;
              const k = idx / 7;
              lag = 0.5 + k * 2.5;
              side = arm * (0.24 + k * 0.58);
              const s = wakeFade * (1 - k * 0.5);
              sx = 0.28 * s;
              sy = 0.026 * s;
              sz = 0.12 * s;
              yawOffset = arm * 0.24;
            }

            const wx = pose.x - lag * axX + side * sideX;
            const wz = pose.z - lag * axZ + side * sideZ;
            if (worldCoastDistance(wx, wz) >= -0.04) {
              wakeDummy.scale.set(0, 0, 0);
            } else {
              const wy = bayWaveY(wx, wz, t, windKmh, seaIce) + 0.015;
              wakeDummy.position.set(wx, wy, wz);
              wakeDummy.rotation.set(0, pose.heading + yawOffset, 0);
              wakeDummy.scale.set(sx, sy, sz);
            }
            wakeDummy.updateMatrix();
            wakeMesh.setMatrixAt(i, wakeDummy.matrix);
          }
          wakeMesh.instanceMatrix.needsUpdate = true;
        } else {
          wakeMesh.visible = false;
        }
      }
    },
    [boatFrom, boatTo, windKmh, seaIce, strandedPose, boatWaterMat, wakeDummy]
  );

  const applyHeliPoseAndSnow = useCallback(
    (
      pose: ArrivalPose,
      dt: number,
      particleElapsed: number,
      rotorSpeed: number,
      rotorWash: number,
      departing = false
    ) => {
      if (!heliRef.current) return;
      const altitude = Math.max(0, pose.height - HELIPAD_TOP_Y);
      const airFactor = clamp01(altitude / 5.2);
      const flare = !departing && pose.speed > 0 ? Math.sin(Math.PI * (1 - airFactor)) : 0;
      const pitch = pose.speed > 0 ? HELI_START_PITCH * pose.speed + 0.08 * flare : 0;
      const roll = !departing && pose.speed > 0 ? 0.09 * Math.sin(Math.PI * airFactor) : 0;
      heliRef.current.position.set(pose.x, pose.height, pose.z);
      heliRef.current.rotation.set(roll, pose.heading, pitch);

      if (heliRotorRef.current) {
        heliRotorRef.current.rotation.y += dt * rotorSpeed;
      }

      const snowMesh = heliSnowRef.current;
      if (snowMesh) {
        const groundProximity = smooth01(1 - altitude / 3.6);
        const snowIntensity = groundProximity * rotorWash;
        if (snowIntensity > 0.02) {
          snowMesh.visible = true;
          for (let i = 0; i < HELI_SNOW_COUNT; i++) {
            const phase = (particleElapsed * (1.1 + (i % 5) * 0.14) + i / HELI_SNOW_COUNT) % 1;
            const r = 0.35 + phase * 2.3;
            const theta =
              (i / HELI_SNOW_COUNT) * Math.PI * 2 + phase * 1.4 + particleElapsed * 0.8;
            const sy =
              HELIPAD_TOP_Y +
              0.03 +
              Math.sin(phase * Math.PI) *
                (0.34 + (i % 3) * 0.16) *
                (0.4 + 0.6 * groundProximity);
            const s = snowIntensity * Math.sin(phase * Math.PI) * (0.048 + (i % 4) * 0.014);
            heliSnowDummy.position.set(Math.cos(theta) * r, sy, Math.sin(theta) * r);
            heliSnowDummy.rotation.set(particleElapsed * 3 + i, theta, particleElapsed * 2 - i);
            heliSnowDummy.scale.set(s, s, s);
            heliSnowDummy.updateMatrix();
            snowMesh.setMatrixAt(i, heliSnowDummy.matrix);
          }
          snowMesh.instanceMatrix.needsUpdate = true;
        } else {
          snowMesh.visible = false;
        }
      }
    },
    [heliSnowDummy]
  );

  useLayoutEffect(() => {
    if (leaving && !departRef.current.started) {
      departRef.current.started = true;
      departRef.current.elapsed = 0;

      const startT =
        arrival === 'ship'
          ? isFrozen
            ? 0
            : arrivalRef.current.active
              ? Math.min(ARRIVAL_SECONDS, arrivalRef.current.elapsed)
              : ARRIVAL_SECONDS
          : !showHelicopter
            ? 0
            : heliArrivalRef.current.active
              ? Math.min(ARRIVAL_SECONDS, heliArrivalRef.current.elapsed)
              : ARRIVAL_SECONDS;

      departRef.current.boatTo =
        arrival === 'ship' && !isFrozen && arrivalRef.current.active
          ? zodiacApproach(startT, { from: boatFrom, to: boatTo, reduced: false })
          : boatTo;
      departRef.current.heliTo =
        arrival === 'helicopter' && showHelicopter && heliArrivalRef.current.active
          ? helicopterLanding(startT, { to: heliTo, reduced: false })
          : heliTo;

      arrivalRef.current.active = false;
      heliArrivalRef.current.active = false;

      if (reduced || startT <= 0.01) {
        departRef.current.active = false;
        if (!departDoneFiredRef.current) {
          departDoneFiredRef.current = true;
          onDepartureDoneRef.current?.();
        }
      } else {
        departRef.current.active = true;
        departRef.current.duration = DEPARTURE_SECONDS * Math.max(0.45, startT / ARRIVAL_SECONDS);
      }
    } else if (!leaving && departRef.current.started) {
      departRef.current.started = false;
      departRef.current.active = false;
      departRef.current.elapsed = 0;
      departRef.current.boatTo = null;
      departRef.current.heliTo = null;
      departDoneFiredRef.current = false;
    }

    const boatDeparting = departRef.current.active && arrival === 'ship';
    const heliDeparting = departRef.current.active && arrival === 'helicopter';

    if (boatRef.current) {
      boatRef.current.rotation.order = 'YXZ';
      if (isFrozen) {
        arrivalRef.current.active = false;
        boatRef.current.position.set(boatBeachRest.x, boatBeachRest.chockTopY, boatBeachRest.z);
        boatRef.current.rotation.set(0, bRotY, 0);
      } else if (reduced || arrival !== 'ship') {
        arrivalRef.current.active = false;
        const rest = arrivalFinalPose(boatTo);
        boatRef.current.position.set(rest.x, rest.height, rest.z);
        boatRef.current.rotation.set(strandedPose.roll, rest.heading, strandedPose.pitch);
      } else if (arrivalRef.current.active && arrivalRef.current.elapsed === 0) {
        const start = zodiacApproach(0, { from: boatFrom, to: boatTo, reduced: false });
        boatRef.current.position.set(start.x, start.height, start.z);
        boatRef.current.rotation.set(0, start.heading, 0.03);
      }
    }
    if (wakeRef.current && (isFrozen || reduced || (!arrivalRef.current.active && !boatDeparting))) {
      wakeRef.current.visible = false;
    }
    if (
      boatWaterRef.current &&
      (isFrozen || reduced || (!arrivalRef.current.active && !boatDeparting))
    ) {
      boatWaterRef.current.visible = false;
    }

    if (heliRef.current) {
      heliRef.current.rotation.order = 'YXZ';
      if (!showHelicopter || reduced || arrival !== 'helicopter') {
        heliArrivalRef.current.active = false;
        const rest = arrivalFinalPose(heliTo);
        heliRef.current.position.set(rest.x, rest.height, rest.z);
        heliRef.current.rotation.set(0, rest.heading, 0);
        if (heliRotorRef.current) heliRotorRef.current.rotation.y = 0;
      } else if (heliArrivalRef.current.active && heliArrivalRef.current.elapsed === 0) {
        const start = helicopterLanding(0, { to: heliTo, reduced: false });
        heliRef.current.position.set(start.x, start.height, start.z);
        heliRef.current.rotation.set(0, start.heading, HELI_START_PITCH);
        if (heliRotorRef.current) heliRotorRef.current.rotation.y = 0;
      }
    } else if (!showHelicopter) {
      heliArrivalRef.current.active = false;
    }
    if (
      heliSnowRef.current &&
      (!showHelicopter || reduced || (!heliArrivalRef.current.active && !heliDeparting))
    ) {
      heliSnowRef.current.visible = false;
    }

    if (
      !vehicleDoneFiredRef.current &&
      !arrivalRef.current.active &&
      !heliArrivalRef.current.active &&
      !departRef.current.active
    ) {
      vehicleDoneFiredRef.current = true;
      onVehicleArrivalDone?.();
    }

    const doorState = doorStateRef.current;
    if (doorState.open !== screenOpen) {
      doorState.open = screenOpen;
      doorState.elapsed = Math.max(0, SCREEN_DOOR_DURATION - doorState.elapsed);
    }
    if (reduced) {
      doorState.elapsed = SCREEN_DOOR_DURATION;
    }
    if (screenDoorRef.current) {
      // Negative rotation around +y swings the left-hinged door outward toward +z and -x.
      screenDoorRef.current.rotation.y = -screenDoorAngle(
        doorState.open,
        doorState.elapsed,
        reduced
      );
    }

    if (reduced) {
      for (const id of ERA_BUILDING_IDS) {
        presences.current[id] = buildings.includes(id) ? 1 : 0;
      }
      for (const el of buildingElements) {
        const grp = elementRefs.current[el.id];
        if (grp) {
          const p = el.era ? (buildings.includes(el.era) ? 1 : 0) : 1;
          grp.visible = p > 0.01;
          grp.scale.set(p, p, p);
        }
      }
    }
    invalidate();
  }, [
    arrival,
    buildings,
    windKmh,
    windDirDeg,
    isNight,
    reduced,
    invalidate,
    isFrozen,
    bRotY,
    boatBeachRest,
    boatFrom,
    boatTo,
    heliTo,
    strandedPose,
    buildingElements,
    showHelicopter,
    screenOpen,
    leaving,
    onVehicleArrivalDone,
  ]);

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();
    const dt = Math.min(delta, 0.1);
    let arrivalMoving = false;

    if (!reduced) {
      if (!isFrozen && boatRef.current) {
        boatRef.current.rotation.order = 'YXZ';
        if (departRef.current.active && arrival === 'ship') {
          departRef.current.elapsed += dt;
          const pose = zodiacDeparture(departRef.current.elapsed, {
            from: boatFrom,
            to: departRef.current.boatTo ?? boatTo,
            duration: departRef.current.duration,
            reduced: false,
          });
          applyBoatPoseAndWake(pose, t);
          if (departRef.current.elapsed >= departRef.current.duration) {
            departRef.current.active = false;
            if (wakeRef.current) wakeRef.current.visible = false;
            if (boatWaterRef.current) boatWaterRef.current.visible = false;
            if (!departDoneFiredRef.current) {
              departDoneFiredRef.current = true;
              onDepartureDoneRef.current?.();
            }
          } else {
            arrivalMoving = true;
          }
        } else if (arrivalRef.current.active) {
          arrivalRef.current.elapsed += dt;
          const pose = zodiacApproach(arrivalRef.current.elapsed, {
            from: boatFrom,
            to: boatTo,
            reduced: false,
          });
          applyBoatPoseAndWake(pose, t);
          if (arrivalRef.current.elapsed >= ARRIVAL_SECONDS) {
            arrivalRef.current.active = false;
            if (wakeRef.current) wakeRef.current.visible = false;
            if (boatWaterRef.current) boatWaterRef.current.visible = false;
            if (!vehicleDoneFiredRef.current) {
              vehicleDoneFiredRef.current = true;
              onVehicleArrivalDone?.();
            }
          } else {
            arrivalMoving = true;
          }
        } else {
          // Stranded: bow stays planted on the gravel beach, stern breathes gently in the swell.
          if (wakeRef.current) wakeRef.current.visible = false;
          if (boatWaterRef.current) boatWaterRef.current.visible = false;
          const swell = Math.min(1.0, Math.max(0.12, windKmh / 40));
          const sternBob = Math.sin(t * 1.4) * 0.004 * swell;
          const bowU = 0.72 * BOAT_SCALE;
          const sternU = -0.82 * BOAT_SCALE;
          const pivotSpan = bowU - sternU;
          const dPitch = -sternBob / pivotSpan;
          const dY = (sternBob * bowU) / pivotSpan;
          const dRoll = Math.cos(t * 1.1) * 0.008 * swell;
          boatRef.current.position.set(strandedPose.x, strandedPose.y + dY, strandedPose.z);
          boatRef.current.rotation.set(
            strandedPose.roll + dRoll,
            bRotY,
            strandedPose.pitch + dPitch
          );
        }
      }
      if (showHelicopter && heliRef.current) {
        if (departRef.current.active && arrival === 'helicopter') {
          heliRef.current.rotation.order = 'YXZ';
          departRef.current.elapsed += dt;
          const elapsed = departRef.current.elapsed;
          const pose = helicopterDeparture(elapsed, {
            from: heliFrom,
            to: departRef.current.heliTo ?? heliTo,
            duration: departRef.current.duration,
            reduced: false,
          });
          const rotorRamp = smooth01(elapsed / 0.25);
          const rotorSpeed = HELI_ROTOR_CRUISE_SPEED * (0.4 + 0.6 * rotorRamp);
          applyHeliPoseAndSnow(pose, dt, elapsed, rotorSpeed, rotorRamp, true);
          if (elapsed >= departRef.current.duration) {
            departRef.current.active = false;
            if (heliSnowRef.current) heliSnowRef.current.visible = false;
            if (!departDoneFiredRef.current) {
              departDoneFiredRef.current = true;
              onDepartureDoneRef.current?.();
            }
          } else {
            arrivalMoving = true;
          }
        } else if (heliArrivalRef.current.active) {
          heliRef.current.rotation.order = 'YXZ';
          heliArrivalRef.current.elapsed += dt;
          const elapsed = heliArrivalRef.current.elapsed;
          const pose = helicopterLanding(elapsed, { to: heliTo, reduced: false });
          const rotorSpeed =
            elapsed <= ARRIVAL_SECONDS
              ? HELI_ROTOR_CRUISE_SPEED
              : HELI_ROTOR_CRUISE_SPEED *
                (1 - smooth01((elapsed - ARRIVAL_SECONDS) / HELI_ROTOR_COAST_DURATION));
          const rotorWash =
            elapsed <= ARRIVAL_SECONDS
              ? 1
              : 1 - smooth01((elapsed - ARRIVAL_SECONDS) / (HELI_ROTOR_COAST_DURATION * 0.75));
          applyHeliPoseAndSnow(pose, dt, elapsed, rotorSpeed, rotorWash);
          if (elapsed >= HELI_TOTAL_ARRIVAL_DURATION) {
            heliArrivalRef.current.active = false;
            if (heliSnowRef.current) heliSnowRef.current.visible = false;
            if (!vehicleDoneFiredRef.current) {
              vehicleDoneFiredRef.current = true;
              onVehicleArrivalDone?.();
            }
          } else {
            arrivalMoving = true;
          }
        }
      }
      const doorState = doorStateRef.current;
      if (doorState.elapsed < SCREEN_DOOR_DURATION) {
        doorState.elapsed = Math.min(
          SCREEN_DOOR_DURATION,
          doorState.elapsed + Math.min(delta, 0.05)
        );
        if (screenDoorRef.current) {
          screenDoorRef.current.rotation.y = -screenDoorAngle(
            doorState.open,
            doorState.elapsed,
            false
          );
        }
        arrivalMoving = true;
      }
    }

    let moving = false;
    for (const id of ERA_BUILDING_IDS) {
      const cur = presences.current[id];
      const next = stepEraPresence(cur, buildings.includes(id), delta, reduced);
      if (next !== cur) moving = true;
      presences.current[id] = next;
    }

    for (const el of buildingElements) {
      const grp = elementRefs.current[el.id];
      if (!grp) continue;
      const p = el.era ? presences.current[el.era] : 1;
      grp.visible = p > ERA_VISIBLE_THRESHOLD;
      const s = Math.max(ERA_MIN_SCALE, p);
      grp.scale.set(s, s, s);
    }

    if (moving || arrivalMoving) invalidate();
  });

  return (
    <group>
      {buildingElements.map((el) => {
        const layout = layoutOf(el.id);
        const geo = geometries.get(el.id);
        const isProp = el.kind === 'screen' || el.kind === 'windMast' || el.kind === 'flag';
        const scale = isProp ? DIORAMA_PROP_SCALE : 1;
        const [x, y, z] = layout.position;
        return (
          <group
            key={el.id}
            ref={(node) => {
              elementRefs.current[el.id] = node;
            }}
            position={[x, y, z]}
            rotation={[0, layout.rotationY, 0]}
          >
            <group scale={scale}>
              {geo && <mesh geometry={geo} material={vehicleMaterial} />}
              {el.id === 'screen' && (
                <>
                  <mesh geometry={screenInstrumentsGeo} material={vehicleMaterial} />
                  <group ref={screenDoorRef} position={SCREEN_DOOR_HINGE}>
                    <mesh geometry={screenDoorGeo} material={vehicleMaterial} />
                  </group>
                </>
              )}
              {el.id === 'windMast' && (
                <WindMastInstruments windKmh={windKmh} windDirDeg={windDirDeg} reduced={reduced} />
              )}
              {el.id === 'flag' && (
                <WindFlag windKmh={windKmh} windDirDeg={windDirDeg} reduced={reduced} />
              )}
              {el.id === 'helipad' && showHelicopter && (
                <>
                  <instancedMesh
                    ref={heliSnowRef}
                    args={[heliSnowGeo, vehicleMaterial, HELI_SNOW_COUNT]}
                    visible={false}
                    frustumCulled={false}
                  />
                  <group ref={heliRef} position={[0, HELIPAD_TOP_Y, 0]}>
                    <group scale={layout.footprint[0] / HELICOPTER_ROTOR_SPAN}>
                      <mesh geometry={heliGeo} material={vehicleMaterial} />
                      <group ref={heliRotorRef} position={HELICOPTER_ROTOR_ORIGIN}>
                        <mesh geometry={heliRotorGeo} material={vehicleMaterial} />
                      </group>
                    </group>
                  </group>
                </>
              )}
            </group>
          </group>
        );
      })}

      {/* Zodiac boat: pulled up on chocks when frozen, stranded on beach when open */}
      {isFrozen && <mesh geometry={boatBeachRest.chockGeo} material={vehicleMaterial} />}
      <instancedMesh
        ref={wakeRef}
        args={[wakeGeo, wakeMat, WAKE_COUNT]}
        visible={false}
        renderOrder={2}
        frustumCulled={false}
      />
      <mesh
        ref={boatWaterRef}
        geometry={boatWaterGeo}
        material={boatWaterMat}
        scale={BOAT_SCALE}
        visible={false}
        renderOrder={2}
      />
      <group ref={boatRef}>
        <group scale={BOAT_SCALE}>
          <mesh geometry={boatGeo} material={vehicleMaterial} />
        </group>
      </group>
    </group>
  );
}

interface SealRig {
  root: Group | null;
  tilt: Group | null;
  neck: Group | null;
  jaw: Group | null;
  flipR: Group | null;
  flipL: Group | null;
  tail: Group | null;
  contact: Mesh | null;
}

const STILL_TIME = 2.0;

function applySealPose(rig: SealRig, p: SealPose) {
  const { root, tilt, neck, jaw, flipR, flipL, tail, contact } = rig;
  if (!root || !tilt || !neck || !flipR || !flipL || !tail) return;
  root.position.set(p.x, p.y, p.z);
  root.rotation.y = p.yaw;
  tilt.rotation.set(p.pitch, 0, p.roll);
  tilt.scale.set(1 + p.hump * 0.08, p.stretch, 1 - p.hump * 0.06);
  neck.rotation.set(p.headPitch, p.headYaw, p.headRoll);
  if (jaw) jaw.rotation.z = -p.jawOpen * 0.35;
  flipR.rotation.set(p.flipRPitch, 0, p.flipRRoll);
  flipL.rotation.set(p.flipLPitch, 0, p.flipLRoll);
  tail.rotation.set(p.tailPitch, p.tailYaw, 0);
  if (contact) contact.visible = p.y >= 0.005;
}

function StationFauna({
  animals,
  reduced,
  seaIce,
  arrival,
}: {
  animals: readonly string[];
  reduced: boolean;
  seaIce: number;
  arrival: ArrivalId;
}) {
  const showPenguins =
    animals.includes('adelie') || animals.includes('chinstrap');
  const showSeals =
    animals.includes('weddell') || animals.includes('elephant');

  const sealColony = useMemo(() => buildSealColony((x, z) => evaluateIsthmusTerrain(x, z).y), []);

  const weddellGeos = useMemo(() => {
    const parts = buildWeddellSealPolyParts();
    return {
      body: buildPolyGeometry(parts.body, boxShade),
      head: buildPolyGeometry(parts.head, boxShade),
      flipperR: buildPolyGeometry(parts.flipperR, boxShade),
      flipperL: buildPolyGeometry(parts.flipperL, boxShade),
      tail: buildPolyGeometry(parts.tail, boxShade),
      contact: buildSealContactGeometry('weddell'),
    };
  }, []);

  const elephantGeos = useMemo(() => {
    const parts = buildElephantSealPolyParts();
    return {
      body: buildPolyGeometry(parts.body, boxShade),
      head: buildPolyGeometry(parts.head, boxShade),
      jaw: parts.jaw ? buildPolyGeometry(parts.jaw, boxShade) : null,
      flipperR: buildPolyGeometry(parts.flipperR, boxShade),
      flipperL: buildPolyGeometry(parts.flipperL, boxShade),
      tail: buildPolyGeometry(parts.tail, boxShade),
      contact: buildSealContactGeometry('elephant'),
    };
  }, []);

  const contactMat = useMemo(
    () =>
      new MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      }),
    []
  );

  const seals = useMemo(
    () => [
      ...sealColony.residents.map((r) => ({
        species: r.species,
        pose: (t: number, o: SealPose) => sealResidentPose(r, t, o),
      })),
      {
        species: sealColony.traveller.species,
        pose: (t: number, o: SealPose) =>
          seaIce >= 0.5
            ? sealResidentPose(sealColony.traveller.rest, t, o)
            : sealTravellerPose(sealColony.traveller.route, t, o),
      },
    ],
    [sealColony, seaIce]
  );

  const sealRigs = useRef<SealRig[]>(
    seals.map(() => ({
      root: null,
      tilt: null,
      neck: null,
      jaw: null,
      flipR: null,
      flipL: null,
      tail: null,
      contact: null,
    }))
  );
  const tempSealPose = useMemo(() => restSealPose(), []);

  useEffect(() => {
    return () => {
      weddellGeos.body.dispose();
      weddellGeos.head.dispose();
      weddellGeos.flipperR.dispose();
      weddellGeos.flipperL.dispose();
      weddellGeos.tail.dispose();
      weddellGeos.contact.dispose();
      elephantGeos.body.dispose();
      elephantGeos.head.dispose();
      elephantGeos.jaw?.dispose();
      elephantGeos.flipperR.dispose();
      elephantGeos.flipperL.dispose();
      elephantGeos.tail.dispose();
      elephantGeos.contact.dispose();
      contactMat.dispose();
    };
  }, [weddellGeos, elephantGeos, contactMat]);

  useLayoutEffect(() => {
    if (reduced) {
      seals.forEach((s, i) =>
        applySealPose(sealRigs.current[i], s.pose(STILL_TIME, tempSealPose))
      );
    }
  }, [reduced, seals, tempSealPose]);

  useFrame(({ clock }) => {
    if (reduced) return;
    const t = clock.getElapsedTime();

    if (showSeals) {
      seals.forEach((s, i) =>
        applySealPose(sealRigs.current[i], s.pose(t, tempSealPose))
      );
    }
  });

  return (
    <group>
      {showPenguins && <PenguinColony reduced={reduced} seaIce={seaIce} arrival={arrival} />}

      {/* Seals on the front beach of Bahía Scotia */}
      {showSeals && (
        <group>
          {seals.map((s, i) => {
            if (s.species === 'elephant' && !animals.includes('elephant')) return null;
            if (s.species === 'weddell' && !animals.includes('weddell')) return null;
            const isElephant = s.species === 'elephant';
            const geos = isElephant ? elephantGeos : weddellGeos;
            const rig = sealRigs.current[i];
            const neckPivot = isElephant ? ELEPHANT_NECK : WEDDELL_NECK;
            const flipRPivot = isElephant ? ELEPHANT_FLIPPER_R : WEDDELL_FLIPPER_R;
            const flipLPivot = isElephant ? ELEPHANT_FLIPPER_L : WEDDELL_FLIPPER_L;
            const tailPivot = isElephant ? ELEPHANT_TAIL : WEDDELL_TAIL;

            return (
              <group key={i} ref={(n) => void (rig.root = n)}>
                <mesh
                  ref={(n) => void (rig.contact = n)}
                  geometry={geos.contact}
                  material={contactMat}
                  position-y={0.005}
                  renderOrder={1}
                />
                <group ref={(n) => void (rig.tilt = n)}>
                  <mesh geometry={geos.body} material={vehicleMaterial} />
                  <group ref={(n) => void (rig.neck = n)} position={neckPivot}>
                    <mesh geometry={geos.head} material={vehicleMaterial} />
                    {isElephant && elephantGeos.jaw && (
                      <group
                        ref={(n) => void (rig.jaw = n)}
                        position={[
                          ELEPHANT_JAW[0] - ELEPHANT_NECK[0],
                          ELEPHANT_JAW[1] - ELEPHANT_NECK[1],
                          0,
                        ]}
                      >
                        <mesh geometry={elephantGeos.jaw} material={vehicleMaterial} />
                      </group>
                    )}
                  </group>
                  <group ref={(n) => void (rig.flipR = n)} position={flipRPivot}>
                    <mesh geometry={geos.flipperR} material={vehicleMaterial} />
                  </group>
                  <group ref={(n) => void (rig.flipL = n)} position={flipLPivot}>
                    <mesh geometry={geos.flipperL} material={vehicleMaterial} />
                  </group>
                  <group ref={(n) => void (rig.tail = n)} position={tailPivot}>
                    <mesh geometry={geos.tail} material={vehicleMaterial} />
                  </group>
                </group>
              </group>
            );
          })}
        </group>
      )}
    </group>
  );
}

function orbitPose(
  target: readonly [number, number, number],
  distance: number,
  bearingDeg: number,
  elevationDeg: number,
  right = 0,
  near = 0
): CameraPose {
  const b = (bearingDeg * Math.PI) / 180;
  const e = (elevationDeg * Math.PI) / 180;
  const dx = Math.sin(b);
  const dz = -Math.cos(b);
  const tx = target[0] + dz * right + dx * near;
  const tz = target[2] - dx * right + dz * near;
  const h = Math.cos(e) * distance;
  return {
    pos: [tx + dx * h, target[1] + Math.sin(e) * distance, tz + dz * h],
    target: [tx, target[1], tz],
  };
}

function arrivalCameraPose(
  arrival: ArrivalId,
  mobile: boolean,
  landscape: boolean,
  panelHidden: boolean
): CameraPose {
  if (arrival === 'helicopter') {
    if (mobile) return orbitPose([4.0, 1.5, 4.5], 38, 170, 17, 0, 4);
    if (landscape) return orbitPose([5.8, 2.2, 3.2], 16, 168, 16, 2.2, 0);
    return orbitPose([5.8, 2.4, 3.2], 20, 168, 16, panelHidden ? 0 : 2.5, 0);
  }
  if (mobile) return orbitPose([0.2, 0.4, 4.5], 34, 192, 16, 0, 4);
  if (landscape) return orbitPose([0.0, 0.7, 4.2], 14, 194, 14, 2.2, 0);
  return orbitPose([0.0, 0.8, 4.2], 16, 194, 14, panelHidden ? 0 : 2.6, 0);
}

function StationCameraAndProjection({
  arrival,
  vehicleDone,
  focus,
  reduced,
  panelExpanded,
  panelHidden,
  overlayRef,
  screenNoZoomRef,
  onReady,
  onCameraSettled,
}: {
  arrival: ArrivalId;
  vehicleDone: boolean;
  focus: HotspotId | null;
  reduced: boolean;
  panelExpanded?: boolean;
  panelHidden?: boolean;
  overlayRef?: RefObject<HTMLDivElement | null>;
  screenNoZoomRef?: RefObject<boolean>;
  onReady?: () => void;
  onCameraSettled?: () => void;
}) {
  const controlsRef = useRef<CameraControls>(null);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const readyFiredRef = useRef(false);
  const initializedRef = useRef(false);
  const userControlledRef = useRef(false);
  const arrivalSettledRef = useRef(reduced || vehicleDone);
  const prevVehicleDoneRef = useRef(vehicleDone);
  const returningRef = useRef<{ active: boolean; elapsed: number; targetPos: Vector3 }>({
    active: false,
    elapsed: 0,
    targetPos: new Vector3(),
  });
  const projVec = useMemo(() => new Vector3(), []);
  const screenTargetVec = useMemo(() => new Vector3(), []);
  const buttonMapRef = useRef<Map<string, HTMLElement>>(new Map());
  const lastCamPos = useRef<Vector3 | null>(null);
  const lastSize = useRef<{ width: number; height: number }>({ width: 0, height: 0 });
  const projectedRef = useRef(false);

  const isPortrait = size.width < 900 && size.height > size.width;
  const mobile = isPortrait;
  // Same test as the landscape media query of orcadas.css, where the panel takes the right 46 %.
  const landscape = size.width > size.height && size.height <= 500;

  // The diorama is always seen from Bahía Scotia: a little orbit, no top view, limited zoom.
  const deg = Math.PI / 180;
  const azimuth = (180 - VIEW_BEARING_DEG) * deg;
  // Never farther than a little beyond the entry view: the stage ends past it.
  const entry = poseForHotspot(null, mobile, Boolean(panelExpanded), landscape, Boolean(panelHidden));
  const maxDistance =
    Math.hypot(
      entry.pos[0] - entry.target[0],
      entry.pos[1] - entry.target[1],
      entry.pos[2] - entry.target[2]
    ) * VIEW_MAX_ZOOM_OUT;
  const boundary = useMemo(() => new Box3(new Vector3(-20, -1, -14), new Vector3(20, 24, 60)), []);

  useMapGestures(controlsRef, {
    minAzimuthAngle: azimuth - VIEW_ORBIT_DEG * deg,
    maxAzimuthAngle: azimuth + VIEW_ORBIT_DEG * deg,
    minPolarAngle: (90 - VIEW_ELEVATION_DEG[1]) * deg,
    maxPolarAngle: (90 - VIEW_ELEVATION_DEG[0]) * deg,
    minDistance: 3,
    maxDistance,
    smoothTime: 0.32,
    boundary,
    invalidate,
    normalizeCtrlWheel: true,
  });

  useLayoutEffect(() => {
    invalidate();
  }, [invalidate]);

  useEffect(() => {
    const cc = controlsRef.current;
    if (!cc) return;
    const onControlStart = () => {
      userControlledRef.current = true;
      if (returningRef.current.active) {
        returningRef.current.active = false;
        if (!arrivalSettledRef.current) {
          arrivalSettledRef.current = true;
          onCameraSettled?.();
        }
      }
    };
    cc.addEventListener('controlstart', onControlStart);
    return () => {
      cc.removeEventListener('controlstart', onControlStart);
    };
  }, [onCameraSettled]);

  useLayoutEffect(() => {
    const cc = controlsRef.current;
    if (!cc) return;
    (window as unknown as { __orcadasCamera?: CameraControls }).__orcadasCamera = cc;

    const pose = poseForHotspot(focus, mobile, Boolean(panelExpanded), landscape, Boolean(panelHidden));
    const hasCustomFocus = Boolean(focus && focus !== 'overview');
    const wasVehicleDone = prevVehicleDoneRef.current;
    prevVehicleDoneRef.current = vehicleDone;
    projectedRef.current = false;

    if (!initializedRef.current) {
      initializedRef.current = true;
      if (screenNoZoomRef) screenNoZoomRef.current = true;
      const startPose =
        !reduced && !vehicleDone && !hasCustomFocus
          ? arrivalCameraPose(arrival, mobile, landscape, Boolean(panelHidden))
          : pose;
      camera.position.set(startPose.pos[0], startPose.pos[1], startPose.pos[2]);
      camera.lookAt(new Vector3(startPose.target[0], startPose.target[1], startPose.target[2]));
      camera.updateMatrixWorld(true);
      camera.updateProjectionMatrix();
      void cc.setLookAt(
        startPose.pos[0],
        startPose.pos[1],
        startPose.pos[2],
        startPose.target[0],
        startPose.target[1],
        startPose.target[2],
        false
      );
      if ((reduced || vehicleDone || hasCustomFocus) && !arrivalSettledRef.current) {
        arrivalSettledRef.current = true;
        onCameraSettled?.();
      }
    } else if (reduced || hasCustomFocus) {
      if (screenNoZoomRef) {
        if (focus === 'screen') {
          const alreadyAtTarget =
            camera.position.distanceToSquared(
              screenTargetVec.set(pose.pos[0], pose.pos[1], pose.pos[2])
            ) < 0.15;
          screenNoZoomRef.current = reduced || alreadyAtTarget;
        } else {
          screenNoZoomRef.current = false;
        }
      }
      if (hasCustomFocus) userControlledRef.current = true;
      returningRef.current.active = false;
      if (!arrivalSettledRef.current) {
        arrivalSettledRef.current = true;
        onCameraSettled?.();
      }
      void cc.setLookAt(
        pose.pos[0],
        pose.pos[1],
        pose.pos[2],
        pose.target[0],
        pose.target[1],
        pose.target[2],
        !reduced
      );
    } else if (!vehicleDone) {
      if (screenNoZoomRef) screenNoZoomRef.current = false;
      if (!userControlledRef.current) {
        const aPose = arrivalCameraPose(arrival, mobile, landscape, Boolean(panelHidden));
        void cc.setLookAt(
          aPose.pos[0],
          aPose.pos[1],
          aPose.pos[2],
          aPose.target[0],
          aPose.target[1],
          aPose.target[2],
          true
        );
      }
    } else if (!wasVehicleDone) {
      if (userControlledRef.current) {
        if (!arrivalSettledRef.current) {
          arrivalSettledRef.current = true;
          onCameraSettled?.();
        }
      } else {
        returningRef.current.active = true;
        returningRef.current.elapsed = 0;
        returningRef.current.targetPos.set(pose.pos[0], pose.pos[1], pose.pos[2]);
        void cc.setLookAt(
          pose.pos[0],
          pose.pos[1],
          pose.pos[2],
          pose.target[0],
          pose.target[1],
          pose.target[2],
          true
        );
      }
    } else {
      if (returningRef.current.active) {
        returningRef.current.targetPos.set(pose.pos[0], pose.pos[1], pose.pos[2]);
      }
      void cc.setLookAt(
        pose.pos[0],
        pose.pos[1],
        pose.pos[2],
        pose.target[0],
        pose.target[1],
        pose.target[2],
        true
      );
    }
    invalidate();
  }, [
    arrival,
    vehicleDone,
    focus,
    mobile,
    landscape,
    reduced,
    panelExpanded,
    panelHidden,
    invalidate,
    camera,
    screenNoZoomRef,
    screenTargetVec,
    onCameraSettled,
  ]);

  // Keyboard orbit (Arrow keys) and zoom (+ / -)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const deltaY = ctrlZoomWheelDelta(e);
      if (deltaY !== null) {
        if (isFormControlTarget(e.target)) return;
        e.preventDefault();
        userControlledRef.current = true;
        if (returningRef.current.active) {
          returningRef.current.active = false;
          if (!arrivalSettledRef.current) {
            arrivalSettledRef.current = true;
            onCameraSettled?.();
          }
        }
        dispatchWheelAtCenter(gl.domElement, deltaY);
        invalidate();
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'SELECT' ||
          target.tagName === 'TEXTAREA')
      ) {
        return;
      }
      const cc = controlsRef.current;
      if (!cc) return;
      const smooth = !reduced;
      let handled = true;
      if (e.key === 'ArrowLeft') {
        void cc.rotate(-0.18, 0, smooth);
      } else if (e.key === 'ArrowRight') {
        void cc.rotate(0.18, 0, smooth);
      } else if (e.key === 'ArrowUp') {
        void cc.rotate(0, -0.12, smooth);
      } else if (e.key === 'ArrowDown') {
        void cc.rotate(0, 0.12, smooth);
      } else if (e.key === '+' || e.key === '=') {
        void cc.dollyTo(Math.max(cc.minDistance, cc.distance * 0.8), smooth);
      } else if (e.key === '-' || e.key === '_') {
        void cc.dollyTo(Math.min(cc.maxDistance, cc.distance * 1.25), smooth);
      } else {
        handled = false;
      }
      if (handled) {
        userControlledRef.current = true;
        if (returningRef.current.active) {
          returningRef.current.active = false;
          if (!arrivalSettledRef.current) {
            arrivalSettledRef.current = true;
            onCameraSettled?.();
          }
        }
        invalidate();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [reduced, gl, invalidate, onCameraSettled]);

  // The phone's chapter panel changes height without the camera moving: place the dots again.
  useEffect(() => {
    const panel = isPortrait ? document.querySelector('.orc-panel') : null;
    if (!panel) return;
    const ro = new ResizeObserver(() => {
      projectedRef.current = false;
      invalidate();
    });
    ro.observe(panel);
    return () => ro.disconnect();
  }, [isPortrait, invalidate]);

  useFrame((_, delta) => {
    const cc = controlsRef.current;
    if (returningRef.current.active) {
      returningRef.current.elapsed += Math.min(delta, 0.1);
      const dist = camera.position.distanceTo(returningRef.current.targetPos);
      if (
        (!cc?.active && returningRef.current.elapsed > 0.15) ||
        dist < 0.08 ||
        returningRef.current.elapsed >= CAMERA_TRANSITION_SECONDS
      ) {
        returningRef.current.active = false;
        if (!arrivalSettledRef.current) {
          arrivalSettledRef.current = true;
          onCameraSettled?.();
        }
      } else {
        invalidate();
      }
    }
    if (cc && cc.active) {
      invalidate();
    }

    const overlay = overlayRef?.current;
    if (!overlay) {
      invalidate();
      return;
    }

    const map = buttonMapRef.current;
    if (map.size !== HOTSPOTS.length) {
      map.clear();
      for (const spot of HOTSPOTS) {
        const btn = overlay.querySelector<HTMLElement>(
          `[data-hotspot="${spot.id}"]`
        );
        if (btn) map.set(spot.id, btn);
      }
      if (map.size === 0) {
        invalidate();
        return;
      }
    }

    const camPos = camera.position;
    const moving = Boolean(cc && cc.active);
    const posChanged =
      !lastCamPos.current || lastCamPos.current.distanceToSquared(camPos) > 1e-5;
    const sizeChanged =
      lastSize.current.width !== size.width ||
      lastSize.current.height !== size.height;

    if (projectedRef.current && !moving && !posChanged && !sizeChanged) {
      return;
    }

    projectedRef.current = true;
    if (!lastCamPos.current) lastCamPos.current = new Vector3();
    lastCamPos.current.copy(camPos);
    lastSize.current.width = size.width;
    lastSize.current.height = size.height;

    // Dots never go under the month strip (it sits above them so its «Saber más» stays usable).
    const strip = document.querySelector('.orc-month-strip-wrap');
    const minY = strip
      ? strip.getBoundingClientRect().bottom - overlay.getBoundingClientRect().top + 24
      : 116;
    // Nor under the chapter panel: above it on a portrait phone (a bottom sheet the user drags),
    // left of it elsewhere (a card on the right).
    const panelRect = !panelHidden ? document.querySelector('.orc-panel')?.getBoundingClientRect() : null;
    const overlayRect = overlay.getBoundingClientRect();
    const panelTop = panelRect && isPortrait ? panelRect.top - overlayRect.top - 28 : null;
    const panelLeft = panelRect && !isPortrait ? panelRect.left - overlayRect.left - 28 : null;

    camera.updateMatrixWorld();
    for (const spot of HOTSPOTS) {
      const btn = map.get(spot.id);
      if (!btn) continue;

      projVec.set(spot.worldPos[0], spot.worldPos[1], spot.worldPos[2]);
      projVec.project(camera);

      const xBound = size.width >= 900 ? 1.08 : 1.45;
      const yBound = size.width >= 900 ? 1.08 : 1.45;
      const visible =
        projVec.z < 1.01 &&
        projVec.x >= -xBound &&
        projVec.x <= xBound &&
        projVec.y >= -yBound &&
        projVec.y <= yBound;

      const rawSx = ((projVec.x + 1) * size.width) / 2;
      const rawSy = ((-projVec.y + 1) * size.height) / 2;
      // A dot that would sit under the month strip is hidden, except the focused one, which is
      // pulled down; pulling them all would stack several dots on the same line.
      const underStrip = rawSy < minY && spot.id !== focus;

      if (!visible || underStrip) {
        btn.style.opacity = '0';
        btn.style.pointerEvents = 'none';
        continue;
      }

      const maxX = panelLeft ?? size.width - 68;
      const maxY = panelTop ?? (isPortrait ? size.height * 0.52 : size.height - 64);
      const sx = Math.max(58, Math.min(maxX, rawSx));
      const sy = Math.max(Math.min(minY, maxY), Math.min(maxY, rawSy));
      btn.style.opacity = '1';
      btn.style.pointerEvents = 'auto';
      btn.style.left = '0px';
      btn.style.top = '0px';
      btn.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0px) translate(-50%, -50%)`;
    }

    const screenBtn = map.get('screen');
    const screenReady = screenBtn && screenBtn.style.pointerEvents === 'auto';
    if (!readyFiredRef.current) {
      if (screenReady) {
        readyFiredRef.current = true;
        if (typeof window !== 'undefined') {
          (window as unknown as { __orcadasReady?: boolean }).__orcadasReady = true;
        }
        onReady?.();
      } else {
        invalidate();
      }
    }
  });

  return <CameraControls ref={controlsRef} makeDefault dollyToCursor />;
}

/** Fps cap of the scene, and while quality is low: fewer frames keep a slow GPU responsive. */
const SCENE_FPS = 60;
const LOW_QUALITY_FPS = 30;
/**
 * Quality monitor bounds: [decline below, incline above]. A 90 or 144 Hz screen under the 60 fps
 * cap draws 45 to 48 fps, which must still count as fast. Low quality is capped at 30 fps, so its
 * bounds sit under that cap: drawing the full 30 means the slowdown is over (for example, the
 * window was covered while the visitor looked at another one) and full quality comes back.
 */
const qualityFpsBounds = (lowQuality: boolean): [number, number] =>
  lowQuality ? [LOW_QUALITY_FPS * 0.8, LOW_QUALITY_FPS * 0.9] : [36, 42];
/** Quality changes allowed before the monitor settles on low quality: a slow GPU stops flickering. */
const QUALITY_FLIPFLOPS = 4;

/**
 * Keeps the demand-driven canvas drawing while the scene animates. Without it the snow, sea and
 * fauna only advanced when the camera moved, and jumped ahead on the next frame.
 */
function SceneClock({ reduced, lowQuality }: { reduced: boolean; lowQuality: boolean }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (reduced) return;
    let id = 0;
    let lastTickMs = 0;
    const loop = (nowMs: number) => {
      if (!document.hidden && shouldTick(nowMs, lastTickMs, lowQuality ? LOW_QUALITY_FPS : SCENE_FPS)) {
        lastTickMs = nowMs;
        invalidate();
      }
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [invalidate, reduced, lowQuality]);
  return null;
}

export const StationScene = memo(function StationScene({
  arrival = 'ship',
  month,
  hour,
  windKmh,
  windDirDeg,
  cloudOktas,
  seaIce,
  buildings,
  animals,
  focus,
  reduced,
  screenOpen = false,
  leaving = false,
  panelExpanded,
  panelHidden,
  onReady,
  onDepartureDone,
  overlayRef,
}: StationSceneProps) {
  const [webglOk, setWebglOk] = useState<boolean>(() => canUseWebGL());
  const [lowQuality, setLowQuality] = useState(false);
  const [enablePost, setEnablePost] = useState(false);
  const hasMainHouse = buildings.includes('modern');
  const screenNoZoomRef = useRef(false);
  const [vehicleDone, setVehicleDone] = useState(() => reduced);
  const [arrivalDone, setArrivalDone] = useState(() => reduced);
  const [observerAtScreen, setObserverAtScreen] = useState(
    () => screenOpen && (reduced || !buildings.includes('modern'))
  );
  const handleVehicleArrivalDone = useCallback(() => setVehicleDone(true), []);
  const handleCameraSettled = useCallback(() => setArrivalDone(true), []);
  const handleObserverAtScreen = useCallback((at: boolean) => setObserverAtScreen(at), []);
  const sceneArrival = useMemo(() => arrivalScene(arrival, month), [arrival, month]);
  const onDepartureDoneRef = useRef(onDepartureDone);
  onDepartureDoneRef.current = onDepartureDone;

  useEffect(() => {
    if (!webglOk && leaving) {
      onDepartureDoneRef.current?.();
    }
  }, [webglOk, leaving]);

  useLayoutEffect(() => {
    if (!screenOpen) setObserverAtScreen(false);
    else if (reduced || !hasMainHouse) setObserverAtScreen(true);
  }, [screenOpen, reduced, hasMainHouse]);

  useLayoutEffect(() => {
    if (reduced) {
      setVehicleDone(true);
      setArrivalDone(true);
    }
  }, [reduced]);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    const done = !webglOk || reduced || arrivalDone;
    (
      window as unknown as {
        __orcadasArrival?: { arrival: ArrivalId; done: boolean };
      }
    ).__orcadasArrival = { arrival, done };
  }, [arrival, webglOk, reduced, arrivalDone]);
  // Back on the page (another window or tab was in front), quality is measured again from scratch:
  // the slow frames of a covered window say nothing about the GPU.
  const [monitorRun, setMonitorRun] = useState(0);
  useEffect(() => {
    const remeasure = () => {
      if (document.hidden) return;
      setLowQuality(false);
      setMonitorRun((n) => n + 1);
    };
    window.addEventListener('focus', remeasure);
    document.addEventListener('visibilitychange', remeasure);
    return () => {
      window.removeEventListener('focus', remeasure);
      document.removeEventListener('visibilitychange', remeasure);
    };
  }, []);

  const { dir: sunDir, elevationDeg: sunElevationDeg } = useMemo(
    () => computeSunDirection(month, hour),
    [month, hour]
  );

  const windVec = useMemo(
    () => computeWindVector(windDirDeg, windKmh),
    [windDirDeg, windKmh]
  );

  const isNight = shouldLightWindows(month, sunElevationDeg);

  if (!webglOk) {
    return (
      <StationFallback
        month={month}
        hour={hour}
        buildings={buildings}
        onReady={onReady}
      />
    );
  }

  return (
    <div className="orc-scene-wrap" aria-hidden="true">
      <Canvas
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          background: 'var(--paper, #F3EBDD)',
        }}
        frameloop="demand"
        // Low quality also renders fewer pixels: the sky and ink passes cost per pixel.
        dpr={lowQuality ? 0.7 : 1}
        shadows={false}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          alpha: false,
          preserveDrawingBuffer: true,
        }}
        camera={{
          fov: 42,
          near: 0.5,
          far: 400,
          position: [20, 9, 26],
        }}
        onCreated={({ gl }) => {
          const dom = gl.domElement;
          // A browser may drop the context of a page in the background and give it back on return:
          // wait for it before falling back to the 2D drawing, which would stay until a reload.
          let fallbackTimer = 0;
          dom.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            fallbackTimer = window.setTimeout(() => setWebglOk(false), CONTEXT_RESTORE_MS);
          });
          dom.addEventListener('webglcontextrestored', () => window.clearTimeout(fallbackTimer));
        }}
      >
        <SceneClock reduced={reduced} lowQuality={lowQuality} />
        {/* Reduced motion draws on demand: sparse frames would read as a slow GPU. */}
        {!reduced && (
          <PerformanceMonitor
            key={monitorRun}
            bounds={() => qualityFpsBounds(lowQuality)}
            flipflops={QUALITY_FLIPFLOPS}
            onIncline={() => {
              setLowQuality(false);
              setEnablePost(true);
            }}
            onDecline={() => {
              setLowQuality(true);
              setEnablePost(false);
            }}
          />
        )}
        <SkyAndLighting
          sunDir={sunDir}
          sunElevationDeg={sunElevationDeg}
          cloudOktas={cloudOktas}
          windVec={windVec}
          reduced={reduced}
        />
        <IsthmusTerrain sunDir={sunDir} sunElevationDeg={sunElevationDeg} />
        <StageDetails />
        <BayOcean
          month={month}
          sunDir={sunDir}
          windKmh={windKmh}
          windVec={windVec}
          seaIce={seaIce}
          reduced={reduced}
        />
        <StationElements
          arrival={arrival}
          buildings={buildings}
          isNight={isNight}
          windKmh={windKmh}
          windDirDeg={windDirDeg}
          seaIce={seaIce}
          reduced={reduced}
          showHelicopter={sceneArrival.helicopterOnPad}
          screenOpen={screenOpen && (reduced || !hasMainHouse || observerAtScreen)}
          leaving={leaving}
          onVehicleArrivalDone={handleVehicleArrivalDone}
          onDepartureDone={onDepartureDone}
        />
        <WindDetails
          windKmh={windKmh}
          windDirDeg={windDirDeg}
          hasMainHouse={hasMainHouse}
          reduced={reduced}
        />
        <StationFauna
          animals={animals}
          seaIce={seaIce}
          reduced={reduced}
          arrival={arrival}
        />
        <StationCameraAndProjection
          arrival={arrival}
          vehicleDone={vehicleDone}
          focus={screenOpen ? 'screen' : focus}
          reduced={reduced}
          panelExpanded={panelExpanded}
          panelHidden={panelHidden}
          overlayRef={overlayRef}
          screenNoZoomRef={screenNoZoomRef}
          onReady={onReady}
          onCameraSettled={handleCameraSettled}
        />
        <LifeDetails
          month={month}
          animals={animals}
          hasMainHouse={hasMainHouse}
          screenOpen={screenOpen}
          reduced={reduced}
          screenNoZoomRef={screenNoZoomRef}
          onObserverAtScreen={handleObserverAtScreen}
        />
        <StationSnowfall
          month={month}
          windKmh={windKmh}
          windVec={windVec}
          reduced={reduced}
          lowQuality={lowQuality}
        />
        {enablePost && !lowQuality && (
          <EffectComposer multisampling={0}>
            <InkEffect />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  );
});

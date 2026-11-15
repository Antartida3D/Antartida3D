import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from 'react';
import { type Group } from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { boxShade, buildPolyGeometry } from '../voyage/lowPoly.ts';
import { vehicleMaterial } from '../voyage/vehicles.ts';
import {
  SKUA_POLY_MODEL,
  SNOW_PETREL_POLY_MODEL,
  mirrorZTris,
} from './lowPolyAnimals.ts';
import {
  OBSERVER_HIP_Y,
  OBSERVER_HIP_Z,
  OBSERVER_SCALE,
  OBSERVER_SHOULDER_Y,
  OBSERVER_SHOULDER_Z,
  buildObserverPolyParts,
} from './lowPolyPeople.ts';
import {
  BIRD_WING_ROOT,
  buildStationPath,
  evaluateIsthmusTerrain,
  type StationPathData,
} from './stationModels.ts';
import {
  ERA_MIN_SCALE,
  ERA_VISIBLE_THRESHOLD,
  activeBayBirds,
  bayBirdPose,
  buildObserverWalkRoute,
  buildPathSnowFootprintsTris,
  createObserverState,
  hasSnowOnPath,
  observerStridePose,
  sampleObserverWalk,
  stepObserverState,
  syncObserverState,
  type ObserverWalkControllerState,
  type TerrainHeightFn,
} from './lifeDetails.ts';

function ObserverWalker({
  hasMainHouse,
  screenOpen,
  reduced,
  screenNoZoomRef,
  pathData,
  heightAt,
  onObserverAtScreen,
}: {
  hasMainHouse: boolean;
  screenOpen: boolean;
  reduced: boolean;
  screenNoZoomRef?: RefObject<boolean>;
  pathData: StationPathData;
  heightAt: TerrainHeightFn;
  onObserverAtScreen: (atScreen: boolean) => void;
}) {
  const invalidate = useThree((s) => s.invalidate);
  const route = useMemo(
    () => buildObserverWalkRoute(pathData, heightAt),
    [pathData, heightAt],
  );

  const geos = useMemo(() => {
    const parts = buildObserverPolyParts();
    return {
      torso: buildPolyGeometry(parts.torso, boxShade),
      leg: buildPolyGeometry(parts.legL, boxShade),
      armL: buildPolyGeometry(parts.armL, boxShade),
      armR: buildPolyGeometry(parts.armR, boxShade),
    };
  }, []);

  useEffect(
    () => () => {
      geos.torso.dispose();
      geos.leg.dispose();
      geos.armL.dispose();
      geos.armR.dispose();
    },
    [geos],
  );

  const rootRef = useRef<Group>(null);
  const bodyRef = useRef<Group>(null);
  const legLRef = useRef<Group>(null);
  const legRRef = useRef<Group>(null);
  const armLRef = useRef<Group>(null);
  const armRRef = useRef<Group>(null);

  const stateRef = useRef<ObserverWalkControllerState | null>(null);
  if (!stateRef.current) {
    stateRef.current = createObserverState({
      hasMainHouse,
      screenOpen,
      reduced,
      noZoom: screenNoZoomRef?.current ?? false,
    });
  }
  const initializedLayoutRef = useRef(false);
  const atScreenRef = useRef(stateRef.current.doorReady);

  const applyRig = (state: ObserverWalkControllerState) => {
    const root = rootRef.current;
    if (!root) return;
    const visible = state.eraPresence > ERA_VISIBLE_THRESHOLD && state.progress > 0.005;
    root.visible = visible;
    if (!visible) return;

    const eraScale = OBSERVER_SCALE * Math.max(ERA_MIN_SCALE, state.eraPresence);
    root.scale.set(eraScale, eraScale, eraScale);

    const walk = sampleObserverWalk(route, state.progress, state.movingBackward);
    const stride = observerStridePose(
      state.progress * route.totalLength,
      state.isMoving ? 1 : 0,
      walk.atScreen,
    );

    root.position.set(walk.x, walk.y + stride.bobY, walk.z);
    root.rotation.set(0, walk.yaw, 0);

    if (bodyRef.current) bodyRef.current.rotation.z = stride.torsoPitchZ;
    if (legLRef.current) legLRef.current.rotation.z = stride.leftLegSwing;
    if (legRRef.current) legRRef.current.rotation.z = stride.rightLegSwing;
    if (armLRef.current) armLRef.current.rotation.z = stride.leftArmSwing;
    if (armRRef.current) armRRef.current.rotation.z = stride.rightArmSwing;
  };

  useLayoutEffect(() => {
    const noZoom = screenNoZoomRef?.current ?? false;
    const next = !initializedLayoutRef.current
      ? createObserverState({ hasMainHouse, screenOpen, reduced, noZoom })
      : syncObserverState(stateRef.current!, { hasMainHouse, screenOpen, reduced, noZoom });
    initializedLayoutRef.current = true;
    stateRef.current = next;

    if (next.doorReady !== atScreenRef.current) {
      atScreenRef.current = next.doorReady;
      onObserverAtScreen(next.doorReady);
    }

    applyRig(next);
    const eraTarget = hasMainHouse ? 1 : 0;
    if (next.isMoving || next.eraPresence !== eraTarget) {
      invalidate();
    }
  }, [hasMainHouse, screenOpen, reduced, screenNoZoomRef, onObserverAtScreen, invalidate]);

  useFrame((_, delta) => {
    const { state: next, needsFrame } = stepObserverState(
      stateRef.current!,
      route.totalLength,
      delta,
      { hasMainHouse, screenOpen, reduced },
    );
    stateRef.current = next;
    applyRig(next);
    if (next.doorReady !== atScreenRef.current) {
      atScreenRef.current = next.doorReady;
      onObserverAtScreen(next.doorReady);
    }
    if (needsFrame) {
      invalidate();
    }
  });

  return (
    <group ref={rootRef} scale={OBSERVER_SCALE} visible={false}>
      <group ref={bodyRef}>
        <mesh geometry={geos.torso} material={vehicleMaterial} />
        <group ref={armRRef} position={[0, OBSERVER_SHOULDER_Y, OBSERVER_SHOULDER_Z]}>
          <mesh geometry={geos.armR} material={vehicleMaterial} />
        </group>
        <group ref={armLRef} position={[0, OBSERVER_SHOULDER_Y, -OBSERVER_SHOULDER_Z]}>
          <mesh geometry={geos.armL} material={vehicleMaterial} />
        </group>
      </group>
      <group ref={legRRef} position={[0, OBSERVER_HIP_Y, OBSERVER_HIP_Z]}>
        <mesh geometry={geos.leg} material={vehicleMaterial} />
      </group>
      <group ref={legLRef} position={[0, OBSERVER_HIP_Y, -OBSERVER_HIP_Z]}>
        <mesh geometry={geos.leg} material={vehicleMaterial} />
      </group>
    </group>
  );
}

function PathSnowFootprints({
  month,
  pathData,
  heightAt,
}: {
  month: number;
  pathData: StationPathData;
  heightAt: TerrainHeightFn;
}) {
  const show = hasSnowOnPath(month);
  const geo = useMemo(
    () =>
      show
        ? buildPolyGeometry(buildPathSnowFootprintsTris(pathData, heightAt), boxShade)
        : null,
    [show, pathData, heightAt],
  );

  useEffect(() => () => geo?.dispose(), [geo]);

  if (!geo) return null;
  return <mesh geometry={geo} material={vehicleMaterial} />;
}

function BayBirds({
  animals,
  reduced,
}: {
  animals: readonly string[];
  reduced: boolean;
}) {
  const birds = useMemo(() => activeBayBirds(animals), [animals]);
  const groupRef = useRef<Group>(null);

  const geos = useMemo(() => {
    const skuaBody = buildPolyGeometry(SKUA_POLY_MODEL.body, boxShade);
    const skuaWingR = buildPolyGeometry(SKUA_POLY_MODEL.wing, boxShade);
    const skuaWingL = buildPolyGeometry(mirrorZTris(SKUA_POLY_MODEL.wing), boxShade);
    const petrelBody = buildPolyGeometry(SNOW_PETREL_POLY_MODEL.body, boxShade);
    const petrelWingR = buildPolyGeometry(SNOW_PETREL_POLY_MODEL.wing, boxShade);
    const petrelWingL = buildPolyGeometry(mirrorZTris(SNOW_PETREL_POLY_MODEL.wing), boxShade);
    return { skuaBody, skuaWingR, skuaWingL, petrelBody, petrelWingR, petrelWingL };
  }, []);

  useEffect(
    () => () => {
      geos.skuaBody.dispose();
      geos.skuaWingR.dispose();
      geos.skuaWingL.dispose();
      geos.petrelBody.dispose();
      geos.petrelWingR.dispose();
      geos.petrelWingL.dispose();
    },
    [geos],
  );

  const applyBirds = (t: number, isReduced: boolean) => {
    const group = groupRef.current;
    if (!group) return;
    const nodes = group.children;
    for (let i = 0; i < birds.length; i++) {
      const node = nodes[i];
      if (!node) continue;
      const pose = bayBirdPose(birds[i].id, birds[i].species, t, isReduced);
      node.position.set(pose.x, pose.y, pose.z);
      node.rotation.set(pose.roll, pose.yaw, pose.pitch, 'YXZ');
      if (node.children[1]) node.children[1].rotation.x = -pose.wingAngle;
      if (node.children[2]) node.children[2].rotation.x = pose.wingAngle;
    }
  };

  useLayoutEffect(() => {
    applyBirds(0, reduced);
  });

  useFrame(({ clock }) => {
    if (reduced || birds.length === 0) return;
    applyBirds(clock.getElapsedTime(), false);
  });

  if (birds.length === 0) return null;

  return (
    <group ref={groupRef}>
      {birds.map((b) => {
        const isPetrel = b.species === 'snowPetrel';
        return (
          <group key={b.id}>
            <mesh
              geometry={isPetrel ? geos.petrelBody : geos.skuaBody}
              material={vehicleMaterial}
            />
            <group position={BIRD_WING_ROOT}>
              <mesh
                geometry={isPetrel ? geos.petrelWingR : geos.skuaWingR}
                material={vehicleMaterial}
              />
            </group>
            <group
              position={[BIRD_WING_ROOT[0], BIRD_WING_ROOT[1], -BIRD_WING_ROOT[2]]}
            >
              <mesh
                geometry={isPetrel ? geos.petrelWingL : geos.skuaWingL}
                material={vehicleMaterial}
              />
            </group>
          </group>
        );
      })}
    </group>
  );
}

/**
 * Immersive life details for the Orcadas diorama (batch 7b):
 * walking meteorological observer on the path to the Stevenson screen, snow footprints in
 * snowy months, and skuas / snow petrels gliding slowly over Bahía Scotia.
 */
export function LifeDetails({
  month,
  animals,
  hasMainHouse,
  screenOpen,
  reduced,
  screenNoZoomRef,
  onObserverAtScreen,
}: {
  month: number;
  animals: readonly string[];
  hasMainHouse: boolean;
  screenOpen: boolean;
  reduced: boolean;
  screenNoZoomRef?: RefObject<boolean>;
  onObserverAtScreen: (atScreen: boolean) => void;
}) {
  const heightAt = useMemo(
    () => (x: number, z: number) => evaluateIsthmusTerrain(x, z).y,
    [],
  );
  const pathData = useMemo(() => buildStationPath(), []);

  return (
    <group>
      <ObserverWalker
        hasMainHouse={hasMainHouse}
        screenOpen={screenOpen}
        reduced={reduced}
        screenNoZoomRef={screenNoZoomRef}
        pathData={pathData}
        heightAt={heightAt}
        onObserverAtScreen={onObserverAtScreen}
      />
      <PathSnowFootprints month={month} pathData={pathData} heightAt={heightAt} />
      <BayBirds animals={animals} reduced={reduced} />
    </group>
  );
}

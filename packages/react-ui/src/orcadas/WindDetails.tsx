import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Object3D, type Group, type InstancedMesh } from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { SMOKE_PUFF_COUNT, orcadasWind, smokePuffPose } from '@antartida/core';
import { boxShade, buildPolyGeometry } from '../voyage/lowPoly.ts';
import { vehicleMaterial } from '../voyage/vehicles.ts';
import {
  buildFlagTris,
  buildWindCupsTris,
  buildWindVaneTris,
} from './lowPolyBuildings.ts';
import {
  buildSmokePuffTris,
  deformFlagGeometry,
  mainHouseFlueWorldPos,
  prepareFlagMeshData,
} from './windGeometry.ts';

/**
 * Weather vane and Robinson 3-cup anemometer mounted on the wind mast.
 * Both read direction and speed from `orcadasWind`.
 */
export function WindMastInstruments({
  windKmh,
  windDirDeg,
  reduced,
}: {
  windKmh: number;
  windDirDeg: number;
  reduced: boolean;
}) {
  const vaneRef = useRef<Group>(null);
  const cupsRef = useRef<Group>(null);
  const invalidate = useThree((s) => s.invalidate);

  const vaneGeo = useMemo(() => buildPolyGeometry(buildWindVaneTris(), boxShade), []);
  const cupsGeo = useMemo(() => buildPolyGeometry(buildWindCupsTris(), boxShade), []);
  const wind = useMemo(() => orcadasWind(windDirDeg, windKmh), [windDirDeg, windKmh]);

  useEffect(() => {
    return () => {
      vaneGeo.dispose();
      cupsGeo.dispose();
    };
  }, [vaneGeo, cupsGeo]);

  useLayoutEffect(() => {
    if (vaneRef.current) {
      vaneRef.current.rotation.y = wind.fromYawRad;
    }
    invalidate();
  }, [wind, invalidate]);

  useFrame((_, delta) => {
    if (reduced || !cupsRef.current || wind.cupsSpinRadPerSec <= 0) return;
    cupsRef.current.rotation.y += Math.min(delta, 0.1) * wind.cupsSpinRadPerSec;
  });

  return (
    <>
      <group ref={vaneRef} position={[0, 3.85, 0]}>
        <mesh geometry={vaneGeo} material={vehicleMaterial} />
      </group>
      <group ref={cupsRef} position={[0, 4.25, 0]}>
        <mesh geometry={cupsGeo} material={vehicleMaterial} />
      </group>
    </>
  );
}

/**
 * Argentine flag cloth mounted at the top of the flagpole.
 * Streams downwind and ripples according to `orcadasWind`.
 */
export function WindFlag({
  windKmh,
  windDirDeg,
  reduced,
}: {
  windKmh: number;
  windDirDeg: number;
  reduced: boolean;
}) {
  const invalidate = useThree((s) => s.invalidate);

  const flagData = useMemo(() => prepareFlagMeshData(buildFlagTris()), []);
  const wind = useMemo(() => orcadasWind(windDirDeg, windKmh), [windDirDeg, windKmh]);

  useEffect(() => {
    return () => {
      flagData.geometry.dispose();
    };
  }, [flagData]);

  useLayoutEffect(() => {
    deformFlagGeometry(flagData, wind, 0, reduced);
    invalidate();
  }, [flagData, wind, reduced, invalidate]);

  useFrame(({ clock }) => {
    if (reduced) return;
    deformFlagGeometry(flagData, wind, clock.getElapsedTime(), false);
  });

  return (
    <group position={[0, 3.95, 0]} rotation={[0, wind.toYawRad, 0]}>
      <mesh geometry={flagData.geometry} material={vehicleMaterial} frustumCulled={false} />
    </group>
  );
}

/**
 * Low-poly chimney smoke plume rising from the main house and leaning downwind.
 * Under reduced motion it settles into a static plume showing the wind tilt without moving.
 */
export function WindDetails({
  windKmh,
  windDirDeg,
  hasMainHouse,
  reduced,
}: {
  windKmh: number;
  windDirDeg: number;
  hasMainHouse: boolean;
  reduced: boolean;
}) {
  const smokeRef = useRef<InstancedMesh>(null);
  const invalidate = useThree((s) => s.invalidate);

  const smokeGeo = useMemo(() => buildPolyGeometry(buildSmokePuffTris(), boxShade), []);
  const dummy = useMemo(() => new Object3D(), []);
  const flueOrigin = useMemo(() => mainHouseFlueWorldPos(), []);
  const wind = useMemo(() => orcadasWind(windDirDeg, windKmh), [windDirDeg, windKmh]);

  useEffect(() => {
    return () => {
      smokeGeo.dispose();
    };
  }, [smokeGeo]);

  useLayoutEffect(() => {
    const mesh = smokeRef.current;
    if (mesh) {
      for (let i = 0; i < SMOKE_PUFF_COUNT; i++) {
        const p = smokePuffPose(i, SMOKE_PUFF_COUNT, 0, wind);
        dummy.position.set(flueOrigin[0] + p.x, flueOrigin[1] + p.y, flueOrigin[2] + p.z);
        dummy.rotation.set(p.rotX, p.rotY, 0);
        dummy.scale.set(p.scale, p.scale, p.scale);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
    invalidate();
  }, [wind, hasMainHouse, reduced, dummy, flueOrigin, invalidate]);

  useFrame(({ clock }) => {
    const mesh = smokeRef.current;
    if (reduced || !hasMainHouse || !mesh) return;
    const t = clock.getElapsedTime();
    for (let i = 0; i < SMOKE_PUFF_COUNT; i++) {
      const p = smokePuffPose(i, SMOKE_PUFF_COUNT, t, wind);
      dummy.position.set(flueOrigin[0] + p.x, flueOrigin[1] + p.y, flueOrigin[2] + p.z);
      dummy.rotation.set(p.rotX, p.rotY, 0);
      dummy.scale.set(p.scale, p.scale, p.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={smokeRef}
      args={[smokeGeo, vehicleMaterial, SMOKE_PUFF_COUNT]}
      visible={hasMainHouse}
      frustumCulled={false}
    />
  );
}

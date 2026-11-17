import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { InstancedMesh, Object3D, type Vector2 } from 'three';
import { useFrame } from '@react-three/fiber';
import {
  SNOW_GALE_KMH,
  SNOW_LOW_QUALITY_PARTICLES,
  SNOW_MAX_PARTICLES,
  snowParticleCount,
} from '@antartida/core';
import { boxShade, buildPolyGeometry } from '../voyage/lowPoly.ts';
import { vehicleMaterial } from '../voyage/vehicles.ts';
import { buildSnowPuffTris } from './lowPolyProps.ts';
import { generateSnowParticles } from './stationModels.ts';

const SNOW_SEED = 190412;
const SNOW_SPAN = 28;
const SNOW_TOP = 18;

export interface StationSnowfallProps {
  month: number;
  windKmh: number;
  windVec: Vector2;
  reduced: boolean;
  lowQuality: boolean;
}

/**
 * Low-poly snowfall and gentle spindrift in the Orcadas diorama (illustrative).
 * Particle count scales with the month's mean temperature (`snowParticleCount`)
 * and turns off completely when reduced motion is active.
 */
export function StationSnowfall({ month, windKmh, windVec, reduced, lowQuality }: StationSnowfallProps) {
  const maxForQuality = lowQuality ? SNOW_LOW_QUALITY_PARTICLES : SNOW_MAX_PARTICLES;
  return <Snowfall count={snowParticleCount(month, maxForQuality, reduced)} windKmh={windKmh} windVec={windVec} reduced={reduced} />;
}

/**
 * Low-poly flakes that fall, or blow along `windVec` when the wind is a gale (`SNOW_GALE_KMH`): `count` of
 * them (at most `SNOW_MAX_PARTICLES`), none with reduced motion. Also the blizzard of Poncho's diorama (issue #220).
 */
export function Snowfall({ count, windKmh, windVec, reduced, span = SNOW_SPAN, top = SNOW_TOP, size = 1 }: {
  count: number;
  windKmh: number;
  windVec: Vector2;
  reduced: boolean;
  /** Half the side of the square the flakes fill, and the height they fall from (the Orcadas station by default). */
  span?: number;
  top?: number;
  /** Size of a flake relative to the Orcadas one. */
  size?: number;
}) {
  const wrap = span * 2;
  const meshRef = useRef<InstancedMesh>(null);
  const activeCount = reduced ? 0 : Math.min(Math.max(0, Math.round(count)), SNOW_MAX_PARTICLES);

  const snowGeo = useMemo(() => buildPolyGeometry(buildSnowPuffTris(), boxShade), []);
  const positions = useMemo(() => generateSnowParticles(SNOW_MAX_PARTICLES, SNOW_SEED, span, top), [span, top]);
  const dummy = useMemo(() => new Object3D(), []);

  useEffect(() => {
    return () => {
      snowGeo.dispose();
    };
  }, [snowGeo]);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.count = activeCount;
    mesh.visible = activeCount > 0;
    if (activeCount <= 0) return;

    for (let i = 0; i < activeCount; i++) {
      const x = positions[i * 3];
      const y = positions[i * 3 + 1];
      const z = positions[i * 3 + 2];
      const s = (0.055 + (i % 4) * 0.012) * size;
      dummy.position.set(x, y, z);
      dummy.rotation.set(y * 1.4 + i, x * 0.9 - i, z * 0.7);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [activeCount, positions, dummy, size]);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (reduced || activeCount <= 0 || !mesh) return;

    const dt = Math.min(delta, 0.05);
    const strongGale = windKmh >= SNOW_GALE_KMH;
    const vx = windVec.x * (strongGale ? 9.5 : 4.2);
    const vz = windVec.y * (strongGale ? 9.5 : 4.2);
    const vy = strongGale ? -1.4 : -2.2;

    for (let i = 0; i < activeCount; i++) {
      let x = positions[i * 3] + vx * dt;
      let y = positions[i * 3 + 1] + vy * dt;
      let z = positions[i * 3 + 2] + vz * dt;

      if (x > span) x -= wrap;
      if (x < -span) x += wrap;
      if (z > span) z -= wrap;
      if (z < -span) z += wrap;
      if (y < 0.2) {
        y = strongGale && i % 3 === 0 ? 0.4 + (i % 5) * (top / 40) : top + 0.4;
      }

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      const s = (0.055 + (i % 4) * 0.012) * size;
      dummy.position.set(x, y, z);
      dummy.rotation.set(y * 1.4 + i, x * 0.9 - i, z * 0.7);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.count = activeCount;
    mesh.instanceMatrix.needsUpdate = true;
  });

  if (reduced || activeCount <= 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[snowGeo, vehicleMaterial, SNOW_MAX_PARTICLES]}
      frustumCulled={false}
    />
  );
}

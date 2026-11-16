import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshBasicMaterial, RingGeometry, type Group, type Mesh } from 'three';
import {
  MARAMBIO_POINT,
  ORCADAS_POINT,
  PTS,
  VOYAGE_POINT,
  heightAt,
  toWorld,
  worldHeight,
} from '@antartida/core';
import { boxShade, buildPolyGeometry } from '../voyage/lowPoly.ts';
import { BEACON_DIAMOND_POLY } from '../voyage/seaImmersiveModels.ts';
import { vehicleMaterial } from '../voyage/vehicles.ts';

const BELGRANO = PTS.find((p) => p.id === 'belgrano');
const STATION_POINTS = [ORCADAS_POINT, MARAMBIO_POINT, VOYAGE_POINT, ...(BELGRANO ? [BELGRANO] : [])];

/**
 * Subtle warm station lights and pulsing radio-beacon rings on Antarctic bases and Ushuaia.
 */
export function StationBeacons({ reduced }: { reduced: boolean }) {
  const diamondGeo = useMemo(() => buildPolyGeometry(BEACON_DIAMOND_POLY, boxShade), []);
  const ringGeo = useMemo(() => new RingGeometry(0.6, 0.85, 16), []);
  const ringMats = useMemo(
    () => STATION_POINTS.map(() => new MeshBasicMaterial({ color: 0xf2c14e, transparent: true, opacity: 0.5, depthWrite: false })),
    [],
  );

  useEffect(() => () => {
    diamondGeo.dispose();
    ringGeo.dispose();
    ringMats.forEach((m) => m.dispose());
  }, [diamondGeo, ringGeo, ringMats]);

  const beacons = useRef<(Group | null)[]>([]);
  const rings = useRef<(Mesh | null)[]>([]);

  const coords = useMemo(
    () =>
      STATION_POINTS.map((pt, idx) => {
        const ground = worldHeight(heightAt(pt.x, pt.y));
        return { pos: toWorld(pt.x, pt.y, ground + 1.8), phase: idx * 0.27 };
      }),
    [],
  );

  useFrame(({ clock }) => {
    const t = reduced ? 0.3 : clock.elapsedTime;
    coords.forEach((c, i) => {
      const b = beacons.current[i];
      if (b) {
        b.rotation.y = t * 0.9 + c.phase * 6;
        const pulse = 0.85 + Math.sin(t * 2.6 + c.phase * 6) * 0.2;
        b.scale.setScalar(pulse * 3.2);
      }
      const r = rings.current[i];
      if (r) {
        const cycle = (t * 0.45 + c.phase) % 1;
        const s = (1 + cycle * 4.5) * 2.2;
        r.scale.setScalar(s);
        ringMats[i].opacity = (1 - cycle) * 0.42;
      }
    });
  });

  return (
    <group name="station-beacons">
      {coords.map((c, i) => (
        <group key={i} position={[c.pos.x, c.pos.y, c.pos.z]}>
          <group ref={(g) => void (beacons.current[i] = g)}>
            <mesh geometry={diamondGeo} material={vehicleMaterial} />
          </group>
          <mesh
            ref={(m) => void (rings.current[i] = m)}
            geometry={ringGeo}
            material={ringMats[i]}
            rotation={[-Math.PI / 2, 0, 0]}
            position-y={-0.6}
          />
        </group>
      ))}
    </group>
  );
}

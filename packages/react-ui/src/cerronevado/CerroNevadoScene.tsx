import { useEffect, useMemo, useRef } from 'react';
import type { Group } from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { CERRO_NEVADO_SPOTS, type CerroNevadoSpotId } from '@antartida/core';
import { buildPolyGeometry, type Tri } from '../voyage/lowPoly.ts';
import { flipperWave, WAVE_RAISED } from '../voyage/pointModels.ts';
import { vehicleMaterial } from '../voyage/vehicles.ts';
import { PointScene3D, sceneShade, type SceneLimits } from '../scenepoint/PointScene3D.tsx';
import type { SceneSlotProps } from '../scenepoint/ScenePointScreen.tsx';
import { buildColonyStageTris, buildFloeChickTris, COLONY_ICEBERGS, PACK_FLOES, SPOT_VIEWS, WAVE } from './colonyScene.ts';

/** The emperor in front waves a flipper (flipperWave); with reduced motion it keeps it raised. ILLUSTRATIVE. */
function Wave({ reduced }: { reduced: boolean }) {
  const geo = useMemo(() => buildPolyGeometry(WAVE.flipper, sceneShade), []);
  useEffect(() => () => geo.dispose(), [geo]);
  const arm = useRef<Group>(null);
  const invalidate = useThree((s) => s.invalidate);
  useFrame(({ clock }) => {
    if (!arm.current) return;
    // Out from the body is +z of the emperor: a turn towards -y round its front axis.
    arm.current.rotation.x = -(reduced ? WAVE_RAISED : flipperWave(clock.elapsedTime));
    if (!reduced && !document.hidden) invalidate();
  });
  return (
    <group position={WAVE.shoulder as [number, number, number]} rotation-y={WAVE.facing}>
      <group ref={arm}>
        <mesh geometry={geo} material={vehicleMaterial} />
      </group>
    </group>
  );
}

const buildStage = (): Tri[] => [...buildColonyStageTris(), ...buildFloeChickTris()];

/** The point looked at stays over the colony and its ice. */
const LIMITS: SceneLimits = { boundary: [[-70, 0, -40], [60, 8, 30]], minDistance: 8, maxDistance: 180, minElevationDeg: 6, maxElevationDeg: 60 };

/** The scene of the emperor colony of Cerro Nevado (#206), on the common scene of points of interest. */
export function CerroNevadoScene({ reduced, ...slot }: SceneSlotProps<CerroNevadoSpotId> & { reduced: boolean }) {
  return (
    <PointScene3D spots={CERRO_NEVADO_SPOTS} views={SPOT_VIEWS} reduced={reduced} stage={buildStage} icebergs={COLONY_ICEBERGS} floes={PACK_FLOES} limits={LIMITS} {...slot}>
      <Wave reduced={reduced} />
    </PointScene3D>
  );
}

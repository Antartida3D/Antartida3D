import { useEffect, useMemo, useRef } from 'react';
import type { Group } from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { THWAITES_SCENE, type ThwaitesSpotId } from '@antartida/core';
import { buildPolyGeometry } from '../voyage/lowPoly.ts';
import { calvingPose } from '../voyage/pointModels.ts';
import { vehicleMaterial } from '../voyage/vehicles.ts';
import { PointScene3D, sceneShade, type SceneLimits } from '../scenepoint/PointScene3D.tsx';
import { ScenePointScreen, type SceneSlotProps } from '../scenepoint/ScenePointScreen.tsx';
import { buildThwaitesStageTris, CALVING, THWAITES_FLOES, THWAITES_ICEBERGS, THWAITES_VIEWS, V } from './thwaitesScene.ts';

/** The block of the front tips over its seaward foot, sinks and is gone, then again (calvingPose); with reduced motion it stands still. ILLUSTRATIVE pace. */
function Calving({ reduced }: { reduced: boolean }) {
  const geo = useMemo(() => buildPolyGeometry(CALVING?.tris ?? [], sceneShade), []);
  useEffect(() => () => geo.dispose(), [geo]);
  const pivot = useRef<Group>(null);
  const invalidate = useThree((s) => s.invalidate);
  useFrame(({ clock }) => {
    const p = pivot.current;
    if (!p) return;
    const { tilt, sink, visible } = calvingPose(reduced ? 0 : clock.elapsedTime);
    p.rotation.x = tilt;
    p.position.y = sink * V;
    p.visible = visible;
    if (!reduced && !document.hidden) invalidate();
  });
  if (!CALVING) return null;
  return (
    <group position={CALVING.pivot as [number, number, number]} rotation-y={CALVING.heading}>
      <group ref={pivot}>
        <mesh geometry={geo} material={vehicleMaterial} />
      </group>
    </group>
  );
}

/** The point looked at stays over the front and the sea in front of it. */
const LIMITS: SceneLimits = { boundary: [[-60, 0, -40], [60, 12, 50]], minDistance: 10, maxDistance: 200, minElevationDeg: 4, maxElevationDeg: 60 };

function ThwaitesScene({ reduced, ...slot }: SceneSlotProps<ThwaitesSpotId> & { reduced: boolean }) {
  return (
    <PointScene3D
      spots={THWAITES_SCENE.spots}
      views={THWAITES_VIEWS}
      reduced={reduced}
      stage={buildThwaitesStageTris}
      icebergs={THWAITES_ICEBERGS}
      floes={THWAITES_FLOES}
      limits={LIMITS}
      {...slot}
    >
      <Calving reduced={reduced} />
    </PointScene3D>
  );
}

/** Thwaites Glacier as a scene of its own (#280): its front on the Amundsen Sea. A point of interest, not an expedition. */
export function ThwaitesExpedition({ reduced, onLeave }: { reduced: boolean; onLeave: () => void }) {
  return <ScenePointScreen point={THWAITES_SCENE} scene={(slot) => <ThwaitesScene reduced={reduced} {...slot} />} onLeave={onLeave} />;
}

import { POLO_SCENE, type PoloSpotId } from '@antartida/core';
import { POLO_FLAGS } from '../voyage/pointModels.ts';
import { PointScene3D, type SceneLimits } from '../scenepoint/PointScene3D.tsx';
import { ScenePointScreen, type SceneSlotProps } from '../scenepoint/ScenePointScreen.tsx';
import { SceneFlags } from '../scenepoint/SceneFlags.tsx';
import { buildPoloStageTris, POLO_AT, POLO_K, POLO_VIEWS } from './poloScene.ts';

/** The point looked at stays over the station. */
const LIMITS: SceneLimits = { boundary: [[-60, 0, -60], [60, 20, 60]], minDistance: 10, maxDistance: 220, minElevationDeg: 4, maxElevationDeg: 70 };

function PoloScene({ reduced, ...slot }: SceneSlotProps<PoloSpotId> & { reduced: boolean }) {
  return (
    <PointScene3D spots={POLO_SCENE.spots} views={POLO_VIEWS} reduced={reduced} stage={buildPoloStageTris} noSea limits={LIMITS} {...slot}>
      <SceneFlags flags={POLO_FLAGS} k={POLO_K} at={POLO_AT} reduced={reduced} />
    </PointScene3D>
  );
}

/** The South Pole as a scene of its own (#286): the Amundsen-Scott station on the ice. A point of interest, not an expedition. */
export function PoloExpedition({ reduced, onLeave }: { reduced: boolean; onLeave: () => void }) {
  return <ScenePointScreen point={POLO_SCENE} scene={(slot) => <PoloScene reduced={reduced} {...slot} />} onLeave={onLeave} />;
}

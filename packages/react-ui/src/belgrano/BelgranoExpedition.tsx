import { BELGRANO_SCENE, type BelgranoSpotId } from '@antartida/core';
import { BELGRANO_FLAGS } from '../voyage/pointModels.ts';
import { PointScene3D, type SceneLimits } from '../scenepoint/PointScene3D.tsx';
import { ScenePointScreen, type SceneSlotProps } from '../scenepoint/ScenePointScreen.tsx';
import { SceneFlags } from '../scenepoint/SceneFlags.tsx';
import { BELGRANO_FLAGS_AT, BELGRANO_K, BELGRANO_VIEWS, buildBelgranoStageTris } from './belgranoScene.ts';

/** The point looked at stays over the nunatak. */
const LIMITS: SceneLimits = { boundary: [[-110, 0, -110], [110, 60, 110]], minDistance: 10, maxDistance: 320, minElevationDeg: 4, maxElevationDeg: 70 };

function BelgranoScene({ reduced, ...slot }: SceneSlotProps<BelgranoSpotId> & { reduced: boolean }) {
  return (
    <PointScene3D spots={BELGRANO_SCENE.spots} views={BELGRANO_VIEWS} reduced={reduced} stage={buildBelgranoStageTris} noSea limits={LIMITS} {...slot}>
      <SceneFlags flags={BELGRANO_FLAGS} k={BELGRANO_K} at={BELGRANO_FLAGS_AT} reduced={reduced} />
    </PointScene3D>
  );
}

/** Belgrano II as a scene of its own (#287): the base on the Bertrab nunatak. A point of interest, not an expedition. */
export function BelgranoExpedition({ reduced, onLeave }: { reduced: boolean; onLeave: () => void }) {
  return <ScenePointScreen point={BELGRANO_SCENE} scene={(slot) => <BelgranoScene reduced={reduced} {...slot} />} onLeave={onLeave} />;
}

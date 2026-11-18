import { VOSTOK_SCENE, type VostokSpotId } from '@antartida/core';
import { PointScene3D, type SceneLimits } from '../scenepoint/PointScene3D.tsx';
import { ScenePointScreen, type SceneSlotProps } from '../scenepoint/ScenePointScreen.tsx';
import { buildVostokStageTris, PIT, TOP, VOSTOK_VIEWS } from './vostokScene.ts';

/** The point looked at stays over the pit and its rim; the camera may go down into the pit. */
const LIMITS: SceneLimits = { boundary: [[-30, 0, -30], [PIT + 20, TOP + 10, PIT + 20]], minDistance: 15, maxDistance: 260, minElevationDeg: 4, maxElevationDeg: 70 };

function VostokScene(slot: SceneSlotProps<VostokSpotId> & { reduced: boolean }) {
  return <PointScene3D spots={VOSTOK_SCENE.spots} views={VOSTOK_VIEWS} stage={buildVostokStageTris} noSea limits={LIMITS} {...slot} />;
}

/** Lake Vostok as a scene of its own (#281): a cut through the ice sheet, from the snow to the rock. A point of interest, not an expedition. */
export function VostokExpedition({ reduced, onLeave }: { reduced: boolean; onLeave: () => void }) {
  return <ScenePointScreen point={VOSTOK_SCENE} scene={(slot) => <VostokScene reduced={reduced} {...slot} />} onLeave={onLeave} />;
}

import { TESTIGOS_SCENE, type TestigosSpotId } from '@antartida/core';
import { PointScene3D, type SceneLimits } from '../scenepoint/PointScene3D.tsx';
import { ScenePointScreen, type SceneSlotProps } from '../scenepoint/ScenePointScreen.tsx';
import { buildTestigosStageTris, PIT, TESTIGOS_VIEWS, TOP } from './testigosScene.ts';

/** The point looked at stays over the pit and the camp; the camera may go down into the pit. */
const LIMITS: SceneLimits = { boundary: [[-30, 0, -50], [PIT + 20, TOP + 30, PIT + 20]], minDistance: 15, maxDistance: 280, minElevationDeg: 4, maxElevationDeg: 70 };

function TestigosScene(slot: SceneSlotProps<TestigosSpotId> & { reduced: boolean }) {
  return <PointScene3D spots={TESTIGOS_SCENE.spots} views={TESTIGOS_VIEWS} stage={buildTestigosStageTris} noSea limits={LIMITS} {...slot} />;
}

/** The ice cores as a scene of their own (#288): the drilling camp and a cut through the ice down to the rock. A point of interest, not an expedition. */
export function TestigosExpedition({ reduced, onLeave }: { reduced: boolean; onLeave: () => void }) {
  return <ScenePointScreen point={TESTIGOS_SCENE} scene={(slot) => <TestigosScene reduced={reduced} {...slot} />} onLeave={onLeave} />;
}

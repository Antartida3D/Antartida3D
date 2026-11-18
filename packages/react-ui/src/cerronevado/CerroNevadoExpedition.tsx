import { CERRO_NEVADO_SCENE } from '@antartida/core';
import { ScenePointScreen } from '../scenepoint/ScenePointScreen.tsx';
import { CerroNevadoScene } from './CerroNevadoScene.tsx';

/**
 * The emperor colony of Cerro Nevado as a scene of its own (#206, #310), on the common screen of the
 * points of interest: the fast ice, the colony at its edge, the crèche, the camp. A point of interest, not an expedition.
 */
export function CerroNevadoExpedition({ reduced, onLeave }: { reduced: boolean; onLeave: () => void }) {
  return <ScenePointScreen point={CERRO_NEVADO_SCENE} scene={(slot) => <CerroNevadoScene reduced={reduced} {...slot} />} onLeave={onLeave} />;
}

import { CERRO_NEVADO_FACTS, CERRO_NEVADO_ID, CERRO_NEVADO_SPOTS, CERRO_NEVADO_TITLE, type CerroNevadoSpotId } from './content/cerro-nevado.ts';
import type { ScenePoint } from './content/scene-point.ts';
import { THWAITES_SCENE } from './content/thwaites-scene.ts';
import { BELGRANO_SCENE } from './content/belgrano-scene.ts';
import { POLO_SCENE } from './content/polo-scene.ts';
import { TESTIGOS_SCENE } from './content/testigos-scene.ts';
import { VOSTOK_SCENE } from './content/vostok-scene.ts';
import { CERRO_NEVADO_CITED } from './expedition-intro.ts';

/** The emperor colony of Cerro Nevado (#206), back on the common scene of points of interest (#310). */
export const CERRO_NEVADO_SCENE: ScenePoint<CerroNevadoSpotId> = { id: CERRO_NEVADO_ID, title: CERRO_NEVADO_TITLE, spots: CERRO_NEVADO_SPOTS, facts: CERRO_NEVADO_FACTS, cited: CERRO_NEVADO_CITED };

/** The points of interest that open a scene of their own, like an expedition, but do not count in the log (#280, #281, #286, #287, #288, #310). */
export const SCENE_POINTS: Readonly<Record<string, ScenePoint>> = { thwaites: THWAITES_SCENE, vostok: VOSTOK_SCENE, polo: POLO_SCENE, belgrano: BELGRANO_SCENE, testigos: TESTIGOS_SCENE, [CERRO_NEVADO_ID]: CERRO_NEVADO_SCENE };

export const isScenePoint = (id: string): boolean => id in SCENE_POINTS;

/** The main action of the modal before a point of interest with a scene: it opens it to look closer, it is not an expedition (#280). */
export const SCENE_START_LABEL = 'Ver de cerca';

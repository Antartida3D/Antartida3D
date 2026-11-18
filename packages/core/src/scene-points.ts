import type { ScenePoint } from './content/scene-point.ts';
import { THWAITES_SCENE } from './content/thwaites-scene.ts';


/** The points of interest that open a scene of their own, like an expedition, but do not count in the log (#280). */
export const SCENE_POINTS: Readonly<Record<string, ScenePoint>> = { thwaites: THWAITES_SCENE };

export const isScenePoint = (id: string): boolean => id in SCENE_POINTS;

/** The main action of the modal before a point of interest with a scene: it opens it to look closer, it is not an expedition (#280). */
export const SCENE_START_LABEL = 'Ver de cerca';

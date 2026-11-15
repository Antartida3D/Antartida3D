import { printCount, printPlace, type ScenePath, type SceneDef, type SceneElement } from '@antartida/core';
import { resolveRelief, type Tri, type Vec3 } from './lowPoly.ts';
import { ponchoPrint } from './ponchoPeople.ts';
import { HAMMER_STAKE_AT, PONCHO_PROPS, type PonchoPropId } from './ponchoProps.ts';
import { snowMound } from './ponchoShapes.ts';

/**
 * The still parts of a scene of Poncho (the props, the snow they stand in and the boot prints),
 * seated on the ground. Local frame of the scene: x ahead, z to the left, units of a person's height.
 * `ground(x, z)` is the height of the ground there, in those units and relative to the middle of the scene.
 * People, dogs and sleds move, so they are drawn apart (PonchoScenes3D.tsx).
 */
export type Ground = (x: number, z: number) => number;

/** How far the foot of a prop goes into the ground, so on a bump it does not float (as PointModels' FOUNDATION, in scene units). */
const FOUNDATION = 0.03;
/** A dog that lies curled in the snow: size of the drift it sleeps in. */
const DRIFT: readonly [number, number, number] = [0.42, 0.34, 0.1];
/** Scale of a dog next to a person (ponchoProps.ts: ~0.55). */
export const DOG_SCALE = 0.55;

/** The faces placed at (x, z) turned by `yaw` and scaled, each vertex raised to the ground under it. */
export function seatAt(tris: readonly Tri[], x: number, z: number, yaw: number, scale: number, ground: Ground): Tri[] {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const place = ([px, py, pz]: Vec3): Vec3 => {
    const lx = x + (px * c + pz * s) * scale;
    const lz = z + (-px * s + pz * c) * scale;
    return [lx, py * scale + ground(lx, lz) - (py <= 0.0005 ? FOUNDATION : 0), lz];
  };
  return tris.map(([a, b, d, col]) => [place(a), place(b), place(d), col]);
}

/** Where a thing that stands at the person's `offset` (person at the origin facing +x) is, for the person placed at `e`. */
function atPerson(e: SceneElement, offset: readonly [number, number]): [number, number] {
  const k = e.scale ?? 1;
  const c = Math.cos(e.yaw);
  const s = Math.sin(e.yaw);
  return [e.x + (offset[0] * c + offset[1] * s) * k, e.z + (-offset[0] * s + offset[1] * c) * k];
}

/** The still faces of one element, seated on the ground (relief colors not resolved): its prop, the stake it drives or the drift it sleeps in. Empty for the ones that move. */
export function elementStaticTris(e: SceneElement, i: number, ground: Ground): Tri[] {
  if (e.kind === 'prop') return seatAt(PONCHO_PROPS[e.id as PonchoPropId].tris, e.x, e.z, e.yaw, e.scale ?? 1, ground);
  if (e.kind === 'person' && e.action === 'hammer') {
    const [sx, sz] = atPerson(e, HAMMER_STAKE_AT);
    return seatAt(PONCHO_PROPS.stakeAndPick.tris, sx, sz, e.yaw, e.scale ?? 1, ground);
  }
  if (e.kind === 'dog' && e.curled) return seatAt(snowMound(0, 0, DRIFT[0], DRIFT[1], DRIFT[2], 200 + i, 9), e.x, e.z, e.yaw, 1, ground);
  return [];
}

/** Props, the stake each hammerer drives and the drifts of the curled dogs, seated and colored as the relief (worldY: height in the world). */
export function sceneStaticTris(scene: SceneDef, ground: Ground, worldY: (y: number) => number): Tri[] {
  return resolveRelief(scene.elements.flatMap((e, i) => elementStaticTris(e, i, ground)), worldY);
}

export interface ScenePrints {
  readonly tris: readonly Tri[];
  /** Faces of one print: `tris.slice(k * perPrint, (k + 1) * perPrint)` is the k-th, in the order the walker leaves them. */
  readonly perPrint: number;
  readonly count: number;
}

/** The boot prints along a path, in order, following its corners. */
export function pathFootprints(path: ScenePath, ground: Ground): ScenePrints {
  const count = printCount(path);
  const tris = Array.from({ length: count }, (_, k) => {
    const p = printPlace(path, k);
    return ponchoPrint(p.x, p.z, p.yaw, k, ground);
  }).flat();
  return { tris, perPrint: tris.length / count, count };
}

/** The boot prints of the scene's walker (the path that has `prints`), in order along the path, or null. */
export function sceneFootprints(scene: SceneDef, ground: Ground): ScenePrints | null {
  const path = scene.paths.find((p) => p.prints);
  return path ? pathFootprints(path, ground) : null;
}

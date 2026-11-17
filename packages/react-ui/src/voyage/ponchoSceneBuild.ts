import { printCount, printPlace, type ScenePath, type SceneDef, type SceneElement } from '@antartida/core';
import { resolveRelief, type Tri, type Vec3 } from './lowPoly.ts';
import { ponchoPrint } from './ponchoPeople.ts';
import { HAMMER_STAKE_AT, PONCHO_PROP_IDS, PONCHO_PROPS, type PonchoPropId } from './ponchoProps.ts';
import { buildRescueRotor, PONCHO_PROP2_IDS, PONCHO_PROPS2, RESCUE_ROTOR_AT, type PonchoProp2Id } from './ponchoProps2.ts';
import { SHIP_PROP_ID, shipStaticTris } from './ponchoShip.ts';

/**
 * The still parts of a scene of Poncho (the props, the snow they stand in and the boot prints),
 * seated on the ground. Local frame of the scene: x ahead, z to the left, units of a person's height.
 * `ground(x, z)` is the height of the ground there, in those units and relative to the middle of the scene.
 * People, dogs and sleds move, so they are drawn apart (PonchoScenes3D.tsx).
 */
export type Ground = (x: number, z: number) => number;

/** How far the foot of a prop goes into the ground, so on a bump it does not float (as PointModels' FOUNDATION, in scene units). */
const FOUNDATION = 0.03;
/** Scale of a dog next to a person (ponchoProps.ts: ~0.55). */
export const DOG_SCALE = 0.55;

/** The faces placed at (x, z) turned by `yaw` and scaled, each vertex raised to the ground under it. */
export function seatAt(tris: readonly Tri[], x: number, z: number, yaw: number, scale: number, ground: Ground, lift = 0): Tri[] {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const place = ([px, py, pz]: Vec3): Vec3 => {
    const lx = x + (px * c + pz * s) * scale;
    const lz = z + (-px * s + pz * c) * scale;
    return [lx, py * scale + ground(lx, lz) + lift - (py <= 0.0005 && lift === 0 ? FOUNDATION : 0), lz];
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

/** Every prop a scene may name: those of ponchoProps.ts and of ponchoProps2.ts, and the ship afloat (ponchoShip.ts). */
export const SCENE_PROP_IDS: readonly string[] = [...PONCHO_PROP_IDS, ...PONCHO_PROP2_IDS, SHIP_PROP_ID];

/**
 * The ground the props of a scene take beyond their own radius (`PonchoProp.clearings`), as circles (x, z, radius) in the
 * frame of the scene: a prop as big as a base stands at one point, but its houses must not get rocks scattered inside them.
 */
export function sceneClearings(scene: SceneDef): [number, number, number][] {
  return scene.elements.flatMap((e) => {
    if (e.kind !== 'prop' || !(e.id in PONCHO_PROPS)) return [];
    const k = e.scale ?? 1;
    const c = Math.cos(e.yaw);
    const s = Math.sin(e.yaw);
    return PONCHO_PROPS[e.id as PonchoPropId].clearings.map(([px, pz, r]): [number, number, number] => [e.x + (px * c + pz * s) * k, e.z + (-px * s + pz * c) * k, r * k]);
  });
}

/** The faces of a prop by id. The parked helicopter takes its rotor, at rest. */
export function scenePropTris(id: string): readonly Tri[] {
  if (id in PONCHO_PROPS) return PONCHO_PROPS[id as PonchoPropId].tris;
  const prop = PONCHO_PROPS2[id as PonchoProp2Id];
  if (id !== 'rescueHelicopter') return prop.tris;
  const [rx, ry, rz] = RESCUE_ROTOR_AT;
  return [...prop.tris, ...buildRescueRotor().map(([a, b, c, color]): Tri => [[a[0] + rx, a[1] + ry, a[2] + rz], [b[0] + rx, b[1] + ry, b[2] + rz], [c[0] + rx, c[1] + ry, c[2] + rz], color])];
}

/** The still faces of one element, seated on the ground (relief colors not resolved): its prop or the stake it drives. Empty for the others (a curled dog lies on the bare ground, #261). */
export function elementStaticTris(e: SceneElement, ground: Ground): Tri[] {
  // The ship rides on the water, not on the sea bed under it: only the foot of its gangway follows the ice.
  if (e.kind === 'prop' && e.id === SHIP_PROP_ID) return shipStaticTris(ground);
  // A prop on a path flies (the helicopter): it is drawn apart, moving (PonchoDioramaActors.tsx).
  if (e.kind === 'prop' && e.path) return [];
  if (e.kind === 'prop') return seatAt(scenePropTris(e.id), e.x, e.z, e.yaw, e.scale ?? 1, ground, e.fall?.to ?? e.lift ?? 0);
  if (e.kind === 'person' && e.action === 'hammer') {
    const [sx, sz] = atPerson(e, HAMMER_STAKE_AT);
    return seatAt(PONCHO_PROPS.stakeAndPick.tris, sx, sz, e.yaw, e.scale ?? 1, ground);
  }
  return [];
}

/** Props and the stake each hammerer drives, seated and colored as the relief (worldY: height in the world). */
export function sceneStaticTris(scene: SceneDef, ground: Ground, worldY: (y: number) => number): Tri[] {
  return resolveRelief(scene.elements.flatMap((e) => elementStaticTris(e, ground)), worldY);
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

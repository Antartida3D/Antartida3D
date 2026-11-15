import { clamp01 } from './voyage.ts';

/**
 * Living scenes of Poncho's stops (issue #142): what is drawn beside the team when it reaches a
 * stop of the book, and how the camera looks at it. Pure data and rules, no drawing: the models
 * and poses live in react-ui (voyage/ponchoPeople.ts, ponchoProps.ts, ponchoModels.ts).
 *
 * Every scene only ILLUSTRATES what its stop already tells (page of the book in content/poncho.ts):
 * the positions, poses and colors are invented to read well, not measured. No scene has a fire.
 *
 * Units: a scene unit is the height of a standing person (~1). The scene's local frame has +x along
 * the heading of the team, +z to the left of it, and y up. A yaw is the one of three.js `rotation.y`:
 * it turns a thing that faces +x towards -z.
 */

/** What a person does: the poses of ponchoPeople.ts plus `cheer`, drawn by the scene itself. */
export type SceneAction = 'stand' | 'walk' | 'hammer' | 'probe' | 'shovel' | 'haul' | 'cheer';
export const SCENE_ACTIONS: readonly SceneAction[] = ['stand', 'walk', 'hammer', 'probe', 'shovel', 'haul', 'cheer'];

export type SceneElementKind = 'person' | 'prop' | 'dog' | 'sled';

/** A straight walk of the scene: from `from` to `to` (local x, z), once, `delay` s after the scene shows. */
export interface ScenePath {
  readonly id: string;
  readonly from: readonly [number, number];
  readonly to: readonly [number, number];
  /** Seconds after the scene appears before it starts, and seconds the walk takes. */
  readonly delay: number;
  readonly duration: number;
  /** The one who walks it leaves boot prints (at most one such path per scene). */
  readonly prints?: boolean;
}

export interface SceneElement {
  readonly kind: SceneElementKind;
  /**
   * person: parka variant (`orange`, `red`, `orangeNavy`); prop: a `PONCHO_PROPS` id; sled: `nansenSled`;
   * dog: `poncho` (Poncho himself) or `pack` (a darker dog of the team).
   */
  readonly id: string;
  /** Position in the local frame, in scene units. */
  readonly x: number;
  readonly z: number;
  readonly yaw: number;
  /** Size relative to the default of its kind (people 1; dogs 0.55 of a person; props 1). */
  readonly scale?: number;
  /** person: what they do. */
  readonly action?: SceneAction;
  /** person: where in the pose cycle they start, radians (so a group does not move in unison). */
  readonly phaseOffset?: number;
  /** A path this one follows (a walker, or a team arriving): id of `SceneDef.paths`. */
  readonly path?: string;
  /** With a path: units ahead of the point of the path (along it) and to its left. */
  readonly lead?: number;
  readonly side?: number;
  /** dog: lying curled in the snow. */
  readonly curled?: boolean;
}

/** How the camera looks at a scene when its card opens. */
export interface SceneCamera {
  /** Distance as a multiple of the closest the map allows there (minCameraDistance): never under 1. */
  readonly distanceFactor: number;
  /** Degrees over the horizon; at least 90 - MAX_POLAR_DEG (the map's polar limit). */
  readonly elevationDeg: number;
  /** Degrees from the heading of the team, to the side the camera stands on (see `sceneCameraOffset`). */
  readonly azimuthDeg: number;
}

/**
 * One guided shot of the diorama (issue #146): what the camera looks at while the panel tells one
 * sentence of the stop's `essential` text. In the local frame of the scene (units of a person's
 * height, +x ahead, +z to the left, y up): `target` is the point looked at, and the camera stands
 * `distance` away from it, `elevation` degrees over the horizon and `azimuth` degrees round the
 * vertical (0 = on the +x side of the target, 90 = on the +z side, as `sceneCameraOffset`).
 */
export interface SceneShot {
  /** Index of the sentence of `essential` (essentialSentences) this shot goes with. */
  readonly sentence: number;
  readonly target: readonly [number, number, number];
  readonly distance: number;
  readonly elevation: number;
  readonly azimuth: number;
}

export interface SceneDef {
  /** Every element lies within this many scene units of the middle of the scene. */
  readonly radius: number;
  readonly elements: readonly SceneElement[];
  readonly paths: readonly ScenePath[];
  /** How the map camera looks at the scene when the card opens (the descent to the stop). */
  readonly camera: SceneCamera;
  /** One shot per sentence of the stop's `essential` text, in order (a test keeps the count). */
  readonly shots: readonly SceneShot[];
}

/** Limits of a shot: the diorama's camera never comes closer than a dog's size, nor leaves the stage far behind. */
export const SHOT_DISTANCE: readonly [number, number] = [2.2, 10];
export const SHOT_ELEVATION_DEG: readonly [number, number] = [10, 70];
export const SHOT_TARGET_HEIGHT: readonly [number, number] = [0, 1.6];

/** Most elements, persons and printed paths a scene may have: draw calls on a phone. */
export const MAX_SCENE_ELEMENTS = 14;
export const MAX_SCENE_PEOPLE = 5;
export const MAX_SCENE_RADIUS = 4.6;

/**
 * The middle of the scene stands this far (world units) from the team, to its left, so the team stays
 * in view beside it: about 4.8 scene units at the closest the camera comes (25 * SCENE_UNIT_PER_DISTANCE).
 * A fixed world distance, so the scene does not slide away from the camera's target when the user zooms.
 */
export const SCENE_SIDE_WORLD = 7.2;
/** Distance between two boot prints and the pace of the walk (a pose cycle covers two prints). */
export const SCENE_STRIDE = 0.55;
/** Pose cycles per second of the people who work (radians per second = this * 2 pi): a strike or a shovelful about every 1.4 s. */
export const SCENE_WORK_RATE = 0.7;
/** Height of the hop of someone who cheers, in scene units. */
export const SCENE_HOP = 0.16;

const DEG = Math.PI / 180;

/** Yaw of a thing at (x, z) that faces the point (tx, tz). */
export const yawToward = (x: number, z: number, tx: number, tz: number): number => Math.atan2(-(tz - z), tx - x);

const shot = (sentence: number, target: readonly [number, number, number], distance: number, elevation: number, azimuth: number): SceneShot =>
  ({ sentence, target, distance, elevation, azimuth });

const person = (id: string, x: number, z: number, yaw: number, action: SceneAction, phaseOffset = 0, extra: Partial<SceneElement> = {}): SceneElement =>
  ({ kind: 'person', id, x, z, yaw, action, phaseOffset, ...extra });
const prop = (id: string, x: number, z: number, yaw = 0, scale = 1): SceneElement => ({ kind: 'prop', id, x, z, yaw, scale });
const dog = (id: 'poncho' | 'pack', x: number, z: number, yaw: number, extra: Partial<SceneElement> = {}): SceneElement =>
  ({ kind: 'dog', id, x, z, yaw, ...extra });
const sled = (x: number, z: number, yaw: number, extra: Partial<SceneElement> = {}): SceneElement =>
  ({ kind: 'sled', id: 'nansenSled', x, z, yaw, ...extra });

const ORANGE = 'orange';
const RED = 'red';
const NAVY = 'orangeNavy';

/**
 * The scenes, by milestone id (content/poncho.ts). Stops without one (`rumbo-a-belgrano`,
 * `patrulla-paralelo-82`, `paracaidas`, `adios-a-la-antartida`, `ushuaia`) keep the plain camera.
 */
export const PONCHO_SCENES: Readonly<Record<string, SceneDef>> = {
  // Training (book p. 9): an instructor with a line tied to the waist and Poncho at the other end, a slalom between poles.
  nacimiento: {
    radius: 3.6,
    elements: [
      prop('slalomPoles', -0.1, -1.2),
      prop('haulLine', 0.5, 0.4),
      person(ORANGE, 1.5, 0.4, Math.PI, 'haul'),
      dog('poncho', -0.7, 0.4, Math.PI),
      person(RED, -2.3, 2.0, 0, 'walk', 0, { path: 'walker' }),
    ],
    paths: [{ id: 'walker', from: [-2.3, 2.0], to: [2.3, 1.8], delay: 0.4, duration: 6, prints: true }],
    camera: { distanceFactor: 1.05, elevationDeg: 42, azimuthDeg: -112 },
    shots: [
      shot(0, [0, 0.5, 0.8], 8, 32, -100),
      shot(1, [-0.7, 0.35, 0.4], 3.2, 18, 195),
      shot(2, [0.4, 0.6, -0.4], 5, 28, -120),
    ],
  },
  // Probing for crevasses (book p. 12): they sink poles and stakes into the snow; Poncho sniffs ahead, the sled waits behind.
  'expedicion-invernal-1962': {
    radius: 3.6,
    elements: [
      prop('crevasseBridge', 0, 0.3),
      person(ORANGE, -0.8, -0.9, -Math.PI / 2, 'probe'),
      person(RED, 0.9, -0.9, -Math.PI / 2, 'hammer', 1.9),
      person(NAVY, 2.0, -0.4, yawToward(2.0, -0.4, 1.0, 0.3), 'probe', 3.7),
      dog('poncho', 0.5, 1.5, 0),
      sled(-2.6, 0.6, 0),
      dog('pack', -1.6, 0.35, 0),
      dog('pack', -1.6, 0.85, 0),
    ],
    paths: [],
    camera: { distanceFactor: 1.05, elevationDeg: 44, azimuthDeg: -100 },
    shots: [
      shot(0, [0, 0.5, 0], 9, 30, 70),
      shot(1, [0.5, 0.35, 1.5], 3.2, 18, 20),
      shot(2, [0.4, 0.5, -0.2], 5.5, 30, 80),
    ],
  },
  // Winter camp (book p. 10): the dogs stay under one or two meters of snow and the men dig them out.
  'poncho-perro-guia': {
    radius: 3.4,
    elements: [
      prop('tent', -0.8, 0.6, Math.PI),
      dog('pack', 1.4, -0.2, 0.4, { curled: true }),
      dog('poncho', 2.0, 0.5, -2.2, { curled: true }),
      dog('pack', 1.2, 1.1, 2.4, { curled: true }),
      dog('pack', 2.3, 1.5, 0.9, { curled: true }),
      person(ORANGE, 1.2, -1.5, -Math.PI / 2, 'shovel'),
      prop('shovel', 2.5, -0.9, 0.3),
    ],
    paths: [],
    camera: { distanceFactor: 1.05, elevationDeg: 42, azimuthDeg: -125 },
    shots: [
      shot(0, [1, 0.4, 0.4], 8, 30, -110),
      shot(1, [2, 0.25, 0.5], 2.8, 24, -60),
      shot(2, [1.2, 0.7, -1.5], 4, 22, 80),
    ],
  },
  // The little plane that came down (book p. 17-18): the men jump for joy and hug Poncho; the sled arrives.
  'rescate-ae-205': {
    radius: 4.5,
    elements: [
      prop('crashedPlane', 0.5, 1.6, 0.5, 0.85),
      person(ORANGE, -1.6, -0.2, yawToward(-1.6, -0.2, -0.7, -0.2), 'cheer', 0),
      person(RED, -0.6, -1.1, yawToward(-0.6, -1.1, -0.7, -0.2), 'cheer', 2.2),
      person(NAVY, 0.2, -0.3, yawToward(0.2, -0.3, -0.7, -0.2), 'cheer', 4.1),
      dog('poncho', -0.7, -0.2, yawToward(-0.7, -0.2, -1.6, -0.2)),
      sled(-3.6, -2.4, 0.07, { path: 'arrival' }),
      dog('pack', -3.6, -2.4, 0.07, { path: 'arrival', lead: 1.1, side: 0.28 }),
      dog('pack', -3.6, -2.4, 0.07, { path: 'arrival', lead: 1.1, side: -0.28 }),
    ],
    paths: [{ id: 'arrival', from: [-3.6, -2.4], to: [-1.0, -2.2], delay: 0.2, duration: 5 }],
    camera: { distanceFactor: 1.1, elevationDeg: 40, azimuthDeg: -115 },
    shots: [
      shot(0, [0.5, 0.6, 1.6], 6.5, 28, -80),
      shot(1, [-2.3, 0.4, -2.3], 5.5, 25, 60),
      shot(2, [-0.7, 0.4, -0.2], 3.4, 18, 235),
    ],
  },
  // Lost compass (book p. 20): three canes with streamers in the snow; a man looks at Poncho.
  'brujula-perdida': {
    radius: 3.2,
    elements: [
      prop('flaggedCanes', 0.6, 0.5, 0, 1.4),
      sled(-2.2, -0.5, 0.1),
      dog('pack', -1.2, -0.7, 0.1),
      dog('pack', -1.2, -0.2, 0.1),
      dog('poncho', -0.1, 0.5, 0.1),
      person(NAVY, -0.3, -1.1, yawToward(-0.3, -1.1, -0.1, 0.5), 'stand'),
    ],
    paths: [],
    camera: { distanceFactor: 1.05, elevationDeg: 42, azimuthDeg: -120 },
    shots: [
      shot(0, [-0.5, 0.5, 0], 8.5, 28, -90),
      shot(1, [-2.2, 0.3, -0.5], 4, 24, -40),
      shot(2, [-0.2, 0.6, -0.3], 4.2, 18, 200),
    ],
  },
};

/** The scene of a stop, or undefined (then the plain camera and nothing drawn). */
export const sceneOf = (milestoneId: string): SceneDef | undefined => PONCHO_SCENES[milestoneId];

/** Phase (radians, 0 to 2 pi) of someone who works, for a clock `t` in seconds: the clock is the caller's. */
export function scenePersonPhase(t: number, offset: number, rate = SCENE_WORK_RATE * Math.PI * 2): number {
  const turn = Math.PI * 2;
  const p = (t * rate + offset) % turn;
  return p < 0 ? p + turn : p;
}

export const scenePathLength = (path: ScenePath): number => Math.hypot(path.to[0] - path.from[0], path.to[1] - path.from[1]);

/** Yaw of someone who goes along the path. */
export const scenePathYaw = (path: ScenePath): number => yawToward(path.from[0], path.from[1], path.to[0], path.to[1]);

/** Fraction of the path walked `t` seconds after the scene showed (0 before it starts, 1 after it ends). */
export function scenePathProgress(path: ScenePath, t: number): number {
  return clamp01((t - path.delay) / path.duration);
}

/** The point of the path at fraction `u` (clamped), with its yaw. */
export function walkPosition(path: ScenePath, u: number): { x: number; z: number; yaw: number } {
  const k = clamp01(u);
  return {
    x: path.from[0] + (path.to[0] - path.from[0]) * k,
    z: path.from[1] + (path.to[1] - path.from[1]) * k,
    yaw: scenePathYaw(path),
  };
}

/** Phase of the walk at fraction `u` of the path: one pose cycle every two prints, so the feet do not slide. */
export function walkPhase(path: ScenePath, u: number): number {
  return (clamp01(u) * scenePathLength(path) * Math.PI) / SCENE_STRIDE;
}

/** Number of boot prints along a path, the first at its start. */
export const printCount = (path: ScenePath): number => Math.floor(scenePathLength(path) / SCENE_STRIDE) + 1;

/** Boot prints that show when the walker is at fraction `u`: the ones it has left behind. */
export function printsShown(path: ScenePath, u: number): number {
  return Math.min(printCount(path), Math.floor(clamp01(u) * scenePathLength(path) / SCENE_STRIDE) + 1);
}

/** Height of the hop of someone who cheers at `phase` (always 0 or more). */
export const sceneHop = (phase: number): number => SCENE_HOP * Math.max(0, Math.sin(phase)) ** 1.5;

/**
 * Where the camera stands from the middle of the scene (world x, y, z offsets), `distance` away: at
 * `azimuthDeg` from the heading of the team (in the local frame: +x ahead, +z to the left) and
 * `elevationDeg` over the horizon. `heading` is the team's heading in map space (atan2(dy, dx)).
 */
export function sceneCameraOffset(camera: SceneCamera, heading: number, distance: number): { x: number; y: number; z: number } {
  const az = heading + camera.azimuthDeg * DEG;
  const el = camera.elevationDeg * DEG;
  return { x: Math.cos(az) * Math.cos(el) * distance, y: Math.sin(el) * distance, z: Math.sin(az) * Math.cos(el) * distance };
}

/** The middle of the scene in map space, for a stop at (x, y) and the team's heading. */
export function sceneCenter(x: number, y: number, heading: number): { x: number; y: number } {
  return { x: x - Math.sin(heading) * SCENE_SIDE_WORLD, y: y + Math.cos(heading) * SCENE_SIDE_WORLD };
}

/**
 * Scene units (world size of one) per unit of camera distance, and the least and most: what the camera
 * follows scales with its distance (rule 30, 6), so at the closest zoom the scene reads whole; far away
 * its exaggerated size stops growing (SCENE_UNIT_MAX) and it shrinks like the rest of the map.
 */
export const SCENE_UNIT_PER_DISTANCE = 0.06;
export const SCENE_UNIT_MIN = 0.25;
export const SCENE_UNIT_MAX = 3;
export const sceneUnit = (distance: number): number => Math.min(SCENE_UNIT_MAX, Math.max(SCENE_UNIT_MIN, distance * SCENE_UNIT_PER_DISTANCE));

/** Words that end in a dot without ending the sentence (Gral. Belgrano, Nº 1, p. 12). */
const ABBREVIATIONS = new Set(['gral', 'sr', 'sra', 'dr', 'dra', 'cnel', 'tte', 'cap', 'cdte', 'av', 'ing', 'lic', 'prof', 'sta', 'sto', 'n', 'nº', 'n°', 'p', 'pp', 'pág', 'págs', 'vs', 'aprox']);
const SENTENCE_END = '.!?…';
const CLOSERS = '»”"\')';
const OPENERS = '«“"¿¡(';

/**
 * The sentences of a text, in order: the diorama tells one per shot. It splits after `.`, `!`, `?` or
 * `…` followed by a space and the start of another sentence (a capital letter, a digit or an opening
 * mark), but not inside «quotes», after an abbreviation (`Gral.`, `Nº`, `p.`) nor in a number (`1.500`,
 * `1,5`). The sentences joined with one space give back the text.
 */
export function essentialSentences(text: string): string[] {
  const source = text.trim();
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (ch === '«') depth++;
    else if (ch === '»') depth = Math.max(0, depth - 1);
    if (!SENTENCE_END.includes(ch)) continue;
    // Closing marks stuck to the stop belong to the sentence it ends: «No trabajó.»
    let j = i + 1;
    let open = depth;
    while (j < source.length && CLOSERS.includes(source[j])) {
      if (source[j] === '»') open = Math.max(0, open - 1);
      j++;
    }
    if (open > 0 || j >= source.length || !/\s/.test(source[j])) continue;
    let k = j;
    while (k < source.length && /\s/.test(source[k])) k++;
    if (k >= source.length) continue;
    const next = source[k];
    if (!(next !== next.toLowerCase() || /\d/.test(next) || OPENERS.includes(next))) continue;
    if (ch === '.' && ABBREVIATIONS.has((/([\p{L}º°]+)$/u.exec(source.slice(start, i))?.[1] ?? '').toLowerCase())) continue;
    out.push(source.slice(start, j).trim());
    depth = open;
    start = k;
    i = k - 1;
  }
  const rest = source.slice(start).trim();
  if (rest) out.push(rest);
  return out;
}

/** Where the diorama's camera stands and what it looks at for a shot (scene frame: x, y up, z). */
export function shotPose(shot: SceneShot): { eye: [number, number, number]; target: [number, number, number] } {
  const az = shot.azimuth * DEG;
  const el = shot.elevation * DEG;
  const [tx, ty, tz] = shot.target;
  return {
    target: [tx, ty, tz],
    eye: [tx + Math.cos(az) * Math.cos(el) * shot.distance, ty + Math.sin(el) * shot.distance, tz + Math.sin(az) * Math.cos(el) * shot.distance],
  };
}

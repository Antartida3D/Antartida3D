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
export type SceneAction = 'stand' | 'walk' | 'hammer' | 'probe' | 'shovel' | 'haul' | 'cheer' | 'tend';
export const SCENE_ACTIONS: readonly SceneAction[] = ['stand', 'walk', 'hammer', 'probe', 'shovel', 'haul', 'cheer', 'tend'];

/**
 * What lies round the stage (issue #146): `plain` is snow to the horizon; `coast` has the sea along
 * one side (the +z side of the scene, see `sceneCoastZ`) and plain on the rest; `station` (issue #216) is the bare
 * rock of a polar station, gravel with patches of snow, with a snowy mountain rising behind it (on the +z side).
 */
export type SceneSetting = 'plain' | 'coast' | 'station';
export const SCENE_SETTINGS: readonly SceneSetting[] = ['plain', 'coast', 'station'];

/** Where the sea begins on a `coast` scene: local z of the edge of the ice at the middle, and how it wanders along x. */
export const SCENE_COAST_Z = 4.7;
export const sceneCoastZ = (x: number): number => SCENE_COAST_Z + 0.35 * Math.sin(x * 0.7 + 0.5) + 0.2 * Math.sin(x * 1.9);

export type SceneElementKind = 'person' | 'prop' | 'dog' | 'sled';

/**
 * A walk of the scene: from `from` through the points `via` (if any) to `to` (local x, z), once, `delay` s
 * after whoever follows it shows (`loop`: again and again, from the start; a closed circuit when `to` is
 * `from`). Prints are left along it, in order, while it is first walked.
 */
export interface ScenePath {
  readonly id: string;
  readonly from: readonly [number, number];
  readonly via?: readonly (readonly [number, number])[];
  readonly to: readonly [number, number];
  readonly loop?: boolean;
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
  /** dog: sniffs the snow, its head bobbing down and up while it goes (issue #217). */
  readonly sniff?: boolean;
  /** dog: lying curled on the ground, with no drift of snow under it (#261). */
  readonly curled?: boolean;
  /** With a path: seconds behind the one at the point of the path (a litter in single file follows the same trail). */
  readonly lag?: number;
  /**
   * Stages: the element shows from step `appearAt` (default 0) and goes before step `until` (default:
   * stays), growing out of the ground and sinking back (see `stageProgress`). The steps are the shots.
   */
  readonly appearAt?: number;
  readonly until?: number;
  /** person: wears the wide harness belt and is tied, from it, to the dog `rope.to` (index of `elements`) by a line this long. */
  readonly rope?: { readonly to: number; readonly length: number };
  /** Radius of the space it takes on the ground, when it is not the one of its kind (see `sceneBodyRadius`). */
  readonly radius?: number;
  /** prop, dog: height over the ground it hangs at, in scene units (a dog under its parachute, and the parachute). */
  readonly lift?: number;
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
  /** What lies round the stage: plain snow, or the sea along one side. */
  readonly setting: SceneSetting;
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
export const SHOT_DISTANCE: readonly [number, number] = [2.2, 22];
export const SHOT_ELEVATION_DEG: readonly [number, number] = [10, 70];
export const SHOT_TARGET_HEIGHT: readonly [number, number] = [0, 1.6];

/** Most elements and persons showing at once in a scene, and most in all (they are all built): draw calls on a phone. */
export const MAX_SCENE_ELEMENTS = 14;
export const MAX_SCENE_PEOPLE = 5;
export const MAX_SCENE_TOTAL = 22;
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
const prop = (id: string, x: number, z: number, yaw = 0, scale = 1, extra: Partial<SceneElement> = {}): SceneElement => ({ kind: 'prop', id, x, z, yaw, scale, ...extra });
const dog = (id: 'poncho' | 'pack', x: number, z: number, yaw: number, extra: Partial<SceneElement> = {}): SceneElement =>
  ({ kind: 'dog', id, x, z, yaw, ...extra });
const sled = (x: number, z: number, yaw: number, extra: Partial<SceneElement> = {}): SceneElement =>
  ({ kind: 'sled', id: 'nansenSled', x, z, yaw, ...extra });

const ORANGE = 'orange';
const RED = 'red';
const NAVY = 'orangeNavy';

/**
 * The scenes, by milestone id (content/poncho.ts): every stop of the trip has one, told in three stages (one per sentence).
 */
export const PONCHO_SCENES: Readonly<Record<string, SceneDef>> = {
  // «Nace Poncho» (book p. 5 and 9), told in three stages, one per sentence of the stop (see `appearAt` / `until`):
  // 0 the base on the coast, the men going to and fro and the pup next to its mother; 1 the litter running behind
  // the playful one; 2 the training: a man tied by the waist to Poncho (a slalom), the sled, a harness being fitted.
  nacimiento: {
    setting: 'station',
    radius: 4,
    elements: [
      // The base (one prop, at a point where no one walks; react-ui lays it out from there, ESPERANZA_SCENE_Z): the main house, the
      // container with the flag and the walkway by the shore on the +x side, the other huts scattered up the slope behind. It takes
      // no room of its own; its houses keep the rocks off (clearings).
      prop('baseEsperanza', 0, 3.2, 0, 1, { radius: 0.01 }),
      // The dogs of the base rest by the huts all the time, and a man looks after them while the first sentence is told.
      dog('pack', 3.3, 0.2, 0.4, { curled: true }),
      dog('pack', 3.9, -0.4, 2.6, { curled: true }),
      person(NAVY, 3.65, 0.95, yawToward(3.65, 0.95, 3.3, 0.2), 'tend', 0.7, { until: 1 }),
      // 0: two men go to and fro (the first leaves prints), and the pup stays by its mother.
      person(ORANGE, -2.5, -1.1, 0, 'walk', 0, { path: 'to-and-fro', until: 1 }),
      person(RED, 2.5, 0.5, Math.PI, 'walk', 1.3, { path: 'fro-and-to', until: 1 }),
      dog('pack', 0.2, -2.3, 0, { until: 1 }),
      dog('poncho', 0.95, -2.3, Math.PI, { scale: 0.55, until: 1 }),
      // 1: the playful pup runs ahead and its brothers follow its trail.
      dog('poncho', -2, -0.6, 0, { scale: 0.55, appearAt: 1, until: 2, path: 'litter' }),
      dog('pack', -2, -0.6, 0, { scale: 0.5, appearAt: 1, until: 2, path: 'litter', lag: 0.8 }),
      dog('pack', -2, -0.6, 0, { scale: 0.5, appearAt: 1, until: 2, path: 'litter', lag: 1.6 }),
      dog('pack', -2, -0.6, 0, { scale: 0.5, appearAt: 1, until: 2, path: 'litter', lag: 2.4 }),
      // 2: training. The instructor wears the belt, the line goes to the harness of Poncho, a little ahead.
      person(ORANGE, -2, 0.45, 0, 'walk', 0, { appearAt: 2, path: 'slalom', rope: { to: 13, length: 2.2 } }),
      dog('poncho', -2, 0.45, 0, { scale: 0.85, appearAt: 2, path: 'slalom', lag: -3.2 }),
      prop('slalomPoles', 0, -0.3, 0, 1.3, { appearAt: 2, radius: 0.02 }), // thin poles: the weave goes between them
      sled(-2.6, -1.8, 0.3, { appearAt: 2, radius: 0.8 }),
      person(RED, 2.3, -1.6, -Math.PI / 2, 'tend', 0, { appearAt: 2 }),
      dog('pack', 2.3, -0.85, 0, { appearAt: 2 }),
    ],
    paths: [
      { id: 'to-and-fro', from: [-2.5, -1.1], via: [[2.5, -1.1], [2.8, -0.9], [2.5, -0.7], [-2.5, -0.7], [-2.8, -0.9]], to: [-2.5, -1.1], loop: true, delay: 0.4, duration: 20, prints: true },
      { id: 'fro-and-to', from: [2.5, 0.5], via: [[-2.5, 0.5], [-2.8, 0.65], [-2.5, 0.8], [2.5, 0.8], [2.8, 0.65]], to: [2.5, 0.5], loop: true, delay: 0.4, duration: 20 },
      { id: 'litter', from: [-2, -0.6], via: [[-1, 0.8], [0, -0.8], [1, 0.8], [2, -0.6], [1, -1.5], [-0.6, -1.6]], to: [-2, -0.6], loop: true, delay: 0.3, duration: 11 },
      { id: 'slalom', from: [-2, 0.45], via: [[-1.43, 0.45], [-0.715, -0.95], [0, 0.45], [0.715, -0.95], [1.43, 0.45], [2, 0.45], [2.4, 0.7], [1.6, 0.85], [-1.6, 0.85], [-2.4, 0.7]], to: [-2, 0.45], loop: true, delay: 0.4, duration: 28 },
    ],
    camera: { distanceFactor: 1.05, elevationDeg: 42, azimuthDeg: -112 },
    shots: [
      shot(0, [3.8, 1.3, 0.6], 22, 11, -102),
      shot(1, [-0.3, 0.3, -0.5], 9, 26, -96),
      shot(2, [-0.5, 0.5, 0], 11, 24, -100),
    ],
  },
  // Probing for crevasses (book p. 12), in three stages (one per sentence): 0 the column of the great winter expedition arrives (a
  // sled with a team of four dogs, a driver and a man beside it: an illustration, the book gives no number); 1 Poncho goes
  // ahead of the halted column sniffing the snow, slowly, head bobbing; 2 he stops and looks at the driver, then zigzags,
  // and the men sink poles and stakes until they find the crevasse, wide and deep.
  'expedicion-invernal-1962': {
    setting: 'plain',
    radius: 4,
    elements: [
      sled(-3.4, -1.5, 0, { path: 'march', radius: 0.8 }),
      dog('pack', -3.4, -1.5, 0, { path: 'march', lead: 1.1, side: 0.28 }),
      dog('pack', -3.4, -1.5, 0, { path: 'march', lead: 1.1, side: -0.28 }),
      dog('pack', -3.4, -1.5, 0, { path: 'march', lead: 2, side: 0.28 }),
      dog('pack', -3.4, -1.5, 0, { path: 'march', lead: 2, side: -0.28 }),
      person(ORANGE, -3.4, -1.5, 0, 'walk', 0, { path: 'march', lead: -1.6 }),
      person(NAVY, -3.4, -1.5, 0, 'walk', 2.1, { path: 'march', lead: 0.4, side: 0.85 }),
      dog('poncho', -0.8, 0.6, 0, { appearAt: 1, until: 2, path: 'sniff', sniff: true }),
      // 2: he stops at the end of his sniffing trail and looks back at the driver; then he zigzags round what he found.
      dog('poncho', 1.0, 1.1, yawToward(1.0, 1.1, -2.8, -1.5), { appearAt: 2, path: 'zigzag' }),
      prop('crevasseBridge', 3.0, 0.3, 0.2, 1.5, { appearAt: 2, radius: 1.1 }),
      person(ORANGE, 2.2, -0.5, yawToward(2.2, -0.5, 3.0, 0.3), 'probe', 0, { appearAt: 2 }),
      person(RED, 3.4, -1.0, yawToward(3.4, -1.0, 3.0, 0.3), 'hammer', 1.9, { appearAt: 2 }),
      person(NAVY, 2.7, 1.8, yawToward(2.7, 1.8, 3.0, 0.3), 'probe', 3.7, { appearAt: 2 }),
    ],
    paths: [
      { id: 'march', from: [-3.4, -1.5], to: [-1.2, -1.5], delay: 0.2, duration: 6 },
      // Slow motion: a long trail walked in 26 s, with the head going down to the snow and up again (`sniff`).
      { id: 'sniff', from: [-0.8, 0.6], via: [[-0.3, 1.3], [0.4, 0.5]], to: [1.0, 1.1], delay: 0.3, duration: 26 },
      { id: 'zigzag', from: [1.0, 1.1], via: [[1.4, 0.6], [0.8, 0.2], [1.4, -0.1]], to: [1.0, -0.3], delay: 4, duration: 10 },
    ],
    camera: { distanceFactor: 1.05, elevationDeg: 44, azimuthDeg: -100 },
    shots: [
      shot(0, [-2, 0.4, -1.5], 6.5, 26, -95),
      shot(1, [0.3, 0.3, 0.8], 5.2, 22, -85),
      shot(2, [2.0, 0.4, 0.2], 6.8, 30, -100),
    ],
  },
  // The post of number one (book p. 10 and 11): 0 the instructor gives Poncho the lead of the team; 1 he follows the trail of the
  // other sled with efficiency; 2 when the sled stops he lies down and turns to the driver.
  'poncho-perro-guia': {
    setting: 'plain',
    radius: 4.2,
    elements: [
      person(ORANGE, 1.6, -0.9, yawToward(1.6, -0.9, 0.4, 0.2), 'stand', 0, { until: 1 }),
      sled(-2.3, 0, 0, { until: 1, radius: 0.8 }),
      dog('pack', -0.7, -0.3, 0, { until: 1 }),
      dog('pack', -0.7, 0.35, 0, { until: 1 }),
      dog('poncho', -0.7, 1.0, 0, { until: 1, path: 'promoted' }),
      // 1: the team follows the other sled along the trail, Poncho in front.
      sled(-3.2, 0.9, 0, { appearAt: 1, until: 2, path: 'follow', radius: 0.8 }),
      dog('pack', -3.2, 0.9, 0, { appearAt: 1, until: 2, path: 'follow', lead: 1.1, side: 0.28 }),
      dog('pack', -3.2, 0.9, 0, { appearAt: 1, until: 2, path: 'follow', lead: 1.1, side: -0.28 }),
      dog('poncho', -3.2, 0.9, 0, { appearAt: 1, until: 2, path: 'follow', lead: 2.1 }),
      sled(0.2, -2.1, 0, { appearAt: 1, until: 2, path: 'other', radius: 0.8 }),
      dog('pack', 0.2, -2.1, 0, { appearAt: 1, until: 2, path: 'other', lead: 1.1 }),
      person(RED, 0.2, -2.1, 0, 'walk', 0, { appearAt: 1, until: 2, path: 'other', lead: -1.5 }),
      // 2: the sled stands; Poncho lies in front of the driver and looks round at him.
      sled(-2.2, 0.2, 0, { appearAt: 2, radius: 0.8 }),
      dog('pack', -0.5, -0.1, 0, { appearAt: 2 }),
      dog('pack', -0.5, 0.5, 0, { appearAt: 2 }),
      dog('poncho', 0.7, 0.2, yawToward(0.7, 0.2, -2.3, -1.2), { appearAt: 2, curled: true }),
      person(ORANGE, -2.4, -1.2, yawToward(-2.4, -1.2, 0.7, 0.2), 'stand', 0, { appearAt: 2 }),
    ],
    paths: [
      { id: 'promoted', from: [-0.7, 1.0], via: [[0.2, 1.1]], to: [0.9, 0.1], delay: 1, duration: 4 },
      { id: 'follow', from: [-3.2, 0.9], to: [1.2, 0.9], delay: 0.2, duration: 8 },
      { id: 'other', from: [0.2, -2.1], to: [3.2, -2.1], delay: 0.2, duration: 10 },
    ],
    camera: { distanceFactor: 1.05, elevationDeg: 42, azimuthDeg: -125 },
    shots: [
      shot(0, [-0.3, 0.4, 0], 8.5, 28, -100),
      shot(1, [0, 0.3, 0], 8, 30, -95),
      shot(2, [-0.8, 0.4, 0.1], 5.5, 22, -80),
    ],
  },
  // The ship takes the dogs to the south (book p. 14): the icebreaker at the edge of the ice with its ramp and cargo;
  // 0 Poncho and a man look at it; 1 many other dogs go to board; 2 the sleds and cargo of the march to the Pole are made ready.
  'rumbo-a-belgrano': {
    setting: 'coast',
    radius: 4.2,
    elements: [
      prop('icebreakerHull', 0, 3.4, Math.PI, 1, { radius: 0.01 }),
      prop('loadingRamp', -0.8, 1.0, Math.PI, 1, { radius: 0.5 }),
      prop('cargoCrates', 1.3, 1.1, Math.PI, 1, { radius: 0.9 }),
      person(NAVY, -2.9, 0.5, yawToward(-2.9, 0.5, 0, 3), 'stand', 0, { until: 2 }),
      dog('poncho', -1.5, 0.3, yawToward(-1.5, 0.3, 0, 3), { until: 2 }),
      // 1: a man leads a file of dogs to the ramp. Each holds its place in the file (a dog's length and a half apart, a little
      // off the line), so they walk and stop one behind the other and not piled up.
      person(ORANGE, -3.6, -1.4, 0, 'walk', 0, { appearAt: 1, path: 'file' }),
      dog('pack', -3.6, -1.4, 0, { appearAt: 1, path: 'file', lag: 1.5 }),
      dog('pack', -3.6, -1.4, 0, { appearAt: 1, path: 'file', lag: 3 }),
      dog('pack', -3.6, -1.4, 0, { appearAt: 1, path: 'file', lag: 4.5 }),
      dog('pack', -3.6, -1.4, 0, { appearAt: 1, path: 'file', lag: 6 }),
      sled(2.2, -1.2, 0.2, { appearAt: 2, radius: 0.8 }),
      sled(1.2, -2.4, -0.1, { appearAt: 2, radius: 0.8 }),
      person(ORANGE, 2.9, -0.2, -Math.PI / 2, 'tend', 0, { appearAt: 2 }),
      person(RED, 0.4, -1.8, yawToward(0.4, -1.8, 1.2, -2.4), 'haul', 2.2, { appearAt: 2 }),
    ],
    // A winding trail (S bends), so the file follows a curve and not a ruler.
    paths: [{ id: 'file', from: [-3.6, -1.4], via: [[-2.7, -2.0], [-1.8, -1.3], [-1.0, -1.8]], to: [-0.4, -0.9], delay: 0.3, duration: 9 }],
    camera: { distanceFactor: 1.1, elevationDeg: 42, azimuthDeg: -112 },
    shots: [
      shot(0, [-1.4, 0.7, 0.4], 8, 20, -90),
      shot(1, [-2.2, 0.3, -1.2], 6.5, 25, -85),
      shot(2, [1.4, 0.4, -1.2], 7, 28, -105),
    ],
  },
  // The little plane that came down (book p. 17-18): 0 it lies on the ice and a man and Poncho look at it; 1 the patrol
  // sets out, Poncho at the front; 2 he smells the plane and quickens his pace, the team behind him.
  'rescate-ae-205': {
    setting: 'plain',
    radius: 4.5,
    elements: [
      prop('crashedPlane', 2.8, 1.6, 0.5, 0.85, { radius: 1.4 }),
      person(NAVY, -1.8, -0.6, yawToward(-1.8, -0.6, 2.8, 1.6), 'stand', 0, { until: 1 }),
      dog('poncho', -1.2, -0.9, yawToward(-1.2, -0.9, 2.8, 1.6), { until: 1 }),
      sled(-3.8, -2.4, 0.3, { appearAt: 1, until: 2, path: 'patrol', radius: 0.8 }),
      dog('pack', -3.8, -2.4, 0, { appearAt: 1, until: 2, path: 'patrol', lead: 1.0, side: 0.28 }),
      dog('pack', -3.8, -2.4, 0, { appearAt: 1, until: 2, path: 'patrol', lead: 1.0, side: -0.28 }),
      dog('pack', -3.8, -2.4, 0, { appearAt: 1, until: 2, path: 'patrol', lead: 1.6, side: 0.28 }),
      dog('pack', -3.8, -2.4, 0, { appearAt: 1, until: 2, path: 'patrol', lead: 1.6, side: -0.28 }),
      dog('poncho', -3.8, -2.4, 0, { appearAt: 1, until: 2, path: 'patrol', lead: 2.2 }),
      person(ORANGE, -3.8, -2.4, 0, 'walk', 0, { appearAt: 1, until: 2, path: 'patrol', lead: -1.5 }),
      person(RED, -3.8, -2.4, 0, 'walk', 1.5, { appearAt: 1, until: 2, path: 'patrol', lead: -2.5 }),
      dog('poncho', -1.0, 0.0, 0, { appearAt: 2, path: 'dash' }),
      sled(-3.6, -1.0, 0, { appearAt: 2, path: 'late', radius: 0.8 }),
      person(ORANGE, -3.6, -1.0, 0, 'walk', 0, { appearAt: 2, path: 'late', lead: -1.6 }),
    ],
    paths: [
      { id: 'patrol', from: [-3.8, -2.4], via: [[-2.2, -1.6]], to: [-1.2, -2.0], delay: 0.2, duration: 9 },
      { id: 'dash', from: [-1.0, 0.0], to: [1.0, 0.9], delay: 0.5, duration: 2.5 },
      { id: 'late', from: [-3.6, -1.0], to: [-0.6, -1.4], delay: 0.5, duration: 8 },
    ],
    camera: { distanceFactor: 1.1, elevationDeg: 40, azimuthDeg: -115 },
    shots: [
      shot(0, [0.6, 0.6, 0.5], 8.5, 28, -95),
      shot(1, [-2.4, 0.4, -1.8], 7, 26, -85),
      shot(2, [0.2, 0.4, 0.5], 7, 24, -100),
    ],
  },
  // The march that goes on (book p. 15-16): 0 two sleds of dogs go on, Poncho guiding them; 1 he goes ahead, over a snow
  // bridge and past canes, to find the dangers; 2 the patrol goes through the peaks of the Santa Fe mountains.
  'patrulla-paralelo-82': {
    setting: 'plain',
    radius: 4.2,
    elements: [
      sled(-3.6, -1.4, 0, { until: 1, path: 'march', radius: 0.8 }),
      dog('pack', -3.6, -1.4, 0, { until: 1, path: 'march', lead: 1.1, side: 0.28 }),
      dog('pack', -3.6, -1.4, 0, { until: 1, path: 'march', lead: 1.1, side: -0.28 }),
      dog('poncho', -3.6, -1.4, 0, { until: 1, path: 'march', lead: 1.9 }),
      person(ORANGE, -3.6, -1.4, 0, 'walk', 0, { until: 1, path: 'march', lead: -1.6 }),
      prop('crevasseBridge', 2.0, 1.4, 0.15, 1, { appearAt: 1, until: 2, radius: 0.9 }),
      prop('flaggedCanes', 0.6, -0.9, 0, 1, { appearAt: 1, until: 2, radius: 0.3 }),
      dog('poncho', -2.4, 0.4, 0, { appearAt: 1, until: 2, path: 'scout' }),
      prop('nunataks', 0.8, 2.6, 0, 1, { appearAt: 2, radius: 1.4 }),
      sled(-3.6, -0.7, 0, { appearAt: 2, path: 'pass', radius: 0.8 }),
      dog('pack', -3.6, -0.7, 0, { appearAt: 2, path: 'pass', lead: 1.1, side: 0.28 }),
      dog('pack', -3.6, -0.7, 0, { appearAt: 2, path: 'pass', lead: 1.1, side: -0.28 }),
      dog('poncho', -3.6, -0.7, 0, { appearAt: 2, path: 'pass', lead: 1.9 }),
      person(ORANGE, -3.6, -0.7, 0, 'walk', 0, { appearAt: 2, path: 'pass', lead: -1.6 }),
    ],
    paths: [
      { id: 'march', from: [-3.6, -1.4], to: [-0.4, -1.4], delay: 0.2, duration: 8 },
      { id: 'scout', from: [-2.4, 0.4], via: [[-0.6, -0.1]], to: [1.0, 0.1], delay: 0.3, duration: 9 },
      { id: 'pass', from: [-3.6, -0.7], via: [[-1.6, -0.2]], to: [1.0, -0.3], delay: 0.2, duration: 10 },
    ],
    camera: { distanceFactor: 1.1, elevationDeg: 42, azimuthDeg: -110 },
    shots: [
      shot(0, [-1.6, 0.5, -1.4], 8, 26, -95),
      shot(1, [0.2, 0.4, 0.4], 7, 28, -80),
      shot(2, [-0.8, 0.8, 0.2], 9, 22, -100),
    ],
  },
  // From the air (book p. 18-19): 0 the helicopter on the ice with its door open; 1 the dogs come down on parachutes, paddling
  // their legs; 2 they land and Poncho is already at the front of the sled.
  paracaidas: {
    setting: 'plain',
    radius: 4.2,
    elements: [
      prop('rescueHelicopter', -2.3, 1.0, -0.4, 1, { until: 2, radius: 1.6 }),
      person(ORANGE, 0.9, -0.5, yawToward(0.9, -0.5, -2.3, 1.0), 'stand', 0, { until: 1 }),
      dog('poncho', 1.5, 0.4, yawToward(1.5, 0.4, -2.3, 1.0), { until: 1 }),
      prop('dogParachute', 1.8, 1.8, 0, 1, { appearAt: 1, until: 2, lift: 1.0, radius: 0.3 }),
      dog('pack', 1.8, 1.8, 0.6, { appearAt: 1, until: 2, lift: 0.96 }),
      prop('dogParachute', 2.8, -0.2, 0, 1, { appearAt: 1, until: 2, lift: 0.6, radius: 0.3 }),
      dog('poncho', 2.8, -0.2, 0, { appearAt: 1, until: 2, lift: 0.56 }),
      prop('dogParachute', 0.6, -1.9, 0, 1, { appearAt: 1, until: 2, lift: 1.3, radius: 0.3 }),
      dog('pack', 0.6, -1.9, -0.5, { appearAt: 1, until: 2, lift: 1.26 }),
      sled(-1.6, -1.0, 0, { appearAt: 2, radius: 0.8 }),
      dog('pack', -0.4, -0.7, 0, { appearAt: 2 }),
      dog('pack', -0.4, -1.3, 0, { appearAt: 2 }),
      dog('poncho', 0.6, -1.0, 0, { appearAt: 2 }),
      person(RED, -2.4, -1.0, 0, 'haul', 0, { appearAt: 2 }),
    ],
    paths: [],
    camera: { distanceFactor: 1.1, elevationDeg: 40, azimuthDeg: -110 },
    shots: [
      shot(0, [-0.3, 0.8, 0.6], 8, 24, -80),
      shot(1, [1.6, 1.2, 0.2], 10, 22, -95),
      shot(2, [-0.6, 0.4, -1.0], 6, 26, -100),
    ],
  },
  // Lost compass (book p. 20): 0 the team walks in the storm; 1 the sled lies on its side and the men look for the compass
  // in the snow; 2 Poncho leads them, in single file, towards the base, which shows its windows.
  'brujula-perdida': {
    setting: 'plain',
    radius: 3.6,
    elements: [
      sled(-3.2, 0.4, 0, { until: 1, path: 'storm', radius: 0.8 }),
      dog('pack', -3.2, 0.4, 0, { until: 1, path: 'storm', lead: 1.1, side: 0.28 }),
      dog('pack', -3.2, 0.4, 0, { until: 1, path: 'storm', lead: 1.1, side: -0.28 }),
      dog('poncho', -3.2, 0.4, 0, { until: 1, path: 'storm', lead: 1.9 }),
      person(NAVY, -3.2, 0.4, 0, 'walk', 0, { until: 1, path: 'storm', lead: -1.6 }),
      prop('overturnedSled', -1.0, -0.2, 0.3, 1, { appearAt: 1, until: 2, radius: 1.0 }),
      person(NAVY, 0.4, -0.7, yawToward(0.4, -0.7, -0.6, -0.1), 'shovel', 0, { appearAt: 1, until: 2 }),
      person(ORANGE, -2.0, 1.1, yawToward(-2.0, 1.1, -1.0, -0.2), 'tend', 1.3, { appearAt: 1, until: 2 }),
      dog('pack', 0.8, 0.9, 2.5, { appearAt: 1, until: 2 }),
      dog('poncho', 0.2, 0.3, 0.4, { appearAt: 1, until: 2 }),
      prop('baseHut', 2.5, 1.6, Math.PI, 0.9, { appearAt: 2, radius: 1.2 }),
      dog('poncho', -2.6, -0.4, 0, { appearAt: 2, path: 'home' }),
      person(NAVY, -2.6, -0.4, 0, 'walk', 0, { appearAt: 2, path: 'home', lag: 0.9 }),
      person(ORANGE, -2.6, -0.4, 0, 'walk', 1.7, { appearAt: 2, path: 'home', lag: 1.8 }),
    ],
    paths: [
      { id: 'storm', from: [-3.2, 0.4], to: [-1.8, 0.4], delay: 0.2, duration: 6 },
      { id: 'home', from: [-2.6, -0.4], via: [[-0.8, -1.0]], to: [1.0, -0.4], delay: 0.4, duration: 11 },
    ],
    camera: { distanceFactor: 1.05, elevationDeg: 42, azimuthDeg: -120 },
    shots: [
      shot(0, [-2, 0.5, 0.4], 7, 26, -90),
      shot(1, [-0.4, 0.4, 0.1], 5.5, 30, -95),
      shot(2, [0.2, 0.6, 0.1], 6.5, 24, -110),
    ],
  },
  // The years go by (book p. 21): 0 Poncho lies by the hut, old, with a man; 1 the young dogs run with the sled and he stays;
  // 2 the ship arrives at the edge of the ice and Poncho walks to its ramp with the man.
  'adios-a-la-antartida': {
    setting: 'coast',
    radius: 4.2,
    elements: [
      prop('baseHut', 3.4, 1.6, Math.PI, 1, { radius: 1.2 }),
      dog('poncho', -0.6, 0.0, 0.3, { until: 2, curled: true }),
      person(NAVY, 0.4, -0.4, yawToward(0.4, -0.4, -0.6, 0), 'stand', 0, { until: 1 }),
      sled(-3.0, -2.0, 0, { appearAt: 1, until: 2, path: 'run', radius: 0.8 }),
      dog('pack', -3.0, -2.0, 0, { appearAt: 1, until: 2, path: 'run', lead: 1.1, side: 0.28 }),
      dog('pack', -3.0, -2.0, 0, { appearAt: 1, until: 2, path: 'run', lead: 1.1, side: -0.28 }),
      dog('pack', -3.0, -2.0, 0, { appearAt: 1, until: 2, path: 'run', lead: 1.8 }),
      person(RED, -3.0, -2.0, 0, 'walk', 0, { appearAt: 1, until: 2, path: 'run', lead: -1.6 }),
      prop('icebreakerHull', 0, 3.4, Math.PI, 1, { appearAt: 2, radius: 0.01 }),
      prop('loadingRamp', -0.8, 1.0, Math.PI, 1, { appearAt: 2, radius: 0.5 }),
      dog('poncho', -2.4, -0.9, 0, { appearAt: 2, path: 'board' }),
      person(NAVY, -2.4, -0.9, 0, 'walk', 0, { appearAt: 2, path: 'board', lag: 1.0, side: 0.7 }),
    ],
    paths: [
      { id: 'run', from: [-3.0, -2.0], via: [[0.5, -2.1], [2.2, -1.7], [0.5, -1.4], [-2.0, -1.5]], to: [-3.0, -2.0], loop: true, delay: 0.2, duration: 16 },
      { id: 'board', from: [-2.4, -0.9], to: [-1.6, 0.1], delay: 0.5, duration: 9 },
    ],
    camera: { distanceFactor: 1.1, elevationDeg: 42, azimuthDeg: -112 },
    shots: [
      shot(0, [-0.6, 0.4, 0.0], 5.5, 26, -95),
      shot(1, [-0.2, 0.4, -1.2], 8, 28, -90),
      shot(2, [-1.2, 0.6, 0.5], 8, 24, -95),
    ],
  },
  // A quiet end (book p. 21-22): 0 the hotel of an old comrade, Poncho and a man in front of it; 1 children and an improvised sled, and
  // he lives almost eighteen years; 2 one spring morning in the garden he rests under the tree and does not wake.
  ushuaia: {
    setting: 'plain',
    radius: 4,
    elements: [
      prop('townHouse', 0, 2.6, Math.PI, 1, { radius: 1.6 }),
      prop('lowFence', 0, 1.0, 0, 1, { radius: 1.2 }),
      prop('lengaTree', -2.8, 1.8, 0, 1, { radius: 0.5 }),
      prop('nireTree', 2.8, 1.6, 0, 1, { radius: 0.4 }),
      prop('shrub', 1.8, 0.4, 0, 1, { radius: 0.3 }),
      person(NAVY, -0.4, 0.1, yawToward(-0.4, 0.1, 0.6, -0.3), 'stand', 0, { until: 2 }),
      dog('poncho', 0.6, -0.3, yawToward(0.6, -0.3, -0.4, 0.1), { until: 1 }),
      dog('poncho', 0.3, -1.2, 0, { appearAt: 1, until: 2, path: 'stroll' }),
      prop('makeshiftSled', 1.6, -1.8, 0.3, 1, { appearAt: 1, until: 2, radius: 0.8 }),
      person(RED, 2.4, -0.9, yawToward(2.4, -0.9, 1.6, -1.8), 'cheer', 0, { appearAt: 1, until: 2, scale: 0.6 }),
      person(ORANGE, 0.9, -2.3, yawToward(0.9, -2.3, 1.6, -1.8), 'cheer', 2.5, { appearAt: 1, until: 2, scale: 0.6 }),
      dog('poncho', -2.2, 1.0, 0.8, { appearAt: 2, curled: true }),
    ],
    paths: [{ id: 'stroll', from: [0.3, -1.2], via: [[-1.0, -1.7], [-1.7, -1.1], [-1.2, -0.7]], to: [0.3, -1.2], loop: true, delay: 0.3, duration: 14 }],
    camera: { distanceFactor: 1.05, elevationDeg: 38, azimuthDeg: -115 },
    shots: [
      shot(0, [0, 1.0, 0.8], 8.5, 22, -95),
      shot(1, [0.8, 0.4, -1.0], 6.5, 28, -90),
      shot(2, [-2.2, 0.4, 1.0], 4.2, 24, -75),
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

/** The points of a path in order: `from`, the `via` ones and `to`. */
export const scenePathPoints = (path: ScenePath): (readonly [number, number])[] => [path.from, ...(path.via ?? []), path.to];

const segmentLength = (a: readonly [number, number], b: readonly [number, number]): number => Math.hypot(b[0] - a[0], b[1] - a[1]);

export function scenePathLength(path: ScenePath): number {
  const pts = scenePathPoints(path);
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += segmentLength(pts[i - 1], pts[i]);
  return total;
}

/** Yaw of someone who goes along the first segment of the path. */
export const scenePathYaw = (path: ScenePath): number => {
  const [a, next] = scenePathPoints(path);
  return yawToward(a[0], a[1], next[0], next[1]);
};

/** Fraction of the path walked `t` seconds after the scene showed (0 before it starts, 1 after it ends). */
export function scenePathProgress(path: ScenePath, t: number): number {
  return clamp01((t - path.delay) / path.duration);
}

/** How far, in scene units, a walker turns towards the next segment before reaching a corner. */
export const SCENE_TURN_LENGTH = 0.45;

/** Difference of two yaws, the short way round (-pi..pi). */
const angleDelta = (a: number, b: number): number => {
  const d = (b - a) % (Math.PI * 2);
  return d > Math.PI ? d - Math.PI * 2 : d < -Math.PI ? d + Math.PI * 2 : d;
};

/**
 * The point of the path at fraction `u` (clamped), with its yaw. The yaw is the one of the segment it is on,
 * and it eases into the next one over the last SCENE_TURN_LENGTH before a corner (and out of the previous
 * one over the first), so a walker takes a corner as a turn, not a snap.
 */
export function walkPosition(path: ScenePath, u: number): { x: number; z: number; yaw: number } {
  const pts = scenePathPoints(path);
  const lengths = pts.slice(1).map((q, i) => segmentLength(pts[i], q));
  const total = lengths.reduce((sum, l) => sum + l, 0);
  let at = clamp01(u) * total;
  let i = 0;
  while (i < lengths.length - 1 && at > lengths[i]) {
    at -= lengths[i];
    i++;
  }
  const [a, b] = [pts[i], pts[i + 1]];
  const k = lengths[i] ? Math.min(1, at / lengths[i]) : 0;
  const yawOf = (j: number) => yawToward(pts[j][0], pts[j][1], pts[j + 1][0], pts[j + 1][1]);
  let yaw = yawOf(i);
  const turnLen = Math.min(SCENE_TURN_LENGTH, lengths[i] / 2);
  if (i + 1 < lengths.length && lengths[i] - at < turnLen) yaw += angleDelta(yaw, yawOf(i + 1)) * (0.5 - 0.5 * ((lengths[i] - at) / turnLen));
  else if (i > 0 && at < turnLen) yaw += angleDelta(yaw, yawOf(i - 1)) * (0.5 - 0.5 * (at / turnLen));
  return { x: a[0] + (b[0] - a[0]) * k, z: a[1] + (b[1] - a[1]) * k, yaw };
}

/**
 * Where someone who follows the path is `t` seconds after they showed (`lag` s behind the head of a file):
 * the point and yaw, whether it is walking, and the distance walked (not wrapped on a loop, so the stride
 * of the legs goes on). A walk that is not a loop ends and stays at its end.
 */
export function sceneWalk(path: ScenePath, t: number, lag = 0): { x: number; z: number; yaw: number; moving: boolean; travel: number } {
  const length = scenePathLength(path);
  if (lag > 0) {
    // Someone behind the head of a file is not piled on the start waiting for their turn: they stand (or walk in)
    // behind it, along the line of the first segment, so a file shows as many from the very first frame.
    const u = (Math.max(0, t - path.delay) - lag) / path.duration;
    if (u < 0) {
      const head = walkPosition(path, 0);
      const back = -u * length;
      return { x: head.x - Math.cos(head.yaw) * back, z: head.z + Math.sin(head.yaw) * back, yaw: head.yaw, moving: t > path.delay, travel: u * length };
    }
  }
  const laps = Math.max(0, (t - path.delay - lag) / path.duration);
  // On a walk that ends, someone behind the head of the file stops where the head was `lag` s before it stopped,
  // along the path: the file stays a file (spaced, on the same curve) and does not pile up on the end.
  const last = path.loop || lag <= 0 ? 1 : Math.max(0, 1 - lag / path.duration);
  const u = path.loop ? laps % 1 : Math.min(last, laps);
  return { ...walkPosition(path, u), moving: laps > 0 && (!!path.loop || laps < last), travel: (path.loop ? laps : u) * length };
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

/** The point and yaw of the k-th boot print along the path (they follow its corners). */
export function printPlace(path: ScenePath, k: number): { x: number; z: number; yaw: number } {
  const length = scenePathLength(path);
  return walkPosition(path, length ? (k * SCENE_STRIDE) / length : 0);
}

// ---- Stages: what shows at each step of the tour (issue #146) ----------------------------------------

/** Steps of a scene: one per shot, which is one per sentence of the stop. */
export const sceneStepCount = (scene: SceneDef): number => scene.shots.length;

/** True when an element with these stages shows at `step`. */
export const sceneElementShown = (e: Pick<SceneElement, 'appearAt' | 'until'>, step: number): boolean =>
  step >= (e.appearAt ?? 0) && step < (e.until ?? Infinity);

/** True when two elements show together at some step of a tour of `steps` steps. */
export function sceneElementsOverlap(a: Pick<SceneElement, 'appearAt' | 'until'>, b: Pick<SceneElement, 'appearAt' | 'until'>, steps: number): boolean {
  for (let step = 0; step < steps; step++) if (sceneElementShown(a, step) && sceneElementShown(b, step)) return true;
  return false;
}

/** Seconds an element takes to grow out of the ground (and to sink back into it). */
export const STAGE_ENTER_S = 0.7;

/** Progress of an element's entrance after `dt` seconds: towards 1 while it shows, towards 0 while it does not; at once with reduced motion. */
export function stageProgress(current: number, shown: boolean, dt: number, reduced: boolean): number {
  if (reduced) return shown ? 1 : 0;
  return clamp01(current + (shown ? dt : -dt) / STAGE_ENTER_S);
}

/** Size of an element at entrance progress `p` (0 to 1): it grows with a small overshoot, so it pops out of the snow. */
export function stageScale(p: number): number {
  const k = clamp01(p);
  if (k <= 0) return 0;
  const c = 1.7;
  const x = k - 1;
  return 1 + (c + 1) * x ** 3 + c * x ** 2;
}

/** Radius of the ground a thing takes, by kind (units of a person's height); `scale` multiplies it. */
export const SCENE_BODY_RADIUS: Readonly<Record<SceneElementKind, number>> = { person: 0.3, dog: 0.32, sled: 0.8, prop: 0.5 };
export const sceneBodyRadius = (e: SceneElement): number => e.radius ?? SCENE_BODY_RADIUS[e.kind] * (e.kind === 'prop' ? 1 : (e.scale ?? 1));

/**
 * Where an element can be on the ground over time, as points: its own place, or the points of its path
 * (walking sampled every `step` units, moved by `lead` and `side`). For the checks that nothing walks
 * through anyone: a path is shared by the ones who follow it, so those keep their formation.
 */
export function sceneTrack(scene: SceneDef, e: SceneElement, step = 0.2): (readonly [number, number])[] {
  const path = e.path ? scene.paths.find((p) => p.id === e.path) : undefined;
  if (!path) return [[e.x, e.z]];
  const length = scenePathLength(path);
  const n = Math.max(1, Math.ceil(length / step));
  const out: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const p = walkPosition(path, i / n);
    const dx = Math.cos(p.yaw);
    const dz = -Math.sin(p.yaw);
    const lead = e.lead ?? 0;
    const side = e.side ?? 0;
    out.push([p.x + dx * lead - dz * side, p.z + dz * lead + dx * side]);
  }
  return out;
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
/** Quotes that open and close with different marks: a stop inside them does not end the sentence. */
const QUOTE_OPEN = '«“';
const QUOTE_CLOSE = '»”';

/**
 * The sentences of a text, in order: the diorama tells one per shot. It splits after `.`, `!`, `?` or
 * `…` followed by a space and the start of another sentence (a capital letter, a digit or an opening
 * mark), but not inside «quotes» or “quotes”, after an abbreviation (`Gral.`, `Nº`, `p.`) nor in a number (`1.500`,
 * `1,5`). The sentences joined with one space give back the text.
 */
export function essentialSentences(text: string): string[] {
  const source = text.trim();
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (QUOTE_OPEN.includes(ch)) depth++;
    else if (QUOTE_CLOSE.includes(ch)) depth = Math.max(0, depth - 1);
    if (!SENTENCE_END.includes(ch)) continue;
    // Closing marks stuck to the stop belong to the sentence it ends: «No trabajó.»
    let j = i + 1;
    let open = depth;
    while (j < source.length && CLOSERS.includes(source[j])) {
      if (QUOTE_CLOSE.includes(source[j])) open = Math.max(0, open - 1);
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

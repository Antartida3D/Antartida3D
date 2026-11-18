import { SHIP_DOOR, SHIP_GANGWAY_FOOT, SHIP_GANGWAY_TOP } from './poncho-ship.ts';
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
  /**
   * It ends at a door (issue #219: the ship): everyone who follows it walks it to the end, one behind the other, and is gone
   * there, as if they went in. Not a loop.
   */
  readonly board?: boolean;
  /**
   * It is laid on the track of the path `follows` (#218): it goes along it (the trail of another sled, followed later), joins
   * it (a dog brought to the head of a waiting file) or goes on from where it ends. Who walks the one and who walks the other
   * are one file at different times, not two crossing walks (see `sceneSameTrack`).
   */
  readonly follows?: string;
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
  /** dog: Poncho grown old (#223): a greyer face, the head low and a slow walk. */
  readonly old?: boolean;
  /** dog: lying curled on the ground, with no drift of snow under it (#261). */
  readonly curled?: boolean;
  /** With a path: seconds behind the one at the point of the path (a litter in single file follows the same trail). */
  readonly lag?: number;
  /**
   * With a path: the step from which it starts walking (#218). Before it, it stands where its walk begins (a team waiting
   * harnessed in file, for a sentence, before it sets off in the next one).
   */
  readonly walkFrom?: number;
  /**
   * dog: once its walk is over it lies down (`after` seconds later, slowly, see `sceneRest`), stays down `hold` seconds, gets up
   * and goes on along the path `then` (#218). The walk ends with a turn, so it lies facing where it came from.
   */
  readonly rest?: { readonly after: number; readonly hold: number; readonly then?: string };
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
  /**
   * prop, dog: comes down from height `from` to height `to` (scene units over the ground) in `duration` s after it shows, at an even pace,
   * and a dog paddles its legs on the way (a dog under its parachute, book p. 19). With reduced motion it hangs half way down.
   */
  readonly fall?: { readonly from: number; readonly to: number; readonly duration: number };
}

/** Height over the ground of an element `t` seconds after it showed: where it is on its fall, or its `lift`. */
export const sceneFallLift = (e: SceneElement, t: number): number =>
  e.fall ? e.fall.from + (e.fall.to - e.fall.from) * clamp01(t / e.fall.duration) : (e.lift ?? 0);

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
  /**
   * What rises behind a `station` (+z side): a mountain of rock and snow (the default) or a glacier, a wall of ice with a
   * front of blue ice over the rocks of the shore (#218, the Base San Martín).
   */
  readonly backdrop?: 'mountain' | 'glacier';
  /**
   * A blizzard over the stage (issue #220): snow blown by the wind and the far ground lost in it, from the first
   * step until step `until` (default: all of them). From step `calmFrom` on (#309) the weather gets better but does not
   * clear at once: it keeps snowing, lightly and with no wind. An illustration of the weather the stop tells, not a record.
   */
  readonly blizzard?: { readonly until?: number; readonly calmFrom?: number };
  /**
   * From step `atStep` on, the stop is told in another scene (issue #223: the last stop goes from the Base Esperanza to the
   * ship): the stage, the actors and the camera are the ones of `scene` at its step `step` (and the next ones, in order).
   * Its own `shots` keep one per sentence; the ones from `atStep` on are the shots of `scene`.
   */
  readonly then?: { readonly atStep: number; readonly scene: SceneDef; readonly step: number };
}

/** Limits of a shot: the diorama's camera never comes closer than a dog's size, nor leaves the stage far behind. */
export const SHOT_DISTANCE: readonly [number, number] = [2.2, 22];
export const SHOT_ELEVATION_DEG: readonly [number, number] = [10, 70];
export const SHOT_TARGET_HEIGHT: readonly [number, number] = [0, 1.6];

/** Most elements and persons showing at once in a scene, and most in all (they are all built): draw calls on a phone. */
export const MAX_SCENE_ELEMENTS = 18;
export const MAX_SCENE_PEOPLE = 6;
export const MAX_SCENE_TOTAL = 22;
/** The ship of «En rompehielos hacia Belgrano» lies beyond the ice edge (z 4.7) and its foredeck is part of the stage: that scene needs more room than the others. */
export const MAX_SCENE_RADIUS = 6.8;

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
/**
 * Poncho at the last stop (#309): a grown dog, bigger than his size elsewhere, so that next to the people he does not read
 * as a pup. An illustration: the book gives no measure of him.
 */
const PONCHO_GROWN = 1.3;

/**
 * The icebreaker of «En rompehielos hacia Belgrano», taken again for the end of the last stop (issue #223): the same ship, gangway
 * and trail, but only a man and Poncho go aboard and are gone at the door (book p. 21: Poncho alone is taken to Ushuaia). Where it
 * lies is an illustration: the book does not say at which base he went aboard.
 */
const FAREWELL_SHIP: SceneDef = {
  setting: 'coast',
  radius: 6.8,
  elements: [
    prop('icebreakerShip', 1.6, 3.6, 0, 1, { radius: 0.01 }),
    prop('cargoCrates', 3.5, 2.4, Math.PI, 1, { radius: 0.9 }),
    person(NAVY, -3.4, -0.4, 0, 'walk', 0, { path: 'board' }),
    // Old and slow behind the man, well apart from him on the gangway.
    dog('poncho', -3.4, -0.4, 0, { path: 'board', lag: 3, old: true, scale: PONCHO_GROWN }),
  ],
  paths: [
    {
      id: 'board',
      from: [-3.4, -0.4],
      via: [[-2.5, 0.5], [-1.5, 0.3], [-0.7, 1.2], [SHIP_GANGWAY_FOOT[0], SHIP_GANGWAY_FOOT[1] - 0.4], SHIP_GANGWAY_FOOT, SHIP_GANGWAY_TOP, [SHIP_GANGWAY_TOP[0] + 0.5, SHIP_GANGWAY_TOP[1] + 0.08]],
      to: SHIP_DOOR,
      delay: 0.3,
      // Slower than the file of «En rompehielos hacia Belgrano» (12 s): the pace of an old dog.
      duration: 18,
      board: true,
    },
  ],
  camera: { distanceFactor: 1.1, elevationDeg: 38, azimuthDeg: -112 },
  // The gangway and the two climbing it: the shot of the boarding of «En rompehielos hacia Belgrano».
  shots: [shot(0, [1.0, 1.4, 4.4], 12, 22, -75)],
};

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
  // The post of number one, at the Base San Martín (book p. 12): 0 by the base, the team waits in file, harnessed; the
  // instructor brings Poncho to the front, the post of number one. 1 the team sets off and follows the trail of the other sled,
  // which goes ahead, along a winding track (they follow it like a wave). 2 the sled stops; Poncho walks on, turns round,
  // lies down facing the driver and, at the order, gets up and goes forward quickly. A team of five pairs and a leader, eleven
  // dogs (book p. 12). The base stood empty in 1962 ([V2]): nobody at its doors. Places and poses are an illustration.
  'poncho-perro-guia': {
    setting: 'station',
    backdrop: 'glacier',
    radius: 6.6,
    elements: [
      // The base, behind the stage (poncho-sanmartin in react-ui lays it out), the houses looking at the sea.
      prop('baseSanMartin', 0, 3.4, 0, 1, { radius: 0.01 }),
      // Our team: it waits in file at the start of the trail during the first sentence and sets off in the second.
      dog('pack', -2.4, -0.4, 0, { walkFrom: 1, path: 'trail', lag: 0.67, side: 0.26 }),
      dog('pack', -2.4, -0.4, 0, { walkFrom: 1, path: 'trail', lag: 0.67, side: -0.26 }),
      dog('pack', -2.4, -0.4, 0, { walkFrom: 1, path: 'trail', lag: 1.33, side: 0.26 }),
      dog('pack', -2.4, -0.4, 0, { walkFrom: 1, path: 'trail', lag: 1.33, side: -0.26 }),
      dog('pack', -2.4, -0.4, 0, { walkFrom: 1, path: 'trail', lag: 2.0, side: 0.26 }),
      dog('pack', -2.4, -0.4, 0, { walkFrom: 1, path: 'trail', lag: 2.0, side: -0.26 }),
      dog('pack', -2.4, -0.4, 0, { walkFrom: 1, path: 'trail', lag: 2.67, side: 0.26 }),
      dog('pack', -2.4, -0.4, 0, { walkFrom: 1, path: 'trail', lag: 2.67, side: -0.26 }),
      dog('pack', -2.4, -0.4, 0, { walkFrom: 1, path: 'trail', lag: 3.33, side: 0.26 }),
      dog('pack', -2.4, -0.4, 0, { walkFrom: 1, path: 'trail', lag: 3.33, side: -0.26 }),
      sled(-2.4, -0.4, 0, { walkFrom: 1, path: 'trail', lag: 4.33, radius: 0.8 }),
      person(ORANGE, -2.4, -0.4, 0, 'walk', 0, { walkFrom: 1, path: 'trail', lag: 6.0 }),
      // 0: the instructor brings Poncho to the front of the team.
      dog('poncho', -4.4, 1.4, 0, { until: 1, path: 'promoted' }),
      person(NAVY, -4.4, 1.4, 0, 'walk', 1.2, { until: 1, path: 'promoted', lag: 1.4 }),
      // 1: Poncho at the front, on the trail of the other sled; the other team goes ahead and on, out of the stage.
      dog('poncho', -2.4, -0.4, 0, { appearAt: 1, until: 2, path: 'trail', sniff: true }),
      dog('pack', -4.16, -2.59, 0, { appearAt: 1, until: 2, path: 'ahead', side: 0.26 }),
      dog('pack', -4.16, -2.59, 0, { appearAt: 1, until: 2, path: 'ahead', side: -0.26 }),
      sled(-4.16, -2.59, 0, { appearAt: 1, until: 2, path: 'ahead', lag: 1.0, radius: 0.8 }),
      person(RED, -4.16, -2.59, 0, 'walk', 0.7, { appearAt: 1, until: 2, path: 'ahead', lag: 2.67 }),
      // 2: the sled has stopped; Poncho walks on, turns round to the driver, lies down, and at the order is up and away.
      dog('poncho', 3.6, -2.0, 0, { appearAt: 2, path: 'turnBack', rest: { after: 0.4, hold: 2.4, then: 'go' } }),
    ],
    paths: [
      // The trail: from the base out towards the sea and back along the shore, in bends.
      { id: 'trail', from: [-2.4, -0.4], via: [[-4.4, -1.2], [-4.2, -2.6], [-1.6, -2.0], [1.2, -2.8]], to: [3.6, -2.0], delay: 0.3, duration: 13 },
      // The other sled: the same trail, a little more than its own length ahead, and then up and away behind the base.
      { id: 'ahead', follows: 'trail', from: [-4.16, -2.59], via: [[-1.6, -2.0], [1.2, -2.8], [3.6, -2.0], [5.6, 0.4]], to: [5.4, 2.8], delay: 0.3, duration: 13 },
      // Poncho brought to his post: round the front of the waiting team to its head.
      { id: 'promoted', follows: 'trail', from: [-4.4, 1.4], via: [[-3.8, 0.4]], to: [-2.5, -0.45], delay: 0.6, duration: 4 },
      // At the stop: a few steps on and a turn, so he ends facing the driver behind him.
      { id: 'turnBack', follows: 'trail', from: [3.6, -2.0], via: [[4.4, -2.3], [4.7, -1.7]], to: [4.1, -1.4], delay: 0.3, duration: 3.2 },
      // At the order: a turn back to the front and away along the shore, quickly.
      { id: 'go', follows: 'trail', from: [4.1, -1.4], via: [[3.7, -1.0], [4.3, -0.7]], to: [5.8, -1.0], delay: 0, duration: 2.2 },
    ],
    camera: { distanceFactor: 1.1, elevationDeg: 34, azimuthDeg: -80 },
    shots: [
      shot(0, [-0.6, 0.8, 1.8], 13.5, 22, -86),
      shot(1, [-0.4, 0.5, -1.2], 12.5, 30, -88),
      shot(2, [2.4, 0.4, -1.2], 10.5, 26, -96),
    ],
  },
  // The ship takes the dogs to the south (book p. 14): the icebreaker afloat at the edge of the ice (poncho-ship.ts), whole, with
  // its gangway and cargo; 0 Poncho and a man look at it from the ice; 1 a file of dogs, Poncho in front, climbs the gangway behind
  // a man, crosses the foredeck and goes in at the door; 2 the sleds and cargo of the march to the Pole are made ready on the ice.
  'rumbo-a-belgrano': {
    setting: 'coast',
    radius: 6.8,
    elements: [
      // The ship and its gangway are one prop, placed by poncho-ship.ts: this x, z is only a spot of ice by it, clear of the walks.
      prop('icebreakerShip', 1.6, 3.6, 0, 1, { radius: 0.01 }),
      prop('cargoCrates', 3.5, 2.4, Math.PI, 1, { radius: 0.9 }),
      person(NAVY, 2.3, 1.2, yawToward(2.3, 1.2, 1, 6), 'stand', 0, { until: 1 }),
      dog('poncho', 1.5, 1.4, yawToward(1.5, 1.4, 1, 6), { until: 1 }),
      // 1: a man leads the file up the gangway and in at the door, Poncho first behind him. Each holds its place in the file
      // (about a dog's length and a half apart), so they climb one behind the other, and each is gone at the door.
      person(ORANGE, -3.4, -0.4, 0, 'walk', 0, { appearAt: 1, path: 'board' }),
      dog('poncho', -3.4, -0.4, 0, { appearAt: 1, path: 'board', lag: 1.2 }),
      dog('pack', -3.4, -0.4, 0, { appearAt: 1, path: 'board', lag: 2.4 }),
      dog('pack', -3.4, -0.4, 0, { appearAt: 1, path: 'board', lag: 3.6 }),
      dog('pack', -3.4, -0.4, 0, { appearAt: 1, path: 'board', lag: 4.8 }),
      dog('pack', -3.4, -0.4, 0, { appearAt: 1, path: 'board', lag: 6 }),
      dog('pack', -3.4, -0.4, 0, { appearAt: 1, path: 'board', lag: 7.2 }),
      sled(2.4, 0.5, 0.2, { appearAt: 2, radius: 0.8 }),
      sled(1.2, -1.2, -0.1, { appearAt: 2, radius: 0.8 }),
      person(ORANGE, 3.6, 0.2, Math.PI, 'tend', 0, { appearAt: 2 }),
      person(RED, 0.2, -0.3, yawToward(0.2, -0.3, 1.2, -1.2), 'haul', 2.2, { appearAt: 2 }),
    ],
    // A winding trail (S bends) to the foot of the gangway, straight up it, across the foredeck and in at the door.
    paths: [
      {
        id: 'board',
        from: [-3.4, -0.4],
        via: [[-2.5, 0.5], [-1.5, 0.3], [-0.7, 1.2], [SHIP_GANGWAY_FOOT[0], SHIP_GANGWAY_FOOT[1] - 0.4], SHIP_GANGWAY_FOOT, SHIP_GANGWAY_TOP, [SHIP_GANGWAY_TOP[0] + 0.5, SHIP_GANGWAY_TOP[1] + 0.08]],
        to: SHIP_DOOR,
        delay: 0.3,
        duration: 12,
        board: true,
      },
    ],
    camera: { distanceFactor: 1.1, elevationDeg: 38, azimuthDeg: -112 },
    shots: [
      // The whole ship, from the ice ahead of its bow: Poncho and a man small in front of it.
      shot(0, [6.2, 1.6, 2.6], 22, 20, -118),
      // The gangway and the file climbing it.
      shot(1, [1.0, 1.4, 4.4], 12, 22, -75),
      // The cargo and the sleds on the ice, the ship behind.
      shot(2, [1.8, 0.4, 0.4], 10, 26, -105),
    ],
  },
  // The plane that came down (book p. 17-18): 0 the wreck on the ice, in a blizzard, the four survivors waiting by it; 1 the patrol
  // of two men and seven dogs comes along a winding trail, Poncho at the front sniffing, and finds it; 2 the weather has
  // cleared and the men of the patrol reach the survivors. The numbers (four survivors, two men, seven dogs) are the
  // book's; the poses, the places and the waiting are an illustration of the rescue.
  // The team follows Poncho in single pairs on his very trail (`lag`), so it bends with the trail like a wave.
  'rescate-ae-205': {
    setting: 'plain',
    radius: 4.5,
    elements: [
      // Bigger than the people, as a Cessna 185 is (about 8 m long and 11 m of wing): an illustration, not a measure.
      prop('crashedPlane', 2.7, 1.5, 0.5, 1.25, { radius: 2.4 }),
      dog('poncho', -4.2, -1.5, 0, { appearAt: 1, path: 'patrol', sniff: true }),
      dog('pack', -4.2, -1.5, 0, { appearAt: 1, path: 'patrol', lag: 0.75, side: 0.26 }),
      dog('pack', -4.2, -1.5, 0, { appearAt: 1, path: 'patrol', lag: 0.75, side: -0.26 }),
      dog('pack', -4.2, -1.5, 0, { appearAt: 1, path: 'patrol', lag: 1.5, side: 0.26 }),
      dog('pack', -4.2, -1.5, 0, { appearAt: 1, path: 'patrol', lag: 1.5, side: -0.26 }),
      dog('pack', -4.2, -1.5, 0, { appearAt: 1, path: 'patrol', lag: 2.25, side: 0.26 }),
      dog('pack', -4.2, -1.5, 0, { appearAt: 1, path: 'patrol', lag: 2.25, side: -0.26 }),
      sled(-4.2, -1.5, 0, { appearAt: 1, path: 'patrol', lag: 3.7, radius: 0.8 }),
      // The two men of the patrol, both in orange, so they are not taken for the survivors (in blue): #309.
      person(ORANGE, -4.2, -1.5, 0, 'walk', 0, { appearAt: 1, until: 2, path: 'patrol', lag: 5.7 }),
      person(ORANGE, -4.2, -1.5, 0, 'walk', 1.5, { appearAt: 1, until: 2, path: 'patrol', lag: 7.0 }),
      person(ORANGE, -2.8, -0.2, 0, 'walk', 0, { appearAt: 2, path: 'toDoor' }),
      person(ORANGE, -1.0, -3.3, 0, 'walk', 1.5, { appearAt: 2, path: 'toTail' }),
      // The four survivors wait by the wreck from the first sentence on (book p. 17-18: they survived and waited for help).
      person(NAVY, -0.2, 1.6, yawToward(-0.2, 1.6, 2.6, 1.4), 'stand', 0),
      person(NAVY, 0.6, 3.4, yawToward(0.6, 3.4, 2.6, 1.4), 'tend', 1.1),
      person(NAVY, 1.2, 3.8, yawToward(1.2, 3.8, 2.6, 1.4), 'stand', 2.3),
      person(NAVY, 4.3, -1.0, yawToward(4.3, -1.0, 2.6, 1.4), 'stand', 0.7),
    ],
    paths: [
      // An S through the drifts, ending by the wreck where Poncho smells it.
      { id: 'patrol', from: [-4.2, -1.5], via: [[-3.4, -2.3], [-2.4, -1.4], [-1.4, -2.2], [-0.4, -1.5]], to: [0.4, -0.9], delay: 0.2, duration: 8 },
      // The two men leave the sled and go to the plane to help the men out.
      { id: 'toDoor', from: [-2.8, -0.2], via: [[-1.2, 0.35]], to: [0.0, 0.3], delay: 0.3, duration: 4.5 },
      { id: 'toTail', from: [-1.0, -3.3], via: [[0.1, -2.9]], to: [1.4, -1.5], delay: 0.3, duration: 4.5 },
    ],
    camera: { distanceFactor: 1.1, elevationDeg: 40, azimuthDeg: -115 },
    shots: [
      shot(0, [2.0, 0.6, 1.0], 10, 28, -95),
      shot(1, [0.0, 0.4, -0.6], 10, 30, -95),
      shot(2, [1.4, 0.5, 0.4], 10, 26, -100),
    ],
    // Bad weather keeps the planes on the ground and the patrol marches through blizzards; on the fourth day the weather
    // has got better (book p. 18), so the last stage is calmer: it keeps snowing, lightly and with no wind (#309).
    blizzard: { calmFrom: 2 },
  },
  // From the air (book p. 18-19): 0 the helicopter flying in over the ice, with its door open, and the two officers waiting below; 1 the three dogs come down on parachutes, small under it, paddling
  // their legs; 2 they land and Poncho is already at the front of the sled, walking, with a man behind it.
  paracaidas: {
    setting: 'plain',
    radius: 4.2,
    elements: [
      // Flying, big and high (the people and the dogs are small below it, for the contrast): it comes in over the ice and hovers over the drop zone.
      prop('rescueHelicopter', -3.4, 0.9, 0, 1, { until: 2, path: 'flight', lift: 6.5, radius: 0.1 }),
      // The two officers who jumped first wait on the ice (book p. 18-19), looking up at it.
      person(ORANGE, 2.3, -0.7, yawToward(2.3, -0.7, 0.4, 0.5), 'stand', 0, { scale: 0.45 }),
      person(RED, 2.4, 0.2, yawToward(2.4, 0.2, 0.4, 0.5), 'stand', 1.9, { scale: 0.45 }),
      // The three dogs (Poncho, Pato and Bucky) jump under the helicopter and come down on their parachutes, paddling their legs.
      prop('dogParachute', 0.9, 1.0, 0, 0.45, { appearAt: 1, until: 2, radius: 0.2, fall: { from: 4.9, to: 0.05, duration: 9 } }),
      dog('pack', 0.9, 1.0, 0.6, { appearAt: 1, until: 2, scale: 0.45, fall: { from: 4.88, to: 0.03, duration: 9 } }),
      prop('dogParachute', 1.5, 0.6, 0, 0.45, { appearAt: 1, until: 2, radius: 0.2, fall: { from: 4.6, to: 0.05, duration: 10 } }),
      dog('poncho', 1.5, 0.6, 0, { appearAt: 1, until: 2, scale: 0.45, fall: { from: 4.58, to: 0.03, duration: 10 } }),
      prop('dogParachute', 0.1, 0.1, 0, 0.45, { appearAt: 1, until: 2, radius: 0.2, fall: { from: 4.8, to: 0.05, duration: 8 } }),
      dog('pack', 0.1, 0.1, -0.5, { appearAt: 1, until: 2, scale: 0.45, fall: { from: 4.78, to: 0.03, duration: 8 } }),
      // On the ice: the sled is ready and Poncho sets off at the front, with a man walking behind it, and goes up to the officers who wait.
      sled(-1.4, -0.2, 0, { appearAt: 2, path: 'go', scale: 0.45, radius: 0.4 }),
      dog('pack', -1.4, -0.2, 0, { appearAt: 2, path: 'go', lead: 0.5, side: 0.13, scale: 0.45 }),
      dog('pack', -1.4, -0.2, 0, { appearAt: 2, path: 'go', lead: 0.5, side: -0.13, scale: 0.45 }),
      dog('poncho', -1.4, -0.2, 0, { appearAt: 2, path: 'go', lead: 0.85, scale: 0.45 }),
      person(NAVY, -1.4, -0.2, 0, 'walk', 0, { appearAt: 2, path: 'go', lead: -0.7, scale: 0.45 }),
    ],
    paths: [
      { id: 'flight', from: [-3.4, 0.9], to: [0.4, 0.5], delay: 0.3, duration: 8 },
      // It ends where Poncho, in front, stands face to face with the two officers (at x 2.3 and 2.4): he gets to them, he does not go past.
      { id: 'go', from: [-1.4, -0.2], to: [0.9, -0.2], delay: 1.2, duration: 7 },
    ],
    camera: { distanceFactor: 1.1, elevationDeg: 40, azimuthDeg: -110 },
    shots: [
      shot(0, [-0.6, 1.6, 0.3], 20, 22, -80),
      shot(1, [0.8, 1.6, 0.3], 19, 22, -90),
      shot(2, [0.8, 0.3, -0.2], 6, 26, -100),
    ],
  },
  // The last stop (issue #223), three stories in three stages: 0 the patrol comes back to the Base Esperanza in a blizzard, Poncho in
  // front (the lost compass, book p. 20); 1 the young dogs go off with the sled and Poncho, who no longer works, walks away from
  // them (p. 21); 2 the icebreaker: a man and Poncho go aboard (p. 21), the scene of the ship (FAREWELL_SHIP, through `then`).
  // The base and its ground are the ones of «Nace Poncho». The numbers of dogs and men are an illustration.
  'brujula-perdida': {
    setting: 'station',
    radius: 4.4,
    elements: [
      prop('baseEsperanza', 0, 3.2, 0, 1, { radius: 0.01 }),
      // 0: the team comes back to the base through the storm, Poncho in front, two men behind the sled.
      sled(-3.6, -1.2, 0, { until: 1, path: 'arrive', radius: 0.8 }),
      dog('pack', -3.6, -1.2, 0, { until: 1, path: 'arrive', lead: 1.1, side: 0.28 }),
      dog('pack', -3.6, -1.2, 0, { until: 1, path: 'arrive', lead: 1.1, side: -0.28 }),
      dog('pack', -3.6, -1.2, 0, { until: 1, path: 'arrive', lead: 1.85, side: 0.28 }),
      dog('pack', -3.6, -1.2, 0, { until: 1, path: 'arrive', lead: 1.85, side: -0.28 }),
      dog('poncho', -3.6, -1.2, 0, { until: 1, path: 'arrive', lead: 2.75, scale: PONCHO_GROWN }),
      person(NAVY, -3.6, -1.2, 0, 'walk', 0, { until: 1, path: 'arrive', lead: -1.6 }),
      person(ORANGE, -3.6, -1.2, 0, 'walk', 1.7, { until: 1, path: 'arrive', lead: -1.1, side: 0.8 }),
      // 1: the young team goes off with the sled to -x, away from the huts of the base (on +x by the shore), and Poncho, old,
      // walks slowly the other way, alone.
      sled(1.2, -1.7, Math.PI, { appearAt: 1, path: 'leave', radius: 0.8 }),
      dog('pack', 1.2, -1.7, Math.PI, { appearAt: 1, path: 'leave', lead: 1.1, side: 0.28 }),
      dog('pack', 1.2, -1.7, Math.PI, { appearAt: 1, path: 'leave', lead: 1.1, side: -0.28 }),
      dog('pack', 1.2, -1.7, Math.PI, { appearAt: 1, path: 'leave', lead: 1.85, side: 0.28 }),
      dog('pack', 1.2, -1.7, Math.PI, { appearAt: 1, path: 'leave', lead: 1.85, side: -0.28 }),
      person(RED, 1.2, -1.7, Math.PI, 'walk', 0, { appearAt: 1, path: 'leave', lead: -1.6 }),
      dog('poncho', 0.6, -0.2, 0, { appearAt: 1, path: 'apart', old: true, scale: PONCHO_GROWN }),
    ],
    paths: [
      { id: 'arrive', from: [-3.6, -1.2], to: [0.2, -0.9], delay: 0.3, duration: 9 },
      { id: 'leave', from: [1.2, -1.7], to: [-3.4, -2.0], delay: 0.6, duration: 8 },
      // Slowly, the other way from the team: a walk of 2 units in 10 s.
      { id: 'apart', from: [0.6, -0.2], to: [2.2, 0.6], delay: 1.2, duration: 10 },
    ],
    camera: { distanceFactor: 1.05, elevationDeg: 42, azimuthDeg: -112 },
    shots: [
      shot(0, [-0.6, 0.8, 0], 13, 16, -100),
      shot(1, [0.2, 0.6, -0.8], 10, 20, -95),
      // The shot of the ship (`then`): the gangway and the two climbing it.
      shot(2, [1.0, 1.4, 4.4], 12, 22, -75),
    ],
    blizzard: { until: 1 },
    then: { atStep: 2, scene: FAREWELL_SHIP, step: 0 },
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
export function sceneWalk(path: ScenePath, t: number, lag = 0): { x: number; z: number; yaw: number; moving: boolean; travel: number; gone: boolean } {
  const length = scenePathLength(path);
  if (lag > 0) {
    // Someone behind the head of a file is not piled on the start waiting for their turn: they stand (or walk in)
    // behind it, along the line of the first segment, so a file shows as many from the very first frame.
    const u = (Math.max(0, t - path.delay) - lag) / path.duration;
    if (u < 0) {
      const head = walkPosition(path, 0);
      const back = -u * length;
      return { x: head.x - Math.cos(head.yaw) * back, z: head.z + Math.sin(head.yaw) * back, yaw: head.yaw, moving: t > path.delay, travel: u * length, gone: false };
    }
  }
  const laps = Math.max(0, (t - path.delay - lag) / path.duration);
  // On a walk that ends, someone behind the head of the file stops where the head was `lag` s before it stopped,
  // along the path: the file stays a file (spaced, on the same curve) and does not pile up on the end.
  // On a walk that ends at a door, everyone goes all the way, in at the door.
  const last = path.loop || lag <= 0 || path.board ? 1 : Math.max(0, 1 - lag / path.duration);
  const u = path.loop ? laps % 1 : Math.min(last, laps);
  const gone = !!path.board && !path.loop && laps >= 1;
  return { ...walkPosition(path, u), moving: laps > 0 && !gone && (!!path.loop || laps < last), travel: (path.loop ? laps : u) * length, gone };
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

/** The scene that is shown at `step` of a stop, and the step of that scene (see `SceneDef.then`). */
export function sceneStage(scene: SceneDef, step: number): { scene: SceneDef; step: number } {
  const next = scene.then;
  return next && step >= next.atStep ? { scene: next.scene, step: next.step + step - next.atStep } : { scene, step };
}

/** The snow over a scene at a step: a blizzard, a light snowfall with no wind (the weather got better, #309), or none. */
export type SceneSnow = 'blizzard' | 'light' | null;
export function sceneSnow(scene: SceneDef, step: number): SceneSnow {
  const b = scene.blizzard;
  if (!b || step >= (b.until ?? Number.POSITIVE_INFINITY)) return null;
  return b.calmFrom !== undefined && step >= b.calmFrom ? 'light' : 'blizzard';
}

/** Whether the blizzard of the scene (if it has one) blows at `step`: not while it only snows lightly. */
export const sceneBlizzard = (scene: SceneDef, step: number): boolean => sceneSnow(scene, step) === 'blizzard';

/** Seconds a dog takes to lie down, and to get up again (see `sceneRest`). */
export const REST_DOWN_S = 0.9;
export const REST_UP_S = 0.5;

const easeInOut = (u: number): number => {
  const k = clamp01(u);
  return k * k * (3 - 2 * k);
};

/**
 * A dog that rests at the end of its walk (#218), `t` seconds after it showed: how far it is lying (0 standing, 1 down; it
 * goes down and gets up slowly, never in one frame), and, once it is up again, the clock of the path it goes on along
 * (`then`), or null while it is still at the end of its first walk.
 */
export function sceneRest(path: ScenePath, rest: NonNullable<SceneElement['rest']>, t: number): { lying: number; thenT: number | null } {
  const s = t - (path.delay + path.duration) - rest.after;
  if (s <= 0) return { lying: 0, thenT: null };
  if (s < REST_DOWN_S) return { lying: easeInOut(s / REST_DOWN_S), thenT: null };
  const down = REST_DOWN_S + rest.hold;
  if (s < down) return { lying: 1, thenT: null };
  if (s < down + REST_UP_S) return { lying: 1 - easeInOut((s - down) / REST_UP_S), thenT: null };
  return { lying: 0, thenT: rest.then ? s - down - REST_UP_S : null };
}

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

/** The first path of the chain of `follows` that starts at `id`: the track it is laid on. */
function trackRoot(scene: SceneDef, id: string): string {
  let at = id;
  for (let i = 0; i < scene.paths.length; i++) {
    const next = scene.paths.find((p) => p.id === at)?.follows;
    if (!next) break;
    at = next;
  }
  return at;
}

/** True when two paths are the same track (the same path, or laid on one another through `follows`): their walkers are one file. */
export const sceneSameTrack = (scene: SceneDef, a: string, b: string): boolean => trackRoot(scene, a) === trackRoot(scene, b);

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

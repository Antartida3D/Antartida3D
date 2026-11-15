import { DIORAMA_METERS_PER_UNIT, footprintCorners } from './orcadas-layout.ts';
import { MARAMBIO_ELEMENTS, MARAMBIO_RUNWAY_BEARING_DEG, type MarambioElement } from './marambio-site.ts';

/**
 * The Marambio diorama is a model on a table, like the Orcadas one: every element keeps its
 * measured plan, its bearing to the runway and its place in the real order of the base (runway to
 * the north-west, terminal and stores next to it, the taxiway down to the apron and its hangar,
 * the central row to the east, power plant and workshop to the south), but the empty ground
 * between them is closed up so the base fits one view. The real base spreads over 330 by 450 m;
 * the runway is 1.2 km long and only a stretch is drawn. The scene label says so.
 *
 * World axes: x along the runway towards the north-east, y up, z across it towards the south-east.
 * Sizes use the scale of the Orcadas diorama (DIORAMA_METERS_PER_UNIT).
 */
export interface MarambioLayoutEntry {
  id: string;
  /** Center of the element's base, in world units. */
  position: readonly [number, number, number];
  /** Rotation around the vertical axis, in radians (three.js: local +x turns towards -z). */
  rotationY: number;
  /** Plan size before rotation: [along local x, along local z], in world units. */
  footprint: readonly [number, number];
}

/**
 * Height of the plateau over the sea of the scene, in world units. Illustrative: the real plateau
 * is about 200 m high, which at this scale would be 57 units.
 */
export const MARAMBIO_GROUND_Y = 7;

/** Centreline of the runway (z), its width and the half length of the stretch drawn, in world units. */
export const MARAMBIO_RUNWAY_Z = -14;
export const MARAMBIO_RUNWAY_WIDTH = 40 / DIORAMA_METERS_PER_UNIT;
export const MARAMBIO_RUNWAY_HALF_LENGTH = 46;

/** Where each element stands on the stage: [x, z]. Illustrative, in the real order. */
const STAGE: Readonly<Record<string, readonly [number, number]>> = {
  commTower: [-15.5, -2.5],
  deposito: [-11.2, -0.6],
  abastecimiento: [-7.5, -4.7],
  terminal: [5, -4.6],
  jp1: [14.5, -3.4],
  apron: [-8, 12.5],
  hangar: [2.2, 23.6],
  sanidad: [15.5, 16.5],
  jefatura: [20.2, 21.1],
  palermo: [24, 24.9],
  comedor: [28.6, 29.4],
  usina: [-27, 19.5],
  obrador: [-17, 28],
};

/** Rotation that sets a long side of this compass bearing on the stage, whose x axis is the runway. */
const stageRotation = (bearingDeg: number) => ((MARAMBIO_RUNWAY_BEARING_DEG - bearingDeg) * Math.PI) / 180;

/** Elements set half a turn round, so their +x end (the one with the door) looks the other way. */
const DOOR_END_TURNED: ReadonlySet<string> = new Set(['hangar', 'sanidad', 'jefatura', 'palermo', 'comedor']);

const entryOf = (e: MarambioElement): MarambioLayoutEntry => {
  if (e.kind === 'runway') {
    return {
      id: e.id,
      position: [0, MARAMBIO_GROUND_Y, MARAMBIO_RUNWAY_Z],
      rotationY: 0,
      footprint: [MARAMBIO_RUNWAY_HALF_LENGTH * 2, MARAMBIO_RUNWAY_WIDTH],
    };
  }
  const [x, z] = STAGE[e.id];
  return {
    id: e.id,
    position: [x, MARAMBIO_GROUND_Y, z],
    // The hangar opens at its +x end and the modules of the row have their door there: turned half
    // a turn so the hangar looks at the apron and the doors of the row look at the walkway that
    // comes from the hangar.
    rotationY: stageRotation(e.bearingDeg) + (DOOR_END_TURNED.has(e.id) ? Math.PI : 0),
    footprint: [e.footprint[0] / DIORAMA_METERS_PER_UNIT, e.footprint[1] / DIORAMA_METERS_PER_UNIT],
  };
};

/** Every element of the stage, in world units. */
export const MARAMBIO_LAYOUT: readonly MarambioLayoutEntry[] = MARAMBIO_ELEMENTS.map((e) => {
  if (e.kind !== 'runway' && !STAGE[e.id]) throw new Error(`Marambio element without a place on the stage: ${e.id}`);
  return entryOf(e);
});

export function marambioLayoutOf(id: string): MarambioLayoutEntry {
  const entry = MARAMBIO_LAYOUT.find((e) => e.id === id);
  if (!entry) throw new Error(`Unknown Marambio layout id: ${id}`);
  return entry;
}

/** Corners of an element's plan on the stage, in world x/z. */
export function marambioCorners(id: string): [number, number][] {
  const { position, footprint, rotationY } = marambioLayoutOf(id);
  return footprintCorners(position[0], position[2], footprint[0], footprint[1], rotationY);
}

/** Length of a C-130H in metres (reference only for the size of the model, not shown as data). */
export const HERCULES_LENGTH_M = 29.8;

const apron = marambioLayoutOf('apron');
/** Unit vector of the apron's long side on the stage, pointing away from the hangar. */
const apronAxis: readonly [number, number] = [-Math.cos(apron.rotationY), Math.sin(apron.rotationY)];

/**
 * The C-130 parked on the apron, across it, with its nose towards the runway: centre of the
 * aircraft on the ground and rotation of its +x nose. Illustrative.
 */
export const MARAMBIO_HERCULES: { position: readonly [number, number, number]; rotationY: number } = {
  position: [apron.position[0] + apronAxis[0] * 2.4, MARAMBIO_GROUND_Y, apron.position[2] + apronAxis[1] * 2.4],
  rotationY: apron.rotationY + Math.PI / 2,
};

/** Width of the taxiway, in world units. No source gives it: drawn narrower than the runway. */
export const MARAMBIO_TAXIWAY_WIDTH = 18 / DIORAMA_METERS_PER_UNIT;

/**
 * Centreline of the gravel taxiway from the runway down to the apron, as [x, z] points. OSM maps
 * it as one line (ways 155949672, 1162265303 and 1162265302) leaving the runway west of the stores.
 */
export const MARAMBIO_TAXIWAY: readonly (readonly [number, number])[] = [
  [-21, MARAMBIO_RUNWAY_Z + MARAMBIO_RUNWAY_WIDTH / 2 - 1],
  [-22.5, -2],
  [-21, 4.5],
  [-15, 8],
];

const wave = (t: number, a: number, f: number, p: number) => a * Math.sin(t * f + p);

/**
 * Signed distance to the rim of the plateau in world units: positive on top, negative beyond the
 * edge, where the ground falls to the sea. Illustrative: the real plateau is far larger than the
 * stage (the island is about 14 km long), so its rim is drawn close to the base.
 */
export function marambioPlateauDistance(x: number, z: number): number {
  const side = MARAMBIO_RUNWAY_HALF_LENGTH + 4 + wave(z, 1.6, 0.21, 0.7) + wave(z, 0.7, 0.63, 2.1) - Math.abs(x);
  const front = 40 + wave(x, 1.8, 0.17, 1.2) + wave(x, 0.8, 0.52, 0.3) - z;
  const back = z + 27 + wave(x, 1.5, 0.19, 2.6) + wave(x, 0.6, 0.58, 1.1);
  return Math.min(side, front, back);
}

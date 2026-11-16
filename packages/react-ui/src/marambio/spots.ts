import { DIORAMA_METERS_PER_UNIT, MARAMBIO_GROUND_Y, MARAMBIO_HERCULES, MARAMBIO_RUNWAY_Z, marambioLayoutOf, type MarambioSpotId } from '@antartida/core';

type V3 = readonly [number, number, number];

export interface CameraPose {
  pos: V3;
  target: V3;
}

interface SpotView {
  /** Where the dot stands in the scene. */
  worldPos: V3;
  /** What the camera looks at, how far, from which compass-like bearing round y and how high. */
  target: V3;
  distance: number;
  bearingDeg: number;
  elevationDeg: number;
  /** Where the dot goes over the drawing shown without WebGL: [left %, top %]. */
  fallbackPct: readonly [number, number];
}

const G = MARAMBIO_GROUND_Y;
const at = (id: string, lift: number): V3 => {
  const [x, , z] = marambioLayoutOf(id).position;
  return [x, G + lift, z];
};

const terminal = marambioLayoutOf('terminal');
/** The control tower stands at the -x end of the terminal. */
const TOWER: V3 = [
  terminal.position[0] - Math.cos(terminal.rotationY) * (terminal.footprint[0] / 2 + 0.5),
  G + 3.6,
  terminal.position[2] + Math.sin(terminal.rotationY) * (terminal.footprint[0] / 2 + 0.5),
];
const PLANE: V3 = [MARAMBIO_HERCULES.position[0], G + 2.4, MARAMBIO_HERCULES.position[2]];

/** The whole base, seen from over the runway: the side the hangar opens to. */
const OVERVIEW = { target: [1, G, 5] as V3, distance: 98, bearingDeg: 212, elevationDeg: 30 };

export const SPOT_VIEWS: Readonly<Record<MarambioSpotId, SpotView>> = {
  plateau: { worldPos: [-41, G + 0.6, 27], ...OVERVIEW, fallbackPct: [14, 61] },
  runway: { worldPos: [12, G + 0.5, MARAMBIO_RUNWAY_Z], target: [-8, G, MARAMBIO_RUNWAY_Z + 2], distance: 46, bearingDeg: 250, elevationDeg: 14, fallbackPct: [50, 80] },
  hercules: { worldPos: PLANE, target: [PLANE[0], G + 1.2, PLANE[2]], distance: 24, bearingDeg: 262, elevationDeg: 16, fallbackPct: [44, 59] },
  hangar: { worldPos: at('hangar', 3.3), target: at('hangar', 1.2), distance: 30, bearingDeg: 226, elevationDeg: 15, fallbackPct: [49, 42] },
  tower: { worldPos: TOWER, target: [TOWER[0] + 1.5, G + 1.6, TOWER[2]], distance: 19, bearingDeg: 200, elevationDeg: 13, fallbackPct: [61, 56] },
  buildings: { worldPos: at('jefatura', 2.2), target: at('jefatura', 0.8), distance: 34, bearingDeg: 150, elevationDeg: 24, fallbackPct: [73, 47] },
};

/**
 * The Irízar waits at sea, well off the plateau, on the side the base is seen from at first. Its
 * place is illustrative: no source says where the ship anchors off Marambio, only that it stays in
 * front of the base and that cargo goes up by helicopter (O24). Drawn at the scale of the diorama,
 * from its length (121.3 m, a reference for the size of the model).
 */
export const IRIZAR_SHIP = {
  position: [50, 0, 105] as V3,
  rotationY: -0.5,
  length: 121.3 / DIORAMA_METERS_PER_UNIT,
};

/** The dot over the Irízar: it is not a stop of the visit, it offers the trip to Orcadas. */
export const IRIZAR_DOT = {
  id: 'irizar',
  worldPos: [IRIZAR_SHIP.position[0], 7, IRIZAR_SHIP.position[2]] as V3,
  fallbackPct: [86, 31] as const,
};

/** Every dot the scene places, in order: the points of interest, then the Irízar. */
export const SCENE_DOTS: readonly { id: string; worldPos: V3 }[] = [
  ...(Object.entries(SPOT_VIEWS) as [MarambioSpotId, SpotView][]).map(([id, v]) => ({ id, worldPos: v.worldPos })),
  { id: IRIZAR_DOT.id, worldPos: IRIZAR_DOT.worldPos },
];

/** Free orbit all the way round the model; never from below the plateau, never straight down. */
export const VIEW_ELEVATION_DEG: readonly [number, number] = [6, 58];
export const VIEW_MIN_DISTANCE = 7;
export const VIEW_MAX_DISTANCE = 190;
/**
 * Box the point looked at stays in: over the plateau, and as far below it as the lowest view goes
 * (the overview on a phone with the sheet at its tall size).
 */
export const VIEW_BOUNDARY = { min: [-46, G - 56, -26], max: [46, G + 8, 38] } as const;

/**
 * Camera of a spot (or the overview). With the panel as a card on the right (sidePanel) the view
 * shifts so the subject sits left of it; otherwise the panel is a sheet over the lower part of the
 * scene and the camera looks lower so the subject sits above it. On a portrait screen it also pulls
 * back, to fit the narrow view.
 */
export function poseForSpot(spot: MarambioSpotId | null, portrait: boolean, sheetTall: boolean, sidePanel: boolean): CameraPose {
  const v = spot ? SPOT_VIEWS[spot] : OVERVIEW;
  const deg = Math.PI / 180;
  const distance = v.distance * (portrait ? 1.75 : 1);
  const b = v.bearingDeg * deg;
  const e = (v.elevationDeg + (portrait ? 4 : 0)) * deg;
  const dir: V3 = [Math.sin(b) * Math.cos(e), Math.sin(e), Math.cos(b) * Math.cos(e)];
  // Camera right on the ground plane, for the side shift.
  const right: V3 = [Math.cos(b), 0, -Math.sin(b)];
  const shift = sidePanel ? distance * 0.2 : 0;
  const drop = sidePanel ? 0 : distance * (sheetTall ? 0.3 : 0.17);
  const target: V3 = [v.target[0] + right[0] * shift, v.target[1] - drop, v.target[2] + right[2] * shift];
  return { target, pos: [target[0] + dir[0] * distance, target[1] + dir[1] * distance, target[2] + dir[2] * distance] };
}

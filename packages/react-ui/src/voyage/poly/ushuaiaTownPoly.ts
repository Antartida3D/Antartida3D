import { CREAM, LAMP, ORANGE, RED, ROCK, SKY, WHITE, ZINC } from '../sightingColors.ts';
import { block, extrude, facingOut, lathe, prism, rect, type Tri, type Vec3 } from '../lowPoly.ts';

// Same tones as the block town (sightingModels.ts keeps them private), plus the lenga forest.
const TOWN_GRASS = 0x9aa86a;
const DOOR_WOOD = 0x8a6a4a;
const CHIMNEY_BROWN = 0x6b5443;
const LENGA_GREEN = 0x5f7a4a;

/** Depth the ground reaches under y = 0, like the block town: it hides the relief round the highest point. */
export const USHUAIA_TOWN_GROUND_SINK = -0.12;

/** A flat quad a-b-c-d turned to look away from `inside`. */
const panel = (a: Vec3, b: Vec3, c: Vec3, d: Vec3, color: number, inside: Vec3): Tri[] => [
  facingOut(a, b, c, color, inside),
  facingOut(a, c, d, color, inside),
];

/** A rectangle on the wall plane z = `z`, facing +z, from (x0, y0) to (x1, y1). */
const onFront = (x0: number, x1: number, y0: number, y1: number, z: number, color: number): Tri[] =>
  panel([x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], color, [(x0 + x1) / 2, (y0 + y1) / 2, z - 1]);

/** A rectangle on the wall plane x = `x`, facing +x, from (z0, y0) to (z1, y1). */
const onSide = (z0: number, z1: number, y0: number, y1: number, x: number, color: number): Tri[] =>
  panel([x, y0, z0], [x, y0, z1], [x, y1, z1], [x, y1, z0], color, [x - 1, (y0 + y1) / 2, (z0 + z1) / 2]);

/** A window with its white frame, on the front wall. */
const frontWindow = (cx: number, cy: number, w: number, h: number, z: number): Tri[] => [
  ...onFront(cx - w / 2 - 0.006, cx + w / 2 + 0.006, cy - h / 2 - 0.006, cy + h / 2 + 0.006, z + 0.002, WHITE),
  ...onFront(cx - w / 2, cx + w / 2, cy - h / 2, cy + h / 2, z + 0.004, LAMP),
];

/** A gable roof along x: thin solid of zinc slopes, its two ends (the gables) in the wall color. */
function gableRoof(x: number, z: number, w: number, d: number, eave: number, rise: number, color: number, gable: number): Tri[] {
  const o = 0.02;
  const t = 0.012;
  const profile: [number, number][] = [
    [d / 2 + o, eave - 0.004],
    [d / 2 + o, eave + t - 0.004],
    [0, eave + rise + t],
    [-(d / 2 + o), eave + t - 0.004],
    [-(d / 2 + o), eave - 0.004],
  ];
  return extrude(profile, x - w / 2 - 0.012, x + w / 2 + 0.012, color, gable).map(([a, b, c, col]): Tri => [
    [a[0], a[1], a[2] + z],
    [b[0], b[1], b[2] + z],
    [c[0], c[1], c[2] + z],
    col,
  ]);
}

interface House {
  x: number;
  z: number;
  w: number;
  h: number;
  d: number;
  wall: number;
  /** Ground it stands on. */
  y: number;
  /** x of a chimney on the back slope, if it has one. */
  chimney?: number;
}

const roofRise = (d: number) => d * 0.36;
/** Top of the zinc roof over the point at `z` (between the eaves). */
const roofTopAt = ({ z, h, d, y }: House, at: number) => {
  const eaveTop = y + h + 0.008;
  return eaveTop + (roofRise(d) + 0.004) * (1 - Math.abs(at - z) / (d / 2 + 0.02));
};
const CHIMNEY_STANDS = 0.06;
/** The chimney sits on the back slope, a quarter of the depth behind the ridge. */
const chimneyAt = (house: House): Vec3 => {
  const cz = house.z - house.d * 0.25;
  return [house.chimney!, roofTopAt(house, cz) + CHIMNEY_STANDS, cz];
};

/** A coloured house with a zinc gable roof: door and two windows towards the bay, a window on its +x end. */
function cottage(house: House): Tri[] {
  const { x, z, w, h, d, wall, y } = house;
  const front = z + d / 2;
  const tris: Tri[] = [
    ...prism(rect(x, z, w, d), y - 0.01, y + h, wall),
    ...gableRoof(x, z, w, d, y + h, roofRise(d), ZINC, wall),
    ...onFront(x - w * 0.08, x + w * 0.08, y, y + h * 0.7, front + 0.002, DOOR_WOOD),
    ...frontWindow(x - w * 0.3, y + h * 0.55, w * 0.18, h * 0.3, front),
    ...frontWindow(x + w * 0.3, y + h * 0.55, w * 0.18, h * 0.3, front),
    ...onSide(z - d * 0.14, z + d * 0.14, y + h * 0.42, y + h * 0.72, x + w / 2 + 0.002, LAMP),
  ];
  if (house.chimney !== undefined) {
    const [cx, top, cz] = chimneyAt(house);
    // Down to below the roof on its low (eave) side, so it does not float over the slope.
    const foot = roofTopAt(house, cz - 0.02) - 0.01;
    tris.push(
      ...block(cx, (foot + top - 0.012) / 2, cz, 0.04, top - 0.012 - foot, 0.04, CHIMNEY_BROWN),
      ...block(cx, top - 0.006, cz, 0.052, 0.012, 0.052, CHIMNEY_BROWN),
    );
  }
  return tris;
}

/** A pointed (lancet) window on the front wall, in white. */
const lancet = (cx: number, y0: number, w: number, h: number, z: number): Tri[] => [
  ...onFront(cx - w / 2, cx + w / 2, y0, y0 + h * 0.75, z, WHITE),
  facingOut([cx - w / 2, y0 + h * 0.75, z], [cx + w / 2, y0 + h * 0.75, z], [cx, y0 + h, z], WHITE, [cx, y0, z - 1]),
];

/**
 * The yellow and red church of the town center with its tower, as in the block town: red plinth,
 * yellow walls, red roof and buttresses, tall pointed windows towards the bay (+z), tower at -x with
 * its belfry and a red spire with a cross.
 */
function church(x: number, z: number, y: number): Tri[] {
  const nx = x + 0.12;
  const front = z + 0.11;
  const tx = x - 0.16;
  const tz = z + 0.02;
  return [
    // Nave.
    ...prism(rect(nx, z, 0.46, 0.24), y - 0.01, y + 0.06, RED),
    ...prism(rect(nx, z, 0.44, 0.22), y + 0.06, y + 0.2, LAMP),
    ...gableRoof(nx, z, 0.44, 0.22, y + 0.2, 0.09, RED, LAMP),
    // Buttresses between the windows, and the windows.
    ...[0, 0.12, 0.24, 0.34].flatMap((dx) => block(x + dx, y + 0.1, front + 0.008, 0.024, 0.2, 0.016, RED)),
    ...[0.06, 0.18, 0.29].flatMap((dx) => lancet(x + dx, y + 0.085, 0.032, 0.1, front + 0.002)),
    // A round window high on the +x gable.
    ...lathe(0, 0, [[0, 0.022], [0, 0]], 8, WHITE).map(([a, b, c, col]): Tri => {
      // Just outside the gable end, which stands 0.012 past the wall.
      const at = ([px, , pz]: Vec3): Vec3 => [nx + 0.234, y + 0.245 + pz, z + px];
      return facingOut(at(a), at(b), at(c), col, [nx, y + 0.245, z]);
    }),
    // Tower: red base, yellow shaft, belfry openings, red cornice, spire and cross.
    ...prism(rect(tx, tz, 0.16, 0.16), y - 0.01, y + 0.1, RED),
    ...prism(rect(tx, tz, 0.14, 0.14), y + 0.1, y + 0.47, LAMP),
    ...lancet(tx, y + 0.28, 0.035, 0.06, tz + 0.072),
    ...lancet(tx, y + 0.39, 0.07, 0.07, tz + 0.072),
    ...onSide(tz - 0.025, tz + 0.025, y + 0.39, y + 0.45, tx + 0.072, WHITE),
    ...prism(rect(tx, tz, 0.19, 0.19), y + 0.47, y + 0.5, RED),
    ...lathe(tx, tz, [[y + 0.5, 0.075 * Math.SQRT2], [y + 0.67, 0]], 4, RED, Math.PI / 4),
    ...block(tx, y + 0.72, tz, 0.012, 0.1, 0.012, WHITE),
    ...block(tx, y + 0.735, tz, 0.05, 0.012, 0.012, WHITE),
  ];
}

/** Front row (by the water) and back row (up the slope), as in the block town. */
const HOUSES: readonly House[] = [
  { x: -0.6, z: 0.12, w: 0.26, h: 0.16, d: 0.2, wall: RED, y: 0.04, chimney: -0.52 },
  { x: 0.4, z: 0.17, w: 0.2, h: 0.13, d: 0.16, wall: LAMP, y: 0.04 },
  { x: 0.68, z: 0.12, w: 0.24, h: 0.15, d: 0.2, wall: ORANGE, y: 0.04, chimney: 0.62 },
  { x: -0.45, z: -0.3, w: 0.26, h: 0.15, d: 0.18, wall: WHITE, y: 0.14 },
  { x: -0.12, z: -0.3, w: 0.22, h: 0.17, d: 0.18, wall: SKY, y: 0.14 },
  { x: 0.2, z: -0.32, w: 0.26, h: 0.2, d: 0.2, wall: RED, y: 0.14, chimney: 0.2 },
  { x: 0.54, z: -0.3, w: 0.24, h: 0.14, d: 0.18, wall: CREAM, y: 0.14 },
];

/**
 * Ground under the town, seen from +x: the shore by the water (+z), a low terrace for the front row,
 * the slope and an upper terrace for the back row. Down to USHUAIA_TOWN_GROUND_SINK, like the block town.
 */
const GROUND_PROFILE: [number, number][] = [
  [0.36, USHUAIA_TOWN_GROUND_SINK],
  [0.36, 0],
  [0.32, 0.04],
  [-0.04, 0.04],
  [-0.16, 0.14],
  [-0.52, 0.14],
  [-0.56, 0.08],
  [-0.56, USHUAIA_TOWN_GROUND_SINK],
];

function ground(): Tri[] {
  return [
    ...extrude(GROUND_PROFILE, -0.85, 0.85, TOWN_GRASS),
    // Stone shore and the street along the water.
    ...panel([-0.85, 0.0005, 0.3605], [0.85, 0.0005, 0.3605], [0.85, 0.0405, 0.3205], [-0.85, 0.0405, 0.3205], ROCK, [0, -1, 0]),
    ...panel([-0.85, 0, 0.361], [0.85, 0, 0.361], [0.85, -0.05, 0.361], [-0.85, -0.05, 0.361], ROCK, [0, 0, 0]),
    ...panel([-0.85, 0.0405, 0.31], [0.85, 0.0405, 0.31], [0.85, 0.0405, 0.27], [-0.85, 0.0405, 0.27], ROCK, [0, 0, 0.29]),
  ];
}

/** Lenga trees on the upper edge, where the forest starts behind the town. */
const LENGAS = [-0.72, -0.3, 0.03, 0.37, 0.72].flatMap((x, i) =>
  lathe(x, -0.49 + (i % 2) * 0.015, [[0.13, 0.045], [0.21, 0.03], [0.29 - (i % 2) * 0.03, 0]], 6, LENGA_GREEN, i * 0.5),
);

/**
 * Ushuaia at the start of the trip, low-poly: the yellow and red church among coloured houses with
 * zinc gable roofs on the slope, seen from the bay (+z). Same footprint and scale as the block TOWN
 * (1.7 x 0.92 ground, buildings on y = 0.04 and 0.14). An illustration of the town, not a map of it.
 */
export const USHUAIA_TOWN_POLY: Tri[] = [...ground(), ...church(-0.12, 0.14, 0.04), ...HOUSES.flatMap(cottage), ...LENGAS];

/**
 * Tops of the chimneys, where the smoke comes out: the same three houses and x as the block town,
 * moved onto the back slope of each gable roof (the block chimneys stood at the back eave).
 */
export const USHUAIA_TOWN_CHIMNEYS: readonly Vec3[] = HOUSES.filter((h) => h.chimney !== undefined).map(chimneyAt);

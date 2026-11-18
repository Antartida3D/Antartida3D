import { BLACK, CREAM, LAMP, ROCK, SKY, WHITE, ZINC } from '../sightingColors.ts';
import { block, chunk, groundField, lathe, ngon, prism, strut, turn, type Tri } from '../lowPoly.ts';

// San Juan de Salvamento, low-poly, with the measures of HOUSE in sightingModels.ts (taken from
// photos of its replica): a low eight-sided wooden house on a rock islet, windows for the lamps on
// the three walls that look to +x, the door on -x, a stepped zinc roof with a ball on top and the
// flagpole. An illustration, not a survey.

/** Lit and shadowed rock of the islet (the two greys of ISLET). */
const ROCK_LIGHT = 0x9a9f9b;
const ROCK_DARK = 0x767b78;
/** Wood of the door, sills and corner boards (WOOD of sightingModels.ts, which is not exported). */
const WOOD = 0x8a6a4a;
/** Zinc of the roof steps, darker than the slopes, so the steps read. */
const ZINC_DARK = 0x667077;
/** Flag colors: the light blue stripes and the sun of the Argentine flag. */
const FLAG_BLUE = SKY;
const FLAG_SUN = LAMP;

/** Islet: semi-axes of its outline and height of its flat top. */
const ISLET_RX = 0.48;
const ISLET_RZ = 0.38;
const ISLET_TOP = 0.125;

/** House: distance from the center to the middle of each wall, its foot (buried in the rock) and its eave. */
const APOTHEM = 0.28;
const SIDES = 8;
/** Corner radius of a regular octagon with that apothem. */
const corner = (apothem: number) => apothem / Math.cos(Math.PI / SIDES);
/** Phase that turns one flat wall to +x (ngon and lathe go from this angle clockwise seen from above). */
const PHASE = Math.PI / SIDES;
const WALL_FOOT = 0.07;
const SILL_TOP = 0.13;
const EAVE = 0.37;

/** Rock islet: a field of faces over an ellipse, flat on top under the house, falling to y = 0 at the edge. */
function islet(): Tri[] {
  const cell = 0.1;
  return groundField(
    10,
    8,
    cell,
    314,
    (u, v, noise) => {
      const e = Math.hypot((u * 0.5) / ISLET_RX, (v * 0.4) / ISLET_RZ);
      if (e > 0.97) return null;
      return ISLET_TOP * Math.min(1, (1 - e) / 0.3) * (0.92 + noise * 0.12);
    },
    (_u, _v, _h, steep, noise) => (steep > 0.35 ? (noise > 0.55 ? ROCK_DARK : ROCK) : noise > 0.8 ? ROCK : ROCK_LIGHT),
    0,
  );
}

/** A part built on the wall that looks to +x, moved to wall `k` (k = 0 is +x, counting towards +z). */
const onWall = (tris: readonly Tri[], k: number) => turn(tris, (-k * 2 * Math.PI) / SIDES);

/** A lamp window centered on wall +x: lit pane, white mullion and transom, wooden sill and lintel. */
function lampWindow(width: number): Tri[] {
  const x = APOTHEM;
  const y = 0.29;
  const h = 0.07;
  return [
    ...block(x, y, 0, 0.008, h, width, LAMP),
    ...block(x + 0.004, y, 0, 0.006, h, 0.01, WHITE),
    ...block(x + 0.004, y + 0.008, 0, 0.006, 0.008, width, WHITE),
    ...block(x + 0.006, y - h / 2 - 0.006, 0, 0.022, 0.012, width + 0.024, WOOD),
    ...block(x + 0.004, y + h / 2 + 0.005, 0, 0.016, 0.01, width + 0.016, WOOD),
  ];
}

/** The door on wall -x: wooden leaf, white frame and a knob. */
function door(): Tri[] {
  const x = APOTHEM;
  return onWall(
    [
      ...block(x, 0.21, 0, 0.012, 0.16, 0.08, WOOD),
      ...block(x + 0.002, 0.292, 0, 0.012, 0.012, 0.1, WHITE),
      ...block(x + 0.002, 0.21, 0.046, 0.012, 0.164, 0.012, WHITE),
      ...block(x + 0.002, 0.21, -0.046, 0.012, 0.164, 0.012, WHITE),
      ...block(x + 0.01, 0.2, -0.026, 0.008, 0.008, 0.008, BLACK),
    ],
    4,
  );
}

/** The eight walls, a wooden sill band at their foot and a corner board at each corner. */
function walls(): Tri[] {
  const ring = ngon(0, 0, corner(APOTHEM), SIDES, PHASE);
  const posts = ngon(0, 0, corner(APOTHEM) + 0.004, SIDES, PHASE).flatMap(([x, z]) => strut([x, WALL_FOOT, z], [x, EAVE, z], 0.008, WOOD, false));
  return [
    ...prism(ngon(0, 0, corner(APOTHEM + 0.006), SIDES, PHASE), WALL_FOOT - 0.02, SILL_TOP, WOOD),
    ...prism(ring, SILL_TOP, EAVE, CREAM),
    ...posts,
  ];
}

/** Stepped zinc roof: eave, two sloping tiers with a riser between them, and the black ball on top. */
function roof(): Tri[] {
  const rings: [number, number][] = [
    [EAVE, corner(APOTHEM)],
    [EAVE, corner(0.31)],
    [0.4, corner(0.31)],
    [0.45, corner(0.2)],
    [0.47, corner(0.2)],
    [0.53, corner(0.11)],
    [0.55, corner(0.11)],
    [0.585, corner(0.04)],
    [0.59, 0],
  ];
  // Bands: 0 underside, 1 fascia, 2 slope, 3 riser, 4 slope, 5 riser, 6 cap, 7 point.
  const color = (_segment: number, band: number) => (band === 0 || band === 1 || band === 3 || band === 5 ? ZINC_DARK : ZINC);
  const ball = lathe(0, 0, [[0.575, 0.02], [0.59, 0.038], [0.615, 0.05], [0.64, 0.038], [0.655, 0]], SIDES, BLACK, PHASE);
  return [...lathe(0, 0, rings, SIDES, color, PHASE), ...ball];
}

/** Flagpole by the house with the Argentine flag: light blue, white with its sun, light blue. */
function flag(): Tri[] {
  const x = -0.38;
  const z = 0.26;
  const fx = -0.31;
  return [
    ...strut([x, 0.04, z], [x, 0.7, z], 0.007, BLACK),
    ...block(x, 0.705, z, 0.018, 0.012, 0.018, BLACK),
    ...block(fx, 0.66, z, 0.12, 0.03, 0.006, FLAG_BLUE),
    ...block(fx, 0.63, z, 0.12, 0.03, 0.006, WHITE),
    ...block(fx, 0.6, z, 0.12, 0.03, 0.006, FLAG_BLUE),
    ...block(fx, 0.63, z, 0.016, 0.016, 0.01, FLAG_SUN),
  ];
}

/** San Juan de Salvamento lighthouse house, low-poly: drop-in for HOUSE (base at y = 0, lamps to +x). */
export const SAN_JUAN_POLY: Tri[] = [
  ...islet(),
  ...chunk(-0.36, 0.08, 0.24, 0.2, 0.12, 0.2, 7, ROCK_DARK),
  ...chunk(0.38, 0.06, -0.26, 0.16, 0.1, 0.16, 8, ROCK_DARK),
  ...walls(),
  ...lampWindow(0.16),
  ...onWall(lampWindow(0.1), 1),
  ...onWall(lampWindow(0.1), -1),
  ...door(),
  ...roof(),
  ...flag(),
];

import { createSeededRng } from '@antartida/core';
import { BLACK, LAMP, RED, ROCK, WHITE } from '../sightingColors.ts';
import { block, chunk, extrude, lathe, ngon, outward, prism, skin, strut, turn, type Tri, type Vec3 } from '../lowPoly.ts';

// Les Éclaireurs, low-poly, with the measures of TOWER in sightingModels.ts: a faceted rock islet,
// a stone tower that narrows upwards (red, white band, red), a black gallery with its railing, the
// lit lantern with mullions and a black roof with its vent. Door and windows look to +x. An
// illustration, not a survey.

/** Lit and shadowed rock of the islet (the two greys of ISLET). */
const ROCK_LIGHT = 0x9a9f9b;
const ROCK_DARK = 0x767b78;

/** Height of the flat top of the islet, where the tower stands. */
const ISLET_TOP = 0.13;
/** Tower: radius at its foot and at the gallery, and the gallery height. */
const TOWER_FOOT_R = 0.135;
const TOWER_TOP_R = 0.1;
const GALLERY_Y = 0.73;
/** Band limits: red up to the first, white up to the second, red up to the gallery. */
const BAND_WHITE = 0.33;
const BAND_RED = 0.53;

const towerRadius = (y: number) => TOWER_FOOT_R + ((TOWER_TOP_R - TOWER_FOOT_R) * (y - ISLET_TOP)) / (GALLERY_Y - ISLET_TOP);

/** The islet: irregular rings from the waterline up to a flat top, the waterline darker. */
function islet(): Tri[] {
  const rng = createSeededRng(41);
  const n = 11;
  const jitter = Array.from({ length: n }, () => 0.85 + rng() * 0.25);
  // [y, radius along x, radius along z, how much of the jitter it keeps]
  const levels: [number, number, number, number][] = [
    [0, 0.475, 0.375, 1],
    [0.05, 0.44, 0.35, 1],
    [0.1, 0.33, 0.27, 0.6],
    [ISLET_TOP, 0.22, 0.19, 0.2],
  ];
  const rings = levels.map(([y, rx, rz, keep]) =>
    Array.from({ length: n }, (_, i): Vec3 => {
      const a = (i / n) * Math.PI * 2 + 0.2;
      const k = 1 + (jitter[i] - 1) * keep;
      // A little lift on some corners so the slope breaks into facets.
      const lift = y > 0 && y < ISLET_TOP ? (jitter[(i + 3) % n] - 0.97) * 0.04 : 0;
      return [Math.cos(a) * rx * k, y + lift, Math.sin(a) * rz * k];
    }),
  );
  const shades = [ROCK_DARK, ROCK, ROCK_LIGHT];
  const tris = skin(rings, (band, seg) => (band === 0 ? ROCK_DARK : shades[(seg + band) % 3]), ROCK_LIGHT);
  // Two boulders on the shore, where ISLET has its darker blocks.
  return [...tris, ...chunk(-0.33, 0.06, 0.24, 0.2, 0.12, 0.18, 7, ROCK_DARK), ...chunk(0.35, 0.05, -0.24, 0.16, 0.1, 0.15, 11, ROCK)];
}

/** The tapering tower in its three bands, sunk a little into the islet. */
function tower(): Tri[] {
  const ys = [ISLET_TOP - 0.02, BAND_WHITE, BAND_RED, GALLERY_Y];
  const bandColor = [RED, WHITE, RED];
  return lathe(0, 0, ys.map((y) => [y, towerRadius(Math.max(y, ISLET_TOP))] as const), 12, (_, band) => bandColor[Math.min(band, 2)]);
}

/** The arched door on the +x side of the foot. */
function door(): Tri[] {
  const x = towerRadius(0.2);
  const profile: [number, number][] = [
    [-0.035, ISLET_TOP], [0.035, ISLET_TOP], [0.035, 0.235], [0.025, 0.252], [0, 0.26], [-0.025, 0.252], [-0.035, 0.235],
  ];
  return outward(extrude(profile, x - 0.01, x + 0.008, BLACK), () => [x, 0.2, 0]);
}

/** Small stair windows climbing round the tower: [height, angle from +x]. */
const WINDOWS: [number, number][] = [
  [0.3, 2.4],
  [0.48, 0],
  [0.63, -2.2],
];

function windows(): Tri[] {
  return WINDOWS.flatMap(([y, a]) => turn(block(towerRadius(y), y, 0, 0.016, 0.05, 0.03, BLACK), a));
}

/** The gallery deck, its posts and the top rail. */
function gallery(): Tri[] {
  const deck = prism(ngon(0, 0, 0.15, 12), GALLERY_Y, GALLERY_Y + 0.03, BLACK, BLACK, true);
  const railY = GALLERY_Y + 0.08;
  const posts = ngon(0, 0, 0.142, 12);
  const rail = posts.flatMap(([x, z], i) => {
    const [nx, nz] = posts[(i + 1) % posts.length];
    return [...strut([x, GALLERY_Y + 0.03, z], [x, railY, z], 0.004, BLACK), ...strut([x, railY, z], [nx, railY, nz], 0.004, BLACK, false)];
  });
  return [...deck, ...rail];
}

/** The lit lantern with its mullions, the roof, the vent ball and the finial. */
function lantern(): Tri[] {
  const y0 = GALLERY_Y + 0.03;
  const y1 = 0.87;
  const glass = prism(ngon(0, 0, 0.07, 8), y0, y1, LAMP);
  const mullions = ngon(0, 0, 0.071, 8).flatMap(([x, z]) => strut([x, y0, z], [x, y1, z], 0.005, BLACK, false));
  const eave = prism(ngon(0, 0, 0.09, 8), y1, y1 + 0.01, BLACK, BLACK, true);
  const roof = lathe(0, 0, [[y1 + 0.01, 0.09], [0.93, 0.05], [0.955, 0]], 8, BLACK);
  const ball = lathe(0, 0, [[0.95, 0.008], [0.96, 0.018], [0.98, 0.018], [0.99, 0]], 6, BLACK);
  const finial = strut([0, 0.99, 0], [0, 1.02, 0], 0.005, BLACK);
  // lathe winds by its own sense; turn every face away from the axis.
  const axisOut = (tris: Tri[], lo: number, hi: number) => outward(tris, ([, y]) => [0, Math.min(hi, Math.max(lo, y)), 0]);
  return [...glass, ...mullions, ...eave, ...axisOut(roof, y1 + 0.005, y1 + 0.005), ...axisOut(ball, 0.97, 0.97), ...finial];
}

export const ECLAIREURS_POLY: Tri[] = [
  ...islet(),
  ...outward(tower(), ([, y]) => [0, Math.min(GALLERY_Y - 0.01, Math.max(ISLET_TOP, y)), 0]),
  ...door(),
  ...windows(),
  ...gallery(),
  ...lantern(),
];

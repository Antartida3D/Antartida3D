import { createSeededRng } from '@antartida/core';
import { buildHelicopterRotorTris, buildHelicopterTris } from '../orcadas/lowPolyProps.ts';
import { HELICOPTER_ROTOR_ORIGIN, VOXEL_PALETTE } from '../orcadas/stationModels.ts';
import { block, chunk, extrude, groundField, lathe, quad, RELIEF_ICE, scaled, shift, turn, type Tri, type Vec3 } from './lowPoly.ts';
import { ICEBERG_PEAKS_POLY } from './icebergs.ts';
import { buildPonchoPerson, ponchoHandAt, ponchoPoseLift, type PersonPose } from './ponchoPeople.ts';
import { buildNansenSled } from './ponchoProps.ts';
import { lowestY, rope, slab, snowMound, tube } from './ponchoShapes.ts';
import { OBSERVER_HIP_Y } from '../orcadas/lowPolyPeople.ts';

/**
 * Low-poly models for five more stops of Poncho's trip (rule 30, docs/diseno/estilo-voxel.md),
 * next to those of ponchoProps.ts and the people of ponchoPeople.ts. ALL ARE ILLUSTRATIONS: shapes,
 * sizes and colors are plausible, not measured; only what the book says is claimed (see each model,
 * page numbers of https://www.marambio.aq/pdf/poncho.pdf). No fire, no names of people.
 *
 * ## Hand-off for the scene (what to import and how to combine)
 *
 * Units are model units: a standing person is ~1.0 tall, a dog (`poncho-dog`, ponchoModels.ts) ~1
 * long (scale it ~0.55 beside people). Ground models rest on y = 0 (`lowestY === 0`) with a foot of
 * snow that melts into the relief (`RELIEF_ICE`): draw them with `resolveRelief(tris, worldY)` then
 * `buildPolyGeometry` (cache it), like ponchoProps.ts. The three aerial ones (`dogParachute`,
 * `supplyParachute`, `rescueHelicopter`) have no snow: lift them with the group height.
 *
 * Registry: `PONCHO_PROPS2: Record<PonchoProp2Id, PonchoProp2>` = `{ id, label, tris, height, size }`
 * (`size` = measured [x, y, z] extent), ids in `PONCHO_PROP2_IDS`. Builders (fresh faces each call):
 * `buildIcebreakerHull`, `buildLoadingRamp`, `buildCargoCrates`, `buildNunataks`,
 * `buildOverturnedSled`, `buildDogParachute`, `buildRescueHelicopter`, `buildSupplyParachute`,
 * `buildTouristSled`, `buildTownHouse`, `buildLowFence`, `buildLengaTree`, `buildNireTree`,
 * `buildShrub`, `buildFrozenBay`, `buildMakeshiftSled`. All face +x when they have a direction,
 * buildings and the hull face +z.
 *
 * Reference sizes [x long, y high, z across] (model units):
 * - Scene `rumbo-a-belgrano` (p. 14): `icebreakerHull` (generic ship, NOT the Irízar, not named
 *   after any real ship) 4.4 x 5.0 x 3.4: its side wall faces +z, the ice is on +z, the crane
 *   boom reaches over it. `loadingRamp` 1.6 x 1.75 x 3.1 (with handrails and snow) runs from its foot (origin) uphill along -z.
 *   Join: `ICEBREAKER_GANGWAY_AT` (hull frame, the sill of the doorway) and `LOADING_RAMP_TOP_AT`
 *   (ramp frame): put the ramp at `GANGWAY - TOP` = [0.8, 0, 2.4] of the hull (same yaw).
 *   `cargoCrates` 1.8 x 0.7 x 1.4 stands at the foot of the ramp (+z side). People walk up it
 *   (`walkPose`, feet follow the slope: y = 1.0 * (1 - z / -2.3) of the ramp frame), dogs 0.55.
 * - Scene `patrulla-paralelo-82` (p. 15-16): `nunataks` 4.1 x 2.0 x 2.6 (four peaks, a saddle,
 *   scree) and `overturnedSled` 2.4 x 0.7 x 1.7 (on its side at the edge). `clingPose(phase)`:
 *   both arms up, body leaning forward, hanging from the stones: `NUNATAK_HOLDS` are the two
 *   protruding stones (nunataks frame); `clingHandsAt(pose)` is where the hands are, so the
 *   person goes at `hold - hand` (same yaw 0: it faces +x, the rock wall is ahead). Poncho (a
 *   dog, seated, eating snow) is a block model: nothing to add.
 * - Scene `paracaidas` (p. 18-19): `rescueHelicopter` 3.8 x 1.3 x 1.3 (nose +x, open door on +z,
 *   skids on y = 0) plus `rescueRotor` (spin it about y at `RESCUE_ROTOR_AT`, ~3.4 across);
 *   scale 4 of the Orcadas Sea King, reduced: a real helicopter would be ~7 units long.
 *   `dogParachute` 2.1 across, 2.65 high: put the dog (back at y = `DOG_PARACHUTE_HOOK[1]` of the
 *   model, centered on x = z = 0, legs hang BELOW y = 0 of the model, so lift the pair by the
 *   height of the dog's legs); the two rope rings are the harness round its body.
 *   `supplyParachute` 1.0 across, 2.0 high (food crates on y = 0, hook at `SUPPLY_DROP_HOOK`).
 * - Scene `adios-a-la-antartida` (p. 21): reuse `icebreakerHull` and `loadingRamp`
 *   and add the tourists: `buildTourist(pose, look)` with `TOURIST_LOOKS` (sky, green, yellow;
 *   same person of ponchoPeople.ts recolored, a hat with pompom, a slightly different height), a
 *   ready arrangement `TOURIST_GROUP` (position [x, z] on the ice, `yaw`, action, phase offset) and
 *   `touristSled` (the Nansen sled with no load: a bench and a blanket) 2.2 x 0.9 x 0.75.
 * - Scene `ushuaia` (p. 21-22): `townHouse` 3.2 x 3.6 x 2.6 (front +z, two floors, tin roof),
 *   `lowFence` 3.1 x 0.7 x 0.5, `lengaTree` 2.8 high, `nireTree` 1.8 high, `shrub` 0.6 high,
 *   `frozenBay` 3.4 x 0.4 x 2.4 (frozen channel with a lead of open water, cracks and a small
 *   iceberg reused from icebergs.ts) and `makeshiftSled` 2.2 x 0.25 x 1.0 with its rope (boards and a rope). The
 *   children are `buildChild(pose)`: the existing person scaled by `CHILD_SCALE` = 0.6 in a red
 *   parka (not another model of person): they walk or `haulPose` the sled.
 * - Poses: `clingPose(phase)` (period `PONCHO_PHASE_PERIOD`) is pure: no clock.
 *
 * Detail test: `test/ponchoProps2.test.ts` walks `PONCHO_PROPS2`; a new model is registered there.
 */

const { WHITE, ICE, ICE_BLUE, ORANGE, RED, RED_DARK, CREAM, WOOD, WOOD_LIGHT, BROWN, BROWN_DARK, ZINC, BLACK, SEA_GREY, NAVY_ROOF, ROCK_DARK, ROCK_LIGHT } = VOXEL_PALETTE;

// Colors that the station palette does not have (rule 30, 5: named constants). All are guesses.
const HULL_DARK = 0x2b3743;
const HULL_GLASS = 0x141c26;
const NUNATAK_DARK = 0x3c4046;
const CANOPY_INNER = 0xc9bfa0;
const HOUSE_GLASS = 0x2f4a5f;
const OPEN_WATER = 0x3d6c8f;
const CRACK_DARK = 0x1c2a38;
const TOURIST_SKY = 0x4f9fd8;
const TOURIST_SKY_TRIM = 0x2f6f9f;
const TOURIST_GREEN = 0x4f9a4f;
const TOURIST_GREEN_TRIM = 0x2f6a35;
const TOURIST_YELLOW = 0xe3c23a;
const TOURIST_YELLOW_TRIM = 0xa8871f;

const at = (x: number, y: number, z: number): Vec3 => [x, y, z];

/** The faces turned round y by `yaw` and then moved to (x, y, z). */
const placed = (tris: readonly Tri[], x: number, z: number, yaw = 0, y = 0): Tri[] => shift(turn(tris, yaw), x, y, z);

/** The faces moved so that the lowest one rests on y = 0. */
const grounded = (tris: readonly Tri[]): Tri[] => shift(tris, 0, -lowestY(tris), 0);

// ---- Icebreaker (scenes 1 and 4) ---------------------------------------------------------------

/** Where the side wall of the hull is at height y: it leans out as it rises (flare), z of the outside. */
const hullFace = (y: number) => 0.1 * y;
/** Hull frame: the sill of the doorway where the ramp ends. */
export const ICEBREAKER_GANGWAY_AT: Vec3 = at(0.8, 1.0, hullFace(1.0));
/** Ramp frame: the top end of the ramp (its foot is the origin; it climbs along -z). */
export const LOADING_RAMP_TOP_AT: Vec3 = at(0, 1.0, -2.3);

const HULL_X0 = -1.8;
const HULL_X1 = 1.8;
const DECK_Y = 2.45;

/** One horizontal band of the hull as a closed solid between y0 and y1 (section in z, y). */
function hullBand(y0: number, y1: number, color: number): Tri[] {
  const zb = -1.5;
  return extrude([[hullFace(y0), y0], [hullFace(y1), y1], [zb, y1], [zb, y0]], HULL_X0, HULL_X1, color);
}

/** A round window of the ship: ring and dark glass, on the wall at (x, y), looking +z. */
function porthole(x: number, y: number): Tri[] {
  const z = hullFace(y);
  return [...tube(at(x, y, z), at(x, y, z + 0.035), 0.12, 0.12, 8, ZINC), ...tube(at(x, y, z + 0.03), at(x, y, z + 0.05), 0.075, 0.075, 8, HULL_GLASS)];
}

/**
 * A stretch of the side of an old icebreaker seen close up (book p. 14: the move to Belgrano was
 * made aboard an icebreaker; the book gives no more, so shape and colors are an illustration of a
 * GENERIC ship, not of any real one): a dark hull wall with a red waterline stripe and a row of
 * portholes, an open doorway (gangway), the rail of the deck, a deckhouse with windows, a tall
 * funnel, a mast and a crane with its boom over the ice. 4.4 long with snow, 5.0 high; snow along its foot.
 */
export function buildIcebreakerHull(): Tri[] {
  const out: Tri[] = [...hullBand(0, 0.32, RED_DARK), ...hullBand(0.32, 2.3, HULL_DARK), ...hullBand(2.3, DECK_Y, CREAM)];
  // Portholes along the wall, but not over the doorway.
  for (const x of [-1.5, -1.0, -0.5, 0.0, 1.4]) out.push(...porthole(x, 1.7));
  for (const x of [-1.5, -1.0, -0.5]) out.push(...porthole(x, 0.95));
  // The doorway for the ramp: dark opening, frame and a sill plank where the ramp lands.
  const dz = hullFace(1) + 0.006;
  out.push(...quad(at(0.4, 0.3, dz), at(1.2, 0.3, dz), at(1.2, 1.5, dz + 0.012), at(0.4, 1.5, dz + 0.012), HULL_GLASS));
  out.push(...tube(at(0.4, 0.3, dz + 0.02), at(0.4, 1.5, dz + 0.03), 0.03, 0.03, 4, ZINC), ...tube(at(1.2, 0.3, dz + 0.02), at(1.2, 1.5, dz + 0.03), 0.03, 0.03, 4, ZINC));
  out.push(...tube(at(0.4, 1.5, dz + 0.03), at(1.2, 1.5, dz + 0.03), 0.03, 0.03, 4, ZINC));
  out.push(...block(0.8, 0.97, dz + 0.08, 0.84, 0.05, 0.2, WOOD_LIGHT, WOOD));
  // Deck rail: posts and two ropes.
  const railZ = hullFace(DECK_Y) - 0.04;
  const posts = Array.from({ length: 9 }, (_, i) => -1.7 + i * 0.425);
  for (const x of posts) out.push(...tube(at(x, DECK_Y, railZ), at(x, DECK_Y + 0.55, railZ), 0.022, 0.022, 4, ZINC));
  out.push(...rope(posts.map((x) => at(x, DECK_Y + 0.52, railZ)), 0.016, 4, CREAM), ...rope(posts.map((x) => at(x, DECK_Y + 0.28, railZ)), 0.014, 4, CREAM));
  // Deckhouse with a row of windows facing the ice, and its flat roof.
  out.push(...block(0.5, DECK_Y + 0.6, -0.75, 1.2, 1.2, 0.9, CREAM, ZINC));
  for (const x of [0.05, 0.3, 0.55, 0.8, 1.05]) out.push(...block(x, DECK_Y + 0.7, -0.3 + 0.008, 0.15, 0.2, 0.016, HULL_GLASS));
  out.push(...block(0.5, DECK_Y + 1.23, -0.75, 1.3, 0.06, 1.0, SEA_GREY, ZINC));
  // Funnel: a red body, a cream band and a black top, with a short stay.
  out.push(...lathe(-0.9, -0.8, [[DECK_Y, 0.42], [3.7, 0.36], [4.15, 0.35], [4.4, 0.4], [4.4, 0.34]], 10, (_, band) => [RED_DARK, CREAM, BLACK, BLACK][band]));
  out.push(...tube(at(-0.9, 4.4, -0.8), at(-0.9, 4.46, -0.8), 0.34, 0.34, 10, BLACK));
  // Mast on the deckhouse with a yard.
  out.push(...tube(at(0.5, DECK_Y + 1.26, -0.75), at(0.5, 5.0, -0.75), 0.04, 0.025, 5, ZINC), ...tube(at(0.1, 4.55, -0.75), at(0.9, 4.55, -0.75), 0.02, 0.02, 4, ZINC));
  // Crane: a post and a boom that leans out over the ice, with a wire and a hook.
  const top = at(1.55, 3.75, -0.1);
  const tip = at(1.55, 3.0, 1.9);
  out.push(...tube(at(1.55, DECK_Y, -0.1), top, 0.07, 0.06, 6, ZINC), ...tube(top, tip, 0.05, 0.03, 5, ZINC, false, true));
  out.push(...rope([tip, at(1.55, 2.4, 1.9)], 0.012, 4, BLACK), ...block(1.55, 2.3, 1.9, 0.08, 0.14, 0.08, BROWN_DARK, ZINC));
  out.push(...rope([top, at(1.55, DECK_Y + 0.4, -0.7)], 0.012, 4, BLACK));
  // Snow heaped along the foot of the hull (the ship is moored to the ice).
  out.push(...snowMound(0, 0.45, 2.2, 0.55, 0.2, 201, 16), ...snowMound(-1.2, 0.9, 0.7, 0.45, 0.1, 202, 8), ...snowMound(1.3, 1.0, 0.6, 0.4, 0.1, 203, 8));
  return out;
}

/**
 * A plank ramp from the foot (origin, on the ice) up to the doorway of the hull along -z, 0.8 wide
 * and 1.0 high at its top end (`LOADING_RAMP_TOP_AT`): boards, cleats for the boots, two stringers
 * and a rope handrail on posts. A guess (the book does not describe the way aboard).
 */
export function buildLoadingRamp(): Tri[] {
  const out: Tri[] = [];
  const surf = (t: number, x: number, lift = 0): Vec3 => at(x, 0.1 + t * 0.9 + lift, -t * 2.3);
  // Four boards side by side along the slope, alternating colors.
  for (let j = 0; j < 4; j++) {
    const x0 = -0.4 + j * 0.2 + 0.008;
    const x1 = x0 + 0.184;
    out.push(...slab([surf(0, x0, -0.025), surf(0, x1, -0.025), surf(1, x1, -0.025), surf(1, x0, -0.025)], 0.05, j % 2 ? WOOD_LIGHT : WOOD, BROWN));
  }
  // Cleats across, and the two stringers under the boards.
  for (let k = 1; k <= 7; k++) {
    const t = k / 8;
    out.push(...tube(surf(t, -0.4, 0.012), surf(t, 0.4, 0.012), 0.016, 0.016, 4, BROWN_DARK));
  }
  for (const s of [-1, 1]) out.push(...tube(at(s * 0.37, 0.05, 0.04), at(s * 0.37, 0.95, -2.3), 0.05, 0.05, 4, BROWN_DARK));
  // Handrails: posts at four stations and two ropes through them.
  for (const s of [-1, 1]) {
    const stations = [0, 0.33, 0.66, 1].map((t) => t);
    for (const t of stations) out.push(...tube(surf(t, s * 0.43), surf(t, s * 0.43, 0.75), 0.022, 0.02, 4, WOOD));
    out.push(...rope(stations.map((t) => surf(t, s * 0.43, 0.72)), 0.016, 4, CREAM), ...rope(stations.map((t) => surf(t, s * 0.43, 0.4)), 0.014, 4, CREAM));
  }
  out.push(...snowMound(0, 0.28, 0.75, 0.45, 0.07, 211, 10), ...snowMound(-0.55, 0.05, 0.25, 0.2, 0.05, 212, 7), ...snowMound(0.55, -0.3, 0.25, 0.2, 0.05, 213, 7));
  return out;
}

/** A wooden box with a lid of boards, two metal straps and a red mark: width, height, depth, centered on (0, 0, 0) at its base. */
function crate(w: number, h: number, d: number): Tri[] {
  const out: Tri[] = [...block(0, h / 2, 0, w, h, d, WOOD, WOOD_LIGHT)];
  for (const x of [-w * 0.3, w * 0.3]) out.push(...block(x, h / 2 + 0.006, 0, 0.03, h + 0.012, d + 0.012, ZINC));
  out.push(...block(0, h * 0.55, d / 2 + 0.004, w * 0.22, h * 0.22, 0.012, RED));
  out.push(...block(0, h + 0.008, 0, w * 0.8, 0.016, d * 0.12, BROWN_DARK));
  return out;
}

/**
 * Freight for the ship (the book only says the move was by icebreaker, p. 14): five wooden boxes
 * stacked and scattered, a drum with metal hoops and a sack. 1.6 x 0.9 x 1.3. An illustration.
 */
export function buildCargoCrates(): Tri[] {
  const drum = lathe(0.65, 0.35, [[0, 0.17], [0.01, 0.18], [0.22, 0.18], [0.43, 0.18], [0.44, 0.17], [0.44, 0]], 8, (_, band) => (band === 2 ? ZINC : SEA_GREY));
  return [
    ...placed(crate(0.6, 0.38, 0.44), -0.35, -0.1, 0.1),
    ...placed(crate(0.46, 0.32, 0.4), -0.32, -0.1, -0.35, 0.38),
    ...placed(crate(0.42, 0.34, 0.42), 0.15, -0.35, 0.5),
    ...placed(crate(0.5, 0.3, 0.38), -0.1, 0.5, -0.2),
    ...placed(crate(0.34, 0.26, 0.34), 0.45, 0.25, 0.7),
    ...drum,
    ...chunk(-0.7, 0.14, 0.45, 0.34, 0.26, 0.24, 221, CREAM),
    ...snowMound(0, 0.1, 0.95, 0.75, 0.07, 222, 12),
  ];
}

// ---- Nunataks and the sled over the edge (scene 2) --------------------------------------------

/**
 * A crag: a ragged stack of rings (a squashed, leaning, jittered cone) of dark rock with pale
 * veins running across it, a ledge of snow on one flank and snow heaped at its foot.
 */
function crag(cx: number, cz: number, baseR: number, height: number, seed: number, lean: readonly [number, number], sides = 7): Tri[] {
  const rng = createSeededRng(seed);
  const levels = [0, 0.2, 0.46, 0.7, 0.88, 1];
  const radii = [1, 0.84, 0.64, 0.45, 0.24, 0];
  const jit = Array.from({ length: levels.length * sides }, () => 0.8 + rng() * 0.4);
  const ring = (k: number, i: number): Vec3 => {
    const a = -(i / sides) * Math.PI * 2;
    const r = baseR * radii[k] * jit[k * sides + (i % sides)];
    return at(cx + lean[0] * levels[k] ** 1.6 + Math.cos(a) * r, k === 0 ? 0 : levels[k] * height, cz + lean[1] * levels[k] ** 1.6 + Math.sin(a) * r);
  };
  const tone = (i: number, k: number) => ((i * 2 + k * 3) % 7 === 0 ? ROCK_LIGHT : (i + k) % 3 === 0 ? ROCK_DARK : NUNATAK_DARK);
  const out: Tri[] = [];
  for (let k = 0; k < levels.length - 1; k++) {
    for (let i = 0; i < sides; i++) {
      const [a, b, d, e] = [ring(k, i), ring(k, i + 1), ring(k + 1, i), ring(k + 1, i + 1)];
      if (radii[k + 1] > 0) out.push(...quad(a, b, e, d, tone(i, k)));
      else out.push([a, b, d, tone(i, k)]);
    }
  }
  // A shelf of snow on the sheltered side, a cap on the top, and the heap at the foot.
  const mid = ring(2, 2);
  out.push(...chunk(mid[0] + 0.05, mid[1] + 0.02, mid[2] + 0.04, baseR * 0.55, 0.1, baseR * 0.5, seed + 1, WHITE));
  const tip = ring(4, 0);
  out.push(...chunk(tip[0] - lean[0] * 0.02, height * 0.9, tip[2], baseR * 0.3, 0.1, baseR * 0.3, seed + 2, ICE));
  out.push(...snowMound(cx, cz, baseR * 1.15, baseR * 1.1, 0.08, seed + 3, 10));
  return out;
}

/**
 * The two stones that stick out of the crag (book p. 15-16: the men cling to some protruding
 * stones): at hand height of `clingPose`, on the -x side of the wall so a person facing +x reaches them.
 */
export const NUNATAK_HOLDS: readonly [Vec3, Vec3] = [at(0.62, 1.0, -0.048), at(0.62, 1.0, 0.048)];

/**
 * An outcrop of nunataks (book p. 15-16: «nunataks», «portezuelos entre puntas de roca pelada»):
 * four crags of dark rock of different shapes, a saddle between the two tallest, scree, and the
 * two stones that stick out of the wall (`NUNATAK_HOLDS`). 3.9 x 2.1 x 3.2.
 */
export function buildNunataks(): Tri[] {
  const out: Tri[] = [
    ...crag(-1.15, -0.35, 0.78, 2.0, 231, [0.15, 0.1]),
    ...crag(-0.1, -0.55, 0.62, 1.5, 232, [-0.1, 0.2], 6),
    // The wall with the holds: a broad, lean crag whose -x flank is next to the stones.
    ...crag(1.25, 0.1, 0.8, 2.0, 233, [-0.2, 0], 8),
    ...crag(0.3, 0.95, 0.4, 0.55, 234, [0.05, 0.1], 6),
  ];
  // Scree and loose boulders; the holds are two stones that stick out of the wall.
  for (const [x, z, s, k] of [[-0.55, 0.45, 0.3, 241], [-0.3, 0.9, 0.2, 242], [1.0, 1.0, 0.28, 243], [-1.6, 0.4, 0.26, 244], [0.85, -0.7, 0.24, 245]] as const) {
    out.push(...chunk(x, s * 0.4, z, s, s * 0.8, s * 0.9, k, k % 2 ? NUNATAK_DARK : ROCK_DARK));
  }
  for (const [x, y, z] of NUNATAK_HOLDS) out.push(...chunk(x + 0.14, y, z, 0.34, 0.2, 0.1, 246 + Math.round(z * 100), ROCK_LIGHT));
  out.push(...snowMound(-0.1, 0.25, 1.5, 0.9, 0.12, 250, 14));
  return out;
}

/** Phase for the pose `clingPose`: rises and falls once per turn of `phase` (period 2π, no clock). */
const tremble = (phase: number) => Math.sin(phase);

/**
 * Cling (book p. 16: the men hold on to the stones at the edge of the 200 m ravine): both arms
 * reach up and ahead to the stones, the body leans in and the legs are braced; a small tremor.
 * Pure function of `phase`, period 2π. Angles are those of `PersonPose` (ponchoPeople.ts).
 */
export function clingPose(phase: number): PersonPose {
  const t = tremble(phase);
  return { legL: 0.55 + 0.05 * t, legR: 0.2 - 0.05 * t, armL: 2.75 + 0.06 * t, armR: 2.7 - 0.06 * t, torsoPitch: -0.4 - 0.03 * t, grip: 0.1 };
}

/** Where the mittens are in the model frame of the person grounded by `ponchoPoseLift`: left hand, right hand. */
export const clingHandsAt = (pose: PersonPose): readonly [Vec3, Vec3] => [ponchoHandAt(pose, 'L'), ponchoHandAt(pose, 'R')];

/**
 * The Nansen sled of ponchoProps.ts lying on its side at the edge (book p. 16: the sled stops
 * over the edge): rolled about its length by ~100 degrees so one runner points up, a bow bent, two
 * sacks spilled, and its own snow. 2.2 x 1.1 x 1.2.
 */
export function buildOverturnedSled(): Tri[] {
  // Keep the wood and metal of the sled; the snow heaps of the upright one are rebuilt for this pose.
  const wood = buildNansenSled().filter((t) => t[3] !== RELIEF_ICE && t[3] !== WHITE && t[3] !== ICE);
  const roll = 1.75;
  const c = Math.cos(roll);
  const s = Math.sin(roll);
  const turned = wood.map(([a, b, d, col]): Tri => {
    const r = ([x, y, z]: Vec3): Vec3 => [x, y * c - z * s, y * s + z * c];
    return [r(a), r(b), r(d), col];
  });
  const sled = grounded(turned);
  return [
    ...sled,
    ...chunk(-0.3, 0.12, 0.75, 0.4, 0.24, 0.3, 261, CREAM),
    ...chunk(0.25, 0.1, 0.95, 0.3, 0.2, 0.26, 262, SEA_GREY),
    ...snowMound(0, 0.1, 1.2, 0.8, 0.09, 263, 12),
    ...snowMound(0.1, -0.35, 0.8, 0.35, 0.1, 264, 8),
  ];
}

// ---- Parachutes and the helicopter (scene 3) ---------------------------------------------------

/**
 * A round parachute: a canopy of 12 gores of alternating colors (its inside in another tone so
 * it also reads from below), a lug at the top and rope lines to one hook at the origin's top.
 * `hookY` is the height of the hook; the canopy rim is `lines` above it.
 */
function parachute(radius: number, lines: number, hookY: number, seed: number): Tri[] {
  const gores = 12;
  const stations: readonly (readonly [number, number])[] = [[0, 1], [0.32, 0.93], [0.58, 0.78], [0.78, 0.55], [0.92, 0.27], [1, 0]];
  const rng = createSeededRng(seed);
  const edgeJit = Array.from({ length: gores }, () => 0.97 + rng() * 0.05);
  const rimY = hookY + lines;
  const pt = (k: number, i: number, inset = 0): Vec3 => {
    const [h, r] = stations[k];
    const a = -(i / gores) * Math.PI * 2;
    const rr = (radius * r * (k === 0 ? edgeJit[i % gores] : 1)) - inset;
    return at(Math.cos(a) * Math.max(rr, 0), rimY + radius * 0.8 * h - inset, Math.sin(a) * Math.max(rr, 0));
  };
  const out: Tri[] = [];
  for (let k = 0; k < stations.length - 1; k++) {
    for (let i = 0; i < gores; i++) {
      const [a, b, d, e] = [pt(k, i), pt(k, i + 1), pt(k + 1, i), pt(k + 1, i + 1)];
      const col = i % 2 ? CREAM : ORANGE;
      if (stations[k + 1][1] > 0) {
        out.push(...quad(a, b, e, d, col));
        const [ia, ib, id, ie] = [pt(k, i, 0.012), pt(k, i + 1, 0.012), pt(k + 1, i, 0.012), pt(k + 1, i + 1, 0.012)];
        out.push(...quad(ib, ia, id, ie, CANOPY_INNER));
      } else {
        out.push([a, b, d, col]);
        out.push([pt(k, i + 1, 0.012), pt(k, i, 0.012), pt(k + 1, i, 0.012), CANOPY_INNER]);
      }
    }
  }
  // Lines from every second corner of the rim down to the hook.
  const hook = at(0, hookY, 0);
  for (let i = 0; i < gores; i += 2) out.push(...tube(pt(0, i), hook, 0.008, 0.008, 4, BROWN_DARK));
  return out;
}

/** Where the back of the dog hangs, in the frame of `dogParachute` (the legs hang below y = 0). */
export const DOG_PARACHUTE_HOOK: Vec3 = at(0, 0.3, 0);

/**
 * Parachute with a harness for a dog (book p. 18-19: the dogs jump with parachutes and move their
 * legs as if swimming): a round canopy of orange and cream gores, lines to a ring on the dog's
 * back (`DOG_PARACHUTE_HOOK`), and two rope rings that go round its chest and belly. The colors
 * and the size of the canopy are an illustration. 2.1 across, 2.3 high.
 */
export function buildDogParachute(): Tri[] {
  const out = parachute(1.05, 1.5, DOG_PARACHUTE_HOOK[1], 271);
  out.push(...tube(at(0, 0.3, 0), at(0, 0.38, 0), 0.035, 0.035, 8, ZINC));
  // Two girth loops (rope) round the body in the plane across x, joined to the hook.
  for (const x of [-0.1, 0.13]) {
    const ringPts = Array.from({ length: 9 }, (_, i): Vec3 => {
      const a = (i / 8) * Math.PI * 2;
      return at(x, 0.16 + Math.cos(a) * 0.15, Math.sin(a) * 0.1);
    });
    out.push(...rope(ringPts, 0.012, 4, RED_DARK), ...rope([at(x, 0.3, 0), at(0, 0.3, 0)], 0.01, 4, RED_DARK));
  }
  return out;
}

const HELICOPTER_SCALE = 4;

/**
 * The Sea King of Orcadas (lowPolyProps.ts, reused) at diorama size with the cabin door slid
 * back (book p. 18: the helicopter of the icebreaker; the book does not say which one, so this is
 * an illustration): dark opening on +z, the door on its rail and a bench inside. Resting on y = 0, nose +x.
 */
export function buildRescueHelicopter(): Tri[] {
  const body = buildHelicopterTris();
  const door: Tri[] = [
    ...block(0.08, 0.15, 0.113, 0.2, 0.14, 0.012, HULL_GLASS),
    ...block(-0.17, 0.155, 0.126, 0.2, 0.13, 0.012, ORANGE, SEA_GREY),
    ...block(0.08, 0.1, 0.06, 0.18, 0.03, 0.08, ZINC),
  ];
  return grounded(scaled([...body, ...door], HELICOPTER_SCALE));
}

/** Main rotor of `buildRescueHelicopter`, centered on its own mast: spin it about y. */
export const buildRescueRotor = (): Tri[] => scaled(buildHelicopterRotorTris(), HELICOPTER_SCALE);
/** Where the mast of `buildRescueRotor` goes, in the frame of the helicopter. */
export const RESCUE_ROTOR_AT: Vec3 = at(HELICOPTER_ROTOR_ORIGIN[0] * HELICOPTER_SCALE, HELICOPTER_ROTOR_ORIGIN[1] * HELICOPTER_SCALE, HELICOPTER_ROTOR_ORIGIN[2] * HELICOPTER_SCALE);

/** Where the lines of `supplyParachute` meet, above the crates. */
export const SUPPLY_DROP_HOOK: Vec3 = at(0, 0.72, 0);

/**
 * Food boxes under a small parachute (book p. 18-19: besides the dogs they drop supplies): two
 * crates tied with a rope sling and a canopy of 12 gores. 1.0 across, 1.6 high. No snow: it
 * is in the air; lift it, or set it on the ice, with the rest of the scene.
 */
export function buildSupplyParachute(): Tri[] {
  const out = parachute(0.5, 0.85, SUPPLY_DROP_HOOK[1], 281);
  out.push(...crate(0.5, 0.36, 0.4), ...placed(crate(0.36, 0.3, 0.32), 0, 0, 0.4, 0.36));
  out.push(...rope([at(0, 0.66, 0), at(0.24, 0.5, 0.18), at(0, 0.3, 0.22)], 0.01, 4, CREAM), ...rope([at(0, 0.66, 0), at(-0.24, 0.5, -0.18), at(0, 0.3, -0.22)], 0.01, 4, CREAM));
  out.push(...tube(at(0, 0.66, 0), at(0, 0.74, 0), 0.03, 0.03, 8, ZINC));
  return out;
}

// ---- Tourists (scene 4) ------------------------------------------------------------------------

/** Parka colors for tourists (a guess), the hat, and a small height difference so the group is not clones. */
export interface TouristLook {
  readonly id: 'sky' | 'green' | 'yellow';
  readonly parka: number;
  readonly trim: number;
  readonly hat: number;
  readonly pompom: number;
  readonly scale: number;
}

export const TOURIST_LOOKS: readonly TouristLook[] = [
  { id: 'sky', parka: TOURIST_SKY, trim: TOURIST_SKY_TRIM, hat: RED, pompom: WHITE, scale: 1.0 },
  { id: 'green', parka: TOURIST_GREEN, trim: TOURIST_GREEN_TRIM, hat: CREAM, pompom: RED, scale: 0.94 },
  { id: 'yellow', parka: TOURIST_YELLOW, trim: TOURIST_YELLOW_TRIM, hat: NAVY_ROOF, pompom: RED, scale: 1.04 },
];

/** Top of the head in the frame of the upper body (the cap of the observer: y 0.78..1.0 round x = 0.02). */
const HEAD_TOP: readonly [number, number] = [0.02, 1.0];

/**
 * A person of ponchoPeople.ts in the parka of a tourist (book p. 21: tourists get off the
 * icebreaker): the parts and the pose are the same model, recolored (orange -> `parka`, red-brown
 * -> `trim`, the cap -> `hat`) and topped with a pompom that follows the lean of the body.
 */
export function buildTourist(pose: PersonPose, look: TouristLook): Tri[] {
  const map = new Map<number, number>([[ORANGE, look.parka], [RED_DARK, look.trim], [NAVY_ROOF, look.hat]]);
  const person = buildPonchoPerson(pose, 'orange').map(([a, b, c, col]): Tri => [a, b, c, map.get(col) ?? col]);
  // The pompom: rotate the top of the head about the hips by the lean, then the lift of the pose.
  const [hx, hy] = HEAD_TOP;
  const cs = Math.cos(pose.torsoPitch);
  const sn = Math.sin(pose.torsoPitch);
  const px = hx * cs - (hy - OBSERVER_HIP_Y) * sn;
  const py = OBSERVER_HIP_Y + hx * sn + (hy - OBSERVER_HIP_Y) * cs + ponchoPoseLift(pose);
  return scaled([...person, ...chunk(px, py + 0.025, 0, 0.1, 0.09, 0.1, 291, look.pompom)], look.scale);
}

/** One tourist of the group: where, which way and what it does. `yaw` as in `turn`. */
export interface TouristPlacement {
  readonly look: TouristLook['id'];
  readonly x: number;
  readonly z: number;
  readonly yaw: number;
  readonly action: 'walk' | 'stand';
  readonly phase: number;
}

/**
 * Five tourists next to the ramp and the sled, in the frame of the hull model (the ice is on +z):
 * three come down the ramp or stand in a bunch, two wait by the sled. Positions are an arrangement
 * to start from, in model units, y = 0.
 */
export const TOURIST_GROUP: readonly TouristPlacement[] = [
  { look: 'sky', x: 0.3, z: 3.2, yaw: -1.2, action: 'walk', phase: 0 },
  { look: 'green', x: 1.2, z: 3.4, yaw: -1.0, action: 'walk', phase: 2.1 },
  { look: 'yellow', x: 0.8, z: 3.9, yaw: -0.8, action: 'stand', phase: 0 },
  { look: 'sky', x: 2.2, z: 3.6, yaw: -1.9, action: 'stand', phase: 0 },
  { look: 'green', x: 2.5, z: 4.2, yaw: -2.2, action: 'stand', phase: 0 },
];

/**
 * The Nansen sled of ponchoProps.ts with no load (book p. 21: the tourists take a short ride in
 * a sled): a bench of boards across the basket and a folded blanket on it. 2.2 x 0.9 x 0.75.
 */
export function buildTouristSled(): Tri[] {
  return [
    ...buildNansenSled(),
    ...block(-0.35, 0.34, 0, 0.5, 0.04, 0.46, WOOD_LIGHT, WOOD),
    ...block(-0.35, 0.29, -0.2, 0.05, 0.1, 0.05, WOOD),
    ...block(-0.35, 0.29, 0.2, 0.05, 0.1, 0.05, WOOD),
    ...chunk(-0.35, 0.4, 0, 0.44, 0.07, 0.4, 301, NAVY_ROOF),
  ];
}

// ---- Ushuaia (scene 5) -------------------------------------------------------------------------

/** One point of a roof slope: `side` 1 is the +z slope, -1 the back one; t = 0 at the eave, 1 at the ridge. */
const ROOF_EAVE = { y: 2.25, z: 0.88 };
const ROOF_RIDGE_Y = 3.15;
const roofAt = (side: 1 | -1, x: number, t: number, lift = 0): Vec3 => {
  const dy = ROOF_RIDGE_Y - ROOF_EAVE.y;
  const len = Math.hypot(dy, ROOF_EAVE.z);
  // Normal of the slope, pointing up and out.
  const n: Vec3 = [0, ROOF_EAVE.z / len, (side * dy) / len];
  return [x + n[0] * lift, ROOF_EAVE.y + dy * t + n[1] * lift, side * ROOF_EAVE.z * (1 - t) + n[2] * lift];
};

/** A window on a wall: a white frame, dark glass, a cross of bars and, if asked, two shutters. `yaw` turns it from facing +z to the wall's outward direction. */
function windowAt(x: number, y: number, z: number, yaw: number, shutters: boolean): Tri[] {
  const parts: Tri[] = [
    ...block(0, 0, 0, 0.4, 0.5, 0.03, WHITE),
    ...block(0, 0, 0.012, 0.3, 0.4, 0.02, HOUSE_GLASS),
    ...block(0, 0, 0.022, 0.03, 0.4, 0.012, WHITE),
    ...block(0, 0, 0.022, 0.3, 0.03, 0.012, WHITE),
  ];
  if (shutters) for (const s of [-1, 1]) parts.push(...block(s * 0.27, 0, 0.008, 0.14, 0.5, 0.02, RED_DARK));
  return placed(shift(parts, 0, 0, 0.015), x, z, yaw, y);
}

/**
 * A two-floor town house of Ushuaia (book p. 21-22: the garden of the hotel; the book does not
 * describe the building, so this is an illustration): cream walls on a stone base, a pitched roof
 * of corrugated metal with snow on it, a chimney, a porch over the door on +z, windows on both
 * floors (some with shutters), and drifts. New model: the Orcadas buildings are one-floor modules.
 * 2.2 wide, 1.5 deep, 3.6 high with the chimney (3.2 x 2.6 with the drifts).
 */
export function buildTownHouse(): Tri[] {
  const out: Tri[] = [];
  // Stone base, walls, the band between floors.
  out.push(...block(0, 0.07, 0, 2.28, 0.14, 1.58, ROCK_DARK, ROCK_LIGHT));
  out.push(...block(0, 1.2, 0, 2.2, 2.2, 1.5, CREAM, CREAM), ...block(0, 1.18, 0, 2.26, 0.06, 1.56, WHITE));
  // Gable ends above the walls, with a small attic window on the front.
  for (const s of [1, -1]) {
    const x = s * 1.1;
    const tri: Tri = s === 1 ? [at(x, 2.3, 0.75), at(x, 2.3, -0.75), at(x, ROOF_RIDGE_Y, 0), CREAM] : [at(x, 2.3, -0.75), at(x, 2.3, 0.75), at(x, ROOF_RIDGE_Y, 0), CREAM];
    out.push(tri);
  }
  // Windows: front (two floors, door in the middle below), both sides.
  out.push(...windowAt(-0.65, 0.7, 0.75, 0, false), ...windowAt(0.65, 0.7, 0.75, 0, false));
  for (const x of [-0.7, 0, 0.7]) out.push(...windowAt(x, 1.72, 0.75, 0, x !== 0));
  for (const y of [0.7, 1.72]) out.push(...windowAt(1.1, y, 0, Math.PI / 2, false), ...windowAt(-1.1, y, 0, -Math.PI / 2, false));
  // Front door, a porch roof on two posts and two steps.
  out.push(...block(0, 0.56, 0.755, 0.5, 0.84, 0.03, NAVY_ROOF), ...block(0.17, 0.56, 0.775, 0.04, 0.05, 0.03, ZINC));
  out.push(...tube(at(-0.36, 0.14, 1.05), at(-0.36, 1.1, 1.05), 0.03, 0.03, 4, WHITE), ...tube(at(0.36, 0.14, 1.05), at(0.36, 1.1, 1.05), 0.03, 0.03, 4, WHITE));
  out.push(...slab([at(-0.5, 1.2, 1.1), at(0.5, 1.2, 1.1), at(0.5, 1.42, 0.7), at(-0.5, 1.42, 0.7)], 0.04, ZINC, SEA_GREY));
  out.push(...block(0, 0.05, 0.95, 0.8, 0.1, 0.4, WOOD_LIGHT, WOOD), ...block(0, 0.1, 0.84, 0.7, 0.08, 0.22, WOOD_LIGHT, WOOD));
  // Roof: a plate with a ribbed top of corrugated metal on each slope, a ridge, a chimney, snow.
  for (const side of [1, -1] as const) {
    const corners = (x0: number, x1: number, t0: number, t1: number, lift: number): [Vec3, Vec3, Vec3, Vec3] =>
      side === 1 ? [roofAt(side, x0, t0, lift), roofAt(side, x1, t0, lift), roofAt(side, x1, t1, lift), roofAt(side, x0, t1, lift)] : [roofAt(side, x1, t0, lift), roofAt(side, x0, t0, lift), roofAt(side, x0, t1, lift), roofAt(side, x1, t1, lift)];
    out.push(...slab(corners(-1.22, 1.22, 0, 1, 0), 0.04, SEA_GREY, HULL_DARK));
    for (let i = 0; i < 12; i++) {
      const x0 = -1.15 + i * 0.2;
      out.push(...quad(...corners(x0, x0 + 0.08, 0, 1, 0.028), ZINC));
    }
  }
  out.push(...tube(at(-1.22, ROOF_RIDGE_Y + 0.02, 0), at(1.22, ROOF_RIDGE_Y + 0.02, 0), 0.04, 0.04, 5, BROWN_DARK));
  out.push(...block(-0.6, 3.1, -0.1, 0.26, 0.8, 0.26, BROWN_DARK, ZINC), ...block(-0.6, 3.54, -0.1, 0.34, 0.07, 0.34, ZINC));
  // Snow lying on the roof (more on the back slope) and drifts round the house.
  out.push(...slab([roofAt(1, -0.9, 0.35, 0.04), roofAt(1, 0.5, 0.35, 0.04), roofAt(1, 0.5, 0.92, 0.04), roofAt(1, -0.9, 0.92, 0.04)], 0.05, WHITE, ICE));
  out.push(...slab([roofAt(-1, 0.9, 0.2, 0.04), roofAt(-1, -0.7, 0.2, 0.04), roofAt(-1, -0.7, 0.95, 0.04), roofAt(-1, 0.9, 0.95, 0.04)], 0.05, WHITE, ICE));
  out.push(...snowMound(0, 0.7, 1.5, 0.55, 0.12, 311, 14), ...snowMound(-1.2, 0, 0.45, 0.9, 0.12, 312, 10), ...snowMound(1.2, -0.3, 0.4, 0.8, 0.1, 313, 9), ...snowMound(0, -0.85, 1.3, 0.4, 0.14, 314, 12));
  return out;
}

/**
 * A low fence in front of a garden (book p. 21: the garden of the hotel): posts, two rails and
 * pointed boards, snow on the posts and drifts. 2.6 long, 0.7 high.
 */
export function buildLowFence(): Tri[] {
  const out: Tri[] = [];
  for (let i = 0; i < 6; i++) {
    const x = -1.25 + i * 0.5;
    out.push(...block(x, 0.33, 0, 0.07, 0.66, 0.07, WOOD, WOOD_LIGHT), ...chunk(x, 0.7, 0, 0.1, 0.04, 0.1, 320 + i, WHITE));
  }
  out.push(...block(0, 0.22, 0.045, 2.6, 0.05, 0.03, WOOD_LIGHT), ...block(0, 0.5, 0.045, 2.6, 0.05, 0.03, WOOD_LIGHT));
  for (let i = 0; i < 17; i++) {
    const x = -1.2 + i * 0.15;
    const tall = 0.54 + 0.02 * ((i * 7) % 3);
    out.push(...block(x, tall / 2 + 0.04, 0.07, 0.07, tall, 0.02, i % 2 ? WHITE : CREAM));
    out.push([at(x - 0.035, tall + 0.04, 0.08), at(x + 0.035, tall + 0.04, 0.08), at(x, tall + 0.1, 0.08), i % 2 ? WHITE : CREAM]);
  }
  out.push(...snowMound(-0.6, 0, 0.9, 0.25, 0.08, 330, 9), ...snowMound(0.7, 0.05, 0.9, 0.22, 0.07, 331, 9));
  return out;
}

/** A branch as a tube, its snow on top as a flat white lump. */
function branch(a: Vec3, b: Vec3, r0: number, r1: number, color: number, snowSeed = 0): Tri[] {
  const out = tube(a, b, r0, r1, 5, color, false, true);
  if (snowSeed) {
    const m = at((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + r1 + 0.015, (a[2] + b[2]) / 2);
    out.push(...chunk(m[0], m[1], m[2], Math.abs(b[0] - a[0]) + 0.1, 0.05, Math.abs(b[2] - a[2]) + 0.1, snowSeed, WHITE));
  }
  return out;
}

/**
 * A bare tree of the forest of Tierra del Fuego in winter, a lenga-like one (the book only says
 * Poncho gets to know «los árboles», p. 22; the species is a guess): a straight trunk, five main
 * limbs that fork, snow on the forks and at the foot. 2.8 high, 1.4 across.
 */
export function buildLengaTree(): Tri[] {
  const rng = createSeededRng(341);
  const out: Tri[] = [...tube(at(0, 0.04, 0), at(0.03, 1.2, 0), 0.1, 0.06, 6, BROWN, false, false)];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + rng() * 0.5;
    const y0 = 1.0 + i * 0.22;
    const fork = at(Math.cos(a) * 0.4, y0 + 0.4, Math.sin(a) * 0.4);
    out.push(...branch(at(0.03, y0, 0), fork, 0.04, 0.025, BROWN_DARK, 351 + i));
    for (const d of [-0.5, 0.5]) {
      const tipA = a + d;
      out.push(...branch(fork, at(fork[0] + Math.cos(tipA) * 0.3, fork[1] + 0.35 + rng() * 0.15, fork[2] + Math.sin(tipA) * 0.3), 0.022, 0.01, BROWN_DARK));
    }
  }
  out.push(...tube(at(0.03, 1.2, 0), at(0.02, 2.3, 0.02), 0.06, 0.012, 5, BROWN));
  out.push(...snowMound(0, 0, 0.35, 0.33, 0.07, 360, 9));
  return out;
}

/**
 * A low, twisted tree with three crooked trunks, an ñire-like one (a guess: the book names no
 * species), bare and with snow in the forks. 1.8 high, 1.4 across.
 */
export function buildNireTree(): Tri[] {
  const rng = createSeededRng(371);
  const out: Tri[] = [];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.4;
    const mid = at(Math.cos(a) * 0.2, 0.55, Math.sin(a) * 0.2);
    const top = at(Math.cos(a + 0.5) * 0.5, 1.25 + rng() * 0.3, Math.sin(a + 0.5) * 0.5);
    out.push(...tube(at(0, 0.04, 0), mid, 0.08, 0.06, 5, WOOD, false, false), ...branch(mid, top, 0.06, 0.03, WOOD, 380 + i));
    for (const d of [-0.7, 0.7]) out.push(...branch(top, at(top[0] + Math.cos(a + d) * 0.3, top[1] + 0.25, top[2] + Math.sin(a + d) * 0.3), 0.025, 0.01, BROWN_DARK));
  }
  out.push(...chunk(0, 0.1, 0, 0.3, 0.14, 0.3, 390, BROWN_DARK), ...snowMound(0, 0, 0.55, 0.5, 0.08, 391, 9));
  return out;
}

/** A leafless shrub (a guess: a calafate-like one) with twigs that fan out and snow on top. ~0.6 high. */
export function buildShrub(): Tri[] {
  const rng = createSeededRng(401);
  const out: Tri[] = [];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + rng() * 0.3;
    const k = 0.5 + rng() * 0.5;
    out.push(...tube(at(0, 0.02, 0), at(Math.cos(a) * 0.28 * k, 0.35 + k * 0.25, Math.sin(a) * 0.28 * k), 0.016, 0.006, 4, i % 3 ? BROWN_DARK : RED_DARK, false, true));
  }
  out.push(...chunk(0, 0.5, 0, 0.4, 0.1, 0.4, 410, WHITE), ...snowMound(0, 0, 0.4, 0.38, 0.06, 411, 8));
  return out;
}

/**
 * A piece of the Beagle channel in winter (book p. 22: the bay freezes in winter), seen from
 * above and a bit from the side: a frozen sheet with cracks and a ridge of broken ice, a lead
 * of open water, a few floating chunks and a small iceberg (`ICEBERG_PEAKS_POLY` of icebergs.ts,
 * reused). A reconstruction: the shapes are not of a real bay. 3.4 x 0.4 x 2.4.
 */
export function buildFrozenBay(): Tri[] {
  const sheet = groundField(
    17,
    12,
    0.2,
    421,
    (u, v) => (u * u + v * v < 0.92 ? 0.03 : null),
    (u, v, _h, steep, noise) => {
      if (steep > 0.25) return RELIEF_ICE;
      if (u > 0.15 && u < 0.75 && v > -0.25 && v < 0.3) return OPEN_WATER;
      return noise > 0.78 ? ICE : noise > 0.3 ? ICE_BLUE : SEA_GREY;
    },
    0.05,
  );
  const out: Tri[] = [...sheet];
  // Cracks, a ridge of broken ice and floating chunks in the lead of open water.
  out.push(...rope([at(-1.4, 0.04, -0.5), at(-0.9, 0.04, -0.2), at(-0.5, 0.04, -0.35), at(0.0, 0.04, 0.1)], 0.01, 3, CRACK_DARK));
  out.push(...rope([at(-0.8, 0.04, 0.6), at(-0.4, 0.04, 0.45), at(-0.1, 0.04, 0.8)], 0.01, 3, CRACK_DARK));
  for (let i = 0; i < 6; i++) out.push(...chunk(-1.0 + i * 0.3, 0.07, 0.95 + 0.07 * Math.sin(i * 2), 0.26, 0.14, 0.2, 430 + i, i % 2 ? WHITE : ICE_BLUE));
  for (const [x, z, k] of [[0.55, 0.1, 440], [0.9, -0.1, 441], [0.7, 0.2, 442], [1.2, 0.0, 443]] as const) out.push(...chunk(x, 0.045, z, 0.16, 0.08, 0.14, k, WHITE));
  out.push(...shift(scaled(ICEBERG_PEAKS_POLY, 0.8), 0.95, 0.03, -0.15));
  return grounded(out);
}

/**
 * Improvised sled (book p. 22: the children go about in a sled made at home): five boards nailed
 * to two battens, the front ends bent up, and a rope to pull it, over snow. 2.2 x 0.25 x 1.0 with the rope.
 */
export function buildMakeshiftSled(): Tri[] {
  const out: Tri[] = [];
  const lengths = [1.0, 1.08, 1.04, 1.1, 0.98];
  for (let j = 0; j < 5; j++) {
    const z0 = -0.38 + j * 0.155;
    const z1 = z0 + 0.145;
    const half = lengths[j] / 2;
    out.push(...slab([at(-half, 0.12, z0), at(-half, 0.12, z1), at(half - 0.05, 0.12, z1), at(half - 0.05, 0.12, z0)], 0.035, j % 2 ? WOOD_LIGHT : WOOD, BROWN));
    out.push(...slab([at(half - 0.05, 0.12, z0), at(half - 0.05, 0.12, z1), at(half + 0.08, 0.22, z1), at(half + 0.08, 0.22, z0)], 0.035, j % 2 ? WOOD_LIGHT : WOOD, BROWN));
  }
  for (const x of [-0.32, 0.26]) {
    out.push(...block(x, 0.07, 0, 0.07, 0.07, 0.8, BROWN_DARK));
    for (const z of [-0.3, 0, 0.3]) out.push(...tube(at(x, 0.153, z), at(x, 0.168, z), 0.012, 0.012, 4, ZINC));
  }
  out.push(...rope([at(0.58, 0.22, -0.28), at(0.9, 0.12, -0.34), at(1.15, 0.03, -0.2), at(1.5, 0.012, -0.1)], 0.012, 4, CREAM));
  out.push(...rope([at(0.58, 0.22, 0.28), at(0.9, 0.12, 0.3), at(1.15, 0.03, -0.2)], 0.012, 4, CREAM));
  out.push(...snowMound(0, 0, 0.7, 0.5, 0.04, 450, 10), ...snowMound(1.2, -0.15, 0.3, 0.2, 0.025, 451, 7));
  return out;
}

/** Scale of the children against the person of ponchoPeople.ts (an illustration: no other model of person). */
export const CHILD_SCALE = 0.6;

/** A child (book p. 22): the existing person at `CHILD_SCALE` with a red parka. Feet stay on y = 0. */
export const buildChild = (pose: PersonPose): Tri[] => scaled(buildPonchoPerson(pose, 'red'), CHILD_SCALE);

// ---- Registry ----------------------------------------------------------------------------------

export const PONCHO_PROP2_IDS = [
  'icebreakerHull',
  'loadingRamp',
  'cargoCrates',
  'nunataks',
  'overturnedSled',
  'dogParachute',
  'rescueHelicopter',
  'supplyParachute',
  'touristSled',
  'townHouse',
  'lowFence',
  'lengaTree',
  'nireTree',
  'shrub',
  'frozenBay',
  'makeshiftSled',
] as const;

export type PonchoProp2Id = (typeof PONCHO_PROP2_IDS)[number];

export interface PonchoProp2 {
  readonly id: PonchoProp2Id;
  readonly label: string;
  readonly tris: readonly Tri[];
  /** Highest y of the faces. */
  readonly height: number;
  /** Measured extent [x, y, z] of the box that contains the faces (the test holds it to a box set by hand). */
  readonly size: readonly [number, number, number];
}

const BUILDERS: Readonly<Record<PonchoProp2Id, readonly [string, () => Tri[]]>> = {
  icebreakerHull: ['Costado de un rompehielos antiguo', buildIcebreakerHull],
  loadingRamp: ['Rampa de tablones al barco', buildLoadingRamp],
  cargoCrates: ['Cajones y bidón de carga', buildCargoCrates],
  nunataks: ['Nunataks de roca pelada', buildNunataks],
  overturnedSled: ['Trineo volcado al borde', buildOverturnedSled],
  dogParachute: ['Paracaídas para un perro', buildDogParachute],
  rescueHelicopter: ['Helicóptero con la puerta abierta', buildRescueHelicopter],
  supplyParachute: ['Cajas de víveres con paracaídas', buildSupplyParachute],
  touristSled: ['Trineo sin carga con banco', buildTouristSled],
  townHouse: ['Casa de ciudad de dos pisos', buildTownHouse],
  lowFence: ['Cerco bajo de jardín', buildLowFence],
  lengaTree: ['Árbol sin hojas (tipo lenga)', buildLengaTree],
  nireTree: ['Árbol torcido (tipo ñire)', buildNireTree],
  shrub: ['Arbusto sin hojas', buildShrub],
  frozenBay: ['Bahía helada con témpano', buildFrozenBay],
  makeshiftSled: ['Trineo improvisado de tablas', buildMakeshiftSled],
};

const extentOf = (tris: readonly Tri[]): [number, number, number] => {
  const axis = (k: 0 | 1 | 2) => {
    const v = tris.flatMap(([a, b, c]) => [a[k], b[k], c[k]]);
    return Math.max(...v) - Math.min(...v);
  };
  return [axis(0), axis(1), axis(2)];
};

const makeProp = (id: PonchoProp2Id): PonchoProp2 => {
  const [label, build] = BUILDERS[id];
  const tris = build();
  return { id, label, tris, height: Math.max(...tris.flatMap(([a, b, c]) => [a[1], b[1], c[1]])), size: extentOf(tris) };
};

/** Every model, built once. The test of detail (rule 30) walks this table. */
export const PONCHO_PROPS2: Readonly<Record<PonchoProp2Id, PonchoProp2>> = Object.fromEntries(PONCHO_PROP2_IDS.map((id) => [id, makeProp(id)])) as Record<PonchoProp2Id, PonchoProp2>;

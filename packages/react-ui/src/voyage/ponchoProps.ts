import { block, chunk, prism, quad, RELIEF_ICE, shift, type Tri, type Vec3 } from './lowPoly.ts';
import { VOXEL_PALETTE } from '../orcadas/stationModels.ts';
import { loftAlongX, lowestY, rope, slab, snowMound, thinTriangle, tube } from './ponchoShapes.ts';
import { buildBaseHut, buildEsperanzaBase, ESPERANZA_CLEARINGS } from './ponchoBase.ts';

/**
 * Low-poly props of Poncho's stops (rule 30, docs/diseno/estilo-voxel.md): the objects of the
 * living scenes, next to the people of ponchoPeople.ts. All are ILLUSTRATIONS: shapes and colors
 * are plausible, not measured, and only what the book says is claimed (see each prop). Nothing
 * here is a fire: the book does not mention one.
 *
 * ## Hand-off for the scene (what to import and how to draw)
 *
 * Units are model units: a standing person (ponchoPeople.ts) is ~1.0 tall. Every prop rests on
 * y = 0 (`lowestY === 0`), is centered on x = 0 and z = 0, and has its front on +z when it is a
 * building (tent, tunnel) and on +x when it has a direction (sled, plane, lines, poles). Dogs are
 * the block models of ponchoModels.ts (`poncho-dog`, ~1 unit long): scale them ~0.55 next to people.
 *
 * Exports of this file (all pure, deterministic, built once and cached in `PONCHO_PROPS`):
 * - `PONCHO_PROPS: Record<PonchoPropId, PonchoProp>`: `{ id, label, tris, height, size }` with
 *   `tris` the faces (colors are `VOXEL_PALETTE` or `RELIEF_ICE`), `height` the highest y and
 *   `size = [x, y, z]` the measured extent of the box that contains it.
 * - `PONCHO_PROP_IDS`: the ids, in a fixed order.
 * - `buildTent()`, `buildShovel()`, `buildStaffAndPick()`, `buildStakeAndPick()`,
 *   `buildSlalomPoles()`, `buildFlaggedCanes()`, `buildHaulLine()`, `buildCrevasseBridge()`,
 *   `buildCrashedPlane()`, `buildIceTunnelEntrance()`, `buildNansenSled()`: each returns fresh faces.
 * - `HAMMER_STAKE_AT`: where the stake sits (person's frame) so the left hand of `hammerPose`
 *   holds its top: put the `stakeAndPick` prop at `[x, 0, z]` of it, person at the origin.
 *
 * To draw: `resolveRelief(tris, worldY)` first (it paints the faces whose color is `RELIEF_ICE`
 * as the map relief), then `buildPolyGeometry(tris)` once per prop (cache the geometry) and
 * `vehicleMaterial`. Heights of reference (model units): tent 0.8, shovel 0.83, staffAndPick 1.05,
 * stakeAndPick 0.39, slalomPoles 1.0 (2.4 long), flaggedCanes 0.95 (1.0 long), haulLine 0.06 (2.4
 * long), crevasseBridge 0.12 (1.9 long), crashedPlane 1.75 (3.5 long, 4.3 across), iceTunnelEntrance 0.85
 * (1.8 wide), nansenSled 0.87 (2.2 long). Scale them together with the people.
 *
 * People are drawn frame by frame by `buildPonchoPerson(pose, variant)` (ponchoPeople.ts): the
 * parts and the colors are cached per variant, and each frame only rotates and shifts ~1200
 * faces. Cheaper: keep `ponchoPersonParts(variant)` as five geometries on pivots and set the
 * angles of `ponchoPose(action, phase)` as rotations about z, like orcadas/LifeDetails.tsx, adding
 * `ponchoPoseLift(pose)` to the height of the group. Footprints: `ponchoFootprints`.
 *
 * Detail test: `test/ponchoProps.test.ts` walks `PONCHO_PROPS` (rule 30: POLY_MIN_TRIS faces and
 * POLY_MIN_COLORS colors, base on y = 0, finite faces, extent inside a box set by hand). A new prop is
 * registered by adding it to `PONCHO_PROPS`, so the test covers it.
 */

const { WHITE, ICE, ICE_BLUE, ORANGE, RED, RED_DARK, CREAM, WOOD, WOOD_LIGHT, BROWN, BROWN_DARK, ZINC, BLACK, SEA_GREY, NAVY_ROOF, WINDOW_DAY } = VOXEL_PALETTE;

// Colors of the props that the station palette does not have (rule 30, 5: named constants).
const TENT_SEAM = 0xb86a1f;
const CREVASSE_DARK = 0x111b26;
const PLANE_BODY = 0xf3f1ea;
const PLANE_TRIM = 0xb8452a;
const TUNNEL_DARK = 0x16222e;
const SLED_RUNNER = 0x5e4630;

const at = (x: number, y: number, z: number): Vec3 => [x, y, z];

// ---- Tent -------------------------------------------------------------------------------------

/**
 * Tent of cloth (the book speaks of «el agujero de las carpas», p. 10): a ridge tent along z, door
 * on the front (+z) with a flap half rolled up and a zipper, a pole in front, guy lines to stakes
 * and snow heaped round the foot. Colors are a guess. Tent 0.84 wide, 1.2 long, 0.8 high; with guy lines and snow, 1.6 x 1.95.
 */
export function buildTent(): Tri[] {
  const w = 0.42;
  const h = 0.62;
  const zf = 0.6;
  const zb = -0.6;
  const sag = 0.014;
  const out: Tri[] = [];
  for (const s of [1, -1]) {
    const eaveF = at(s * w, 0.02, zf);
    const eaveB = at(s * w, 0.02, zb);
    const midF = at(s * (w * 0.5 + sag), h * 0.5, zf);
    const midB = at(s * (w * 0.5 + sag), h * 0.5, zb);
    const ridgeF = at(0, h, zf);
    const ridgeB = at(0, h, zb);
    // Seen from outside, the +x side runs eave front -> eave back -> mid back -> mid front.
    if (s === 1) {
      out.push(...quad(eaveF, eaveB, midB, midF, ORANGE), ...quad(midF, midB, ridgeB, ridgeF, TENT_SEAM));
    } else {
      out.push(...quad(eaveB, eaveF, midF, midB, ORANGE), ...quad(midB, midF, ridgeF, ridgeB, TENT_SEAM));
    }
  }
  // Back gable and front gable (low band, then the triangle above it).
  const gable = (z: number, front: boolean): Tri[] => {
    const l = at(-w, 0.02, z);
    const r = at(w, 0.02, z);
    const ml = at(-(w * 0.5 + sag), h * 0.5, z);
    const mr = at(w * 0.5 + sag, h * 0.5, z);
    const top = at(0, h, z);
    return front
      ? [...quad(l, r, mr, ml, ORANGE), [ml, mr, top, TENT_SEAM]]
      : [...quad(r, l, ml, mr, ORANGE), [mr, ml, top, TENT_SEAM]];
  };
  out.push(...gable(zf, true), ...gable(zb, false));
  // Door: dark opening, the left flap (rolled up) and a zipper line along the free edge.
  const dz = zf + 0.004;
  out.push([at(-0.17, 0.02, dz), at(0.17, 0.02, dz), at(0, 0.4, dz), BLACK]);
  out.push([at(-0.17, 0.02, dz + 0.004), at(0, 0.02, dz + 0.004), at(0, 0.4, dz + 0.004), RED_DARK]);
  out.push(...quad(at(-0.006, 0.02, dz + 0.008), at(0.006, 0.02, dz + 0.008), at(0.006, 0.4, dz + 0.008), at(-0.006, 0.4, dz + 0.008), ZINC));
  // Front pole with a cap, and the guy lines (the «tensores») from it and from the side seams.
  const poleTop = at(0, h + 0.16, zf + 0.07);
  out.push(...tube(at(0, 0, zf + 0.07), poleTop, 0.018, 0.014, 6, WOOD), ...tube(at(0, h + 0.16, zf + 0.07), at(0, h + 0.2, zf + 0.07), 0.02, 0.006, 6, ZINC, false, true));
  const guys: [Vec3, Vec3][] = [
    [poleTop, at(0.5, 0.02, 1.05)],
    [poleTop, at(-0.5, 0.02, 1.05)],
    [at(w * 0.5 + sag, h * 0.5, zf - 0.05), at(0.78, 0.02, 0.55)],
    [at(-(w * 0.5 + sag), h * 0.5, zf - 0.05), at(-0.78, 0.02, 0.55)],
    [at(w * 0.5 + sag, h * 0.5, zb + 0.05), at(0.78, 0.02, -0.55)],
    [at(-(w * 0.5 + sag), h * 0.5, zb + 0.05), at(-0.78, 0.02, -0.55)],
  ];
  for (const [a, b] of guys) {
    out.push(...rope([a, b], 0.007, 4, CREAM));
    out.push(...tube(at(b[0], 0.012, b[2]), at(b[0] * 1.02, 0.09, b[2] * 1.02), 0.012, 0.012, 5, ZINC));
  }
  // Snow heaped round the foot, thicker on the windward side (-x), and the trodden step at the door.
  out.push(...snowMound(0, 0, 0.7, 0.95, 0.06, 31, 12), ...snowMound(-0.3, -0.05, 0.4, 0.8, 0.12, 32, 8), ...snowMound(0, 0.8, 0.3, 0.2, 0.03, 33, 7));
  return out;
}

// ---- Hand tools ---------------------------------------------------------------------------------

/** Shovel (book p. 10, digging): a long handle with a grip, a metal blade stuck in a heap of snow. 0.8 high. */
export function buildShovel(): Tri[] {
  const lean = (k: number): Vec3 => at(-0.2 * k, 0.03 + 0.98 * k, 0.04 * k);
  const tip = at(0.0, 0.03, 0);
  const bladeTop = lean(0.2);
  const out: Tri[] = [];
  out.push(...slab([at(tip[0], tip[1], -0.05), at(tip[0], tip[1], 0.05), at(bladeTop[0], bladeTop[1], 0.085), at(bladeTop[0], bladeTop[1], -0.085)], 0.014, ZINC, SEA_GREY));
  out.push(...tube(bladeTop, lean(0.27), 0.022, 0.016, 6, SEA_GREY, true, false));
  out.push(...tube(lean(0.25), lean(0.8), 0.014, 0.014, 6, WOOD_LIGHT));
  const grip = lean(0.8);
  out.push(...tube(at(grip[0], grip[1], grip[2] - 0.07), at(grip[0], grip[1], grip[2] + 0.07), 0.016, 0.016, 6, BROWN_DARK));
  out.push(...snowMound(0, 0, 0.26, 0.22, 0.05, 41, 9));
  out.push(...chunk(0.2, 0.025, 0.1, 0.1, 0.05, 0.08, 42, WHITE), ...chunk(0.3, 0.02, -0.08, 0.08, 0.04, 0.06, 43, ICE));
  return out;
}

/** Stick and ice pick (book p. 12): a long staff and an ice axe, both planted in a heap of snow. 1.05 high. */
export function buildStaffAndPick(): Tri[] {
  const out: Tri[] = [];
  // The staff leans a little and has a metal tip and a wrist loop.
  const staffTop = at(-0.08, 1.05, -0.14);
  out.push(...tube(at(0.0, 0.03, -0.12), staffTop, 0.016, 0.014, 6, WOOD));
  out.push(...tube(at(0.0, 0.03, -0.12), at(-0.006, 0.13, -0.122), 0.021, 0.021, 6, ZINC));
  out.push(...tube(at(-0.07, 0.95, -0.14), at(-0.08, 1.02, -0.14), 0.02, 0.02, 6, BROWN_DARK));
  out.push(...rope([at(-0.09, 0.9, -0.14), at(-0.14, 0.82, -0.12), at(-0.12, 0.78, -0.09), at(-0.085, 0.86, -0.12)], 0.006, 4, CREAM));
  // The ice axe: shaft, steel head with pick and adze, spike in the snow.
  const axeTop = at(0.06, 0.72, 0.13);
  out.push(...tube(at(0.0, 0.03, 0.13), axeTop, 0.014, 0.014, 6, WOOD_LIGHT));
  out.push(...tube(at(-0.004, 0.03, 0.13), at(0, 0.006, 0.13), 0.004, 0.012, 6, ZINC, true, false));
  out.push(...slab([at(0.02, 0.72, 0.13), at(0.2, 0.7, 0.13), at(0.2, 0.678, 0.13), at(0.02, 0.69, 0.13)], 0.03, ZINC));
  out.push(...slab([at(0.2, 0.7, 0.13), at(0.255, 0.65, 0.13), at(0.25, 0.64, 0.13), at(0.2, 0.678, 0.13)], 0.022, ZINC));
  out.push(...slab([at(0.03, 0.72, 0.13), at(0.02, 0.75, 0.13), at(-0.07, 0.74, 0.13), at(-0.07, 0.71, 0.13)], 0.04, SEA_GREY));
  out.push(...snowMound(0, 0, 0.42, 0.34, 0.07, 51, 10));
  out.push(...chunk(0.18, 0.02, -0.1, 0.09, 0.04, 0.07, 52, ICE_BLUE));
  return out;
}

/**
 * Stake driven into the ice (book p. 12, they hammer in the stakes): a wooden stake with a metal
 * band and a split top, ice chips round the foot and a line tied to it. 0.4 high.
 */
export function buildStakeAndPick(): Tri[] {
  const out: Tri[] = [];
  out.push(...tube(at(0, 0.03, 0), at(0.004, 0.37, 0), 0.034, 0.03, 6, WOOD));
  out.push(...tube(at(0.004, 0.32, 0), at(0.004, 0.37, 0), 0.037, 0.037, 6, ZINC, false, false));
  out.push(...tube(at(0.004, 0.37, 0), at(0.004, 0.385, 0), 0.026, 0.02, 6, BROWN, true, true));
  // A line tied round the stake and trailing over the snow.
  out.push(...rope([at(0.045, 0.2, 0), at(0.02, 0.22, 0.04), at(-0.03, 0.2, 0.025), at(-0.03, 0.19, -0.03), at(0.02, 0.2, -0.04), at(0.04, 0.2, 0)], 0.007, 4, CREAM));
  out.push(...rope([at(0.04, 0.2, -0.04), at(0.12, 0.05, -0.2), at(0.22, 0.012, -0.32), at(0.36, 0.01, -0.36)], 0.007, 4, CREAM));
  out.push(...snowMound(0, 0, 0.24, 0.22, 0.045, 61, 9));
  for (const [x, z, k] of [[0.12, 0.1, 62], [-0.12, 0.08, 63], [0.08, -0.14, 64], [-0.1, -0.1, 65]] as const) {
    out.push(...chunk(x, 0.022, z, 0.07, 0.044, 0.06, k, k % 2 ? ICE_BLUE : WHITE));
  }
  return out;
}

/** Where `stakeAndPick` stands, in the frame of the person (at the origin, facing +x), for `hammerPose`. */
export const HAMMER_STAKE_AT: readonly [number, number] = [0.39, -0.048];

// ---- Lines of poles ---------------------------------------------------------------------------

/**
 * A row of five poles with pennants zigzagging over the snow (book p. 9 and the first epigraph:
 * telephone poles, a slalom). 2.4 long along x, 1.0 high. The pennant colors are a guess.
 */
export function buildSlalomPoles(): Tri[] {
  const out: Tri[] = [];
  for (let i = 0; i < 5; i++) {
    const x = -1.1 + i * 0.55;
    const z = i % 2 ? 0.14 : -0.14;
    const tilt = (i - 2) * 0.012;
    const top = at(x + tilt, 1.0, z);
    out.push(...tube(at(x, 0.03, z), top, 0.022, 0.018, 6, WOOD));
    out.push(...tube(at(x + tilt * 0.9, 0.86, z), top, 0.026, 0.026, 6, BROWN_DARK, false, true));
    out.push(...thinTriangle(at(x + tilt, 0.97, z), at(x + tilt, 0.8, z), at(x + tilt + 0.2, 0.87, z + 0.03), 0.008, i % 2 ? NAVY_ROOF : RED));
    out.push(...snowMound(x, z, 0.16, 0.14, 0.04, 70 + i, 8));
  }
  return out;
}

/** Three canes stuck in the snow, each with a streamer (book p. 20). 1.0 long, 0.95 high. */
export function buildFlaggedCanes(): Tri[] {
  const out: Tri[] = [];
  const colors = [RED, ORANGE, RED];
  for (let i = 0; i < 3; i++) {
    const x = (i - 1) * 0.5;
    const z = i === 1 ? 0.06 : -0.04;
    const height = [0.9, 0.82, 0.95][i];
    const lean = (i - 1) * 0.04;
    const top = at(x + lean, height, z);
    out.push(...tube(at(x, 0.03, z), top, 0.012, 0.009, 5, WOOD_LIGHT));
    // The streamer waves in two pieces from the top of the cane.
    const a = at(x + lean, height - 0.02, z);
    const b = at(x + lean, height - 0.13, z);
    out.push(...slab([a, at(x + lean + 0.1, height - 0.015, z + 0.02), at(x + lean + 0.1, height - 0.11, z + 0.02), b], 0.006, colors[i], CREAM));
    out.push(...slab([at(x + lean + 0.1, height - 0.015, z + 0.02), at(x + lean + 0.2, height - 0.03, z - 0.01), at(x + lean + 0.2, height - 0.1, z - 0.01), at(x + lean + 0.1, height - 0.11, z + 0.02)], 0.006, colors[i], CREAM));
    out.push(...snowMound(x, z, 0.14, 0.12, 0.035, 80 + i, 8));
  }
  return out;
}

/**
 * Harness and long line laid on the snow (book p. 9, tied at the waist by a long line): a belt
 * ring with its buckle and a rope that runs away from it with gentle curves. 2.3 long, 0.08 high.
 */
export function buildHaulLine(): Tri[] {
  const out: Tri[] = [];
  const belt = Array.from({ length: 9 }, (_, i): Vec3 => {
    const a = (i / 8) * Math.PI * 2;
    return at(1.0 + Math.cos(a) * 0.17, 0.026, Math.sin(a) * 0.15);
  });
  out.push(...rope(belt, 0.026, 5, BROWN_DARK));
  out.push(...block(1.17, 0.032, 0, 0.05, 0.05, 0.07, ZINC));
  const line = Array.from({ length: 17 }, (_, i): Vec3 => {
    const t = i / 16;
    return at(0.83 - t * 1.95, 0.012, Math.sin(t * Math.PI * 2.2) * 0.1 * (1 - 0.4 * t));
  });
  out.push(...rope(line, 0.012, 4, CREAM));
  out.push(...tube(at(-1.12, 0.026, line[16][2]), at(-1.18, 0.03, line[16][2] + 0.04), 0.02, 0.02, 5, BROWN, true, true));
  for (const [x, z, s] of [[0.5, 0.0, 90], [-0.1, 0.07, 91], [-0.7, -0.03, 92], [1.0, 0.0, 93]] as const) {
    out.push(...snowMound(x, z, 0.1, 0.08, 0.018, s, 6));
  }
  return out;
}

// ---- Crevasse -----------------------------------------------------------------------------------

/**
 * A crevasse with a bridge of snow (book p. 6 and 12): a dark slit in the ice, covered by a thin
 * lid of snow that has broken away at one end and shows the dark. The floor of the slit is on
 * y = 0 so the model does not sink into the map; the depth is told by its dark color. 1.8 long.
 */
export function buildCrevasseBridge(): Tri[] {
  const n = 18;
  const lip = 0.1;
  const edge = (i: number, rx: number, rz: number, y: number, jit = 0): Vec3 => {
    const a = -(i / n) * Math.PI * 2;
    const j = 1 + jit * Math.sin(i * 2.3 + 1);
    return at(Math.cos(a) * rx * j, y, Math.sin(a) * rz * j);
  };
  const out: Tri[] = [];
  for (let i = 0; i < n; i++) {
    const o = (k: number) => edge(k % n, 0.92, 0.42, 0, 0.08);
    const l = (k: number) => edge(k % n, 0.76, 0.15, lip, 0.05);
    const f = (k: number) => edge(k % n, 0.7, 0.07, 0, 0.03);
    out.push(...quad(o(i), o(i + 1), l(i + 1), l(i), i % 3 ? RELIEF_ICE : WHITE));
    // Walls drop from the lip into the slit and face its axis.
    out.push(...quad(l(i), f(i), f(i + 1), l(i + 1), i % 2 ? ICE_BLUE : CREVASSE_DARK));
    out.push([at(0, 0, 0), f(i), f(i + 1), CREVASSE_DARK]);
  }
  // The lid: a thin plate of snow over the slit from the far end up to a ragged broken edge.
  const lid: [number, number][] = [
    [-0.78, 0.0], [-0.55, 0.2], [-0.2, 0.22], [0.12, 0.2], [0.3, 0.17], [0.4, 0.07], [0.3, 0.02], [0.43, -0.06], [0.33, -0.16], [0.1, -0.2], [-0.25, -0.22], [-0.55, -0.2],
  ];
  out.push(...prism(lid, lip - 0.035, lip + 0.016, (i) => (i % 2 ? ICE : WHITE), WHITE));
  // Chunks of the lid that fell, lying on the dark floor, and a ledge of ice at the break.
  out.push(...chunk(0.5, 0.03, 0.0, 0.12, 0.06, 0.08, 101, WHITE), ...chunk(0.58, 0.025, 0.05, 0.08, 0.05, 0.07, 102, ICE));
  return out;
}

// ---- Crashed plane ------------------------------------------------------------------------------

/** Rotation of the faces about the three axes, in that order (x, then y, then z), about the origin. */
function pose(tris: readonly Tri[], rx: number, ry: number, rz: number): Tri[] {
  const r = ([x, y, z]: Vec3): Vec3 => {
    let [a, b, c] = [x, y, z];
    [b, c] = [b * Math.cos(rx) - c * Math.sin(rx), b * Math.sin(rx) + c * Math.cos(rx)];
    [a, c] = [a * Math.cos(ry) + c * Math.sin(ry), -a * Math.sin(ry) + c * Math.cos(ry)];
    [a, b] = [a * Math.cos(rz) - b * Math.sin(rz), a * Math.sin(rz) + b * Math.cos(rz)];
    return [a, b, c];
  };
  return tris.map(([p, q, s, col]) => [r(p), r(q), r(s), col]);
}

/**
 * A small high-wing plane on skis, slewed and tipped in the snow (book p. 17: a Cessna crashed;
 * the book gives no more, so its colors and the shape of the damage are an illustration): the
 * fuselage with cabin windows, a wing and struts, tail, propeller with a bent blade, two skis,
 * the whole of it tilted, with snow piled where it touches. 3.6 long, 4.4 across, ~1.7 high.
 */
export function buildCrashedPlane(): Tri[] {
  const body = loftAlongX(
    [
      { x: 1.62, cy: 0.74, ry: 0.06, rz: 0.06 },
      { x: 1.5, cy: 0.74, ry: 0.2, rz: 0.2 },
      { x: 1.15, cy: 0.76, ry: 0.27, rz: 0.26 },
      { x: 0.5, cy: 0.8, ry: 0.32, rz: 0.29 },
      { x: -0.25, cy: 0.8, ry: 0.28, rz: 0.26 },
      { x: -1.0, cy: 0.82, ry: 0.19, rz: 0.17 },
      { x: -1.75, cy: 0.85, ry: 0.07, rz: 0.06 },
    ],
    8,
    (i, band) => (band === 0 ? BLACK : i === 1 || i === 2 ? PLANE_TRIM : PLANE_BODY),
  );
  const out: Tri[] = [...body];
  // Cabin windows on both sides and the windshield.
  for (const s of [1, -1]) {
    out.push(...slab([at(0.85, 0.86, s * 0.275), at(0.1, 0.9, s * 0.29), at(0.1, 1.04, s * 0.27), at(0.8, 1.0, s * 0.255)], 0.02, WINDOW_DAY));
  }
  out.push(...slab([at(1.0, 0.95, -0.2), at(1.0, 0.95, 0.2), at(0.78, 1.1, 0.19), at(0.78, 1.1, -0.19)], 0.02, WINDOW_DAY));
  // Wing (high), struts, tail, propeller.
  for (const s of [1, -1]) {
    out.push(...slab([at(0.65, 1.12, 0), at(-0.05, 1.12, 0), at(0.0, 1.08, s * 2.2), at(0.5, 1.08, s * 2.2)], 0.07, PLANE_BODY, WHITE));
    out.push(...slab([at(0.5, 1.08, s * 2.2), at(0.0, 1.08, s * 2.2), at(0.0, 1.075, s * 2.26), at(0.5, 1.075, s * 2.26)], 0.075, PLANE_TRIM));
    out.push(...tube(at(0.25, 0.58, s * 0.24), at(0.25, 1.08, s * 1.1), 0.02, 0.02, 5, ZINC));
    out.push(...slab([at(-1.35, 0.92, 0), at(-1.7, 0.92, 0), at(-1.72, 0.92, s * 0.75), at(-1.52, 0.92, s * 0.75)], 0.04, PLANE_BODY));
  }
  out.push(...slab([at(-1.15, 0.9, 0), at(-1.7, 0.9, 0), at(-1.82, 1.42, 0), at(-1.5, 1.45, 0)], 0.05, PLANE_BODY, PLANE_BODY));
  out.push(...slab([at(-1.45, 1.2, 0), at(-1.72, 1.17, 0), at(-1.78, 1.38, 0), at(-1.52, 1.4, 0)], 0.055, PLANE_TRIM));
  out.push(...slab([at(1.66, 0.76, -0.04), at(1.66, 0.76, 0.04), at(1.7, 1.28, 0.03), at(1.7, 1.28, -0.03)], 0.016, BLACK));
  out.push(...slab([at(1.66, 0.72, 0.04), at(1.66, 0.72, -0.04), at(1.62, 0.3, -0.03), at(1.62, 0.3, 0.03)], 0.016, BLACK));
  // Skis on short struts: each a plate with an upturned tip.
  for (const s of [1, -1]) {
    out.push(...tube(at(0.55, 0.55, s * 0.17), at(0.5, 0.12, s * 0.46), 0.022, 0.022, 5, ZINC));
    out.push(...tube(at(-0.1, 0.55, s * 0.17), at(0.0, 0.12, s * 0.46), 0.022, 0.022, 5, ZINC));
    out.push(...slab([at(-0.15, 0.08, s * 0.38), at(0.95, 0.08, s * 0.38), at(0.95, 0.08, s * 0.54), at(-0.15, 0.08, s * 0.54)], 0.045, WOOD_LIGHT, SLED_RUNNER));
    out.push(...slab([at(0.95, 0.08, s * 0.38), at(1.16, 0.2, s * 0.38), at(1.16, 0.2, s * 0.54), at(0.95, 0.08, s * 0.54)], 0.045, WOOD_LIGHT, SLED_RUNNER));
  }
  // Slewed and tipped: a wing down, the nose a little low and turned off its line.
  const tilted = pose(out, 0.26, -0.3, -0.09);
  const floor = lowestY(tilted);
  const grounded = shift(tilted, 0, -floor, 0);
  // Snow banked where the lowest parts touch the ground.
  const low = grounded.flatMap(([a, b, c]) => [a, b, c]).filter((p) => p[1] < 0.06);
  const seen: Vec3[] = [];
  for (const p of low) if (seen.every((q) => Math.hypot(q[0] - p[0], q[2] - p[2]) > 0.9)) seen.push(p);
  const banks = seen.flatMap((p, i) => snowMound(p[0], p[2], 0.6, 0.45, 0.14, 110 + i, 9));
  return [...grounded, ...banks];
}

// ---- Ice tunnel -----------------------------------------------------------------------------------

/**
 * Mouth of a tunnel dug into the snow (book p. 14 and 15: the dogs winter in a tunnel under the
 * snow): a loaf of snow with an arched opening on the front (+z), the dark inside, blocks of ice
 * cut round the rim and a trodden apron before it. 1.7 wide, 1.4 deep, 0.85 high.
 */
export function buildIceTunnelEntrance(): Tri[] {
  const n = 10;
  const arch = (z: number, rx: number, ry: number, seed = 0): Vec3[] =>
    Array.from({ length: n + 1 }, (_, i) => {
      const a = (i / n) * Math.PI;
      const j = 1 + 0.05 * Math.sin(i * 1.9 + seed + z * 7);
      return at(Math.cos(a) * rx * j, Math.sin(a) * ry * j, z);
    });
  const out: Tri[] = [];
  const hull = [arch(0.55, 0.85, 0.62, 1), arch(0.1, 0.9, 0.85, 2), arch(-0.4, 0.78, 0.7, 3), arch(-0.9, 0.45, 0.32, 4)];
  for (let k = 0; k < hull.length - 1; k++) {
    for (let i = 0; i < n; i++) {
      const c = k === 0 && i % 3 === 0 ? RELIEF_ICE : i % 2 ? WHITE : ICE;
      out.push(...quad(hull[k][i], hull[k + 1][i], hull[k + 1][i + 1], hull[k][i + 1], k === hull.length - 2 ? RELIEF_ICE : c));
    }
  }
  const back = hull[hull.length - 1];
  for (let i = 0; i < n; i++) out.push([at(0, 0, back[0][2]), back[i + 1], back[i], RELIEF_ICE]);
  // The front wall, round the opening, and the dark inside of the tunnel.
  const rim = arch(0.55, 0.36, 0.5);
  const rimBack = arch(-0.25, 0.3, 0.44);
  for (let i = 0; i < n; i++) {
    out.push(...quad(hull[0][i], hull[0][i + 1], rim[i + 1], rim[i], i % 2 ? ICE : WHITE));
    out.push(...quad(rim[i], rim[i + 1], rimBack[i + 1], rimBack[i], i % 2 ? TUNNEL_DARK : ICE_BLUE));
    out.push([at(0, 0, -0.25), rimBack[i], rimBack[i + 1], BLACK]);
  }
  out.push(...quad(at(-0.36, 0, 0.55), at(0.36, 0, 0.55), at(0.3, 0, -0.25), at(-0.3, 0, -0.25), ICE_BLUE));
  // Blocks of ice cut and set round the rim, and the apron in front.
  for (const [t, size] of [[0.1, 0.13], [0.3, 0.11], [0.5, 0.12], [0.7, 0.11], [0.9, 0.13]] as const) {
    const a = t * Math.PI;
    out.push(...block(Math.cos(a) * 0.47, Math.sin(a) * 0.6 + size / 2 - 0.02 * (1 - Math.sin(a)), 0.57, size, size, 0.08, t > 0.4 && t < 0.6 ? ICE_BLUE : WHITE, ICE));
  }
  out.push(...snowMound(0, 0.85, 0.6, 0.38, 0.06, 120, 10), ...snowMound(-0.55, 0.62, 0.3, 0.2, 0.08, 121, 7), ...snowMound(0.6, 0.68, 0.28, 0.22, 0.07, 122, 7));
  return out;
}

// ---- Sled -----------------------------------------------------------------------------------------

/**
 * Nansen sled alone (as the voxel one of ponchoModels.ts, in low-poly and for people's scale):
 * two runners with curled tips, stanchions, a slatted basket with rails, lashing, a tow bridle at
 * the front (+x) and a push bow at the back. 2.2 long with bridle and snow, 0.5 wide between runners, 0.87 high; the bow is at hand height.
 */
export function buildNansenSled(): Tri[] {
  const out: Tri[] = [];
  const xs = [-0.75, -0.3, 0.15, 0.55];
  for (const s of [1, -1]) {
    const z = s * 0.24;
    out.push(...block(-0.12, 0.028, z, 1.5, 0.056, 0.06, SLED_RUNNER, WOOD));
    out.push(...slab([at(0.62, 0.028, z - 0.03), at(0.62, 0.028, z + 0.03), at(0.86, 0.17, z + 0.03), at(0.86, 0.17, z - 0.03)], 0.05, SLED_RUNNER, SLED_RUNNER));
    out.push(...slab([at(0.86, 0.17, z - 0.03), at(0.86, 0.17, z + 0.03), at(0.9, 0.3, z + 0.03), at(0.9, 0.3, z - 0.03)], 0.04, WOOD));
    for (const x of xs) out.push(...tube(at(x, 0.05, z), at(x, 0.2, z), 0.02, 0.02, 4, WOOD));
    out.push(...tube(at(-0.8, 0.27, z), at(0.62, 0.27, z), 0.014, 0.014, 4, WOOD_LIGHT));
  }
  // The slatted basket.
  for (let i = 0; i < 8; i++) out.push(...block(-0.78 + i * 0.2, 0.215, 0, 0.14, 0.03, 0.52, i % 2 ? WOOD : WOOD_LIGHT));
  // Lashing across the basket and the sides, in rope.
  for (const x of [-0.5, 0.0, 0.4]) {
    out.push(...rope([at(x, 0.24, -0.26), at(x, 0.24, 0.26)], 0.008, 4, CREAM));
    out.push(...rope([at(x, 0.2, 0.26), at(x, 0.27, 0.24)], 0.008, 4, CREAM));
  }
  // Push bow at the back: two uprights leaning back and a bar across.
  for (const s of [1, -1]) out.push(...tube(at(-0.8, 0.2, s * 0.22), at(-0.98, 0.85, s * 0.22), 0.022, 0.02, 5, WOOD));
  out.push(...tube(at(-0.98, 0.85, -0.25), at(-0.98, 0.85, 0.25), 0.024, 0.024, 6, BROWN_DARK));
  // Tow bridle: two lines from the front stanchions that meet at a ring.
  out.push(...rope([at(0.55, 0.2, 0.24), at(0.95, 0.12, 0.0)], 0.01, 4, BROWN), ...rope([at(0.55, 0.2, -0.24), at(0.95, 0.12, 0.0)], 0.01, 4, BROWN));
  out.push(...tube(at(0.95, 0.12, -0.03), at(0.95, 0.12, 0.03), 0.03, 0.03, 8, ZINC));
  out.push(...snowMound(0.95, 0.0, 0.2, 0.16, 0.03, 130, 7), ...snowMound(-0.9, 0.0, 0.2, 0.34, 0.03, 131, 7));
  return out;
}

// ---- Registry -----------------------------------------------------------------------------------

export const PONCHO_PROP_IDS = [
  'tent',
  'shovel',
  'staffAndPick',
  'stakeAndPick',
  'slalomPoles',
  'flaggedCanes',
  'haulLine',
  'crevasseBridge',
  'crashedPlane',
  'iceTunnelEntrance',
  'nansenSled',
  'baseHut',
  'baseEsperanza',
] as const;

export type PonchoPropId = (typeof PONCHO_PROP_IDS)[number];

export interface PonchoProp {
  readonly id: PonchoPropId;
  readonly label: string;
  readonly tris: readonly Tri[];
  /** Highest y of the faces. */
  readonly height: number;
  /** Measured extent [x, y, z] of the box that contains the faces (the test holds it to a box set by hand). */
  readonly size: readonly [number, number, number];
  /** Circles (x, z, radius) of ground it takes, in its own frame, when its own radius in the scene is only a point (the base). */
  readonly clearings: readonly (readonly [number, number, number])[];
}

const BUILDERS: Readonly<Record<PonchoPropId, readonly [string, () => Tri[], (readonly (readonly [number, number, number])[])?]>> = {
  tent: ['Carpa de tela', buildTent],
  shovel: ['Pala', buildShovel],
  staffAndPick: ['Bastón y piqueta', buildStaffAndPick],
  stakeAndPick: ['Estaca clavada en el hielo', buildStakeAndPick],
  slalomPoles: ['Postes de slalom', buildSlalomPoles],
  flaggedCanes: ['Cañas con banderolas', buildFlaggedCanes],
  haulLine: ['Cincha con tiradera', buildHaulLine],
  crevasseBridge: ['Grieta con puente de nieve', buildCrevasseBridge],
  crashedPlane: ['Avioncito accidentado en la nieve', buildCrashedPlane],
  iceTunnelEntrance: ['Entrada de un túnel de hielo', buildIceTunnelEntrance],
  nansenSled: ['Trineo Nansen', buildNansenSled],
  baseHut: ['Casilla baja de la base', buildBaseHut],
  baseEsperanza: ['Base Esperanza: casa principal, contenedor con la bandera, muelle, casas y rocas', buildEsperanzaBase, ESPERANZA_CLEARINGS],
};

const extentOf = (tris: readonly Tri[]): [number, number, number] => {
  const axis = (k: 0 | 1 | 2) => {
    const v = tris.flatMap(([a, b, c]) => [a[k], b[k], c[k]]);
    return Math.max(...v) - Math.min(...v);
  };
  return [axis(0), axis(1), axis(2)];
};

const makeProp = (id: PonchoPropId): PonchoProp => {
  const [label, build, clearings = []] = BUILDERS[id];
  const tris = build();
  return { id, label, tris, height: Math.max(...tris.flatMap(([a, b, c]) => [a[1], b[1], c[1]])), size: extentOf(tris), clearings };
};

/** Every prop, built once. The test of detail (rule 30) walks this table. */
export const PONCHO_PROPS: Readonly<Record<PonchoPropId, PonchoProp>> = {
  tent: makeProp('tent'),
  shovel: makeProp('shovel'),
  staffAndPick: makeProp('staffAndPick'),
  stakeAndPick: makeProp('stakeAndPick'),
  slalomPoles: makeProp('slalomPoles'),
  flaggedCanes: makeProp('flaggedCanes'),
  haulLine: makeProp('haulLine'),
  crevasseBridge: makeProp('crevasseBridge'),
  crashedPlane: makeProp('crashedPlane'),
  iceTunnelEntrance: makeProp('iceTunnelEntrance'),
  nansenSled: makeProp('nansenSled'),
  baseHut: makeProp('baseHut'),
  baseEsperanza: makeProp('baseEsperanza'),
};

import { block, extrude, shift, turn, type Tri } from './lowPoly.ts';
import { snowMound, tube } from './ponchoShapes.ts';
import { VOXEL_PALETTE } from '../orcadas/stationModels.ts';

/**
 * The Base General San Martín of «Poncho va al frente» (book p. 12), on its islet in Marguerite Bay, as a place and not as a
 * hut: two red two-storey wooden houses joined side by side, a black hut and a long low red shed, dark roofs, white window
 * frames, radio masts with red and white bands, a wooden stair, some yellow instruments, and the rocks of the islet
 * with snow on them, after the photograph of the base (Wikimedia Commons, «San Martín Base, Antarctica.jpg», 2008, public
 * domain; see poncho-photos.ts). The base stood unoccupied in 1962 (docs/expediciones/poncho-fuentes.md): nobody is at
 * its doors. Like `baseEsperanza`, its front (the doors) faces -z, towards whoever looks from the stage; what is behind it is on +z.
 * Everything at human scale. An illustration after a photograph of today, not a plan of the real base.
 * About 13 long (along x), 6 deep, 4 high in model units.
 */
const { RED, CREAM, WHITE, ZINC, BLACK, WOOD, WINDOW_DAY } = VOXEL_PALETTE;

/** Colors of the base (named, rule 30.5): the dark roofs, the orange of a small hut, and the yellow of the instruments. */
const ROOF_DARK = 0x3a3c40;
const HUT_ORANGE = 0xe0703a;
const INSTRUMENT_YELLOW = 0xd9a441;

/**
 * A wooden house with a gabled roof, its door and windows on +z (the side that is turned to the stage later), base on y = 0:
 * `w` along x, `d` deep, `h` high up to the ridge, `floors` rows of windows.
 */
function house(w: number, d: number, h: number, body: number, roof: number, floors: number): Tri[] {
  const eave = h * 0.78;
  const out: Tri[] = [...block(0, eave / 2, 0, w, eave, d, body, body)];
  // The roof: a triangle of section along x, a little wider than the walls so it overhangs.
  const o = 0.12;
  out.push(...extrude([[-d / 2 - o, eave - 0.02], [d / 2 + o, eave - 0.02], [0, h]], -w / 2 - o, w / 2 + o, roof, roof));
  // The door in the middle of the front wall, and a row of windows with white frames on each floor.
  out.push(...block(0, 0.42, d / 2 + 0.015, 0.5, 0.84, 0.04, ROOF_DARK));
  const rows = Math.max(1, floors);
  for (let f = 0; f < rows; f++) {
    const y = rows === 1 ? eave * 0.6 : 0.5 + (f / (rows - 1)) * (eave - 1.1);
    for (const x of [-w * 0.3, w * 0.3]) {
      if (f === 0 && Math.abs(x) < 0.4) continue;
      out.push(...block(x, y, d / 2 + 0.012, 0.46, 0.4, 0.03, WHITE), ...block(x, y, d / 2 + 0.03, 0.36, 0.3, 0.03, WINDOW_DAY));
    }
  }
  return out;
}

/** A radio mast of red and white bands, `height` high, with a foot of metal. */
function mast(x: number, z: number, height: number): Tri[] {
  const out: Tri[] = [];
  const bands = 6;
  for (let i = 0; i < bands; i++) {
    out.push(...tube([x, 0.1 + (i / bands) * height, z], [x, 0.1 + ((i + 1) / bands) * height, z], 0.04, 0.04, 6, i % 2 ? CREAM : RED, i === 0, i === bands - 1));
  }
  out.push(...block(x, 0.06, z, 0.36, 0.12, 0.36, ZINC));
  return out;
}

export function buildSanMartinBase(): Tri[] {
  // Built with the doors on +z (what is behind is on -z) and turned half a turn at the end, so the doors face the stage (-z).
  const out: Tri[] = [
    ...shift(house(2.6, 2.2, 2.6, RED, ROOF_DARK, 2), -0.9, 0, 0),
    ...shift(house(2.4, 2.0, 2.2, RED, ROOF_DARK, 2), 1.8, 0, 0.1),
    ...shift(house(2.2, 1.9, 1.7, BLACK, ROOF_DARK, 1), 4.0, 0, -0.1),
    // The long low shed on the left, red with a flat dark roof, a door and a window.
    ...shift(block(0, 0.55, 0, 4.4, 1.1, 1.3, RED), -5.2, 0, -0.7),
    ...shift(block(0, 1.14, 0, 4.6, 0.1, 1.5, ROOF_DARK), -5.2, 0, -0.7),
    ...shift(block(-1, 0.55, 0.66, 0.5, 0.8, 0.04, ROOF_DARK), -5.2, 0, -0.7),
    ...shift(block(0.6, 0.65, 0.66, 0.46, 0.3, 0.03, WINDOW_DAY), -5.2, 0, -0.7),
    // A small orange hut up the slope, behind the houses.
    ...shift(house(0.9, 0.8, 0.9, HUT_ORANGE, ROOF_DARK, 1), 1.4, 0, -3.1),
  ];
  // Radio masts behind and beside the houses, of different heights, and a stair of wood by the second house.
  out.push(...mast(-3.4, -2.3, 3.8), ...mast(-1.6, -3.2, 3.3), ...mast(0.4, -3.6, 2.8), ...mast(5.2, -2.6, 3.6));
  for (let i = 0; i < 5; i++) out.push(...block(3.0 + i * 0.28, 0.12 + i * 0.16, 1.25 + i * 0.06, 0.7, 0.08, 0.5, WOOD));
  // Yellow instruments at the right end.
  out.push(...block(5.6, 0.45, -0.2, 0.5, 0.9, 0.5, INSTRUMENT_YELLOW), ...block(5.9, 0.3, -0.6, 0.4, 0.6, 0.4, INSTRUMENT_YELLOW));
  // The rocks of the islet with snow on them, and drifts at the foot of the houses.
  for (const [x, z, rx, rz, h, seed] of [[-4.2, -2.0, 2.4, 1.4, 1.0, 611], [1.6, -3.0, 2.6, 1.5, 1.4, 612], [4.8, -2.2, 1.8, 1.2, 1.1, 613], [-6.1, -1.2, 1.3, 1.0, 0.7, 614]] as const) {
    out.push(...snowMound(x, z, rx, rz, h, seed, 9, true));
  }
  for (const [x, z, rx, rz, seed] of [[-0.9, 1.6, 1.6, 0.4, 621], [1.8, 1.5, 1.5, 0.4, 622], [4.0, 1.4, 1.3, 0.35, 623], [-5.2, 0.4, 2.2, 0.4, 624]] as const) {
    out.push(...snowMound(x, z, rx, rz, 0.1, seed, 8));
  }
  return turn(out, Math.PI);
}

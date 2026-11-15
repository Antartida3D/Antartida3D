import { createSeededRng, DIORAMA_METERS_PER_UNIT, type RoofShape, type SiteColour } from '@antartida/core';
import {
  block,
  chamferRect,
  chunk,
  extrude,
  lathe,
  ngon,
  prism,
  quad,
  rect,
  shift,
  strut,
  turn,
  type Tri,
  type Vec3,
} from '../voyage/lowPoly.ts';
import {
  FLAG_SEGMENT_WIDTH,
  HELIPAD_TOP_Y,
  VOXEL_PALETTE,
  resolveBuildingColour,
} from './stationModels.ts';

const {
  BLACK,
  WHITE,
  ROCK,
  ROCK_DARK,
  ROCK_LIGHT,
  ICE,
  ICE_BLUE,
  ORANGE,
  RED,
  CREAM,
  WOOD,
  WOOD_LIGHT,
  SEA_GREY,
  BROWN_DARK,
  LAMP,
  ZINC,
  SKY,
  WINDOW_DAY,
  ZODIAC_TUBE,
} = VOXEL_PALETTE;

/** Gravel tones matching stationModels.ts path gravel. */
const GRAVEL = 0xa8a49b;
const GRAVEL_DARK = 0x8c887f;

/** Ground embed depth so foundations and snowbanks sit firmly in terrain without floating. */
const GROUND_SINK = -0.015;


/** Rotate lathe output around x by +90 deg so the lathe y axis points along +z. */
function latheAlongZ(tris: readonly Tri[]): Tri[] {
  return tris.map(([a, b, c, col]): Tri => [
    [a[0], a[2], a[1]],
    [c[0], c[2], c[1]],
    [b[0], b[2], b[1]],
    col,
  ]);
}

/** Rotate lathe output so the lathe y axis points along +x. */
function latheAlongX(tris: readonly Tri[]): Tri[] {
  return tris.map(([a, b, c, col]): Tri => [
    [a[1], a[0], a[2]],
    [c[1], c[0], c[2]],
    [b[1], b[0], b[2]],
    col,
  ]);
}

/**
 * Recessed framed window on the +z or -z wall face (18 tris, open back against wall).
 * Outer frame projects to +0.022 and bevels inward to the recessed glass at +0.006.
 */
function framedWindow(
  x: number,
  y: number,
  wallZ: number,
  side: 1 | -1,
  size: number,
  glassColor: number
): Tri[] {
  const h = size / 2;
  const fh = h + 0.022;
  const fz = 0.022;
  const gz = 0.006;

  const ibl: Vec3 = [-h, -h, gz];
  const ibr: Vec3 = [h, -h, gz];
  const itr: Vec3 = [h, h, gz];
  const itl: Vec3 = [-h, h, gz];

  const obl: Vec3 = [-fh, -fh, 0];
  const obr: Vec3 = [fh, -fh, 0];
  const otr: Vec3 = [fh, fh, 0];
  const otl: Vec3 = [-fh, fh, 0];
  const fbl: Vec3 = [-fh, -fh, fz];
  const fbr: Vec3 = [fh, -fh, fz];
  const ftr: Vec3 = [fh, fh, fz];
  const ftl: Vec3 = [-fh, fh, fz];

  const local: Tri[] = [
    // Recessed glass pane
    ...quad(ibl, ibr, itr, itl, glassColor),
    // Beveled inner reveals (4 quads)
    ...quad(fbl, fbr, ibr, ibl, BLACK),
    ...quad(ftr, ftl, itl, itr, BLACK),
    ...quad(ftl, fbl, ibl, itl, SEA_GREY),
    ...quad(fbr, ftr, itr, ibr, SEA_GREY),
    // Outer frame edges (4 quads)
    ...quad(obl, obr, fbr, fbl, BLACK),
    ...quad(otr, otl, ftl, ftr, BLACK),
    ...quad(otl, obl, fbl, ftl, BLACK),
    ...quad(obr, otr, ftr, fbr, BLACK),
  ];
  return shift(side === 1 ? local : turn(local, Math.PI), x, y, wallZ);
}

/** Irregular seeded snow drift banked along the windward (-z) wall and tucked under the plinth. */
function windwardSnowDrift(
  length: number,
  width: number,
  plinthH: number,
  maxOut: number,
  seed: number
): Tri[] {
  const rng = createSeededRng(seed);
  const stations = 9;
  const xStart = -length * 0.46;
  const xEnd = length * 0.45;
  const zWall = -width / 2;
  const zUnder = zWall + 0.12;

  const profiles: [Vec3, Vec3, Vec3][] = [];
  for (let i = 0; i <= stations; i++) {
    const t = i / stations;
    const x = xStart + t * (xEnd - xStart);
    const taper = Math.sin(t * Math.PI);
    const out = maxOut * (0.35 + 0.65 * taper * (0.65 + 0.35 * rng()));
    const ridgeH = (plinthH + 0.05 + rng() * 0.08) * (0.3 + 0.7 * taper);
    profiles.push([
      [x, GROUND_SINK, zUnder],
      [x, GROUND_SINK, zWall - out],
      [x, ridgeH, zWall - 0.004],
    ]);
  }

  const tris: Tri[] = [];
  for (let i = 0; i < stations; i++) {
    const [u0, o0, r0] = profiles[i];
    const [u1, o1, r1] = profiles[i + 1];
    const colTop = i % 2 === 0 ? WHITE : ICE;
    const colWall = i % 2 === 0 ? ICE : ICE_BLUE;
    // Windward outer slope (+y/-z facing)
    tris.push(...quad(o0, r0, r1, o1, colTop));
    // Inner face under plinth (+y/+z facing)
    tris.push(...quad(r0, u0, u1, r1, colWall));
  }
  // Closed ends
  tris.push([profiles[0][0], profiles[0][2], profiles[0][1], ICE]);
  tris.push([profiles[stations][0], profiles[stations][1], profiles[stations][2], ICE]);
  return tris;
}

/** Seeded snow cornice along the windward (-z) roof eave. */
function roofSnowCornice(
  length: number,
  eaveZ: number,
  eaveY: number,
  thick: number,
  seed: number
): Tri[] {
  const rng = createSeededRng(seed);
  const segs = 5;
  const out: Tri[] = [];
  for (let i = 0; i < segs; i++) {
    const x0 = -length / 2 + (i / segs) * length;
    const x1 = -length / 2 + ((i + 1) / segs) * length;
    const cx = (x0 + x1) / 2;
    const segL = (x1 - x0) * 0.96;
    const h = thick * (0.65 + rng() * 0.55);
    const d = 0.036 + rng() * 0.018;
    const col = rng() > 0.35 ? WHITE : ICE;
    out.push(...block(cx, eaveY + h * 0.35, eaveZ + d * 0.35, segL, h, d, col));
  }
  return out;
}

/**
 * 1. Modular station building with real measured dimensions.
 * Long side along local x, front along +z, base at y = 0, centered on origin.
 */
export function buildModuleTris(
  length: number,
  width: number,
  height: number,
  colour?: SiteColour,
  roof: RoofShape = 'flat',
  isNight = false
): Tri[] {
  const bodyCol = resolveBuildingColour(colour);
  const winCol = isNight ? LAMP : WINDOW_DAY;
  const plinthH = Math.max(0.08, height * 0.16);
  const roofH = roof === 'flat' ? height * 0.12 : height * 0.42;
  const wallH = height - plinthH - roofH;
  const y0 = plinthH + wallH;
  const winS = Math.min(0.19, wallH * 0.4);
  const winY = plinthH + wallH * 0.58;
  const doorW = Math.min(0.24, width * 0.3);
  const doorH = Math.min(wallH * 0.82, 0.42);
  const chamfer = Math.min(0.045, width * 0.035);
  const seed = Math.round(length * 100 + width * 31 + (roof === 'round' ? 3 : roof === 'gabled' ? 7 : 11));

  const tris: Tri[] = [];

  // Elevated plinth: chamfered underframe beam + concrete footings sunk in ground + braced steel piers
  const plinthL = length * 0.96;
  const plinthW = width * 0.9;
  tris.push(...prism(chamferRect(0, 0, plinthL, plinthW, chamfer * 0.8), plinthH * 0.52, plinthH + 0.004, BLACK));

  const pierCount = length > 4 ? 3 : 2;
  const pierS = Math.min(0.13, plinthL * 0.08);
  const pierXs: number[] = [];
  for (let i = 0; i < pierCount; i++) {
    const px = -plinthL / 2 + pierS / 2 + (i * (plinthL - pierS)) / (pierCount - 1);
    pierXs.push(px);
    for (const side of [-1, 1] as const) {
      const pz = side * (plinthW / 2 - pierS / 2);
      tris.push(
        ...prism(rect(px, pz, pierS * 1.28, pierS * 1.28), GROUND_SINK, 0.028, ROCK_DARK),
        ...prism(rect(px, pz, pierS, pierS), 0.028, plinthH * 0.55, BLACK),
      );
    }
  }
  // Cross-bracing between piers along front & back
  for (let i = 0; i < pierXs.length - 1; i++) {
    for (const side of [-1, 1] as const) {
      const pz = side * (plinthW / 2 - pierS / 2);
      tris.push(...strut([pierXs[i], 0.028, pz], [pierXs[i + 1], plinthH * 0.52, pz], 0.01, ZINC, false));
    }
  }

  // Chamfered main walls
  tris.push(...prism(chamferRect(0, 0, length, width, chamfer), plinthH, y0, bodyCol));

  // Cladding horizontal trim bands (base skirt & upper eave band)
  tris.push(
    ...prism(chamferRect(0, 0, length + 0.01, width + 0.01, chamfer), plinthH, plinthH + 0.022, ZINC),
    ...prism(chamferRect(0, 0, length + 0.01, width + 0.01, chamfer), y0 - 0.022, y0, BLACK),
  );

  // Vertical cladding panel seam ribs between windows on long walls
  const count = Math.max(1, Math.floor((length - 0.3) / 0.55));
  for (let i = 1; i < count; i++) {
    const sx = -length / 2 + (i * length) / count;
    for (const side of [-1, 1] as const) {
      tris.push(...block(sx, plinthH + wallH * 0.5, side * (width / 2 + 0.004), 0.016, wallH - 0.03, 0.008, SEA_GREY));
    }
  }

  // Entrance door on +x end with frame, recessed glass inset, handle, landing and stepped stair
  const doorX = length / 2;
  tris.push(
    ...block(doorX + 0.01, plinthH + doorH / 2, 0, 0.02, doorH + 0.035, doorW + 0.045, BLACK),
    ...block(doorX + 0.02, plinthH + doorH / 2, 0, 0.018, doorH, doorW, CREAM),
    ...block(doorX + 0.03, plinthH + doorH * 0.68, 0, 0.005, doorH * 0.24, doorW * 0.45, winCol),
    ...block(doorX + 0.032, plinthH + doorH * 0.48, doorW * 0.36, 0.01, 0.035, 0.012, BLACK),
    // Landing + 2 steps + handrail posts reaching doorX + 0.17
    ...block(doorX + 0.065, plinthH * 0.85, 0, 0.11, 0.024, doorW + 0.08, ZINC),
    ...block(doorX + 0.13, plinthH * 0.42, 0, 0.08, 0.022, doorW + 0.08, ZINC),
    ...strut([doorX + 0.02, plinthH * 0.85, doorW / 2 + 0.03], [doorX + 0.16, 0, doorW / 2 + 0.03], 0.008, BLACK),
    ...strut([doorX + 0.02, plinthH * 0.85, -doorW / 2 - 0.03], [doorX + 0.16, 0, -doorW / 2 - 0.03], 0.008, BLACK),
    ...block(doorX + 0.11, plinthH * 0.9, doorW / 2 + 0.03, 0.012, plinthH * 0.8, 0.012, BLACK),
    ...block(doorX + 0.11, plinthH * 0.9, -doorW / 2 - 0.03, 0.012, plinthH * 0.8, 0.012, BLACK),
  );

  // Row of recessed framed windows along both long sides (+z front and -z back)
  for (let i = 0; i < count; i++) {
    const x = -length / 2 + ((i + 0.5) * length) / count;
    for (const side of [1, -1] as const) {
      tris.push(...framedWindow(x, winY, (side * width) / 2, side, winS, winCol));
    }
  }
  // End window on -x gable wall
  tris.push(...turn(framedWindow(0, winY, length / 2, 1, winS * 0.9, winCol), -Math.PI / 2));

  // Roof + eaves + gutters + rooftop vents/pipes + roof snow cornice
  if (roof === 'round') {
    const eaveH = roofH * 0.14;
    const archH = roofH * 0.84;
    const segments = 12;
    const archProfile: [number, number][] = Array.from({ length: segments + 1 }, (_, i) => {
      const a = (i / segments) * Math.PI;
      return [(Math.cos(a) * width) / 2, Math.sin(a) * archH];
    });
    const archBaseY = y0 + eaveH;
    tris.push(
      ...prism(chamferRect(0, 0, length + 0.06, width + 0.06, chamfer * 0.7), y0, archBaseY, BLACK),
      ...shift(extrude(archProfile, -(length + 0.02) / 2, (length + 0.02) / 2, bodyCol, bodyCol), 0, archBaseY, 0),
    );
    // Standing seam arch ribs
    const seams = Math.max(2, Math.floor(length / 0.9));
    for (let i = 1; i <= seams; i++) {
      const sx = -length / 2 + (i * length) / (seams + 1);
      const x0 = sx - 0.015;
      const x1 = sx + 0.015;
      for (let k = 0; k < segments; k++) {
        const a0 = (k / segments) * Math.PI;
        const a1 = ((k + 1) / segments) * Math.PI;
        const z0 = Math.cos(a0) * (width / 2 + 0.01);
        const yA = archBaseY + Math.sin(a0) * (archH + 0.01);
        const z1 = Math.cos(a1) * (width / 2 + 0.01);
        const yB = archBaseY + Math.sin(a1) * (archH + 0.01);
        tris.push(
          [[x1, yA, z0], [x1, yB, z1], [x0, yB, z1], BLACK],
          [[x1, yA, z0], [x0, yB, z1], [x0, yA, z0], BLACK],
        );
      }
    }
    // Gutters along +z and -z eaves + downspout on -x/-z corner
    const gz = width / 2 + 0.022;
    tris.push(
      ...block(0, y0 + eaveH * 0.4, gz, length + 0.04, 0.022, 0.022, ZINC),
      ...block(0, y0 + eaveH * 0.4, -gz, length + 0.04, 0.022, 0.022, ZINC),
      ...strut([-length * 0.45, y0, -gz], [-length * 0.45, 0.04, -width / 2 - 0.01], 0.01, ZINC),
    );
    // Rooftop exhaust flue + cowl on shoulder (kept below crown max.y)
    const flueZ = -width * 0.28;
    const flueBase = archBaseY + Math.sin(Math.acos(flueZ / (width / 2))) * archH - 0.02;
    const flueTop = Math.min(archBaseY + archH - 0.01, flueBase + 0.09);
    tris.push(
      ...lathe(-length * 0.22, flueZ, [[flueBase, 0.024], [flueTop - 0.02, 0.022]], 6, ZINC),
      ...lathe(-length * 0.22, flueZ, [[flueTop - 0.02, 0.042], [flueTop, 0]], 6, BLACK),
      ...block(length * 0.2, archBaseY + archH * 0.88, -width * 0.16, 0.14, 0.05, 0.12, ZINC),
    );
    tris.push(...roofSnowCornice(length * 0.94, -(width / 2 + 0.01), y0 + eaveH * 0.65, 0.028, seed + 1));
  } else if (roof === 'gabled') {
    const eaveH = roofH * 0.14;
    const gableH = roofH * 0.86;
    const gableProfile: [number, number][] = [
      [width / 2 + 0.025, 0],
      [0, gableH],
      [-(width / 2 + 0.025), 0],
    ];
    tris.push(
      ...prism(chamferRect(0, 0, length + 0.08, width + 0.09, chamfer * 0.8), y0, y0 + eaveH, BLACK),
      ...shift(extrude(gableProfile, -(length + 0.06) / 2, (length + 0.06) / 2, bodyCol, bodyCol), 0, y0 + eaveH, 0),
      ...block(0, y0 + roofH - 0.018, 0, length + 0.07, 0.036, 0.065, BLACK),
    );
    const gz = width / 2 + 0.035;
    tris.push(
      ...block(0, y0 + eaveH * 0.45, gz, length + 0.06, 0.022, 0.022, ZINC),
      ...block(0, y0 + eaveH * 0.45, -gz, length + 0.06, 0.022, 0.022, ZINC),
      ...strut([-length * 0.44, y0, -gz], [-length * 0.44, 0.04, -width / 2 - 0.01], 0.01, ZINC),
    );
    // Exhaust pipe on rear roof slope + ridge vent
    const slopeY = y0 + eaveH + gableH * 0.42;
    const flueTop = y0 + roofH - 0.01;
    tris.push(
      ...lathe(-length * 0.2, -width * 0.24, [[slopeY, 0.022], [flueTop - 0.018, 0.02]], 6, ZINC),
      ...lathe(-length * 0.2, -width * 0.24, [[flueTop - 0.018, 0.038], [flueTop, 0]], 6, BLACK),
      ...block(length * 0.18, y0 + roofH - 0.03, -width * 0.12, 0.14, 0.05, 0.1, ZINC),
    );
    tris.push(...roofSnowCornice(length * 0.96, -(width / 2 + 0.02), y0 + eaveH * 0.65, 0.028, seed + 2));
  } else {
    // Flat roof with chamfered parapet/eave, gutters, recessed deck, HVAC unit, pipe and whip antenna
    const deckH = roofH * 0.82;
    tris.push(
      ...prism(chamferRect(0, 0, length + 0.04, width + 0.04, chamfer * 0.8), y0, y0 + deckH, BLACK),
      ...prism(chamferRect(0, 0, length - 0.04, width - 0.04, chamfer * 0.6), y0 + deckH, y0 + roofH, ZINC),
    );
    const gz = width / 2 + 0.02;
    tris.push(
      ...block(0, y0 + deckH * 0.5, gz, length + 0.02, 0.018, 0.02, ZINC),
      ...block(0, y0 + deckH * 0.5, -gz, length + 0.02, 0.018, 0.02, ZINC),
      ...strut([-length * 0.46, y0, -gz], [-length * 0.46, 0.04, -width / 2 - 0.008], 0.01, ZINC),
    );
    // HVAC unit + exhaust stack + thin roof antenna (top <= y0 + roofH + 0.12)
    const hvacW = Math.min(0.3, length * 0.15);
    tris.push(
      ...block(-length * 0.25, y0 + roofH + 0.045, 0, hvacW, 0.09, width * 0.3, ZINC),
      ...block(-length * 0.25, y0 + roofH + 0.105, 0, hvacW * 1.12, 0.03, width * 0.34, BLACK),
      ...lathe(length * 0.18, -width * 0.2, [[y0 + roofH, 0.022], [y0 + roofH + 0.085, 0.02]], 6, ZINC),
      ...lathe(length * 0.18, -width * 0.2, [[y0 + roofH + 0.085, 0.038], [y0 + roofH + 0.105, 0]], 6, BLACK),
      ...lathe(length * 0.32, width * 0.22, [[y0 + roofH, 0.012], [y0 + roofH + 0.118, 0.006]], 6, BLACK),
    );
    tris.push(...roofSnowCornice(length * 0.94, -(width / 2 + 0.01), y0 + deckH, 0.022, seed + 3));
  }

  // Windward snow drift banked against -z wall and under the raised plinth
  const maxDriftOut = roof === 'gabled' ? 0.062 : 0.046;
  tris.push(...windwardSnowDrift(length, width, plinthH, maxDriftOut, seed + 19));

  return tris;
}

/**
 * Dry-stone block for the Omond House walls: a rough box (corners jittered by a seed) with nearly
 * upright sides and a chamfered, slightly tilted top, like split stones laid without mortar.
 */
function dryStone(
  cx: number,
  cy: number,
  cz: number,
  sx: number,
  sy: number,
  sz: number,
  seed: number,
  color: number
): Tri[] {
  const rng = createSeededRng(seed);
  const j = (k: number) => (rng() - 0.5) * k;
  const corners: [number, number][] = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  const y0 = cy - sy / 2;
  const tilt = j(sy * 0.25);
  // Foot, shoulder (where the chamfer starts) and the inset top of every corner.
  const foot = corners.map(([u, v]): Vec3 => [cx + u * (sx / 2) * (0.9 + j(0.12)), y0, cz + v * (sz / 2) * (0.9 + j(0.12))]);
  const shoulder = foot.map(([x, , z], i): Vec3 => [
    cx + (x - cx) * (0.97 + j(0.06)),
    cy + sy * 0.32 + corners[i][0] * tilt * 0.5 + j(sy * 0.12),
    cz + (z - cz) * (0.97 + j(0.06)),
  ]);
  const top = shoulder.map(([x, y, z]): Vec3 => [cx + (x - cx) * 0.78, y + sy * 0.18 + j(sy * 0.06), cz + (z - cz) * 0.78]);
  const out: Tri[] = [];
  for (let i = 0; i < 4; i++) {
    const k = (i + 1) % 4;
    out.push(...quad(foot[k], foot[i], shoulder[i], shoulder[k], color));
    out.push(...quad(shoulder[k], shoulder[i], top[i], top[k], color));
  }
  out.push([top[0], top[2], top[1], color], [top[0], top[3], top[2], color]);
  return out;
}

/**
 * 2. Omond House (1903 Scottish expedition stone cabin, HSM 42).
 * Source: Cool Antarctica ("Now a roofless ruin", mortarless stone walls continuing to collapse,
 * https://www.coolantarctica.com/Travel/antarctica-huts-historic.php, consulted 14 Nov 2026).
 * Real plan 9.0 x 4.6 m, front +z, base at y = 0. Roofless dry-stone walls built of stacked
 * faceted stones (taller at the back, crumbling down toward the front doorway), stone floor,
 * fallen rubble, HSM 42 plaque, and windward snow drift.
 */
export function buildOmondTris(_isNight = false): Tri[] {
  const l = 9.0 / DIORAMA_METERS_PER_UNIT;
  const w = 4.6 / DIORAMA_METERS_PER_UNIT;
  const t = 0.16;
  const rng = createSeededRng(1903);
  const stonePalette = [ROCK, ROCK_DARK, ROCK_LIGHT, SEA_GREY];
  const pickStone = () => stonePalette[Math.floor(rng() * stonePalette.length)];

  const tris: Tri[] = [
    // Sunken interior stone & earth floor
    ...prism(chamferRect(0, 0, l - 0.04, w - 0.04, 0.06), GROUND_SINK, 0.055, ROCK_DARK),
    ...prism(rect(0, 0, l - 0.34, w - 0.34), 0.04, 0.068, SEA_GREY),
  ];

  // Build mortarless stacked dry-stone wall segment with irregular top profile
  const buildStoneWall = (
    x0: number,
    z0: number,
    x1: number,
    z1: number,
    hStart: number,
    hEnd: number,
    seedBase: number
  ) => {
    const wallLen = Math.hypot(x1 - x0, z1 - z0);
    const cols = Math.max(2, Math.round(wallLen / 0.22));
    const dx = (x1 - x0) / cols;
    const dz = (z1 - z0) / cols;
    const alongX = Math.abs(x1 - x0) >= Math.abs(z1 - z0);
    const courseH = 0.13;

    for (let c = 0; c < cols; c++) {
      const u = (c + 0.5) / cols;
      const targetH = hStart + (hEnd - hStart) * u + (rng() - 0.5) * 0.09;
      const courses = Math.max(1, Math.round(targetH / courseH));
      for (let r = 0; r < courses; r++) {
        // Stagger odd courses along wall length
        const stagger = (r % 2 === 1 ? 0.16 : -0.1) * (c > 0 && c < cols - 1 ? 1 : 0);
        const px = x0 + (c + 0.5 + stagger) * dx;
        const pz = z0 + (c + 0.5 + stagger) * dz;
        const py = 0.04 + (r + 0.5) * courseH * 0.94;
        const span = (wallLen / cols) * (0.95 + rng() * 0.25);
        const sx = alongX ? span : t * (0.85 + rng() * 0.22);
        const sz = alongX ? t * (0.85 + rng() * 0.22) : span;
        const sy = courseH * (1.05 + rng() * 0.25);
        // Clamp to footprint bounds
        const clampedX = Math.max(-l / 2 + sx * 0.45, Math.min(l / 2 - sx * 0.45, px));
        const clampedZ = Math.max(-w / 2 + sz * 0.45, Math.min(w / 2 - sz * 0.45, pz));
        tris.push(...dryStone(clampedX, py, clampedZ, sx, sy, sz, seedBase + c * 17 + r * 53, pickStone()));
      }
    }
  };

  // Back wall (-z): highest along the rear, crumbling slightly toward the east end
  buildStoneWall(-l / 2 + t * 0.5, -w / 2 + t * 0.5, l / 2 - t * 0.5, -w / 2 + t * 0.5, 0.54, 0.44, 190310);
  // West wall (-x): stepping down from back (-z) to front (+z)
  buildStoneWall(-l / 2 + t * 0.5, -w / 2 + t * 1.1, -l / 2 + t * 0.5, w / 2 - t * 1.1, 0.5, 0.24, 190340);
  // East wall (+x): lower crumbling flank
  buildStoneWall(l / 2 - t * 0.5, -w / 2 + t * 1.1, l / 2 - t * 0.5, w / 2 - t * 1.1, 0.42, 0.2, 190370);
  // Front wall (+z): low ruined courses split by central doorway gap (-0.18..+0.22)
  buildStoneWall(-l / 2 + t * 0.5, w / 2 - t * 0.5, -0.22, w / 2 - t * 0.5, 0.24, 0.16, 190390);
  buildStoneWall(0.24, w / 2 - t * 0.5, l / 2 - t * 0.5, w / 2 - t * 0.5, 0.14, 0.2, 190410);

  // Fallen rubble stones inside the ruin and around the crumbling walls (inside footprint)
  const rubbleSites: readonly [number, number, number][] = [
    [0.2, 0.08, 0.2],
    [-0.38, 0.18, 0.19],
    [0.48, -0.06, 0.17],
    [-0.12, -0.22, 0.2],
    [0.78, 0.22, 0.16],
    [-0.75, -0.15, 0.18],
    [0.02, 0.32, 0.15],
    [-0.96, 0.36, 0.16],
    [0.95, 0.38, 0.15],
    [-0.55, -0.4, 0.17],
    [0.62, -0.38, 0.16],
    [0.34, 0.42, 0.14],
  ];
  rubbleSites.forEach(([rx, rz, rs], i) => {
    tris.push(...chunk(rx, 0.075, rz, rs * 1.15, rs * 0.72, rs * 0.95, 190500 + i * 29, pickStone()));
  });

  // Historic site plaque (HSM 42) by the doorway (+z, kept below 70% wall height)
  tris.push(
    ...prism(rect(0.02, w / 2 + 0.12, 0.045, 0.045), GROUND_SINK, 0.33, BROWN_DARK),
    ...prism(chamferRect(0.02, w / 2 + 0.12, 0.28, 0.036, 0.008), 0.24, 0.37, CREAM),
  );

  // Low windward snow drift banked inside & behind the back (-z) stone wall
  tris.push(
    ...shift(extrude([[0.12, 0], [-0.08, 0.16], [-0.08, 0]], -l * 0.32, l * 0.38, ICE, WHITE), 0, 0.03, -w / 2 + t + 0.07),
    ...chunk(-l * 0.18, 0.06, -w / 2 + t + 0.13, 0.32, 0.1, 0.16, 190611, WHITE),
  );

  return tris;
}

/**
 * 3. Lattice radio tower (red/white alternating tapered sections, 4 profiled legs, X-bracing,
 * concrete footings, maintenance platforms, ladder, antennas and red obstruction beacons).
 */
export function buildRadioTowerTris(height = 30 / DIORAMA_METERS_PER_UNIT): Tri[] {
  const baseY = 0.22;
  const tris: Tri[] = [
    // Central ground junction box pad + 4 individual corner concrete footings sunk into ground
    ...prism(chamferRect(0, 0, 0.24, 0.24, 0.04), GROUND_SINK, 0.14, ROCK),
  ];

  const corners: readonly [number, number][] = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ];
  for (const [cx, cz] of corners) {
    const fx = cx * 0.195;
    const fz = cz * 0.195;
    tris.push(
      ...prism(chamferRect(fx, fz, 0.21, 0.21, 0.035), GROUND_SINK, 0.15, ROCK_DARK),
      ...prism(chamferRect(fx, fz, 0.14, 0.14, 0.025), 0.15, baseY, ROCK),
      ...prism(rect(cx * 0.18, cz * 0.18, 0.07, 0.07), baseY, baseY + 0.025, BLACK),
    );
  }

  const sections = 7;
  const secH = (height - baseY) / sections;

  for (let s = 0; s < sections; s++) {
    const col = s % 2 === 0 ? RED : WHITE;
    const y0 = baseY + s * secH;
    const y1 = y0 + secH;
    const o0 = 0.18 * (1 - (s / sections) * 0.65);
    const o1 = 0.18 * (1 - ((s + 1) / sections) * 0.65);
    const legR = Math.max(0.015, 0.025 * (1 - (s / sections) * 0.45));
    const braceR = legR * 0.56;

    for (let i = 0; i < 4; i++) {
      const [ax, az] = corners[i];
      const [bx, bz] = corners[(i + 1) % 4];
      const p0: Vec3 = [ax * o0, y0, az * o0];
      const p1: Vec3 = [ax * o1, y1, az * o1];
      const q0: Vec3 = [bx * o0, y0, bz * o0];
      const q1: Vec3 = [bx * o1, y1, bz * o1];

      // Corner leg, horizontal top girt, and full X-bracing on all 4 faces
      tris.push(...strut(p0, p1, legR, col, s === 0 || s === sections - 1));
      tris.push(...strut(p1, q1, braceR, col, false));
      tris.push(...strut(p0, q1, braceR * 0.78, col, false));
      tris.push(...strut(q0, p1, braceR * 0.78, col, false));
    }

    // Splice collar flanges on legs at section joints + maintenance platforms at mid & top
    if (s === 3 || s === sections - 1) {
      const platSpan = o1 * 2 + 0.14;
      const railH = 0.12;
      const hr = o1 + 0.055;
      tris.push(
        ...prism(chamferRect(0, 0, platSpan, platSpan, 0.03), y1 - 0.015, y1 + 0.015, ZINC),
        ...prism(chamferRect(0, 0, platSpan * 0.85, platSpan * 0.85, 0.02), y1 + 0.015, y1 + 0.025, BLACK),
      );
      for (const [cx, cz] of corners) {
        tris.push(...strut([cx * hr, y1 + 0.015, cz * hr], [cx * hr, y1 + railH, cz * hr], 0.008, ZINC));
      }
      for (let i = 0; i < 4; i++) {
        const [ax, az] = corners[i];
        const [bx, bz] = corners[(i + 1) % 4];
        tris.push(...strut([ax * hr, y1 + railH, az * hr], [bx * hr, y1 + railH, bz * hr], 0.006, col, false));
      }
    }
  }

  // Vertical climbing ladder up the +z interior face
  const ladTop = height - 0.05;
  const ladRungCount = 16;
  const zBot = 0.14;
  const zTop = 0.05;
  tris.push(
    ...strut([-0.035, baseY, zBot], [-0.035, ladTop, zTop], 0.006, ZINC),
    ...strut([0.035, baseY, zBot], [0.035, ladTop, zTop], 0.006, ZINC),
  );
  for (let r = 1; r <= ladRungCount; r++) {
    const f = r / (ladRungCount + 1);
    const ry = baseY + f * (ladTop - baseY);
    const rz = zBot + f * (zTop - zBot);
    tris.push(...strut([-0.035, ry, rz], [0.035, ry, rz], 0.005, ZINC, false));
  }

  // Top VHF/UHF antenna cross-arms + central mast + red obstruction beacon lights
  tris.push(
    ...block(0, height + 0.09, 0, 0.34, 0.014, 0.014, ZINC),
    ...block(0, height + 0.15, 0, 0.014, 0.014, 0.26, ZINC),
    ...lathe(0.16, 0, [[height + 0.04, 0.007], [height + 0.22, 0.005]], 5, ZINC),
    ...lathe(-0.16, 0, [[height + 0.04, 0.007], [height + 0.22, 0.005]], 5, ZINC),
    // Central mast shaft
    ...lathe(0, 0, [[height, 0.024], [height + 0.24, 0.014]], 6, BLACK),
    // Top red obstruction beacon light (base + red glowing dome reaching height + 0.30)
    ...prism(ngon(0, 0, 0.024, 6), height + 0.24, height + 0.26, BLACK),
    ...lathe(0, 0, [[height + 0.26, 0.022], [height + 0.285, 0.018], [height + 0.3, 0]], 6, RED),
    // Secondary obstruction beacon on top platform corner
    ...prism(ngon(0.1, 0.1, 0.016, 6), height + 0.12, height + 0.135, BLACK),
    ...lathe(0.1, 0.1, [[height + 0.135, 0.014], [height + 0.155, 0]], 6, RED),
  );

  return tris;
}

/** Clamp a number to [0, 1]. */
export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Smooth Hermite interpolation over [0, 1]. */
export function smooth01(t: number): number {
  const c = clamp01(t);
  return c * c * (3 - 2 * c);
}

/** V-shaped chevron louver slat along x from `x0` to `x1` (open ends inside stiles/posts). */
function vSlat(x0: number, x1: number): Tri[] {
  const pts: readonly [number, number][] = [
    [0.034, 0],
    [0, 0.05],
    [-0.032, 0.008],
    [-0.018, 0],
    [0, 0.032],
    [0.02, 0],
  ];
  const out: Tri[] = [];
  for (let k = 0; k < pts.length; k++) {
    const [az, ay] = pts[k];
    const [bz, by] = pts[(k + 1) % pts.length];
    out.push(...quad([x1, ay, az], [x1, by, bz], [x0, by, bz], [x0, ay, az], WHITE));
  }
  return out;
}

/** Hinge pivot of the Stevenson screen front door in model coordinates. */
export const SCREEN_DOOR_HINGE: Vec3 = [-0.44, 1.365, 0.455];

/** Duration (seconds) and maximum opening angle (radians, ~110 deg) of the Stevenson screen door. */
export const SCREEN_DOOR_DURATION = 0.8;
export const SCREEN_DOOR_OPEN_ANGLE = (110 * Math.PI) / 180;

/**
 * Opening angle (radians, 0 = closed, ~110 deg = open) of the Stevenson screen door after `t`
 * seconds of transition. With `reduced` motion, jumps directly to the target angle.
 */
export function screenDoorAngle(open: boolean, t: number, reduced: boolean): number {
  if (reduced) return open ? SCREEN_DOOR_OPEN_ANGLE : 0;
  const u = smooth01(t / SCREEN_DOOR_DURATION);
  return SCREEN_DOOR_OPEN_ANGLE * (open ? u : 1 - u);
}

/**
 * 4a. Meteorological Stevenson Screen body (hollow dark interior, V-louvered back/side walls,
 * fixed doorway frame, double ventilated roof with air gap, X-braced legs, wooden steps, gravel pad).
 */
export function buildStevensonScreenTris(): Tri[] {
  const tris: Tri[] = [
    // Gravel pad under screen & stairs (sunk in terrain)
    ...prism(chamferRect(0, 0.24, 1.24, 1.58, 0.18), GROUND_SINK, 0.032, GRAVEL),
    ...prism(chamferRect(0, 0.24, 1.12, 1.44, 0.16), 0.02, 0.042, GRAVEL_DARK, GRAVEL_DARK, false),
  ];

  // Scattered gravel stones around pad edge
  const gravelPts: readonly [number, number, number][] = [
    [-0.52, -0.44, 0.07],
    [0.54, -0.4, 0.08],
    [-0.56, 0.56, 0.07],
    [0.52, 0.72, 0.08],
  ];
  gravelPts.forEach(([gx, gz, gs], idx) => {
    tris.push(...chunk(gx, 0.035, gz, gs * 1.2, gs * 0.55, gs, 19070 + idx * 13, idx % 2 ? ROCK_DARK : ROCK));
  });

  // 4 concrete footing pads + 4 white legs
  const legCoords: readonly [number, number][] = [
    [-0.44, -0.38],
    [0.44, -0.38],
    [-0.44, 0.38],
    [0.44, 0.38],
  ];
  for (const [lx, lz] of legCoords) {
    tris.push(
      ...prism(rect(lx, lz, 0.22, 0.22), GROUND_SINK, 0.1, ROCK_DARK, ROCK_DARK, false),
      ...prism(rect(lx, lz, 0.11, 0.11), 0.1, 0.96, WHITE, WHITE, false),
    );
  }

  // Full X cross-bracing struts on all 4 sides
  tris.push(
    ...strut([-0.44, 0.2, -0.38], [0.44, 0.68, -0.38], 0.024, ICE, false),
    ...strut([0.44, 0.2, -0.38], [-0.44, 0.68, -0.38], 0.024, ICE, false),
    ...strut([-0.44, 0.2, 0.38], [0.44, 0.68, 0.38], 0.024, ICE, false),
    ...strut([0.44, 0.2, 0.38], [-0.44, 0.68, 0.38], 0.024, ICE, false),
    ...strut([-0.44, 0.22, -0.38], [-0.44, 0.66, 0.38], 0.024, ICE, false),
    ...strut([-0.44, 0.22, 0.38], [-0.44, 0.66, -0.38], 0.024, ICE, false),
    ...strut([0.44, 0.22, -0.38], [0.44, 0.66, 0.38], 0.024, ICE, false),
    ...strut([0.44, 0.22, 0.38], [0.44, 0.66, -0.38], 0.024, ICE, false),
  );

  // Screen floor platform and hollow dark interior (back, floor, side baffles, ceiling)
  tris.push(
    ...prism(chamferRect(0, 0, 1.14, 0.96, 0.04), 0.9, 0.98, ICE),
    ...block(0, 0.99, 0.01, 0.91, 0.02, 0.78, BROWN_DARK),
    ...block(0, 1.375, -0.375, 0.91, 0.75, 0.03, BLACK),
    ...block(-0.465, 1.375, 0.015, 0.02, 0.75, 0.77, SEA_GREY),
    ...block(0.465, 1.375, 0.015, 0.02, 0.75, 0.77, SEA_GREY),
    ...block(0, 1.745, 0.015, 0.91, 0.02, 0.77, SEA_GREY),
  );

  // 4 corner posts of the louvered cabinet
  for (const [cx, cz] of [[-0.5, 0.41], [0.5, 0.41], [-0.5, -0.41], [0.5, -0.41]] as const) {
    tris.push(...block(cx, 1.36, cz, 0.09, 0.8, 0.09, WHITE));
  }

  // V-shaped chevron double louvers along back & sides (front louvers live on buildStevensonDoorTris)
  const slatBack = vSlat(-0.46, 0.46);
  const slatRight = turn(vSlat(-0.38, 0.38), Math.PI / 2);
  const slatLeft = turn(vSlat(-0.38, 0.38), -Math.PI / 2);

  for (let i = 0; i < 6; i++) {
    const sy = 1.03 + i * 0.122;
    tris.push(
      ...shift(slatBack, 0, sy, -0.42),
      ...shift(slatRight, 0.51, sy, 0),
      ...shift(slatLeft, -0.51, sy, 0),
    );
  }

  // Fixed front doorway frame (+z opening)
  tris.push(
    ...block(0, 1.74, 0.42, 0.91, 0.04, 0.04, WHITE),
    ...block(0, 0.99, 0.42, 0.91, 0.04, 0.04, WHITE),
    ...block(-0.445, 1.365, 0.42, 0.03, 0.71, 0.04, WHITE),
    ...block(0.445, 1.365, 0.42, 0.03, 0.71, 0.04, WHITE),
  );

  // Double ventilated roof with clear air gap + 4 standoff spacers (width 1.28, depth 1.10, top 1.98)
  const roofPitch: [number, number][] = [
    [0.55, 0],
    [0.55, 0.035],
    [0, 0.095],
    [-0.55, 0.035],
    [-0.55, 0],
  ];
  tris.push(
    ...block(0, 1.78, 0, 1.16, 0.05, 0.98, ICE),
    ...block(-0.46, 1.825, -0.36, 0.06, 0.04, 0.06, ZINC),
    ...block(0.46, 1.825, -0.36, 0.06, 0.04, 0.06, ZINC),
    ...block(-0.46, 1.825, 0.36, 0.06, 0.04, 0.06, ZINC),
    ...block(0.46, 1.825, 0.36, 0.06, 0.04, 0.06, ZINC),
    ...shift(extrude(roofPitch, -0.64, 0.64, WHITE), 0, 1.845, -0.02),
    ...block(0, 1.95, -0.04, 1.18, 0.06, 0.68, ICE),
  );

  // Front wooden observer staircase (+z up to 1.06) with stringers & side handrail
  tris.push(
    ...block(0, 0.56, 0.58, 0.68, 0.06, 0.24, WOOD_LIGHT),
    ...block(0, 0.36, 0.74, 0.68, 0.06, 0.24, WOOD_LIGHT),
    ...block(0, 0.16, 0.94, 0.68, 0.06, 0.24, WOOD_LIGHT),
    ...strut([-0.28, 0.02, 1.0], [-0.28, 0.56, 0.5], 0.03, WOOD),
    ...strut([0.28, 0.02, 1.0], [0.28, 0.56, 0.5], 0.03, WOOD),
    // Side handrail on +x side
    ...prism(rect(0.32, 0.96, 0.04, 0.04), 0.04, 0.64, WOOD),
    ...prism(rect(0.32, 0.54, 0.04, 0.04), 0.52, 1.02, WOOD),
    ...strut([0.32, 0.64, 0.96], [0.32, 1.02, 0.54], 0.018, WOOD_LIGHT),
  );

  return tris;
}

/**
 * 4b. Stevenson Screen front door leaf (louvered panel, two left hinges, right hasp latch),
 * with its hinge axis at the origin `(0, y, 0)` so rotating around y swings it open outward.
 */
export function buildStevensonDoorTris(): Tri[] {
  const tris: Tri[] = [
    // Outer frame rails & stiles (spans x = 0..0.88, y = -0.38..+0.38)
    ...block(0.44, 0.355, -0.005, 0.88, 0.05, 0.03, WHITE),
    ...block(0.44, -0.365, -0.005, 0.88, 0.05, 0.03, WHITE),
    ...block(0.03, -0.005, -0.005, 0.06, 0.72, 0.03, WHITE),
    ...block(0.85, -0.005, -0.005, 0.06, 0.72, 0.03, WHITE),
    // Right metal hasp latch & sliding bolt
    ...block(0.84, 0, 0.016, 0.055, 0.09, 0.016, BLACK),
    ...block(0.86, 0, 0.028, 0.07, 0.024, 0.016, ZINC),
    ...block(0.83, -0.02, 0.034, 0.022, 0.036, 0.018, BLACK),
  ];

  // Two left hinges with cylindrical pins centered at x = 0, z = 0
  for (const hy of [0.195, -0.205]) {
    tris.push(
      ...block(0.035, hy, 0.015, 0.07, 0.038, 0.016, BLACK),
      ...lathe(0, 0, [[hy - 0.024, 0.002], [hy - 0.022, 0.014], [hy + 0.022, 0.014], [hy + 0.024, 0]], 6, ZINC),
    );
  }

  // V-shaped chevron louvers spanning between the stiles
  const slat = turn(vSlat(-0.39, 0.39), Math.PI);
  for (let i = 0; i < 6; i++) {
    const sy = -0.335 + i * 0.122;
    tris.push(...shift(slat, 0.44, sy, -0.015));
  }

  return tris;
}

/**
 * 4c. Illustrative 1903 Stevenson screen instruments mounted inside the cabinet:
 * wooden rack with vertical dry-bulb and wet-bulb thermometers (wet-bulb with muslin sleeve,
 * wick and water cup) and horizontal maximum and minimum thermometers.
 * Existence sourced from `obs-instrumental-1903` (Mossman 1907) in `core/content/orcadas.ts`;
 * shapes and arrangement are illustrative.
 */
export function buildStevensonInstrumentsTris(): Tri[] {
  const rackZ = -0.155;
  const boardZ = -0.13;
  const tubeZ = -0.112;

  const tris: Tri[] = [
    // Wooden mounting stand resting on interior floor (y = 1.00)
    ...block(-0.34, 1.015, -0.16, 0.055, 0.03, 0.14, WOOD_LIGHT),
    ...block(0.34, 1.015, -0.16, 0.055, 0.03, 0.14, WOOD_LIGHT),
    ...block(-0.34, 1.33, -0.17, 0.036, 0.66, 0.036, WOOD),
    ...block(0.34, 1.33, -0.17, 0.036, 0.66, 0.036, WOOD),
    ...block(0, 1.62, rackZ, 0.72, 0.034, 0.03, WOOD_LIGHT),
    ...block(0, 1.38, rackZ, 0.72, 0.034, 0.03, WOOD_LIGHT),
    ...block(0, 1.18, rackZ, 0.72, 0.034, 0.03, WOOD_LIGHT),
    // Bracket shelf for the wet-bulb water vessel
    ...block(-0.11, 1.015, -0.115, 0.11, 0.03, 0.11, WOOD),
  ];

  // Vertical dry-bulb (left) and wet-bulb (right) psychrometer thermometers
  const addVerticalThermometer = (x: number, colTopY: number, isWet: boolean) => {
    tris.push(
      ...block(x, 1.40, boardZ, 0.085, 0.42, 0.018, WHITE),
      ...block(x, 1.56, boardZ + 0.01, 0.055, 0.016, 0.012, ZINC),
      ...block(x, 1.24, boardZ + 0.01, 0.055, 0.016, 0.012, ZINC),
      // Mercury column and upper glass stem
      ...block(x, (1.21 + colTopY) / 2, tubeZ, 0.014, colTopY - 1.21, 0.014, ZODIAC_TUBE),
      ...block(x, (colTopY + 1.58) / 2, tubeZ, 0.012, 1.58 - colTopY, 0.012, ICE),
    );
    for (let i = 0; i < 5; i++) {
      const ty = 1.27 + i * 0.068;
      tris.push(
        ...block(x - 0.025, ty, boardZ + 0.011, 0.022, 0.007, 0.005, BLACK),
        ...block(x + 0.025, ty, boardZ + 0.011, 0.022, 0.007, 0.005, BLACK),
      );
    }
    if (isWet) {
      // Muslin-wrapped bulb, wick descending into water vessel, and water cup
      tris.push(
        ...lathe(x, tubeZ, [[1.15, 0.003], [1.162, 0.024], [1.185, 0.028], [1.208, 0.02], [1.218, 0]], 8, CREAM),
        ...strut([x, 1.158, tubeZ], [x, 1.07, tubeZ], 0.007, CREAM, false),
        ...lathe(
          x,
          tubeZ,
          [[1.03, 0.032], [1.045, 0.044], [1.095, 0.048], [1.105, 0.042], [1.105, 0]],
          10,
          (_seg, band) => (band >= 3 ? SKY : ICE_BLUE)
        ),
      );
    } else {
      tris.push(
        ...lathe(x, tubeZ, [[1.155, 0.003], [1.165, 0.02], [1.185, 0.024], [1.205, 0.016], [1.215, 0]], 8, ZODIAC_TUBE),
      );
    }
  };
  addVerticalThermometer(-0.25, 1.47, false);
  addVerticalThermometer(-0.11, 1.43, true);

  // Horizontal maximum (silver mercury) and minimum (red alcohol) thermometers on the right
  const addHorizontalThermometer = (y: number, colEndX: number, colColor: number, hasIndex: boolean) => {
    tris.push(
      ...block(0.17, y, boardZ, 0.29, 0.078, 0.018, WHITE),
      ...block(0.10, y, boardZ + 0.01, 0.016, 0.052, 0.012, ZINC),
      ...block(0.27, y, boardZ + 0.01, 0.016, 0.052, 0.012, ZINC),
      // Liquid column and upper glass stem
      ...block((0.09 + colEndX) / 2, y, tubeZ, colEndX - 0.09, 0.014, 0.014, colColor),
      ...block((colEndX + 0.29) / 2, y, tubeZ, 0.29 - colEndX, 0.012, 0.012, ICE),
      ...shift(
        latheAlongX(lathe(0, 0, [[0.045, 0.003], [0.055, 0.018], [0.072, 0.021], [0.088, 0.014], [0.095, 0]], 8, colColor)),
        0,
        y,
        tubeZ
      ),
    );
    for (let i = 0; i < 5; i++) {
      const tx = 0.115 + i * 0.036;
      tris.push(
        ...block(tx, y + 0.022, boardZ + 0.011, 0.007, 0.02, 0.005, BLACK),
        ...block(tx, y - 0.022, boardZ + 0.011, 0.007, 0.02, 0.005, BLACK),
      );
    }
    if (hasIndex) {
      tris.push(...block(colEndX - 0.015, y, tubeZ, 0.018, 0.016, 0.016, BLACK));
    }
  };
  addHorizontalThermometer(1.50, 0.24, ZODIAC_TUBE, false);
  addHorizontalThermometer(1.28, 0.21, RED, true);

  return tris;
}

/**
 * 5a. Wind Mast fixed base (stepped concrete pad, 4-stage telescopic shaft with collars,
 * 4 guy-wire anchors + thin guy wires, logger box, climbing rungs, cardinal cross-arms).
 */
export function buildWindMastBaseTris(): Tri[] {
  const tris: Tri[] = [
    // Concrete foundation pad sunk into terrain + steel base plate
    ...prism(chamferRect(0, 0, 0.76, 0.76, 0.1), GROUND_SINK, 0.26, ROCK_DARK),
    ...prism(chamferRect(0, 0, 0.5, 0.5, 0.07), 0.26, 0.4, ROCK),
    ...prism(ngon(0, 0, 0.14, 8), 0.4, 0.44, BLACK),
    // 4-stage telescopic mast shaft (black lower, zinc upper up to 4.35)
    ...lathe(0, 0, [[0.42, 0.088], [1.65, 0.084]], 8, BLACK),
    ...lathe(0, 0, [[1.65, 0.072], [2.75, 0.068]], 8, BLACK),
    ...lathe(0, 0, [[2.75, 0.058], [3.65, 0.054]], 8, ZINC),
    ...lathe(0, 0, [[3.65, 0.046], [4.35, 0.04]], 8, ZINC),
    // Telescopic clamp collars at joints
    ...prism(ngon(0, 0, 0.095, 8), 1.62, 1.69, ZINC),
    ...prism(ngon(0, 0, 0.082, 8), 2.72, 2.79, BLACK),
    ...prism(ngon(0, 0, 0.068, 8), 3.62, 3.69, BLACK),
    // Data logger junction box near base with conduit
    ...block(0.16, 1.15, 0, 0.18, 0.34, 0.26, CREAM),
    ...block(0.17, 1.15, 0, 0.18, 0.26, 0.18, ORANGE),
    ...block(0.265, 1.15, 0.06, 0.015, 0.05, 0.025, BLACK),
    ...strut([0.14, 0.42, 0.08], [0.14, 0.98, 0.08], 0.01, ZINC),
    // Fixed cardinal direction cross-arms below the vane
    ...block(0, 3.55, 0, 0.92, 0.042, 0.042, ZINC),
    ...block(0, 3.55, 0, 0.042, 0.042, 0.92, ZINC),
    ...block(0.45, 3.55, 0, 0.05, 0.08, 0.024, RED),
    ...block(-0.45, 3.55, 0, 0.05, 0.08, 0.024, BLACK),
    ...block(0, 3.55, 0.45, 0.024, 0.08, 0.05, BLACK),
    ...block(0, 3.55, -0.45, 0.024, 0.08, 0.05, BLACK),
  ];

  // Climbing rungs up the mast
  for (let i = 0; i < 5; i++) {
    const ry = 0.85 + i * 0.58;
    const side = i % 2 === 0 ? 1 : -1;
    const rz = side * (0.135 - i * 0.008);
    tris.push(...block(0, ry, rz, 0.26 - i * 0.014, 0.036, 0.036, ZINC));
  }

  // 4 guy-wire anchor blocks sunk in ground and thin tensioned guy wires to two collar heights
  for (const [ax, az] of [[-0.65, 0.65], [0.65, -0.65], [-0.65, -0.65], [0.65, 0.65]] as const) {
    tris.push(
      ...prism(chamferRect(ax, az, 0.18, 0.18, 0.03), GROUND_SINK, 0.11, ROCK_DARK),
      ...strut([ax, 0.1, az], [0, 2.05, 0], 0.008, ZINC, false),
      ...strut([ax, 0.1, az], [0, 3.2, 0], 0.007, ZINC, false),
    );
  }

  return tris;
}

/**
 * 5b. Wind Vane (rotates around y at origin; balanced boom with spearhead, counterweight & tail fin).
 */
export function buildWindVaneTris(): Tri[] {
  const tailProfile: [number, number][] = [
    [-0.08, 0],
    [-0.12, 0.16],
    [0.08, 0.14],
    [0.14, 0],
  ];
  return [
    // Central 8-sided rotating spindle collar
    ...lathe(0, 0, [[-0.07, 0.075], [0, 0.08], [0.07, 0.075]], 8, ZINC),
    // Tapered horizontal boom
    ...block(-0.02, 0, 0, 1.14, 0.04, 0.04, BLACK),
    // Teardrop counterweight on pointer side (+x) + pointed arrow spearhead (up to +0.68)
    ...latheAlongX(lathe(0, 0, [[0.34, 0.025], [0.41, 0.068], [0.48, 0.065], [0.52, 0.03]], 8, ZINC)),
    ...latheAlongX(lathe(0, 0, [[0.52, 0.06], [0.68, 0]], 6, RED)),
    // Swept vertical tail fin + twin angled stabilizers (-x to -0.65, y up to 0.17, z ±0.08)
    ...shift(turn(extrude(tailProfile, -0.016, 0.016, BLACK), Math.PI / 2), -0.49, 0.01, 0),
    ...block(-0.57, 0.075, 0.065, 0.16, 0.16, 0.03, ORANGE),
    ...block(-0.57, 0.075, -0.065, 0.16, 0.16, 0.03, ORANGE),
  ];
}

/**
 * 5c. Robinson 3-cup anemometer rotor (rotates around y at origin; 3 hemispherical lathe cups).
 */
export function buildWindCupsTris(): Tri[] {
  const tris: Tri[] = [
    // Central spindle and hub
    ...lathe(0, 0, [[-0.17, 0.042], [0.04, 0.048]], 8, ZINC),
    ...lathe(0, 0, [[0, 0.092], [0.08, 0.08]], 8, BLACK),
  ];

  // Hollow thick-walled hemispherical cup built with lathe (red outside, dark concave bowl inside)
  const cupProfile: readonly [number, number][] = [
    [0, 0.06],
    [0, 0.075],
    [0.032, 0.068],
    [0.058, 0.044],
    [0.07, 0],
    [0.054, 0],
    [0.044, 0.036],
    [0.024, 0.056],
    [0, 0.06],
  ];
  const cup = latheAlongZ(
    lathe(0, 0, cupProfile, 10, (_seg, band) => (band >= 4 ? BLACK : RED))
  );

  // 3 radial arms at 120 deg with bracing gussets and hemispherical cups at radius 0.54
  for (let i = 0; i < 3; i++) {
    const angle = (i * 2 * Math.PI) / 3;
    const arm = turn(
      [
        ...block(0.27, 0.04, 0, 0.48, 0.034, 0.034, BLACK),
        ...block(0.14, 0.04, 0, 0.08, 0.05, 0.05, ZINC),
        ...shift(cup, 0.54, 0.04, 0),
      ],
      angle
    );
    tris.push(...arm);
  }

  return tris;
}

/**
 * 6a. Argentine flagpole base (stepped concrete cairn with plaque, 8-sided tapered mast, golden finial).
 */
export function buildFlagpoleBaseTris(): Tri[] {
  return [
    // Stepped octagonal concrete base sunk into ground
    ...prism(chamferRect(0, 0, 1.32, 1.32, 0.2), GROUND_SINK, 0.2, ROCK_DARK),
    ...prism(chamferRect(0, 0, 1.12, 1.12, 0.16), 0.1, 0.31, ROCK),
    ...prism(chamferRect(0, 0, 0.92, 0.92, 0.14), 0.26, 0.46, SEA_GREY),
    ...prism(chamferRect(0, 0, 0.68, 0.68, 0.1), 0.42, 0.58, ROCK_LIGHT),
    // Faceted cairn boulders around all 4 corners matching footprint (-0.67 to +0.66)
    ...chunk(-0.55, 0.13, 0.52, 0.24, 0.22, 0.24, 19041, ROCK),
    ...chunk(0.52, 0.13, -0.55, 0.24, 0.22, 0.24, 19042, ROCK_DARK),
    ...chunk(-0.54, 0.12, -0.54, 0.24, 0.22, 0.24, 19043, ROCK_DARK),
    ...chunk(0.53, 0.12, 0.53, 0.24, 0.22, 0.24, 19044, ROCK),
    // Mast base collar with bolts and 8-sided tapered flagpole mast
    ...prism(ngon(0, 0, 0.15, 8), 0.58, 0.7, ZINC),
    ...lathe(0, 0, [[0.7, 0.092], [2.35, 0.085], [3.7, 0.072]], 8, WHITE),
    ...lathe(0, 0, [[3.7, 0.072], [4.75, 0.058]], 8, ICE),
    // Cleat & halyard rope
    ...block(0.11, 1.25, 0, 0.08, 0.18, 0.06, BLACK),
    ...block(0.09, 2.65, 0, 0.025, 2.8, 0.025, CREAM),
    // Top pulley truck and golden finial ball (top at y = 5.0)
    ...prism(ngon(0, 0, 0.11, 8), 4.74, 4.82, ZINC),
    ...lathe(0, 0, [[4.8, 0.04], [4.85, 0.1], [4.92, 0.11], [4.98, 0.07], [5.0, 0]], 8, LAMP),
    // Framed commemorative plaque on +z front of cairn
    ...block(0, 0.36, 0.47, 0.32, 0.2, 0.03, ROCK_DARK),
    ...block(0, 0.36, 0.488, 0.28, 0.16, 0.03, ORANGE),
    ...block(0, 0.36, 0.506, 0.22, 0.1, 0.02, BLACK),
  ];
}

/** Total width of the continuous Argentine flag cloth in model units (matches 5 x FLAG_SEGMENT_WIDTH). */
export const FLAG_LENGTH = FLAG_SEGMENT_WIDTH * 5;
/** Half-height of the Argentine flag cloth in model units. */
export const FLAG_HALF_HEIGHT = 0.54;
/** Number of horizontal cloth columns in the continuous flag mesh. */
export const FLAG_COLS = 20;

/**
 * 6b. Argentine flag as one continuous closed low-poly cloth mesh with shared column vertices
 * and a full 360-degree Sol de Mayo on both faces, anchored at x = 0 for vertex-wave deformation.
 */
export function buildFlagTris(): Tri[] {
  const halfT = 0.008;
  const sunClearance = 0.012;
  const bands: readonly [number, number, number][] = [
    [0.18, FLAG_HALF_HEIGHT, SKY],
    [0, 0.18, WHITE],
    [-0.18, 0, WHITE],
    [-FLAG_HALF_HEIGHT, -0.18, SKY],
  ];
  const tris: Tri[] = [];

  for (let i = 0; i < FLAG_COLS; i++) {
    const x0 = (i / FLAG_COLS) * FLAG_LENGTH;
    const x1 = ((i + 1) / FLAG_COLS) * FLAG_LENGTH;
    for (const [y0, y1, color] of bands) {
      // Front (+z) and back (-z) cloth faces sharing exact column boundary vertices
      tris.push(
        ...quad([x0, y0, halfT], [x1, y0, halfT], [x1, y1, halfT], [x0, y1, halfT], color),
        ...quad([x1, y0, -halfT], [x0, y0, -halfT], [x0, y1, -halfT], [x1, y1, -halfT], color)
      );
      if (y1 === FLAG_HALF_HEIGHT) {
        tris.push(...quad([x0, y1, halfT], [x1, y1, halfT], [x1, y1, -halfT], [x0, y1, -halfT], ICE));
      }
      if (y0 === -FLAG_HALF_HEIGHT) {
        tris.push(...quad([x1, y0, halfT], [x0, y0, halfT], [x0, y0, -halfT], [x1, y0, -halfT], color));
      }
    }
  }

  // Hoist (x = 0) and fly (x = FLAG_LENGTH) edge caps closing the continuous cloth slab
  for (const [y0, y1, color] of bands) {
    tris.push(
      ...quad([0, y0, -halfT], [0, y0, halfT], [0, y1, halfT], [0, y1, -halfT], ICE),
      ...quad([FLAG_LENGTH, y0, halfT], [FLAG_LENGTH, y0, -halfT], [FLAG_LENGTH, y1, -halfT], [FLAG_LENGTH, y1, halfT], color)
    );
  }

  // Hoist reinforcement sleeve sitting behind x = 0 so it stays anchored without overlapping cloth
  tris.push(...block(-0.008, 0, 0, 0.016, FLAG_HALF_HEIGHT * 2, 0.032, ICE));

  // Complete 360-degree Sol de Mayo centered in the white stripe on both faces, offset clear of cloth
  const sunX = FLAG_LENGTH / 2;
  const RAYS = 16;
  const discR = 0.064;
  const rayBaseR = 0.06;
  for (const side of [-1, 1] as const) {
    const z = side * (halfT + sunClearance);
    const at = (r: number, a: number): Vec3 => [sunX + Math.cos(a) * r, Math.sin(a) * r, z];
    const face = (t: Tri): Tri => (side > 0 ? t : [t[0], t[2], t[1], t[3]]);
    for (let k = 0; k < RAYS; k++) {
      const a0 = (k / RAYS) * Math.PI * 2;
      const a1 = ((k + 1) / RAYS) * Math.PI * 2;
      tris.push(face([[sunX, 0, z], at(discR, a0), at(discR, a1), ORANGE]));
      const half = Math.PI / RAYS / 2;
      const rayTip = k % 2 ? 0.12 : 0.155;
      tris.push(face([at(rayBaseR, a0 - half), at(rayTip, a0), at(rayBaseR, a0 + half), ORANGE]));
    }
  }

  return tris;
}

/**
 * 7. Station helipad (chamfered concrete slab with expansion joints, painted curb, H + safety circle,
 * 8 edge lights, and windblown snow/gravel along the windward edges).
 */
export function buildHelipadTris(side: number): Tri[] {
  const padH = 0.07;
  const borderH = HELIPAD_TOP_Y - padH;
  const borderW = side * 0.055;
  const chamfer = side * 0.14;
  const hH = 0.014;
  const hY = padH + hH / 2;
  const hLen = side * 0.38;
  const hSpan = side * 0.3;
  const hBar = side * 0.068;
  const edge = side / 2 - borderW / 2;
  const cornerEdge = side / 2 - chamfer * 0.55;
  const lightS = Math.max(0.08, side * 0.032);
  const bulbTop = HELIPAD_TOP_Y + 0.04;

  const tris: Tri[] = [
    // Chamfered octagonal concrete slab sunk slightly into terrain
    ...prism(chamferRect(0, 0, side, side, chamfer), GROUND_SINK, padH, ROCK),
    // Expansion joint grid lines across the poured concrete slab
    ...block(0, padH + 0.002, side * 0.18, side * 0.84, 0.004, 0.018, ROCK_DARK),
    ...block(0, padH + 0.002, -side * 0.18, side * 0.84, 0.004, 0.018, ROCK_DARK),
    ...block(side * 0.18, padH + 0.002, 0, 0.018, 0.004, side * 0.84, ROCK_DARK),
    ...block(-side * 0.18, padH + 0.002, 0, 0.018, 0.004, side * 0.84, ROCK_DARK),
    // Painted perimeter curb along the 4 straight sides
    ...block(0, padH + borderH / 2, edge, side - 2 * chamfer, borderH, borderW, ZODIAC_TUBE),
    ...block(0, padH + borderH / 2, -edge, side - 2 * chamfer, borderH, borderW, ZODIAC_TUBE),
    ...block(edge, padH + borderH / 2, 0, borderW, borderH, side - 2 * chamfer, ZODIAC_TUBE),
    ...block(-edge, padH + borderH / 2, 0, borderW, borderH, side - 2 * chamfer, ZODIAC_TUBE),
  ];

  // Diagonal curb segments along the 4 chamfered corners (orange safety corner accents)
  const diagLen = Math.SQRT2 * chamfer;
  const diagMid = side / 2 - chamfer / 2 - borderW * 0.35;
  for (let i = 0; i < 4; i++) {
    const angle = Math.PI / 4 + (i * Math.PI) / 2;
    tris.push(
      ...turn(block(diagMid * Math.SQRT2, padH + borderH / 2, 0, borderW, borderH, diagLen, ORANGE), angle),
    );
  }

  // Painted circle ring surrounding the central "H"
  const ringSegs = 16;
  const rIn = side * 0.28;
  const rOut = side * 0.325;
  const ringTop = padH + 0.01;
  for (let i = 0; i < ringSegs; i++) {
    const a0 = (i / ringSegs) * Math.PI * 2;
    const a1 = ((i + 1) / ringSegs) * Math.PI * 2;
    const p0: Vec3 = [Math.cos(a0) * rIn, ringTop, Math.sin(a0) * rIn];
    const p1: Vec3 = [Math.cos(a0) * rOut, ringTop, Math.sin(a0) * rOut];
    const p2: Vec3 = [Math.cos(a1) * rOut, ringTop, Math.sin(a1) * rOut];
    const p3: Vec3 = [Math.cos(a1) * rIn, ringTop, Math.sin(a1) * rIn];
    tris.push(...quad(p0, p3, p2, p1, CREAM));
  }

  // White "H" marking
  tris.push(
    ...block(-hSpan / 2 + hBar / 2, hY, 0, hBar, hH, hLen, WHITE),
    ...block(hSpan / 2 - hBar / 2, hY, 0, hBar, hH, hLen, WHITE),
    ...block(0, hY, 0, hSpan - 2 * hBar, hH, hBar, WHITE),
  );

  // 8 edge lights (4 side midpoints + 4 chamfer corners)
  const lights: readonly [number, number][] = [
    [0, -edge],
    [0, edge],
    [-edge, 0],
    [edge, 0],
    [-cornerEdge, -cornerEdge],
    [cornerEdge, -cornerEdge],
    [-cornerEdge, cornerEdge],
    [cornerEdge, cornerEdge],
  ];
  for (const [lx, lz] of lights) {
    tris.push(
      ...prism(ngon(lx, lz, lightS * 0.72, 6), HELIPAD_TOP_Y, HELIPAD_TOP_Y + 0.014, BLACK),
      ...lathe(lx, lz, [[HELIPAD_TOP_Y + 0.014, lightS * 0.52], [bulbTop - 0.008, lightS * 0.48], [bulbTop, 0]], 6, LAMP),
    );
  }

  // Windblown snow drift and gravel stones banked along the windward (-z and -x) apron edges
  tris.push(
    ...chunk(-side * 0.2, 0.025, -side * 0.48, 0.42, 0.09, 0.08, 19081, ICE),
    ...chunk(side * 0.14, 0.02, -side * 0.48, 0.34, 0.08, 0.07, 19082, WHITE),
    ...chunk(-side * 0.48, 0.02, -side * 0.12, 0.08, 0.08, 0.36, 19083, ICE),
    ...chunk(side * 0.32, 0.018, side * 0.48, 0.16, 0.05, 0.07, 19084, GRAVEL_DARK),
    ...chunk(-side * 0.34, 0.018, side * 0.48, 0.14, 0.05, 0.06, 19085, ROCK_DARK),
  );

  return tris;
}

import {
  createSeededRng,
  MARAMBIO_GROUND_Y,
  MARAMBIO_HERCULES,
  MARAMBIO_LAYOUT,
  MARAMBIO_RUNWAY_HALF_LENGTH,
  MARAMBIO_RUNWAY_WIDTH,
  MARAMBIO_RUNWAY_Z,
  MARAMBIO_TAXIWAY,
  MARAMBIO_TAXIWAY_WIDTH,
  marambioLayoutOf,
  marambioPlateauDistance,
} from '@antartida/core';
import { chunk, lathe, normalOf, prism, shift, turn, type Tri, type Vec3 } from '../voyage/lowPoly.ts';
import { VOXEL_PALETTE } from '../orcadas/stationModels.ts';
import { MARAMBIO_WALKWAYS, offsetPath } from './lowPolyMarambio.ts';

/**
 * Ground of the Base Marambio diorama, in world coordinates of the stage (y up, sea at y = 0): the
 * plateau with its scarps, what lies on it (runway, taxiway, apron) and loose rocks and snow.
 * Illustrative: the real plateau is bare permafrost and gravel about 200 m over the sea, far wider
 * than the stage; its rim, the scarps and every streak of snow are drawn, not surveyed.
 */

const { WHITE, ICE, ROCK_DARK, RED, SEA_GREY, WOOD, WOOD_LIGHT, BLACK } = VOXEL_PALETTE;

/** Bare permafrost and gravel of the plateau: three close brown-greys. */
const PERMAFROST = 0x6f6259;
const PERMAFROST_DARK = 0x5f544c;
const PERMAFROST_LIGHT = 0x7d7067;
/** Rock of the scarps, darker than the top, and their ledges. */
const SCARP_ROCK = 0x4d4642;
const SCARP_ROCK_DARK = 0x3d3835;
const SCARP_LEDGE = 0x5e5650;
/** Loose debris at the foot of the scarps. */
const SCREE = 0x756b62;
const SCREE_DARK = 0x5a524b;
/** Graded gravel of the runway, a little lighter and more even than the ground, and its wheel tracks. */
const RUNWAY_GRAVEL = 0x8a7e73;
const RUNWAY_GRAVEL_B = 0x867a6f;
const RUNWAY_TRACK = 0x766b61;
const TAXIWAY_GRAVEL = 0x7f7469;
/** Pale pad of the apron and its border. */
const APRON_GREY = 0xb5b3ad;
const APRON_GREY_B = 0xafada7;
const APRON_EDGE = 0x96938d;
/** Fluorescent orange of the pallets that mark the ends of the runway. */
export const MARAMBIO_PALLET_ORANGE = 0xff6a13;
const EDGE_MARKER = RED;

/**
 * The ground is exactly flat from this distance inside the rim. Every corner of what is built and
 * the whole runway are farther in than this (the ends of the runway come within 2.4 of the rim).
 */
export const MARAMBIO_FLAT_FROM = 2;
/** How far the top has sagged at the rim, how far out the scarp runs and where it ends under the sea. */
const RIM_DROP = 0.3;
const SCARP_RUN = 9;
const SEA_FLOOR_Y = -1.2;
const LEDGES = 3;
const LEDGE_DEPTH = 0.75;

type XZ = readonly [number, number];

/** A fixed pseudo-random value in [0, 1) for each point of the integer lattice. */
function lattice(i: number, j: number): number {
  let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smooth noise in [0, 1) over the plane. */
function valueNoise(x: number, z: number): number {
  const i = Math.floor(x);
  const j = Math.floor(z);
  const fx = x - i;
  const fz = z - j;
  const sx = fx * fx * (3 - 2 * fx);
  const sz = fz * fz * (3 - 2 * fz);
  const a = lattice(i, j) + (lattice(i + 1, j) - lattice(i, j)) * sx;
  const b = lattice(i, j + 1) + (lattice(i + 1, j + 1) - lattice(i, j + 1)) * sx;
  return a + (b - a) * sz;
}

/**
 * Height of the ground at a point of the stage: the flat top of the plateau, a slightly uneven
 * shoulder towards the rim, then a steep scarp with ledges that eases into scree and ends under
 * the sea. The one height everything on the stage stands on.
 */
export function marambioGroundHeight(x: number, z: number): number {
  const d = marambioPlateauDistance(x, z);
  if (d >= MARAMBIO_FLAT_FROM) return MARAMBIO_GROUND_Y;
  const rimY = MARAMBIO_GROUND_Y - RIM_DROP * (0.55 + 0.9 * valueNoise(x * 0.45, z * 0.45));
  if (d >= 0) {
    const t = 1 - d / MARAMBIO_FLAT_FROM;
    return MARAMBIO_GROUND_Y + (rimY - MARAMBIO_GROUND_Y) * t * t;
  }
  const f = Math.min(1, -d / SCARP_RUN);
  // Steep under the rim, easing out at the foot; the sine cuts ledges without ever climbing back.
  const fall = 1 - (1 - f) ** 1.9;
  const phase = valueNoise(x * 0.11 + 7, z * 0.11 + 3);
  const stepped = fall + (LEDGE_DEPTH * (Math.sin(2 * Math.PI * (LEDGES * fall + phase)) - Math.sin(2 * Math.PI * phase))) / (2 * Math.PI * LEDGES);
  const rough = (valueNoise(x * 0.9 + 31, z * 0.9 + 17) - 0.5) * 0.5 * Math.sin(Math.PI * f);
  return rimY + (SEA_FLOOR_Y - rimY) * stepped + rough;
}

/** A flat convex polygon of [x, z] corners at height `y`, facing up whatever its winding. */
function flatPoly(ring: readonly XZ[], y: number, color: number): Tri[] {
  const n = ring.length;
  const area = ring.reduce((sum, [x, z], i) => sum + x * ring[(i + 1) % n][1] - ring[(i + 1) % n][0] * z, 0);
  const r = area > 0 ? [...ring].reverse() : ring;
  const out: Tri[] = [];
  for (let i = 1; i < n - 1; i++) out.push([[r[0][0], y, r[0][1]], [r[i][0], y, r[i][1]], [r[i + 1][0], y, r[i + 1][1]], color]);
  return out;
}

/** A band of half width `halfWidth` along a polyline, moved sideways by `offset`, with mitred corners. */
function band(points: readonly XZ[], offset: number, halfWidth: number, y: number, color: number): Tri[] {
  const left = offsetPath(points, offset + halfWidth);
  const right = offsetPath(points, offset - halfWidth);
  const out: Tri[] = [];
  for (let i = 0; i < points.length - 1; i++) out.push(...flatPoly([left[i], left[i + 1], right[i + 1], right[i]], y, color));
  return out;
}

/** Grid lines from `lo` to `hi`: close together outside [fineLo, fineHi], where the rim is, and wide between. */
function gridLines(lo: number, fineLo: number, fineHi: number, hi: number, fine: number, coarse: number): number[] {
  const out: number[] = [];
  const stretch = (a: number, b: number, step: number) => {
    const n = Math.max(1, Math.round((b - a) / step));
    for (let i = 0; i < n; i++) out.push(a + ((b - a) * i) / n);
  };
  stretch(lo, fineLo, fine);
  stretch(fineLo, fineHi, coarse);
  stretch(fineHi, hi, fine);
  out.push(hi);
  return out;
}

/** The mesh reaches past the foot of every scarp (the rim stays within 52.3 of the middle in x, and between z = -29.1 and 42.6). */
const MESH_X = 62;
const MESH_Z0 = -39.5;
const MESH_Z1 = 53;
const GROUND_SEED = 7401;
/** Direction the snow streaks and drifts run along, on the stage [x, z]. Illustrative. */
const WIND: XZ = [Math.cos((20 * Math.PI) / 180), Math.sin((20 * Math.PI) / 180)];
/** Snow streaks lie this far over the ground, under the runway and the apron. */
const STREAK_LIFT = 0.006;

const TAXIWAY_LIFT = 0.012;
const TAXIWAY_TRACK_LIFT = 0.016;
const RUNWAY_LIFT = 0.021;
const RUNWAY_TRACK_LIFT = 0.026;
const APRON_EDGE_LIFT = 0.021;
const APRON_LIFT = 0.026;
/** Half the distance between the main wheels of the aircraft that leave the tracks. Illustrative. */
const TRACK_HALF_GAUGE = 0.62;

/** The taxiway centreline, run on under the apron so the two overlap. */
const taxiwayLine = (): [number, number][] => {
  const pts = MARAMBIO_TAXIWAY.map(([x, z]): [number, number] => [x, z]);
  const [ax, az] = pts[pts.length - 2];
  const [bx, bz] = pts[pts.length - 1];
  const l = Math.hypot(bx - ax, bz - az);
  pts[pts.length - 1] = [bx + (bx - ax) / l, bz + (bz - az) / l];
  return pts;
};

/** Distance from a point to a rectangle turned by `rotationY` (0 inside it). */
function rectDistance(x: number, z: number, cx: number, cz: number, halfX: number, halfZ: number, rotationY: number): number {
  const c = Math.cos(rotationY);
  const s = Math.sin(rotationY);
  const lx = (x - cx) * c - (z - cz) * s;
  const lz = (x - cx) * s + (z - cz) * c;
  return Math.hypot(Math.max(Math.abs(lx) - halfX, 0), Math.max(Math.abs(lz) - halfZ, 0));
}

function pathDistance(x: number, z: number, path: readonly XZ[]): number {
  let best = Infinity;
  for (let i = 0; i < path.length - 1; i++) {
    const [ax, az] = path[i];
    const [bx, bz] = path[i + 1];
    const l2 = (bx - ax) ** 2 + (bz - az) ** 2;
    const t = l2 ? Math.min(1, Math.max(0, ((x - ax) * (bx - ax) + (z - az) * (bz - az)) / l2)) : 0;
    best = Math.min(best, Math.hypot(x - ax - (bx - ax) * t, z - az - (bz - az) * t));
  }
  return best;
}

/** Distance to the runway, the taxiway or the apron (0 on them). */
function surfaceDistance(x: number, z: number): number {
  const apron = marambioLayoutOf('apron');
  return Math.min(
    rectDistance(x, z, 0, MARAMBIO_RUNWAY_Z, MARAMBIO_RUNWAY_HALF_LENGTH, MARAMBIO_RUNWAY_WIDTH / 2, 0),
    rectDistance(x, z, apron.position[0], apron.position[2], apron.footprint[0] / 2, apron.footprint[1] / 2, apron.rotationY),
    Math.max(0, pathDistance(x, z, taxiwayLine()) - MARAMBIO_TAXIWAY_WIDTH / 2)
  );
}

/** Plan of the parked aircraft, in world units: [along its nose, across its wings]. Rounded up from the model. */
const HERCULES_PLAN: XZ = [8.5, 11.5];
/** What stands out of the measured plan of an element: the tower of the terminal, the ramp and snow of the hangar, the drums by the apron, stairs and drifts of the modules. */
const planMargin = (id: string) => (id === 'terminal' ? 1.4 : id === 'apron' ? 1.4 : id === 'hangar' ? 0.8 : 0.3);

/** Distance to the nearest thing built or parked on the plateau (0 on it). */
function builtDistance(x: number, z: number): number {
  let best = Math.max(0, pathDistance(x, z, taxiwayLine()) - MARAMBIO_TAXIWAY_WIDTH / 2);
  for (const e of MARAMBIO_LAYOUT) {
    best = Math.min(best, Math.max(0, rectDistance(x, z, e.position[0], e.position[2], e.footprint[0] / 2, e.footprint[1] / 2, e.rotationY) - planMargin(e.id)));
  }
  const h = MARAMBIO_HERCULES;
  best = Math.min(best, rectDistance(x, z, h.position[0], h.position[2], HERCULES_PLAN[0] / 2, HERCULES_PLAN[1] / 2, h.rotationY));
  for (const line of MARAMBIO_WALKWAYS) best = Math.min(best, Math.max(0, pathDistance(x, z, line) - 0.225));
  return best;
}

/**
 * The plateau and its scarps as irregular facets: brown-grey permafrost on top with thin streaks of
 * snow along the wind, darker rock on the scarps with snow on the ledges, scree at the foot. It
 * ends under the sea all round.
 */
export function buildMarambioGroundTris(): Tri[] {
  const rng = createSeededRng(GROUND_SEED);
  const xs = gridLines(-MESH_X, -43, 43, MESH_X, 0.95, 2.8);
  const zs = gridLines(MESH_Z0, -22, 34.5, MESH_Z1, 0.95, 2.8);
  const pts: Vec3[][] = xs.map((x0, i) =>
    zs.map((z0, j) => {
      const edge = i === 0 || j === 0 || i === xs.length - 1 || j === zs.length - 1;
      // Inner corners are moved within their cell so the facets are irregular; never far enough to fold one.
      const x = edge ? x0 : x0 + (rng() - 0.5) * 0.6 * Math.min(x0 - xs[i - 1], xs[i + 1] - x0);
      const z = edge ? z0 : z0 + (rng() - 0.5) * 0.6 * Math.min(z0 - zs[j - 1], zs[j + 1] - z0);
      return [x, marambioGroundHeight(x, z), z];
    })
  );

  const tone = createSeededRng(GROUND_SEED + 1);
  const colourOf = (a: Vec3, b: Vec3, c: Vec3): number => {
    const mx = (a[0] + b[0] + c[0]) / 3;
    const my = (a[1] + b[1] + c[1]) / 3;
    const mz = (a[2] + b[2] + c[2]) / 3;
    const up = normalOf([a, b, c, 0])[1];
    const r = tone();
    if (marambioPlateauDistance(mx, mz) >= 0 && up > 0.9) {
      const t = valueNoise(mx * 0.16 + 11, mz * 0.16 + 5) + (r - 0.5) * 0.3;
      return t < 0.4 ? PERMAFROST_DARK : t < 0.66 ? PERMAFROST : PERMAFROST_LIGHT;
    }
    if (my < 1.1) return my < 0.3 || r < 0.4 ? SCREE_DARK : SCREE;
    // Snow holds on the ledges, not on the walls.
    if (up > 0.8) return r < 0.55 ? (r < 0.3 ? WHITE : ICE) : SCARP_LEDGE;
    return r < 0.45 ? SCARP_ROCK_DARK : SCARP_ROCK;
  };

  const out: Tri[] = [];
  const face = (a: Vec3, b: Vec3, c: Vec3) => out.push([a, b, c, colourOf(a, b, c)]);
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < zs.length - 1; j++) {
      const a = pts[i][j];
      const b = pts[i + 1][j];
      const c = pts[i + 1][j + 1];
      const e = pts[i][j + 1];
      // Nothing to draw where the ground has already reached its floor under the sea.
      if (Math.max(a[1], b[1], c[1], e[1]) <= SEA_FLOOR_Y + 1e-9) continue;
      // Alternating diagonals, so the facets do not all lean the same way.
      if ((i + j) % 2) {
        face(a, e, c);
        face(a, c, b);
      } else {
        face(a, e, b);
        face(b, e, c);
      }
    }
  }

  // Thin streaks of snow lying along the wind on the bare top.
  const streak = createSeededRng(GROUND_SEED + 2);
  // Streaks already laid: they all lie at one height, so two that overlap would flicker.
  const laid: { x: number; z: number; len: number }[] = [];
  let placed = 0;
  for (let attempt = 0; attempt < 600 && placed < 120; attempt++) {
    const x = (streak() * 2 - 1) * 50;
    const z = -26 + streak() * 66;
    const len = 1.2 + streak() * 3.6;
    const w = 0.1 + streak() * 0.26;
    const colour = streak() < 0.6 ? WHITE : ICE;
    const at = (l: number, s: number): [number, number] => [x + WIND[0] * l - WIND[1] * s, z + WIND[1] * l + WIND[0] * s];
    const clear = [-0.5, -0.25, 0, 0.25, 0.5].every((k) => {
      const [px, pz] = at(len * k, 0);
      return marambioPlateauDistance(px, pz) >= MARAMBIO_FLAT_FROM + 0.4 && surfaceDistance(px, pz) > 0.4;
    });
    if (!clear) continue;
    if (laid.some((o) => Math.hypot(o.x - x, o.z - z) < (o.len + len) / 2)) continue;
    laid.push({ x, z, len });
    out.push(
      ...flatPoly(
        [at(-len / 2, 0), at(-len / 4, w / 2), at(len / 5, w * 0.35), at(len / 2, 0), at(len / 5, -w * 0.35), at(-len / 4, -w / 2)],
        MARAMBIO_GROUND_Y + STREAK_LIFT,
        colour
      )
    );
    placed++;
  }
  return out;
}

/**
 * What lies on the plateau, each layer a hair over the one under it: the taxiway, the runway with
 * its wheel tracks, the pallets across its ends and its edge markers, the apron and a few drums and
 * crates beside it. The runway is drawn with no painted centreline, with fluorescent orange pallets
 * across its ends and movable markers along its edges. That follows a press interview (DEF Online,
 * 6 Jan 2024) that was not opened when the sources were verified, so it is illustrative, not a
 * sourced fact (docs/expediciones/base-marambio.md, «Pendientes»). The count and place of pallets,
 * markers, drums and crates are illustrative too.
 */
export function buildMarambioSurfacesTris(): Tri[] {
  const G = MARAMBIO_GROUND_Y;
  const rng = createSeededRng(GROUND_SEED + 3);
  const out: Tri[] = [];

  const taxiway = taxiwayLine();
  out.push(...band(taxiway, 0, MARAMBIO_TAXIWAY_WIDTH / 2, G + TAXIWAY_LIFT, TAXIWAY_GRAVEL));
  for (const side of [1, -1]) out.push(...band(taxiway, side * TRACK_HALF_GAUGE, 0.08, G + TAXIWAY_TRACK_LIFT, RUNWAY_TRACK));

  // Runway: panels of two close tones, so the strip is even but not one flat sheet.
  const half = MARAMBIO_RUNWAY_HALF_LENGTH;
  const z0 = MARAMBIO_RUNWAY_Z - MARAMBIO_RUNWAY_WIDTH / 2;
  const PANELS = 23;
  const LANES = 3;
  for (let i = 0; i < PANELS; i++) {
    for (let j = 0; j < LANES; j++) {
      const xa = -half + (i * 2 * half) / PANELS;
      const xb = -half + ((i + 1) * 2 * half) / PANELS;
      const za = z0 + (j * MARAMBIO_RUNWAY_WIDTH) / LANES;
      const zb = z0 + ((j + 1) * MARAMBIO_RUNWAY_WIDTH) / LANES;
      out.push(...flatPoly([[xa, za], [xa, zb], [xb, zb], [xb, za]], G + RUNWAY_LIFT, rng() < 0.5 ? RUNWAY_GRAVEL : RUNWAY_GRAVEL_B));
    }
  }
  // Wheel tracks of two landings, in broken stretches.
  for (const [aside, from, to] of [[0, -40, 41], [0.9, -33, 28]] as const) {
    for (const side of [1, -1]) {
      const z = MARAMBIO_RUNWAY_Z + aside + side * TRACK_HALF_GAUGE;
      let x = from + rng() * 3;
      while (x < to) {
        const len = Math.min(to - x, 6 + rng() * 9);
        out.push(...flatPoly([[x, z - 0.08], [x, z + 0.08], [x + len, z + 0.08], [x + len, z - 0.08]], G + RUNWAY_TRACK_LIFT, RUNWAY_TRACK));
        x += len + 1 + rng() * 2.5;
      }
    }
  }
  // Pallets across both ends, lying on the gravel.
  const PALLETS = 6;
  for (const end of [-1, 1]) {
    for (let k = 0; k < PALLETS; k++) {
      const z = z0 + ((k + 0.5) * MARAMBIO_RUNWAY_WIDTH) / PALLETS;
      const x = end * (half - 0.6);
      out.push(...prism([[x - 0.15, z - 0.17], [x + 0.15, z - 0.17], [x + 0.15, z + 0.17], [x - 0.15, z + 0.17]], G + RUNWAY_LIFT, G + RUNWAY_LIFT + 0.05, MARAMBIO_PALLET_ORANGE));
    }
  }
  // Edge markers on the ground beside the strip.
  for (let x = -44; x <= 44; x += 4) {
    for (const side of [1, -1]) {
      const z = MARAMBIO_RUNWAY_Z + side * (MARAMBIO_RUNWAY_WIDTH / 2 + 0.25);
      // None in the mouth of the taxiway.
      if (pathDistance(x, z, taxiway) < MARAMBIO_TAXIWAY_WIDTH / 2 + 0.3) continue;
      out.push(...prism([[x - 0.07, z - 0.07], [x + 0.07, z - 0.07], [x + 0.07, z + 0.07], [x - 0.07, z + 0.07]], G, G + 0.1, EDGE_MARKER));
    }
  }

  // Apron: a darker border and the pale pad inside it, in slabs of two close tones.
  const apron = marambioLayoutOf('apron');
  const c = Math.cos(apron.rotationY);
  const s = Math.sin(apron.rotationY);
  const world = (lx: number, lz: number): [number, number] => [apron.position[0] + lx * c + lz * s, apron.position[2] - lx * s + lz * c];
  const hx = apron.footprint[0] / 2;
  const hz = apron.footprint[1] / 2;
  out.push(...flatPoly([world(-hx, -hz), world(hx, -hz), world(hx, hz), world(-hx, hz)], G + APRON_EDGE_LIFT, APRON_EDGE));
  const BORDER = 0.3;
  const SLABS_X = 4;
  const SLABS_Z = 3;
  for (let i = 0; i < SLABS_X; i++) {
    for (let j = 0; j < SLABS_Z; j++) {
      const xa = -hx + BORDER + (i * 2 * (hx - BORDER)) / SLABS_X;
      const xb = -hx + BORDER + ((i + 1) * 2 * (hx - BORDER)) / SLABS_X;
      const za = -hz + BORDER + (j * 2 * (hz - BORDER)) / SLABS_Z;
      const zb = -hz + BORDER + ((j + 1) * 2 * (hz - BORDER)) / SLABS_Z;
      out.push(...flatPoly([world(xa, za), world(xb, za), world(xb, zb), world(xa, zb)], G + APRON_LIFT, (i + j) % 2 ? APRON_GREY_B : APRON_GREY));
    }
  }

  // Fuel drums and crates on the bare ground beside the apron, clear of the parked aircraft.
  const propsZ = -hz - 0.9;
  const drums: readonly (readonly [number, number, number])[] = [
    [5.0, 0, RED], [5.21, 0.02, SEA_GREY], [5.42, -0.01, RED], [5.1, 0.2, SEA_GREY], [5.32, 0.21, BLACK],
  ];
  for (const [lx, dz, colour] of drums) {
    const [x, z] = world(lx, propsZ + dz);
    out.push(...lathe(x, z, [[G, 0.085], [G + 0.25, 0.085]], 6, colour));
  }
  for (const [lx, size, height] of [[6.3, 0.34, 0.28], [6.8, 0.26, 0.2]] as const) {
    out.push(
      ...prism(
        [world(lx - size / 2, propsZ - size / 2), world(lx + size / 2, propsZ - size / 2), world(lx + size / 2, propsZ + size / 2), world(lx - size / 2, propsZ + size / 2)],
        G,
        G + height,
        WOOD_LIGHT,
        WOOD
      )
    );
  }
  return out;
}

/** Rocks and drifts keep this far from everything built, parked or graded. */
const ROCK_CLEARANCE = 0.6;

/**
 * Loose rocks and small drifts of snow scattered on the bare top of the plateau, clear of the
 * buildings, the runway, the taxiway, the apron, the walkways and the parked aircraft. Illustrative.
 */
export function buildMarambioRocksTris(): Tri[] {
  const rng = createSeededRng(GROUND_SEED + 4);
  const out: Tri[] = [];
  const rockColours = [SCARP_ROCK, PERMAFROST_DARK, ROCK_DARK, SCARP_LEDGE];
  const windAngle = -Math.atan2(WIND[1], WIND[0]);
  let rocks = 0;
  let drifts = 0;
  for (let attempt = 0; attempt < 1500 && (rocks < 85 || drifts < 30); attempt++) {
    const x = (rng() * 2 - 1) * 48;
    const z = -25 + rng() * 63;
    const size = 0.12 + rng() * 0.3;
    const isDrift = rng() < 0.3;
    const seed = GROUND_SEED + 100 + attempt;
    // A drift is longer than a rock, so it needs more room; it lies only where the ground is flat.
    const reach = isDrift ? size * 2.2 : size * 0.7;
    if (marambioPlateauDistance(x, z) < (isDrift ? MARAMBIO_FLAT_FROM : 0.8) + reach) continue;
    if (builtDistance(x, z) < ROCK_CLEARANCE + reach) continue;
    const y = marambioGroundHeight(x, z);
    if (isDrift) {
      if (drifts >= 30) continue;
      const sy = 0.06 + size * 0.2;
      out.push(...shift(turn(chunk(0, 0, 0, size * 4, sy, size * 1.2, seed, rng() < 0.6 ? WHITE : ICE), windAngle), x, y + sy * 0.15, z));
      drifts++;
    } else {
      if (rocks >= 85) continue;
      const sy = size * (0.5 + rng() * 0.4);
      out.push(...chunk(x, y + sy * 0.2, z, size * (0.9 + rng() * 0.5), sy, size * (0.8 + rng() * 0.4), seed, rockColours[Math.floor(rng() * rockColours.length)]));
      rocks++;
    }
  }
  return out;
}

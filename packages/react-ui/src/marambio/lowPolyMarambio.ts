import { createSeededRng, DIORAMA_METERS_PER_UNIT, MARAMBIO_GROUND_Y, marambioLayoutOf } from '@antartida/core';
import { block, lathe, ngon, prism, quad, rect, strut, type Tri, type Vec3 } from '../voyage/lowPoly.ts';
import { buildModuleTris } from '../orcadas/lowPolyBuildings.ts';
import { OSM_ORANGE, VOXEL_PALETTE } from '../orcadas/stationModels.ts';

/**
 * Low-poly models of the Base Marambio diorama that are not the generic modules nor the aircraft:
 * the arched hangar, the passenger terminal with its control tower and the raised metal walkways.
 * Buildings follow the Orcadas convention: long side along local x, base at y = 0, centred on the
 * origin. Their plans are measured (marambio-site.ts); everything else here is drawn from the
 * reference photos and is illustrative.
 */

const { BLACK, WHITE, ICE, ROCK, ROCK_DARK, ROCK_LIGHT, RED, RED_DARK, CREAM, ZINC, WINDOW_DAY, ZODIAC_TUBE } = VOXEL_PALETTE;

/** Foundations sink this far so nothing floats over the ground (as in lowPolyBuildings.ts). */
const GROUND_SINK = -0.015;

/** Second tone of the hangar's sheet panels, so neighbouring bays read as separate panels. */
const HANGAR_PANEL_SHADE = 0xe63e00;
/** Standing ribs of the vault. */
const HANGAR_RIB = RED_DARK;
/** What shows through the open hangar door. */
export const HANGAR_INTERIOR = 0x161c24;
/** Sliding leaves of the hangar door, lighter than the walls. */
const HANGAR_DOOR = 0xcfc9bb;
/** Shaft of the control tower. */
const TOWER_RED = RED;
/** Tinted glazing of the control cab. */
export const TOWER_GLASS = 0x243746;
const WALKWAY_DECK = ZINC;
const WALKWAY_RAIL = ZODIAC_TUBE;

/** How far the ribs stand off the skin of the vault. */
const RIB_LIFT = 0.02;
const RIB_WIDTH = 0.07;
/** The gable walls sit this far inside the ends of the vault, so its edge casts a rim. */
const GABLE_INSET = 0.04;
/** Where the side door of the hangar is along its length, as a fraction from the centre towards +x. */
const HANGAR_SIDE_DOOR_T = 0.1;

const hangarBays = (length: number) => Math.max(4, Math.round(length / 0.62));

/** Local x of the personnel door on the +z wall of a hangar of this length: the middle of a bay, clear of the ribs. */
export function hangarSideDoorX(length: number): number {
  const bays = hangarBays(length);
  const bay = Math.min(bays - 1, Math.floor((0.5 + HANGAR_SIDE_DOOR_T) * bays));
  return -length / 2 + ((bay + 0.5) * length) / bays;
}

/** Strokes of each letter in a unit box: [u0, v0, u1, v1], u to the reader's right, v up. */
type Stroke = readonly [number, number, number, number];
const GLYPHS: Readonly<Record<string, readonly Stroke[]>> = {
  M: [[0, 0, 0, 1], [0, 1, 0.5, 0.4], [0.5, 0.4, 1, 1], [1, 1, 1, 0]],
  A: [[0, 0, 0.5, 1], [0.5, 1, 1, 0], [0.22, 0.42, 0.78, 0.42]],
  R: [[0, 0, 0, 1], [0, 1, 1, 1], [1, 1, 1, 0.52], [1, 0.52, 0, 0.52], [0.4, 0.52, 1, 0]],
  B: [[0, 0, 0, 1], [0, 1, 0.85, 1], [0.85, 1, 0.85, 0.52], [0, 0.52, 1, 0.52], [1, 0.52, 1, 0], [1, 0, 0, 0]],
  I: [[0, 0, 0, 1]],
  O: [[0, 0, 0, 1], [0, 1, 1, 1], [1, 1, 1, 0], [1, 0, 0, 0]],
};
const SIGN = 'MARAMBIO';

/**
 * Block letters on a wall that faces +x, standing off it. Someone looking at that wall from outside
 * has -z to the right, so the text advances towards -z. Returns null when it does not fit in
 * `maxHalfWidth`.
 */
function signTris(wallX: number, baseY: number, letterH: number, maxHalfWidth: number): Tri[] | null {
  const letterW = letterH * 0.72;
  const gap = letterH * 0.3;
  const r = letterH * 0.065;
  const widths = [...SIGN].map((ch) => (ch === 'I' ? 0 : letterW));
  const total = widths.reduce((s, w) => s + w, 0) + gap * (SIGN.length - 1);
  if (total / 2 + r > maxHalfWidth) return null;
  const out: Tri[] = [];
  // The back of every stroke is just inside the wall, so no face lies on it.
  const x = wallX + r - 0.004;
  let u = 0;
  [...SIGN].forEach((ch, i) => {
    for (const [u0, v0, u1, v1] of GLYPHS[ch]) {
      const a: Vec3 = [x, baseY + v0 * letterH, total / 2 - (u + u0 * widths[i])];
      const b: Vec3 = [x, baseY + v1 * letterH, total / 2 - (u + u1 * widths[i])];
      // Strokes run past their ends by half their width, so corners close.
      const l = Math.hypot(b[1] - a[1], b[2] - a[2]);
      const ey = ((b[1] - a[1]) / l) * r;
      const ez = ((b[2] - a[2]) / l) * r;
      out.push(...strut([x, a[1] - ey, a[2] - ez], [x, b[1] + ey, b[2] + ez], r, WHITE));
    }
    u += widths[i] + gap;
  });
  return out;
}

/**
 * The hangar: a barrel vault of ribbed orange-red panels on a low kerb, long axis x. The big door
 * is in the gable at +x, half open, with MARAMBIO over it; a personnel door and small windows on
 * the long walls, and snow banked on the windward (-z) side. Its plan is measured (OpenStreetMap);
 * the height, the door, the ribs and the sign are read from reference photos, not measured.
 */
export function buildHangarTris(length: number, width: number, height: number): Tri[] {
  const hl = length / 2;
  const hw = width / 2;
  const kerbH = Math.min(0.1, height * 0.05);
  const springY = kerbH + height * 0.23;
  const rise = height - RIB_LIFT - springY;
  const ARC = 12;
  // Section from the +z foot over the crown to the -z foot: a short upright wall, then the arch.
  const profile: [number, number][] = [[hw, kerbH]];
  for (let k = 0; k <= ARC; k++) {
    const a = (k / ARC) * Math.PI;
    profile.push([Math.cos(a) * hw, springY + Math.sin(a) * rise]);
  }
  profile.push([-hw, kerbH]);
  const last = profile.length - 1;
  const ribProfile = profile.map(([z, y], k): [number, number] =>
    k === 0 || k === last ? [z + Math.sign(z) * RIB_LIFT, y] : [(z * (hw + RIB_LIFT)) / hw, springY + ((y - springY) * (rise + RIB_LIFT)) / rise]
  );
  const skin = (section: readonly (readonly [number, number])[], x0: number, x1: number, color: number): Tri[] => {
    const out: Tri[] = [];
    for (let k = 0; k < last; k++) {
      const [az, ay] = section[k];
      const [bz, by] = section[k + 1];
      out.push(...quad([x1, ay, az], [x1, by, bz], [x0, by, bz], [x0, ay, az], color));
    }
    return out;
  };

  const tris: Tri[] = [
    // Concrete kerb the vault stands on, sunk into the ground.
    ...prism(rect(0, 0, length + 0.1, width + 0.1), GROUND_SINK, kerbH, ROCK),
  ];

  const bays = hangarBays(length);
  const bayW = length / bays;
  for (let i = 0; i < bays; i++) {
    tris.push(...skin(profile, -hl + i * bayW, -hl + (i + 1) * bayW, i % 2 ? HANGAR_PANEL_SHADE : OSM_ORANGE));
  }
  for (let i = 0; i <= bays; i++) {
    const x = -hl + i * bayW;
    const x0 = i === 0 ? -hl : i === bays ? hl - RIB_WIDTH : x - RIB_WIDTH / 2;
    tris.push(...skin(ribProfile, x0, x0 + RIB_WIDTH, HANGAR_RIB));
  }

  // Gable walls: a fan over the section.
  const midY = (kerbH + height) / 2;
  const xFront = hl - GABLE_INSET;
  const xBack = -hl + GABLE_INSET;
  for (let k = 0; k <= last; k++) {
    const [az, ay] = profile[k];
    const [bz, by] = profile[(k + 1) % profile.length];
    tris.push([[xFront, midY, 0], [xFront, by, bz], [xFront, ay, az], OSM_ORANGE]);
    tris.push([[xBack, midY, 0], [xBack, ay, az], [xBack, by, bz], HANGAR_PANEL_SHADE]);
  }
  const archHalfWidthAt = (y: number) => (y <= springY ? hw : hw * Math.sqrt(Math.max(0, 1 - ((y - springY) / rise) ** 2)));

  // The big door at +x: dark opening, a leaf slid to each side, posts and the track over it.
  const doorW = width * 0.68;
  const doorH = height * 0.6;
  const doorMidY = kerbH + doorH / 2;
  const leafL = doorW * 0.3;
  const leafR = doorW * 0.24;
  tris.push(
    ...block(xFront + 0.004, doorMidY, 0, 0.012, doorH, doorW, HANGAR_INTERIOR),
    ...block(xFront + 0.02, doorMidY, doorW / 2 - leafL / 2, 0.03, doorH, leafL, HANGAR_DOOR),
    ...block(xFront + 0.026, doorMidY, -doorW / 2 + leafR / 2, 0.03, doorH, leafR, HANGAR_DOOR),
    ...block(xFront + 0.03, doorMidY, doorW / 2 + 0.05, 0.06, doorH, 0.1, BLACK),
    ...block(xFront + 0.03, doorMidY, -doorW / 2 - 0.05, 0.06, doorH, 0.1, BLACK),
    ...block(xFront + 0.035, kerbH + doorH + 0.05, 0, 0.07, 0.1, Math.min(doorW + 0.7, 2 * archHalfWidthAt(kerbH + doorH + 0.1) - 0.1), ZINC),
  );
  // Stiffeners on the leaves.
  for (const [z0, w, x] of [[doorW / 2 - leafL, leafL, xFront + 0.035], [-doorW / 2, leafR, xFront + 0.041]] as const) {
    for (let k = 1; k <= 3; k++) tris.push(...block(x + 0.004, doorMidY, z0 + (k * w) / 4, 0.01, doorH - 0.06, 0.03, ZINC));
  }
  // Ramp from the hangar floor down to the ground in front of the door.
  const rampZ = doorW / 2 + 0.2;
  const rampX0 = hl + 0.03;
  const rampX1 = hl + 0.7;
  tris.push(
    ...quad([rampX0, kerbH, rampZ], [rampX1, GROUND_SINK, rampZ], [rampX1, GROUND_SINK, -rampZ], [rampX0, kerbH, -rampZ], ROCK_LIGHT),
    [[rampX0, kerbH, rampZ], [rampX0, GROUND_SINK, rampZ], [rampX1, GROUND_SINK, rampZ], ROCK],
    [[rampX0, kerbH, -rampZ], [rampX1, GROUND_SINK, -rampZ], [rampX0, GROUND_SINK, -rampZ], ROCK],
  );

  // MARAMBIO over the door, or a plain white band where the letters would not fit under the arch.
  const letterH = height * 0.11;
  const signY = kerbH + doorH + 0.1 + letterH * 0.4;
  const sign = signY + letterH < height - 0.1 ? signTris(xFront, signY, letterH, archHalfWidthAt(signY + letterH) - 0.12) : null;
  if (sign) tris.push(...sign);
  else tris.push(...block(xFront + 0.006, signY + letterH / 2, 0, 0.02, letterH * 0.6, Math.max(0.2, 2 * archHalfWidthAt(signY + letterH) - 0.3), WHITE));

  // Back gable: a service door, two windows and a louvre.
  const winY = kerbH + (springY - kerbH) * 0.62;
  tris.push(
    ...block(xBack - 0.002, kerbH + 0.3, 0, 0.016, 0.6, 0.36, BLACK),
    ...block(xBack - 0.008, kerbH + 0.29, 0, 0.016, 0.56, 0.3, CREAM),
    ...block(xBack - 0.008, height * 0.72, 0, 0.02, 0.2, 0.5, ZINC),
  );
  for (const z of [-hw * 0.5, hw * 0.5]) {
    tris.push(...block(xBack - 0.002, winY + 0.25, z, 0.016, 0.2, 0.3, BLACK), ...block(xBack - 0.006, winY + 0.25, z, 0.016, 0.16, 0.26, WINDOW_DAY));
  }

  // Long walls: small windows every third bay; the personnel door with its canopy on +z.
  const doorBayX = hangarSideDoorX(length);
  for (let i = 1; i < bays; i += 3) {
    const x = -hl + (i + 0.5) * bayW;
    for (const side of [1, -1] as const) {
      if (side === 1 && Math.abs(x - doorBayX) < bayW * 0.9) continue;
      tris.push(
        ...block(x, winY, side * (hw + 0.004), 0.26, 0.2, 0.016, BLACK),
        ...block(x, winY, side * (hw + 0.008), 0.22, 0.16, 0.016, WINDOW_DAY),
      );
    }
  }
  const sideDoorH = Math.min(0.56, springY - kerbH - 0.06);
  tris.push(
    ...block(doorBayX, kerbH + sideDoorH / 2 + 0.01, hw + 0.006, 0.36, sideDoorH + 0.02, 0.02, BLACK),
    ...block(doorBayX, kerbH + sideDoorH / 2, hw + 0.012, 0.3, sideDoorH, 0.02, CREAM),
    ...block(doorBayX + 0.1, kerbH + sideDoorH * 0.5, hw + 0.026, 0.02, 0.04, 0.012, BLACK),
    ...block(doorBayX, kerbH + sideDoorH + 0.045, hw + 0.06, 0.44, 0.02, 0.12, ZINC),
  );

  // Ventilators on the shoulders of the vault, below the crown.
  const ventA = (55 * Math.PI) / 180;
  const ventY = springY + Math.sin(ventA) * rise;
  for (const [x, side] of [[-hl * 0.45, 1], [hl * 0.4, -1]] as const) {
    const z = side * Math.cos(ventA) * hw;
    tris.push(
      ...lathe(x, z, [[ventY - 0.06, 0.07], [ventY + 0.12, 0.07]], 6, ZINC),
      ...lathe(x, z, [[ventY + 0.12, 0.1], [ventY + 0.18, 0]], 6, BLACK),
    );
  }

  // Snow banked against the windward wall, over the kerb.
  const rng = createSeededRng(Math.round(length * 100 + width * 31));
  const stations = 12;
  const zWall = -hw - 0.03;
  const drift: [Vec3, Vec3, Vec3][] = [];
  for (let i = 0; i <= stations; i++) {
    const t = i / stations;
    const x = -hl * 0.94 + t * hl * 1.84;
    const taper = Math.sin(t * Math.PI);
    const out = 0.14 + 0.3 * taper * (0.6 + 0.4 * rng());
    const ridge = (springY * 0.5 - 0.08 + rng() * 0.08) * (0.3 + 0.7 * taper);
    drift.push([[x, GROUND_SINK, zWall], [x, GROUND_SINK, zWall - out], [x, ridge, zWall]]);
  }
  for (let i = 0; i < stations; i++) {
    const [, o0, r0] = drift[i];
    const [, o1, r1] = drift[i + 1];
    tris.push(...quad(o0, r0, r1, o1, i % 2 ? ICE : WHITE));
  }
  tris.push([drift[0][0], drift[0][2], drift[0][1], ICE], [drift[stations][0], drift[stations][1], drift[stations][2], ICE]);

  return tris;
}

/** Height of the control tower to the top of its roof, in world units. */
export const CONTROL_TOWER_HEIGHT = 12 / DIORAMA_METERS_PER_UNIT;

/**
 * The passenger terminal: a gabled orange module with the control tower at its -x end.
 *
 * The tower is not mapped in OpenStreetMap. Its shape (a red cylinder with a glazed cab and a
 * white-railed balcony, joined to the end of a gabled building) is read from a reference photo
 * (Wikimedia Commons, "Base Marambio y el Hercules.jpg", Casa Rosada, CC BY 2.5 AR), and its
 * height of about 12 m is an estimate with no measured source. It is illustrative.
 */
export function buildTerminalTris(length: number, width: number, height: number): Tri[] {
  const tris: Tri[] = buildModuleTris(length, width, height, 'orange', 'gabled');

  const SIDES = 10;
  // A flat face of the shaft looks at -x (its door) and one at +x (the wall of the module).
  const phase = Math.PI / SIDES;
  const shaftR = 0.42;
  // The shaft bites into the end wall of the module, so the two read as one building.
  const tx = -length / 2 - shaftR * 0.7;
  const top = CONTROL_TOWER_HEIGHT;
  const deckY = top * 0.7;
  const deckR = 0.82;
  const sillY = deckY + 0.2;
  const headY = deckY + 0.58;
  const eaveY = deckY + 0.66;
  const cabR = [0.5, 0.52, 0.62, 0.63] as const;
  const roofR = 0.72;

  tris.push(
    ...prism(ngon(tx, 0, shaftR + 0.08, SIDES, phase), GROUND_SINK, 0.07, ROCK_DARK),
    ...lathe(tx, 0, [[0.07, shaftR], [deckY, shaftR]], SIDES, TOWER_RED, phase),
    // Corbel under the balcony and its deck.
    ...lathe(tx, 0, [[deckY - 0.22, shaftR + 0.002], [deckY, deckR - 0.08]], SIDES, RED_DARK, phase),
    ...prism(ngon(tx, 0, deckR, SIDES, phase), deckY, deckY + 0.04, ZINC, ZINC, true),
    // Cab: red sill, tinted glass leaning out, white head.
    ...lathe(tx, 0, [[deckY + 0.04, cabR[0]], [sillY, cabR[1]], [headY, cabR[2]], [eaveY, cabR[3]]], SIDES, (_s, band) => (band === 0 ? TOWER_RED : band === 1 ? TOWER_GLASS : WHITE), phase),
    // Roof: the underside of the eave, a fascia and a low cone.
    ...lathe(tx, 0, [[eaveY, cabR[3]], [eaveY, roofR]], SIDES, BLACK, phase),
    ...lathe(tx, 0, [[eaveY, roofR], [eaveY + 0.05, roofR], [top, 0]], SIDES, (_s, band) => (band === 0 ? BLACK : ZINC), phase),
    // Antenna on the roof.
    ...strut([tx, top - 0.03, 0], [tx, top + 0.45, 0], 0.012, BLACK),
    ...block(tx, top + 0.3, 0, 0.2, 0.014, 0.014, BLACK),
  );
  // Panel joints round the shaft.
  for (const f of [0.34, 0.67]) {
    tris.push(...lathe(tx, 0, [[deckY * f, shaftR + 0.008], [deckY * f + 0.03, shaftR + 0.008]], SIDES, RED_DARK, phase));
  }
  const at = (i: number, r: number, y: number): Vec3 => {
    const a = phase - (i / SIDES) * Math.PI * 2;
    return [tx + Math.cos(a) * r, y, Math.sin(a) * r];
  };
  const railR = deckR - 0.035;
  const railY = deckY + 0.04 + 0.3;
  for (let i = 0; i < SIDES; i++) {
    tris.push(
      // Mullions between the panes.
      ...strut(at(i, cabR[1] + 0.006, sillY), at(i, cabR[2] + 0.006, headY), 0.012, WHITE, false),
      // Balcony railing: a post at each corner, a top rail and a mid rail.
      ...strut(at(i, railR, deckY + 0.04), at(i, railR, railY), 0.01, WHITE, false),
      ...strut(at(i, railR, railY), at(i + 1, railR, railY), 0.01, WHITE, false),
      ...strut(at(i, railR, railY - 0.15), at(i + 1, railR, railY - 0.15), 0.007, WHITE, false),
    );
  }
  // Door at the foot of the shaft, on the face that looks away from the module.
  const faceX = tx - shaftR * Math.cos(Math.PI / SIDES);
  tris.push(
    ...block(faceX - 0.001, 0.07 + 0.29, 0, 0.014, 0.58, 0.24, BLACK),
    ...block(faceX - 0.005, 0.07 + 0.27, 0, 0.018, 0.54, 0.19, CREAM),
  );

  return tris;
}

const WALKWAY_WIDTH = 0.45;
/** Top of the deck over the ground. */
export const WALKWAY_DECK_HEIGHT = 0.18;
const WALKWAY_DECK_THICKNESS = 0.035;
const WALKWAY_RAIL_HEIGHT = 0.3;
const WALKWAY_POST_SPACING = 0.9;
/** Half width of the gap left in a handrail where another walkway joins. */
const WALKWAY_OPENING = WALKWAY_WIDTH / 2 + 0.03;

type XZ = readonly [number, number];

/**
 * A polyline moved sideways by `dist` (towards +z when it heads +x), with mitred corners: the
 * edges of a band or the line of a handrail.
 */
export function offsetPath(points: readonly XZ[], dist: number): [number, number][] {
  const normal = (a: XZ, b: XZ): [number, number] => {
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [-(b[1] - a[1]) / l, (b[0] - a[0]) / l];
  };
  return points.map((p, i) => {
    const n0 = normal(points[Math.max(0, i - 1)], points[Math.max(1, i)]);
    const n1 = normal(points[Math.min(points.length - 2, i)], points[Math.min(points.length - 1, i + 1)]);
    const mx = n0[0] + n1[0];
    const mz = n0[1] + n1[1];
    const l = Math.hypot(mx, mz);
    if (l < 1e-6) return [p[0] + n0[0] * dist, p[1] + n0[1] * dist];
    // The mitre grows with the turn; it is capped so a sharp corner does not spike.
    const k = dist / Math.max(0.35, (mx / l) * n1[0] + (mz / l) * n1[1]);
    return [p[0] + (mx / l) * k, p[1] + (mz / l) * k];
  });
}

/** A path with the stretches inside a circle of `radius` round each opening cut out: the runs left. */
function cutOpenings(path: readonly XZ[], openings: readonly XZ[], radius: number): [number, number][][] {
  const runs: [number, number][][] = [];
  let run: [number, number][] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const p = path[i];
    const q = path[i + 1];
    const dx = q[0] - p[0];
    const dz = q[1] - p[1];
    let keep: [number, number][] = [[0, 1]];
    for (const c of openings) {
      const fx = p[0] - c[0];
      const fz = p[1] - c[1];
      const A = dx * dx + dz * dz;
      const B = 2 * (fx * dx + fz * dz);
      const disc = B * B - 4 * A * (fx * fx + fz * fz - radius * radius);
      if (A === 0 || disc <= 0) continue;
      const t0 = (-B - Math.sqrt(disc)) / (2 * A);
      const t1 = (-B + Math.sqrt(disc)) / (2 * A);
      keep = keep.flatMap(([s, e]): [number, number][] => {
        const parts: [number, number][] = [];
        if (t0 > s) parts.push([s, Math.min(e, t0)]);
        if (t1 < e) parts.push([Math.max(s, t1), e]);
        return parts.filter(([a, b]) => b - a > 1e-6);
      });
    }
    for (const [s, e] of keep) {
      if (s > 1e-9 || run.length === 0) {
        if (run.length > 1) runs.push(run);
        run = [[p[0] + dx * s, p[1] + dz * s]];
      }
      run.push([p[0] + dx * e, p[1] + dz * e]);
      if (e < 1 - 1e-9) {
        runs.push(run);
        run = [];
      }
    }
    if (keep.length === 0 && run.length > 1) {
      runs.push(run);
      run = [];
    }
  }
  if (run.length > 1) runs.push(run);
  return runs;
}

/** Points along a path about every `spacing`, with both ends of every stretch. */
function stationsAlong(path: readonly XZ[], spacing: number): [number, number][] {
  const out: [number, number][] = [[path[0][0], path[0][1]]];
  for (let i = 0; i < path.length - 1; i++) {
    const [ax, az] = path[i];
    const [bx, bz] = path[i + 1];
    const n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / spacing));
    for (let j = 1; j <= n; j++) out.push([ax + ((bx - ax) * j) / n, az + ((bz - az) * j) / n]);
  }
  return out;
}

/** A path with both ends pulled in by `d`, so what stands on them stays within the deck. */
function trimEnds(path: readonly XZ[], d: number): [number, number][] {
  const out = path.map(([x, z]): [number, number] => [x, z]);
  const pull = (i: number, towards: number) => {
    const l = Math.hypot(out[towards][0] - out[i][0], out[towards][1] - out[i][1]);
    const k = Math.min(d, l / 3) / l;
    out[i] = [out[i][0] + (out[towards][0] - out[i][0]) * k, out[i][1] + (out[towards][1] - out[i][1]) * k];
  };
  pull(0, 1);
  pull(out.length - 1, out.length - 2);
  return out;
}

/**
 * A raised metal walkway along a polyline of world [x, z] points, over ground at height `y`: a deck
 * on short legs with a handrail (posts, top rail and mid rail) on each side. `openings` are points
 * where another walkway joins: the handrail is left open round them.
 */
export function buildWalkwayTris(points: readonly XZ[], y: number, openings: readonly XZ[] = []): Tri[] {
  const path = points.filter((p, i) => i === 0 || Math.hypot(p[0] - points[i - 1][0], p[1] - points[i - 1][1]) > 1e-6);
  if (path.length < 2) return [];
  const tris: Tri[] = [];
  const hw = WALKWAY_WIDTH / 2;
  const y1 = y + WALKWAY_DECK_HEIGHT;
  const y0 = y1 - WALKWAY_DECK_THICKNESS;
  let total = 0;

  for (let i = 0; i < path.length - 1; i++) {
    const len = Math.hypot(path[i + 1][0] - path[i][0], path[i + 1][1] - path[i][1]);
    total += len;
    const tx = (path[i + 1][0] - path[i][0]) / len;
    const tz = (path[i + 1][1] - path[i][1]) / len;
    const first = i === 0;
    const final = i === path.length - 2;
    // At a corner each stretch runs on by half a width, so the decks close the corner between them.
    const ax = path[i][0] - (first ? 0 : tx * hw);
    const az = path[i][1] - (first ? 0 : tz * hw);
    const bx = path[i + 1][0] + (final ? 0 : tx * hw);
    const bz = path[i + 1][1] + (final ? 0 : tz * hw);
    const px = -tz * hw;
    const pz = tx * hw;
    const corner = (x: number, z: number, s: number, h: number): Vec3 => [x + px * s, h, z + pz * s];
    tris.push(
      ...quad(corner(ax, az, 1, y1), corner(bx, bz, 1, y1), corner(bx, bz, -1, y1), corner(ax, az, -1, y1), WALKWAY_DECK),
      ...quad(corner(ax, az, 1, y0), corner(ax, az, -1, y0), corner(bx, bz, -1, y0), corner(bx, bz, 1, y0), WALKWAY_DECK),
      ...quad(corner(ax, az, 1, y0), corner(bx, bz, 1, y0), corner(bx, bz, 1, y1), corner(ax, az, 1, y1), WALKWAY_DECK),
      ...quad(corner(bx, bz, -1, y0), corner(ax, az, -1, y0), corner(ax, az, -1, y1), corner(bx, bz, -1, y1), WALKWAY_DECK),
    );
    if (first) tris.push(...quad(corner(ax, az, -1, y0), corner(ax, az, 1, y0), corner(ax, az, 1, y1), corner(ax, az, -1, y1), WALKWAY_DECK));
    if (final) tris.push(...quad(corner(bx, bz, 1, y0), corner(bx, bz, -1, y0), corner(bx, bz, -1, y1), corner(bx, bz, 1, y1), WALKWAY_DECK));
  }

  // Legs in pairs under the deck; a walkway shorter than one spacing stands on a single pair.
  for (const side of [1, -1]) {
    const line = trimEnds(offsetPath(path, side * (hw - 0.06)), 0.05);
    const feet: [number, number][] =
      total < WALKWAY_POST_SPACING ? [[(line[0][0] + line[1][0]) / 2, (line[0][1] + line[1][1]) / 2]] : stationsAlong(line, WALKWAY_POST_SPACING);
    for (const [x, z] of feet) tris.push(...strut([x, y + GROUND_SINK, z], [x, y0 + 0.004, z], 0.016, BLACK, false));
  }

  const railY = y1 + WALKWAY_RAIL_HEIGHT;
  for (const side of [1, -1]) {
    for (const run of cutOpenings(trimEnds(offsetPath(path, side * (hw - 0.02)), 0.02), openings, WALKWAY_OPENING)) {
      for (let i = 0; i < run.length - 1; i++) {
        const [ax, az] = run[i];
        const [bx, bz] = run[i + 1];
        tris.push(
          ...strut([ax, railY, az], [bx, railY, bz], 0.012, WALKWAY_RAIL, false),
          ...strut([ax, railY - WALKWAY_RAIL_HEIGHT / 2, az], [bx, railY - WALKWAY_RAIL_HEIGHT / 2, bz], 0.008, WALKWAY_RAIL, false),
        );
      }
      for (const [x, z] of stationsAlong(run, WALKWAY_POST_SPACING)) {
        tris.push(...strut([x, y1 - 0.004, z], [x, railY + 0.012, z], 0.012, WALKWAY_RAIL, false));
      }
    }
  }
  return tris;
}

/** Buildings of the central row the walkway passes, from the hangar outwards. */
const WALKWAY_ROW = ['sanidad', 'jefatura', 'palermo', 'comedor'] as const;
/** How far the walkway runs from the end of the nearest building of the row. */
const WALKWAY_CLEARANCE = 0.7;
/**
 * Gap between the end of a spur and the wall it leads to: the steps and handrail posts of the door
 * reach 0.17 out of the wall, and the deck stops just short of them.
 */
const WALKWAY_WALL_GAP = 0.2;

function walkwayLines(): [number, number][][] {
  const ref = marambioLayoutOf(WALKWAY_ROW[0]);
  // On the stage: `out` leaves a building of the row through its +x end, the one with the door,
  // which looks at the hangar; `along` runs across those ends. The four buildings share one bearing.
  const out: XZ = [Math.cos(ref.rotationY), -Math.sin(ref.rotationY)];
  const along: XZ = [Math.sin(ref.rotationY), Math.cos(ref.rotationY)];
  const at = (o: number, a: number): [number, number] => [out[0] * o + along[0] * a, out[1] * o + along[1] * a];
  const ends = WALKWAY_ROW.map((id) => {
    const { position, footprint, rotationY } = marambioLayoutOf(id);
    const x = position[0] + (Math.cos(rotationY) * footprint[0]) / 2;
    const z = position[2] - (Math.sin(rotationY) * footprint[0]) / 2;
    return { o: x * out[0] + z * out[1], a: x * along[0] + z * along[1] };
  });
  const lineO = Math.max(...ends.map((e) => e.o)) + WALKWAY_CLEARANCE;

  // It starts at the personnel door on the +z wall of the hangar, the wall that looks at the row.
  const hangar = marambioLayoutOf('hangar');
  const lx = hangarSideDoorX(hangar.footprint[0]);
  const lz = hangar.footprint[1] / 2 + 0.1;
  const c = Math.cos(hangar.rotationY);
  const s = Math.sin(hangar.rotationY);
  const door: [number, number] = [hangar.position[0] + lx * c + lz * s, hangar.position[2] - lx * s + lz * c];
  const doorA = door[0] * along[0] + door[1] * along[1];

  const lastEnd = ends[ends.length - 1];
  // The main line turns into the last building, so it has no open end.
  const main = [door, at(lineO, doorA), at(lineO, lastEnd.a), at(lastEnd.o + WALKWAY_WALL_GAP, lastEnd.a)];
  // The spurs start at the edge of the main deck.
  const spurs = ends.slice(0, -1).map((e) => [at(lineO - WALKWAY_WIDTH / 2, e.a), at(e.o + WALKWAY_WALL_GAP, e.a)]);
  return [main, ...spurs];
}

/**
 * The walkways drawn, as polylines of world [x, z] points: the first leaves the side door of the
 * hangar, runs past the ends of Sanidad, Jefatura and Palermo and turns into the Comedor; the
 * others are the short spurs to those three. Illustrative: OpenStreetMap maps metal boardwalks
 * between these buildings, but their exact path is not copied.
 */
export const MARAMBIO_WALKWAYS: readonly (readonly (readonly [number, number])[])[] = walkwayLines();

/** Every walkway of the stage in one list, with the handrail of the main one open where each spur joins. */
export function buildMarambioWalkwaysTris(y: number = MARAMBIO_GROUND_Y): Tri[] {
  const [main, ...spurs] = MARAMBIO_WALKWAYS;
  return [...buildWalkwayTris(main, y, spurs.map((spur) => spur[0])), ...spurs.flatMap((spur) => buildWalkwayTris(spur, y))];
}

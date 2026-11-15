import {
  shift,
  type Tri,
  type Vec3,
} from '../voyage/lowPoly.ts';
import { VOXEL_PALETTE } from './stationModels.ts';

const {
  BLACK,
  WHITE,
  ICE,
  ICE_BLUE,
  ORANGE,
  RED_DARK,
  CREAM,
  SEA_GREY,
  WOOD,
  BROWN_DARK,
  NAVY_ROOF,
} = VOXEL_PALETTE;

/** Diorama world scale for the low-poly station observer (feet on y = 0, facing +x). */
export const OBSERVER_SCALE = 0.58;

/** Hip and shoulder articulation pivots in model units (unit height ~1.0). */
export const OBSERVER_HIP_Y = 0.44;
export const OBSERVER_HIP_Z = 0.068;
export const OBSERVER_SHOULDER_Y = 0.74;
export const OBSERVER_SHOULDER_Z = 0.148;

export interface ObserverPolyParts {
  readonly torso: Tri[];
  readonly legL: Tri[];
  readonly legR: Tri[];
  readonly armL: Tri[];
  readonly armR: Tri[];
}

interface YRing {
  cx: number;
  y: number;
  cz: number;
  rx: number;
  rz: number;
}

interface XRing {
  x: number;
  cy: number;
  cz: number;
  ry: number;
  rz: number;
  floorY?: number;
}

const centroid = (pts: readonly Vec3[]): Vec3 => {
  const n = pts.length;
  let sx = 0;
  let sy = 0;
  let sz = 0;
  for (const [x, y, z] of pts) {
    sx += x;
    sy += y;
    sz += z;
  }
  return [sx / n, sy / n, sz / n];
};

function loftY(
  spec: readonly YRing[],
  segments: number,
  color: number | ((seg: number, band: number) => number),
  capBottom = true,
  capTop = true,
  phase = 0
): Tri[] {
  const rings: Vec3[][] = spec.map(({ cx, y, cz, rx, rz }) =>
    Array.from({ length: segments }, (_, i) => {
      const a = phase - (i / segments) * Math.PI * 2;
      return [cx + Math.cos(a) * rx, y, cz + Math.sin(a) * rz];
    })
  );
  const tris: Tri[] = [];
  for (let k = 0; k < rings.length - 1; k++) {
    for (let i = 0; i < segments; i++) {
      const j = (i + 1) % segments;
      const c = typeof color === 'number' ? color : color(i, k);
      const a = rings[k][i];
      const b = rings[k][j];
      const d = rings[k + 1][i];
      const e = rings[k + 1][j];
      tris.push([a, b, e, c], [a, e, d, c]);
    }
  }
  if (capBottom && rings.length > 0) {
    const r0 = rings[0];
    const c0 = centroid(r0);
    for (let i = 0; i < segments; i++) {
      const j = (i + 1) % segments;
      const col = typeof color === 'number' ? color : color(i, 0);
      tris.push([c0, r0[j], r0[i], col]);
    }
  }
  if (capTop && rings.length > 0) {
    const rTop = rings[rings.length - 1];
    const cTop = centroid(rTop);
    const band = Math.max(0, rings.length - 2);
    for (let i = 0; i < segments; i++) {
      const j = (i + 1) % segments;
      const col = typeof color === 'number' ? color : color(i, band);
      tris.push([cTop, rTop[i], rTop[j], col]);
    }
  }
  return tris;
}

function loftX(
  spec: readonly XRing[],
  segments: number,
  color: number | ((seg: number, band: number) => number),
  capStart = true,
  capEnd = true,
  phase = 0
): Tri[] {
  const rings: Vec3[][] = spec.map(({ x, cy, cz, ry, rz, floorY }) =>
    Array.from({ length: segments }, (_, i) => {
      const a = phase + (i / segments) * Math.PI * 2;
      const py = cy + Math.sin(a) * ry;
      return [x, floorY !== undefined ? Math.max(floorY, py) : py, cz + Math.cos(a) * rz];
    })
  );
  const tris: Tri[] = [];
  for (let k = 0; k < rings.length - 1; k++) {
    for (let i = 0; i < segments; i++) {
      const j = (i + 1) % segments;
      const c = typeof color === 'number' ? color : color(i, k);
      const a = rings[k][i];
      const b = rings[k][j];
      const d = rings[k + 1][i];
      const e = rings[k + 1][j];
      tris.push([a, d, e, c], [a, e, b, c]);
    }
  }
  if (capStart && rings.length > 0) {
    const r0 = rings[0];
    const c0 = centroid(r0);
    for (let i = 0; i < segments; i++) {
      const j = (i + 1) % segments;
      const col = typeof color === 'number' ? color : color(i, 0);
      tris.push([c0, r0[i], r0[j], col]);
    }
  }
  if (capEnd && rings.length > 0) {
    const rEnd = rings[rings.length - 1];
    const cEnd = centroid(rEnd);
    const band = Math.max(0, rings.length - 2);
    for (let i = 0; i < segments; i++) {
      const j = (i + 1) % segments;
      const col = typeof color === 'number' ? color : color(i, band);
      tris.push([cEnd, rEnd[j], rEnd[i], col]);
    }
  }
  return tris;
}

function extrudeZPoly(
  profileXY: readonly (readonly [number, number])[],
  halfZ: number,
  color: number,
  cz = 0
): Tri[] {
  const n = profileXY.length;
  const cx = profileXY.reduce((s, [x]) => s + x / n, 0);
  const cy = profileXY.reduce((s, [, y]) => s + y / n, 0);
  const area = profileXY.reduce((sum, [x, y], i) => {
    const [nx, ny] = profileXY[(i + 1) % n];
    return sum + x * ny - nx * y;
  }, 0);
  const pts = area < 0 ? [...profileXY].reverse() : profileXY;
  const zFront = cz + halfZ;
  const zBack = cz - halfZ;
  const tris: Tri[] = [];
  for (let i = 0; i < n; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[(i + 1) % n];
    tris.push([[cx, cy, zFront], [ax, ay, zFront], [bx, by, zFront], color]);
    tris.push([[cx, cy, zBack], [bx, by, zBack], [ax, ay, zBack], color]);
    tris.push(
      [[ax, ay, zBack], [bx, by, zBack], [bx, by, zFront], color],
      [[ax, ay, zBack], [bx, by, zFront], [ax, ay, zFront], color]
    );
  }
  return tris;
}

function buildLegTris(): Tri[] {
  // Pivot at hip [0, 0, 0], extends down to y = -OBSERVER_HIP_Y (-0.44)
  const trouser = loftY(
    [
      { cx: 0, y: -0.31, cz: 0, rx: 0.044, rz: 0.042 },
      { cx: 0.004, y: -0.24, cz: 0, rx: 0.050, rz: 0.046 },
      { cx: 0.010, y: -0.16, cz: 0, rx: 0.056, rz: 0.050 },
      { cx: 0.004, y: -0.07, cz: 0, rx: 0.060, rz: 0.054 },
      { cx: 0, y: 0.02, cz: 0, rx: 0.060, rz: 0.054 },
    ],
    6,
    (_seg, band) => (band === 0 ? SEA_GREY : BLACK),
    true,
    true,
    Math.PI / 6
  );

  // Boot ankle collar (8-sided)
  const bootCuff = loftY(
    [
      { cx: 0.002, y: -0.37, cz: 0, rx: 0.050, rz: 0.046 },
      { cx: 0.002, y: -0.33, cz: 0, rx: 0.052, rz: 0.048 },
      { cx: 0, y: -0.295, cz: 0, rx: 0.047, rz: 0.044 },
    ],
    8,
    (_seg, band) => (band === 0 ? BROWN_DARK : BLACK),
    true,
    true,
    Math.PI / 8
  );

  // Sculpted 8-sided Antarctic boot with lugged sole resting flat on y = -OBSERVER_HIP_Y
  const bootShell = loftX(
    [
      { x: -0.056, cy: -0.405, cz: 0, ry: 0.028, rz: 0.036, floorY: -OBSERVER_HIP_Y },
      { x: -0.022, cy: -0.396, cz: 0, ry: 0.044, rz: 0.046, floorY: -OBSERVER_HIP_Y },
      { x: 0.028, cy: -0.394, cz: 0, ry: 0.044, rz: 0.045, floorY: -OBSERVER_HIP_Y },
      { x: 0.074, cy: -0.408, cz: 0, ry: 0.030, rz: 0.040, floorY: -OBSERVER_HIP_Y },
      { x: 0.106, cy: -0.422, cz: 0, ry: 0.016, rz: 0.028, floorY: -OBSERVER_HIP_Y },
    ],
    8,
    (seg) => {
      const a = (seg / 8) * Math.PI * 2;
      return Math.sin(a) < -0.3 ? BLACK : BROWN_DARK;
    },
    true,
    true,
    0
  );

  return [...trouser, ...bootCuff, ...bootShell];
}

function buildArmTris(withNotebook: boolean): Tri[] {
  // Pivot at shoulder [0, 0, 0], slight natural elbow bend toward +x
  const sleeve = loftY(
    [
      { cx: 0.026, y: -0.22, cz: 0, rx: 0.034, rz: 0.032 },
      { cx: 0.022, y: -0.18, cz: 0, rx: 0.040, rz: 0.038 },
      { cx: 0.008, y: -0.11, cz: 0, rx: 0.046, rz: 0.042 },
      { cx: 0, y: -0.03, cz: 0, rx: 0.052, rz: 0.046 },
      { cx: 0, y: 0.02, cz: 0, rx: 0.046, rz: 0.042 },
    ],
    6,
    (_seg, band) => (band === 0 ? BLACK : band >= 3 ? RED_DARK : ORANGE),
    true,
    true,
    Math.PI / 6
  );

  // Insulated 6-sided expedition mitten with sculpted thumb
  const mitten = loftY(
    [
      { cx: 0.030, y: -0.296, cz: 0, rx: 0.020, rz: 0.016 },
      { cx: 0.032, y: -0.274, cz: 0, rx: 0.035, rz: 0.028 },
      { cx: 0.030, y: -0.244, cz: 0, rx: 0.040, rz: 0.034 },
      { cx: 0.026, y: -0.215, cz: 0, rx: 0.035, rz: 0.032 },
    ],
    6,
    (_seg, band) => (band <= 1 ? BROWN_DARK : BLACK),
    true,
    true,
    Math.PI / 6
  );
  const thumb = loftY(
    [
      { cx: 0.062, y: -0.268, cz: 0, rx: 0.012, rz: 0.012 },
      { cx: 0.056, y: -0.246, cz: 0, rx: 0.016, rz: 0.014 },
      { cx: 0.044, y: -0.230, cz: 0, rx: 0.016, rz: 0.014 },
    ],
    6,
    BLACK,
    true,
    true,
    Math.PI / 6
  );

  if (!withNotebook) return [...sleeve, ...mitten, ...thumb];

  // Angled field notebook held in the right gloved hand
  const cover = extrudeZPoly(
    [
      [0.046, -0.284],
      [0.128, -0.264],
      [0.124, -0.248],
      [0.042, -0.268],
    ],
    0.036,
    WOOD,
    -0.012
  );
  const pages = extrudeZPoly(
    [
      [0.052, -0.270],
      [0.124, -0.252],
      [0.122, -0.244],
      [0.050, -0.262],
    ],
    0.031,
    WHITE,
    -0.012
  );

  return [...sleeve, ...mitten, ...thumb, ...cover, ...pages];
}

function buildTorsoAndHeadTris(): Tri[] {
  // 8-sided sculpted Antarctic parka (wider across shoulders than front-to-back)
  const parka = loftY(
    [
      { cx: -0.004, y: 0.37, cz: 0, rx: 0.112, rz: 0.146 },
      { cx: 0, y: 0.45, cz: 0, rx: 0.108, rz: 0.140 },
      { cx: 0, y: 0.51, cz: 0, rx: 0.100, rz: 0.130 },
      { cx: 0.006, y: 0.57, cz: 0, rx: 0.114, rz: 0.144 },
      { cx: 0.008, y: 0.66, cz: 0, rx: 0.120, rz: 0.158 },
      { cx: 0.004, y: 0.74, cz: 0, rx: 0.104, rz: 0.146 },
      { cx: 0, y: 0.79, cz: 0, rx: 0.078, rz: 0.094 },
    ],
    8,
    (_seg, band) => {
      if (band === 1) return BLACK; // waist belt
      if (band >= 4) return RED_DARK; // shoulder yoke & storm collar
      return ORANGE;
    },
    true,
    true,
    Math.PI / 8
  );

  // Front storm flap / zipper placket and angled cargo pockets
  const stormFlap = extrudeZPoly(
    [
      [0.102, 0.39],
      [0.124, 0.40],
      [0.128, 0.65],
      [0.112, 0.77],
      [0.092, 0.77],
    ],
    0.016,
    RED_DARK
  );
  const pocketProfile: readonly (readonly [number, number])[] = [
    [0.088, 0.395],
    [0.122, 0.405],
    [0.118, 0.485],
    [0.084, 0.485],
  ];
  const pocketL = extrudeZPoly(pocketProfile, 0.032, RED_DARK, -0.068);
  const pocketR = extrudeZPoly(pocketProfile, 0.032, RED_DARK, 0.068);

  // Contoured 8-sided field backpack + top strap roll
  const pack = loftY(
    [
      { cx: -0.126, y: 0.48, cz: 0, rx: 0.048, rz: 0.092 },
      { cx: -0.138, y: 0.55, cz: 0, rx: 0.058, rz: 0.102 },
      { cx: -0.136, y: 0.65, cz: 0, rx: 0.056, rz: 0.098 },
      { cx: -0.126, y: 0.72, cz: 0, rx: 0.046, rz: 0.088 },
      { cx: -0.118, y: 0.748, cz: 0, rx: 0.030, rz: 0.066 },
    ],
    8,
    (_seg, band) => (band >= 2 ? RED_DARK : SEA_GREY),
    true,
    true,
    Math.PI / 8
  );
  const packRoll = extrudeZPoly(
    [
      [-0.175, 0.725],
      [-0.118, 0.725],
      [-0.106, 0.758],
      [-0.132, 0.782],
      [-0.168, 0.775],
      [-0.184, 0.750],
    ],
    0.086,
    BLACK
  );

  // Neck + face/head (8-sided, oriented toward +x) emerging from the insulated parka hood
  const head = loftY(
    [
      { cx: 0.016, y: 0.775, cz: 0, rx: 0.046, rz: 0.046 },
      { cx: 0.022, y: 0.825, cz: 0, rx: 0.068, rz: 0.064 },
      { cx: 0.024, y: 0.888, cz: 0, rx: 0.075, rz: 0.068 },
      { cx: 0.022, y: 0.942, cz: 0, rx: 0.072, rz: 0.066 },
      { cx: 0.018, y: 0.985, cz: 0, rx: 0.050, rz: 0.048 },
      { cx: 0.014, y: 1.005, cz: 0, rx: 0.020, rz: 0.020 },
    ],
    8,
    (seg, band) => {
      const a = Math.PI / 8 - (seg / 8) * Math.PI * 2;
      const front = Math.cos(a) > 0.35;
      if (band >= 3) return NAVY_ROOF;
      return front ? CREAM : NAVY_ROOF;
    },
    true,
    true,
    Math.PI / 8
  );

  // Sculpted 8-sided parka hood framing back, sides and crown of the head with light fur trim
  const hood = loftY(
    [
      { cx: -0.015, y: 0.77, cz: 0, rx: 0.084, rz: 0.098 },
      { cx: -0.028, y: 0.84, cz: 0, rx: 0.092, rz: 0.104 },
      { cx: -0.032, y: 0.92, cz: 0, rx: 0.094, rz: 0.104 },
      { cx: -0.030, y: 0.99, cz: 0, rx: 0.082, rz: 0.090 },
      { cx: -0.022, y: 1.032, cz: 0, rx: 0.046, rz: 0.050 },
    ],
    8,
    (seg, band) => {
      const a = Math.PI / 8 - (seg / 8) * Math.PI * 2;
      const frontRim = Math.cos(a) > 0.35 && band >= 1 && band <= 2;
      return frontRim ? ICE : RED_DARK;
    },
    true,
    true,
    Math.PI / 8
  );

  // 3D faceted snow goggles (strap/frame + twin angled lenses) and nose bridge on +x face
  const gogglesFrame = extrudeZPoly(
    [
      [0.072, 0.900],
      [0.104, 0.904],
      [0.104, 0.938],
      [0.072, 0.942],
    ],
    0.058,
    BLACK
  );
  const lensProfile: readonly (readonly [number, number])[] = [
    [0.092, 0.908],
    [0.110, 0.912],
    [0.110, 0.932],
    [0.092, 0.935],
  ];
  const lensL = extrudeZPoly(lensProfile, 0.020, ICE_BLUE, -0.026);
  const lensR = extrudeZPoly(lensProfile, 0.020, ICE_BLUE, 0.026);
  const nose = extrudeZPoly(
    [
      [0.088, 0.870],
      [0.108, 0.874],
      [0.096, 0.896],
      [0.084, 0.896],
    ],
    0.011,
    CREAM
  );

  return [
    ...parka,
    ...stormFlap,
    ...pocketL,
    ...pocketR,
    ...pack,
    ...packRoll,
    ...head,
    ...hood,
    ...gogglesFrame,
    ...lensL,
    ...lensR,
    ...nose,
  ];
}

/**
 * Low-poly Orcadas meteorological observer (illustrative reconstruction): sculpted orange and red
 * Antarctic parka with storm hood, 6-sided trousers and sleeves, lugged boots, mittens, goggles,
 * field backpack, and notebook in hand. Articulated at hips and shoulders; standing height ~1.0
 * model unit, feet on y = 0, facing +x.
 */
export function buildObserverPolyParts(): ObserverPolyParts {
  const leg = buildLegTris();
  return {
    torso: buildTorsoAndHeadTris(),
    legL: leg,
    legR: leg,
    armL: buildArmTris(false),
    armR: buildArmTris(true),
  };
}

/** Assembled standing observer in model coordinates, for bounding-box and detail tests. */
export function assembleObserverTris(parts: ObserverPolyParts = buildObserverPolyParts()): Tri[] {
  return [
    ...parts.torso,
    ...shift(parts.legL, 0, OBSERVER_HIP_Y, -OBSERVER_HIP_Z),
    ...shift(parts.legR, 0, OBSERVER_HIP_Y, OBSERVER_HIP_Z),
    ...shift(parts.armL, 0, OBSERVER_SHOULDER_Y, -OBSERVER_SHOULDER_Z),
    ...shift(parts.armR, 0, OBSERVER_SHOULDER_Y, OBSERVER_SHOULDER_Z),
  ];
}

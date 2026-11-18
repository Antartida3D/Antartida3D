import { BufferAttribute, BufferGeometry, Color, LinearSRGBColorSpace } from 'three';
import { createSeededRng, METERS_PER_MAP_UNIT, sunDirection, VERTICAL_EXAGGERATION } from '@antartida/core';

/**
 * Low-poly models (docs/diseno/estilo-voxel.md, rule 30): flat triangles with a solid color each,
 * merged into one geometry and drawn with vehicleMaterial. Like the block models they need no
 * lights: each face gets a fixed shade from its slope to one sun, so facets read as in a sketch.
 */
export type Vec3 = readonly [number, number, number];
/** Three corners, counter-clockwise seen from outside, and the color. */
export type Tri = readonly [Vec3, Vec3, Vec3, number];

/** Least detail of a low-poly model: enough faces and colors to tell what it is. */
export const POLY_MIN_TRIS = 60;
export const POLY_MIN_COLORS = 2;

/** Shade of a face turned away from the light, and of one facing it: the range of buildBoxGeometry. */
const SHADE_MIN = 0.55;
const SHADE_MAX = 1;

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** Unit normal of a face (zero for a degenerate one). */
export function normalOf([a, b, c]: Tri): Vec3 {
  const n = cross(sub(b, a), sub(c, a));
  const l = Math.hypot(...n);
  return l ? [n[0] / l, n[1] / l, n[2] / l] : [0, 0, 0];
}

/** The face wound so that it looks away from `inside`. */
export function facingOut(a: Vec3, b: Vec3, c: Vec3, color: number, inside: Vec3): Tri {
  const n = normalOf([a, b, c, color]);
  const out = n[0] * (a[0] + b[0] + c[0] - 3 * inside[0]) + n[1] * (a[1] + b[1] + c[1] - 3 * inside[1]) + n[2] * (a[2] + b[2] + c[2] - 3 * inside[2]);
  return out < 0 ? [a, c, b, color] : [a, b, c, color];
}

/**
 * A color with this bit already carries its shade (reliefColor): the geometry draws it as it is.
 * Faces that must look like the painted relief use it.
 */
export const PRESHADED = 0x1000000;

/**
 * Fixed per-face shading matching `buildBoxGeometry` (vehicles.ts FACES), blended by the squared
 * normal components so axis-aligned faces match block models in the same diorama.
 */
export function boxShade(n: Vec3): number {
  return (
    n[0] * n[0] * (n[0] > 0 ? 0.82 : 0.7) +
    n[1] * n[1] * (n[1] > 0 ? 1 : 0.5) +
    n[2] * n[2] * (n[2] > 0 ? 0.9 : 0.62)
  );
}

/** Every face merged into one geometry with vertex colors: one draw call per model. */
export function buildPolyGeometry(tris: readonly Tri[], shade?: (n: Vec3) => number): BufferGeometry {
  const positions = new Float32Array(tris.length * 9);
  const colors = new Float32Array(tris.length * 9);
  const color = new Color();
  tris.forEach((t, i) => {
    const n = normalOf(t);
    const preshaded = t[3] >= PRESHADED;
    // Default to the light of the painted relief (reliefLight) so map models match the relief sun.
    const faceShade = preshaded
      ? 1
      : shade
        ? shade(n)
        : SHADE_MIN + (SHADE_MAX - SHADE_MIN) * Math.min(1, reliefLight(n) / RELIEF_FLAT_LIT);
    color.setHex(preshaded ? t[3] - PRESHADED : t[3]);
    for (let k = 0; k < 3; k++) {
      positions.set(t[k] as Vec3, i * 9 + k * 3);
      colors.set([color.r * faceShade, color.g * faceShade, color.b * faceShade], i * 9 + k * 3);
    }
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  return geometry;
}

// Colors and light of the painted relief, in linear space, as paintedTerrain.glsl.ts uses them
// (ICE_COL, ICE_COOL, GLACIER, DEEP, ROCK_WARM, the paper tone and the NW sun with its W and N fills).
type Rgb = [number, number, number];
const ICE_COL: Rgb = [0.936, 0.958, 0.966];
const ICE_COOL: Rgb = [0.805, 0.878, 0.932];
const GLACIER: Rgb = [0.498, 0.659, 0.769];
const DEEP: Rgb = [0.118, 0.243, 0.361];
const ROCK_WARM: Rgb = [0.58, 0.49, 0.4];
const PAPER: Rgb = [0.823, 0.745, 0.631];
const RELIEF_SUN = sunDirection();
const FILL_W: Vec3 = [-0.82 / Math.hypot(0.82, 0.57), 0.57 / Math.hypot(0.82, 0.57), 0];
const FILL_N: Vec3 = [0, 0.57 / Math.hypot(0.82, 0.57), -0.82 / Math.hypot(0.82, 0.57)];
const mix3 = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const mul3 = (a: Rgb, b: Rgb): Rgb => [a[0] * b[0], a[1] * b[1], a[2] * b[2]];
const step = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const dot = (a: Vec3, b: readonly number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** The NW sun of the relief with its soft W and N fills, on a face of this normal. */
function reliefLight(n: Vec3): number {
  return 0.68 * Math.max(dot(n, RELIEF_SUN), 0) + 0.16 * Math.max(dot(n, FILL_W), 0) + 0.16 * Math.max(dot(n, FILL_N), 0);
}
/** That light on flat ground. */
const RELIEF_FLAT_LIT = 0.68 * RELIEF_SUN[1] + 0.32 * 0.57;

/**
 * The color the painted relief gives a face of this slope at this world height, ice or rock: the
 * hillshade of paintedTerrain.glsl.ts without its baked shadows, strokes and grain. A summit raised
 * from the relief (Erebus) is colored with it, so it reads as the same mountain. PRESHADED is set.
 */
export function reliefColor(normal: Vec3, worldY: number, rock: boolean): number {
  const meters = (worldY * METERS_PER_MAP_UNIT) / VERTICAL_EXAGGERATION;
  const L = 1 + (reliefLight(normal) / RELIEF_FLAT_LIT - 1) * 1.35;
  const dark = Math.min(1, Math.max(0, 1 - L));
  const bright = Math.min(1, Math.max(0, L - 1));
  let col: Rgb;
  if (rock) {
    col = mix3(PAPER, ROCK_WARM, 0.58);
    const shadow: Rgb = mix3([1, 1, 1], [DEEP[0] * 1.55 + 0.12, DEEP[1] * 1.55 + 0.12, DEEP[2] * 1.55 + 0.12], 0.82);
    col = mix3(col, mul3(col, shadow), step(0, 0.9, dark));
    col = [col[0] + 0.04 * bright, col[1] + 0.03 * bright, col[2] + 0.015 * bright];
  } else {
    col = mix3(ICE_COOL, ICE_COL, step(0, 3600, meters));
    const deep: Rgb = [DEEP[0] * 1.32 + 0.05, DEEP[1] * 1.32 + 0.12, DEEP[2] * 1.32 + 0.2];
    const iceShadow = mix3([GLACIER[0] * 0.85, GLACIER[1] * 0.85, GLACIER[2] * 0.85], deep, step(0.12, 0.82, dark));
    col = mix3(col, mul3(col, iceShadow), step(0, 0.9, dark) * 0.76);
    col = mix3(col, ICE_COL, bright * 0.4);
  }
  // The paper grain darkens the relief a little on average.
  const paper = 0.97;
  return PRESHADED + new Color().setRGB(col[0] * paper, col[1] * paper, col[2] * paper, LinearSRGBColorSpace).getHex();
}

/**
 * Ground colors that stand for the painted relief itself: once the model is set on the map, these
 * faces take reliefColor from their real slope and height (resolveRelief), so the ground of a model
 * cannot be told from the relief round it and only what stands on it shows.
 */
export const RELIEF_ICE = -1;
export const RELIEF_ROCK = -2;

/** The faces with RELIEF_ICE or RELIEF_ROCK colored as the relief, for faces at the world height `worldY(y)`. */
export function resolveRelief(tris: readonly Tri[], worldY: (y: number) => number = (y) => y): Tri[] {
  return tris.map((t) => (t[3] >= 0 ? t : [t[0], t[1], t[2], reliefColor(normalOf(t), worldY((t[0][1] + t[1][1] + t[2][1]) / 3), t[3] === RELIEF_ROCK)]));
}

/** The faces moved by (dx, dy, dz). */
export const shift = (tris: readonly Tri[], dx: number, dy: number, dz: number): Tri[] =>
  tris.map(([a, b, c, col]) => [[a[0] + dx, a[1] + dy, a[2] + dz], [b[0] + dx, b[1] + dy, b[2] + dz], [c[0] + dx, c[1] + dy, c[2] + dz], col]);

/** The faces turned round y by `angle` radians (towards -z from +x) about (0, 0). */
export const turn = (tris: readonly Tri[], angle: number): Tri[] => {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const r = ([x, y, z]: Vec3): Vec3 => [x * c + z * s, y, -x * s + z * c];
  return tris.map(([a, b, d, col]) => [r(a), r(b), r(d), col]);
};

/** The faces scaled about (0, 0, 0). */
export const scaled = (tris: readonly Tri[], k: number): Tri[] =>
  tris.map(([a, b, c, col]) => [[a[0] * k, a[1] * k, a[2] * k], [b[0] * k, b[1] * k, b[2] * k], [c[0] * k, c[1] * k, c[2] * k], col]);

/** A quad a-b-c-d (counter-clockwise from outside) as two faces. */
export const quad = (a: Vec3, b: Vec3, c: Vec3, d: Vec3, color: number): Tri[] => [[a, b, c, color], [a, c, d, color]];

/**
 * A prism: a ring of points (x, z) in either winding, from y0 up to y1, with its
 * top. `top` colors the top, `side` the walls (by index, so each wall can differ).
 */
export function prism(ring: readonly (readonly [number, number])[], y0: number, y1: number, side: number | ((i: number) => number), top = typeof side === 'number' ? side : side(0), bottom = false): Tri[] {
  const out: Tri[] = [];
  const n = ring.length;
  // Either winding is accepted: a ring given the other way round is turned, so no face looks inwards.
  const area = ring.reduce((sum, [x, z], i) => sum + x * ring[(i + 1) % n][1] - ring[(i + 1) % n][0] * z, 0);
  if (area > 0) ring = [...ring].reverse();
  for (let i = 0; i < n; i++) {
    const [ax, az] = ring[i];
    const [bx, bz] = ring[(i + 1) % n];
    const color = typeof side === 'number' ? side : side(i);
    out.push(...quad([ax, y0, az], [bx, y0, bz], [bx, y1, bz], [ax, y1, az], color));
  }
  const [cx, cz] = ring.reduce(([sx, sz], [x, z]) => [sx + x / n, sz + z / n], [0, 0]);
  for (let i = 0; i < n; i++) {
    const [ax, az] = ring[i];
    const [bx, bz] = ring[(i + 1) % n];
    out.push([[cx, y1, cz], [ax, y1, az], [bx, y1, bz], top]);
    if (bottom) out.push([[cx, y0, cz], [bx, y0, bz], [ax, y0, az], top]);
  }
  return out;
}

/** The ring of a regular polygon of `n` corners, counter-clockwise seen from above. */
export const ngon = (cx: number, cz: number, r: number, n: number, phase = 0): [number, number][] =>
  Array.from({ length: n }, (_, i) => {
    const a = phase - (i / n) * Math.PI * 2;
    return [cx + Math.cos(a) * r, cz + Math.sin(a) * r];
  });

/** A rectangle ring, counter-clockwise seen from above. */
export const rect = (cx: number, cz: number, w: number, d: number): [number, number][] => [
  [cx + w / 2, cz - d / 2], [cx - w / 2, cz - d / 2], [cx - w / 2, cz + d / 2], [cx + w / 2, cz + d / 2],
];

/** A box of faces, for small parts (a box of a block model, but shaded by its slope). */
export const block = (cx: number, cy: number, cz: number, sx: number, sy: number, sz: number, color: number, top = color): Tri[] =>
  prism(rect(cx, cz, sx, sz), cy - sy / 2, cy + sy / 2, color, top, true);

/**
 * A stack of rings round the y axis: each ring is [height, radius], bottom to top; `color(i, k)`
 * colors the band between ring k and k+1 at segment i. A last ring of radius 0 closes it in a point.
 */
export function lathe(cx: number, cz: number, rings: readonly (readonly [number, number])[], segments: number, color: number | ((segment: number, band: number) => number), phase = 0): Tri[] {
  const out: Tri[] = [];
  const at = (k: number, i: number): Vec3 => {
    const [y, r] = rings[k];
    const a = phase - (i / segments) * Math.PI * 2;
    return [cx + Math.cos(a) * r, y, cz + Math.sin(a) * r];
  };
  for (let k = 0; k < rings.length - 1; k++) {
    for (let i = 0; i < segments; i++) {
      const c = typeof color === 'number' ? color : color(i, k);
      const a = at(k, i);
      const b = at(k, i + 1);
      const d = at(k + 1, i);
      const e = at(k + 1, i + 1);
      if (rings[k + 1][1] > 0) out.push(...quad(a, b, e, d, c));
      else out.push([a, b, d, c]);
    }
  }
  const [yTop, rTop] = rings[rings.length - 1];
  if (rTop > 0) for (let i = 0; i < segments; i++) out.push([[cx, yTop, cz], at(rings.length - 1, i), at(rings.length - 1, i + 1), typeof color === 'number' ? color : color(i, rings.length - 1)]);
  return out;
}

/**
 * A shape of constant section along x, from x0 to x1: `profile` is (z, y) counter-clockwise seen
 * from +x. For the arched tents and the chamfered wings of the Pole station.
 */
export function extrude(profile: readonly (readonly [number, number])[], x0: number, x1: number, color: number, ends = color): Tri[] {
  const out: Tri[] = [];
  const n = profile.length;
  for (let i = 0; i < n; i++) {
    const [az, ay] = profile[i];
    const [bz, by] = profile[(i + 1) % n];
    out.push(...quad([x1, ay, az], [x1, by, bz], [x0, by, bz], [x0, ay, az], color));
  }
  const [cz, cy] = profile.reduce(([sz, sy], [z, y]) => [sz + z / n, sy + y / n], [0, 0]);
  for (let i = 0; i < n; i++) {
    const [az, ay] = profile[i];
    const [bz, by] = profile[(i + 1) % n];
    out.push([[x1, cy, cz], [x1, by, bz], [x1, ay, az], ends]);
    out.push([[x0, cy, cz], [x0, ay, az], [x0, by, bz], ends]);
  }
  return out;
}

/** What a ground field gives at a corner: its height, or null where there is no ground. */
export type GroundHeight = (u: number, v: number, noise: number) => number | null;
/** The color of a ground face from its middle (u, v), height and steepness (0 flat, 1 a wall). */
export type GroundColor = (u: number, v: number, h: number, steep: number, noise: number) => number;

/**
 * Ground as a field of faces over a grid of `cols` x `rows` cells of `cell` width, centered on
 * (0, 0). The inner corners are jittered so the facets are irregular, like terrain, not a grid.
 * Corners with no ground drop to `-sink`: the edge of the field falls as a slope into the relief
 * or the sea instead of ending in a wall.
 */
export function groundField(cols: number, rows: number, cell: number, seed: number, height: GroundHeight, color: GroundColor, sink = 0.04): Tri[] {
  const rng = createSeededRng(seed);
  const w = cols * cell;
  const d = rows * cell;
  const pts: Vec3[][] = [];
  const has: boolean[][] = [];
  for (let i = 0; i <= cols; i++) {
    pts.push([]);
    has.push([]);
    for (let j = 0; j <= rows; j++) {
      const edge = i === 0 || j === 0 || i === cols || j === rows;
      const jx = edge ? 0 : (rng() - 0.5) * cell * 0.7;
      const jz = edge ? 0 : (rng() - 0.5) * cell * 0.7;
      const x = -w / 2 + i * cell + jx;
      const z = -d / 2 + j * cell + jz;
      const h = height((x / w) * 2, (z / d) * 2, rng());
      has[i].push(h !== null);
      pts[i].push([x, h ?? -sink, z]);
    }
  }
  const out: Tri[] = [];
  const noise = createSeededRng(seed + 1);
  const face = (a: Vec3, b: Vec3, c: Vec3) => {
    const n = normalOf([a, b, c, 0]);
    const steep = 1 - Math.abs(n[1]);
    const mx = (a[0] + b[0] + c[0]) / 3;
    const my = (a[1] + b[1] + c[1]) / 3;
    const mz = (a[2] + b[2] + c[2]) / 3;
    out.push([a, b, c, color((mx / w) * 2, (mz / d) * 2, my, steep, noise())]);
  };
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      if (!has[i][j] && !has[i + 1][j] && !has[i][j + 1] && !has[i + 1][j + 1]) continue;
      const a = pts[i][j];
      const b = pts[i + 1][j];
      const c = pts[i + 1][j + 1];
      const e = pts[i][j + 1];
      // Split each cell along alternating diagonals, so the facets do not all lean the same way.
      if ((i + j) % 2) {
        face(a, e, c);
        face(a, c, b);
      } else {
        face(a, e, b);
        face(b, e, c);
      }
    }
  }
  return out;
}

/** A rough rock or ice chunk: a squashed, jittered octahedron. */
export function chunk(cx: number, cy: number, cz: number, sx: number, sy: number, sz: number, seed: number, color: number): Tri[] {
  const rng = createSeededRng(seed);
  const j = () => 0.75 + rng() * 0.5;
  const ring: Vec3[] = [0, 1, 2, 3, 4, 5].map((i) => {
    const a = (i / 6) * Math.PI * 2 + rng() * 0.4;
    return [cx + (Math.cos(a) * sx * j()) / 2, cy + (rng() - 0.3) * sy * 0.25, cz + (Math.sin(a) * sz * j()) / 2];
  });
  const top: Vec3 = [cx + (rng() - 0.5) * sx * 0.3, cy + sy / 2, cz + (rng() - 0.5) * sz * 0.3];
  const bottom: Vec3 = [cx, cy - sy / 2, cz];
  const out: Tri[] = [];
  for (let i = 0; i < 6; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % 6];
    out.push([top, b, a, color], [bottom, a, b, color]);
  }
  return out;
}

const PENGUIN_BLACK = 0x1f2a36;
const EMPEROR_BACK = 0x3b4956;
const PENGUIN_WHITE = 0xf7fafb;
const EMPEROR_YELLOW = 0xf4b634;
const EMPEROR_CHEST = 0xf6e7a8;
// Approximate colors: the orange stripe of the lower mandible and the dark brown eye, a little
// lighter than the black head so it shows.
const EMPEROR_BILL = 0xe8843c;
const EMPEROR_EYE = 0x5a3b26;

/**
 * Outline of the body of emperor(), feet to neck: [height, front, back, half width] in its units
 * (height 1, front +x). Egg-shaped, widest at the belly, narrowing to a neck under the head.
 */
const EMPEROR_BODY: readonly (readonly [number, number, number, number])[] = [
  [0, 0.09, 0.1, 0.1],
  [0.05, 0.17, 0.15, 0.16],
  [0.17, 0.225, 0.18, 0.21],
  [0.33, 0.24, 0.18, 0.22],
  [0.49, 0.215, 0.165, 0.205],
  [0.63, 0.17, 0.14, 0.175],
  [0.75, 0.115, 0.1, 0.115],
  [0.86, 0.08, 0.05, 0.065],
];
const EMPEROR_BODY_SEGS = 10;
/** Tip of the bill of emperor(), the last section of EMPEROR_HEAD. */
const EMPEROR_BILL_END: Vec3 = [0.265, 0.838, 0];
/** Head and bill of emperor() along x (loftBody stations): round crown, then a long bill curving down a little. */
const EMPEROR_HEAD: readonly Station[] = [
  [-0.07, 0.905, 0.04, 0.04],
  [-0.04, 0.91, 0.075, 0.072],
  [0.01, 0.915, 0.085, 0.08],
  [0.06, 0.905, 0.065, 0.062],
  [0.1, 0.885, 0.032, 0.03],
  [0.185, 0.862, 0.016, 0.015],
  [EMPEROR_BILL_END[0], EMPEROR_BILL_END[1], 0.005, 0.005],
];
/** Middle of the head of emperor(): the swimming emperor pitches its head about it. */
const EMPEROR_HEAD_MIDDLE: Vec3 = [0.015, 0.915, 0];

/** A point turned round z by `a` radians (from +x towards +y). */
const rotZ = ([x, y, z]: Vec3, a: number): Vec3 => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a), z];
const tiltZ = (tris: readonly Tri[], a: number): Tri[] => tris.map(([p, q, r, col]) => [rotZ(p, a), rotZ(q, a), rotZ(r, a), col]);

/**
 * Emperor penguin, low-poly: an egg-shaped body with a white belly and slate-grey back, a pale
 * yellow upper chest, golden-orange patches down the sides of the neck and on the lower head, a
 * black head with brown eyes, a long bill curving down with an orange stripe, black feet and the
 * stiff tail it leans on. Every part is closed, so it shows no hole from any side. `k` is its height.
 */
export function emperor(x: number, z: number, k: number, facing = 0): Tri[] {
  const { body, head, feet, tail } = emperorParts();
  // The tail leans down to the ground behind the feet.
  const standingTail = shift(tiltZ(tail, 0.38), -0.09, 0.08, 0);
  return shift(scaled(turn([...body, ...head, ...feet, ...standingTail], facing), k), x, 0, z);
}

/**
 * The parts of emperor() in its own units (height 1, front +x), apart so it can also be laid flat
 * to swim: body, head with bill and eyes, and feet as it stands; the tail from its root at (0, 0, 0)
 * out along -x.
 */
function emperorParts(): { body: Tri[]; head: Tri[]; feet: Tri[]; tail: Tri[] } {
  const bodyColor = (band: number, seg: number) => {
    // 1 straight ahead (+x), -1 behind; ±0.31 are the two segments at the sides of the white front.
    const ahead = Math.sin(((seg + 0.5) / EMPEROR_BODY_SEGS) * Math.PI * 2);
    if (band >= 5) return ahead > 0.25 && ahead < 0.5 ? EMPEROR_YELLOW : ahead > 0.5 && band === 5 ? EMPEROR_CHEST : PENGUIN_BLACK;
    return ahead > 0.25 ? PENGUIN_WHITE : EMPEROR_BACK;
  };
  // Lofted along its height, then stood up: the height becomes y, the front +x.
  const stand = ([x, y, z]: Vec3): Vec3 => [y, x, -z];
  const body = loftBody(
    EMPEROR_BODY.map(([h, front, back, w]): Station => [h, (front - back) / 2, (front + back) / 2, w]),
    bodyColor,
    [EMPEROR_BACK, PENGUIN_BLACK],
    EMPEROR_BODY_SEGS,
  ).map(([a, b, c, col]): Tri => [stand(a), stand(b), stand(c), col]);
  // Segments 0, 3, 4 and 7 are the sides, 4 and 7 the lower ones: the ear patch behind (the whole
  // side at the back of the head, the lower side under the crown), the stripe of the bill in front.
  const head = loftBody(EMPEROR_HEAD, (band, seg) => {
    const a = ((seg + 0.5) / 8) * Math.PI * 2;
    const side = Math.abs(Math.cos(a)) > 0.9;
    const lowerSide = side && Math.sin(a) < 0;
    if ((side && band === 0) || (lowerSide && band === 1)) return EMPEROR_YELLOW;
    if (lowerSide && band >= 4) return EMPEROR_BILL;
    return PENGUIN_BLACK;
  }, [PENGUIN_BLACK, PENGUIN_BLACK]);
  const eye = spike([0.045, 0.925, 0.056], [0.004, 0, 0.013], 0.013, EMPEROR_EYE);
  const foot = (zc: number) => prism([[0.015, zc - 0.028], [0.15, zc - 0.05], [0.21, zc], [0.15, zc + 0.05], [0.015, zc + 0.028]], 0, 0.026, PENGUIN_BLACK, PENGUIN_BLACK, true);
  const tail = loftBody([[-0.18, 0, 0.006, 0.018], [-0.08, 0, 0.018, 0.042], [0.02, 0, 0.028, 0.05]], () => EMPEROR_BACK, [EMPEROR_BACK, EMPEROR_BACK], 4);
  return { body, head: [...head, ...eye, ...mirrorZ(eye)], feet: [...foot(0.065), ...foot(-0.065)], tail };
}

/** A point of emperor() laid flat to swim: its head (+y) leads along +x, its white front (+x) faces down, centred on its middle. */
const lieFlat = ([x, y, z]: Vec3): Vec3 => [y - 0.5, -x, z];
/** Tip of the bill of emperorSwimming(), along +x: where it holds a caught fish. */
export const EMPEROR_SWIM_BILL_TIP = 0.64;
/** How much the swimming emperor raises its bill (radians), so the bill points ahead in line with the body. */
const SWIM_HEAD_PITCH = 0.29;

/**
 * emperor() swimming: the same body and colors laid flat, belly down; the head ahead of the neck
 * with the bill pointing forward, its tip at (EMPEROR_SWIM_BILL_TIP, 0, 0); the feet and the tail
 * trailing behind. One unit long without the bill and the tail, centred on its middle. ILLUSTRATIVE.
 */
export function emperorSwimming(): Tri[] {
  const { body, head, feet, tail } = emperorParts();
  const flat = body.map(([a, b, c, col]): Tri => [lieFlat(a), lieFlat(b), lieFlat(c), col]);
  const [mx, my] = EMPEROR_HEAD_MIDDLE;
  const tip = rotZ([EMPEROR_BILL_END[0] - mx, EMPEROR_BILL_END[1] - my, 0], SWIM_HEAD_PITCH);
  const swimHead = shift(tiltZ(shift(head, -mx, -my, 0), SWIM_HEAD_PITCH), EMPEROR_SWIM_BILL_TIP - tip[0], -tip[1], 0);
  return [...flat, ...swimHead, ...shift(turn(feet, Math.PI), -0.42, -0.05, 0), ...shift(tiltZ(tail, -0.1), -0.46, 0.02, 0)];
}

// Emperor chick: grey down with the white face mask and black crown it keeps while it moults
// (Schiel et al. 2019, Cerro Nevado #206). Approximate colors.
const CHICK_DOWN = 0x9ba1a6;
const CHICK_DOWN_DARK = 0x7c8389;

/**
 * Emperor chick, low-poly: a round grey body, the black crown and the white face mask, facing +x
 * as emperor(). `k` is its height.
 */
export function emperorChick(x: number, z: number, k: number, facing = 0): Tri[] {
  // The four segments round +x are the face, as the white front of emperor().
  const face = (i: number) => i < 2 || i > 4;
  const body = lathe(0, 0, [[0, 0.2], [0.26, 0.27], [0.52, 0.23], [0.68, 0.15]], 7, (_i, band) => (band === 0 ? CHICK_DOWN_DARK : CHICK_DOWN));
  const head = lathe(0.02, 0, [[0.66, 0.16], [0.8, 0.16], [0.9, 0.11], [1, 0]], 7, (i, band) => (band < 2 && face(i) ? PENGUIN_WHITE : PENGUIN_BLACK));
  const bill: Tri[] = [
    [[0.16, 0.8, 0.02], [0.16, 0.8, -0.02], [0.25, 0.78, 0], PENGUIN_BLACK],
    [[0.16, 0.78, -0.02], [0.16, 0.78, 0.02], [0.25, 0.78, 0], PENGUIN_BLACK],
  ];
  return shift(scaled(turn([...body, ...head, ...bill], facing), k), x, 0, z);
}

/** Where the flipper of emperor() hangs, in its units (height 1, front +x): its +z shoulder, on the body. */
export const EMPEROR_SHOULDER: Vec3 = [0, 0.64, 0.17];
/** Turn (radians) of a flipper at rest away from the body, so it lies on the widening side instead of inside it. */
const FLIPPER_REST = 0.3;
/** Sections of a flipper down from the shoulder: [y, leading edge x, trailing edge x, half thickness]; widest near the root, the tip swept back. */
const FLIPPER_SECTIONS: readonly (readonly [number, number, number, number])[] = [
  [0, 0.04, -0.05, 0.016],
  [-0.1, 0.05, -0.06, 0.014],
  [-0.22, 0.035, -0.05, 0.011],
  [-0.31, 0.012, -0.035, 0.007],
  [-0.35, -0.004, -0.022, 0.003],
];
/** How far the flipper stands out from the shoulder (+z), so it lies on the body and not in it. */
const FLIPPER_OFF = 0.008;

/**
 * A flipper of emperor(), apart so it can move: a tapered blade that hangs from (0, 0, 0) down -y
 * on the +z side, resting on the body, black outside with a light trailing border and pale on the
 * face towards the body, closed at the root and the tip. `side` -1 gives the one on -z. Units of
 * emperor(); place it at EMPEROR_SHOULDER, scaled by `k`. Turning it round x towards +z raises it.
 */
export function emperorFlipper(side: 1 | -1 = 1): Tri[] {
  const rings = FLIPPER_SECTIONS.map(([y, lead, trail, t]): Vec3[] => {
    const [m1, m2] = [lead + (trail - lead) * 0.3, lead + (trail - lead) * 0.7];
    const z = FLIPPER_OFF;
    return [[lead, y, z], [m1, y, z + t], [m2, y, z + t], [trail, y, z], [m2, y, z - t], [m1, y, z - t]];
  });
  // Segments 0 and 1 are the leading edge and the outer face; 2 the trailing border; 3 to 5 the inner face.
  const blade = skin(rings, (_band, seg) => (seg <= 1 ? PENGUIN_BLACK : PENGUIN_WHITE), PENGUIN_BLACK);
  const middle = (r: readonly Vec3[]): Vec3 => [0, 1, 2].map((k) => r.reduce((sum, p) => sum + p[k], 0) / r.length) as unknown as Vec3;
  const [root, below] = [rings[0], middle(rings[1])];
  const cap = root.map((p, i) => facingOut(middle(root), p, root[(i + 1) % root.length], PENGUIN_BLACK, below));
  const c = Math.cos(FLIPPER_REST);
  const sn = Math.sin(FLIPPER_REST);
  // Round x, so that what hangs (-y) swings out towards +z.
  const out = ([x, y, z]: Vec3): Vec3 => [x, y * c + z * sn, -y * sn + z * c];
  const tris = [...blade, ...cap].map(([a, b, d, col]): Tri => [out(a), out(b), out(d), col]);
  return side === 1 ? tris : mirrorZ(tris);
}

/** A point of emperorFlipper() turned to swim: what hung down (-y) reaches out (+z), and its flat face becomes a level paddle. */
const reachOut = ([x, y, z]: Vec3): Vec3 => [x, z, -y];
/** Where a swimming flipper meets emperorSwimming(): the shoulder of emperor() laid flat, on the +z side of the body. */
export const EMPEROR_SWIM_SHOULDER: Vec3 = [EMPEROR_SHOULDER[1] - 0.5, 0, 0.12];

/** The +z flipper of emperorSwimming(), from (0, 0, 0) out towards +z, black above and pale below; mirror it for -z. */
export function emperorSwimFlipper(): Tri[] {
  return emperorFlipper(1).map(([a, b, c, col]): Tri => [reachOut(a), reachOut(b), reachOut(c), col]);
}

/** An emperor() with both flippers hanging at its sides. */
export function emperorWithFlippers(x: number, z: number, k: number, facing = 0): Tri[] {
  const [sx, sy, sz] = EMPEROR_SHOULDER;
  const flippers = [...shift(emperorFlipper(1), sx, sy, sz), ...shift(emperorFlipper(-1), sx, sy, -sz)];
  return [...emperor(x, z, k, facing), ...shift(scaled(turn(flippers, facing), k), x, 0, z)];
}

const unit = (v: Vec3): Vec3 => {
  const l = Math.hypot(v[0], v[1], v[2]);
  return l ? [v[0] / l, v[1] / l, v[2] / l] : [0, 1, 0];
};
const along = (p: Vec3, u: Vec3, su: number, v: Vec3, sv: number): Vec3 => [p[0] + u[0] * su + v[0] * sv, p[1] + u[1] * su + v[1] * sv, p[2] + u[2] * su + v[2] * sv];

/** A square-section bar from `a` to `b` of half-thickness `r`, in any direction: masts, braces, rails. */
export function strut(a: Vec3, b: Vec3, r: number, color: number, caps = true): Tri[] {
  const dir = unit(sub(b, a));
  const ref: Vec3 = Math.abs(dir[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const u = unit(cross(ref, dir));
  const v = cross(dir, u);
  const ring = (p: Vec3): [Vec3, Vec3, Vec3, Vec3] => [along(p, u, r, v, r), along(p, u, -r, v, r), along(p, u, -r, v, -r), along(p, u, r, v, -r)];
  const ra = ring(a);
  const rb = ring(b);
  const out: Tri[] = [];
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    out.push([ra[i], ra[j], rb[j], color], [ra[i], rb[j], rb[i], color]);
  }
  if (caps) {
    out.push([ra[0], ra[3], ra[2], color], [ra[0], ra[2], ra[1], color]);
    out.push([rb[0], rb[1], rb[2], color], [rb[0], rb[2], rb[3], color]);
  }
  return out;
}

/** A rectangle ring with its corners cut by `c` (eight points), counter-clockwise seen from above. */
export function chamferRect(cx: number, cz: number, w: number, d: number, c: number): [number, number][] {
  const hx = w / 2;
  const hz = d / 2;
  return [
    [cx + hx, cz - hz + c], [cx + hx - c, cz - hz], [cx - hx + c, cz - hz], [cx - hx, cz - hz + c],
    [cx - hx, cz + hz - c], [cx - hx + c, cz + hz], [cx + hx - c, cz + hz], [cx + hx, cz + hz - c],
  ];
}

export interface LoftStation {
  readonly x: number;
  /** Ring of [z, y] points counter-clockwise seen from +x. */
  readonly ring: readonly (readonly [number, number])[];
}

/**
 * A skin over cross-sections set along x (a fuselage, a hull): the stations go in ascending x and
 * every ring has the same number of points. `colorAt(band, segment)` colors each face; an end is
 * closed only when its cap color is given.
 */
export function loftAlongX(stations: readonly LoftStation[], colorAt: (bandIdx: number, segIdx: number) => number, backCapColor?: number, frontCapColor?: number): Tri[] {
  const out: Tri[] = [];
  const n = stations[0].ring.length;
  for (let k = 0; k < stations.length - 1; k++) {
    const x0 = stations[k].x;
    const x1 = stations[k + 1].x;
    const r0 = stations[k].ring;
    const r1 = stations[k + 1].ring;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const [az0, ay0] = r0[i];
      const [bz0, by0] = r0[j];
      const [az1, ay1] = r1[i];
      const [bz1, by1] = r1[j];
      out.push(...quad([x1, ay1, az1], [x1, by1, bz1], [x0, by0, bz0], [x0, ay0, az0], colorAt(k, i)));
    }
  }
  const cap = (s: LoftStation, color: number, front: boolean) => {
    const [cz, cy] = s.ring.reduce(([sz, sy], [z, y]) => [sz + z / n, sy + y / n], [0, 0]);
    for (let i = 0; i < n; i++) {
      const [az, ay] = s.ring[i];
      const [bz, by] = s.ring[(i + 1) % n];
      out.push(front ? [[s.x, cy, cz], [s.x, by, bz], [s.x, ay, az], color] : [[s.x, cy, cz], [s.x, ay, az], [s.x, by, bz], color]);
    }
  };
  if (backCapColor !== undefined) cap(stations[0], backCapColor, false);
  if (frontCapColor !== undefined) cap(stations[stations.length - 1], frontCapColor, true);
  return out;
}

/** The faces mirrored across the plane z = 0 (the other wing, the other engine), still facing out. */
export const mirrorZ = (tris: readonly Tri[]): Tri[] => tris.map(([a, b, c, col]) => [[a[0], a[1], -a[2]], [c[0], c[1], -c[2]], [b[0], b[1], -b[2]], col]);

// --- Shared shape helpers (Fósiles #7, Océano #196) -------------------------------------------

const addV = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scaleV = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const faceMid = ([a, b, c]: Tri): Vec3 => [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];

/** An ellipse ring [z, y] of `n` points round (cz, cy). */
const ellipse = (cz: number, cy: number, hz: number, hy: number, n = 8): [number, number][] =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return [cz + Math.cos(a) * hz, cy + Math.sin(a) * hy];
  });

/** The faces turned so each one faces away from the point `inside(face)` gives for it. */
export function outward(tris: readonly Tri[], inside: (mid: Vec3) => Vec3): Tri[] {
  return tris.map((t) => {
    const n = normalOf(t);
    const m = faceMid(t);
    const o = inside(m);
    const dot = n[0] * (m[0] - o[0]) + n[1] * (m[1] - o[1]) + n[2] * (m[2] - o[2]);
    return dot < 0 ? [t[0], t[2], t[1], t[3]] : t;
  });
}

/** A body along x from stations of (x, center y, half height, half width), with faces out from its axis. */
export function loftBody(stations: readonly (readonly [number, number, number, number])[], colorAt: (band: number, seg: number) => number, caps: [number?, number?] = [], n = 8): Tri[] {
  const loft: LoftStation[] = stations.map(([x, cy, hy, hz]) => ({ x, ring: ellipse(0, cy, Math.max(hz, 1e-4), Math.max(hy, 1e-4), n) }));
  const tris = loftAlongX(loft, colorAt, caps[0], caps[1]);
  // The axis at each face: its x, and the center height of the stations around it.
  const cyAt = (x: number) => {
    for (let k = 0; k < stations.length - 1; k++) {
      const [x0, y0] = stations[k];
      const [x1, y1] = stations[k + 1];
      if (x >= x0 - 1e-9 && x <= x1 + 1e-9) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0 || 1);
    }
    return x < stations[0][0] ? stations[0][1] : stations[stations.length - 1][1];
  };
  const [first, last] = [stations[0][0], stations[stations.length - 1][0]];
  return outward(tris, ([x]) => [Math.min(last - 1e-3, Math.max(first + 1e-3, x)), cyAt(x), 0]);
}

/** A four-sided spike from a base center, pointing along `dir`: an armor plate or a tooth. */
export function spike(base: Vec3, dir: Vec3, r: number, color: number): Tri[] {
  const tip = addV(base, dir);
  const up: Vec3 = Math.abs(dir[1]) > 0.9 * Math.hypot(...dir) ? [1, 0, 0] : [0, 1, 0];
  const l = Math.hypot(...dir);
  const d = scaleV(dir, 1 / l);
  const u0: Vec3 = [up[1] * d[2] - up[2] * d[1], up[2] * d[0] - up[0] * d[2], up[0] * d[1] - up[1] * d[0]];
  const ul = Math.hypot(...u0);
  const u = scaleV(u0, r / ul);
  const v0: Vec3 = [d[1] * u[2] - d[2] * u[1], d[2] * u[0] - d[0] * u[2], d[0] * u[1] - d[1] * u[0]];
  const v = scaleV(v0, 1 / Math.hypot(...v0) * r);
  const ring = [addV(base, u), addV(base, v), addV(base, scaleV(u, -1)), addV(base, scaleV(v, -1))];
  const tris: Tri[] = [];
  for (let i = 0; i < 4; i++) tris.push([ring[i], ring[(i + 1) % 4], tip, color], [ring[(i + 1) % 4], ring[i], base, color]);
  return outward(tris, () => addV(base, scaleV(dir, 0.25)));
}

/**
 * A stack of horizontal rings round a vertical axis at (cx, cz), each [y, half depth (x), half width
 * (z)], bottom to top, closed at both ends; faces turned out from the axis.
 */
export function column(cx: number, cz: number, rings: readonly (readonly [number, number, number])[], segments: number, color: number | ((band: number, seg: number) => number)): Tri[] {
  const at = (k: number, i: number): Vec3 => {
    const [y, rx, rz] = rings[k];
    const a = (i / segments) * Math.PI * 2;
    return [cx + Math.cos(a) * rx, y, cz + Math.sin(a) * rz];
  };
  const col = (k: number, i: number) => (typeof color === 'number' ? color : color(k, i));
  const tris: Tri[] = [];
  for (let k = 0; k < rings.length - 1; k++) {
    for (let i = 0; i < segments; i++) tris.push([at(k, i), at(k, i + 1), at(k + 1, i + 1), col(k, i)], [at(k, i), at(k + 1, i + 1), at(k + 1, i), col(k, i)]);
  }
  const last = rings.length - 1;
  for (let i = 0; i < segments; i++) {
    tris.push([[cx, rings[0][0], cz], at(0, i), at(0, i + 1), col(0, i)]);
    tris.push([[cx, rings[last][0], cz], at(last, i), at(last, i + 1), col(last - 1, i)]);
  }
  const mid = (rings[0][0] + rings[last][0]) / 2;
  return outward(tris, ([, y]) => [cx, Math.min(rings[last][0] - 1e-3, Math.max(rings[0][0] + 1e-3, y === rings[0][0] || y === rings[last][0] ? mid : y)), cz]);
}

/**
 * A skin over convex rings of the same number of points set in any direction (a flipper along z, a
 * fin along x). Each face is wound away from the middle of its band; the last ring is closed only
 * when `endCap` gives its color. As `skin` in herculesModel.ts, which is not exported.
 */
export function skin(rings: readonly (readonly Vec3[])[], colorAt: (band: number, seg: number) => number, endCap?: number): Tri[] {
  const center = (r: readonly Vec3[]): Vec3 => [0, 1, 2].map((k) => r.reduce((sum, p) => sum + p[k], 0) / r.length) as unknown as Vec3;
  const centers = rings.map(center);
  const n = rings[0].length;
  const out: Tri[] = [];
  for (let k = 0; k < rings.length - 1; k++) {
    const inside: Vec3 = [0, 1, 2].map((c) => (centers[k][c] + centers[k + 1][c]) / 2) as unknown as Vec3;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const color = colorAt(k, i);
      out.push(facingOut(rings[k][i], rings[k][j], rings[k + 1][j], color, inside), facingOut(rings[k][i], rings[k + 1][j], rings[k + 1][i], color, inside));
    }
  }
  const last = rings.length - 1;
  if (endCap !== undefined) for (let i = 0; i < n; i++) out.push(facingOut(centers[last], rings[last][i], rings[last][(i + 1) % n], endCap, centers[last - 1]));
  return out;
}

/** The faces of a fin built along +z (span), +x (chord) and +y (thickness), turned so its span runs along `span` and its +y face looks towards `face`. */
export function orient(tris: readonly Tri[], span: Vec3, face: Vec3): Tri[] {
  const unit = (v: Vec3): Vec3 => {
    const l = Math.hypot(...v);
    return [v[0] / l, v[1] / l, v[2] / l];
  };
  const s = unit(span);
  const along = face[0] * s[0] + face[1] * s[1] + face[2] * s[2];
  const n = unit([face[0] - along * s[0], face[1] - along * s[1], face[2] - along * s[2]]);
  const k: Vec3 = [n[1] * s[2] - n[2] * s[1], n[2] * s[0] - n[0] * s[2], n[0] * s[1] - n[1] * s[0]];
  const r = ([x, y, z]: Vec3): Vec3 => [k[0] * x + n[0] * y + s[0] * z, k[1] * x + n[1] * y + s[1] * z, k[2] * x + n[2] * y + s[2] * z];
  return tris.map(([a, b, c, col]) => [r(a), r(b), r(c), col]);
}

/** A loftBody station: x, center y, half height, half width. */
export type Station = readonly [number, number, number, number];
/** loftBody stations (x, center y, half height, half width) from an outline of (x, top, bottom, half width). */
export const fromOutline = (outline: readonly Station[]): Station[] => outline.map(([x, top, bottom, hz]) => [x, (top + bottom) / 2, (top - bottom) / 2, hz]);
/** Center y, half height and half width of a lofted body at x. */
export function sectionAt(stations: readonly Station[], x: number): [number, number, number] {
  let k = 0;
  while (k < stations.length - 2 && x > stations[k + 1][0]) k++;
  const [x0, y0, h0, w0] = stations[k];
  const [x1, y1, h1, w1] = stations[k + 1];
  const u = Math.min(1, Math.max(0, (x - x0) / (x1 - x0)));
  return [y0 + (y1 - y0) * u, h0 + (h1 - h0) * u, w0 + (w1 - w0) * u];
}
/** Height of the top of a lofted body at (x, z). */
export const topAt = (stations: readonly Station[], x: number, z: number) => {
  const [cy, hy, hz] = sectionAt(stations, x);
  return cy + hy * Math.sqrt(Math.max(0, 1 - (z / hz) ** 2));
};
/** Half width of a lofted body at (x, y). */
export const sideAt = (stations: readonly Station[], x: number, y: number) => {
  const [cy, hy, hz] = sectionAt(stations, x);
  return hz * Math.sqrt(Math.max(0, 1 - ((y - cy) / hy) ** 2));
};

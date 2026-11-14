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

/**
 * A color with this bit already carries its shade (reliefColor): the geometry draws it as it is.
 * Faces that must look like the painted relief use it.
 */
export const PRESHADED = 0x1000000;

/** Every face merged into one geometry with vertex colors: one draw call per model. */
export function buildPolyGeometry(tris: readonly Tri[]): BufferGeometry {
  const positions = new Float32Array(tris.length * 9);
  const colors = new Float32Array(tris.length * 9);
  const color = new Color();
  tris.forEach((t, i) => {
    const n = normalOf(t);
    // The light of the painted relief (reliefLight): the models are lit by the same sun as the map.
    const light = Math.min(1, reliefLight(n) / RELIEF_FLAT_LIT);
    const preshaded = t[3] >= PRESHADED;
    const shade = preshaded ? 1 : SHADE_MIN + (SHADE_MAX - SHADE_MIN) * light;
    color.setHex(preshaded ? t[3] - PRESHADED : t[3]);
    for (let k = 0; k < 3; k++) {
      positions.set(t[k] as Vec3, i * 9 + k * 3);
      colors.set([color.r * shade, color.g * shade, color.b * shade], i * 9 + k * 3);
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
const PENGUIN_WHITE = 0xf7fafb;
const EMPEROR_YELLOW = 0xf2c14e;
const EMPEROR_BILL = 0xe59a6b;

/**
 * Emperor penguin, low-poly: an upright body (black back, white front facing +x), the head with its
 * yellow ear patches and the long bill. `k` is its height.
 */
export function emperor(x: number, z: number, k: number, facing = 0): Tri[] {
  const front = (i: number) => {
    const a = (i + 0.5) / 7;
    return a < 0.22 || a > 0.78 ? PENGUIN_WHITE : PENGUIN_BLACK;
  };
  const body = lathe(0, 0, [[0, 0.17], [0.3, 0.22], [0.62, 0.18], [0.78, 0.12]], 7, (i, band) => (band < 2 ? front(i) : i === 1 || i === 5 ? EMPEROR_YELLOW : front(i)));
  const head = lathe(0.03, 0, [[0.76, 0.12], [0.9, 0.11], [1, 0]], 7, (i) => (i === 1 || i === 5 ? EMPEROR_YELLOW : PENGUIN_BLACK));
  const bill: Tri[] = [
    [[0.12, 0.86, 0.025], [0.12, 0.86, -0.025], [0.27, 0.82, 0], PENGUIN_BLACK],
    [[0.12, 0.84, -0.025], [0.12, 0.84, 0.025], [0.27, 0.82, 0], EMPEROR_BILL],
  ];
  const feet = block(0.06, 0.012, 0, 0.12, 0.024, 0.16, PENGUIN_BLACK);
  return shift(scaled(turn([...body, ...head, ...bill, ...feet], facing), k), x, 0, z);
}

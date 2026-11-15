import { createSeededRng } from '@antartida/core';
import { buildFlagpoleBaseTris } from '../orcadas/lowPolyBuildings.ts';
import { FLAG_SEGMENT_WIDTH, VOXEL_PALETTE } from '../orcadas/stationModels.ts';
import {
  block,
  chunk,
  extrude,
  groundField,
  lathe,
  prism,
  RELIEF_ICE,
  RELIEF_ROCK,
  scaled,
  shift,
  turn,
  type Tri,
  type Vec3,
} from './lowPoly.ts';

const {
  BLACK,
  CREAM,
  ICE,
  ICE_BLUE,
  LAMP,
  ORANGE,
  RED,
  ROCK,
  ROCK_DARK,
  ROCK_LIGHT,
  SKY,
  WHITE,
  WINDOW_DAY,
  ZINC,
} = VOXEL_PALETTE;

/** Elevation of the levelled station terrace over the shoreline (model units). */
const TERRACE_Y = 0.032;

const smooth = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Octagonal chamfered rectangle ring in (x, z), counter-clockwise seen from above. */
function chamferRect(cx: number, cz: number, w: number, d: number, c: number): [number, number][] {
  const hx = w / 2;
  const hz = d / 2;
  return [
    [cx + hx, cz - hz + c],
    [cx + hx - c, cz - hz],
    [cx - hx + c, cz - hz],
    [cx - hx, cz - hz + c],
    [cx - hx, cz + hz - c],
    [cx - hx + c, cz + hz],
    [cx + hx - c, cz + hz],
    [cx + hx, cz + hz - c],
  ];
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const norm = (v: Vec3): Vec3 => {
  const l = Math.hypot(v[0], v[1], v[2]);
  return l ? [v[0] / l, v[1] / l, v[2] / l] : [0, 1, 0];
};
const addScaled = (p: Vec3, u: Vec3, su: number, v: Vec3, sv: number): Vec3 => [
  p[0] + u[0] * su + v[0] * sv,
  p[1] + u[1] * su + v[1] * sv,
  p[2] + u[2] * su + v[2] * sv,
];

/** Square-section strut from `a` to `b` with half-thickness `r`, outward-facing. */
function strut(a: Vec3, b: Vec3, r: number, color: number): Tri[] {
  const dir = norm(sub(b, a));
  const ref: Vec3 = Math.abs(dir[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const u = norm(cross(ref, dir));
  const v = cross(dir, u);
  const ring = (p: Vec3): [Vec3, Vec3, Vec3, Vec3] => [
    addScaled(p, u, r, v, r),
    addScaled(p, u, -r, v, r),
    addScaled(p, u, -r, v, -r),
    addScaled(p, u, r, v, -r),
  ];
  const ra = ring(a);
  const rb = ring(b);
  const out: Tri[] = [];
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    out.push([ra[i], ra[j], rb[j], color], [ra[i], rb[j], rb[i], color]);
  }
  return out;
}

/**
 * Laurie Island isthmus terrain: a narrow rocky-and-snowy neck between Scotia Bay (+z)
 * and Uruguay Bay (-z) that widens into low coastal headlands at the west (-x) and east (+x) ends.
 * Uses RELIEF_ROCK and RELIEF_ICE so resolveRelief matches the painted 3D map relief.
 */
function buildIsthmusGround(): Tri[] {
  return groundField(
    14,
    10,
    0.078,
    1904,
    (u, v, noise) => {
      const waist = 0.56 + 0.34 * smooth(0.32, 0.92, Math.abs(u));
      const coastWave = 0.09 * Math.sin(u * 4.2 + 0.6) + 0.06 * Math.cos(u * 7.5);
      const edge = Math.hypot(u / 0.98, (v - coastWave * 0.4) / waist) + (noise - 0.5) * 0.14;
      if (edge > 1) return null;

      const headland =
        0.028 * Math.max(0, 1 - Math.hypot((u + 0.78) / 0.34, (v + 0.15) / 0.65)) +
        0.024 * Math.max(0, 1 - Math.hypot((u - 0.78) / 0.36, (v + 0.2) / 0.6));
      const terrace = TERRACE_Y * smooth(1.0, 0.62, edge);
      return Math.max(0.012, terrace + headland + (edge < 0.7 ? (noise - 0.5) * 0.005 : 0));
    },
    (u, v, h, steep, noise) => {
      if (steep > 0.24 || (Math.abs(u) > 0.62 && h > TERRACE_Y * 0.85 && noise > 0.35)) {
        return RELIEF_ROCK;
      }
      if (v > 0.38 && h < TERRACE_Y * 0.65) return RELIEF_ROCK;
      return noise > 0.72 && h < TERRACE_Y * 0.8 ? RELIEF_ROCK : RELIEF_ICE;
    },
    0,
  );
}

/**
 * Omond House stone ruin (1903, HSM 42), roofless:
 * stepped broken stone walls, tapered chimney stub, fallen rubble chunks, and snow drift inside.
 */
function buildOmondRuin(x: number, y: number, z: number, angle: number): Tri[] {
  const l = 0.22;
  const w = 0.12;
  const t = 0.016;
  const local: Tri[] = [
    // Stone floor
    ...prism(chamferRect(0, 0, l, w, 0.01), 0, 0.008, ROCK_DARK),
    // Back wall (-z), broken masonry stepping down toward the east
    ...block(0, 0.028, -w / 2 + t / 2, l, 0.042, t, ROCK),
    ...block(-l * 0.28, 0.054, -w / 2 + t / 2, l * 0.36, 0.012, t, ROCK_LIGHT),
    ...block(l * 0.22, 0.051, -w / 2 + t / 2, l * 0.24, 0.009, t, ROCK),
    // Side walls stepping down toward the front (+z)
    ...block(-l / 2 + t / 2, 0.024, 0, t, 0.036, w, ROCK_LIGHT),
    ...block(-l / 2 + t / 2, 0.046, -w * 0.18, t, 0.012, w * 0.52, ROCK),
    ...block(l / 2 - t / 2, 0.02, -w * 0.08, t, 0.028, w * 0.8, ROCK),
    // Front wall (+z) broken around doorway gap
    ...block(-l * 0.3, 0.016, w / 2 - t / 2, l * 0.36, 0.02, t, ROCK),
    ...block(l * 0.33, 0.013, w / 2 - t / 2, l * 0.3, 0.014, t, ROCK_DARK),
    // Tapered stone chimney stub at west back corner (no roof)
    ...prism(chamferRect(-l / 2 + 0.02, -w / 2 + 0.02, 0.03, 0.03, 0.006), 0.045, 0.068, ROCK_DARK),
    ...prism(chamferRect(-l / 2 + 0.02, -w / 2 + 0.02, 0.022, 0.022, 0.004), 0.068, 0.078, ROCK),
    // Fallen stones and wind-drifted snow inside the open walls
    ...chunk(0.015, 0.012, 0.006, 0.03, 0.012, 0.022, 19031, ROCK_LIGHT),
    ...chunk(-0.028, 0.011, 0.014, 0.022, 0.01, 0.02, 19032, ROCK),
    ...shift(extrude([[0.014, 0], [-0.01, 0.015], [-0.01, 0]], -l * 0.18, l * 0.35, ICE, ICE), 0, 0.006, -w / 2 + t + 0.01),
  ];
  return shift(turn(local, angle), x, y, z);
}

/**
 * Miniature modern orange station module with elevated plinth/stilts, chamfered walls,
 * framed windows, entrance door + step, and either a round barrel-vault roof or a gabled roof.
 */
export function buildMiniModule(
  x: number,
  y: number,
  z: number,
  angle: number,
  length: number,
  width: number,
  height: number,
  roof: 'round' | 'gabled',
): Tri[] {
  const plinthH = height * 0.16;
  const roofH = height * 0.4;
  const wallH = height - plinthH - roofH;
  const y0 = plinthH + wallH;
  const chamfer = width * 0.05;
  const tris: Tri[] = [];

  // Elevated plinth & corner piers
  tris.push(...prism(chamferRect(0, 0, length * 0.94, width * 0.88, chamfer * 0.7), plinthH * 0.45, plinthH + 0.002, BLACK));
  const pierS = 0.016;
  for (const px of [-length * 0.4, length * 0.4]) {
    for (const pz of [-width * 0.36, width * 0.36]) {
      tris.push(...prism(chamferRect(px, pz, pierS, pierS, 0.003), 0, plinthH * 0.5, BLACK));
    }
  }

  // Chamfered orange walls & zinc lower trim
  tris.push(
    ...prism(chamferRect(0, 0, length, width, chamfer), plinthH, y0, ORANGE),
    ...prism(chamferRect(0, 0, length + 0.004, width + 0.004, chamfer), plinthH, plinthH + 0.005, ZINC),
  );

  // Entrance door on +x end with step
  tris.push(
    ...block(length / 2 + 0.003, plinthH + wallH * 0.42, 0, 0.006, wallH * 0.82, width * 0.32, CREAM),
    ...block(length / 2 + 0.012, plinthH * 0.5, 0, 0.02, plinthH, width * 0.36, ZINC),
  );

  // Framed windows on both +z and -z walls
  const winW = length * 0.16;
  const winH = wallH * 0.42;
  const winY = plinthH + wallH * 0.58;
  for (const wx of [-length * 0.25, 0.01, length * 0.25]) {
    for (const side of [1, -1] as const) {
      tris.push(
        ...block(wx, winY, side * (width / 2 + 0.002), winW + 0.008, winH + 0.008, 0.004, BLACK),
        ...block(wx, winY, side * (width / 2 + 0.004), winW, winH, 0.003, WINDOW_DAY),
      );
    }
  }

  if (roof === 'round') {
    const eaveH = roofH * 0.14;
    const archH = roofH * 0.86;
    const segments = 8;
    const profile: [number, number][] = Array.from({ length: segments + 1 }, (_, i) => {
      const a = (i / segments) * Math.PI;
      return [(Math.cos(a) * width) / 2, Math.sin(a) * archH];
    });
    tris.push(
      ...prism(chamferRect(0, 0, length + 0.012, width + 0.012, chamfer * 0.7), y0, y0 + eaveH, BLACK),
      ...shift(extrude(profile, -(length + 0.006) / 2, (length + 0.006) / 2, ORANGE, ORANGE), 0, y0 + eaveH, 0),
    );
    // Dark standing seam ribs across the curved roof
    for (const sx of [-length * 0.22, length * 0.22]) {
      for (let k = 0; k < segments; k++) {
        const a0 = (k / segments) * Math.PI;
        const a1 = ((k + 1) / segments) * Math.PI;
        const z0 = Math.cos(a0) * (width / 2 + 0.003);
        const yA = y0 + eaveH + Math.sin(a0) * (archH + 0.003);
        const z1 = Math.cos(a1) * (width / 2 + 0.003);
        const yB = y0 + eaveH + Math.sin(a1) * (archH + 0.003);
        tris.push(
          [[sx + 0.003, yA, z0], [sx + 0.003, yB, z1], [sx - 0.003, yB, z1], BLACK],
          [[sx + 0.003, yA, z0], [sx - 0.003, yB, z1], [sx - 0.003, yA, z0], BLACK],
        );
      }
    }
  } else {
    const eaveH = roofH * 0.16;
    const gableH = roofH * 0.84;
    const profile: [number, number][] = [
      [width / 2 + 0.008, 0],
      [0, gableH],
      [-(width / 2 + 0.008), 0],
    ];
    tris.push(
      ...prism(chamferRect(0, 0, length + 0.016, width + 0.018, chamfer * 0.8), y0, y0 + eaveH, BLACK),
      ...shift(extrude(profile, -(length + 0.012) / 2, (length + 0.012) / 2, ORANGE, ORANGE), 0, y0 + eaveH, 0),
      ...block(0, y0 + roofH - 0.003, 0, length + 0.014, 0.007, 0.012, BLACK),
    );
  }

  return shift(turn(tris, angle), x, y, z);
}

/**
 * Red-and-white tapered lattice radio tower on a stepped stone pad.
 */
export function buildMiniRadioTower(x: number, y: number, z: number, height: number): Tri[] {
  const tris: Tri[] = [
    ...prism(chamferRect(0, 0, 0.1, 0.1, 0.014), 0, 0.025, ROCK_DARK),
    ...prism(chamferRect(0, 0, 0.072, 0.072, 0.01), 0.025, 0.036, ROCK),
  ];

  const sections = 5;
  const baseY = 0.036;
  const secH = (height - baseY) / sections;
  const corners: readonly [number, number][] = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ];

  for (let s = 0; s < sections; s++) {
    const col = s % 2 === 0 ? RED : WHITE;
    const y0 = baseY + s * secH;
    const y1 = y0 + secH;
    const o0 = 0.032 * (1 - (s / sections) * 0.65);
    const o1 = 0.032 * (1 - ((s + 1) / sections) * 0.65);
    const legR = Math.max(0.0025, 0.0042 * (1 - (s / sections) * 0.4));
    const braceR = legR * 0.62;

    for (let i = 0; i < 4; i++) {
      const [ax, az] = corners[i];
      const [bx, bz] = corners[(i + 1) % 4];
      const p0: Vec3 = [ax * o0, y0, az * o0];
      const p1: Vec3 = [ax * o1, y1, az * o1];
      const q0: Vec3 = [bx * o0, y0, bz * o0];
      const q1: Vec3 = [bx * o1, y1, bz * o1];
      tris.push(...strut(p0, p1, legR, col));
      tris.push(...strut(p1, q1, braceR, col));
      tris.push(...((s + i) % 2 === 0 ? strut(p0, q1, braceR * 0.85, col) : strut(q0, p1, braceR * 0.85, col)));
    }
  }

  tris.push(...lathe(0, 0, [[height, 0.004], [height + 0.045, 0.0022], [height + 0.055, 0]], 6, BLACK));
  return shift(tris, x, y, z);
}

/**
 * Coastal fast-ice fringe and stranded brash-ice slabs along the Scotia Bay shoreline (+z).
 */
function buildCoastalIce(): Tri[] {
  const floeA: readonly [number, number][] = [
    [-0.36, 0.26],
    [-0.2, 0.24],
    [-0.14, 0.3],
    [-0.24, 0.34],
    [-0.38, 0.31],
  ];
  const floeB: readonly [number, number][] = [
    [0.14, 0.26],
    [0.32, 0.23],
    [0.42, 0.29],
    [0.34, 0.35],
    [0.18, 0.33],
  ];
  return [
    ...prism(floeA, 0, 0.013, ICE_BLUE, WHITE),
    ...prism(floeB, 0, 0.011, ICE_BLUE, ICE),
    ...chunk(-0.04, 0.009, 0.31, 0.06, 0.018, 0.045, 19044, WHITE),
    ...chunk(0.08, 0.008, 0.32, 0.045, 0.015, 0.04, 19045, ICE_BLUE),
    ...chunk(-0.43, 0.01, 0.2, 0.05, 0.02, 0.04, 19046, ICE),
  ];
}

/**
 * Small weathered iceberg grounded/drifting in the cove in front of the station (+z),
 * sculpted as an irregular faceted ridge with steep blue walls, snow cap, and calved chunks.
 */
function buildSmallIceberg(cx: number, cz: number): Tri[] {
  const rng = createSeededRng(19047);
  const berg = groundField(
    6,
    5,
    0.028,
    19048,
    (u, v, noise) => {
      const mainPeak = 0.082 * Math.max(0, 1 - Math.hypot((u + 0.22) * 1.35, v) / 0.92) ** 1.35;
      const shoulder = 0.048 * Math.max(0, 1 - Math.hypot(u - 0.35, v - 0.12) / 0.72) ** 1.3;
      const h = Math.max(mainPeak, shoulder) + (noise - 0.5) * 0.012;
      return h > 0.01 ? h : null;
    },
    (_u, _v, h, steep, noise) => {
      if (h < 0.022 || steep > 0.45) return ICE_BLUE;
      return noise > 0.65 ? ICE : WHITE;
    },
    0,
  );
  return [
    ...shift(berg, cx, 0, cz),
    ...chunk(cx + 0.09, 0.008, cz + 0.03, 0.032, 0.016, 0.028, Math.floor(rng() * 1e6), ICE_BLUE),
    ...chunk(cx - 0.08, 0.007, cz + 0.05, 0.025, 0.014, 0.022, Math.floor(rng() * 1e6), WHITE),
  ];
}

/**
 * Argentine flag cloth assembled from 5 rippling segments with Sol de Mayo, seated at the mast top.
 */
function buildWavingFlag(mastX: number, mastBaseY: number, mastZ: number, scale: number): Tri[] {
  const w = FLAG_SEGMENT_WIDTH;
  const cx = w / 2;
  const flagTris: Tri[] = [];
  let tipX = 0;
  let tipZ = 0;
  for (let i = 0; i < 5; i++) {
    const thick = i === 0 ? 0.04 : 0.024;
    const seg: Tri[] = [
      ...block(cx, 0.36, 0, w + 0.02, 0.36, thick, SKY),
      ...block(cx, 0.0, 0, w + 0.02, 0.36, thick, WHITE),
      ...block(cx, -0.36, 0, w + 0.02, 0.36, thick, SKY),
      ...block(cx, 0.53, 0, w, 0.03, thick + 0.006, ICE),
    ];
    if (i === 2) {
      const zOff = thick / 2 + 0.006;
      for (const side of [-1, 1] as const) {
        seg.push(
          ...block(cx, 0, side * zOff, 0.16, 0.16, 0.01, LAMP),
          ...block(cx, 0, side * (zOff - 0.002), 0.3, 0.05, 0.01, ORANGE),
          ...block(cx, 0, side * (zOff - 0.002), 0.05, 0.28, 0.01, ORANGE),
        );
      }
    }
    const yaw = 0.16 * Math.sin(i * 1.15 + 0.4);
    flagTris.push(...shift(turn(seg, yaw), tipX, 3.95, tipZ));
    tipX += w * Math.cos(yaw);
    tipZ -= w * Math.sin(yaw);
  }
  return shift(scaled(flagTris, scale), mastX, mastBaseY, mastZ);
}

export const ORCADAS_SITE_PARTS = (() => {
  const ground = buildIsthmusGround();
  const baseY = TERRACE_Y - 0.003;

  // 1. Omond House stone ruin (no roof) on the west terrace (-x)
  const omond = buildOmondRuin(-0.29, baseY, 0.03, 0.1);

  // 2. Two modern orange modules on the east terrace (+x): round-roof pavilion + gabled module
  const roundModule = buildMiniModule(0.24, baseY, -0.02, -0.14, 0.25, 0.135, 0.095, 'round');
  const gabledModule = buildMiniModule(0.22, baseY, 0.15, 0.2, 0.195, 0.115, 0.072, 'gabled');

  // 3. Red-and-white lattice radio tower behind the orange modules (-z)
  const tower = buildMiniRadioTower(0.14, baseY, -0.18, 0.41);

  // 4. Argentine flagpole and waving flag in the center foreground (reused from lowPolyBuildings)
  const flagScale = 0.08;
  const flagPos: readonly [number, number, number] = [-0.02, baseY, 0.15];
  const flagpole = shift(scaled(buildFlagpoleBaseTris(), flagScale), ...flagPos);
  const flag = buildWavingFlag(...flagPos, flagScale);

  // 5. Snow drifts & headland boulders anchoring the buildings to the isthmus
  const drifts: Tri[] = [
    ...shift(extrude([[0.035, 0], [-0.015, 0.024], [-0.025, 0]], -0.1, 0.1, RELIEF_ICE, RELIEF_ICE), 0.24, baseY, -0.11),
    ...chunk(-0.44, baseY + 0.012, -0.06, 0.08, 0.035, 0.07, 19049, RELIEF_ROCK),
    ...chunk(0.43, baseY + 0.012, -0.09, 0.09, 0.038, 0.07, 19050, RELIEF_ROCK),
    ...chunk(-0.14, baseY + 0.008, -0.14, 0.07, 0.024, 0.05, 19051, RELIEF_ICE),
  ];

  // 6. Coastal ice fringe and small iceberg in Scotia Bay (+z)
  const coastIce = buildCoastalIce();
  const iceberg = buildSmallIceberg(-0.22, 0.36);

  return {
    ground,
    omond,
    roundModule,
    gabledModule,
    tower,
    flagpole,
    flag,
    drifts,
    coastIce,
    iceberg,
  };
})();

/**
 * Low-poly miniature of Base Orcadas on the Laurie Island isthmus (width ~ 1.1, base at y = 0),
 * keeping the framing and orientation of the block ORCADAS_SITE:
 * - Isthmus ground with RELIEF_ROCK / RELIEF_ICE that blends into the 3D relief
 * - Omond House stone ruin (no roof) on the west side
 * - Two modern orange modules (one round-roofed, one gabled) on the east side
 * - Red-and-white lattice radio tower behind the modern modules
 * - Argentine flagpole with waving flag in the foreground center
 * - Coastal fast ice and a small weathered iceberg in Scotia Bay (+z)
 */
export const ORCADAS_SITE_POLY: Tri[] = Object.values(ORCADAS_SITE_PARTS).flat();

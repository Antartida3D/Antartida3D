import { block, lathe, loftAlongX, mirrorZ, normalOf, prism, strut, type LoftStation, type Tri, type Vec3 } from '../voyage/lowPoly.ts';
import { FOSSIL_PALETTE as C, PARKA_COLORS, type Parka } from './models.ts';

/**
 * Low-poly models of the four finds of Fósiles (#7, rule 30): the ammonite, the plesiosaur, the
 * armored dinosaur and the sea star. They keep the pivots of the block models they replace, so the
 * poses of fossilPoses.ts move them the same way. Illustrations, not anatomical measurements: the
 * forms and colors are an interpretation (the interface says so on each stop).
 */

/** A pivot and the faces that turn around it, in the pivot's own frame. */
export interface PolyPart { pivot: Vec3; tris: readonly Tri[] }

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const centroid = ([a, b, c]: Tri): Vec3 => [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];

/** The faces turned so each one faces away from the point `inside(face)` gives for it. */
export function outward(tris: readonly Tri[], inside: (mid: Vec3) => Vec3): Tri[] {
  return tris.map((t) => {
    const n = normalOf(t);
    const m = centroid(t);
    const o = inside(m);
    const dot = n[0] * (m[0] - o[0]) + n[1] * (m[1] - o[1]) + n[2] * (m[2] - o[2]);
    return dot < 0 ? [t[0], t[2], t[1], t[3]] : t;
  });
}

/** An ellipse ring [z, y] of `n` points round (cz, cy). */
const ellipse = (cz: number, cy: number, hz: number, hy: number, n = 8): [number, number][] =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return [cz + Math.cos(a) * hz, cy + Math.sin(a) * hy];
  });

/** A body along x from stations of (x, center y, half height, half width), with faces out from its axis. */
export function body(stations: readonly (readonly [number, number, number, number])[], colorAt: (band: number, seg: number) => number, caps: [number?, number?] = [], n = 8): Tri[] {
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

/** Upper faces in one color, lower ones in another: the dark back and pale belly of an animal. */
const backBelly = (back: number, belly: number, n = 8) => (_: number, seg: number) => {
  const a = ((seg + 0.5) / n) * Math.PI * 2;
  return Math.sin(a) > -0.2 ? back : belly;
};

/** A four-sided spike from a base center, pointing along `dir`: an armor plate or a tooth. */
function spike(base: Vec3, dir: Vec3, r: number, color: number): Tri[] {
  const tip = add(base, dir);
  const up: Vec3 = Math.abs(dir[1]) > 0.9 * Math.hypot(...dir) ? [1, 0, 0] : [0, 1, 0];
  const l = Math.hypot(...dir);
  const d = scale(dir, 1 / l);
  const u0: Vec3 = [up[1] * d[2] - up[2] * d[1], up[2] * d[0] - up[0] * d[2], up[0] * d[1] - up[1] * d[0]];
  const ul = Math.hypot(...u0);
  const u = scale(u0, r / ul);
  const v0: Vec3 = [d[1] * u[2] - d[2] * u[1], d[2] * u[0] - d[0] * u[2], d[0] * u[1] - d[1] * u[0]];
  const v = scale(v0, 1 / Math.hypot(...v0) * r);
  const ring = [add(base, u), add(base, v), add(base, scale(u, -1)), add(base, scale(v, -1))];
  const tris: Tri[] = [];
  for (let i = 0; i < 4; i++) tris.push([ring[i], ring[(i + 1) % 4], tip, color], [ring[(i + 1) % 4], ring[i], base, color]);
  return outward(tris, () => add(base, scale(dir, 0.25)));
}

/** Two small dark eyes on either side of a head, at (x, y), `z` out from the middle. */
const eyes = (x: number, y: number, z: number, s: number): Tri[] => [
  ...block(x, y, z, s, s, s * 0.5, C.ink),
  ...block(x, y, -z, s, s, s * 0.5, C.ink),
];

// --- Ammonite -------------------------------------------------------------------------------

const TURNS = Math.PI * 4.6;
/** The spiral ends straight down: the body chamber, where the animal lived, opens at the bottom. */
const START = Math.PI * 1.5 - TURNS;
/** Center of the coil: high enough that the outer whorl rests on y = 0. */
const CENTER_Y = 0.515;
const STEPS = 96;
const SIDES = 8;

const spiralAt = (t: number): Vec3 => {
  const a = START + TURNS * t;
  const r = 0.035 + t * 0.39;
  return [Math.cos(a) * r, CENTER_Y + Math.sin(a) * r, 0];
};
/** Where the last whorl opens: the arms and the soft body come out here, facing +x. */
export const AMMONITE_APERTURE: Vec3 = spiralAt(1);

/**
 * The coiled shell as one tube along the spiral, its whorls touching. Every sixth ring is a rib;
 * on the living animal the ribs are its dark stripes. The opening is closed in `aperture`.
 */
export function ammoniteShell(stripes: boolean, aperture: number): Tri[] {
  const rings: Vec3[][] = [];
  const centers: Vec3[] = [];
  for (let s = 0; s <= STEPS; s++) {
    const t = s / STEPS;
    const p = spiralAt(t);
    const a = START + TURNS * t;
    const radial: Vec3 = [Math.cos(a), Math.sin(a), 0];
    // Wide enough that each whorl touches the next one out (the coil opens 0.17 per turn).
    const hr = 0.06 + t * 0.03;
    const hz = 0.05 + t * 0.065;
    centers.push(p);
    rings.push(Array.from({ length: SIDES }, (_, k) => {
      const b = (k / SIDES) * Math.PI * 2;
      return add(add(p, scale(radial, Math.cos(b) * hr)), [0, 0, Math.sin(b) * hz]);
    }));
  }
  const tris: Tri[] = [];
  const axis: Vec3[] = [];
  for (let s = 0; s < STEPS; s++) {
    const color = s % 6 === 0 ? (stripes ? C.shellStripe : C.rib) : C.shell;
    for (let k = 0; k < SIDES; k++) {
      const j = (k + 1) % SIDES;
      const [a, b, c, d] = [rings[s][k], rings[s][j], rings[s + 1][j], rings[s + 1][k]];
      tris.push([a, b, c, color], [a, c, d, color]);
      const mid: Vec3 = scale(add(centers[s], centers[s + 1]), 0.5);
      axis.push(mid, mid);
    }
  }
  // The innermost end, closed; the opening, filled with the soft body or the dark sediment.
  // A cap faces away from the tube: its inside point is a little way along the spiral, inwards.
  const end = (s: number, color: number) => {
    const inside = spiralAt(s === 0 ? 0.02 : 0.98);
    for (let k = 0; k < SIDES; k++) {
      tris.push([centers[s], rings[s][k], rings[s][(k + 1) % SIDES], color]);
      axis.push(inside);
    }
  };
  end(0, C.shell);
  end(STEPS, aperture);
  return tris.map((t, i) => outward([t], () => axis[i])[0]);
}

/** The fossil in its outcrop: the bare shell, its opening full of dark sediment. */
export const AMMONITE_FOSSIL_TRIS: readonly Tri[] = ammoniteShell(false, C.dark);

/** The living ammonite: striped shell, and the soft body with its eyes coming out of the opening. */
export const AMMONITE_BODY_TRIS: readonly Tri[] = (() => {
  const [ax, ay] = AMMONITE_APERTURE;
  const soft = body([
    [ax - 0.02, ay, 0.06, 0.085], [ax + 0.06, ay, 0.065, 0.085], [ax + 0.13, ay - 0.005, 0.045, 0.06], [ax + 0.15, ay - 0.005, 0.03, 0.04],
  ], () => C.ammoniteSoft, [C.ammoniteSoft, C.ammoniteSoft]);
  // The hood over the head, in the shell's stripe color.
  const hood = body([[ax - 0.01, ay + 0.04, 0.02, 0.08], [ax + 0.1, ay + 0.045, 0.018, 0.07]], () => C.shellStripe, [C.shellStripe, C.shellStripe]);
  return [...ammoniteShell(true, C.ammoniteSoft), ...soft, ...hood, ...eyes(ax + 0.1, ay + 0.02, 0.07, 0.032)];
})();

export const AMMONITE_ARM_COUNT = 8;
/** One arm in three tapering segments: the pivot of the first at the opening, each next at the end of the previous. */
export function ammoniteArm(i: number): PolyPart[] {
  const z = ((i % 4) - 1.5) * 0.035;
  const y = AMMONITE_APERTURE[1] - 0.04 + Math.floor(i / 4) * 0.06;
  const len = 0.09 - (i % 2) * 0.015;
  return [0, 1, 2].map((s) => {
    const r0 = 0.013 - s * 0.003;
    const r1 = r0 - 0.003;
    return {
      pivot: s === 0 ? [AMMONITE_APERTURE[0] + 0.14, y, z] as Vec3 : [len, 0, 0] as Vec3,
      tris: body([[0, 0, r0, r0], [len, 0, r1, r1]], () => (s === 2 ? C.shellStripe : C.ammoniteSoft), [C.ammoniteSoft, C.ammoniteSoft], 5),
    };
  });
}

// --- Plesiosaur (elasmosaur reconstruction) -------------------------------------------------

export const PLESIO_NECK_SEGMENTS = 7;
export const PLESIO_NECK_LENGTH = 0.07;
export const PLESIO_NECK: Vec3 = [0.06, 0.09, 0];
export const PLESIO_FLIPPERS: readonly Vec3[] = [
  [0.0, 0.05, 0.09], [0.0, 0.05, -0.09], [-0.24, 0.05, 0.08], [-0.24, 0.05, -0.08],
];

const neckRadius = (i: number) => 0.033 - i * 0.0018;

export function plesiosaurParts() {
  const back = backBelly(C.plesioBack, C.plesioBelly);
  // Broad flat trunk, a short tail tapering to a point; spots along the back.
  const trunk = body([
    [-0.56, 0.07, 0.008, 0.008], [-0.48, 0.07, 0.024, 0.03], [-0.38, 0.07, 0.04, 0.055], [-0.28, 0.072, 0.052, 0.09],
    [-0.12, 0.075, 0.06, 0.105], [0.0, 0.078, 0.056, 0.095], [0.06, 0.085, 0.045, 0.07], [0.075, 0.09, neckRadius(0), neckRadius(0)],
  ], (band, seg) => (band >= 2 && band <= 5 && (seg === 1 || seg === 2) && (band + seg) % 2 === 0 ? C.plesioSpot : back(band, seg)), [C.plesioBack, C.plesioBack]);
  const neck: Tri[][] = Array.from({ length: PLESIO_NECK_SEGMENTS }, (_, i) =>
    body([[-0.004, 0, neckRadius(i), neckRadius(i)], [PLESIO_NECK_LENGTH + 0.004, 0, neckRadius(i + 1), neckRadius(i + 1)]], back, [C.plesioBack, C.plesioBack]));
  // Small head with long jaws and the cone teeth of a marine reptile.
  const head = [
    ...body([[-0.004, 0, neckRadius(PLESIO_NECK_SEGMENTS), neckRadius(PLESIO_NECK_SEGMENTS)], [0.04, 0.004, 0.03, 0.03], [0.08, -0.006, 0.018, 0.02], [0.125, -0.012, 0.006, 0.008]], back, [C.plesioBack, C.plesioBelly]),
    ...eyes(0.045, 0.016, 0.027, 0.014),
    ...[0.06, 0.08, 0.1].flatMap((x) => [...spike([x, -0.018, 0.012], [0, -0.016, 0], 0.003, C.tooth), ...spike([x, -0.018, -0.012], [0, -0.016, 0], 0.003, C.tooth)]),
  ];
  // A long paddle reaching out sideways (+z), thin and tapering, its tip darker; the right ones mirrored.
  const paddle: [number, number][] = [[0.04, 0], [0.02, 0.12], [-0.01, 0.2], [-0.045, 0.25], [-0.07, 0.22], [-0.06, 0.12], [-0.045, 0]];
  const flipper = [
    ...prism(paddle, -0.008, 0.008, C.plesioBack, C.plesioBack, true),
    ...prism([[-0.03, 0.2], [-0.045, 0.25], [-0.07, 0.22], [-0.055, 0.19]], 0.008, 0.011, C.plesioSpot, C.plesioSpot, true),
  ];
  return { body: trunk, neck, head, flipper };
}

export function plesiosaurAtRest(): Tri[] {
  const p = plesiosaurParts();
  const at = (tris: readonly Tri[], o: Vec3) => tris.map(([a, b, c, col]): Tri => [add(a, o), add(b, o), add(c, o), col]);
  return [
    ...p.body,
    ...p.neck.flatMap((tris, i) => at(tris, [PLESIO_NECK[0] + i * PLESIO_NECK_LENGTH, PLESIO_NECK[1], 0])),
    ...at(p.head, [PLESIO_NECK[0] + PLESIO_NECK_SEGMENTS * PLESIO_NECK_LENGTH, PLESIO_NECK[1], 0]),
    ...PLESIO_FLIPPERS.flatMap((pos) => at(pos[2] > 0 ? p.flipper : mirrorZ(p.flipper), pos)),
  ];
}

// --- Antarctopelta (reconstruction) ---------------------------------------------------------

/** Low, broad armored herbivore. No tail club: its rear end is a plain tapering tail. */
export const DINO_NECK: Vec3 = [0.27, 0.34, 0];
export const DINO_TAIL: Vec3 = [-0.18, 0.31, 0];
export const DINO_TAIL_SEGMENT = 0.15;
export const DINO_HIPS: readonly Vec3[] = [
  [0.15, 0.22, 0.12], [0.15, 0.22, -0.12], [-0.08, 0.24, 0.12], [-0.08, 0.24, -0.12],
];

/** Rows of bony plates on a curved back: small pyramids, alternating light and dark. */
function osteoderms(x0: number, x1: number, top: (x: number, z: number) => number, halfWidth: number, rows: number): Tri[] {
  const out: Tri[] = [];
  const cols = Math.max(2, Math.round((x1 - x0) / 0.07));
  for (let i = 0; i < cols; i++) {
    for (let r = 0; r < rows; r++) {
      const x = x0 + ((i + 0.5) * (x1 - x0)) / cols;
      const z = rows === 1 ? 0 : -halfWidth + (2 * halfWidth * r) / (rows - 1);
      const y = top(x, z);
      const tilt = rows === 1 ? 0 : (z / halfWidth) * 0.02;
      out.push(...spike([x, y - 0.006, z], [0, 0.04, tilt], 0.022, (i + r) % 2 ? C.armor : C.armorDark));
    }
  }
  return out;
}

export function dinosaurParts() {
  const skin = (_: number, seg: number) => {
    const a = ((seg + 0.5) / 10) * Math.PI * 2;
    const s = Math.sin(a);
    return s < -0.45 ? C.belly : s > 0.55 ? C.dinoDark : C.dinoGreen;
  };
  // A low wide barrel: [x, center y, half height, half width].
  const stations: [number, number, number, number][] = [
    [-0.2, 0.31, 0.07, 0.08], [-0.12, 0.31, 0.1, 0.13], [0.0, 0.32, 0.12, 0.165], [0.15, 0.32, 0.115, 0.16], [0.25, 0.325, 0.09, 0.12], [0.3, 0.335, 0.06, 0.08],
  ];
  const backAt = (x: number, z: number) => {
    let k = 0;
    while (k < stations.length - 2 && x > stations[k + 1][0]) k++;
    const [x0, y0, h0, w0] = stations[k];
    const [x1, y1, h1, w1] = stations[k + 1];
    const f = Math.min(1, Math.max(0, (x - x0) / (x1 - x0)));
    const cy = y0 + (y1 - y0) * f, hy = h0 + (h1 - h0) * f, hz = w0 + (w1 - w0) * f;
    return cy + hy * Math.sqrt(Math.max(0, 1 - (z / hz) ** 2));
  };
  const trunk = [
    ...body(stations, skin, [C.dinoGreen, C.dinoGreen], 10),
    ...osteoderms(-0.15, 0.25, backAt, 0.1, 4),
    // Spikes along the flanks
    ...[-0.1, 0.0, 0.1, 0.2].flatMap((x) => [...spike([x, 0.33, 0.15], [0, 0.005, 0.05], 0.018, C.armor), ...spike([x, 0.33, -0.15], [0, 0.005, -0.05], 0.018, C.armor)]),
  ];
  // Small low head with a horny beak; a plate of armor over the skull.
  const head = [
    ...body([[-0.02, 0, 0.05, 0.065], [0.08, -0.004, 0.055, 0.07], [0.17, -0.012, 0.04, 0.05], [0.22, -0.03, 0.02, 0.03]], skin, [C.dinoGreen, C.beak], 10),
    ...spike([0.09, 0.045, 0], [0, 0.025, 0], 0.04, C.armor),
    ...eyes(0.15, 0.015, 0.05, 0.022),
  ];
  // The tail in three segments, each hanging from the end of the previous one, tapering.
  const tail: Tri[][] = [0, 1, 2].map((i) => {
    const h0 = 0.07 - i * 0.02, h1 = h0 - 0.02, w0 = 0.09 - i * 0.025, w1 = w0 - 0.025;
    return [
      ...body([[-DINO_TAIL_SEGMENT - 0.008, -0.01 * (i + 1), Math.max(h1, 0.012), Math.max(w1, 0.012)], [0.008, -0.01 * i, h0, w0]], skin, [C.dinoGreen, C.dinoGreen], 8),
      ...osteoderms(-DINO_TAIL_SEGMENT + 0.02, -0.01, (x) => -0.01 * i + h0 * 0.9 + (x / DINO_TAIL_SEGMENT) * 0.02, w0 * 0.6, i === 2 ? 1 : 2),
    ];
  });
  // A thick pillar of a leg, a broad foot.
  const leg = [
    ...lathe(0, 0, [[-0.19, 0.045], [-0.12, 0.04], [-0.04, 0.045], [0.02, 0.05]], 6, C.dinoGreen),
    ...block(0.02, -0.205, 0, 0.11, 0.03, 0.1, C.dinoDark),
  ];
  return { body: trunk, head, tail, leg };
}

export function dinosaurAtRest(): Tri[] {
  const p = dinosaurParts();
  const at = (tris: readonly Tri[], o: Vec3) => tris.map(([a, b, c, col]): Tri => [add(a, o), add(b, o), add(c, o), col]);
  return [
    ...p.body, ...at(p.head, DINO_NECK),
    ...p.tail.flatMap((tris, i) => at(tris, [DINO_TAIL[0] - i * DINO_TAIL_SEGMENT, DINO_TAIL[1], 0])),
    ...DINO_HIPS.flatMap((hip) => at(p.leg, hip)),
  ];
}

// --- Goniasterid sea star -------------------------------------------------------------------

/**
 * Big pentagonal disc with short arms, raised in the middle; a band of pale marginal plates round
 * the edge and a dark eye spot at each arm tip, as in the Bill Hill specimens.
 */
export const STAR_TRIS: readonly Tri[] = (() => {
  const tris: Tri[] = [];
  const outline: [number, number][] = [];
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2 + Math.PI / 2;
    const r = k % 2 ? 0.27 : 0.47;
    outline.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  // Subdivide each edge so the plates read along it.
  const edge: [number, number][] = outline.flatMap(([x, z], k) => {
    const [nx, nz] = outline[(k + 1) % 10];
    return [[x, z], [(x * 2 + nx) / 3, (z * 2 + nz) / 3], [(x + nx * 2) / 3, (z + nz * 2) / 3]] as [number, number][];
  });
  const n = edge.length;
  const top: Vec3 = [0, 0.11, 0];
  const core = edge.map(([x, z]): Vec3 => [x * 0.12, 0.108, z * 0.12]);
  const inner = edge.map(([x, z]): Vec3 => [x * 0.45, 0.095, z * 0.45]);
  const rim = edge.map(([x, z]): Vec3 => [x, 0.05, z]);
  const foot = edge.map(([x, z]): Vec3 => [x * 0.98, 0, z * 0.98]);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    // A dark spot in the middle of a pale central disc, then the orange body.
    tris.push([top, core[j], core[i], C.starSpot]);
    tris.push([core[i], core[j], inner[j], C.starPlate], [core[i], inner[j], inner[i], C.starPlate]);
    tris.push([inner[i], inner[j], rim[j], C.starOrange], [inner[i], rim[j], rim[i], C.starOrange]);
    const plate = i % 2 ? C.starPlate : C.starOrange;
    tris.push([rim[i], rim[j], foot[j], plate], [rim[i], foot[j], foot[i], plate]);
    tris.push([[0, 0, 0], foot[i], foot[j], C.starOrange]);
  }
  // Eye spots at the five arm tips.
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 + Math.PI / 2;
    tris.push(...block(Math.cos(a) * 0.44, 0.05, Math.sin(a) * 0.44, 0.045, 0.03, 0.045, C.starSpot));
  }
  return outward(tris, ([x, y, z]) => [x * 0.5, y > 0.05 ? 0.02 : 0.05, z * 0.5]);
})();

// --- Geologists ----------------------------------------------------------------------------

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
 * A person in a field parka, about one unit tall, facing +x, with the pivots of the block figure:
 * legs hang from the hips, arms from the shoulders, the head turns on the neck. One arm can carry a
 * geologist's hammer. Eduardo (`beard`) has his beard. Illustrations of the camp photographs.
 */
export function geologistPolyParts(parka: Parka, beard: boolean) {
  const coat = PARKA_COLORS[parka];
  // Parka from the hips to the shoulders, a dark zip down the front, the backpack behind.
  const torso: Tri[] = [
    ...column(0, 0, [[0.44, 0.105, 0.155], [0.52, 0.11, 0.16], [0.68, 0.105, 0.155], [0.77, 0.09, 0.14], [0.8, 0.06, 0.09]], 10, coat),
    ...block(0.104, 0.62, 0, 0.012, 0.3, 0.022, C.ink),
    ...block(0.104, 0.55, 0.08, 0.012, 0.05, 0.06, C.ink),
    ...block(-0.16, 0.66, 0, 0.11, 0.28, 0.24, C.pants),
    ...block(-0.16, 0.81, 0, 0.1, 0.04, 0.2, C.crateDark),
  ];
  // Round face, knitted cap with a pompom, two eyes; Eduardo's beard over the chin.
  const head: Tri[] = [
    ...column(0, 0, [[0, 0.06, 0.06], [0.04, 0.08, 0.08], [0.12, 0.08, 0.08], [0.15, 0.07, 0.07]], 8, C.skin),
    ...column(0, 0, [[0.14, 0.088, 0.088], [0.2, 0.075, 0.075], [0.23, 0.035, 0.035]], 8, C.hat),
    ...column(0, 0, [[0.23, 0.022, 0.022], [0.26, 0.018, 0.018]], 5, C.hat),
    ...block(0.082, 0.1, 0.035, 0.012, 0.024, 0.022, C.ink),
    ...block(0.082, 0.1, -0.035, 0.012, 0.024, 0.022, C.ink),
    ...(beard ? column(0.045, 0, [[-0.01, 0.045, 0.06], [0.04, 0.055, 0.075], [0.06, 0.04, 0.07]], 8, C.beard) : []),
  ];
  // Trousers tapering to the boot.
  const leg: Tri[] = [
    ...column(0, 0, [[-0.38, 0.045, 0.05], [-0.2, 0.05, 0.055], [0, 0.058, 0.062]], 7, C.pants),
    ...block(0.025, -0.415, 0, 0.16, 0.07, 0.13, C.boot),
  ];
  const arm: Tri[] = [
    ...column(0, 0, [[-0.29, 0.04, 0.04], [-0.15, 0.045, 0.045], [0, 0.05, 0.05]], 7, coat),
    ...column(0, 0, [[-0.35, 0.03, 0.035], [-0.29, 0.042, 0.042]], 6, C.glove),
  ];
  const hammerArm: Tri[] = [
    ...arm,
    ...strut([-0.005, -0.33, 0], [0.17, -0.33, 0], 0.012, C.handle),
    ...block(0.17, -0.33, 0, 0.035, 0.07, 0.1, C.metal),
  ];
  return { torso, head, leg, arm, hammerArm };
}

/** Pivots of the figure, shared with the poses of fossilPoses.ts. */
export const GEOLOGIST_HIP: Vec3 = [0, 0.45, 0.075];
export const GEOLOGIST_SHOULDER: Vec3 = [0, 0.76, 0.19];
export const GEOLOGIST_NECK: Vec3 = [0, 0.82, 0];

function geologistAtRest(parka: Parka, beard: boolean): Tri[] {
  const p = geologistPolyParts(parka, beard);
  const at = (tris: readonly Tri[], o: Vec3) => tris.map(([a, b, c, col]): Tri => [add(a, o), add(b, o), add(c, o), col]);
  return [
    ...p.torso, ...at(p.head, GEOLOGIST_NECK),
    ...at(p.leg, GEOLOGIST_HIP), ...at(p.leg, [GEOLOGIST_HIP[0], GEOLOGIST_HIP[1], -GEOLOGIST_HIP[2]]),
    ...at(p.arm, GEOLOGIST_SHOULDER), ...at(p.hammerArm, [GEOLOGIST_SHOULDER[0], GEOLOGIST_SHOULDER[1], -GEOLOGIST_SHOULDER[2]]),
  ];
}

/** Every model of this file, joined at rest, for the test of least detail. */
export const FOSSIL_POLY_MODELS: Readonly<Record<string, readonly Tri[]>> = {
  'fossil-ammonite': AMMONITE_FOSSIL_TRIS,
  'living-ammonite': [...AMMONITE_BODY_TRIS, ...Array.from({ length: AMMONITE_ARM_COUNT }, (_, i) => ammoniteArm(i)).flatMap((chain) => {
    let o: Vec3 = [0, 0, 0];
    return chain.flatMap((part) => { o = add(o, part.pivot); return part.tris.map(([a, b, c, col]): Tri => [add(a, o), add(b, o), add(c, o), col]); });
  })],
  'plesiosaur-illustration': plesiosaurAtRest(),
  'antarctopelta-illustration': dinosaurAtRest(),
  'eocene-sea-star': STAR_TRIS,
  'field-geologist-red': geologistAtRest('red', true), 'field-geologist-yellow': geologistAtRest('yellow', false),
  'field-geologist-orange': geologistAtRest('orange', true),
};

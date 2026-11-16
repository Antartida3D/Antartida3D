import { createSeededRng, VERTICAL_EXAGGERATION } from '@antartida/core';
import type { PreviewMotion } from './ModelPreview.tsx';
import {
  BLACK,
  CREAM,
  ICE,
  ICE_SHADE,
  ICE_WALL,
  LAMP,
  NAVY_ROOF,
  ORANGE,
  RED,
  ROCK,
  SKY,
  WHITE,
  ZINC,
} from './sightingModels.ts';
import { ICEBERG_TABULAR_POLY } from './icebergs.ts';
import { block, chunk, emperor, extrude, groundField, lathe, ngon, normalOf, prism, quad, rect, RELIEF_ICE, RELIEF_ROCK, reliefColor, resolveRelief, scaled, shift, turn, type Tri, type Vec3 } from './lowPoly.ts';

// Approximate colors. Every model here is an illustration, not to scale (docs/diseno/estilo-voxel.md).
// Erebus: its snow and rock take the colors of the painted relief (reliefColor); here only the lava lake.
const LAVA_CRUST = 0xb8411c;
const LAVA = 0xf0661c;
const LAVA_GLOW = 0xffc24a;
const ICE_TOWER = 0xddf0fa;
// Thwaites: pale ice wall tone blended with relief snow for V-shaped crevasses.
const CREVASSE_ICE = 0xc9e0ee;
// Vostok: section of the ice sheet, the lake and the bed (illustrative colors).
const GLACIAL_ICE = 0x9ccfe6;
const GLACIAL_ICE_DEEP = 0x5f9fc6;
const LAKE_WATER = 0x1d4f7a;
const BEDROCK = 0x4a4e54;
// Belgrano II: Bertrab granite, grey to pink (EIA of CONAE, Antarctic Treaty Secretariat).
const GRANITE = 0x8f7b77;
// South Pole: the colour of the elevated station is not in the sources; a neutral steel grey.
const STATION_PANEL = 0x9aa3a8;
const STATION_DARK = 0x6f787e;
const SILVER = 0xc8d0d8;
const LAB_BLUE = 0x2b5b84;
// Little Dome C: blue generators, red shower module and orange sled (Beyond EPICA field diaries).
// The colour of the tents is not in the sources: a canvas beige.
const TENT = 0xd8ccb0;
const TENT_SHADE = 0xbfb193;
const GENERATOR_BLUE = 0x1f5aa6;
const ICE_CORE = 0xcfe6f2;
// Emperor colony: guano stains on the sea ice, seen from space (NASA Earth Observatory).
const GUANO = 0x8a6450;
// Flags of the South Pole ring: generic flag colours, not the flags of real countries.
const FLAG_BLUE = 0x2c4a8c;
const FLAG_GREEN = 0x2f7d4a;

type Point3 = Vec3;

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** A pole: a thin square post from `bottom` up to `top`. */
const post = (x: number, z: number, top: number, color = ZINC, width = 0.012, bottom = 0): Tri[] => prism(ngon(x, z, width / 2, 4, Math.PI / 4), bottom, top, color);

/** An arched tent along x (Weatherhaven style): a half-round section with its two ends. */
const archTent = (x: number, z: number, length: number, width: number, height: number, color: number, ends: number, y = 0): Tri[] => {
  const profile: [number, number][] = [0, 1, 2, 3, 4, 5, 6].map((i) => {
    const a = (i / 6) * Math.PI;
    return [(Math.cos(a) * width) / 2, Math.sin(a) * height];
  });
  return shift(extrude(profile, -length / 2, length / 2, color, ends), x, y, z);
};

/** A snowy plateau under a station in its card, where there is no relief: almost flat, with sastrugi. */
const plateau = (seed: number, radius = 1, cols = 14, cell = 0.075) =>
  groundField(
    cols,
    cols,
    cell,
    seed,
    (u, v, noise) => (Math.hypot(u, v) + (noise - 0.5) * 0.25 > radius ? null : 0.008 + noise * 0.014),
    // Sastrugi: the rare raised ridges catch the light whiter than the relief round them.
    (_u, _v, h) => (h > 0.02 ? ICE : RELIEF_ICE),
    // A shallow edge: the snow of the model meets the snow of the relief without a rim.
    0.006,
  );

// ---------------------------------------------------------------------------------------------
// Mount Erebus: the summit, raised from the relief itself
// ---------------------------------------------------------------------------------------------

/** World units of the summit, around the highest point of the relief of Ross Island. */
const EREBUS_REACH = 2.2;
/** Crater rim radius: about 3 times the real 500 x 600 m crater (NASA Photojournal), so it can be seen. */
const CRATER_RIM = 0.24;
const CRATER_FLOOR = 0.13;
/**
 * The heights of the summit follow the vertical exaggeration of the relief (they were drawn for
 * x50), so the summit keeps its shape on the island whatever the exaggeration is.
 */
const EREBUS_VERTICAL = VERTICAL_EXAGGERATION / 50;
const CRATER_DEPTH = 0.12 * EREBUS_VERTICAL;
/** How far the drawn summit rises over the relief: the cells of Bedmap3 smooth the real 3,794 m peak. */
const EREBUS_RISE = 0.7 * EREBUS_VERTICAL;
const EREBUS_SEGMENTS = 18;
const EREBUS_RINGS = [0, CRATER_FLOOR, CRATER_RIM, 0.38, 0.6, 0.85, 1.15, 1.55, EREBUS_REACH];
/** Fumarolic ice towers (LPI 3105) on the upper slopes, by angle and distance from the centre. */
const TOWER_SITES: readonly (readonly [number, number])[] = [[0.6, 0.52], [2.5, 0.6], [4.3, 0.5]];
/** Ice towers: illustrations, kept tall enough to be seen when the relief is low. */
const TOWER_HEIGHT = 0.1 * Math.max(0.45, EREBUS_VERTICAL);

export interface ErebusSummit {
  tris: Tri[];
  lava: Tri[];
  /** Centre of the lava lake: the plume and the bombs leave from here. */
  vent: Point3;
  /** Height of the crater rim, where the bombs land. */
  rim: number;
  /** Tops of the ice towers: steam leaves from them. */
  towers: Point3[];
}

/**
 * The summit of Mount Erebus around (0, 0), in world units: rings of faces whose outer ring lies on
 * the relief (`groundAt(dx, dz)`, a world height) and that rise, steeper towards the top as on a
 * stratovolcano, to the crater rim, with the crater, its lava lake and the ice towers. Snow and rock
 * take the colors and light of the painted relief.
 */
export function erebusSummit(groundAt: (dx: number, dz: number) => number): ErebusSummit {
  const rng = createSeededRng(3794);
  const top = groundAt(0, 0) + EREBUS_RISE;
  const floor = top - CRATER_DEPTH;
  const outer = EREBUS_REACH;
  const last = EREBUS_RINGS.length - 1;
  const flank = (x: number, z: number, r: number) => {
    const foot = groundAt((x / r) * outer, (z / r) * outer);
    return top - (top - foot) * ((r - CRATER_RIM) / (outer - CRATER_RIM)) ** 0.65;
  };
  const rings: Vec3[][] = EREBUS_RINGS.map((r, k) =>
    Array.from({ length: EREBUS_SEGMENTS }, (_, i): Vec3 => {
      if (r === 0) return [0, floor, 0];
      const loose = k > 2 && k < last;
      const a = ((i + (k % 2) * 0.5) / EREBUS_SEGMENTS) * Math.PI * 2 + (loose ? (rng() - 0.5) * 0.18 : 0);
      const rr = r * (loose ? 0.92 + rng() * 0.16 : 1);
      const x = Math.cos(a) * rr;
      const z = Math.sin(a) * rr;
      if (r <= CRATER_FLOOR) return [x, floor, z];
      // The rim is a little lower to the south-west, where the lake can be seen from the side.
      if (r <= CRATER_RIM) return [x, top + (rng() - 0.5) * 0.04 - (Math.sin(a) > 0.6 ? 0.03 : 0), z];
      // Concave flank from the rim down to the relief, merging into it at the outer ring.
      const ground = groundAt(x, z) + 0.015;
      const t = (rr - CRATER_RIM) / (outer - CRATER_RIM);
      const cone = flank(x, z, rr) + (k < last ? (rng() - 0.5) * 0.06 : 0);
      return [x, Math.max(ground, ground + (cone - ground) * (1 - smooth(0.7, 1, t))), z];
    }),
  );
  const tris: Tri[] = [];
  const noise = createSeededRng(3795);
  for (let k = 0; k < last; k++) {
    for (let i = 0; i < EREBUS_SEGMENTS; i++) {
      const j = (i + 1) % EREBUS_SEGMENTS;
      const r = EREBUS_RINGS[k + 1];
      const angle = (i / EREBUS_SEGMENTS) * Math.PI * 2;
      // Bare rock round the summit and in a few streaks down the flanks; snow elsewhere. Both in the
      // colors and light of the painted relief, so the summit reads as the same mountain.
      const rock = r <= 0.36 || (r < 0.7 && Math.cos(5 * angle + 2) > 0.85 && noise() > 0.5);
      const face = (a: Vec3, b: Vec3, c: Vec3): Tri => [a, b, c, reliefColor(normalOf([a, b, c, 0]), (a[1] + b[1] + c[1]) / 3, rock)];
      tris.push(face(rings[k][i], rings[k + 1][j], rings[k + 1][i]));
      if (k > 0) tris.push(face(rings[k][i], rings[k][j], rings[k + 1][j]));
    }
  }
  const towers: Point3[] = TOWER_SITES.map(([angle, r]) => {
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    const y = flank(x, z, r) - 0.02;
    const ice = (t: Tri): Tri => [t[0], t[1], t[2], reliefColor(normalOf(t), t[0][1], false)];
    tris.push(...lathe(x, z, [[y - 0.02, 0.07], [y + 0.02, 0.05], [y + 0.04, 0.035]], 6, ICE).map(ice));
    tris.push(...lathe(x, z, [[y + 0.03, 0.035], [y + TOWER_HEIGHT, 0.026], [y + TOWER_HEIGHT + 0.004, 0.016]], 6, ICE_TOWER));
    return [x, y + TOWER_HEIGHT + 0.02, z];
  });
  const lava: Tri[] = [
    ...prism(ngon(0, 0, CRATER_FLOOR * 0.95, 9), floor - 0.01, floor + 0.006, LAVA_CRUST),
    ...prism(ngon(0.01, 0.01, CRATER_FLOOR * 0.6, 7, 0.4), floor, floor + 0.01, LAVA),
    ...prism(ngon(0.03, -0.015, CRATER_FLOOR * 0.25, 5), floor, floor + 0.013, LAVA_GLOW),
  ];
  return { tris, lava, vent: [0, floor + 0.02, 0], rim: top, towers };
}

/** The summit on a made-up island, scaled to one unit wide: the model of the Erebus card. */
const EREBUS_CARD: Tri[] = (() => {
  const island = (dx: number, dz: number) => 1.4 * Math.max(0, 1 - Math.hypot(dx, dz * 1.1) / 3.4) ** 1.3;
  const { tris, lava } = erebusSummit(island);
  const k = 1 / (2 * EREBUS_REACH);
  const base = island(EREBUS_REACH, 0);
  const fit = (p: Vec3): Vec3 => [p[0] * k, Math.max(0, (p[1] - base) * k), p[2] * k];
  return [...tris, ...lava].map(([a, b, c, col]) => [fit(a), fit(b), fit(c), col]);
})();

// ---------------------------------------------------------------------------------------------
// Thwaites Glacier
// ---------------------------------------------------------------------------------------------

const THWAITES_REACH = 3;
const THWAITES_STEP = 0.1;
/** Least height (world units) of the ice cliff over the water, so the front reads at x10. */
const CLIFF_MIN = 0.1;

export interface ThwaitesFront {
  tris: Tri[];
  /** Parts exposed separately for tests; `tris` joins all three. */
  cliff: Tri[];
  crevasses: Tri[];
  brash: Tri[];
  /** The block that breaks off: its faces relative to its pivot, the pivot and the turn that faces the sea. */
  calving: { tris: Tri[]; pivot: Point3; heading: number } | null;
}

/**
 * Thwaites Glacier where it meets the Amundsen Sea, built around (0, 0) in world units:
 * `groundAt(dx, dz)` gives the world height of the relief and `coastAt(dx, dz)` gives the signed
 * distance to the Bedmap3 coastline (> 0 on ice, < 0 on sea). Along `coastAt = 0` the ice ends in
 * a ragged cliff over the water; behind it V-shaped crevasses and rifts run parallel to the front
 * on ice, and brash ice and tabular icebergs sit in the sea in front.
 * Illustration, not to scale: the cliff is drawn higher than its real tens of metres.
 */
export function thwaitesFront(
  groundAt: (dx: number, dz: number) => number,
  coastAt: (dx: number, dz: number) => number,
): ThwaitesFront {
  const rng = createSeededRng(2026);
  const n = Math.round((2 * THWAITES_REACH) / THWAITES_STEP);
  const at = (i: number) => -THWAITES_REACH + i * THWAITES_STEP;
  const s: number[][] = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => coastAt(at(i), at(j))));
  const cliff: Tri[] = [];
  const crevasses: Tri[] = [];
  const brash: Tri[] = [];
  const coast: { x: number; z: number; nx: number; nz: number; top: number }[] = [];

  const faceUp = (t: Tri): Tri => {
    const up = (t[1][2] - t[0][2]) * (t[2][0] - t[0][0]) - (t[1][0] - t[0][0]) * (t[2][2] - t[0][2]) >= 0;
    return up ? t : [t[0], t[2], t[1], t[3]];
  };

  // The coastline, traced smoothly along coastAt = 0 (marching squares), cut into short stretches.
  const segments: [number, number, number, number][] = [];
  const cross = (x0: number, z0: number, v0: number, x1: number, z1: number, v1: number): [number, number] => {
    const t = v0 / (v0 - v1);
    return [x0 + (x1 - x0) * t, z0 + (z1 - z0) * t];
  };
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const [x0, x1, z0, z1] = [at(i), at(i + 1), at(j), at(j + 1)];
      const v = [s[i][j], s[i + 1][j], s[i + 1][j + 1], s[i][j + 1]];
      const corners: [number, number][] = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
      const pts: [number, number][] = [];
      for (let e = 0; e < 4; e++) {
        const a = e;
        const b = (e + 1) % 4;
        if (v[a] > 0 !== v[b] > 0) pts.push(cross(...corners[a], v[a], ...corners[b], v[b]));
      }
      if (pts.length === 2) segments.push([...pts[0], ...pts[1]]);
      else if (pts.length === 4) segments.push([...pts[0], ...pts[1]], [...pts[2], ...pts[3]]);
    }
  }

  const inlandPt = (px: number, pz: number, nx: number, nz: number): [number, number] | null => {
    for (const d of [0.14, 0.09, 0.05, 0.02]) {
      const ix = px - nx * d;
      const iz = pz - nz * d;
      if (coastAt(ix, iz) > 0.005) return [ix, iz];
    }
    return null;
  };

  // The cliff: along each stretch of coast, a wall from under the water up over the ice, its top
  // ragged, its foot right on the isoline or barely seaward, and a snow ledge back onto the ice.
  // Everything at a point of the coastline depends only on that point, so neighbouring stretches
  // share their edges: the way to the sea (down the slope of coastAt), the top and the foot.
  const edge = (x: number, z: number) => {
    const e = 0.02;
    let nx = coastAt(x - e, z) - coastAt(x + e, z);
    let nz = coastAt(x, z - e) - coastAt(x, z + e);
    const l = Math.hypot(nx, nz) || 1;
    [nx, nz] = [nx / l, nz / l];
    const ice = groundAt(x - nx * 0.12, z - nz * 0.12);
    // Ragged but continuous: a top that rises and falls along the front, sinking to the relief
    // towards the edge of the model so the front does not end in a cut.
    const fade = Math.min(1, Math.max(0, (THWAITES_REACH - Math.max(Math.abs(x), Math.abs(z))) / 0.8));
    const rise = Math.max(ice, CLIFF_MIN) - ice + 0.03 * (0.5 + 0.5 * Math.sin(x * 9.1 + z * 4.7) * Math.sin(z * 7.3 - x * 3.1));
    const top = ice + rise * fade;
    const footOut = 0.008;
    const back = inlandPt(x, z, nx, nz);
    return {
      nx,
      nz,
      top,
      foot: [x + nx * footOut, -0.06, z + nz * footOut] as Vec3,
      crest: [x, top, z] as Vec3,
      back: back ? ([back[0], groundAt(back[0], back[1]) + 0.003, back[1]] as Vec3) : null,
    };
  };
  // Islets and pools of the mask (small closed rings of coastline) stay as the map paints them: a
  // ring of cliff round them reads as a crater. Stretches are joined by their shared ends.
  const islet = new Set<(typeof segments)[number]>();
  {
    const key = (x: number, z: number) => `${Math.round(x * 1e4)},${Math.round(z * 1e4)}`;
    const ends = new Map<string, (typeof segments)[number][]>();
    for (const sg of segments) for (const k of [key(sg[0], sg[1]), key(sg[2], sg[3])]) ends.set(k, [...(ends.get(k) ?? []), sg]);
    const seen = new Set<(typeof segments)[number]>();
    for (const first of segments) {
      if (seen.has(first)) continue;
      const ring: (typeof segments)[number][] = [];
      const stack = [first];
      while (stack.length) {
        const sg = stack.pop()!;
        if (seen.has(sg)) continue;
        seen.add(sg);
        ring.push(sg);
        for (const k of [key(sg[0], sg[1]), key(sg[2], sg[3])]) stack.push(...(ends.get(k) ?? []));
      }
      const xs = ring.flatMap((sg) => [sg[0], sg[2]]);
      const zs = ring.flatMap((sg) => [sg[1], sg[3]]);
      const closed = ring.every((sg) => [key(sg[0], sg[1]), key(sg[2], sg[3])].every((k) => ends.get(k)!.length === 2));
      if (closed && Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs)) < 1) ring.forEach((sg) => islet.add(sg));
    }
  }
  for (const segment of segments) {
    const [ax, az, bx, bz] = segment;
    const len = Math.hypot(bx - ax, bz - az);
    if (len < 1e-4) continue;
    if (islet.has(segment)) continue;
    const ea = edge(ax, az);
    const eb = edge(bx, bz);
    const mx = (ax + bx) / 2;
    const mz = (az + bz) / 2;
    const l = Math.hypot(ea.nx + eb.nx, ea.nz + eb.nz) || 1;
    const nx = (ea.nx + eb.nx) / l;
    const nz = (ea.nz + eb.nz) / l;
    const wall = rng() > 0.3 ? ICE_WALL : ICE_SHADE;
    // Facing the sea whichever way the stretch runs.
    const facing = (bx - ax) * nz - (bz - az) * nx > 0;
    cliff.push(...(facing ? quad(ea.foot, eb.foot, eb.crest, ea.crest, wall) : quad(eb.foot, ea.foot, ea.crest, eb.crest, wall)));
    if (ea.back && eb.back) cliff.push(faceUp([ea.crest, eb.crest, eb.back, RELIEF_ICE]), faceUp([ea.crest, eb.back, ea.back, RELIEF_ICE]));
    coast.push({ x: mx, z: mz, nx, nz, top: (ea.top + eb.top) / 2 });
  }

  /** V-shaped sunken band along `centers` on ice (coastAt > 0.15 at every vertex; out-of-bounds stretches clipped). */
  const pushVTrench = (centers: readonly [number, number][], halfWidth: number, depth: number, color: number) => {
    const stations: { L: Vec3; C: Vec3; R: Vec3; ok: boolean }[] = centers.map(([cx, cz], k) => {
      const prev = centers[Math.max(0, k - 1)];
      const next = centers[Math.min(centers.length - 1, k + 1)];
      const tx0 = next[0] - prev[0];
      const tz0 = next[1] - prev[1];
      const tLen = Math.hypot(tx0, tz0) || 1;
      const ox = -tz0 / tLen;
      const oz = tx0 / tLen;
      const lx = cx - ox * halfWidth;
      const lz = cz - oz * halfWidth;
      const rx = cx + ox * halfWidth;
      const rz = cz + oz * halfWidth;
      const ok = coastAt(lx, lz) > 0.15 && coastAt(cx, cz) > 0.15 && coastAt(rx, rz) > 0.15;
      return {
        L: [lx, groundAt(lx, lz) + 0.003, lz],
        C: [cx, groundAt(cx, cz) + 0.003 - depth, cz],
        R: [rx, groundAt(rx, rz) + 0.003, rz],
        ok,
      };
    });
    for (let k = 0; k < stations.length - 1; k++) {
      const a = stations[k];
      const b = stations[k + 1];
      if (!a.ok || !b.ok) continue;
      for (const t of [...quad(a.L, b.L, b.C, a.C, color), ...quad(a.C, b.C, b.R, a.R, color)]) {
        crevasses.push(faceUp(t));
      }
    }
  };

  // Short curved crevasses on the ice behind the front (coastAt > 0.15), parallel to the coast.
  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= n; j++) {
      if (s[i][j] <= 0.15 || !coast.length) continue;
      const x = at(i);
      const z = at(j);
      let best = coast[0];
      let d = Infinity;
      for (const c of coast) {
        const dd = Math.hypot(c.x - x, c.z - z);
        if (dd < d) [d, best] = [dd, c];
      }
      const band = d > 0.2 && d < 1.3 && Math.abs(Math.sin(d * 11 + Math.sin(x * 2 + z * 3) * 1.2)) < 0.16 && rng() > 0.35;
      if (!band) continue;
      const len = Math.hypot(x - best.x, z - best.z) || 1;
      const rx = (x - best.x) / len;
      const rz = (z - best.z) / len;
      const tx = -rz;
      const tz = rx;
      const halfLen = THWAITES_STEP * (0.7 + rng() * 0.5);
      const curve = (rng() > 0.5 ? 1 : -1) * (0.018 + rng() * 0.02);
      const centers: [number, number][] = [-1, -0.35, 0.35, 1].map((u) => [
        x + tx * u * halfLen + rx * (1 - u * u) * curve,
        z + tz * u * halfLen + rz * (1 - u * u) * curve,
      ]);
      pushVTrench(centers, 0.014 + (d < 0.6 ? 0.006 : 0), 0.011 + rng() * 0.004, CREVASSE_ICE);
    }
  }

  // Long rifts parallel to the front, inland (coastAt > 0.15): where the next icebergs will break off.
  for (let k = 0; k < coast.length; k += 6) {
    const c = coast[k];
    if (rng() > 0.6) continue;
    const inland = 0.25 + rng() * 0.5;
    const len = 0.25 + rng() * 0.4;
    const x = c.x - c.nx * inland;
    const z = c.z - c.nz * inland;
    const [tx, tz] = [-c.nz, c.nx];
    const curve = (rng() - 0.5) * 0.08;
    const centers: [number, number][] = [];
    for (let u = -1; u <= 1.001; u += 0.25) {
      centers.push([x + tx * u * len - c.nx * (1 - u * u) * curve, z + tz * u * len - c.nz * (1 - u * u) * curve]);
    }
    pushVTrench(centers, 0.018, 0.014, CREVASSE_ICE);
  }

  // Brash ice on the ocean plane (y = -0.05) in front of the cliff (coastAt < -0.1), thinning out to sea.
  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= n; j++) {
      if (s[i][j] >= 0 || !coast.length) continue;
      const x = at(i) + (rng() - 0.5) * 0.08;
      const z = at(j) + (rng() - 0.5) * 0.08;
      if (coastAt(x, z) >= -0.1) continue;
      let d = Infinity;
      for (const c of coast) d = Math.min(d, Math.hypot(c.x - x, c.z - z));
      if (d > 1.1 || rng() > 0.175 * (1 - d / 1.1) ** 2) continue;
      const sz = 0.02 + rng() * (d < 0.4 ? 0.07 : 0.04);
      const color = rng() > 0.4 ? WHITE : ICE_WALL;
      const piece = chunk(x, -0.045, z, sz, sz * (0.5 + rng() * 0.4), sz * (0.7 + rng() * 0.6), Math.floor(rng() * 1e6), color);
      if (piece.every(([a, b, c]) => coastAt(a[0], a[2]) < -0.05 && coastAt(b[0], b[2]) < -0.05 && coastAt(c[0], c[2]) < -0.05)) {
        brash.push(...piece);
      }
    }
  }

  // Two or three tabular icebergs embedded in the ocean plane (y = -0.05) near the front.
  const bergCenters: [number, number][] = [];
  if (coast.length) {
    const candidates = Array.from({ length: 12 }, (_, k) => Math.floor(((k + 0.5) / 12) * coast.length));
    for (const idx of candidates) {
      if (bergCenters.length >= 3) break;
      const c = coast[idx];
      const size = 0.1 + rng() * 0.06;
      const radius = 0.75 * size;
      const off = radius + 0.15 + rng() * 0.25;
      const x = c.x + c.nx * off;
      const z = c.z + c.nz * off;
      if (coastAt(x, z) >= -0.1) continue;
      if (bergCenters.some(([bx, bz]) => Math.hypot(bx - x, bz - z) < 0.55)) continue;
      let clear = true;
      for (let k = 0; k < 8 && clear; k++) {
        const a = (k / 8) * Math.PI * 2;
        if (coastAt(x + Math.cos(a) * radius, z + Math.sin(a) * radius) >= -0.1) clear = false;
      }
      if (!clear) continue;
      const berg = shift(turn(scaled(ICEBERG_TABULAR_POLY, size), rng() * Math.PI * 2), x, -0.05, z);
      if (berg.every(([a, b, d]) => coastAt(a[0], a[2]) < -0.05 && coastAt(b[0], b[2]) < -0.05 && coastAt(d[0], d[2]) < -0.05)) {
        brash.push(...berg);
        bergCenters.push([x, z]);
      }
    }
  }

  // The block that breaks off: on the stretch of front nearest (0, 0).
  let calving: ThwaitesFront['calving'] = null;
  if (coast.length) {
    const c = coast.reduce((a, b) => (Math.hypot(a.x, a.z) < Math.hypot(b.x, b.z) ? a : b));
    const heading = Math.atan2(c.nx, c.nz);
    const top = c.top + 0.01;
    calving = {
      pivot: [c.x, -0.05, c.z],
      heading,
      tris: prism([[0.07, 0], [0.06, -0.06], [-0.01, -0.075], [-0.07, -0.05], [-0.08, 0], [-0.02, 0.004]], 0, top + 0.02, ICE_WALL, WHITE),
    };
  }
  return { tris: [...cliff, ...crevasses, ...brash], cliff, crevasses, brash, calving };
}

/** The front on a made-up stretch of coast, scaled to one unit: the model of the Thwaites card. */
const THWAITES_CARD: Tri[] = (() => {
  const coastLine = (dx: number) => 0.6 + 0.35 * Math.sin(dx * 1.7) - 0.35 * Math.exp(-(((dx - 0.8) / 0.25) ** 2));
  const coastAt = (dx: number, dz: number) => coastLine(dx) - dz;
  const groundAt = (dx: number, dz: number) => (coastAt(dx, dz) > 0 ? 0.06 + Math.max(0, -dz) * 0.04 : 0);
  const { tris, calving } = thwaitesFront(groundAt, coastAt);
  const all = [...tris, ...(calving ? shift(turn(calving.tris, calving.heading), ...calving.pivot) : [])];
  const k = 1 / (2 * THWAITES_REACH);
  const fit = (p: Vec3): Vec3 => [p[0] * k * 1.6, Math.max(0, (p[1] + 0.05) * k * 4), p[2] * k * 1.6];
  const fitted = all
    .filter(([a, b, c]) => Math.max(a[1], b[1], c[1]) > -0.049)
    .map(([a, b, c, col]): Tri => [fit(a), fit(b), fit(c), col]);
  // Only the middle of the stretch: the card shows a piece of front, not the whole square.
  const near = fitted.filter(([a, b, c]) => Math.max(Math.hypot(a[0], a[2]), Math.hypot(b[0], b[2]), Math.hypot(c[0], c[2])) < 0.62);
  return resolveRelief(near, (y) => y);
})();

// ---------------------------------------------------------------------------------------------
// Lake Vostok
// ---------------------------------------------------------------------------------------------

const VOSTOK_X = 0.42;
const VOSTOK_Z = 0.35;
const VOSTOK_TOP = 0.4;
const VOSTOK_SAMPLES = 10;

/**
 * Upper boundaries of the layers of the Vostok section at (u, v) in -1..1, bottom to top, with their
 * colours: rock, the lake (a lens filling a rift of the bed, cut by the front face), deep ice, ice.
 */
function vostokLayers(u: number, v: number): [number, number][] {
  const lens = Math.max(0, 1 - (u / 0.72) ** 2 - (v / 1.3) ** 2);
  const bed = 0.11 - 0.05 * lens + 0.015 * Math.sin(u * 7 + v * 3);
  const lake = bed + 0.08 * Math.sqrt(lens);
  return [[bed, BEDROCK], [lake, LAKE_WATER], [0.26 + 0.01 * Math.sin(u * 5 - v * 4), GLACIAL_ICE_DEEP], [0.37, GLACIAL_ICE]];
}

const vostokSurface = (u: number, v: number) => VOSTOK_TOP + 0.008 * Math.sin(u * 9 + v * 4) + 0.006 * Math.sin(v * 11 - u * 3);

/** A cut face of the section from corner (u0, v0) to (u1, v1), clockwise seen from above: bands of the layers. */
function vostokFace(u0: number, v0: number, u1: number, v1: number): Tri[] {
  const out: Tri[] = [];
  const at = (k: number): [number, number] => [u0 + ((u1 - u0) * k) / VOSTOK_SAMPLES, v0 + ((v1 - v0) * k) / VOSTOK_SAMPLES];
  for (let s = 0; s < VOSTOK_SAMPLES; s++) {
    const [ua, va] = at(s);
    const [ub, vb] = at(s + 1);
    const la: [number, number][] = [...vostokLayers(ua, va), [vostokSurface(ua, va), WHITE]];
    const lb: [number, number][] = [...vostokLayers(ub, vb), [vostokSurface(ub, vb), WHITE]];
    let ya = 0;
    let yb = 0;
    la.forEach(([ta, color], k) => {
      const ta2 = Math.max(ya, ta);
      const tb2 = Math.max(yb, lb[k][0]);
      if (ta2 > ya + 1e-6 || tb2 > yb + 1e-6) {
        out.push(...quad([ua * VOSTOK_X, ya, va * VOSTOK_Z], [ub * VOSTOK_X, yb, vb * VOSTOK_Z], [ub * VOSTOK_X, tb2, vb * VOSTOK_Z], [ua * VOSTOK_X, ta2, va * VOSTOK_Z], color));
      }
      ya = ta2;
      yb = tb2;
    });
  }
  return out;
}

/**
 * Lake Vostok as a section of the ice sheet: rock, the lake, deep blue ice, paler ice and the snow
 * surface with the station and a drill tower, sunk into the snow of the plateau.
 * Conceptual section, not to scale: the water is drawn far thicker than its 510 m under about
 * 4 km of ice (PMC3960894).
 */
const VOSTOK: Tri[] = [
  ...groundField(12, 10, VOSTOK_X / 6, 77, (u, v) => vostokSurface(u, v), () => RELIEF_ICE),
  ...vostokFace(-1, 1, 1, 1),
  ...vostokFace(1, 1, 1, -1),
  ...vostokFace(1, -1, -1, -1),
  ...vostokFace(-1, -1, -1, 1),
  // The station on stilts at the south end of the lake, and the drill tower.
  ...[-0.28, -0.16, -0.04, 0.08].flatMap((x) => post(x, -0.18, VOSTOK_TOP + 0.05, BLACK, 0.016, VOSTOK_TOP)),
  ...block(-0.1, VOSTOK_TOP + 0.075, -0.18, 0.44, 0.05, 0.09, STATION_PANEL, RED),
  ...block(-0.1, VOSTOK_TOP + 0.08, -0.134, 0.38, 0.012, 0.004, BLACK),
  ...prism(rect(0.27, -0.15, 0.08, 0.08), VOSTOK_TOP, VOSTOK_TOP + 0.04, ZINC),
  ...prism(ngon(0.27, -0.15, 0.02, 4, Math.PI / 4), VOSTOK_TOP + 0.04, VOSTOK_TOP + 0.22, ZINC),
  ...block(0.27, VOSTOK_TOP + 0.235, -0.15, 0.05, 0.03, 0.05, RED),
  ...block(0.16, VOSTOK_TOP + 0.03, 0.12, 0.12, 0.05, 0.09, RED, WHITE),
];

// ---------------------------------------------------------------------------------------------
// Belgrano II on the Bertrab nunatak
// ---------------------------------------------------------------------------------------------

const SITE = 0.08;

/** Where the cloth hangs from a flagpole, and its stripes from the top down. */
export interface PointFlag {
  top: Point3;
  colors: readonly number[];
}

/** A flag cloth, hanging from `top` towards +x. */
export const flagCloth = ({ top: [x, y, z], colors }: PointFlag, width = 0.05): Tri[] => {
  const stripe = 0.03 / colors.length;
  return colors.flatMap((c, i) => block(x + width / 2 + 0.004, y - stripe * (i + 0.5), z, width, stripe, 0.004, c));
};

/** A flat-roofed module: walls, a slightly wider roof and a row of lit windows on its +z side. */
const module = (x: number, z: number, w: number, d: number, h: number, wall: number, windows: number, y = 0): Tri[] => [
  ...prism(rect(x, z, w, d), y, y + h, wall),
  ...prism(rect(x, z, w + 0.012, d + 0.012), y + h, y + h + 0.012, NAVY_ROOF),
  ...Array.from({ length: windows }, (_, i) => block(x - w / 2 + (w * (i + 0.5)) / windows, y + h * 0.6, z + d / 2 + 0.002, Math.min(0.025, w / windows / 2), h * 0.3, 0.004, LAMP)).flat(),
];

/**
 * Belgrano II: the Bertrab nunatak, a low outcrop of rock with snow in its hollows that rises out of
 * the ice of the relief and fades into it. On its levelled top, with snow drifted against them: the main
 * house, the LABEL laboratory, the power plant, a radome, a radio mast, the Belgrano cross and
 * the flagpole. The colour of the buildings is not in the sources: orange like the modern
 * pavilions of Orcadas. Illustration, not to scale.
 */
const BELGRANO: Tri[] = [
  // The nunatak: a low rounded outcrop of rock with snow in its hollows, rising from the ice, which
  // runs out to the edge of the model and lies on the relief there, so no edge shows.
  ...groundField(
    20,
    20,
    0.05,
    1979,
    (u, v, noise) => {
      const r = Math.hypot(u, v);
      if (r > 1) return null;
      // A main knoll under the base and two lower ridges running off it.
      const knoll = Math.max(0, 1 - Math.hypot(u / 0.62, (v - 0.04) / 0.5)) ** 0.8;
      const ridge = Math.max(0, 1 - Math.hypot((u + 0.45) / 0.3, (v + 0.4) / 0.16)) * 0.6 + Math.max(0, 1 - Math.hypot((u - 0.5) / 0.22, (v - 0.45) / 0.14)) * 0.45;
      const rock = Math.max(knoll, ridge) * (1 - smooth(0.75, 1, r));
      return SITE * Math.min(1, rock * 1.25) + (rock > 0.15 ? (noise - 0.5) * 0.02 : 0);
    },
    (u, v, h, steep, noise) => {
      if (h < 0.012) return RELIEF_ICE;
      // Bare rock on the steep faces; snow on the flat top and in the hollows.
      if (steep > 0.28 || (h < SITE * 0.7 && noise > 0.45)) return noise > 0.75 ? GRANITE : RELIEF_ROCK;
      return h > SITE - 0.01 && Math.hypot(u, v) < 0.35 ? RELIEF_ROCK : RELIEF_ICE;
    },
  ),
  // Snow drifted against the buildings on their windward side.
  ...chunk(-0.05, SITE + 0.012, -0.065, 0.28, 0.03, 0.05, 41, RELIEF_ICE),
  ...chunk(0.14, SITE + 0.01, -0.145, 0.13, 0.025, 0.04, 42, RELIEF_ICE),
  ...module(-0.05, 0.0, 0.24, 0.09, 0.06, ORANGE, 5, SITE),
  ...block(0.03, SITE + 0.022, 0.046, 0.022, 0.044, 0.004, BLACK),
  ...module(0.14, -0.1, 0.11, 0.07, 0.045, ORANGE, 2, SITE),
  ...post(0.17, -0.11, SITE + 0.11, ZINC, 0.008, SITE + 0.057),
  ...module(-0.11, -0.13, 0.11, 0.065, 0.04, ZINC, 0, SITE),
  ...post(-0.07, -0.14, SITE + 0.1, BLACK, 0.016, SITE + 0.05),
  // Radome of the satellite antenna.
  ...prism(ngon(0.15, 0.1, 0.035, 8), SITE, SITE + 0.025, ZINC),
  ...lathe(0.15, 0.1, [[SITE + 0.025, 0.036], [SITE + 0.055, 0.032], [SITE + 0.075, 0.02], [SITE + 0.083, 0]], 8, WHITE),
  // Radio mast with its arms.
  ...post(-0.21, -0.03, SITE + 0.22, ZINC, 0.01, SITE),
  ...block(-0.21, SITE + 0.19, -0.03, 0.06, 0.005, 0.005, ZINC),
  ...block(-0.21, SITE + 0.15, -0.03, 0.005, 0.005, 0.05, ZINC),
  // The Belgrano cross, brought from Belgrano I.
  ...post(-0.18, 0.13, SITE + 0.08, BLACK, 0.01, SITE),
  ...block(-0.18, SITE + 0.06, 0.13, 0.04, 0.01, 0.01, BLACK),
  // Flagpole on a stone base.
  ...prism(ngon(0.04, 0.14, 0.02, 6), SITE, SITE + 0.02, ROCK),
  ...post(0.04, 0.14, SITE + 0.18, WHITE, 0.008, SITE + 0.02),
];

export const BELGRANO_FLAGS: readonly PointFlag[] = [{ top: [0.04, SITE + 0.18, 0.14], colors: [SKY, WHITE, SKY] }];


// ---------------------------------------------------------------------------------------------
// South Pole: Amundsen-Scott station
// ---------------------------------------------------------------------------------------------

const POLE = { x: -0.1, z: 0.22 };
const RING = 0.13;
const FLAG_TOP = 0.14;
const POLO_FLAG_COLORS: readonly (readonly number[])[] = [
  [RED, WHITE, RED],
  [SKY, WHITE, SKY],
  [FLAG_BLUE, WHITE, RED],
  [FLAG_GREEN, WHITE, RED],
  [WHITE, RED, WHITE],
  [FLAG_BLUE, LAMP, FLAG_BLUE],
  [RED, LAMP, FLAG_GREEN],
];

export const POLO_FLAGS: readonly PointFlag[] = POLO_FLAG_COLORS.map((colors, i) => {
  const a = Math.PI * (1.1 + (0.8 * i) / (POLO_FLAG_COLORS.length - 1));
  return { top: [POLE.x + RING * Math.cos(a), FLAG_TOP, POLE.z + RING * Math.sin(a)], colors };
});

/**
 * One elevated wing of the station: on stilts, with the chamfered underside that lets the wind
 * sweep the snow below it, two bands of windows and a roof edge.
 */
const wing = (x: number, z: number, length: number): Tri[] => [
  ...[-0.42, -0.14, 0.14, 0.42].flatMap((k) => [...post(x + k * length, z - 0.045, 0.12, BLACK, 0.018), ...post(x + k * length, z + 0.045, 0.12, BLACK, 0.018)]),
  ...shift(extrude([[0.075, 0.13], [0.075, 0.22], [-0.075, 0.22], [-0.075, 0.15], [-0.045, 0.11], [0.045, 0.11]], -length / 2, length / 2, STATION_PANEL, STATION_DARK), x, 0, z),
  ...block(x, 0.225, z, length + 0.01, 0.01, 0.155, ZINC),
  ...block(x, 0.19, z + 0.077, length - 0.04, 0.012, 0.004, BLACK),
  ...block(x, 0.16, z + 0.077, length - 0.04, 0.012, 0.004, BLACK),
];

/**
 * Amundsen-Scott station: the elevated station (two wings on stilts and the tower of the vertical
 * link), a blue laboratory of the dark sector, the ceremonial pole (striped, with a silver ball) in
 * its ring of flags and the marker of the geographic pole. It stands on the snow of the relief itself.
 * Illustration, not to scale.
 */
const POLO: Tri[] = [
  ...wing(-0.23, -0.14, 0.4),
  ...wing(0.23, -0.14, 0.4),
  ...block(0, 0.17, -0.14, 0.08, 0.07, 0.09, STATION_DARK),
  ...prism(rect(-0.46, -0.14, 0.06, 0.08), 0, 0.25, STATION_DARK),
  ...block(-0.46, 0.255, -0.14, 0.07, 0.01, 0.09, ZINC),
  // Snow drifts swept behind the station.
  ...chunk(-0.22, 0.012, -0.29, 0.36, 0.03, 0.06, 31, RELIEF_ICE),
  ...chunk(0.25, 0.01, -0.3, 0.3, 0.025, 0.06, 32, RELIEF_ICE),
  // Blue laboratory of the dark sector, on stilts, with its two towers.
  ...[[-0.05, -0.04], [0.05, -0.04], [-0.05, 0.04], [0.05, 0.04]].flatMap(([dx, dz]) => post(0.3 + dx, 0.3 + dz, 0.09, BLACK, 0.016)),
  ...block(0.3, 0.12, 0.3, 0.15, 0.07, 0.11, LAB_BLUE, ZINC),
  ...prism(rect(0.25, 0.3, 0.03, 0.03), 0.155, 0.22, LAB_BLUE),
  ...prism(rect(0.35, 0.3, 0.03, 0.03), 0.155, 0.22, LAB_BLUE),
  // Ceremonial pole: a striped post with a silver ball.
  ...prism(ngon(POLE.x, POLE.z, 0.03, 6), 0, 0.012, ZINC),
  ...lathe(POLE.x, POLE.z, [0, 1, 2, 3, 4].map((i) => [0.012 + i * 0.026, 0.011] as const), 6, (_s, band) => (band % 2 ? WHITE : RED)),
  ...lathe(POLE.x, POLE.z, [[0.116, 0.006], [0.122, 0.018], [0.137, 0.024], [0.151, 0.016], [0.158, 0]], 8, SILVER),
  // Flagpoles of the ring (the cloths wave on the map: POLO_FLAGS).
  ...POLO_FLAGS.flatMap(({ top: [x, y, z] }) => post(x, z, y, ZINC, 0.008)),
  // Marker of the geographic pole.
  ...post(0.1, 0.38, 0.08, BLACK, 0.012),
  ...lathe(0.1, 0.38, [[0, 0.025], [0.008, 0.02], [0.01, 0]], 6, ZINC),
];

// ---------------------------------------------------------------------------------------------
// Little Dome C (ice cores)
// ---------------------------------------------------------------------------------------------

const DRILL = { x: -0.06, z: -0.06 };

/**
 * Drilling camp of Beyond EPICA at Little Dome C: the arched drilling tent with its tower through
 * the roof, two sleeping tents, the blue generators, the red shower module on skids, the orange
 * sled with boxes and ice cores, the trench entrance and the satellite dish. It stands on the snow of
 * the relief itself. Illustration, not to scale.
 */
const TESTIGOS: Tri[] = [
  ...archTent(DRILL.x, DRILL.z, 0.44, 0.27, 0.17, TENT, TENT_SHADE),
  ...block(DRILL.x + 0.221, 0.04, DRILL.z, 0.004, 0.08, 0.06, BLACK),
  // The drill tower through the roof, with its braces.
  ...prism(rect(DRILL.x + 0.06, DRILL.z, 0.04, 0.04), 0.15, 0.36, ZINC),
  ...[0.2, 0.26, 0.32].flatMap((y) => block(DRILL.x + 0.06, y, DRILL.z, 0.05, 0.008, 0.05, BLACK)),
  ...block(DRILL.x + 0.06, 0.37, DRILL.z, 0.06, 0.02, 0.06, RED),
  ...archTent(0.3, -0.28, 0.2, 0.13, 0.085, TENT, TENT_SHADE),
  ...archTent(0.33, -0.09, 0.18, 0.12, 0.075, TENT, TENT_SHADE),
  // Generators, with their exhausts.
  ...block(-0.36, 0.04, 0.2, 0.08, 0.08, 0.1, GENERATOR_BLUE),
  ...block(-0.26, 0.04, 0.2, 0.08, 0.08, 0.1, GENERATOR_BLUE),
  ...post(-0.34, 0.18, 0.11, BLACK, 0.01, 0.08),
  ...post(-0.24, 0.18, 0.11, BLACK, 0.01, 0.08),
  // Shower module on skids.
  ...block(0.05, 0.012, 0.25, 0.19, 0.01, 0.01, BLACK),
  ...block(0.05, 0.012, 0.33, 0.19, 0.01, 0.01, BLACK),
  ...block(0.05, 0.065, 0.29, 0.17, 0.09, 0.1, RED, ZINC),
  ...block(0.1, 0.06, 0.341, 0.03, 0.06, 0.004, BLACK),
  // Orange sled with core boxes and two cores.
  ...block(0.33, 0.012, 0.19, 0.24, 0.008, 0.012, ORANGE),
  ...block(0.33, 0.012, 0.29, 0.24, 0.008, 0.012, ORANGE),
  ...block(0.33, 0.024, 0.24, 0.22, 0.012, 0.11, ORANGE),
  ...block(0.28, 0.048, 0.24, 0.09, 0.036, 0.09, WHITE),
  ...block(0.38, 0.048, 0.24, 0.08, 0.036, 0.09, CREAM),
  ...block(0.33, 0.074, 0.22, 0.2, 0.016, 0.016, ICE_CORE),
  ...block(0.33, 0.074, 0.255, 0.2, 0.016, 0.016, ICE_CORE),
  // Entrance of the science trench, dug into the snow.
  ...prism(rect(-0.36, -0.24, 0.12, 0.12), 0, 0.04, ZINC),
  ...block(-0.36, 0.02, -0.178, 0.04, 0.03, 0.004, BLACK),
  // Satellite dish.
  ...post(-0.4, 0.0, 0.1),
  ...lathe(-0.4, 0.0, [[0.1, 0.008], [0.115, 0.04], [0.12, 0.045]], 8, WHITE),
];

// ---------------------------------------------------------------------------------------------
// Emperor penguin colony
// ---------------------------------------------------------------------------------------------

export const EMPEROR_HUDDLE_CENTER: Point3 = [0.04, 0.012, 0.08];
const EMPEROR_HEIGHT = 0.075;

/**
 * Emperor colony on the fast ice: the guano stain under the colony, a crack in the ice and an
 * iceberg grounded behind it (-z), with a few birds apart from the huddle, on the ice of the relief. The huddle
 * is EMPEROR_HUDDLE. Illustration, not to scale.
 */
const EMPERADOR: Tri[] = [
  // The guano stain under the colony and a crack in the ice: the rest of the ground is the relief.
  ...groundField(
    16,
    16,
    0.062,
    2012,
    (u, v, noise) => {
      const stain = Math.hypot(u * 0.5 - EMPEROR_HUDDLE_CENTER[0], v * 0.5 - EMPEROR_HUDDLE_CENTER[2]) < 0.15 + (noise - 0.5) * 0.06;
      const crack = Math.abs(u * 0.6 - v + 0.55) < 0.06 && Math.hypot(u, v) < 0.9;
      return stain || crack ? 0.012 : null;
    },
    (u, v) => (Math.hypot(u * 0.5 - EMPEROR_HUDDLE_CENTER[0], v * 0.5 - EMPEROR_HUDDLE_CENTER[2]) < 0.17 ? GUANO : ICE_WALL),
    0.002,
  ),
  // Grounded iceberg at the back: a tabular block with a lower melted step.
  ...prism([[0.1, -0.25], [-0.2, -0.24], [-0.32, -0.3], [-0.22, -0.4], [0.02, -0.42], [0.2, -0.36]], 0, 0.2, ICE_WALL, WHITE),
  ...prism([[0.24, -0.2], [0.1, -0.25], [0.2, -0.36], [0.26, -0.3]], 0, 0.11, ICE_WALL, WHITE),
  ...emperor(0.3, 0.26, EMPEROR_HEIGHT, 0.4),
  ...emperor(0.35, 0.2, EMPEROR_HEIGHT * 0.9, 0.2),
  ...emperor(-0.28, 0.3, EMPEROR_HEIGHT, 2.6),
  ...emperor(0.32, -0.08, EMPEROR_HEIGHT, -0.6),
];

/** The huddle: emperors packed in rings round EMPEROR_HUDDLE_CENTER, relative to it. On the map it turns slowly (AAD). */
export const EMPEROR_HUDDLE: readonly Tri[] = Array.from({ length: 19 }, (_, i) => {
  // Packed rings: 1 in the middle, 6 round it, 12 outside, all facing roughly the same way.
  const ring = i === 0 ? 0 : i < 7 ? 1 : 2;
  const k = ring === 0 ? 0 : ring === 1 ? i - 1 : i - 7;
  const a = (k / (ring === 1 ? 6 : 12)) * Math.PI * 2 + ring * 0.3;
  const r = ring * 0.034;
  return emperor(r * Math.cos(a), r * Math.sin(a), EMPEROR_HEIGHT * (ring === 2 ? 0.95 : 1), 0.3 + Math.sin(i * 2.3) * 0.25);
}).flat();

// ---------------------------------------------------------------------------------------------

/**
 * Low-poly model of a map point that has no expedition yet (tier B and C in points.ts). Every
 * model is an illustration, not a scale model (docs/diseno/estilo-voxel.md).
 */
export interface PointModel {
  /** Set on the 3D map at the point, without its moving parts. Erebus has none: its summit is raised from the relief. */
  map?: readonly Tri[];
  /** The model in the card of the point (ModelPreview), with its moving parts at rest. */
  preview: { tris: readonly Tri[]; motion: PreviewMotion; lift?: number; sea?: boolean };
  /**
   * World width on the map (1 = 8 km) up close, lying on the relief and seen in detail in the
   * close-up of its point (MapPoint.closeUp); from afar it grows a little to stay visible
   * (PointModels.tsx). Not to scale: a real station is about a hundred metres long.
   */
  width?: number;
  /**
   * Radius (model units) of the levelled pad the buildings stand on. Outside it the ground of the
   * model lies on the relief, vertex by vertex, out to its edge.
   */
  pad?: number;
  /** Turn round y (radians) that faces the model to its ground: the sea side of Thwaites and Belgrano II. */
  heading?: number;
  /** The pad is levelled at the highest ground under it, not the mean: a knoll that stands out of the ice. */
  footing?: 'highest' | 'mean';
  /**
   * Map units from the point to the middle of the model. Belgrano II: the point falls on the step
   * between the Filchner shelf and a slope Bedmap3 smooths into a ramp; the model stands just off
   * it, on the shelf, where the real nunatak meets the ice.
   */
  offset?: readonly [number, number];
}

const withFlags = (tris: readonly Tri[], flags: readonly PointFlag[]) => [...tris, ...flags.flatMap((f) => flagCloth(f))];

/**
 * The model for its card: cut at the ground (no relief hides what sinks into it) and with its relief
 * faces colored for a ground at `baseY` (world units; the high plateau by default).
 */
const card = (tris: readonly Tri[], baseY = 15, snow = false): Tri[] =>
  resolveRelief(
    [...tris, ...(snow ? plateau(9090) : [])]
      .filter(([a, b, c]) => Math.max(a[1], b[1], c[1]) > 0.001)
      .map(([a, b, c, col]) => [[a[0], Math.max(0, a[1]), a[2]], [b[0], Math.max(0, b[1]), b[2]], [c[0], Math.max(0, c[1]), c[2]], col]),
    (y) => baseY + y,
  );

/** Low-poly models of the map points, by point id (points.ts). */
export const POINT_MODELS: Readonly<Record<string, PointModel>> = {
  polo: { map: POLO, preview: { tris: card(withFlags(POLO, POLO_FLAGS), 17, true), motion: 'turn', lift: 0.06 }, width: 0.8, pad: 0.4 },
  testigos: { map: TESTIGOS, preview: { tris: card(TESTIGOS, 20, true), motion: 'turn', lift: 0.08 }, width: 0.8, pad: 0.4 },
  belgrano: {
    map: BELGRANO,
    preview: { tris: card(withFlags(BELGRANO, BELGRANO_FLAGS), 1, true), motion: 'turn', lift: 0.06 },
    width: 0.9,
    pad: 0.28,
    // The ice rises east, inland; the shelf and the sea lie west.
    heading: -Math.PI / 2,
    footing: 'mean',
    offset: [-1.3, 0],
  },

  erebus: { preview: { tris: EREBUS_CARD, motion: 'turn', lift: 0.1 } },
  // Thwaites is built from the relief round its point (thwaitesFront), like the summit of Erebus.
  thwaites: { preview: { tris: THWAITES_CARD, motion: 'turn', lift: 0.02, sea: true } },
  vostok: { map: VOSTOK, preview: { tris: card(VOSTOK, 22, true), motion: 'turn', lift: 0.14 }, width: 1, pad: 0.46 },
  emperador: {
    map: EMPERADOR,
    preview: { tris: card([...EMPERADOR, ...shift(EMPEROR_HUDDLE, ...EMPEROR_HUDDLE_CENTER)], 0, true), motion: 'turn', lift: 0.06 },
    width: 0.6,
    pad: 0.48,
  },
};

// ---------------------------------------------------------------------------------------------
// Motion of the moving parts, as pure functions of the time in seconds. ILLUSTRATIVE: the pace is
// compressed so it can be seen; Erebus has two to six explosions a day (USAP), not one every few
// seconds, and a front does not calve every quarter of a minute.
// ---------------------------------------------------------------------------------------------

export const PLUME_PUFFS = 7;
const PLUME_SECONDS = 9;

/** A puff of the Erebus plume (world units): it rises from the vent, drifts with the wind (+x) and grows. */
export function plumePuff(vent: Point3, i: number, t: number): { at: Point3; size: number } {
  const age = (t / PLUME_SECONDS + i / PLUME_PUFFS) % 1;
  const [x, y, z] = vent;
  // A plume in proportion to the summit, whatever the vertical exaggeration.
  const k = Math.max(0.45, EREBUS_VERTICAL);
  return { at: [x + age * age * 1.1 * k, y + 0.05 + age * 1.3 * k, z + age * 0.2 * k], size: (0.08 + 0.3 * Math.sin(Math.PI * Math.min(1, age * 1.1))) * k };
}

export const STEAM_PER_TOWER = 2;
const STEAM_SECONDS = 3;

/** A wisp of steam over an ice tower of Erebus (world units). */
export function towerSteam(tower: Point3, index: number, i: number, t: number): { at: Point3; size: number } {
  const age = (t / STEAM_SECONDS + i / STEAM_PER_TOWER + index * 0.37) % 1;
  const [x, y, z] = tower;
  return { at: [x + age * 0.05, y + age * 0.22, z], size: 0.025 + 0.05 * Math.sin(Math.PI * age) };
}

export const BOMBS = 3;
const BOMB_EVERY = 9;
const BOMB_FLIGHT = 1.6;

/** A lava bomb of a Strombolian explosion of Erebus onto the crater rim (NASA Photojournal), or null between explosions. */
export function lavaBomb(vent: Point3, rim: number, i: number, t: number): Point3 | null {
  const phase = t % BOMB_EVERY;
  if (phase > BOMB_FLIGHT) return null;
  const s = phase / BOMB_FLIGHT;
  const a = 0.4 + i * 2.1;
  const [x, y, z] = vent;
  return [x + Math.cos(a) * CRATER_RIM * s, y + 0.5 * Math.max(0.5, EREBUS_VERTICAL) * 4 * s * (1 - s) + (rim + 0.02 - y) * s, z + Math.sin(a) * CRATER_RIM * s];
}

const CALVING_SECONDS = 14;

/** The calving block of Thwaites: at rest, tipping over its seaward foot, sinking, then gone. */
export function calvingPose(t: number): { tilt: number; sink: number; visible: boolean } {
  const p = t % CALVING_SECONDS;
  if (p < 9) return { tilt: 0, sink: 0, visible: true };
  if (p < 11) return { tilt: 1.2 * ((p - 9) / 2) ** 2, sink: 0, visible: true };
  if (p < 12.5) return { tilt: 1.2, sink: -0.1 * ((p - 11) / 1.5), visible: true };
  return { tilt: 1.2, sink: -0.1, visible: false };
}

/** Turn of the emperor huddle: the birds take turns at the warm centre (AAD). One turn in about 2.5 min. */
export const huddleTurn = (t: number) => t * 0.04;

/** Swing of a flag cloth round its pole. */
export const flagSwing = (i: number, t: number) => 0.45 * Math.sin(t * 2.2 + i * 1.3) + 0.15 * Math.sin(t * 5.1 + i);

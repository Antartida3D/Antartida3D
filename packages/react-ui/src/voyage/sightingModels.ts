import type { BufferGeometry, Object3D } from 'three';
import { createSeededRng, type Sighting } from '@antartida/core';
import type { Box } from './vehicles.ts';
import { MALVINAS_FLAG_BOXES } from '../map3d/malvinasFlagModel.ts';
import { CLAIM_FLAG_MODELS } from '../map3d/claimFlagModels.ts';
import { PONCHO_MODELS } from './ponchoModels.ts';
import { boxShade, buildPolyGeometry, mirrorZ, scaled, shift, turn, type Tri } from './lowPoly.ts';
import { assembleCetacean, ORCA_PARTS } from './whalePolyModels.ts';
import { HUMPBACK_PARTS, LEOPARD_TRIS } from '../marine/lowPolyMarine.ts';
import { ALBATROSS_PARTS } from './seaImmersiveModels.ts';
import { assemblePenguin, assembleWeddellSeal, PENGUIN_FLOE_TRIS, PENGUIN_FLOE_Y, SEAL_FLOE_PLACEMENT, SEAL_FLOE_TRIS } from './seaPolyModels.ts';
import { ECLAIREURS_POLY } from './poly/eclaireursPoly.ts';
import { SAN_JUAN_POLY } from './poly/sanJuanPoly.ts';
import { MARTILLO_POLY } from './poly/martilloPoly.ts';
import { CORMORANT_BODY_POLY, CORMORANT_WING_POLY } from './poly/cormorantPoly.ts';
import { GIANT_PETREL_BODY_POLY, GIANT_PETREL_WING_POLY } from './poly/giantPetrelPoly.ts';
import { CAPE_PETREL_BODY_POLY, CAPE_PETREL_WING_POLY } from './poly/capePetrelPoly.ts';
import { SEA_LION_POLY } from './poly/seaLionPoly.ts';
import { CRABEATER_SEAL_POLY } from './poly/crabeaterSealPoly.ts';
import { PEALES_DOLPHIN_POLY } from './poly/pealesDolphinPoly.ts';
import { HOURGLASS_DOLPHIN_POLY } from './poly/hourglassDolphinPoly.ts';
import { BLACK, ICE, WHITE } from './sightingColors.ts';

// The colors shared with the low-poly models live in sightingColors.ts (no import cycle).
export { BLACK, CREAM, ICE, LAMP, NAVY_ROOF, ORANGE, RED, ROCK, SKY, WHITE, ZINC } from './sightingColors.ts';
const SEA_GREY = 0x6f7f8c;
const WHALE_GREY = 0x55606b;

interface Model {
  body: readonly Box[];
}

/** Where a wing joins the body: it turns around this point. */
export const WING_ROOT = [0.02, 0.05, 0.06] as const;

/** A low-poly sighting: one body and, for birds, the right wing measured from WING_ROOT (the left is its mirror). */
interface PolyModel {
  body: readonly Tri[];
  wing?: readonly Tri[];
  /** The left wing when it is not the mirror of `wing`. */
  wingLeft?: readonly Tri[];
  /** How far (radians) and how fast (radians per second) the wings beat. */
  flap?: readonly [reach: number, speed: number];
}

/** Seal or penguin on the ice floe of the open map, as it stands there. */
const onFloe = (tris: readonly Tri[], floe: readonly Tri[], y: number, scale: number, angle = 0): Tri[] => [
  ...floe,
  ...shift(turn(scaled(tris, scale), angle), 0, y, 0),
];
const penguinOnFloe = (species: 'adelie' | 'chinstrap'): Tri[] => onFloe(assemblePenguin(species), PENGUIN_FLOE_TRIS, PENGUIN_FLOE_Y, 0.55);

/** The albatross wings are modelled from the body origin: moved so that, at WING_ROOT, they land where they were drawn. */
const fromRoot = (tris: readonly Tri[], side: 1 | -1): Tri[] => shift(tris, -WING_ROOT[0], -WING_ROOT[1], -WING_ROOT[2] * side);

/** Every sighting of Desde Ushuaia that is not the orca, by id: all of them low-poly (rule 30). */
const POLY_MODELS: Readonly<Record<string, PolyModel>> = {
  eclaireurs: { body: ECLAIREURS_POLY },
  'san-juan': { body: SAN_JUAN_POLY },
  martillo: { body: MARTILLO_POLY },
  // The cormorant beats its wings fast; albatrosses and petrels glide and barely move them.
  cormoran: { body: CORMORANT_BODY_POLY, wing: CORMORANT_WING_POLY, flap: [0.5, 9] },
  albatros: { body: ALBATROSS_PARTS.body, wing: fromRoot(ALBATROSS_PARTS.wingR, 1), wingLeft: fromRoot(ALBATROSS_PARTS.wingL, -1), flap: [0.08, 1.2] },
  'petrel-gigante': { body: GIANT_PETREL_BODY_POLY, wing: GIANT_PETREL_WING_POLY, flap: [0.12, 1.6] },
  'petrel-damero': { body: CAPE_PETREL_BODY_POLY, wing: CAPE_PETREL_WING_POLY, flap: [0.3, 5] },
  lobos: { body: SEA_LION_POLY },
  leopardo: { body: onFloe(LEOPARD_TRIS, SEAL_FLOE_TRIS, SEAL_FLOE_PLACEMENT.y, 0.6, SEAL_FLOE_PLACEMENT.angle) },
  cangrejera: { body: CRABEATER_SEAL_POLY },
  weddell: { body: onFloe(assembleWeddellSeal(), SEAL_FLOE_TRIS, SEAL_FLOE_PLACEMENT.y, SEAL_FLOE_PLACEMENT.scale, SEAL_FLOE_PLACEMENT.angle) },
  'delfin-austral': { body: PEALES_DOLPHIN_POLY },
  'delfin-cruzado': { body: HOURGLASS_DOLPHIN_POLY },
  jorobada: { body: assembleCetacean(HUMPBACK_PARTS) },
  barbijo: { body: penguinOnFloe('chinstrap') },
  adelia: { body: penguinOnFloe('adelie') },
};

/** Every low-poly model of the sightings by name, for the test of least detail (the wings count too). */
export const SIGHTING_POLY_MODELS: Readonly<Record<string, readonly Tri[]>> = {
  orca: assembleCetacean(ORCA_PARTS),
  ...Object.fromEntries(Object.entries(POLY_MODELS).map(([id, m]) => [id, [...m.body, ...(m.wing ?? [])]])),
};

// Humpback whale: body thinning to the tail, flat head, very long white flippers, white under the flukes.
const WHALE: Box[] = [
  [0.02, 0, 0, 0.36, 0.24, 0.24, WHALE_GREY],
  [0.27, -0.01, 0, 0.18, 0.22, 0.22, WHALE_GREY],
  [0.42, -0.03, 0, 0.14, 0.17, 0.19, WHALE_GREY],
  [0.52, -0.05, 0, 0.08, 0.11, 0.14, WHALE_GREY],
  [-0.22, 0.01, 0, 0.18, 0.19, 0.18, WHALE_GREY],
  [-0.38, 0.02, 0, 0.16, 0.13, 0.11, WHALE_GREY],
  [-0.5, 0.03, 0, 0.1, 0.08, 0.06, WHALE_GREY],
  [-0.57, 0.035, 0, 0.07, 0.03, 0.08, WHALE_GREY],
  [-0.58, 0.035, 0.1, 0.1, 0.03, 0.16, WHALE_GREY],
  [-0.58, 0.035, -0.1, 0.1, 0.03, 0.16, WHALE_GREY],
  [-0.62, 0.035, 0.2, 0.06, 0.025, 0.08, WHALE_GREY],
  [-0.62, 0.035, -0.2, 0.06, 0.025, 0.08, WHALE_GREY],
  [-0.58, 0.018, 0.1, 0.08, 0.01, 0.14, WHITE],
  [-0.58, 0.018, -0.1, 0.08, 0.01, 0.14, WHITE],
  [-0.14, 0.14, 0, 0.1, 0.05, 0.04, WHALE_GREY],
  [0.2, -0.1, 0.19, 0.12, 0.03, 0.16, WHITE],
  [0.2, -0.1, -0.19, 0.12, 0.03, 0.16, WHITE],
  [0.14, -0.1, 0.33, 0.1, 0.025, 0.14, WHITE],
  [0.14, -0.1, -0.33, 0.1, 0.025, 0.14, WHITE],
  [0.22, -0.115, 0, 0.5, 0.03, 0.2, WHITE],
  [0.44, 0.02, 0.097, 0.03, 0.03, 0.01, BLACK],
  [0.44, 0.02, -0.097, 0.03, 0.03, 0.01, BLACK],
];

/** A seal resting with its head up: on a rock in the Beagle Channel, on an ice floe in Antarctica. */
const seal = (body: number, belly: number, ground: number): Model => ({
  body: [
    [0, 0, 0, 1, 0.08, 0.7, ground],
    [0, 0.14, 0, 0.44, 0.17, 0.22, body],
    [0.22, 0.17, 0, 0.14, 0.2, 0.18, body],
    [0.33, 0.27, 0, 0.13, 0.13, 0.13, body],
    [0.41, 0.25, 0, 0.06, 0.07, 0.08, body],
    [0.445, 0.255, 0, 0.02, 0.03, 0.04, BLACK],
    [0.37, 0.3, 0.066, 0.025, 0.025, 0.01, BLACK],
    [0.37, 0.3, -0.066, 0.025, 0.025, 0.01, BLACK],
    [-0.27, 0.12, 0, 0.18, 0.12, 0.16, body],
    [-0.4, 0.09, 0.06, 0.12, 0.04, 0.1, body],
    [-0.4, 0.09, -0.06, 0.12, 0.04, 0.1, body],
    [0.18, 0.07, 0.14, 0.12, 0.04, 0.1, body],
    [0.18, 0.07, -0.14, 0.12, 0.04, 0.1, body],
    [0.1, 0.075, 0, 0.36, 0.05, 0.18, belly],
  ],
});

/**
 * Antarctic minke whale: slimmer than the humpback, pointed head, small fin far back. Its flippers are
 * grey with only a white leading edge: the conspicuous white band belongs to the other minkes
 * (NOAA Fisheries, «Minke Whale», consulted 2026-11-14).
 */
const MINKE: Box[] = [
  [0.02, 0, 0, 0.4, 0.17, 0.17, 0x3d4852],
  [0.28, -0.01, 0, 0.16, 0.15, 0.15, 0x3d4852],
  [0.41, -0.03, 0, 0.12, 0.11, 0.12, 0x3d4852],
  [0.5, -0.045, 0, 0.08, 0.07, 0.08, 0x3d4852],
  [-0.24, 0.01, 0, 0.18, 0.14, 0.13, 0x3d4852],
  [-0.4, 0.02, 0, 0.16, 0.09, 0.08, 0x3d4852],
  [-0.52, 0.03, 0, 0.1, 0.05, 0.05, 0x3d4852],
  [-0.59, 0.035, 0.08, 0.09, 0.025, 0.14, 0x3d4852],
  [-0.59, 0.035, -0.08, 0.09, 0.025, 0.14, 0x3d4852],
  [-0.22, 0.1, 0, 0.07, 0.06, 0.03, 0x3d4852],
  [0.18, -0.06, 0.12, 0.1, 0.025, 0.1, 0x3d4852],
  [0.18, -0.06, -0.12, 0.1, 0.025, 0.1, 0x3d4852],
  [0.226, -0.06, 0.12, 0.012, 0.027, 0.1, WHITE],
  [0.226, -0.06, -0.12, 0.012, 0.027, 0.1, WHITE],
  [0.16, -0.085, 0, 0.56, 0.03, 0.14, WHITE],
  [0.43, 0.005, 0.062, 0.03, 0.03, 0.01, BLACK],
  [0.43, 0.005, -0.062, 0.03, 0.03, 0.01, BLACK],
];

export const ICE_SHADE = 0xc5dbe6;

/** Pale turquoise of the ice seen through shallow water: the foot that spreads under an iceberg. */
export const ICE_SUBMERGED = 0x9fd6dc;
/** Wall of an iceberg: bluer than snow, so the baked face shading reads as ice and not as grey stone. */
export const ICE_WALL = 0xb4d5ea;

/** Side of one ice column, in model units. */
const ICE_CELL = 0.1;
/** Height step of the columns: heights snap to it, so the ice breaks into terraces and not into a ramp. */
const ICE_STEP = 0.035;

/**
 * An iceberg as a field of square ice columns over a ragged footprint. Straight walls, a flat roof
 * and dark slits read as a building, so the outline is broken column by column, the rim steps down
 * to the water and nothing is darker than wet ice. `height(u, v)` gets the cell position in -1..1
 * along the length and the width and returns the ice height there, or 0 for open water.
 */
function iceberg(cols: number, rows: number, seed: number, height: (u: number, v: number, noise: number) => number): Box[] {
  const rng = createSeededRng(seed);
  const length = cols * ICE_CELL;
  const width = rows * ICE_CELL;
  const boxes: Box[] = [
    // Submerged foot, wider than the ice above the water
    [0, 0.006, 0, length * 0.92, 0.012, width * 0.8, ICE_SUBMERGED],
    [length * 0.06, 0.006, width * 0.05, length * 0.7, 0.012, width, ICE_SUBMERGED],
  ];
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const u = ((i + 0.5) / cols) * 2 - 1;
      const v = ((j + 0.5) / rows) * 2 - 1;
      const h = Math.round(height(u, v, rng()) / ICE_STEP) * ICE_STEP;
      if (h <= 0) continue;
      const x = (u * length) / 2;
      const z = (v * width) / 2;
      // The lowest terrace is washed by the waves: wet, bluer ice with no snow on it.
      const low = h <= ICE_STEP;
      boxes.push([x, h / 2, z, ICE_CELL, h, ICE_CELL, low ? ICE_SHADE : ICE_WALL]);
      if (!low) boxes.push([x, h + 0.005, z, ICE_CELL, 0.01, ICE_CELL, WHITE]);
    }
  }
  // Calved fragments drifting next to it
  boxes.push(
    [length * 0.6, 0.02, width * 0.38, 0.09, 0.045, 0.07, ICE_WALL],
    [length * 0.66, 0.012, width * 0.2, 0.05, 0.03, 0.05, WHITE],
    [-length * 0.6, 0.018, -width * 0.36, 0.07, 0.04, 0.09, ICE_WALL],
  );
  return boxes;
}

/**
 * Tabular iceberg: a wide plateau that broke off an ice shelf. The plateau is level, the rim falls
 * to the sea in terraces, and one end has collapsed.
 */
const ICEBERG_TABULAR: Box[] = iceberg(11, 7, 190421, (u, v, noise) => {
  const edge = 1 - Math.hypot(u * 0.95, v) - (noise - 0.5) * 0.34 + (u > 0.3 && v < 0 ? -0.22 : 0);
  if (edge <= 0) return 0;
  return Math.min(0.21, ICE_STEP + edge * 0.62);
});

/**
 * Small weathered iceberg: a tall peak off centre, a lower second peak past a saddle, and melted
 * terraces around them.
 */
const ICEBERG_PEAKS: Box[] = iceberg(8, 6, 190422, (u, v, noise) => {
  // Each peak falls as a sheer cliff on its west side and as a long melted slope on the east one.
  const peak = (cu: number, cv: number, top: number, reach: number) =>
    top * Math.max(0, 1 - Math.hypot((u - cu) * (u < cu ? 2.6 : 1), v - cv) / reach) ** 1.5;
  const h = Math.max(peak(-0.45, -0.15, 0.5, 1.15), peak(0.45, 0.4, 0.27, 0.6)) + (noise - 0.5) * 0.09;
  return h < 0.03 ? 0 : h;
});

/**
 * Models of the sea life and ice that live on the map outside the trip. Every model of the app is
 * built this way (see docs/diseno/estilo-voxel.md): boxes, flat colors, no textures.
 */
export const SEA_MODELS = {
  humpback: WHALE,
  minke: MINKE,
  seal: seal(SEA_GREY, 0xc9d0d4, ICE).body,
  'iceberg-lg': ICEBERG_TABULAR,
  'iceberg-sm': ICEBERG_PEAKS,
} as const satisfies Record<string, readonly Box[]>;
export type SeaModelId = keyof typeof SEA_MODELS;

/** Every model of this file by name, for the test of least detail. */
export const SCENE_MODELS: Readonly<Record<string, readonly Box[]>> = {
  ...Object.fromEntries(Object.entries(CLAIM_FLAG_MODELS).map(([country, boxes]) => [`claimFlag:${country}`, boxes])),
  malvinasFlag: MALVINAS_FLAG_BOXES,
  ...PONCHO_MODELS,
  ...Object.fromEntries(Object.entries(SEA_MODELS).map(([id, boxes]) => [`sea:${id}`, boxes])),
  // The Orcadas station models, Ushuaia, the voyage helicopter and the sightings are low-poly
  // (orcadas/lowPoly*.ts, voyage/poly/, SIGHTING_POLY_MODELS).
};

export interface SightingGeometry {
  body: BufferGeometry;
  /** Right and left wing, each measured from its root. */
  wings?: readonly [BufferGeometry, BufferGeometry];
}

export function buildSightingGeometry(s: Sighting): SightingGeometry | null {
  const model = POLY_MODELS[s.id];
  if (model) {
    const wing = model.wing;
    return {
      body: buildPolyGeometry(model.body, boxShade),
      wings: wing && [buildPolyGeometry(wing, boxShade), buildPolyGeometry(model.wingLeft ?? mirrorZ(wing), boxShade)],
    };
  }
  // The orca is the low-poly one of the open map and Océano, in one piece.
  if (s.id === 'orca') return { body: buildPolyGeometry(assembleCetacean(ORCA_PARTS), boxShade) };
  return null;
}

/**
 * Moves the model inside its spot, in model units, `time` in seconds: birds fly in circles,
 * dolphins jump, the whale comes up to breathe, seals and penguins rock. ILLUSTRATIVE: no source
 * backs these movements. A place stays still.
 */
export function moveSighting(model: Object3D, s: Sighting, time: number): void {
  if (s.place) return;
  if (s.icon === 'bird') {
    const a = time * 0.8;
    model.position.set(Math.cos(a) * 0.45, 0.75 + Math.sin(time * 1.7) * 0.06, Math.sin(a) * 0.45);
    model.rotation.set(0.3, -a - Math.PI / 2, 0, 'YXZ');
    model.scale.setScalar(0.7);
    // The wings (second and third child) beat around their roots, slightly raised at rest.
    const [reach, speed] = POLY_MODELS[s.id]?.flap ?? [0, 0];
    const lift = 0.1 + Math.sin(time * speed) * reach;
    if (model.children[1]) model.children[1].rotation.x = -lift;
    if (model.children[2]) model.children[2].rotation.x = lift;
  } else if (s.icon === 'dolphin') {
    const p = (time * 0.45) % 1;
    model.position.set((p - 0.5) * 1.1, Math.sin(p * Math.PI) * 0.55 - 0.15, 0);
    model.rotation.z = Math.cos(p * Math.PI) * 0.9;
    model.scale.setScalar(0.8);
  } else if (s.icon === 'whale') {
    model.position.y = 0.16 + Math.sin(time * 0.6) * 0.07;
    model.rotation.z = Math.sin(time * 0.6 + 1) * 0.15;
  } else {
    model.position.y = 0.04 + Math.sin(time * 1.3) * 0.015;
    model.rotation.x = Math.sin(time * (s.icon === 'penguin' ? 3 : 1.1)) * (s.icon === 'penguin' ? 0.1 : 0.04);
  }
}

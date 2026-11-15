import { BufferAttribute, BufferGeometry, Color, MeshBasicMaterial } from 'three';
import { findTransport, type TransportId, type VehicleKind } from '@antartida/core';
import { HERCULES_FLIGHT_POLY } from './herculesModel.ts';
import { BLACK, CREAM, DECK, HULL_RED, IRIZAR_POLY, LIFEBOAT } from './irizarModel.ts';
import { boxShade, buildPolyGeometry, type Tri } from './lowPoly.ts';
import { PONCHO_MODELS } from './ponchoModels.ts';

/** [centerX, centerY, centerZ, sizeX, sizeY, sizeZ, color]. The bow or nose points to +x, y is up. */
export type Box = readonly [number, number, number, number, number, number, number];

// Approximate liveries, from photos. The models are illustrations, not measured. The red, cream,
// black, deck and lifeboat colors are the Irízar's (irizarModel.ts).
const NAVY_GREY = 0x8e989f;
const LIGHT_GREY = 0xc9d0d4;

/**
 * Least detail of every model of the app (docs/diseno/estilo-voxel.md): enough boxes and colors
 * to tell what it is. A test checks every registered model against it.
 */
export const VOXEL_MIN_BOXES = 12;
export const VOXEL_MIN_COLORS = 2;

/** Vehicles still drawn with blocks. The Hercules and the Irízar are low-poly (herculesModel.ts, irizarModel.ts). */
type BlockVehicleId = Exclude<TransportId, 'hercules' | 'irizar'>;

/** One unit is the length of the vehicle. */
const MODELS: Record<BlockVehicleId, readonly Box[]> = {
  // Poncho's team, his dog and the icebreaker with dogs on board, in ponchoModels.ts.
  ...PONCHO_MODELS,
  poncho: PONCHO_MODELS.poncho,
  // Antarctic service ship: superstructure on the forward third, long low work deck aft, crane.
  'puerto-argentino': [
    [-0.03, 0.025, 0, 0.86, 0.09, 0.2, NAVY_GREY],
    [0.43, 0.03, 0, 0.08, 0.08, 0.14, NAVY_GREY],
    [0.485, 0.04, 0, 0.05, 0.06, 0.07, NAVY_GREY],
    [0.24, 0.115, 0, 0.22, 0.09, 0.17, LIGHT_GREY],
    [0.27, 0.18, 0, 0.14, 0.04, 0.18, LIGHT_GREY],
    [0.28, 0.23, 0, 0.012, 0.07, 0.012, BLACK],
    [0.11, 0.14, 0.05, 0.04, 0.09, 0.035, DECK],
    [0.11, 0.14, -0.05, 0.04, 0.09, 0.035, DECK],
    [-0.02, 0.12, 0.06, 0.025, 0.1, 0.025, DECK],
    [-0.14, 0.175, 0.06, 0.26, 0.015, 0.02, DECK],
    [-0.25, 0.075, 0, 0.4, 0.01, 0.19, DECK],
    // Bridge windows, a lifeboat on each side, cargo on the work deck.
    [0.352, 0.185, 0, 0.006, 0.02, 0.16, BLACK],
    [0.27, 0.185, 0.091, 0.1, 0.018, 0.004, BLACK],
    [0.27, 0.185, -0.091, 0.1, 0.018, 0.004, BLACK],
    [0.2, 0.12, 0.092, 0.07, 0.028, 0.028, LIFEBOAT],
    [0.2, 0.12, -0.092, 0.07, 0.028, 0.028, LIFEBOAT],
    [-0.2, 0.1, -0.03, 0.09, 0.04, 0.07, HULL_RED],
    [-0.34, 0.095, 0.03, 0.07, 0.03, 0.06, CREAM],
  ],
};

/** Flat colors with the shading baked into the vertices: no lights needed. */
export const vehicleMaterial = new MeshBasicMaterial({ vertexColors: true });

/** Face corners of a unit cube (as -1/1 signs) with a flat brightness per face: no lights needed. */
const FACES: readonly { corners: readonly (readonly [number, number, number])[]; shade: number }[] = [
  { corners: [[1, -1, -1], [1, 1, -1], [1, 1, 1], [1, -1, 1]], shade: 0.82 },
  { corners: [[-1, -1, 1], [-1, 1, 1], [-1, 1, -1], [-1, -1, -1]], shade: 0.7 },
  { corners: [[-1, 1, -1], [-1, 1, 1], [1, 1, 1], [1, 1, -1]], shade: 1 },
  { corners: [[-1, -1, 1], [-1, -1, -1], [1, -1, -1], [1, -1, 1]], shade: 0.5 },
  { corners: [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]], shade: 0.9 },
  { corners: [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]], shade: 0.62 },
];

export const VEHICLE_MODELS: Readonly<Record<string, readonly Box[]>> = MODELS;

const POLY_MODELS: Record<Exclude<TransportId, BlockVehicleId>, readonly Tri[]> = { hercules: HERCULES_FLIGHT_POLY, irizar: IRIZAR_POLY };

/** Low-poly vehicles, one unit long like the block ones. */
export const VEHICLE_POLY_MODELS: Readonly<Record<string, readonly Tri[]>> = POLY_MODELS;

const isBlockVehicle = (id: string): id is BlockVehicleId => id in MODELS;

/** Id of the model drawn for a vehicle of a trip: the one the transport names for it, or its own. */
export const vehicleModel = (transport: TransportId, vehicle: VehicleKind): string => findTransport(transport).models?.[vehicle] ?? transport;

/**
 * The vehicle as one geometry, of blocks or low-poly. The low-poly ones take the fixed light per
 * face of the blocks (boxShade), so every vehicle of the voyage is lit alike.
 */
export const buildVehicleGeometry = (id: string) =>
  isBlockVehicle(id) ? buildBoxGeometry(MODELS[id]) : buildPolyGeometry(POLY_MODELS[id as keyof typeof POLY_MODELS], boxShade);

/**
 * Voxel-style model: every box merged into one geometry with vertex colors, so each model is a
 * single draw call and needs no model file.
 */
export function buildBoxGeometry(boxes: readonly Box[]): BufferGeometry {
  const positions = new Float32Array(boxes.length * 6 * 6 * 3);
  const colors = new Float32Array(positions.length);
  const color = new Color();
  let o = 0;
  for (const [cx, cy, cz, sx, sy, sz, hex] of boxes) {
    color.setHex(hex);
    for (const { corners, shade } of FACES) {
      for (const i of [0, 1, 2, 0, 2, 3]) {
        const [x, y, z] = corners[i];
        positions[o] = cx + (x * sx) / 2;
        positions[o + 1] = cy + (y * sy) / 2;
        positions[o + 2] = cz + (z * sz) / 2;
        colors[o] = color.r * shade;
        colors[o + 1] = color.g * shade;
        colors[o + 2] = color.b * shade;
        o += 3;
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  return geometry;
}

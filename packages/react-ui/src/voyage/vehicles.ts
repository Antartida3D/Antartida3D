import { BufferAttribute, BufferGeometry, Color, MeshBasicMaterial } from 'three';
import type { TransportId } from '@antartida/core';
import { HERCULES_FLIGHT_POLY } from './herculesModel.ts';
import { IRIZAR_POLY } from './irizarModel.ts';
import { PUERTO_ARGENTINO_POLY } from './puertoArgentinoModel.ts';
import { boxShade, buildPolyGeometry, type Tri } from './lowPoly.ts';

/** [centerX, centerY, centerZ, sizeX, sizeY, sizeZ, color]. The bow or nose points to +x, y is up. */
export type Box = readonly [number, number, number, number, number, number, number];

/**
 * Least detail of every model of the app (docs/diseno/estilo-voxel.md): enough boxes and colors
 * to tell what it is. A test checks every registered model against it.
 */
export const VOXEL_MIN_BOXES = 12;
export const VOXEL_MIN_COLORS = 2;

/** All transport vehicles are now low-poly (herculesModel.ts, irizarModel.ts, puertoArgentinoModel.ts). */
const MODELS: Record<string, readonly Box[]> = {};

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

const POLY_MODELS: Record<TransportId, readonly Tri[]> = {
  hercules: HERCULES_FLIGHT_POLY,
  irizar: IRIZAR_POLY,
  'puerto-argentino': PUERTO_ARGENTINO_POLY,
};

/** Low-poly vehicles, one unit long like the block ones. */
export const VEHICLE_POLY_MODELS: Readonly<Record<string, readonly Tri[]>> = POLY_MODELS;

/**
 * The vehicle as one geometry, of blocks or low-poly. The low-poly ones take the fixed light per
 * face of the blocks (boxShade), so every vehicle of the voyage is lit alike.
 */
export const buildVehicleGeometry = (id: TransportId) => buildPolyGeometry(POLY_MODELS[id], boxShade);

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

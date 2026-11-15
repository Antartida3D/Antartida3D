import { BufferAttribute, BufferGeometry, Color } from 'three';
import {
  DIORAMA_METERS_PER_UNIT,
  flagClothOffset,
  layoutOf,
  siteElement,
  type OrcadasWind,
} from '@antartida/core';
import { boxShade, buildPolyGeometry, chunk, type Tri } from '../voyage/lowPoly.ts';
import { FLAG_HALF_HEIGHT, FLAG_LENGTH } from './lowPolyBuildings.ts';
import { VOXEL_PALETTE } from './stationModels.ts';

const { ICE, WHITE, ZODIAC_TUBE } = VOXEL_PALETTE;

export interface FlagMeshData {
  readonly geometry: BufferGeometry;
  readonly restPositions: Float32Array;
  readonly baseColors: Float32Array;
  readonly triCount: number;
}

/**
 * Allocates a single continuous `BufferGeometry` for the flag alongside immutable rest vertex
 * positions and unshaded linear RGB colours for fast per-frame cloth wave deformation.
 */
export function prepareFlagMeshData(tris: readonly Tri[]): FlagMeshData {
  const geometry = buildPolyGeometry(tris, boxShade);
  const posAttr = geometry.getAttribute('position') as BufferAttribute;
  const restPositions = new Float32Array(posAttr.array as Float32Array);
  const baseColors = new Float32Array(tris.length * 3);
  const c = new Color();
  for (let i = 0; i < tris.length; i++) {
    c.setHex(tris[i][3]);
    baseColors[i * 3] = c.r;
    baseColors[i * 3 + 1] = c.g;
    baseColors[i * 3 + 2] = c.b;
  }
  return { geometry, restPositions, baseColors, triCount: tris.length };
}

/**
 * Deforms all vertices of the continuous flag mesh in-place with `flagClothOffset` and
 * recomputes per-face `boxShade` vertex colours so cloth ripples catch fixed shading cleanly.
 */
export function deformFlagGeometry(
  data: FlagMeshData,
  wind: OrcadasWind,
  timeSec: number,
  reduced: boolean
): void {
  const posAttr = data.geometry.getAttribute('position') as BufferAttribute;
  const colAttr = data.geometry.getAttribute('color') as BufferAttribute;
  const pos = posAttr.array as Float32Array;
  const col = colAttr.array as Float32Array;
  const { restPositions, baseColors, triCount } = data;

  for (let i = 0; i < triCount; i++) {
    const base9 = i * 9;
    for (let k = 0; k < 3; k++) {
      const idx = base9 + k * 3;
      const rx = restPositions[idx];
      const ry = restPositions[idx + 1];
      const rz = restPositions[idx + 2];
      const { dx, dy, dz } = flagClothOffset(
        wind,
        rx / FLAG_LENGTH,
        ry / FLAG_HALF_HEIGHT,
        timeSec,
        reduced
      );
      pos[idx] = rx + dx;
      pos[idx + 1] = ry + dy;
      pos[idx + 2] = rz + dz;
    }

    const ax = pos[base9];
    const ay = pos[base9 + 1];
    const az = pos[base9 + 2];
    const ux = pos[base9 + 3] - ax;
    const uy = pos[base9 + 4] - ay;
    const uz = pos[base9 + 5] - az;
    const vx = pos[base9 + 6] - ax;
    const vy = pos[base9 + 7] - ay;
    const vz = pos[base9 + 8] - az;
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz);
    const shade = len > 0 ? boxShade([nx / len, ny / len, nz / len]) : 0.85;

    const r = baseColors[i * 3] * shade;
    const g = baseColors[i * 3 + 1] * shade;
    const b = baseColors[i * 3 + 2] * shade;
    for (let k = 0; k < 3; k++) {
      const idx = base9 + k * 3;
      col[idx] = r;
      col[idx + 1] = g;
      col[idx + 2] = b;
    }
  }

  posAttr.needsUpdate = true;
  colAttr.needsUpdate = true;
}

/** Main modern station house in the diorama (10.6 x 10.4 m, gabled roof with exhaust flue). */
export const MAIN_HOUSE_ID = 'module-360745962';

/**
 * Low-poly faceted smoke puff (60 tris, named palette colours) for the main house chimney effect
 * (rule 30.9). Drawn with `buildPolyGeometry(tris, boxShade)` and `vehicleMaterial`.
 */
export function buildSmokePuffTris(): Tri[] {
  return [
    ...chunk(0, 0, 0, 0.96, 0.72, 0.92, 190701, ZODIAC_TUBE),
    ...chunk(0.24, 0.14, -0.14, 0.68, 0.56, 0.66, 190702, ICE),
    ...chunk(-0.22, 0.1, 0.18, 0.64, 0.52, 0.62, 190703, WHITE),
    ...chunk(0.12, -0.14, 0.2, 0.56, 0.46, 0.56, 190704, ZODIAC_TUBE),
    ...chunk(-0.14, 0.24, -0.12, 0.52, 0.44, 0.52, 190705, ICE),
  ];
}

/** World-space origin [x, y, z] at the top of the main house chimney flue. */
export function mainHouseFlueWorldPos(): readonly [number, number, number] {
  const layout = layoutOf(MAIN_HOUSE_ID);
  const el = siteElement(MAIN_HOUSE_ID);
  const [length, width] = layout.footprint;
  const height = el.heightM / DIORAMA_METERS_PER_UNIT;

  // Matches gabled exhaust flue placement in lowPolyBuildings.ts (`buildModuleTris`).
  const localX = -length * 0.2;
  const localZ = -width * 0.24;
  const localY = height - 0.01;

  const cosR = Math.cos(layout.rotationY);
  const sinR = Math.sin(layout.rotationY);
  return [
    layout.position[0] + localX * cosR + localZ * sinR,
    layout.position[1] + localY,
    layout.position[2] - localX * sinR + localZ * cosR,
  ];
}

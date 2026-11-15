import { describe, expect, it } from 'vitest';
import { layoutOf, orcadasWind } from '@antartida/core';
import {
  POLY_MIN_COLORS,
  POLY_MIN_TRIS,
  boxShade,
  buildPolyGeometry,
  type Tri,
  type Vec3,
} from '../src/voyage/lowPoly.ts';
import { buildFlagTris } from '../src/orcadas/lowPolyBuildings.ts';
import { VOXEL_PALETTE } from '../src/orcadas/stationModels.ts';
import {
  MAIN_HOUSE_ID,
  buildSmokePuffTris,
  deformFlagGeometry,
  mainHouseFlueWorldPos,
  prepareFlagMeshData,
} from '../src/orcadas/windGeometry.ts';
import { inward } from './polyHelpers.ts';

function bboxCenter(tris: readonly Tri[]): Vec3 {
  let minX = Infinity,
    minY = Infinity,
    minZ = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity,
    maxZ = -Infinity;
  for (const [a, b, c] of tris) {
    for (const p of [a, b, c]) {
      minX = Math.min(minX, p[0]);
      minY = Math.min(minY, p[1]);
      minZ = Math.min(minZ, p[2]);
      maxX = Math.max(maxX, p[0]);
      maxY = Math.max(maxY, p[1]);
      maxZ = Math.max(maxZ, p[2]);
    }
  }
  return [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2];
}

describe('Orcadas wind and chimney smoke geometry', () => {
  it('buildSmokePuffTris meets low-poly detail, named palette colours, outward winding and builds geometry', () => {
    const tris = buildSmokePuffTris();
    const colors = new Set(tris.map((t) => t[3]));
    expect(tris.length).toBeGreaterThanOrEqual(POLY_MIN_TRIS);
    expect(colors.size).toBeGreaterThanOrEqual(POLY_MIN_COLORS);
    expect(colors.has(VOXEL_PALETTE.ZODIAC_TUBE)).toBe(true);
    expect(colors.has(VOXEL_PALETTE.ICE)).toBe(true);
    expect(colors.has(VOXEL_PALETTE.WHITE)).toBe(true);
    for (const t of tris) {
      expect(t.slice(0, 3).flat().every(Number.isFinite)).toBe(true);
    }
    expect(inward(tris, bboxCenter(tris)) / tris.length).toBeLessThan(0.25);

    const geo = buildPolyGeometry(tris, boxShade);
    expect(geo.getAttribute('position').count).toBe(tris.length * 3);
    geo.dispose();
  });

  it('places the chimney flue top above and inside the main house footprint', () => {
    const [fx, fy, fz] = mainHouseFlueWorldPos();
    const house = layoutOf(MAIN_HOUSE_ID);
    expect(fy).toBeGreaterThan(house.position[1]);
    expect(Math.hypot(fx - house.position[0], fz - house.position[2])).toBeLessThan(
      Math.hypot(house.footprint[0], house.footprint[1]) / 2
    );
  });

  it('deforms the continuous flag mesh smoothly without tearing shared vertices and freezes in reduced mode', () => {
    const data = prepareFlagMeshData(buildFlagTris());
    const strong = orcadasWind(270, 50);

    deformFlagGeometry(data, strong, 1.3, false);
    const pos = data.geometry.getAttribute('position').array as Float32Array;

    // Shared rest vertices across adjacent triangles must stay identical after deformation (zero gaps)
    const restToDeformed = new Map<string, readonly [number, number, number]>();
    for (let i = 0; i < data.restPositions.length; i += 3) {
      const key = `${data.restPositions[i].toFixed(5)},${data.restPositions[i + 1].toFixed(5)},${data.restPositions[i + 2].toFixed(5)}`;
      const cur: readonly [number, number, number] = [pos[i], pos[i + 1], pos[i + 2]];
      const prev = restToDeformed.get(key);
      if (prev) {
        expect(cur[0]).toBeCloseTo(prev[0], 5);
        expect(cur[1]).toBeCloseTo(prev[1], 5);
        expect(cur[2]).toBeCloseTo(prev[2], 5);
      } else {
        restToDeformed.set(key, cur);
      }
    }

    // Reduced motion produces identical geometry regardless of timeSec
    deformFlagGeometry(data, strong, 0.4, true);
    const snapA = Float32Array.from(pos);
    deformFlagGeometry(data, strong, 7.9, true);
    expect(Array.from(pos)).toEqual(Array.from(snapA));

    data.geometry.dispose();
  });
});

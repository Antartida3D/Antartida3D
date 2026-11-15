import { describe, expect, it } from 'vitest';
// Break the pre-existing stationModels <-> sightingModels -> penguins import cycle in test isolation.
import '../src/voyage/sightingModels.ts';
import {
  normalOf,
  POLY_MIN_COLORS,
  POLY_MIN_TRIS,
  RELIEF_ICE,
  RELIEF_ROCK,
  resolveRelief,
  type Tri,
  type Vec3,
} from '../src/voyage/lowPoly.ts';
import { ORCADAS_SITE_PARTS, ORCADAS_SITE_POLY } from '../src/voyage/orcadasSiteModel.ts';
import { buildOrcadasSiteGeometry } from '../src/map3d/OrcadasSite.tsx';
import { VOXEL_PALETTE } from '../src/orcadas/stationModels.ts';
import { inward } from './polyHelpers.ts';

function bboxOf(tris: readonly Tri[]) {
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
  return {
    min: [minX, minY, minZ] as const,
    max: [maxX, maxY, maxZ] as const,
    center: [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2] as Vec3,
  };
}

describe('Orcadas site low-poly map model', () => {
  it('meets triangle budget, color diversity, and finite coordinates', () => {
    expect(ORCADAS_SITE_POLY.length).toBeGreaterThanOrEqual(POLY_MIN_TRIS);
    expect(ORCADAS_SITE_POLY.length).toBeLessThanOrEqual(3000);

    const resolved = resolveRelief(ORCADAS_SITE_POLY);
    expect(new Set(resolved.map((t) => t[3])).size).toBeGreaterThanOrEqual(POLY_MIN_COLORS);
    for (const t of ORCADAS_SITE_POLY) {
      expect(t.slice(0, 3).flat().every(Number.isFinite)).toBe(true);
    }
  });

  it('has width ~ 1 (0.8-1.4) and rests with base at y = 0', () => {
    const box = bboxOf(ORCADAS_SITE_POLY);
    const width = box.max[0] - box.min[0];
    expect(width).toBeGreaterThanOrEqual(0.8);
    expect(width).toBeLessThanOrEqual(1.4);
    expect(box.min[1]).toBeCloseTo(0, 5);
    expect(box.max[1]).toBeLessThan(0.8);
  });

  it('faces outward except ground relief faces', () => {
    // Ground terrain faces are seen from above and must point upward.
    for (const t of ORCADAS_SITE_PARTS.ground) {
      expect(normalOf(t)[1]).toBeGreaterThan(0);
    }

    // Each discrete sub-model faces outward around its own center.
    const parts = [
      ORCADAS_SITE_PARTS.omond,
      ORCADAS_SITE_PARTS.roundModule,
      ORCADAS_SITE_PARTS.gabledModule,
      ORCADAS_SITE_PARTS.tower,
      ORCADAS_SITE_PARTS.flagpole,
      ORCADAS_SITE_PARTS.flag,
      ORCADAS_SITE_PARTS.coastIce,
      ORCADAS_SITE_PARTS.iceberg,
    ];
    for (const part of parts) {
      const box = bboxOf(part);
      expect(inward(part, box.center) / part.length).toBeLessThan(0.5);
    }

    const down = ORCADAS_SITE_POLY.filter((t) => normalOf(t)[1] < -0.9).length;
    expect(down / ORCADAS_SITE_POLY.length).toBeLessThan(0.25);
  });

  it('includes distinctive station features and relief ground colors', () => {
    const colors = new Set(ORCADAS_SITE_POLY.map((t) => t[3]));
    expect(colors.has(VOXEL_PALETTE.ORANGE)).toBe(true);
    expect(colors.has(VOXEL_PALETTE.RED)).toBe(true);
    expect(colors.has(VOXEL_PALETTE.SKY)).toBe(true);
    expect(colors.has(VOXEL_PALETTE.ICE_BLUE)).toBe(true);
    expect(colors.has(RELIEF_ROCK)).toBe(true);
    expect(colors.has(RELIEF_ICE)).toBe(true);
  });

  it('builds a valid low-poly BufferGeometry', () => {
    const geometry = buildOrcadasSiteGeometry();
    const position = geometry.getAttribute('position');
    const color = geometry.getAttribute('color');
    expect(position.count).toBe(ORCADAS_SITE_POLY.length * 3);
    expect(color.count).toBe(ORCADAS_SITE_POLY.length * 3);
    geometry.dispose();
  });
});

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  ANTARCTIC_CLAIMS,
  buildClaimIslandSurface,
  buildClaimSurface,
  buildClaimSectorSurface,
  claimContainsLongitude,
  buildClaimOutline,
  parseTerrainMesh,
  project,
  terrainSurfaceHeight,
  worldHeight,
  type TerrainMesh,
} from '../src/index.ts';

const triangle: TerrainMesh = {
  numVerts: 3, numIndices: 3, gridSize: 21,
  minX: 490, maxX: 510, minY: 480, maxY: 500,
  coordsXY: new Uint16Array([0, 0, 20, 0, 10, 20]),
  heights: new Uint16Array([100, 300, 500]),
  masks: new Uint8Array([1, 1, 1]),
  indices: new Uint32Array([0, 1, 2]),
};

function coverageArea(positions: Float32Array): number {
  let area = 0;
  for (let i = 0; i < positions.length; i += 9) {
    area += Math.abs((positions[i + 3] - positions[i]) * (positions[i + 8] - positions[i + 2]) -
      (positions[i + 5] - positions[i + 2]) * (positions[i + 6] - positions[i])) / 2;
  }
  return area;
}

function claimIds(lon: number): string[] {
  return ANTARCTIC_CLAIMS.filter((c) => claimContainsLongitude(c.sectors, lon)).map((c) => c.id);
}

describe('Antarctic claim definitions', () => {
  it('keeps all seven national positions and their overlapping claims', () => {
    expect(new Set(ANTARCTIC_CLAIMS.map((c) => c.id)).size).toBe(7);
    expect(claimIds(-60)).toEqual(['ar', 'cl', 'gb']);
    expect(claimIds(-85)).toEqual(['cl']);
    expect(claimIds(-30)).toEqual(['ar', 'gb']);
    expect(claimIds(-10)).toEqual(['no']);
  });

  it('keeps Adélie separate from both Australian sectors', () => {
    expect(claimIds(120)).toEqual(['au']);
    expect(claimIds(139)).toEqual(['fr']);
    expect(claimIds(150)).toEqual(['au']);
    expect(ANTARCTIC_CLAIMS.find((c) => c.id === 'au')?.sectors).toHaveLength(2);
  });

  it('wraps Ross across the antimeridian and leaves the unclaimed Pacific sector empty', () => {
    expect(claimIds(160)).toEqual(['au', 'nz']); // A shared meridian has no area.
    for (const lon of [160.001, 179, 180, -179, -150, 210]) expect(claimIds(lon)).toEqual(['nz']);
    for (const lon of [-149, -130, -100]) expect(claimIds(lon)).toEqual([]);
  });

  it('records Peter I separately, with provenance for every claim', () => {
    const norway = ANTARCTIC_CLAIMS.find((c) => c.id === 'no')!;
    expect(norway.islands).toHaveLength(1);
    expect(claimContainsLongitude(norway.sectors, norway.islands[0].lon)).toBe(false);
    for (const claim of ANTARCTIC_CLAIMS) {
      expect(claim.source.url).toMatch(/^https:\/\//);
      expect(claim.source.organization.length).toBeGreaterThan(5);
      expect(claim.source.consulted).toBe('2026-11-14');
    }
  });
});

describe('claim surface clipping', () => {
  it('clips at the actual meridian and interpolates the original sloping elevation', () => {
    const surface = buildClaimSurface(triangle, [{ west: 0, east: 45 }], 0.75);
    expect(coverageArea(surface.positions)).toBeCloseTo(100);
    for (let i = 0; i < surface.positions.length; i += 3) {
      const [x, height, z] = surface.positions.slice(i, i + 3);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(z).toBeLessThanOrEqual(-x + 1e-6);
      expect(height).toBeCloseTo(worldHeight(500 + 10 * x + 15 * z) + 0.75, 5);
    }
    expect(surface.outline.length).toBeGreaterThan(0);
    for (let i = 0; i < surface.outline.length; i += 3) expect(surface.outline[i]).toBeCloseTo(0);
  });

  it('clips both meridians and preserves the antimeridian side of the pole', () => {
    const backside = { ...triangle, minY: 500, maxY: 520, coordsXY: new Uint16Array([0, 20, 20, 20, 10, 0]) };
    const surface = buildClaimSurface(backside, [{ west: 160, east: 210 }]);
    expect(coverageArea(surface.positions)).toBeGreaterThan(0);
    for (let i = 0; i < surface.positions.length; i += 3) {
      const x = surface.positions[i], z = surface.positions[i + 2];
      expect(z).toBeGreaterThanOrEqual(0);
      if (Math.hypot(x, z) < 1e-6) continue;
      const lon = Math.atan2(x, -z) * 180 / Math.PI;
      expect(lon >= 160 - 1e-5 || lon <= -150 + 1e-5).toBe(true);
    }
  });

  it('does not fill open water and retains the existing ice shelf surface', () => {
    const sectors = [{ west: -45, east: 45 }];
    expect(buildClaimSurface({ ...triangle, masks: new Uint8Array(3) }, sectors).positions).toHaveLength(0);
    expect(coverageArea(buildClaimSurface({ ...triangle, masks: new Uint8Array([3, 3, 3]) }, sectors).positions)).toBeCloseTo(200);
    expect(buildClaimSurface(triangle, []).positions).toHaveLength(0);
  });

  it('rejects a sector that cannot be represented by the two half planes', () => {
    expect(() => buildClaimSurface(triangle, [{ west: -180, east: 180 }])).toThrow(RangeError);
    expect(() => buildClaimSurface(triangle, [{ west: 45, east: 0 }])).toThrow(RangeError);
  });
});

describe('claim surface boundaries', () => {
  it('keeps only the outer edges at their original elevations', () => {
    const positions = new Float32Array([
      -1, 0, -1, 1, 2, -1, 1, 4, 1,
      -1, 0, -1, 1, 4, 1, -1, 2, 1,
    ]);
    const outline = buildClaimOutline(positions);
    expect(outline.length).toBe(4 * 6);
    for (let i = 0; i < outline.length; i += 6) {
      const [ax, ay, az, bx, by, bz] = outline.slice(i, i + 6);
      expect(ax === bx || az === bz).toBe(true); // No internal diagonal.
      expect(ay).toBeCloseTo(ax + az + 2);
      expect(by).toBeCloseTo(bx + bz + 2);
    }
    expect(positions[1]).toBe(0);
  });

  it('keeps an empty surface boundary empty', () => {
    expect(buildClaimOutline(new Float32Array())).toHaveLength(0);
  });
});

describe('complete sectors over the sea', () => {
  it('reaches 60° S independently of the terrain rectangle, with no gaps within each sector', () => {
    const radius = Math.hypot(project(0, -60).x - 500, project(0, -60).y - 500);
    for (const claim of ANTARCTIC_CLAIMS) {
      const surface = buildClaimSectorSurface(claim.sectors, .5);
      const expected = claim.sectors.reduce((sum, sector) => sum + .5 * radius ** 2 * (sector.east - sector.west) * Math.PI / 180, 0);
      expect(coverageArea(surface.positions) / expected).toBeCloseTo(1, 4);
      for (let i = 0; i < surface.positions.length; i += 9) {
        expect(Array.from(surface.positions.slice(i, i + 3))).toEqual([0, .5, 0]);
        for (const vertex of [i + 3, i + 6]) {
          const x = surface.positions[vertex], z = surface.positions[vertex + 2];
          expect(Math.hypot(x, z)).toBeCloseTo(radius, 3);
          const longitude = Math.atan2(x, -z) * 180 / Math.PI;
          // Floating point geometry can move exact boundary longitudes a few millionths of a degree.
          expect(claimContainsLongitude(claim.sectors.map((s) => ({ west: s.west - .00001, east: s.east + .00001 })), longitude)).toBe(true);
        }
      }
      const triangleCount = surface.positions.length / 9;
      expect(surface.outline.length / 6).toBe(triangleCount + 2 * claim.sectors.length);
    }
  });

  it('preserves the Australian Adélie gap and the Ross antimeridian, without adding a Peter I sector', () => {
    const australia = ANTARCTIC_CLAIMS.find((c) => c.id === 'au')!;
    const ross = buildClaimSectorSurface([{ west: 160, east: 210 }]);
    expect(buildClaimSectorSurface(australia.sectors).positions.length / 9).toBe((91 + 18) * 2);
    for (let i = 0; i < ross.positions.length; i += 3) expect(ross.positions[i + 2]).toBeGreaterThanOrEqual(0);
    const norway = ANTARCTIC_CLAIMS.find((c) => c.id === 'no')!;
    expect(norway.sectors).toHaveLength(1);
    expect(claimContainsLongitude(norway.sectors, norway.islands[0].lon)).toBe(false);
  });

  it('rejects invalid longitudes and leaves empty input empty', () => {
    expect(buildClaimSectorSurface([]).positions).toHaveLength(0);
    for (const sector of [{ west: NaN, east: 40 }, { west: 40, east: Infinity }, { west: 50, east: 40 }, { west: 0, east: 180 }]) {
      expect(() => buildClaimSectorSurface([sector])).toThrow(RangeError);
    }
  });
});

describe('terrain surface anchors', () => {
  it('samples the actual triangle independently of the bilinear elevation grid', () => {
    const mesh = { ...triangle, elevationGrid: new Uint16Array([999, 999, 999, 999]), elevationGridSize: 2 };
    expect(terrainSurfaceHeight(mesh, 500, 490)).toBeCloseTo(worldHeight(350));
    expect(terrainSurfaceHeight(mesh, 500, 500)).toBeCloseTo(worldHeight(500));
    expect(terrainSurfaceHeight(mesh, 509, 499)).toBeNull();
    expect(terrainSurfaceHeight(mesh, 489, 490)).toBeNull();
    expect(terrainSurfaceHeight({ ...mesh, masks: new Uint8Array(3) }, 500, 490)).toBeNull();
  });

  for (const level of ['hi', 'lo']) {
    const raw = readFileSync(new URL(`../src/assets/terrain-mesh-${level}.bin`, import.meta.url));
    const mesh = parseTerrainMesh(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));

    it(`places every illustrative flag on existing ${level} terrain`, () => {
      for (const claim of ANTARCTIC_CLAIMS) {
        for (const anchor of [...claim.sectors.map((s) => s.flag), ...claim.islands]) {
          const p = project(anchor.lon, anchor.lat);
          expect(terrainSurfaceHeight(mesh, p.x, p.y), `${claim.id} ${anchor.lon},${anchor.lat}`).not.toBeNull();
        }
      }
    });

    it(`extracts only the existing Peter I island in the ${level} terrain`, () => {
      const island = ANTARCTIC_CLAIMS.find((c) => c.id === 'no')!.islands[0];
      const anchor = project(island.lon, island.lat);
      const surface = buildClaimIslandSurface(mesh, island, 0.5);
      expect(surface.positions.length).toBeGreaterThan(0);
      expect(surface.outline.length).toBeGreaterThan(0);
      for (let i = 0; i < surface.positions.length; i += 3) {
        expect(Math.hypot(surface.positions[i] + 500 - anchor.x, surface.positions[i + 2] + 500 - anchor.y)).toBeLessThan(2);
        expect(surface.positions[i + 1]).toBeGreaterThanOrEqual(0.5);
      }
      expect(coverageArea(surface.positions)).toBeGreaterThan(0);
      expect(coverageArea(surface.positions)).toBeLessThan(8);
    });
  }
});

import type { ClaimIsland, ClaimSector } from './content/claims.ts';
import { project } from './projection.ts';
import { worldHeight } from './relief.ts';
import type { TerrainMesh } from './terrain.ts';

/** Unindexed triangles and line segments in scene coordinates (x, elevation, z). */
export interface ClaimSurface {
  positions: Float32Array;
  outline: Float32Array;
}

/** Exterior triangle edges only: shared triangulation edges are not country borders. */
export function buildClaimOutline(positions: Float32Array): Float32Array {
  const edges = new Map<string, { a: number; b: number; count: number }>();
  const keyAt = (i: number) => `${Math.round(positions[i] * 1e6)},${Math.round(positions[i + 2] * 1e6)}`;
  for (let i = 0; i < positions.length; i += 9) {
    const ids = [i, i + 3, i + 6];
    const keys = ids.map(keyAt);
    for (let e = 0; e < 3; e++) {
      const next = (e + 1) % 3;
      if (keys[e] === keys[next]) continue;
      const key = keys[e] < keys[next] ? `${keys[e]}:${keys[next]}` : `${keys[next]}:${keys[e]}`;
      const edge = edges.get(key);
      if (edge) edge.count++;
      else edges.set(key, { a: ids[e], b: ids[next], count: 1 });
    }
  }
  const outline: number[] = [];
  for (const { a, b, count } of edges.values()) {
    if (count === 1) outline.push(positions[a], positions[a + 1], positions[a + 2], positions[b], positions[b + 1], positions[b + 2]);
  }
  return new Float32Array(outline);
}

type Vertex = readonly [number, number, number];
type Plane = readonly [number, number];
const EPSILON = 1e-7;
const RAD = Math.PI / 180;

/**
 * A complete geographic reference sector, including open water, clipped at 60° S.
 * This display cutoff is not a maritime boundary or a national northern limit.
 * Independent of the land mesh's smaller rectangular extent.
 */
export function buildClaimSectorSurface(sectors: readonly Pick<ClaimSector, 'west' | 'east'>[], lift = 0): ClaimSurface {
  const positions: number[] = [];
  for (const { west, east } of sectors) {
    if (!Number.isFinite(west) || !Number.isFinite(east) || east <= west || east - west >= 180) {
      throw new RangeError('Claim sectors must span between 0 and 180 degrees.');
    }
    const steps = Math.ceil((east - west) * 2);
    for (let i = 0; i < steps; i++) {
      const a = project(west + (east - west) * i / steps, -60);
      const b = project(west + (east - west) * (i + 1) / steps, -60);
      positions.push(0, lift, 0, a.x - 500, lift, a.y - 500, b.x - 500, lift, b.y - 500);
    }
  }
  const surface = new Float32Array(positions);
  return { positions: surface, outline: buildClaimOutline(surface) };
}

/** Inclusive meridians: overlapping countries deliberately remain separate claims. */
export function claimContainsLongitude(sectors: readonly Pick<ClaimSector, 'west' | 'east'>[], lon: number): boolean {
  return sectors.some(({ west, east }) => {
    const offset = ((lon - west) % 360 + 360) % 360;
    return offset <= east - west + EPSILON;
  });
}

function vertexAt(mesh: TerrainMesh, index: number, lift = 0): Vertex {
  const size = mesh.gridSize - 1;
  return [
    mesh.minX + mesh.coordsXY[index * 2] / size * (mesh.maxX - mesh.minX) - 500,
    worldHeight(mesh.heights[index]) + lift,
    mesh.minY + mesh.coordsXY[index * 2 + 1] / size * (mesh.maxY - mesh.minY) - 500,
  ];
}

function signedDistance(vertex: Vertex, plane: Plane): number {
  return vertex[0] * plane[0] + vertex[2] * plane[1];
}

/** Sutherland–Hodgman clipping preserves the original triangle's elevation plane. */
function clipToPlane(polygon: readonly Vertex[], plane: Plane): Vertex[] {
  const clipped: Vertex[] = [];
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const da = signedDistance(a, plane), db = signedDistance(b, plane);
    const aInside = da >= -EPSILON, bInside = db >= -EPSILON;
    if (aInside) clipped.push(a);
    if (aInside !== bInside) {
      const ratio = da / (da - db);
      clipped.push([
        a[0] + (b[0] - a[0]) * ratio,
        a[1] + (b[1] - a[1]) * ratio,
        a[2] + (b[2] - a[2]) * ratio,
      ]);
    }
  }
  return clipped;
}

function appendTriangles(polygon: readonly Vertex[], positions: number[]): void {
  for (let i = 1; i < polygon.length - 1; i++) {
    const a = polygon[0], b = polygon[i], c = polygon[i + 1];
    if (Math.abs((b[0] - a[0]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[0] - a[0])) < EPSILON) continue;
    positions.push(...a, ...b, ...c);
  }
}

/**
 * Clip the rendered terrain, including ice shelves, to national meridians.
 * All-water triangles are excluded; mixed coastal triangles match the terrain's coast.
 * This is cartographic surface coverage, not a maritime boundary or a legal coastline.
 */
export function buildClaimSurface(mesh: TerrainMesh, sectors: readonly Pick<ClaimSector, 'west' | 'east'>[], lift = 0): ClaimSurface {
  const positions: number[] = [], outline: number[] = [];
  const seenEdges = new Set<string>();
  const vertices = new Float64Array(mesh.numVerts * 3);
  for (let i = 0; i < mesh.numVerts; i++) vertices.set(vertexAt(mesh, i, lift), i * 3);
  const vertex = (i: number): Vertex => [vertices[i * 3], vertices[i * 3 + 1], vertices[i * 3 + 2]];
  for (const { west, east } of sectors) {
    if (east <= west || east - west >= 180) throw new RangeError('Claim sectors must span between 0 and 180 degrees.');
    const planes: readonly Plane[] = [
      [Math.cos(west * RAD), Math.sin(west * RAD)],
      [-Math.cos(east * RAD), -Math.sin(east * RAD)],
    ];
    const distances = planes.map((p) => {
      const values = new Float64Array(mesh.numVerts);
      for (let i = 0; i < mesh.numVerts; i++) values[i] = vertices[i * 3] * p[0] + vertices[i * 3 + 2] * p[1];
      return values;
    });
    for (let t = 0; t < mesh.indices.length; t += 3) {
      const a = mesh.indices[t], b = mesh.indices[t + 1], c = mesh.indices[t + 2];
      if (mesh.masks[a] === 0 && mesh.masks[b] === 0 && mesh.masks[c] === 0) continue;
      // Most triangles are wholly outside or inside: avoid allocating clipped polygons for them.
      if (distances.some((d) => Math.max(d[a], d[b], d[c]) < -EPSILON)) continue;
      if (distances.every((d) => Math.min(d[a], d[b], d[c]) > EPSILON)) {
        positions.push(...vertex(a), ...vertex(b), ...vertex(c));
        continue;
      }
      let polygon = [vertex(a), vertex(b), vertex(c)];
      for (const plane of planes) {
        polygon = clipToPlane(polygon, plane);
        if (polygon.length < 3) break;
      }
      if (polygon.length < 3) continue;
      appendTriangles(polygon, positions);
      for (let i = 0; i < polygon.length; i++) {
        const start = polygon[i], end = polygon[(i + 1) % polygon.length];
        if (Math.hypot(start[0] - end[0], start[2] - end[2]) < EPSILON) continue;
        if (!planes.some((p) => Math.abs(signedDistance(start, p)) < EPSILON && Math.abs(signedDistance(end, p)) < EPSILON)) continue;
        const ids = [start, end].map((v) => `${v[0].toFixed(6)},${v[2].toFixed(6)}`).sort();
        const key = ids.join(':');
        if (seenEdges.has(key)) continue;
        seenEdges.add(key);
        outline.push(...start, ...end);
      }
    }
  }
  return { positions: new Float32Array(positions), outline: new Float32Array(outline) };
}

/**
 * Extract the small, separate island already resolved by the terrain data.
 * The search radius identifies its nearby land triangles; it is never drawn as a circle.
 * Peter I is the only island claim and its mesh fits within two map units of its anchor.
 */
export function buildClaimIslandSurface(mesh: TerrainMesh, island: Pick<ClaimIsland, 'lon' | 'lat'>, lift = 0): ClaimSurface {
  const anchor = project(island.lon, island.lat);
  const positions: number[] = [], outline: number[] = [];
  const edges = new Map<string, { a: number; b: number; count: number }>();
  const nearby = new Uint8Array(mesh.numVerts);
  for (let i = 0; i < mesh.numVerts; i++) {
    if (mesh.masks[i] === 0) continue;
    const vertex = vertexAt(mesh, i);
    if (Math.hypot(vertex[0] + 500 - anchor.x, vertex[2] + 500 - anchor.y) < 8) nearby[i] = 1;
  }
  for (let t = 0; t < mesh.indices.length; t += 3) {
    const ids = [mesh.indices[t], mesh.indices[t + 1], mesh.indices[t + 2]];
    if (!ids.some((i) => nearby[i])) continue;
    appendTriangles(ids.map((i) => vertexAt(mesh, i, lift)), positions);
    for (let i = 0; i < 3; i++) {
      const a = ids[i], b = ids[(i + 1) % 3];
      const key = `${Math.min(a, b)}:${Math.max(a, b)}`;
      const edge = edges.get(key);
      if (edge) edge.count++;
      else edges.set(key, { a, b, count: 1 });
    }
  }
  for (const { a, b, count } of edges.values()) {
    if (count === 1) outline.push(...vertexAt(mesh, a, lift), ...vertexAt(mesh, b, lift));
  }
  return { positions: new Float32Array(positions), outline: new Float32Array(outline) };
}

/** Sample the rendered triangle, rather than the separate bilinear elevation grid. */
export function terrainSurfaceHeight(mesh: TerrainMesh, mapX: number, mapY: number): number | null {
  if (mapX < mesh.minX || mapX > mesh.maxX || mapY < mesh.minY || mapY > mesh.maxY) return null;
  const x = (mapX - mesh.minX) / (mesh.maxX - mesh.minX) * (mesh.gridSize - 1);
  const y = (mapY - mesh.minY) / (mesh.maxY - mesh.minY) * (mesh.gridSize - 1);
  const xy = mesh.coordsXY;
  for (let t = 0; t < mesh.indices.length; t += 3) {
    const a = mesh.indices[t], b = mesh.indices[t + 1], c = mesh.indices[t + 2];
    if (mesh.masks[a] === 0 && mesh.masks[b] === 0 && mesh.masks[c] === 0) continue;
    const ax = xy[a * 2], ay = xy[a * 2 + 1];
    const bx = xy[b * 2], by = xy[b * 2 + 1];
    const cx = xy[c * 2], cy = xy[c * 2 + 1];
    if (x < Math.min(ax, bx, cx) || x > Math.max(ax, bx, cx) || y < Math.min(ay, by, cy) || y > Math.max(ay, by, cy)) continue;
    const determinant = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
    if (determinant === 0) continue;
    const u = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / determinant;
    const v = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / determinant;
    const w = 1 - u - v;
    if (Math.min(u, v, w) < -EPSILON) continue;
    return worldHeight(u * mesh.heights[a] + v * mesh.heights[b] + w * mesh.heights[c]);
  }
  return null;
}

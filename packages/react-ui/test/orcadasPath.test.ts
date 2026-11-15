import { describe, expect, it } from 'vitest';
import { normalOf, type Tri, type Vec3 } from '../src/voyage/lowPoly.ts';
import { buildStageDetailTris, buildStationPath, evaluateIsthmusTerrain } from '../src/orcadas/stationModels.ts';

const EPS = 1e-6;
const GROUND_EPS = 0.02;

function sameVertex(a: Vec3, b: Vec3, eps = EPS): boolean {
  return Math.abs(a[0] - b[0]) <= eps && Math.abs(a[1] - b[1]) <= eps && Math.abs(a[2] - b[2]) <= eps;
}

function sharedVertexCount(a: readonly Tri[], b: readonly Tri[], eps = EPS): number {
  const vertsB = b.flatMap((t) => [t[0], t[1], t[2]]);
  let count = 0;
  const seen: Vec3[] = [];
  for (const t of a) {
    for (const v of [t[0], t[1], t[2]]) {
      if (seen.some((s) => sameVertex(s, v, eps))) continue;
      if (vertsB.some((vb) => sameVertex(v, vb, eps))) {
        seen.push(v);
        count++;
      }
    }
  }
  return count;
}

function triSharedEdgeCount(a: Tri, b: Tri, eps = EPS): number {
  const va = [a[0], a[1], a[2]];
  const vb = [b[0], b[1], b[2]];
  let shared = 0;
  for (const p of va) {
    if (vb.some((q) => sameVertex(p, q, eps))) shared++;
  }
  return shared;
}

function crossLength([a, b, c]: Tri): number {
  const ux = b[0] - a[0];
  const uy = b[1] - a[1];
  const uz = b[2] - a[2];
  const vx = c[0] - a[0];
  const vy = c[1] - a[1];
  const vz = c[2] - a[2];
  const nx = uy * vz - uz * vy;
  const ny = uz * vx - ux * vz;
  const nz = ux * vy - uy * vx;
  return Math.hypot(nx, ny, nz);
}

describe('Orcadas station gravel path', () => {
  const path = buildStationPath();

  it('forms one continuous connected mesh with shared edges between consecutive segments and spurs', () => {
    expect(path.mainSegments.length).toBeGreaterThan(10);
    expect(path.spurSegments).toHaveLength(4);

    // Each main segment shares its full 3-vertex cross-section border with the next segment.
    for (let i = 0; i < path.mainSegments.length - 1; i++) {
      expect(sharedVertexCount(path.mainSegments[i], path.mainSegments[i + 1])).toBe(3);
    }

    // Each spur attaches directly to a main segment border and continues without gaps.
    for (const spur of path.spurSegments) {
      expect(spur.length).toBeGreaterThanOrEqual(1);
      const attached = path.mainSegments.some((seg) => sharedVertexCount(seg, spur[0]) >= 2);
      expect(attached).toBe(true);
      for (let i = 0; i < spur.length - 1; i++) {
        expect(sharedVertexCount(spur[i], spur[i + 1])).toBe(3);
      }
    }

    // Every triangle in the path belongs to one single edge-connected component.
    const n = path.tris.length;
    const visited = new Uint8Array(n);
    const queue = [0];
    visited[0] = 1;
    let count = 0;
    while (queue.length > 0) {
      const idx = queue.pop()!;
      count++;
      for (let j = 0; j < n; j++) {
        if (visited[j]) continue;
        if (triSharedEdgeCount(path.tris[idx], path.tris[j]) >= 2) {
          visited[j] = 1;
          queue.push(j);
        }
      }
    }
    expect(count).toBe(n);

    // Color varies per segment, not per individual triangle.
    for (const seg of [...path.mainSegments, ...path.spurSegments.flat()]) {
      expect(new Set(seg.map((t) => t[3])).size).toBe(1);
    }
  });

  it('seats every vertex tightly on the terrain height without floating or sinking', () => {
    for (const t of path.tris) {
      for (const v of [t[0], t[1], t[2]]) {
        const groundY = evaluateIsthmusTerrain(v[0], v[2]).y;
        expect(v[1]).toBeGreaterThanOrEqual(groundY);
        expect(Math.abs(v[1] - groundY)).toBeLessThan(GROUND_EPS);
      }
    }
  });

  it('contains no degenerate triangles and no downward-facing normals', () => {
    expect(path.tris.length).toBeGreaterThan(40);
    for (const t of path.tris) {
      expect(t.slice(0, 3).flat().every(Number.isFinite)).toBe(true);
      expect(crossLength(t)).toBeGreaterThan(1e-5);
      expect(normalOf(t)[1]).toBeGreaterThan(0.5);
    }

    // Integrated stage details include the path and stay within the triangle budget.
    expect(buildStageDetailTris().length).toBeLessThanOrEqual(6000);
  });
});

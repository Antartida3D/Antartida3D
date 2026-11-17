/**
 * Generates crisp cartographic elevation contour SVG paths (in the 0..1000 map space) from
 * Bedmap3 elevations stored in `src/assets/terrain-mesh-lo.bin`.
 * Run with `pnpm --filter @antartida/core relief-svg`. Output (`src/relief-contours.ts`) is committed.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const meshPath = join(here, '../src/assets/terrain-mesh-lo.bin');
const outPath = join(here, '../src/relief-contours.ts');

const LEVELS_M = [500, 1200, 2000, 2800, 3500] as const;

const buf = readFileSync(meshPath);
const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
const nv = view.getUint32(4, true);
const ni = view.getUint32(8, true);
const minX = view.getFloat32(16, true);
const maxX = view.getFloat32(20, true);
const minY = view.getFloat32(24, true);
const maxY = view.getFloat32(28, true);
let off = 32 + nv * 7;
off += (4 - (off % 4)) % 4 + ni * 4;
const N = view.getUint32(off, true);
off += 4;
const elev = new Uint16Array(buf.buffer.slice(buf.byteOffset + off, buf.byteOffset + off + N * N * 2));

// Downsample 1025 -> 257 with gentle Gaussian smoothing so vector contours stay smooth and compact.
const S = 257;
const grid = new Float32Array(S * S);
for (let r = 0; r < S; r++) {
  for (let c = 0; c < S; c++) {
    const gr = Math.min(N - 1, r * 4);
    const gc = Math.min(N - 1, c * 4);
    let sum = 0;
    let wsum = 0;
    for (let dr = -2; dr <= 2; dr++) {
      for (let dc = -2; dc <= 2; dc++) {
        const rr = gr + dr;
        const cc = gc + dc;
        if (rr >= 0 && rr < N && cc >= 0 && cc < N) {
          const w = Math.exp(-(dr * dr + dc * dc) / 2.2);
          sum += elev[rr * N + cc]! * w;
          wsum += w;
        }
      }
    }
    grid[r * S + c] = sum / wsum;
  }
}

type Pt = [number, number];

function dp(pts: Pt[], tol: number): Pt[] {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack: [number, number][] = [[0, pts.length - 1]];
  while (stack.length > 0) {
    const [a, b] = stack.pop()!;
    const [ax, ay] = pts[a]!;
    const [bx, by] = pts[b]!;
    const len = Math.hypot(bx - ax, by - ay) || 1;
    let maxDist = 0;
    let idx = -1;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = pts[i]!;
      const d = Math.abs((bx - ax) * (ay - py) - (ax - px) * (by - ay)) / len;
      if (d > maxDist) {
        maxDist = d;
        idx = i;
      }
    }
    if (idx > 0 && maxDist > tol) {
      keep[idx] = 1;
      stack.push([a, idx], [idx, b]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}

function simplify(pts: Pt[], tol: number): Pt[] {
  const closed = Math.hypot(pts[0]![0] - pts[pts.length - 1]![0], pts[0]![1] - pts[pts.length - 1]![1]) < 1.5;
  if (!closed || pts.length < 6) return dp(pts, tol);
  const mid = Math.floor(pts.length / 2);
  return [...dp(pts.slice(0, mid + 1), tol), ...dp(pts.slice(mid), tol).slice(1)];
}

function extractContours(threshold: number): string {
  const segs: [Pt, Pt][] = [];
  const toMapX = (c: number) => minX + (c / (S - 1)) * (maxX - minX);
  const toMapY = (r: number) => minY + (r / (S - 1)) * (maxY - minY);
  const interp = (v0: number, v1: number) => {
    const d = v1 - v0;
    return Math.abs(d) < 1e-6 ? 0.5 : (threshold - v0) / d;
  };

  for (let r = 0; r < S - 1; r++) {
    for (let c = 0; c < S - 1; c++) {
      const v0 = grid[r * S + c]!;
      const v1 = grid[r * S + c + 1]!;
      const v2 = grid[(r + 1) * S + c + 1]!;
      const v3 = grid[(r + 1) * S + c]!;
      const mask =
        (v0 >= threshold ? 8 : 0) |
        (v1 >= threshold ? 4 : 0) |
        (v2 >= threshold ? 2 : 0) |
        (v3 >= threshold ? 1 : 0);
      if (mask === 0 || mask === 15) continue;
      const top: Pt = [toMapX(c + interp(v0, v1)), toMapY(r)];
      const right: Pt = [toMapX(c + 1), toMapY(r + interp(v1, v2))];
      const bottom: Pt = [toMapX(c + interp(v3, v2)), toMapY(r + 1)];
      const left: Pt = [toMapX(c), toMapY(r + interp(v0, v3))];
      const table: Record<number, [Pt, Pt][]> = {
        1: [[left, bottom]],
        2: [[bottom, right]],
        3: [[left, right]],
        4: [[top, right]],
        5: [[left, top], [bottom, right]],
        6: [[top, bottom]],
        7: [[left, top]],
        8: [[top, left]],
        9: [[top, bottom]],
        10: [[top, right], [left, bottom]],
        11: [[top, right]],
        12: [[right, left]],
        13: [[right, bottom]],
        14: [[bottom, left]],
      };
      for (const seg of table[mask] ?? []) segs.push(seg);
    }
  }

  const key = ([x, y]: Pt) => `${Math.round(x * 100)},${Math.round(y * 100)}`;
  const adj = new Map<string, { i: number; pt: Pt }[]>();
  for (let i = 0; i < segs.length; i++) {
    const [a, b] = segs[i]!;
    const ka = key(a);
    const kb = key(b);
    if (!adj.has(ka)) adj.set(ka, []);
    if (!adj.has(kb)) adj.set(kb, []);
    adj.get(ka)!.push({ i, pt: b });
    adj.get(kb)!.push({ i, pt: a });
  }

  const used = new Uint8Array(segs.length);
  const paths: Pt[][] = [];
  for (let i = 0; i < segs.length; i++) {
    if (used[i]) continue;
    used[i] = 1;
    const chain: Pt[] = [segs[i]![0], segs[i]![1]];
    while (true) {
      const next = (adj.get(key(chain[chain.length - 1]!)) ?? []).find((e) => !used[e.i]);
      if (!next) break;
      used[next.i] = 1;
      chain.push(next.pt);
    }
    while (true) {
      const prev = (adj.get(key(chain[0]!)) ?? []).find((e) => !used[e.i]);
      if (!prev) break;
      used[prev.i] = 1;
      chain.unshift(prev.pt);
    }
    if (chain.length >= 6) paths.push(chain);
  }

  return paths
    .map((p) => simplify(p, 0.7))
    .filter((p) => p.length >= 5)
    .map((p) => {
      const closed = Math.hypot(p[0]![0] - p[p.length - 1]![0], p[0]![1] - p[p.length - 1]![1]) < 1.5;
      const body = p.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join('L').replace(/\.0(?=[,L]|$)/g, '');
      return `M${body}${closed ? 'Z' : ''}`;
    })
    .join('');
}

const bands = LEVELS_M.map((elevationM) => ({
  elevationM,
  path: extractContours(elevationM),
}));

const out = `// Generated by scripts/build-relief-svg.ts from Bedmap3 elevations in terrain-mesh-lo.bin. Do not edit.
export interface ReliefContourBand {
  readonly elevationM: number;
  readonly path: string;
}

export const RELIEF_CONTOURS: readonly ReliefContourBand[] = ${JSON.stringify(bands, null, 2)};
`;

writeFileSync(outPath, out);
console.log(
  `relief-contours.ts: ${bands.map((b) => `${b.elevationM}m=${b.path.length}B`).join(', ')} (total ${Buffer.byteLength(out)} B)`
);

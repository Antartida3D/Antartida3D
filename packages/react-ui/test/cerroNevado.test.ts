import { describe, expect, it } from 'vitest';
import { CERRO_NEVADO_SPOTS } from '@antartida/core';
import { POLY_MIN_COLORS, POLY_MIN_TRIS, normalOf } from '../src/voyage/lowPoly.ts';
import {
  buildColonyStageTris,
  buildFloeChickTris,
  FAST_ICE_TOP,
  fastIceEdge,
  FLOE_CHICK,
  PACK_FLOES,
  SNOWMOBILE_TRIS,
  SPOT_VIEWS,
  WAVE,
  WAVER,
} from '../src/cerronevado/colonyScene.ts';
import { poseOf } from '../src/scenepoint/sceneView.ts';

describe('scene of the emperor colony of Cerro Nevado (#206)', () => {
  it('builds a stage of finite faces, and the snowmobile has the least detail', () => {
    const tris = buildColonyStageTris();
    expect(tris.length).toBeGreaterThan(1000);
    for (const t of tris) expect(t.slice(0, 3).flat().every(Number.isFinite)).toBe(true);
    expect(SNOWMOBILE_TRIS.length).toBeGreaterThanOrEqual(POLY_MIN_TRIS);
    expect(new Set(SNOWMOBILE_TRIS.map((t) => t[3])).size).toBeGreaterThanOrEqual(POLY_MIN_COLORS);
  });

  it('keeps the fast ice flat: almost no face of its top leans', () => {
    // Large faces at the height of the ice: its top, not the feet of the birds or the skirts of the tents.
    const area = ([a, b, c]: (typeof tris)[number]) => {
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      return Math.hypot(u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]) / 2;
    };
    const tris = buildColonyStageTris();
    const top = tris.filter((t) => area(t) > 0.5 && [t[0], t[1], t[2]].every((v) => Math.abs(v[1] - FAST_ICE_TOP) < 0.05));
    expect(top.length).toBeGreaterThan(500);
    const leaning = top.filter((t) => normalOf(t)[1] < 0.99).length;
    expect(leaning / top.length).toBeLessThan(0.05);
  });

  it('puts the waving emperor on the fast ice, near its edge, and its flipper at its shoulder', () => {
    expect(WAVER.z).toBeLessThan(fastIceEdge(WAVER.x));
    expect(WAVER.z).toBeGreaterThan(fastIceEdge(WAVER.x) - 4);
    const [x, y, z] = WAVE.shoulder;
    expect(Math.hypot(x - WAVER.x, z - WAVER.z)).toBeLessThan(0.4);
    expect(y).toBeGreaterThan(FAST_ICE_TOP + 0.6);
    expect(y).toBeLessThan(FAST_ICE_TOP + 1.2);
  });

  it('sets the chick of the pack ice on a floe, in front of the edge', () => {
    const [x, y, z] = FLOE_CHICK;
    expect(z).toBeGreaterThan(fastIceEdge(x));
    expect(PACK_FLOES.some(([fx, fz, size]) => Math.hypot(fx - x, fz - z) < size * 0.5)).toBe(true);
    expect(Math.min(...buildFloeChickTris().flatMap((t) => [t[0][1], t[1][1], t[2][1]]))).toBeCloseTo(y, 5);
  });

  it('has a view for every point of the visit, looking at it from above the ice', () => {
    for (const spot of CERRO_NEVADO_SPOTS) {
      const { pos, target } = poseOf(SPOT_VIEWS[spot.id]);
      expect(pos[1]).toBeGreaterThan(target[1]);
      expect(Math.hypot(pos[0] - target[0], pos[1] - target[1], pos[2] - target[2])).toBeCloseTo(SPOT_VIEWS[spot.id].distance, 5);
    }
  });
});

import { describe, expect, it } from 'vitest';
import {
  birdAnimation,
  cetaceanAnimation,
  patrolOffset,
  penguinAnimation,
  REACTION_SECONDS,
  reactionProgress,
  sealAnimation,
  swimPath,
} from '../src/map3d/seaLifeAnimations.ts';
import { boxShade, buildPolyGeometry, POLY_MIN_COLORS, POLY_MIN_TRIS } from '../src/voyage/lowPoly.ts';
import {
  ALBATROSS_PARTS,
  BUOY_POLY,
  ICE_CHUNK_POLY,
  KRILL_POLY,
  PACK_ICE_POLYS,
  SHIP_WAKE_POLY,
} from '../src/voyage/seaImmersiveModels.ts';
import { PENGUINS_ON_FLOE, SEA_POLY_MODELS, type SeaPolyModelId } from '../src/voyage/seaPolyModels.ts';
import { SPLASH_POLY, SPOUT_POLY } from '../src/voyage/whalePolyModels.ts';

describe('general map low-poly sea fauna (penguins, seal & cetaceans)', () => {
  for (const id of ['penguins', 'seal', 'humpback', 'orca', 'minke'] as readonly SeaPolyModelId[]) {
    const tris = SEA_POLY_MODELS[id];

    it(`${id} meets the low-poly detail floor`, () => {
      expect(tris.length).toBeGreaterThanOrEqual(POLY_MIN_TRIS);
      expect(new Set(tris.map((t) => t[3])).size).toBeGreaterThanOrEqual(POLY_MIN_COLORS);
    });

    it(`${id} has unit-scale bounds`, () => {
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      for (const [a, b, c] of tris) {
        for (const [x, y] of [a, b, c]) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
        }
      }
      expect(maxX - minX).toBeGreaterThan(0.6);
      expect(maxX - minX).toBeLessThan(1.5);
      if (id === 'penguins' || id === 'seal') {
        expect(minY).toBeGreaterThanOrEqual(-1e-6);
      }
    });

    it(`${id} builds a finite BufferGeometry with boxShade`, () => {
      const geometry = buildPolyGeometry(tris, boxShade);
      const pos = geometry.getAttribute('position');
      expect(pos.count).toBe(tris.length * 3);
      for (let i = 0; i < pos.count; i++) {
        expect(Number.isFinite(pos.getX(i))).toBe(true);
        expect(Number.isFinite(pos.getY(i))).toBe(true);
        expect(Number.isFinite(pos.getZ(i))).toBe(true);
      }
      geometry.dispose();
    });
  }

  it('SPOUT_POLY and SPLASH_POLY build finite BufferGeometries', () => {
    expect(SPOUT_POLY.length).toBeGreaterThan(10);
    expect(SPLASH_POLY.length).toBeGreaterThan(20);
    for (const tris of [SPOUT_POLY, SPLASH_POLY]) {
      const geometry = buildPolyGeometry(tris, boxShade);
      expect(geometry.getAttribute('position').count).toBe(tris.length * 3);
      geometry.dispose();
    }
  });

  it('places 4 distinct-proportion penguins on the single floe', () => {
    expect(PENGUINS_ON_FLOE).toHaveLength(4);
    const heights = new Set(PENGUINS_ON_FLOE.map((p) => p.scale[1]));
    expect(heights.size).toBe(4);
  });
});

describe('seaLifeAnimations', () => {
  it('tracks reaction progress within REACTION_SECONDS and expires after', () => {
    expect(reactionProgress(10, -1)).toBeNull();
    expect(reactionProgress(10, 10)).toBeCloseTo(0);
    expect(reactionProgress(10 + REACTION_SECONDS / 2, 10)).toBeCloseTo(0.5);
    expect(reactionProgress(10 + REACTION_SECONDS, 10)).toBeNull();
  });

  it('produces finite roaming patrol offsets', () => {
    const p = patrolOffset(12.5, 0.02, 0.3, 18);
    expect(Number.isFinite(p.dx)).toBe(true);
    expect(Number.isFinite(p.dz)).toBe(true);
    expect(Number.isFinite(p.heading)).toBe(true);
  });

  it('waves penguin flippers and hops during tap reaction', () => {
    const idle = penguinAnimation(1, 0, 0, null);
    const react = penguinAnimation(1, 0, 0, 0.25);
    expect(idle.hopY).toBe(0);
    expect(react.hopY).toBeGreaterThan(0);
    expect(Math.abs(react.flipperL)).toBeGreaterThan(Math.abs(idle.flipperL));
  });

  it('lifts seal head and claps flippers during tap reaction', () => {
    const idle = sealAnimation(1, 0, null);
    const react = sealAnimation(1, 0, 0.5);
    expect(react.headPitch).toBeLessThan(idle.headPitch);
    expect(Math.abs(react.flipperL)).toBeGreaterThan(Math.abs(idle.flipperL));
  });

  it('breaches and boosts water splash smoothly for all cetaceans on tap reaction', () => {
    for (const species of ['humpback', 'orca', 'minke'] as const) {
      const react = cetaceanAnimation(species, 2, 0.1, 0.25);
      expect(react.breachY).toBeGreaterThan(0.2);
      expect(react.splashBoost).toBeGreaterThan(0.5);
    }
    // Minke double-porpoise has zero cusp at midpoint (t=0.5)
    const mid = cetaceanAnimation('minke', 2, 0.1, 0.5);
    expect(mid.breachY).toBeCloseTo(0, 5);
  });

  it('builds finite immersive sea models (albatross, wake, ice chunks, pack ice)', () => {
    for (const tris of [
      ALBATROSS_PARTS.body,
      ALBATROSS_PARTS.wingR,
      ALBATROSS_PARTS.wingL,
      ICE_CHUNK_POLY,
      SHIP_WAKE_POLY,
      KRILL_POLY,
      BUOY_POLY,
      ...PACK_ICE_POLYS,
    ]) {
      const geometry = buildPolyGeometry(tris, boxShade);
      expect(geometry.getAttribute('position').count).toBe(tris.length * 3);
      geometry.dispose();
    }
  });

  it('produces smooth continuous swimPath and bird swoop animations', () => {
    const s = swimPath('humpback', 10, 0.02, 0.4, 14);
    expect(Math.hypot(s.dx, s.dz)).toBeGreaterThan(0);
    expect(s.surfaceAlpha).toBeGreaterThanOrEqual(0.2);
    const idleBird = birdAnimation(5, 0.2, 20, null);
    const swoopBird = birdAnimation(5, 0.2, 20, 0.5);
    expect(swoopBird.y).toBeLessThan(idleBird.y);
  });
});

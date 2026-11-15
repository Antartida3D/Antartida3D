import { describe, expect, it } from 'vitest';
import { seaIceAt, worldCoastDistance } from '@antartida/core';
import { icebergDriftAt, icebergMobility } from '../src/orcadas/icebergDrift.ts';
import { PENGUIN_SWIM_CLEARANCE, buildPenguinRoute, penguinSwimCorridor } from '../src/orcadas/penguins.ts';
import {
  evaluateIsthmusTerrain,
  generateIcebergs,
  icebergRadius,
} from '../src/orcadas/stationModels.ts';

describe('icebergDrift', () => {
  const swimCorridor = penguinSwimCorridor(
    buildPenguinRoute((x, z) => evaluateIsthmusTerrain(x, z).y)
  );
  const bergs = generateIcebergs(190409, swimCorridor, PENGUIN_SWIM_CLEARANCE);

  it('keeps icebergs anchored at t = 0 or under reduced motion', () => {
    for (const b of bergs) {
      const atZero = icebergDriftAt(b, 0, 0, 1, false);
      expect(atZero.x).toBe(b.x);
      expect(atZero.z).toBe(b.z);
      expect(atZero.rotY).toBe(b.rotY);

      const reduced = icebergDriftAt(b, 25, 0, 1, true);
      expect(reduced).toEqual({ x: b.x, z: b.z, rotY: b.rotY, mobility: 0 });
    }
  });

  it('drifts all bay icebergs in summer open water and freezes them completely in winter fast ice', () => {
    for (const b of bergs) {
      const summer = icebergDriftAt(b, 18, seaIceAt(1), 1, false);
      expect(summer.mobility).toBeGreaterThan(0.5);
      expect(Math.hypot(summer.x - b.x, summer.z - b.z)).toBeGreaterThan(0.1);

      for (const winterMonth of [6, 7, 8, 9, 10]) {
        const winter = icebergDriftAt(b, 18, seaIceAt(winterMonth), winterMonth, false);
        expect(winter.mobility).toBe(0);
        expect(winter.x).toBe(b.x);
        expect(winter.z).toBe(b.z);
        expect(winter.rotY).toBe(b.rotY);
      }
    }
  });

  it('slows nearshore bergs earlier than offshore bergs during shoulder sea-ice months (May/Nov)', () => {
    const mobilities = bergs.map((b) => ({
      offshore: -worldCoastDistance(b.x, b.z),
      m: icebergMobility(b, seaIceAt(5), 5),
    }));
    const nearest = mobilities.reduce((a, c) => (c.offshore < a.offshore ? c : a));
    const farthest = mobilities.reduce((a, c) => (c.offshore > a.offshore ? c : a));

    expect(nearest.m).toBe(0);
    expect(farthest.m).toBeGreaterThan(0);
  });

  it('stays safely offshore and clear of the penguin swim corridor across all months and times', () => {
    for (let month = 1; month <= 12; month++) {
      const seaIce = seaIceAt(month);
      for (let t = 0; t <= 240; t += 15) {
        for (const b of bergs) {
          const pose = icebergDriftAt(b, t, seaIce, month, false);
          expect(worldCoastDistance(pose.x, pose.z)).toBeLessThan(-1.5);
          const minDist = icebergRadius(b) + 0.5;
          for (const [cx, cz] of swimCorridor) {
            expect(Math.hypot(pose.x - cx, pose.z - cz)).toBeGreaterThan(minDist);
          }
        }
      }
    }
  });
});

import { describe, expect, it } from 'vitest';
import {
  LOW_DAYLIGHT_WINDOW_HOURS,
  ORCADAS_LAT,
  SMOKE_PUFF_COUNT,
  WIND_STRONG_KMH,
  dayLengthHours,
  flagClothOffset,
  isLowDaylightMonth,
  midMonthDayOfYear,
  orcadasWind,
  sceneWindFor,
  shouldLightWindows,
  smokePuffPose,
} from '../src/index.ts';

function rotatedXDir(yawRad: number): [number, number] {
  return [Math.cos(yawRad), -Math.sin(yawRad)];
}

describe('orcadasWind', () => {
  it('points flag downwind and weather vane into the wind across cardinal bearings', () => {
    // Wind FROM North (0 deg, -z): flag streams South (+z), vane points North (-z).
    const north = orcadasWind(0, 30);
    expect(north.toDir[0]).toBeCloseTo(0, 6);
    expect(north.toDir[1]).toBeCloseTo(1, 6);
    expect(rotatedXDir(north.toYawRad)[0]).toBeCloseTo(0, 6);
    expect(rotatedXDir(north.toYawRad)[1]).toBeCloseTo(1, 6);
    expect(rotatedXDir(north.fromYawRad)[0]).toBeCloseTo(0, 6);
    expect(rotatedXDir(north.fromYawRad)[1]).toBeCloseTo(-1, 6);

    // Wind FROM East (90 deg, +x): flag streams West (-x), vane points East (+x).
    const east = orcadasWind(90, 30);
    expect(east.toDir[0]).toBeCloseTo(-1, 6);
    expect(east.toDir[1]).toBeCloseTo(0, 6);
    expect(rotatedXDir(east.toYawRad)[0]).toBeCloseTo(-1, 6);
    expect(rotatedXDir(east.fromYawRad)[0]).toBeCloseTo(1, 6);

    // Wind FROM West (270 deg, -x): flag streams East (+x), vane points West (-x).
    const west = orcadasWind(270, 30);
    expect(west.toDir[0]).toBeCloseTo(1, 6);
    expect(west.toDir[1]).toBeCloseTo(0, 6);
    expect(rotatedXDir(west.toYawRad)[0]).toBeCloseTo(1, 6);
    expect(rotatedXDir(west.fromYawRad)[0]).toBeCloseTo(-1, 6);
  });

  it('normalizes strength and scales anemometer speed monotonically from zero at calm', () => {
    const calm = orcadasWind(180, 0);
    expect(calm.strength).toBe(0);
    expect(calm.cupsSpinRadPerSec).toBe(0);

    const light = orcadasWind(180, 15);
    const strong = orcadasWind(180, WIND_STRONG_KMH);
    const gale = orcadasWind(180, WIND_STRONG_KMH * 2);

    expect(light.strength).toBeCloseTo(0.25, 6);
    expect(strong.strength).toBe(1);
    expect(gale.strength).toBe(1);
    expect(strong.cupsSpinRadPerSec).toBeGreaterThan(light.cupsSpinRadPerSec);
    expect(gale.cupsSpinRadPerSec).toBeGreaterThan(strong.cupsSpinRadPerSec);
  });
});

describe('sceneWindFor', () => {
  const reading = { windKmh: 34, windDirDeg: 135 };

  it('uses the simulated reading of the day from the start, before wind is recorded', () => {
    expect(sceneWindFor({ reading, windGuess: undefined })).toEqual({ windKmh: 34, windDirDeg: 135 });
  });

  it('keeps the direction and shows the recorded speed once annotated', () => {
    expect(sceneWindFor({ reading, windGuess: 48 })).toEqual({ windKmh: 48, windDirDeg: 135 });
  });
});

describe('flagClothOffset', () => {
  it('anchors the hoist at zero, freezes wave under reduced motion, and droops in calm air', () => {
    const light = orcadasWind(270, 6);
    const strong = orcadasWind(270, WIND_STRONG_KMH);

    expect(flagClothOffset(strong, 0, 0.5, 2.3, false)).toEqual({ dx: 0, dy: 0, dz: 0 });

    const r1 = flagClothOffset(light, 0.7, 0.2, 1.5, true);
    const r2 = flagClothOffset(light, 0.7, 0.2, 4.2, true);
    expect(r1).toEqual(r2);

    expect(flagClothOffset(light, 0.8, 0, 0, false).dy).toBeLessThan(0);
    expect(flagClothOffset(strong, 0.8, 0, 0, false).dy).toBeCloseTo(0, 6);
  });
});

describe('smokePuffPose', () => {
  it('tilts downwind proportionally to wind strength and keeps scale non-negative', () => {
    const calm = orcadasWind(270, 0);
    const strongFromWest = orcadasWind(270, WIND_STRONG_KMH);
    const strongFromNorth = orcadasWind(0, WIND_STRONG_KMH);

    // At t=0, index 5 has phase = 0.5 (mid-plume)
    const pCalm = smokePuffPose(5, SMOKE_PUFF_COUNT, 0, calm);
    const pWest = smokePuffPose(5, SMOKE_PUFF_COUNT, 0, strongFromWest);
    const pNorth = smokePuffPose(5, SMOKE_PUFF_COUNT, 0, strongFromNorth);

    expect(pCalm.y).toBeGreaterThan(pWest.y);
    expect(pWest.x).toBeGreaterThan(pCalm.x);
    expect(pNorth.z).toBeGreaterThan(0.5);
    expect(pWest.scale).toBeGreaterThan(0);

    // Birth puff at phase 0 has zero scale so puffs appear and vanish smoothly
    const pStart = smokePuffPose(0, SMOKE_PUFF_COUNT, 0, strongFromWest);
    expect(pStart.scale).toBeCloseTo(0, 6);
  });
});

describe('low-daylight windows', () => {
  it('matches MonthStrip daylight hours against LOW_DAYLIGHT_WINDOW_HOURS', () => {
    for (let m = 1; m <= 12; m++) {
      const hours = dayLengthHours(ORCADAS_LAT, midMonthDayOfYear(m));
      expect(isLowDaylightMonth(m)).toBe(hours < LOW_DAYLIGHT_WINDOW_HOURS);
    }
    // Austral winter months (May-August) are below 9 h; summer (December-January) above 18 h
    expect(isLowDaylightMonth(6)).toBe(true);
    expect(isLowDaylightMonth(7)).toBe(true);
    expect(isLowDaylightMonth(12)).toBe(false);
    expect(isLowDaylightMonth(1)).toBe(false);
  });

  it('lights windows during low-daylight months even at high sun, and at night in summer', () => {
    expect(shouldLightWindows(6, 6)).toBe(true);
    expect(shouldLightWindows(1, 15)).toBe(false);
    expect(shouldLightWindows(1, -3)).toBe(true);
  });
});

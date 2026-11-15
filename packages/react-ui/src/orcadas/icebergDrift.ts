// Pure bay iceberg drift logic for the Orcadas diorama, driven by seaIce cover and month.

import { clamp01, worldCoastDistance } from '@antartida/core';
import { iceThreshold, icebergRadius, type IcebergInstance } from './stationModels.ts';

export interface IcebergDriftPose {
  x: number;
  z: number;
  rotY: number;
  mobility: number;
}

const MONTHS_IN_YEAR = 12;
const FULL_ICE_LOCK = 0.85;

function normalizeMonth(month: number): number {
  const m = Math.trunc(month);
  return ((((m - 1) % MONTHS_IN_YEAR) + MONTHS_IN_YEAR) % MONTHS_IN_YEAR) + 1;
}

/**
 * Returns [0, 1] mobility of an iceberg in the bay, combining its offshore position against
 * the growing shore-fast sea ice (`iceThreshold`) with a gentle seasonal current factor.
 */
export function icebergMobility(
  berg: Pick<IcebergInstance, 'x' | 'z'>,
  seaIce: number,
  month: number
): number {
  const offshore = Math.max(0, -worldCoastDistance(berg.x, berg.z));
  const freezeAt = iceThreshold(offshore);
  if (seaIce >= freezeAt || seaIce >= FULL_ICE_LOCK) return 0;

  const iceFreedom = clamp01((freezeAt - seaIce) / Math.max(0.15, freezeAt));
  const m = normalizeMonth(month);
  const seasonalCurrent = 0.8 + 0.2 * Math.cos(((m - 1) / MONTHS_IN_YEAR) * Math.PI * 2);
  return iceFreedom * seasonalCurrent;
}

/**
 * Computes the slow drifting pose `(x, z, rotY)` of a bay iceberg at `time` (seconds),
 * grounded in `seaIce` cover and `month`. Remains still at `time <= 0`, under `reduced` motion,
 * or once fast ice locks the berg in place; always clamped safely offshore.
 */
export function icebergDriftAt(
  berg: IcebergInstance,
  time: number,
  seaIce: number,
  month: number,
  reduced = false
): IcebergDriftPose {
  if (reduced) {
    return { x: berg.x, z: berg.z, rotY: berg.rotY, mobility: 0 };
  }

  const mobility = icebergMobility(berg, seaIce, month);
  if (!Number.isFinite(time) || time <= 0 || mobility <= 0) {
    return { x: berg.x, z: berg.z, rotY: berg.rotY, mobility };
  }

  const ampX = 1.3 + (berg.phase % 0.7);
  const ampZ = 0.4 + ((berg.phase * 1.7) % 0.35);
  const omega = 0.055 + (berg.phase % 0.4) * 0.04;
  const theta = time * omega + berg.phase;

  let dx = (Math.sin(theta) - Math.sin(berg.phase)) * ampX * 0.65 * mobility;
  let dz = (Math.cos(theta * 0.7) - Math.cos(berg.phase * 0.7)) * ampZ * 0.65 * mobility;

  const minOffshore = Math.min(2.2, icebergRadius(berg) + 1.3);
  if (worldCoastDistance(berg.x + dx, berg.z + dz) > -minOffshore) {
    let lo = 0;
    let hi = 1;
    for (let step = 0; step < 8; step++) {
      const mid = (lo + hi) * 0.5;
      if (worldCoastDistance(berg.x + dx * mid, berg.z + dz * mid) <= -minOffshore) {
        lo = mid;
      } else {
        hi = mid;
      }
    }
    dx *= lo;
    dz *= lo;
  }

  const rotY =
    berg.rotY + (Math.sin(time * 0.04 + berg.phase) - Math.sin(berg.phase)) * 0.25 * mobility;

  return {
    x: berg.x + dx,
    z: berg.z + dz,
    rotY,
    mobility,
  };
}

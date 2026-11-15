// Illustrative snow density for the Orcadas diorama, derived from monthly mean temperatures in ORCADAS_CLIMATE.

import { climateFor } from './orcadas.ts';
import { clamp01 } from './voyage.ts';

/** Monthly mean temperature (deg C) below which snowfall appears in the diorama illustration. */
export const SNOW_FREEZE_TEMP_C = -0.5;

/** Monthly mean temperature (deg C) corresponding to peak snow density. */
export const SNOW_PEAK_TEMP_C = -10;

/** Maximum low-poly snow particles in normal quality and low-quality fallback. */
export const SNOW_MAX_PARTICLES = 320;
export const SNOW_LOW_QUALITY_PARTICLES = 120;

/** Wind speed threshold (km/h) above which falling snow shifts into gentle blowing spindrift. */
export const SNOW_GALE_KMH = 35;

/**
 * Returns illustrative snowfall density in [0, 1] for `month` (1..12),
 * derived from `climateFor(month).tempMeanC`. Warm summer months return 0;
 * cold winter months scale smoothly up to 1.
 */
export function snowDensityForMonth(month: number): number {
  const { tempMeanC } = climateFor(month);
  if (tempMeanC >= SNOW_FREEZE_TEMP_C) return 0;
  return clamp01((SNOW_FREEZE_TEMP_C - tempMeanC) / (SNOW_FREEZE_TEMP_C - SNOW_PEAK_TEMP_C));
}

/**
 * Returns the active low-poly snow particle count for `month`, capped by `maxCount`.
 * Always returns 0 when `reduced` motion is active.
 */
export function snowParticleCount(month: number, maxCount: number, reduced: boolean): number {
  if (reduced || !Number.isFinite(maxCount) || maxCount <= 0) return 0;
  return Math.round(maxCount * snowDensityForMonth(month));
}

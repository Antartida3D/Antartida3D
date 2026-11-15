// Pure wind and daylight-window logic for the Orcadas diorama (#135). No rendering.

import {
  ORCADAS_LAT,
  dayLengthHours,
  midMonthDayOfYear,
  type Reading,
} from './orcadas.ts';

/** Reference strong wind speed (km/h, Beaufort 7) for normalized flag, anemometer and smoke response. */
export const WIND_STRONG_KMH = 60;

/** Illustrative wind direction (degrees clockwise from true North) used before an observation is recorded. Not a sourced prevailing direction. */
export const DEFAULT_WIND_DIR_DEG = 270;

/** Solar elevation threshold (degrees) below which the station enters twilight/night lighting. */
export const NIGHT_SUN_ELEVATION_DEG = -1.5;

/**
 * Illustrative daylight threshold (hours) below which station windows stay lit even at midday.
 * At Orcadas (60.74 deg S), mid-month daylight from `dayLengthHours` falls below 9 h in May (7.3 h),
 * June (5.7 h), July (6.4 h) and August (8.8 h) — over 15 hours of darkness or twilight per day —
 * while April (9.9 h) and September (11.7 h) remain above it.
 */
export const LOW_DAYLIGHT_WINDOW_HOURS = 9;

/** Number of smoke puffs in the main house chimney plume. */
export const SMOKE_PUFF_COUNT = 10;

const DEG_TO_RAD = Math.PI / 180;

export interface OrcadasWind {
  /** Clamped wind speed in km/h (>= 0). */
  readonly kmh: number;
  /** Normalized compass direction the wind blows FROM, degrees in [0, 360). */
  readonly fromDeg: number;
  /** Normalized wind strength in [0, 1] relative to WIND_STRONG_KMH. */
  readonly strength: number;
  /** Horizontal unit vector pointing in the direction the wind blows TO (+x east, +z south). */
  readonly toDir: readonly [number, number];
  /** Rotation around +y (rad) for a +x-aligned model pointing WITH the wind (flag cloth). */
  readonly toYawRad: number;
  /** Rotation around +y (rad) for a +x-aligned model pointing INTO the wind (weather vane arrow). */
  readonly fromYawRad: number;
  /** Anemometer cup rotor angular speed around +y (rad/s); 0 when calm. */
  readonly cupsSpinRadPerSec: number;
}

/**
 * Single source of truth for diorama wind direction and force.
 * Used by the flagpole, weather vane, cup anemometer, chimney smoke, and sea/sky drift.
 */
export function orcadasWind(windDirDeg: number, windKmh: number): OrcadasWind {
  const fromDeg = Number.isFinite(windDirDeg)
    ? ((windDirDeg % 360) + 360) % 360
    : DEFAULT_WIND_DIR_DEG;
  const kmh = Number.isFinite(windKmh) ? Math.max(0, windKmh) : 0;
  const strength = Math.min(1, kmh / WIND_STRONG_KMH);

  // Meteorological wind direction is where wind blows FROM (0 = North = -z, 90 = East = +x).
  const toRad = (fromDeg + 180) * DEG_TO_RAD;
  const toX = Math.sin(toRad);
  const toZ = -Math.cos(toRad);

  // In Three.js rotation.y = yaw rotates +x to (cos(yaw), 0, -sin(yaw)).
  const toYawRad = Math.atan2(-toZ, toX);
  const fromYawRad = Math.atan2(toZ, -toX);
  const cupsSpinRadPerSec =
    kmh <= 0 ? 0 : Math.min(20, 0.4 + (kmh / WIND_STRONG_KMH) * 12.8);

  return {
    kmh,
    fromDeg,
    strength,
    toDir: [toX, toZ],
    toYawRad,
    fromYawRad,
    cupsSpinRadPerSec,
  };
}

/**
 * Resolves the diorama's active wind: the simulated reading of the day from the start, so the flag,
 * vane and smoke move and point the same way before and after the visitor writes the wind down.
 * Once the visitor records a speed, that recorded speed is shown.
 */
export function sceneWindFor(opts: {
  reading: Pick<Reading, 'windKmh' | 'windDirDeg'>;
  windGuess: number | undefined;
}): { windKmh: number; windDirDeg: number } {
  const recorded = typeof opts.windGuess === 'number' && Number.isFinite(opts.windGuess);
  return {
    windKmh: Math.max(0, recorded ? (opts.windGuess as number) : opts.reading.windKmh),
    windDirDeg: opts.reading.windDirDeg,
  };
}

export interface FlagVertexOffset {
  readonly dx: number;
  readonly dy: number;
  readonly dz: number;
}

/**
 * Continuous cloth wave and calm-wind droop offset at normalized flag coordinates
 * (`u` in [0, 1] from hoist to fly edge, `v` in [-1, 1] from bottom to top).
 * Returns zero at the hoist (`u <= 0`) so the cloth remains anchored with no seams.
 */
export function flagClothOffset(
  wind: OrcadasWind,
  u: number,
  v: number,
  timeSec: number,
  reduced: boolean
): FlagVertexOffset {
  const cu = Math.max(0, Math.min(1, u));
  if (cu <= 0) return { dx: 0, dy: 0, dz: 0 };
  const t = reduced ? 0 : timeSec;
  const amp = (wind.kmh <= 0 ? 0.015 : 0.05 + wind.strength * 0.14) * Math.pow(cu, 1.15);
  const speed = 2.6 + wind.strength * 5.2;
  const phase = t * speed - cu * Math.PI * 2.4 + v * 0.24;
  const dz = Math.sin(phase) * amp + Math.sin(phase * 1.7 + 0.9) * amp * 0.22;
  const dy = -(1 - wind.strength) * 0.22 * Math.pow(cu, 1.45);
  const dx = -(1 - wind.strength) * 0.05 * cu * cu;
  return { dx, dy, dz };
}

export interface SmokePuffPose {
  /** Position offset from the chimney flue top, in world units. */
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** Uniform puff scale (0 at birth and dissipation). */
  readonly scale: number;
  readonly rotY: number;
  readonly rotX: number;
}

/** Position and scale of one chimney smoke puff at `timeSec` under `wind`. */
export function smokePuffPose(
  index: number,
  count: number,
  timeSec: number,
  wind: OrcadasWind
): SmokePuffPose {
  const n = Math.max(1, Math.trunc(count));
  const cycleRate = 0.36 + wind.strength * 0.24;
  const phase = (((timeSec * cycleRate + index / n) % 1) + 1) % 1;
  const maxRise = 1.45 - wind.strength * 0.45;
  const maxDrift = 0.14 + wind.strength * 2.15;
  const drift = Math.pow(phase, 1.25) * maxDrift;
  const swayAmp = 0.035 * (0.4 + wind.strength * 0.6) * phase;
  const sway = Math.sin(phase * Math.PI * 2 + index * 1.9) * swayAmp;
  const perpX = -wind.toDir[1];
  const perpZ = wind.toDir[0];

  return {
    x: wind.toDir[0] * drift + perpX * sway,
    y: phase * maxRise,
    z: wind.toDir[1] * drift + perpZ * sway,
    scale: Math.sin(phase * Math.PI) * (0.075 + phase * 0.09),
    rotY: index * 1.1 + timeSec * (0.4 + wind.strength * 0.8),
    rotX: index * 0.7 + phase * 0.9,
  };
}

/** True when `month` (1..12) has fewer daylight hours than `LOW_DAYLIGHT_WINDOW_HOURS`. */
export function isLowDaylightMonth(month: number): boolean {
  return dayLengthHours(ORCADAS_LAT, midMonthDayOfYear(month)) < LOW_DAYLIGHT_WINDOW_HOURS;
}

/** True when station windows should glow: at night/twilight or during low-daylight months. */
export function shouldLightWindows(month: number, sunElevationDeg: number): boolean {
  return sunElevationDeg < NIGHT_SUN_ELEVATION_DEG || isLowDaylightMonth(month);
}

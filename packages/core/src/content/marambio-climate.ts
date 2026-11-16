/**
 * Monthly climate of Base Marambio (WMO 89055) from the Servicio Meteorológico Nacional,
 * «Estadísticas Climatológicas Normales: República Argentina – Período 1991-2020» (2023),
 * pp. 792-799, read on 15 Nov 2026 (docs/expediciones/base-marambio.md, source `smn-normales`).
 * The mean temperatures match the WMO normals that Argentina submitted (NOAA NCEI, accession
 * 0253808, BASE_MARAMBIO_89055.csv). The normals give no wind speed for Marambio («S/D»).
 */

/** Latitude of the SMN station at the base, in degrees (south is negative). */
export const MARAMBIO_LAT = -64.24141;

export interface MarambioMonthClimate {
  /** Mean temperature, °C. */
  tempMeanC: number;
  /** Mean number of days with «ventisca alta» in the month. */
  blizzardHighDays: number;
  /** Mean number of days with «ventisca baja» in the month. */
  blizzardLowDays: number;
}

const TEMP_MEAN_C = [-0.8, -1.8, -5.5, -10.0, -11.9, -14.9, -14.9, -13.8, -10.6, -7.3, -3.4, -1.3];
const BLIZZARD_HIGH_DAYS = [1.9, 3.2, 7.0, 8.9, 9.3, 11.9, 12.2, 11.1, 9.1, 6.7, 4.0, 3.0];
const BLIZZARD_LOW_DAYS = [3.1, 4.0, 7.1, 9.5, 10.3, 9.7, 11.4, 12.1, 10.0, 7.7, 5.3, 4.0];

/** Annual totals as the SMN prints them, to check the monthly rows against. */
export const MARAMBIO_BLIZZARD_HIGH_YEAR = 88.3;
export const MARAMBIO_BLIZZARD_LOW_YEAR = 94.1;

/** The twelve months, January first. */
export const MARAMBIO_CLIMATE: readonly MarambioMonthClimate[] = TEMP_MEAN_C.map((tempMeanC, i) => ({
  tempMeanC,
  blizzardHighDays: BLIZZARD_HIGH_DAYS[i],
  blizzardLowDays: BLIZZARD_LOW_DAYS[i],
}));

const monthIndex = (month: number) => ((((Math.round(month) - 1) % 12) + 12) % 12);

export function marambioClimate(month: number): MarambioMonthClimate {
  return MARAMBIO_CLIMATE[monthIndex(month)];
}

const MOST_BLIZZARD_DAYS = Math.max(...BLIZZARD_HIGH_DAYS);

/**
 * How strong the blizzard of the diorama is in a month, 0..1: the days with «ventisca alta» of the
 * month against the month that has most. It drives a simulation, not a measure of the wind.
 */
export function marambioBlizzard(month: number): number {
  return marambioClimate(month).blizzardHighDays / MOST_BLIZZARD_DAYS;
}

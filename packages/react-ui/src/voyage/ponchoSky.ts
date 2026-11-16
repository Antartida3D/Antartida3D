/**
 * The sky behind a diorama of Poncho (issue #146): a gradient from a pale haze at the horizon, the color the
 * far ground and the sea fade to (the fog of the canvas), up to a clearer blue at the top. Pure: the canvas
 * paints a dome with it.
 */
export const SKY_HAZE = 0xe6edee;
export const SKY_ZENITH = 0x8dbad8;
/** How fast the blue grows above the horizon: 0 at the horizon, 1 straight up (a power of the elevation). */
const SKY_CURVE = 0.55;

const channel = (hex: number, shift: number): number => (hex >> shift) & 255;

/** The color (0xRRGGBB) of the sky at `up`, the vertical part of the unit direction from -1 to 1: the haze at and under the horizon. */
export function skyColorAt(up: number): number {
  const k = Math.min(1, Math.max(0, up)) ** SKY_CURVE;
  const mix = (shift: number) => Math.round(channel(SKY_HAZE, shift) + (channel(SKY_ZENITH, shift) - channel(SKY_HAZE, shift)) * k);
  return (mix(16) << 16) | (mix(8) << 8) | mix(0);
}

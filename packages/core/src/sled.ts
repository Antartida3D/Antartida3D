/** Pure rules of how the sled team rides over the relief (3D map). Lengths in map units; `size` is the team length. */

/** Gap between the runners and the snow, as a fraction of the team length. */
export const SLED_MARGIN = 0.03;
/** Steepest tilt of the team, in radians (about 17 degrees): the relief is exaggerated and would tip it over. */
export const SLED_MAX_PITCH = 0.3;
/** The sled team is small next to a ship and the camera is close: it needs less to be read, and a lower floor not to cover the peninsula. */
export const SLED_SIZE_PER_DISTANCE = 0.11;
export const SLED_MIN_SIZE = 0.4;
/** Team length for a camera `distance` away. */
export function sledSize(distance: number): number {
  return Math.max(SLED_MIN_SIZE, distance * SLED_SIZE_PER_DISTANCE);
}

/** Half the width of the team's footprint, as a fraction of its length (dogs fan out beside the line). */
const FOOTPRINT_HALF_WIDTH = 0.15;
/** Ground samples along the length (odd, so the middle is one) and across the width. */
const FOOTPRINT_LENGTH_SAMPLES = 13;
const FOOTPRINT_WIDTH_SAMPLES = 3;

/** Ground world height at map position (x, y); 0 or less is the sea. */
export type GroundAt = (x: number, y: number) => number;

export interface SledPose {
  /** World height of the middle of the team's belly (0 on the sea). */
  height: number;
  /** Nose up (positive) or down, in radians, limited to SLED_MAX_PITCH. */
  pitch: number;
}

/**
 * Where the team rides over the relief, looking at all of its footprint (its length and a bit to the sides),
 * not only under its middle: the pitch follows the highest ground under the rear half and the front half, and
 * the height is the lowest that keeps the belly (a straight line at that pitch) over the ground everywhere,
 * plus the margin. `heading` is the direction of the nose in map space (atan2(dy, dx)).
 */
export function sledFootprintPose(groundAt: GroundAt, x: number, y: number, heading: number, size: number): SledPose {
  const fx = Math.cos(heading);
  const fy = Math.sin(heading);
  const half = FOOTPRINT_LENGTH_SAMPLES >> 1;
  // Highest ground at each station along the length (u in [-0.5, 0.5] lengths from the middle), over the width.
  const stations: { u: number; ground: number }[] = [];
  for (let i = -half; i <= half; i++) {
    const u = i / (2 * half);
    let ground = -Infinity;
    for (let j = 0; j < FOOTPRINT_WIDTH_SAMPLES; j++) {
      const side = (j / (FOOTPRINT_WIDTH_SAMPLES - 1) - 0.5) * 2 * FOOTPRINT_HALF_WIDTH * size;
      ground = Math.max(ground, groundAt(x + fx * u * size - fy * side, y + fy * u * size + fx * side));
    }
    stations.push({ u, ground });
  }
  const top = Math.max(...stations.map((s) => s.ground));
  if (!(top > 0)) return { height: 0, pitch: 0 };
  const rear = Math.max(...stations.filter((s) => s.u < 0).map((s) => s.ground));
  const front = Math.max(...stations.filter((s) => s.u > 0).map((s) => s.ground));
  const pitch = sledPitch(rear, front, size / 2);
  // The belly is the line height + u * size * sin(pitch) at u * size * cos(pitch) along the ground.
  const lift = stations.reduce((worst, s) => Math.max(worst, s.ground - s.u * size * Math.sin(pitch)), -Infinity);
  return { height: lift + size * SLED_MARGIN, pitch };
}

/** Fraction of the line of sight (from the target) not looked at: the ground next to the team is the team's own. */
const SIGHT_SKIP = 0.2;
const SIGHT_SAMPLES = 24;

/**
 * How much higher (world units, 0 if none) the eye at (`eye.x`, `eye.y`, `eye.height`) has to be to see the
 * target at (`target.x`, `target.y`, `target.height`) over a ridge: the ground along the line of sight must stay
 * `margin` under it. Raising the eye by d lifts the line by d times the fraction of the way from the target.
 */
export function sightLift(
  groundAt: GroundAt,
  eye: { x: number; y: number; height: number },
  target: { x: number; y: number; height: number },
  margin: number,
): number {
  let lift = 0;
  for (let i = 1; i <= SIGHT_SAMPLES; i++) {
    const f = SIGHT_SKIP + ((1 - SIGHT_SKIP) * (i - 1)) / (SIGHT_SAMPLES - 1); // 0 at the target, 1 at the eye
    const ground = groundAt(target.x + (eye.x - target.x) * f, target.y + (eye.y - target.y) * f);
    const line = target.height + (eye.height - target.height) * f;
    lift = Math.max(lift, (ground + margin - line) / f);
  }
  return lift;
}

/** Trot: strides per second at 1 map unit per second, the floor and the ceiling of the rhythm. */
const TROT_PER_PACE = 1.2;
const TROT_MIN_RATE = 3;
const TROT_MAX_RATE = 9;
/** Vertical bounce of the trot, as a fraction of the team length. */
const TROT_BOB = 0.012;
/** Pace (map units per second) under which the team is taken as standing. */
const STANDING_PACE = 0.01;

/** World height of the team over the ground: on the ice and snow with a small gap, on the frozen sea (level 0) at 0. */
export function sledRideHeight(ground: number, size: number): number {
  return ground > 0 ? ground + size * SLED_MARGIN : 0;
}

/** Nose up (positive) or down from the ground heights behind and ahead, `run` apart; limited to SLED_MAX_PITCH. */
export function sledPitch(behind: number, ahead: number, run: number): number {
  if (!(run > 0)) return 0;
  const pitch = Math.atan2(ahead - behind, run);
  return Math.min(SLED_MAX_PITCH, Math.max(-SLED_MAX_PITCH, pitch));
}

/** Strides per second at this pace; 0 when standing. Quicker pace, quicker trot, within a range. */
export function trotRate(pace: number): number {
  if (!(pace > STANDING_PACE)) return 0;
  return Math.min(TROT_MAX_RATE, Math.max(TROT_MIN_RATE, pace * TROT_PER_PACE));
}

/** Vertical bounce at the stride `phase` (radians); 0 when standing or with reduced motion. */
export function sledTrot(phase: number, size: number, pace: number, reduced: boolean): number {
  if (reduced || trotRate(pace) === 0) return 0;
  return Math.abs(Math.sin(phase)) * size * TROT_BOB;
}

/** Moves `current` towards `target` without jumps: frame-rate independent smoothing. */
export function easeToward(current: number, target: number, dt: number, rate: number): number {
  return target + (current - target) * Math.exp(-Math.max(0, dt) * rate);
}

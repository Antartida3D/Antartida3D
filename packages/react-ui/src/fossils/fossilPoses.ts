/**
 * Poses of the animated figures of the Fossils expedition: pure functions of time, so the scene
 * only copies numbers into its groups and the tests can check them. Illustrative motion: none of
 * it is a biomechanical inference.
 */

/** Time drawn when motion is reduced: every figure stands still in a calm pose. */
export const STILL_TIME = 2;

const TAU = Math.PI * 2;

export interface Loop { cx: number; cz: number; rx: number; rz: number; period: number }

/** Position and heading on an elliptical loop, walked counter-clockwise. */
export function onLoop(loop: Loop, t: number, phase = 0): { x: number; z: number; yaw: number } {
  const a = ((t / loop.period) * TAU + phase) % TAU;
  const x = loop.cx + Math.cos(a) * loop.rx;
  const z = loop.cz + Math.sin(a) * loop.rz;
  // Tangent of the loop; yaw turns +x (the front of every model) towards it.
  const dx = -Math.sin(a) * loop.rx;
  const dz = Math.cos(a) * loop.rz;
  return { x, z, yaw: Math.atan2(-dz, dx) };
}

// --- People ---------------------------------------------------------------------------------

export type GeologistAct = 'walk' | 'hammer' | 'sit' | 'kneel' | 'look';
export interface Geologist {
  act: GeologistAct;
  x: number; z: number; yaw: number; seed: number;
  loop?: Loop;
}
export interface GeologistPose {
  x: number; y: number; z: number; yaw: number;
  lean: number; legL: number; legR: number; armL: number; armR: number;
  headYaw: number; headPitch: number;
}
export const restGeologist = (): GeologistPose => ({
  x: 0, y: 0, z: 0, yaw: 0, lean: 0, legL: 0, legR: 0, armL: 0, armR: 0, headYaw: 0, headPitch: 0,
});
/** Legs sticking forward along the ground: sitting to work on a find, as in the camp photographs. */
export const SIT_DROP = 0.38;
export const SIT_LEGS = 1.45;
/** Kneeling at the edge of a find: the legs lie on the ground behind, so nothing reaches into it. */
export const KNEEL_LEGS = -1.45;

/** Arm and leg angles turn around the z axis: a positive angle swings the limb forward (+x). */
export function geologistPose(g: Geologist, t: number, out: GeologistPose): GeologistPose {
  out.x = g.x; out.y = 0; out.z = g.z; out.yaw = g.yaw;
  out.lean = 0; out.legL = 0; out.legR = 0;
  out.armL = 0.05; out.armR = 0.05;
  out.headYaw = Math.sin(t * 0.5 + g.seed) * 0.2;
  out.headPitch = 0;
  switch (g.act) {
    case 'walk': {
      const loop = g.loop ?? { cx: g.x, cz: g.z, rx: 1, rz: 1, period: 20 };
      const p = onLoop(loop, t, g.seed);
      out.x = p.x; out.z = p.z; out.yaw = p.yaw;
      const step = t * 5.2 + g.seed;
      out.legL = Math.sin(step) * 0.45;
      out.legR = -out.legL;
      out.armL = -Math.sin(step) * 0.35;
      out.armR = -out.armL;
      out.y = Math.abs(Math.cos(step)) * 0.025;
      out.lean = 0.06;
      break;
    }
    case 'hammer': {
      // A slow raise, a quick strike, a short rest on the rock.
      const period = 1.3;
      const u = (((t + g.seed) % period) + period) % period / period;
      const raise = u < 0.55 ? u / 0.55 : u < 0.7 ? 1 - (u - 0.55) / 0.15 : 0;
      out.lean = 0.38;
      out.armR = 0.8 + raise * 1.6;
      out.armL = 0.55;
      out.headPitch = 0.35;
      out.headYaw = 0;
      break;
    }
    case 'sit': {
      out.y = -SIT_DROP;
      out.legL = SIT_LEGS; out.legR = SIT_LEGS;
      out.lean = 0.32 + Math.sin(t * 0.8 + g.seed) * 0.04;
      // Brushing the sediment off a find, small quick strokes.
      out.armR = 1.0 + Math.sin(t * 4.5 + g.seed) * 0.22;
      out.armL = 0.85;
      out.headPitch = 0.4;
      out.headYaw = 0;
      break;
    }
    case 'kneel': {
      // Same work as sitting, on the knees: the body over the find, the legs back along the ground.
      out.y = -SIT_DROP;
      out.legL = KNEEL_LEGS; out.legR = KNEEL_LEGS;
      out.lean = 0.42 + Math.sin(t * 0.8 + g.seed) * 0.04;
      out.armR = 1.05 + Math.sin(t * 4.5 + g.seed) * 0.22;
      out.armL = 0.9;
      out.headPitch = 0.45;
      out.headYaw = 0;
      break;
    }
    case 'look': {
      // Pointing at the landscape now and then.
      const point = Math.max(0, Math.sin(t * 0.35 + g.seed));
      out.armR = 0.05 + point * 1.45;
      out.headYaw = Math.sin(t * 0.35 + g.seed) * 0.5;
      break;
    }
  }
  return out;
}

// --- Antarctopelta (illustration) -----------------------------------------------------------

export interface DinoPose {
  x: number; z: number; yaw: number; bob: number;
  legs: [number, number, number, number];
  tail: [number, number, number];
  headYaw: number; headPitch: number;
}
export const restDino = (): DinoPose => ({ x: 0, z: 0, yaw: 0, bob: 0, legs: [0, 0, 0, 0], tail: [0, 0, 0], headYaw: 0, headPitch: 0 });

/** Standing and browsing, or walking a loop with diagonal legs moving together. */
export function dinoPose(t: number, loop: Loop | null, out: DinoPose): DinoPose {
  const walking = loop !== null;
  if (loop) {
    const p = onLoop(loop, t);
    out.x = p.x; out.z = p.z; out.yaw = p.yaw;
  } else {
    out.x = 0; out.z = 0; out.yaw = 0;
  }
  const step = t * (walking ? 3.4 : 0);
  const swing = walking ? Math.sin(step) * 0.38 : 0;
  // Order of DINO_HIPS: front left, front right, rear left, rear right.
  out.legs[0] = swing; out.legs[3] = swing;
  out.legs[1] = -swing; out.legs[2] = -swing;
  out.bob = walking ? Math.abs(Math.sin(step)) * 0.012 : Math.sin(t * 1.6) * 0.004;
  for (let i = 0; i < 3; i++) out.tail[i] = Math.sin(t * 1.4 - i * 0.7) * (0.12 + i * 0.05);
  // Head down to the ferns now and then while standing.
  const browse = walking ? 0 : Math.max(0, Math.sin(t * 0.45)) ** 2;
  out.headPitch = -0.1 - browse * 0.45;
  out.headYaw = Math.sin(t * 0.6) * (walking ? 0.12 : 0.35);
  return out;
}

// --- Plesiosaur (illustration) --------------------------------------------------------------

export const PLESIO_SWIM: Loop = { cx: 0, cz: 0, rx: 2.6, rz: 1.8, period: 26 };
export interface PlesioPose {
  x: number; y: number; z: number; yaw: number; roll: number;
  neck: number[]; neckPitch: number[]; headPitch: number;
  flippers: [number, number, number, number];
}
export const restPlesio = (segments: number): PlesioPose => ({
  x: 0, y: 0, z: 0, yaw: 0, roll: 0, neck: Array(segments).fill(0), neckPitch: Array(segments).fill(0), headPitch: 0,
  flippers: [0, 0, 0, 0],
});

/** Underwater flight: front and rear flippers beat out of phase; the neck follows in a slow wave. */
export function plesioPose(t: number, loop: Loop, depth: number, out: PlesioPose): PlesioPose {
  const p = onLoop(loop, t);
  out.x = p.x; out.z = p.z; out.yaw = p.yaw;
  out.y = depth + Math.sin(t * 0.9) * 0.18;
  // Banking into the turn of the loop.
  out.roll = -0.18;
  const beat = Math.sin(t * 2.2);
  out.flippers[0] = beat * 0.55; out.flippers[1] = beat * 0.55;
  out.flippers[2] = -beat * 0.45; out.flippers[3] = -beat * 0.45;
  for (let i = 0; i < out.neck.length; i++) {
    out.neck[i] = Math.sin(t * 0.8 - i * 0.45) * 0.07 + 0.035;
    out.neckPitch[i] = Math.sin(t * 0.6 - i * 0.35) * 0.04 + (i < 2 ? 0.06 : 0);
  }
  out.headPitch = Math.sin(t * 0.7) * 0.12;
  return out;
}

// --- Ammonite (illustration) ----------------------------------------------------------------

export interface AmmonitePose { y: number; yaw: number; roll: number; arms: number[] }
export const restAmmonite = (arms: number): AmmonitePose => ({ y: 0, yaw: 0, roll: 0, arms: Array(arms).fill(0) });

/** Hovering with small pulses; the arms curl one after another. */
export function ammonitePose(t: number, seed: number, out: AmmonitePose): AmmonitePose {
  const pulse = Math.sin(t * 1.1 + seed);
  out.y = pulse * 0.12;
  out.yaw = Math.sin(t * 0.25 + seed) * 0.35;
  out.roll = Math.sin(t * 0.5 + seed) * 0.05;
  for (let i = 0; i < out.arms.length; i++) out.arms[i] = -0.25 + Math.sin(t * 2 + i * 0.8 + seed) * 0.3 - pulse * 0.1;
  return out;
}

/** Sea lily crown sway in a gentle current. */
export function crinoidSway(t: number, seed: number): number {
  return Math.sin(t * 0.9 + seed) * 0.16;
}

/** Highlight of the vertebra i while the visitor follows the column: a wave from head to tail. */
export function columnWave(i: number, total: number, t: number): number {
  const front = (t / 3) * (total + 8) - 4;
  return Math.max(0, 1 - Math.abs(i - front) / 4);
}

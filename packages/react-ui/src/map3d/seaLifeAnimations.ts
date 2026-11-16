export const REACTION_SECONDS = 2.8;

export interface PenguinAnim {
  readonly hopY: number;
  readonly bodyTiltZ: number;
  readonly headPitch: number;
  readonly headYaw: number;
  readonly flipperL: number;
  readonly flipperR: number;
}

export interface SealAnim {
  readonly bodyPitch: number;
  readonly headPitch: number;
  readonly headYaw: number;
  readonly flipperL: number;
  readonly flipperR: number;
  readonly tailYaw: number;
}

export interface CetaceanAnim {
  readonly breachY: number;
  readonly pitch: number;
  readonly roll: number;
  readonly tailPitch: number;
  readonly flipperFlap: number;
  readonly splashBoost: number;
  readonly forceSpout: boolean;
}

export interface SwimPathSample {
  readonly dx: number;
  readonly dz: number;
  readonly heading: number;
  readonly bank: number;
  readonly diveY: number;
  readonly divePitch: number;
  readonly surfaceAlpha: number;
  readonly spoutActive: boolean;
}

export interface BirdAnim {
  readonly dx: number;
  readonly dz: number;
  readonly y: number;
  readonly heading: number;
  readonly bank: number;
  readonly pitch: number;
  readonly wingFlap: number;
}

/** Normalized [0, 1] progress of a tap reaction, or null if inactive. */
export function reactionProgress(time: number, startTime: number): number | null {
  if (startTime < 0) return null;
  const t = (time - startTime) / REACTION_SECONDS;
  return t >= 0 && t < 1 ? t : null;
}

/**
 * Continuous, C2-smooth swimming loop for whales and orcas: they cruise wide paths,
 * bank into turns, dip smoothly below the surface, and rise to breathe without discrete jumps.
 */
export function swimPath(
  species: 'humpback' | 'orca' | 'minke',
  time: number,
  speed: number,
  phase: number,
  radius: number,
): SwimPathSample {
  const omega = speed * (species === 'orca' ? 3.4 : species === 'minke' ? 3.8 : 2.8);
  const a = time * omega + phase * Math.PI * 2;
  const rx = species === 'orca' ? Math.max(22, radius * 3.8) : Math.max(30, radius * 3.2);
  const rz = rx * (species === 'minke' ? 0.58 : 0.72);

  // Wide oval/figure-8 ocean cruise so the whale visibly travels forward across the sea
  const dx = Math.sin(a) * rx;
  const dz = Math.sin(a * 2 + 0.4) * rz * 0.55;
  const vx = Math.cos(a) * rx * omega;
  const vz = Math.cos(a * 2 + 0.4) * 2 * rz * 0.55 * omega;
  const heading = Math.atan2(-vz, vx);
  const bank = Math.sin(a * 2 + 0.4) * 0.14;

  // Smooth continuous dive wave: glides at surface, dips smoothly underwater, resurfaces ahead
  const diveAngle = time * omega * 1.25 + phase * 11;
  const rawDive = Math.sin(diveAngle);
  const diveY = rawDive < -0.15 ? (rawDive + 0.15) * 0.42 : rawDive * 0.08;
  const divePitch = Math.cos(diveAngle) * 0.22;
  const surfaceAlpha = Math.max(0.2, Math.min(1, 0.72 + rawDive * 0.45));
  const spoutActive = species !== 'orca' && rawDive > 0.76;

  return { dx, dz, heading, bank, diveY, divePitch, surfaceAlpha, spoutActive };
}

/** Kept as alias for backwards compatibility in tests. */
export function patrolOffset(time: number, speed: number, phase: number, radius: number): { dx: number; dz: number; heading: number; bank: number } {
  const s = swimPath('orca', time, speed, phase, radius);
  return { dx: s.dx, dz: s.dz, heading: s.heading, bank: s.bank };
}

export function penguinAnimation(time: number, phase: number, index: number, reaction: number | null): PenguinAnim {
  const p = time * 1.8 + phase * 6 + index * 2.1;
  if (reaction !== null) {
    const ease = Math.sin(reaction * Math.PI);
    const wave = Math.sin(reaction * Math.PI * 8);
    const hop = 0.5 - 0.5 * Math.cos(reaction * Math.PI * 6 + index * 0.8);
    return {
      hopY: hop * 0.13 * ease,
      bodyTiltZ: Math.sin(reaction * Math.PI * 6 + index) * 0.11 * ease,
      headPitch: (-0.34 + Math.sin(reaction * Math.PI * 4) * 0.1) * ease,
      headYaw: Math.sin(reaction * Math.PI * 3 + index) * 0.32 * ease,
      flipperL: (0.88 + wave * 0.55) * ease,
      flipperR: -(0.88 - wave * 0.55) * ease,
    };
  }
  const idleWave = Math.max(0, Math.sin(p * 0.35)) > 0.82 ? Math.sin(p * 4) * 0.32 : 0;
  return {
    hopY: 0,
    bodyTiltZ: Math.sin(p * 0.7) * 0.04,
    headPitch: Math.sin(p * 0.9) * 0.08,
    headYaw: Math.sin(p * 0.55) * 0.28,
    flipperL: 0.08 + idleWave,
    flipperR: -(0.08 + idleWave * 0.5),
  };
}

export function sealAnimation(time: number, phase: number, reaction: number | null): SealAnim {
  const p = time * 1.3 + phase * 5;
  if (reaction !== null) {
    const ease = Math.sin(reaction * Math.PI);
    const clap = Math.sin(reaction * Math.PI * 8);
    return {
      bodyPitch: -0.06 * ease,
      headPitch: (-0.5 + Math.sin(reaction * Math.PI * 4) * 0.12) * ease,
      headYaw: Math.sin(reaction * Math.PI * 4) * 0.32 * ease,
      flipperL: (0.42 + clap * 0.52) * ease,
      flipperR: -(0.42 + clap * 0.52) * ease,
      tailYaw: Math.sin(reaction * Math.PI * 8) * 0.4 * ease,
    };
  }
  return {
    bodyPitch: Math.sin(p) * 0.015,
    headPitch: Math.sin(p * 0.7) * 0.09,
    headYaw: Math.sin(p * 0.45) * 0.22,
    flipperL: Math.sin(p * 0.8) * 0.06,
    flipperR: -Math.sin(p * 0.8) * 0.06,
    tailYaw: Math.sin(p * 1.1) * 0.14,
  };
}

export function cetaceanAnimation(
  species: 'humpback' | 'orca' | 'minke',
  time: number,
  phase: number,
  reaction: number | null,
): CetaceanAnim {
  const swimFreq = species === 'humpback' ? 2.6 : species === 'orca' ? 3.8 : 4.4;
  const p = time * swimFreq + phase * 7;
  const baseTail = Math.sin(p) * (species === 'humpback' ? 0.18 : 0.24);
  const baseFlipper = Math.sin(p * 0.5) * 0.08;

  if (reaction === null) {
    return { breachY: 0, pitch: 0, roll: 0, tailPitch: baseTail, flipperFlap: baseFlipper, splashBoost: 0, forceSpout: false };
  }

  // Smooth C2 easing envelope (zero velocity at t=0 and t=1, no cusps)
  const smoothArc = Math.sin(reaction * Math.PI);
  const smoothRoll = 0.5 * (1 - Math.cos(reaction * Math.PI));

  if (species === 'humpback') {
    return {
      breachY: Math.pow(smoothArc, 1.25) * 0.65,
      pitch: Math.sin(reaction * Math.PI * 2) * 0.68,
      roll: smoothRoll * Math.PI * 2,
      tailPitch: baseTail + Math.sin(reaction * Math.PI * 6) * 0.24 * smoothArc,
      flipperFlap: Math.sin(reaction * Math.PI * 5) * 0.5 * smoothArc,
      splashBoost: smoothArc,
      forceSpout: reaction > 0.7 && reaction < 0.96,
    };
  }

  if (species === 'orca') {
    return {
      breachY: Math.pow(smoothArc, 1.2) * 0.58,
      pitch: Math.sin(reaction * Math.PI * 2) * 0.62,
      roll: Math.sin(reaction * Math.PI * 2) * 0.55 * smoothArc,
      tailPitch: baseTail + Math.sin(reaction * Math.PI * 8) * 0.22 * smoothArc,
      flipperFlap: Math.sin(reaction * Math.PI * 6) * 0.36 * smoothArc,
      splashBoost: smoothArc,
      forceSpout: false,
    };
  }

  // Minke: smooth double-porpoising wave (0.5 - 0.5 * cos(4*pi*t) has zero cusp at t=0.5)
  const doublePulse = 0.5 - 0.5 * Math.cos(reaction * Math.PI * 4);
  const breachY = smoothArc * doublePulse * 0.46;
  const pitch = Math.sin(reaction * Math.PI * 4) * 0.52 * smoothArc;
  return {
    breachY,
    pitch,
    roll: Math.sin(reaction * Math.PI * 2) * 0.28 * smoothArc,
    tailPitch: baseTail + Math.sin(reaction * Math.PI * 10) * 0.24 * smoothArc,
    flipperFlap: Math.sin(reaction * Math.PI * 8) * 0.28 * smoothArc,
    splashBoost: breachY * 2.1,
    forceSpout: reaction > 0.78 && reaction < 0.96,
  };
}

/** Smooth circular soaring + swoop dive on click for ocean albatrosses. */
export function birdAnimation(time: number, phase: number, radius: number, reaction: number | null): BirdAnim {
  const omega = 0.34;
  const a = time * omega + phase * Math.PI * 2;
  const dx = Math.cos(a) * radius;
  const dz = Math.sin(a) * radius * 0.78;
  const vx = -Math.sin(a) * radius * omega;
  const vz = Math.cos(a) * radius * 0.78 * omega;
  const heading = Math.atan2(-vz, vx);

  const swoop = reaction !== null ? Math.sin(reaction * Math.PI) : 0;
  const wingFlap = Math.sin(time * (reaction !== null ? 9 : 3.2) + phase * 8) * (0.14 + swoop * 0.28);
  const y = 3.2 + Math.sin(time * 0.9 + phase * 4) * 0.35 - swoop * 2.3;
  const pitch = reaction !== null ? Math.sin(reaction * Math.PI * 2) * 0.42 : 0.04;
  const bank = 0.24 + swoop * 0.25;
  return { dx, dz, y, heading, bank, pitch, wingFlap };
}

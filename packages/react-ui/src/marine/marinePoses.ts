import type { Box } from '../voyage/vehicles.ts';
import { MARINE_PALETTE } from './models.ts';
import { EMPEROR_BILL_TIP } from './lowPolyMarine.ts';

/**
 * Layout of the illustrative sea of Océano and the poses of its animals, as pure functions of time
 * so they can be tested: nothing swims through the ice, and every animal that breathes does it in
 * open water. Sizes, depths and times are compressed for the scene; they are not measurements.
 */

/** Height of the water surface. */
export const WATER_Y = 0;
/** Top and underside of the sea-ice floes. */
export const ICE_TOP = 0.22;
export const ICE_BOTTOM = -0.42;
/** South of this line the floes end: open water at the ice edge. */
export const EDGE_Z = 3.4;
/** A long crack in the ice, along x, where the minke comes up to breathe. */
export const LEAD = { z: -2.6, half: 0.8, from: -9, to: 9 } as const;
/** A hole in the ice where the emperors go in and out. */
export const HOLE = { x: -4.4, z: 0.6, r: 1.4 } as const;
/** Side of one ice cell. */
const CELL = 0.8;

const hash = (x: number, z: number) => {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** Is there ice over this point? Open water at the edge, along the lead, in the hole and in a few gaps. */
export function iceAt(x: number, z: number): boolean {
  if (z > EDGE_Z - (hash(Math.floor(x / CELL), 7) < 0.4 ? CELL : 0)) return false;
  if (Math.abs(z - LEAD.z) < LEAD.half && x > LEAD.from && x < LEAD.to) return false;
  if (Math.hypot(x - HOLE.x, z - HOLE.z) < HOLE.r) return false;
  return hash(Math.floor(x / CELL), Math.floor(z / CELL)) > 0.13;
}

/** Floes as columns of ice: snow on top, bluish walls and a green-brown film of algae underneath. */
export function buildIceBoxes(): Box[] {
  const C = MARINE_PALETTE;
  const boxes: Box[] = [];
  for (let i = -26; i < 26; i++) {
    for (let j = -28; j < 6; j++) {
      const x = (i + 0.5) * CELL, z = (j + 0.5) * CELL;
      if (!iceAt(x, z)) continue;
      const lift = Math.floor(hash(i, j) * 3) * 0.05;
      const top = ICE_TOP + lift;
      boxes.push(
        [x, (top + ICE_BOTTOM) / 2, z, CELL, top - ICE_BOTTOM, CELL, ICE_WALL],
        [x, top + 0.01, z, CELL, 0.02, CELL, hash(i * 3, j) > 0.7 ? ICE_SNOW_BLUE : C.white],
        [x, ICE_BOTTOM - 0.01, z, CELL, 0.02, CELL, hash(j, i) > 0.72 ? ICE_ALGAE : ICE_UNDER],
      );
      // Drifts of snow on some floes.
      if (hash(j * 5, i) > 0.82) boxes.push([x + 0.1, top + 0.06, z - 0.1, CELL * 0.55, 0.08, CELL * 0.45, C.white]);
    }
  }
  return boxes;
}
/** Wall of a floe, the pale underside, and the film of ice algae on it (AAD, «Krill»). */
const ICE_WALL = 0xb4d5ea;
const ICE_UNDER = 0xcfe3e6;
const ICE_ALGAE = 0xb3bf93;
const ICE_SNOW_BLUE = 0xe6f0f4;

// --- Swimming ---------------------------------------------------------------------------------

export interface Pose { x: number; y: number; z: number; yaw: number; pitch: number }
export interface Loop { cx: number; cy: number; cz: number; rx: number; rz: number; period: number }

/** Position on an elliptical loop, heading along it (+x is the front of every model). */
export function onLoop(loop: Loop, t: number, phase = 0): Pose {
  const a = (t / loop.period) * Math.PI * 2 + phase;
  const x = loop.cx + Math.sin(a) * loop.rx;
  const z = loop.cz - Math.cos(a) * loop.rz;
  const dx = Math.cos(a) * loop.rx, dz = Math.sin(a) * loop.rz;
  return { x, y: loop.cy, z, yaw: Math.atan2(-dz, dx), pitch: 0 };
}

/** Time used for every pose when motion is reduced: a still frame that still reads. */
export const STILL_TIME = 2.5;

const smooth = (a: number, b: number, v: number) => {
  const k = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return k * k * (3 - 2 * k);
};

// --- Minke --------------------------------------------------------------------------------------

/** The minke loops under the floes; its loop touches the lead, where it rises along the crack. */
export const MINKE_LOOP: Loop = { cx: 0, cy: -2, cz: LEAD.z - 3.2, rx: 6.5, rz: 3.2, period: 26 };
/** Half the width of the minke as drawn (model 0.25 wide at MINKE_SCALE). */
export const MINKE_SCALE = 2.4;
const MINKE_HALF_WIDTH = 0.13 * MINKE_SCALE;
/** Back of the minke just below the surface while it breathes. */
const MINKE_BREATH_Y = -0.12;

/** Where on its loop (angle from the breath) the minke meets a patch of krill under the floes. */
export const MINKE_LUNGE_ANGLES = [0.6 * Math.PI, Math.PI, 1.4 * Math.PI] as const;
/** A smooth bump, 1 at the angle `center` and 0 beyond `width` radians from it. */
const bumpAt = (a: number, center: number, width: number) => smooth(Math.cos(width), Math.cos(width * 0.3), Math.cos(a - center));
const loopAngle = (loop: Loop, t: number) => ((((t / loop.period) * Math.PI * 2) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

/**
 * Pose of the minke: it breathes along the lead and, under the floes, lunges into krill several
 * times per lap, opening its jaw and stretching its throat (P03: many short lunges per dive).
 */
export function minkePose(t: number): Pose & { breathing: boolean; lunge: number; jaw: number; throat: number } {
  const a = loopAngle(MINKE_LOOP, t);
  const p = onLoop(MINKE_LOOP, t, Math.PI);
  // At a = 0 its loop runs along the crack, tangent to the lead: there it rises to breathe.
  const near = smooth(Math.cos(0.32), Math.cos(0.12), Math.cos(a));
  const y = MINKE_LOOP.cy + (MINKE_BREATH_Y - MINKE_LOOP.cy) * near;
  const lunge = Math.max(...MINKE_LUNGE_ANGLES.map((c) => bumpAt(a, c, 0.2)));
  return { ...p, y, pitch: lunge * 0.12, breathing: near > 0.95, lunge, jaw: lunge * 0.55, throat: 1 + lunge * 1.6 };
}
/** The krill patches the minke lunges into: just ahead of its mouth at the peak of each lunge. */
export const MINKE_KRILL_PATCHES = MINKE_LUNGE_ANGLES.map((c) => {
  const p = onLoop(MINKE_LOOP, (c / (Math.PI * 2)) * MINKE_LOOP.period, Math.PI);
  return [p.x + Math.cos(p.yaw) * 1.2, MINKE_LOOP.cy - 0.1, p.z - Math.sin(p.yaw) * 1.2] as const;
});

/** True if a body of this half width at (x, z) fits in open water (used by the tests). */
export function inOpenWater(x: number, z: number, half: number): boolean {
  for (const dx of [-half, 0, half]) for (const dz of [-half, 0, half]) if (iceAt(x + dx, z + dz)) return false;
  return true;
}
export const MINKE_FOOTPRINT = MINKE_HALF_WIDTH;

// --- Emperor ------------------------------------------------------------------------------------

/** A full dive of the illustration: floating in the hole, down to the fish, back up to breathe. */
export const DIVE_PERIOD = 16;
/** Where the fish wait in the dive: compressed depth. */
export const DIVE_BOTTOM = { x: HOLE.x + 4.5, y: -5.2, z: HOLE.z - 1.5 } as const;
const FLOAT_Y = -0.08;

export type DivePhase = 'breathe' | 'down' | 'hunt' | 'up';
export function emperorDive(t: number): Pose & { phase: DivePhase; stroke: number } {
  const u = (((t / DIVE_PERIOD) % 1) + 1) % 1;
  type P3 = { x: number; y: number; z: number };
  const top: P3 = { x: HOLE.x, y: FLOAT_Y, z: HOLE.z };
  // Below the floes it swims straight down first, so it leaves the hole before heading out.
  const under: P3 = { x: HOLE.x, y: ICE_BOTTOM - 0.8, z: HOLE.z };
  const lerp = (a: P3, b: P3, k: number): P3 => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, z: a.z + (b.z - a.z) * k });
  const heading = Math.atan2(-(DIVE_BOTTOM.z - HOLE.z), DIVE_BOTTOM.x - HOLE.x);
  const stroke = Math.sin(t * 9);
  // Floating in the hole, head up out of the water to breathe.
  if (u < 0.18) return { ...top, yaw: heading, pitch: 0.3, phase: 'breathe', stroke: 0 };
  if (u < 0.26) return { ...lerp(top, under, smooth(0.18, 0.26, u)), yaw: heading, pitch: -1.2, phase: 'down', stroke };
  if (u < 0.44) return { ...lerp(under, DIVE_BOTTOM, smooth(0.26, 0.44, u)), yaw: heading, pitch: -0.7, phase: 'down', stroke };
  if (u < 0.62) {
    const k = (u - 0.44) / 0.18;
    return { x: DIVE_BOTTOM.x + Math.sin(k * 12) * 0.5, y: DIVE_BOTTOM.y + Math.sin(k * 7) * 0.3, z: DIVE_BOTTOM.z + Math.cos(k * 9) * 0.4, yaw: heading + Math.sin(k * 12) * 0.8, pitch: 0, phase: 'hunt', stroke };
  }
  if (u < 0.86) return { ...lerp(DIVE_BOTTOM, under, smooth(0.62, 0.86, u)), yaw: heading + Math.PI, pitch: 0.7, phase: 'up', stroke };
  return { ...lerp(under, top, smooth(0.86, 0.96, u)), yaw: heading + Math.PI, pitch: 1.2 * (1 - smooth(0.94, 1, u)), phase: 'up', stroke };
}

// --- Emperor hunt --------------------------------------------------------------------------------

/** The emperor of «Del hielo al agua» swims this loop under the floes, next to the fish school. */
export const EMPEROR_HUNT_LOOP: Loop = { cx: HOLE.x + 2, cy: -2, cz: HOLE.z - 0.5, rx: 2.2, rz: 1.3, period: 9 };
/** Size the swimming emperor is drawn at. */
export const EMPEROR_SWIM_SCALE = 1.3;
/** Where its bill tip is, in front of the body, in world units. */
const EMPEROR_BILL_REACH = EMPEROR_BILL_TIP * EMPEROR_SWIM_SCALE;
/** Moments of each loop: the fish shows up, is caught, and is swallowed. */
const PREY_IN = 0.05, CATCH = 0.5, SWALLOW = 0.6;
/** A still frame with the fish in the bill, for reduced motion. */
export const EMPEROR_HUNT_STILL = EMPEROR_HUNT_LOOP.period * 0.55;

export type PreyState = 'free' | 'held' | 'gone';

/**
 * The emperor catches one fish per loop, «de a una presa por vez»: a fish waits off the school where
 * the emperor will pass, the emperor snaps it with its bill, carries it a moment and swallows it.
 */
export function emperorHunt(t: number): { emperor: Pose & { stroke: number }; prey: Pose & { state: PreyState; size: number } } {
  const loop = EMPEROR_HUNT_LOOP;
  const u = (((t / loop.period) % 1) + 1) % 1;
  const base = onLoop(loop, t);
  // A quick head-down snap at the catch.
  const snap = Math.max(0, 1 - Math.abs(u - CATCH) / 0.05);
  const emperor = { ...base, pitch: -0.25 * snap, stroke: Math.sin(t * (6 + 6 * snap)) };
  const at = onLoop(loop, CATCH * loop.period);
  const ahead = { x: Math.cos(at.yaw) * EMPEROR_BILL_REACH, z: -Math.sin(at.yaw) * EMPEROR_BILL_REACH };
  const wiggle = Math.max(0, (CATCH - u) / CATCH) * 0.25;
  const prey = {
    x: at.x + ahead.x + Math.sin(t * 2.3) * wiggle,
    y: at.y + Math.sin(t * 1.7) * wiggle * 0.5,
    z: at.z + ahead.z + Math.cos(t * 2.1) * wiggle,
    yaw: at.yaw + Math.PI / 2 + Math.sin(t * 3) * 0.3,
    pitch: 0,
    state: (u < PREY_IN ? 'gone' : u < CATCH ? 'free' : u < SWALLOW ? 'held' : 'gone') as PreyState,
    size: smooth(PREY_IN, PREY_IN + 0.1, u),
  };
  return { emperor, prey };
}

// --- Humpback filter ---------------------------------------------------------------------------

export const FILTER_PERIOD = 8;
export type FilterPhase = 'approach' | 'open' | 'engulf' | 'close' | 'expel';
/** The humpback gulp, step by step: jaw angle (radians, opening down) and how full the throat is. */
export function humpbackFilter(t: number): { phase: FilterPhase; jaw: number; throat: number } {
  const u = (((t / FILTER_PERIOD) % 1) + 1) % 1;
  const OPEN = 0.7, FULL = 2.6;
  if (u < 0.25) return { phase: 'approach', jaw: 0, throat: 1 };
  if (u < 0.38) return { phase: 'open', jaw: OPEN * smooth(0.25, 0.38, u), throat: 1 + (FULL - 1) * 0.3 * smooth(0.3, 0.38, u) };
  if (u < 0.52) return { phase: 'engulf', jaw: OPEN, throat: 1 + (FULL - 1) * (0.3 + 0.7 * smooth(0.38, 0.52, u)) };
  if (u < 0.64) return { phase: 'close', jaw: OPEN * (1 - smooth(0.52, 0.64, u)), throat: FULL };
  return { phase: 'expel', jaw: 0, throat: FULL - (FULL - 1) * smooth(0.64, 0.98, u) };
}
/** The still frame with reduced motion: the mouth open and the throat full of water and krill. */
export const FILTER_STILL = 0.5 * FILTER_PERIOD;

// --- Orcas ---------------------------------------------------------------------------------------

/** A family swimming close together in open water at the ice edge. */
export const ORCA_LOOP: Loop = { cx: 0, cy: -0.55, cz: EDGE_Z + 5.8, rx: 5.5, rz: 2.4, period: 34 };
export const ORCA_POD = [
  { lag: 0, side: 0, scale: 2.4 },
  { lag: 0.08, side: 1.1, scale: 2.0 },
  { lag: 0.1, side: -1.2, scale: 2.1 },
  { lag: 0.18, side: 0.3, scale: 1.4 },
] as const;
/** Each orca of the pod follows the leader a little behind and to one side, rising and sinking a little. */
export function orcaPose(t: number, i: number): Pose {
  const m = ORCA_POD[i];
  const p = onLoop(ORCA_LOOP, t, -m.lag * Math.PI * 2);
  return {
    x: p.x + Math.sin(p.yaw) * m.side, y: p.y + Math.sin(t * 0.9 + i * 1.7) * 0.12, z: p.z + Math.cos(p.yaw) * m.side,
    yaw: p.yaw, pitch: Math.cos(t * 0.9 + i * 1.7) * 0.06,
  };
}

// --- Leopard seal --------------------------------------------------------------------------------

/** The leopard seal swims a loop that passes a school of fish and a patch of krill. */
export const LEOPARD_LOOP: Loop = { cx: 4.5, cy: -2.2, cz: -2, rx: 3, rz: 1.6, period: 22 };
const LEOPARD_FISH_ANGLE = 0.5 * Math.PI;
const LEOPARD_KRILL_ANGLE = 1.5 * Math.PI;
const preyAhead = (angle: number) => {
  const p = onLoop(LEOPARD_LOOP, (angle / (Math.PI * 2)) * LEOPARD_LOOP.period);
  return [p.x + Math.cos(p.yaw) * 1.6, p.y, p.z - Math.sin(p.yaw) * 1.6] as const;
};
/** Where the fish and the krill wait along the leopard seal's loop. */
export const LEOPARD_PREY = { fish: preyAhead(LEOPARD_FISH_ANGLE), krill: preyAhead(LEOPARD_KRILL_ANGLE) } as const;

/**
 * Two ways of feeding in one lap (L13, P04, P05): a quick bite at the fish, with the jaw wide open,
 * and a slower suction at the krill, with the mouth half open.
 */
export function leopardPose(t: number): Pose & { jaw: number; prey: 'fish' | 'krill' | null } {
  const a = loopAngle(LEOPARD_LOOP, t);
  const p = onLoop(LEOPARD_LOOP, t);
  const bite = bumpAt(a, LEOPARD_FISH_ANGLE, 0.22);
  const suck = bumpAt(a, LEOPARD_KRILL_ANGLE, 0.45);
  return { ...p, pitch: bite * 0.1, jaw: Math.max(bite * 0.8, suck * 0.45), prey: bite > 0.3 ? 'fish' : suck > 0.3 ? 'krill' : null };
}

export const SUCTION_PERIOD = 3.2;
/**
 * Suction and filtering, as observed in captive leopard seals (P04): the mouth opens and draws in
 * water with krill, closes, and pushes the water out between the back teeth.
 */
export function suction(t: number): { jaw: number; draw: number; expel: number } {
  const u = (((t / SUCTION_PERIOD) % 1) + 1) % 1;
  if (u < 0.35) return { jaw: 0.5 * smooth(0, 0.12, u), draw: u / 0.35, expel: 0 };
  if (u < 0.5) return { jaw: 0.5 * (1 - smooth(0.35, 0.5, u)), draw: 1, expel: 0 };
  return { jaw: 0.04, draw: 0, expel: (u - 0.5) / 0.5 };
}

// --- Orcas making a wave (P06) -----------------------------------------------------------------

/** The floe of the documented example, with a Weddell seal on it, in open water past the ice edge. */
export const WAVE_FLOE = { x: 2.5, z: EDGE_Z + 6.5, half: 1.3 } as const;
export const WAVE_PERIOD = 12;
export type WavePhase = 'approach' | 'dive' | 'wave' | 'away';
/**
 * The cooperative wave of type B orcas, as an illustration of Pitman and Durban (2012): the group
 * swims together towards the floe, dives under it, and the wave they raise washes over the floe.
 * The seal slides on the wet ice but stays on it: the scene does not show the capture.
 */
/**
 * The seal on the wave floe, in the frame of the floe: it rests near the middle, the wave pushes it
 * off the far edge and it drops into the water, nose first. Hidden once under water, until the loop
 * starts again with the seal back on the ice.
 */
export const WAVE_SEAL_START = -0.2;
const WAVE_SEAL_REST_Y = 0.2;

export function orcaWave(t: number, i: number): Pose & {
  phase: WavePhase; crest: number; height: number; tilt: number;
  /** Seal: along the floe, height, nose-down roll, and whether it is still in view. */
  slide: number; sealY: number; sealPitch: number; sealVisible: boolean;
} {
  const u = (((t / WAVE_PERIOD) % 1) + 1) % 1;
  const side = (i - 1) * 0.9;
  const startX = WAVE_FLOE.x - 10, diveX = WAVE_FLOE.x - 2.6, endX = WAVE_FLOE.x + 6;
  let x: number, y: number, pitch: number, phase: WavePhase;
  if (u < 0.5) { x = startX + (diveX - startX) * smooth(0, 0.5, u) ; y = -0.5; pitch = 0; phase = 'approach'; }
  else if (u < 0.62) { const k = smooth(0.5, 0.62, u); x = diveX + 1.4 * k; y = -0.5 - 1.3 * k; pitch = -0.45 * k; phase = 'dive'; }
  else { const k = smooth(0.62, 1, u); x = diveX + 1.4 + (endX - diveX - 1.4) * k; y = -1.8; pitch = 0; phase = u < 0.85 ? 'wave' : 'away'; }
  const w = smooth(0.52, 0.82, u);
  const height = 0.4 * Math.sin(Math.PI * w);
  const crest = WAVE_FLOE.x - 2.4 + 4.4 * w;
  const over = Math.max(0, 1 - Math.abs(crest - WAVE_FLOE.x) / WAVE_FLOE.half);
  return {
    x, y: y + Math.sin(t * 1.3 + i) * 0.04, z: WAVE_FLOE.z + side, yaw: 0, pitch, phase, crest, height,
    tilt: over * 0.12,
    slide: smooth(0.6, 0.76, u) * (WAVE_FLOE.half + 0.45 - WAVE_SEAL_START),
    sealY: WAVE_SEAL_REST_Y - smooth(0.72, 0.82, u) * 0.8,
    sealPitch: -smooth(0.7, 0.8, u) * 0.6,
    sealVisible: u < 0.86,
  };
}

// --- Krill swarm ---------------------------------------------------------------------------------

/** Each krill of a swarm drifts around the center of the swarm on its own small orbit. */
export function krillAt(i: number, t: number, center: readonly [number, number, number], spread: number) {
  const h = (n: number) => hash(i * 1.37 + n, n * 2.1);
  const r = spread * Math.sqrt(h(1));
  const a = h(2) * Math.PI * 2 + t * (0.15 + h(3) * 0.2);
  return {
    x: center[0] + Math.cos(a) * r,
    y: center[1] + (h(4) - 0.5) * spread * 0.55 + Math.sin(t * 0.7 + i) * 0.06,
    z: center[2] + Math.sin(a) * r * 0.7,
    yaw: -a - Math.PI / 2,
  };
}

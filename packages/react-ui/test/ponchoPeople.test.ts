import { describe, expect, it } from 'vitest';
// Break the pre-existing stationModels <-> sightingModels -> penguins import cycle in test isolation.
import '../src/voyage/sightingModels.ts';
import { observerStridePose } from '../src/orcadas/lifeDetails.ts';
import { VOXEL_PALETTE } from '../src/orcadas/stationModels.ts';
import {
  PERSON_ACTIONS,
  PERSON_VARIANTS,
  BELT_RADIUS,
  BELT_Y,
  PONCHO_PHASE_PERIOD,
  buildBeltTris,
  buildPonchoPerson,
  hammerPose,
  ponchoFootprints,
  ponchoHandAt,
  ponchoPersonParts,
  ponchoPose,
  ponchoPoseLift,
  ponchoWaistAt,
  tendPose,
  probePose,
  IDLE_SWAY,
  idlePose,
  standPose,
  walkPose,
  type PersonPose,
} from '../src/voyage/ponchoPeople.ts';

const PHASES = Array.from({ length: 13 }, (_, i) => (i / 12) * PONCHO_PHASE_PERIOD);
const FIELDS: (keyof PersonPose)[] = ['legL', 'legR', 'armL', 'armR', 'torsoPitch', 'grip'];
const ys = (tris: ReturnType<typeof buildPonchoPerson>) => tris.flatMap(([a, b, c]) => [a[1], b[1], c[1]]);
const standing = buildPonchoPerson(standPose());

describe('people of Poncho: poses', () => {
  it('stands about one unit tall on y = 0', () => {
    expect(Math.min(...ys(standing))).toBeCloseTo(0, 3);
    expect(Math.max(...ys(standing))).toBeGreaterThan(0.95);
    expect(Math.max(...ys(standing))).toBeLessThan(1.1);
  });

  for (const action of PERSON_ACTIONS) {
    for (const variant of PERSON_VARIANTS) {
      it(`${action} (${variant}) gives valid faces: same count as standing, no NaN, feet on y = 0`, () => {
        for (const phase of PHASES) {
          const tris = buildPonchoPerson(ponchoPose(action, phase), variant);
          expect(tris.length).toBe(standing.length);
          for (const t of tris) expect(t.slice(0, 3).flat().every(Number.isFinite)).toBe(true);
          const low = Math.min(...ys(tris));
          expect(low).toBeGreaterThan(-0.01);
          expect(low).toBeLessThan(0.01);
        }
      });
    }

    it(`${action} is deterministic and periodic (phase 0 = phase 2π)`, () => {
      for (const phase of PHASES) {
        expect(ponchoPose(action, phase)).toEqual(ponchoPose(action, phase));
        const a = ponchoPose(action, phase);
        const b = ponchoPose(action, phase + PONCHO_PHASE_PERIOD);
        for (const f of FIELDS) expect(b[f]).toBeCloseTo(a[f], 9);
      }
    });
  }

  it('walks with the stride of the Orcadas observer', () => {
    for (const phase of PHASES) {
      const s = observerStridePose(phase / 11.5, 1, false);
      const p = walkPose(phase);
      expect([p.legL, p.legR, p.armL, p.armR, p.torsoPitch]).toEqual([s.leftLegSwing, s.rightLegSwing, s.leftArmSwing, s.rightArmSwing, s.torsoPitchZ]);
    }
  });

  it('hammers: the right arm rises and falls inside a bounded range while the left one holds still', () => {
    const arm = PHASES.map((p) => hammerPose(p).armR);
    expect(Math.min(...arm)).toBeGreaterThan(1.3);
    expect(Math.max(...arm)).toBeLessThan(2.8);
    expect(Math.max(...arm) - Math.min(...arm)).toBeGreaterThan(0.8);
    expect(new Set(PHASES.map((p) => hammerPose(p).armL)).size).toBe(1);
    for (const p of PHASES) expect(hammerPose(p).torsoPitch).toBeLessThan(-0.9);
  });

  it('probes: both hands lift and drive the pole inside a bounded range', () => {
    const arm = PHASES.map((p) => probePose(p).armL);
    expect(Math.min(...arm)).toBeGreaterThan(0.4);
    expect(Math.max(...arm)).toBeLessThan(1.5);
    expect(Math.max(...arm) - Math.min(...arm)).toBeGreaterThan(0.5);
    for (const p of PHASES) expect(Math.abs(probePose(p).armL - probePose(p).armR)).toBeLessThan(0.15);
  });

  it('the hands of a hammering person move a visible distance, never off the model', () => {
    const hands = PHASES.map((p) => ponchoHandAt(hammerPose(p), 'R'));
    const top = Math.max(...hands.map((h) => h[1]));
    const bottom = Math.min(...hands.map((h) => h[1]));
    expect(top - bottom).toBeGreaterThan(0.15);
    for (const h of hands) expect(h.every(Number.isFinite) && h[1] > 0 && h[1] < 1.1).toBe(true);
  });

  it('lifts the person only as much as the open legs need (a heel can dip a little, never more)', () => {
    expect(ponchoPoseLift(standPose())).toBeCloseTo(0, 6);
    for (const action of PERSON_ACTIONS) for (const phase of PHASES) expect(ponchoPoseLift(ponchoPose(action, phase))).toBeGreaterThan(-0.01);
  });
});

describe('people of Poncho: parka colors', () => {
  const colorsOf = (v: (typeof PERSON_VARIANTS)[number]) => new Set(ponchoPersonParts(v).torso.map((t) => t[3]));

  it('uses the orange of the book as the base and has a red and a navy-trimmed variation', () => {
    expect(colorsOf('orange').has(VOXEL_PALETTE.ORANGE)).toBe(true);
    expect(colorsOf('orange').has(VOXEL_PALETTE.RED)).toBe(false);
    expect(colorsOf('red').has(VOXEL_PALETTE.RED)).toBe(true);
    expect(colorsOf('red').has(VOXEL_PALETTE.ORANGE)).toBe(false);
    expect(colorsOf('orangeNavy').has(VOXEL_PALETTE.ORANGE)).toBe(true);
    expect(colorsOf('orangeNavy').has(VOXEL_PALETTE.RED_DARK)).toBe(false);
  });

  it('keeps the shape: only the colors change, and the parts are cached', () => {
    const a = ponchoPersonParts('orange');
    const b = ponchoPersonParts('red');
    expect(b.torso.length).toBe(a.torso.length);
    expect(b.torso.map((t) => t.slice(0, 3))).toEqual(a.torso.map((t) => t.slice(0, 3)));
    expect(ponchoPersonParts('red')).toBe(b);
  });
});

describe('people of Poncho: footprints', () => {
  it('lays alternating boot prints along a straight line, on a flat floor', () => {
    const tris = ponchoFootprints([0, 0], 0, 6, 0.3, () => 0);
    expect(tris.length).toBeGreaterThan(0);
    expect(tris.length % 6).toBe(0);
    const per = tris.length / 6;
    const zs = Array.from({ length: 6 }, (_, i) => tris.slice(i * per, (i + 1) * per).flatMap(([a, b, c]) => [a[2], b[2], c[2]]).reduce((s, v) => s + v, 0) / (per * 3));
    expect(zs[0]).toBeLessThan(0);
    expect(zs[1]).toBeGreaterThan(0);
    expect(zs[2]).toBeLessThan(0);
    for (const t of tris) expect(t.slice(0, 3).flat().every(Number.isFinite)).toBe(true);
    const xs = tris.flatMap(([a, b, c]) => [a[0], b[0], c[0]]);
    expect(Math.max(...xs)).toBeGreaterThan(1.4);
  });
});

describe('people of Poncho: the harness belt (book p. 9) and tending a dog', () => {
  const hip = 0.44;

  it('has a belt round the waist, wider than the parka there, with a buckle, between the hips and the ribs', () => {
    const tris = buildBeltTris();
    const pts = tris.flatMap(([a, b, c]) => [a, b, c]);
    expect(tris.length).toBeGreaterThan(20);
    for (const p of pts) expect(p.every(Number.isFinite)).toBe(true);
    expect(Math.min(...pts.map((p) => p[1]))).toBeGreaterThanOrEqual(BELT_Y[0] - 1e-9);
    expect(Math.max(...pts.map((p) => p[1]))).toBeLessThanOrEqual(BELT_Y[1] + 1e-9);
    expect(Math.max(...pts.map((p) => p[0]))).toBeGreaterThan(BELT_RADIUS[0]);
    expect(Math.max(...pts.map((p) => Math.abs(p[2])))).toBeGreaterThan(BELT_RADIUS[1] * 0.95);
    expect(new Set(tris.map((t) => t[3])).size).toBeGreaterThanOrEqual(2);
  });

  it('ties the line on the front of the belt, at the waist, not at the feet', () => {
    const w = ponchoWaistAt(standPose());
    expect(w[0]).toBeGreaterThan(BELT_RADIUS[0]);
    expect(w[1]).toBeGreaterThan(hip - 0.05);
    expect(w[1]).toBeLessThan(hip + 0.15);
    expect(w[2]).toBe(0);
  });

  it('follows the lean of the torso and the lift of the legs: the same distance from the hips in every pose, and always at the waist', () => {
    const rest = ponchoWaistAt(standPose());
    const reach = Math.hypot(rest[0], rest[1] - hip);
    for (const action of PERSON_ACTIONS) {
      for (const phase of PHASES) {
        const pose = ponchoPose(action, phase);
        const w = ponchoWaistAt(pose);
        expect(w.every(Number.isFinite)).toBe(true);
        // The pivot of the torso is the hips, which are lifted with the person.
        expect(Math.hypot(w[0], w[1] - ponchoPoseLift(pose) - hip)).toBeCloseTo(reach, 6);
        expect(w[1]).toBeGreaterThan(0.2);
        expect(w[1]).toBeLessThan(0.8);
      }
    }
    // Leaning forward (hauling) it goes forward and down.
    const lean = ponchoWaistAt({ ...standPose(), torsoPitch: -0.45 });
    expect(lean[1]).toBeLessThan(rest[1]);
  });

  it('tends bent over with the hands low in front, working a little', () => {
    const a = tendPose(0);
    const b = tendPose(Math.PI / 2);
    expect(a.torsoPitch).toBeLessThan(-0.4);
    expect(a.armL).not.toBe(b.armL);
    const hand = ponchoHandAt(a, 'L');
    expect(hand[0]).toBeGreaterThan(0.2);
    expect(hand[1]).toBeLessThan(0.7);
  });
});

describe('someone who waits is not frozen', () => {
  it('sways a little, never moves the feet and never leans or swings past IDLE_SWAY', () => {
    const swings = new Set<number>();
    for (let k = 0; k < 24; k++) {
      const pose = idlePose((k / 24) * Math.PI * 2);
      swings.add(Math.round(pose.armL * 1000));
      expect(pose.legL).toBe(0);
      expect(pose.legR).toBe(0);
      expect(Math.abs(pose.armL)).toBeLessThanOrEqual(IDLE_SWAY);
      expect(Math.abs(pose.torsoPitch)).toBeLessThanOrEqual(IDLE_SWAY);
    }
    expect(swings.size).toBeGreaterThan(4);
  });
  it('stands on the ground like the still pose', () => {
    expect(ponchoPoseLift(idlePose(1.3))).toBeCloseTo(0, 6);
  });
});

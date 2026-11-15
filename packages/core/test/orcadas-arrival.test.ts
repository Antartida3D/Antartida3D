import { describe, expect, it } from 'vitest';
import {
  ARRIVAL_SECONDS,
  DEPARTURE_SECONDS,
  arrivalFinalPose,
  arrivalMonth,
  arrivalScene,
  helicopterDeparture,
  helicopterLanding,
  zodiacApproach,
  zodiacDeparture,
  type ArrivalId,
} from '../src/orcadas-arrival.ts';
import { helicopterOnPad } from '../src/orcadas.ts';

describe('arrivalMonth', () => {
  const transports: readonly ArrivalId[] = ['ship', 'helicopter'];

  it('keeps in-season months (November to March) unchanged for both transports', () => {
    for (const arrival of transports) {
      for (const month of [11, 12, 1, 2, 3]) {
        expect(arrivalMonth(arrival, month)).toBe(month);
        expect(helicopterOnPad(arrivalMonth(arrival, month))).toBe(true);
      }
    }
  });

  it('snaps out-of-season months to the closest visit-season month and breaks July ties forward to November', () => {
    const expected: Record<number, number> = {
      4: 3,
      5: 3,
      6: 3,
      7: 11,
      8: 11,
      9: 11,
      10: 11,
    };

    for (const arrival of transports) {
      for (const [month, target] of Object.entries(expected)) {
        expect(arrivalMonth(arrival, Number(month))).toBe(target);
      }
    }
  });

  it('handles Date inputs across year boundaries (December to January) and July', () => {
    expect(arrivalMonth('ship', new Date(2026, 11, 20))).toBe(12);
    expect(arrivalMonth('helicopter', new Date(2027, 0, 5))).toBe(1);
    expect(arrivalMonth('ship', new Date(2026, 6, 15))).toBe(11);
    expect(arrivalMonth('helicopter', new Date(2026, 4, 10))).toBe(3);

    // Out-of-range numeric months wrap modulo 12, matching orcadas.ts
    expect(arrivalMonth('ship', 0)).toBe(12);
    expect(arrivalMonth('ship', 13)).toBe(1);
    expect(arrivalMonth('ship', 16)).toBe(3);
  });
});

describe('arrivalScene', () => {
  it('identifies arriving and stationary transports in visit season', () => {
    expect(arrivalScene('ship', 12)).toEqual({
      month: 12,
      arriving: 'ship',
      stationary: 'helicopter',
      helicopterOnPad: true,
    });
    expect(arrivalScene('helicopter', 1)).toEqual({
      month: 1,
      arriving: 'helicopter',
      stationary: 'ship',
      helicopterOnPad: true,
    });
  });

  it('hides stationary helicopter out of season for ship arrival, but keeps helicopter when arriving by helicopter', () => {
    expect(arrivalScene('ship', 7)).toEqual({
      month: 7,
      arriving: 'ship',
      stationary: null,
      helicopterOnPad: false,
    });
    expect(arrivalScene('helicopter', 7)).toEqual({
      month: 7,
      arriving: 'helicopter',
      stationary: 'ship',
      helicopterOnPad: true,
    });
    expect(arrivalScene('ship', 13).month).toBe(1);
  });
});

describe('zodiacApproach and helicopterLanding', () => {
  it('defines a positive ARRIVAL_SECONDS duration', () => {
    expect(ARRIVAL_SECONDS).toBeGreaterThan(0);
  });

  it('zodiacApproach starts in the bay, eases monotonically, and lands at exact final pose with zero speed', () => {
    const start = zodiacApproach(0);
    const early = zodiacApproach(ARRIVAL_SECONDS * 0.25);
    const late = zodiacApproach(ARRIVAL_SECONDS * 0.85);
    const end = zodiacApproach(ARRIVAL_SECONDS);
    const pastEnd = zodiacApproach(ARRIVAL_SECONDS * 2);

    expect(start.z).toBeGreaterThan(0);
    expect(start.height).toBeLessThan(0);
    expect(start.speed).toBe(1);

    expect(early.z).toBeLessThan(start.z);
    expect(late.z).toBeLessThan(early.z);
    expect(late.height).toBeGreaterThan(start.height);
    expect(late.speed).toBeLessThan(early.speed);
    expect(late.speed).toBeGreaterThan(0);

    expect(end).toEqual({ x: 0, z: 0, height: 0, heading: 0, speed: 0 });
    expect(pastEnd).toEqual(end);
    expect(zodiacApproach(-1)).toEqual(start);
  });

  it('helicopterLanding descends smoothly from offset and settles at exact final pose with zero speed', () => {
    const start = helicopterLanding(0);
    const mid = helicopterLanding(ARRIVAL_SECONDS * 0.5);
    const end = helicopterLanding(ARRIVAL_SECONDS);
    const pastEnd = helicopterLanding(ARRIVAL_SECONDS + 5);

    expect(start.height).toBeGreaterThan(0);
    expect(Math.hypot(start.x, start.z)).toBeGreaterThan(0);
    expect(start.speed).toBe(1);

    expect(mid.height).toBeLessThan(start.height);
    expect(mid.height).toBeGreaterThan(0);
    expect(Math.hypot(mid.x, mid.z)).toBeLessThan(Math.hypot(start.x, start.z));
    expect(mid.speed).toBeLessThan(start.speed);
    expect(mid.speed).toBeGreaterThan(0);

    expect(end).toEqual({ x: 0, z: 0, height: 0, heading: 0, speed: 0 });
    expect(pastEnd).toEqual(end);
  });

  it('supports custom world endpoints and shortest-angle heading interpolation', () => {
    const to = { x: 9.4, z: 0, height: 0.4, heading: -Math.PI + 0.1 };
    const from = { x: 5.9, z: 10.5, height: 5.6, heading: Math.PI - 0.1 };

    const start = helicopterLanding(0, { from, to });
    const mid = helicopterLanding(ARRIVAL_SECONDS / 2, { from, to });
    const end = helicopterLanding(ARRIVAL_SECONDS, { from, to });

    expect(start.x).toBe(from.x);
    expect(start.z).toBe(from.z);
    expect(start.height).toBe(from.height);
    expect(Math.abs(mid.heading)).toBeGreaterThan(3); // crosses +/-PI, does not turn through 0
    expect(end).toEqual({ ...to, speed: 0 });
  });

  it('jumps directly to final pose with zero speed under reduced motion', () => {
    expect(zodiacApproach(0, { reduced: true })).toEqual({
      x: 0,
      z: 0,
      height: 0,
      heading: 0,
      speed: 0,
    });
    expect(helicopterLanding(ARRIVAL_SECONDS * 0.3, { reduced: true })).toEqual({
      x: 0,
      z: 0,
      height: 0,
      heading: 0,
      speed: 0,
    });

    const customTo = { x: 2.4, z: 3.6, height: 0.1, heading: 0.3 };
    expect(zodiacApproach(0, { to: customTo, reduced: true })).toEqual({
      ...customTo,
      speed: 0,
    });
    expect(arrivalFinalPose(customTo)).toEqual({ ...customTo, speed: 0 });
  });
});

function forwardDot(
  prev: { x: number; z: number },
  next: { x: number; z: number; heading: number }
): number {
  const dx = next.x - prev.x;
  const dz = next.z - prev.z;
  const len = Math.hypot(dx, dz);
  if (len < 1e-9) return 0;
  return (dx * Math.cos(next.heading) + dz * -Math.sin(next.heading)) / len;
}

describe('zodiacDeparture and helicopterDeparture', () => {
  it('defines a short positive DEPARTURE_SECONDS duration', () => {
    expect(DEPARTURE_SECONDS).toBeGreaterThan(0);
    expect(DEPARTURE_SECONDS).toBeLessThan(ARRIVAL_SECONDS);
  });

  it('zodiacDeparture starts at beach rest, unbeaches slightly, turns in place, then accelerates forward into the bay', () => {
    const bRotY = 0.3;
    const to = { x: 2.4, z: 3.6, height: 0.12, heading: bRotY };
    const from = {
      x: to.x - 8 * Math.cos(bRotY),
      z: to.z - 8 * -Math.sin(bRotY),
      height: -0.025,
      heading: bRotY,
    };
    const opts = { from, to, reduced: false };

    const start = zodiacDeparture(0, opts);
    expect(start).toEqual({ ...to, speed: 0 });

    const unbeach = zodiacDeparture(DEPARTURE_SECONDS * 0.16, opts);
    const turned = zodiacDeparture(DEPARTURE_SECONDS * 0.48, opts);
    const lateA = zodiacDeparture(DEPARTURE_SECONDS * 0.65, opts);
    const lateB = zodiacDeparture(DEPARTURE_SECONDS * 0.9, opts);
    const end = zodiacDeparture(DEPARTURE_SECONDS, opts);

    // Short unbeach drops to water height and clears the shore while still facing the beach
    expect(unbeach.height).toBeCloseTo(from.height, 6);
    expect(unbeach.heading).toBeCloseTo(bRotY, 6);
    const unbeachDist = Math.hypot(unbeach.x - to.x, unbeach.z - to.z);
    expect(unbeachDist).toBeGreaterThan(0);
    expect(unbeachDist).toBeLessThan(1.5);

    // Turns in place toward the bay (opposite arrival heading) before advancing further
    expect(turned.x).toBeCloseTo(unbeach.x, 6);
    expect(turned.z).toBeCloseTo(unbeach.z, 6);
    expect(Math.abs(Math.cos(turned.heading) + Math.cos(bRotY))).toBeLessThan(1e-6);
    expect(Math.abs(-Math.sin(turned.heading) - Math.sin(bRotY))).toBeLessThan(1e-6);

    // Final leg moves forward aligned with heading (stern trails behind) and never reverses
    expect(forwardDot(turned, lateA)).toBeCloseTo(1, 5);
    expect(forwardDot(lateA, lateB)).toBeCloseTo(1, 5);
    expect(forwardDot(lateB, end)).toBeCloseTo(1, 5);
    expect(lateB.speed).toBeGreaterThan(lateA.speed);
    expect(end.x).toBeCloseTo(from.x, 6);
    expect(end.z).toBeCloseTo(from.z, 6);
    expect(end.height).toBeCloseTo(from.height, 6);

    // No reverse movement after the short unbeach
    let prev = unbeach;
    for (let i = 17; i <= 100; i++) {
      const cur = zodiacDeparture((DEPARTURE_SECONDS * i) / 100, opts);
      const stepDot = (cur.x - prev.x) * Math.cos(cur.heading) + (cur.z - prev.z) * -Math.sin(cur.heading);
      expect(stepDot).toBeGreaterThanOrEqual(-1e-9);
      prev = cur;
    }
  });

  it('zodiacDeparture aligns default-offset departure heading with bay travel direction', () => {
    const start = zodiacDeparture(0, { reduced: false });
    const lateA = zodiacDeparture(DEPARTURE_SECONDS * 0.65, { reduced: false });
    const lateB = zodiacDeparture(DEPARTURE_SECONDS * 0.9, { reduced: false });
    const end = zodiacDeparture(DEPARTURE_SECONDS, { reduced: false });

    expect(start).toEqual({ x: 0, z: 0, height: 0, heading: 0, speed: 0 });
    expect(forwardDot(lateA, lateB)).toBeCloseTo(1, 5);
    expect(end.x).toBe(0);
    expect(end.z).toBe(8);
  });

  it('helicopterDeparture lifts off vertically, turns in the air, then climbs forward', () => {
    const to = { x: 0, z: 0, height: 0.088, heading: 0 };
    const opts = { to, reduced: false };

    const start = helicopterDeparture(0, opts);
    expect(start).toEqual({ ...to, speed: 0 });

    const liftoff = helicopterDeparture(DEPARTURE_SECONDS * 0.24, opts);
    const turned = helicopterDeparture(DEPARTURE_SECONDS * 0.52, opts);
    const midFly = helicopterDeparture(DEPARTURE_SECONDS * 0.72, opts);
    const lateFly = helicopterDeparture(DEPARTURE_SECONDS * 0.92, opts);
    const end = helicopterDeparture(DEPARTURE_SECONDS, opts);

    // Vertical liftoff stays over the pad before turning
    expect(liftoff.x).toBe(to.x);
    expect(liftoff.z).toBe(to.z);
    expect(liftoff.height).toBeGreaterThan(to.height);
    expect(liftoff.heading).toBe(to.heading);

    // Turns in the air over the pad before horizontal flight
    expect(turned.x).toBe(to.x);
    expect(turned.z).toBe(to.z);
    expect(turned.height).toBeGreaterThan(to.height);
    expect(turned.heading).not.toBe(to.heading);

    // Climbs forward aligned with heading and never moves backward
    expect(forwardDot(turned, midFly)).toBeCloseTo(1, 5);
    expect(forwardDot(midFly, lateFly)).toBeCloseTo(1, 5);
    expect(forwardDot(lateFly, end)).toBeCloseTo(1, 5);
    expect(midFly.height).toBeGreaterThan(turned.height);
    expect(lateFly.height).toBeGreaterThan(midFly.height);
    expect(end.height).toBeGreaterThan(lateFly.height);
    expect(end.x).toBeCloseTo(-3.5, 6);
    expect(end.z).toBeCloseTo(10.5, 6);

    let prev = start;
    for (let i = 1; i <= 100; i++) {
      const cur = helicopterDeparture((DEPARTURE_SECONDS * i) / 100, opts);
      const stepDot = (cur.x - prev.x) * Math.cos(cur.heading) + (cur.z - prev.z) * -Math.sin(cur.heading);
      expect(stepDot).toBeGreaterThanOrEqual(-1e-9);
      prev = cur;
    }
  });

  it('turns via the shortest angular path across +/-PI and jumps to final pose under reduced motion', () => {
    const to = { x: 0, z: 0, height: 0, heading: Math.PI - 0.1 };
    const from = { x: -10, z: 1, height: 0, heading: 0 };
    const midTurn = zodiacDeparture(DEPARTURE_SECONDS * 0.32, { from, to, reduced: false });
    expect(Math.abs(midTurn.heading)).toBeGreaterThan(3);

    const reducedBoat = zodiacDeparture(0, { from, to, reduced: true });
    expect(reducedBoat.x).toBe(from.x);
    expect(reducedBoat.z).toBe(from.z);
    expect(reducedBoat.speed).toBe(0);

    const reducedHeli = helicopterDeparture(0, { to: { x: 0, z: 0, height: 0.1, heading: 0 }, reduced: true });
    expect(reducedHeli.x).toBeCloseTo(-3.5, 6);
    expect(reducedHeli.z).toBeCloseTo(10.5, 6);
    expect(reducedHeli.speed).toBe(0);
  });
});

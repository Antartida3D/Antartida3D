import { describe, expect, it } from 'vitest';
import {
  PIN_SAME_PLACE, PONCHO_MILESTONES, PONCHO_SEGMENTS, advanceVoyage, buildCurve, buildTrip, closeVoyageCard, expeditionAt, findTransport, project,
  quizScore, startVoyage, vehicleAt, voyageArrived, voyageAt, voyageLength, voyagePinRead, voyageProgress, voyageStops,
} from '../src/index.ts';

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

describe('buildCurve', () => {
  const points = [project(-57, -63.4), project(-60.25, -65.07), project(-67.1, -68.13)];
  const curve = buildCurve(points);

  it('starts and ends on the first and last point', () => {
    expect(dist(curve.at(0), points[0])).toBeLessThan(1e-6);
    expect(dist(curve.at(1), points[2])).toBeLessThan(1e-6);
  });

  it('clamps the fraction and is deterministic', () => {
    expect(curve.at(-1)).toEqual(curve.at(0));
    expect(curve.at(2)).toEqual(curve.at(1));
    expect(curve.at(0.37)).toEqual(curve.at(0.37));
  });

  it('has a positive length and an SVG path that starts at the first point', () => {
    expect(curve.length).toBeGreaterThan(0);
    expect(curve.path.startsWith('M')).toBe(true);
  });
});

describe('the trip of Poncho (kind dogs)', () => {
  it('is a transport of its own, not one of the Ushuaia picker', () => {
    expect(findTransport('poncho').kind).toBe('dogs');
  });

  it('runs from the first to the last waypoint of its route', () => {
    const first = PONCHO_SEGMENTS[0].waypoints[0];
    const lastLeg = PONCHO_SEGMENTS[PONCHO_SEGMENTS.length - 1].waypoints;
    const last = lastLeg[lastLeg.length - 1];
    expect(dist(voyageAt('dogs', 0), project(first[0], first[1]))).toBeLessThan(1e-6);
    expect(dist(voyageAt('dogs', 1), project(last[0], last[1]))).toBeLessThan(1e-6);
    expect(voyageLength('dogs')).toBeGreaterThan(0);
  });

  it('stops at every milestone of Poncho, in order, and at no milestone of Ushuaia', () => {
    const stops = voyageStops('dogs');
    expect(stops.map((s) => s.milestone.id)).toEqual(PONCHO_MILESTONES.map((m) => m.id));
    expect(stops[0].t).toBe(0);
    for (let i = 1; i < stops.length; i++) expect(stops[i].t).toBeGreaterThanOrEqual(stops[i - 1].t);
  });

  it('opens the first card at departure and one card per milestone while the user advances', () => {
    let s = startVoyage('poncho');
    expect(s.kind).toBe('dogs');
    expect(s.card).toBe(0);
    let cards = 1;
    for (let guard = 0; guard < 10000 && !voyageArrived(s); guard++) {
      s = s.card >= 0 ? closeVoyageCard(s) : advanceVoyage(s, 0.5);
      if (s.card >= 0 && s.card + 1 > cards) cards = s.card + 1;
    }
    expect(voyageArrived(s)).toBe(true);
    expect(cards).toBe(PONCHO_MILESTONES.length);
  });

  it('estimates the km of the drawn route', () => {
    const { km, totalKm } = voyageProgress('poncho', 1);
    expect(totalKm).toBeGreaterThan(500);
    expect(km).toBeCloseTo(totalKm, 5);
  });

  it('answers the notes and questions of a milestone and scores an empty quiz', () => {
    const { notes, question } = expeditionAt(PONCHO_MILESTONES[0].id, 'poncho');
    expect(Array.isArray(notes)).toBe(true);
    expect(question === null || typeof question.prompt === 'string').toBe(true);
    expect(quizScore('poncho', {}).right).toBe(0);
  });
});

describe('legs of a trip', () => {
  const on = (from: [number, number], to: [number, number]) => (u: number) => ({ x: from[0] + (to[0] - from[0]) * u, y: from[1] + (to[1] - from[1]) * u });
  // Sled 0 -> 10 (60 s), ship 10 -> 40 (30 s), sled 40 -> 50 (30 s): the legs join at the ports.
  const trip = buildTrip([
    { vehicle: 'sled', seconds: 60, at: on([0, 0], [10, 0]) },
    { vehicle: 'ship', seconds: 30, at: on([10, 0], [40, 0]) },
    { vehicle: 'sled', seconds: 30, at: on([40, 0], [50, 0]) },
  ]);

  it('gives each leg the share of the trip that its seconds are of the total', () => {
    expect(trip.seconds).toBe(120);
    expect(trip.legCount).toBe(3);
    expect(trip.legRange(0)).toEqual([0, 0.5]);
    expect(trip.legRange(1)).toEqual([0.5, 0.75]);
    expect(trip.legRange(2)).toEqual([0.75, 1]);
  });

  it('walks each leg from its start to its end, and joins them without a jump', () => {
    expect(trip.at(0)).toEqual({ x: 0, y: 0 });
    expect(trip.at(0.25).x).toBeCloseTo(5);
    expect(trip.at(0.5).x).toBeCloseTo(10);
    expect(trip.at(0.625).x).toBeCloseTo(25);
    expect(trip.at(0.75).x).toBeCloseTo(40);
    expect(trip.at(1).x).toBeCloseTo(50);
    let before = trip.at(0).x;
    for (let i = 1; i <= 1000; i++) {
      const x = trip.at(i / 1000).x;
      expect(x).toBeGreaterThanOrEqual(before - 1e-9);
      before = x;
    }
  });

  it('changes vehicle with the leg and clamps outside the trip', () => {
    expect(trip.vehicleAt(0.1)).toBe('sled');
    expect(trip.vehicleAt(0.6)).toBe('ship');
    expect(trip.vehicleAt(0.9)).toBe('sled');
    expect(trip.vehicleAt(-1)).toBe('sled');
    expect(trip.vehicleAt(2)).toBe('sled');
    expect(trip.at(-1)).toEqual(trip.at(0));
    expect(trip.at(2)).toEqual(trip.at(1));
  });

  it('keeps the trips of Ushuaia as a single leg of their own vehicle', () => {
    expect(vehicleAt('ship', 0.5)).toBe('ship');
    expect(vehicleAt('plane', 0.5)).toBe('plane');
  });

  it('joins the legs of the dogs at a port: each one ends where the next one starts', () => {
    const ends = PONCHO_SEGMENTS.map((leg) => ({ first: leg.waypoints[0], last: leg.waypoints[leg.waypoints.length - 1], vehicle: leg.vehicle }));
    for (let i = 1; i < ends.length; i++) expect(ends[i].first).toEqual(ends[i - 1].last);
    for (const leg of ends) expect(['sled', 'ship']).toContain(leg.vehicle);
  });
});

describe('pins of the trip of Poncho that share a place (#309)', () => {
  const stops = voyageStops('dogs');
  const id = (i: number) => stops[i].milestone.id;
  const last = stops.length - 1;

  it('has the ship to Belgrano and the last stop on the same place as the departure, at Esperanza', () => {
    for (const i of [3, last]) expect(Math.hypot(stops[i].pin.x - stops[0].pin.x, stops[i].pin.y - stops[0].pin.y)).toBeLessThan(PIN_SAME_PLACE);
  });

  it('draws them grey once the first stop is read, until each is the next stop', () => {
    const opened = [id(0)];
    // Reading the first stop: the next one is the second; the ones at Esperanza are not next yet.
    expect(voyagePinRead('dogs', 3, opened, 1)).toBe(true);
    expect(voyagePinRead('dogs', last, opened, 1)).toBe(true);
    // A pin elsewhere, ahead and unread, stays unread.
    expect(voyagePinRead('dogs', 4, opened, 1)).toBe(false);
    // Each one turns unread (yellow) when it is the next stop, and read once its card was opened.
    expect(voyagePinRead('dogs', 3, opened, 3)).toBe(false);
    const all = stops.slice(0, last).map((s) => s.milestone.id);
    expect(voyagePinRead('dogs', last, all, last)).toBe(false);
    expect(voyagePinRead('dogs', last, [...all, id(last)], last)).toBe(true);
  });

  it('keeps the rule of the trips from Ushuaia: grey only once read', () => {
    const ushuaia = voyageStops('ship');
    const i = 1;
    expect(voyagePinRead('ship', i, [ushuaia[0].milestone.id], 0)).toBe(false);
    expect(voyagePinRead('ship', i, [ushuaia[i].milestone.id], 0)).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import {
  PONCHO_MILESTONES, PONCHO_ROUTE_WAYPOINTS, advanceVoyage, buildCurve, closeVoyageCard, expeditionAt, findTransport, project,
  quizScore, startVoyage, voyageArrived, voyageAt, voyageLength, voyageProgress, voyageStops,
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

describe('the trip of Poncho (kind sled)', () => {
  it('is a transport of its own, not one of the Ushuaia picker', () => {
    expect(findTransport('poncho').kind).toBe('sled');
  });

  it('runs from the first to the last waypoint of its route', () => {
    const first = PONCHO_ROUTE_WAYPOINTS[0];
    const last = PONCHO_ROUTE_WAYPOINTS[PONCHO_ROUTE_WAYPOINTS.length - 1];
    expect(dist(voyageAt('sled', 0), project(first[0], first[1]))).toBeLessThan(1e-6);
    expect(dist(voyageAt('sled', 1), project(last[0], last[1]))).toBeLessThan(1e-6);
    expect(voyageLength('sled')).toBeGreaterThan(0);
  });

  it('stops at every milestone of Poncho, in order, and at no milestone of Ushuaia', () => {
    const stops = voyageStops('sled');
    expect(stops.map((s) => s.milestone.id)).toEqual(PONCHO_MILESTONES.map((m) => m.id));
    expect(stops[0].t).toBe(0);
    for (let i = 1; i < stops.length; i++) expect(stops[i].t).toBeGreaterThanOrEqual(stops[i - 1].t);
  });

  it('opens the first card at departure and one card per milestone while the user advances', () => {
    let s = startVoyage('poncho');
    expect(s.kind).toBe('sled');
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

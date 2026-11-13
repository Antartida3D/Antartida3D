import { describe, expect, it } from 'vitest';
import { AVAILABLE_COUNT, PONCHO_POINT, PONCHO_ROUTE_WAYPOINTS, PTS, VOYAGE_POINT, VOYAGE_POINTS, project, voyageAt } from '../src/index.ts';

describe('expedition points', () => {
  it('offers Poncho as an available expedition at Base Esperanza, where his trip starts', () => {
    expect(PONCHO_POINT.tier).toBe('A');
    expect(PONCHO_POINT.place).toContain('Base Esperanza');
    const [lon, lat] = PONCHO_ROUTE_WAYPOINTS[0];
    expect(PONCHO_POINT).toMatchObject(project(lon, lat));
    const start = voyageAt('sled', 0);
    expect(Math.hypot(start.x - PONCHO_POINT.x, start.y - PONCHO_POINT.y)).toBeLessThan(1);
  });

  it('counts Orcadas, Ushuaia and Poncho as the available expeditions', () => {
    expect(PTS.filter((p) => p.tier === 'A').map((p) => p.id).sort()).toEqual(['campana', 'orcadas', 'poncho']);
    expect(AVAILABLE_COUNT).toBe(3);
  });

  it('lists the points whose expedition is a trip over the map', () => {
    expect(VOYAGE_POINTS.map((p) => p.id)).toEqual([VOYAGE_POINT.id, PONCHO_POINT.id]);
  });
});

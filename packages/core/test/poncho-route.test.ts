import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ESPERANZA, ESPERANZA_PORT, FILCHNER_PORT, PONCHO_SEGMENTS, buildCurve, heightAt, parseTerrainMesh, project } from '../src/index.ts';

const buf = readFileSync(join(import.meta.dirname, '../src/assets/terrain-mesh-hi.bin'));
const terrain = parseTerrainMesh(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));

/** Contract of the legs: index -> vehicle (see the comment above PONCHO_SEGMENTS in content/poncho-route.ts). */
// The trip ends with the last sled patrol at Esperanza: the ship to Ushuaia is told in the last stop, not travelled (DEC-223).
const CONTRACT = ['sled', 'ship', 'sled', 'ship', 'sled'] as const;

const SAMPLES = 1000;
/** Height of the sled above the sea that the relief must keep (with the ×10 exaggeration, lower ground looks like water). */
const SLED_MIN_HEIGHT = 40;
/** Heights (m) along the leg at SAMPLES + 1 points, with the share t (0..1) of each one. */
function profile(index: number): { t: number; height: number }[] {
  const curve = buildCurve(PONCHO_SEGMENTS[index].waypoints.map(([lon, lat]) => project(lon, lat)));
  return Array.from({ length: SAMPLES + 1 }, (_, i) => {
    const p = curve.at(i / SAMPLES);
    return { t: i / SAMPLES, height: heightAt(p.x, p.y, terrain) };
  });
}
/** Share of the samples of the leg, without its first and last 5 % (the port, where the coast gives transition values), on its own medium. */
function shareOnItsMedium(index: number): number {
  const leg = PONCHO_SEGMENTS[index];
  const inner = profile(index).filter(({ t }) => t >= 0.05 && t <= 0.95);
  // By the convention of the app, height <= 0 is sea and > 0 is land or ice (ice shelves count as ice).
  const on = inner.filter(({ height }) => (leg.vehicle === 'sled' ? height > 0 : height <= 0)).length;
  return on / inner.length;
}

describe('the contract text of the legs', () => {
  it('describes every leg with its index and vehicle in the route file', () => {
    const source = readFileSync(join(import.meta.dirname, '../src/content/poncho-route.ts'), 'utf8');
    CONTRACT.forEach((vehicle, index) => expect(source).toMatch(new RegExp(`^ \\* +${index} ${vehicle}: `, 'm')));
  });
});

describe('the legs of the trip of Poncho', () => {
  it('alternate the vehicle as the contract says', () => {
    expect(PONCHO_SEGMENTS.map((leg) => leg.vehicle)).toEqual(CONTRACT);
  });

  it('give every ship leg at least 10 seconds', () => {
    for (const leg of PONCHO_SEGMENTS) if (leg.vehicle === 'ship') expect(leg.seconds).toBeGreaterThanOrEqual(10);
  });

  it('start at Esperanza and end back at its port, after the last patrol (the way to Ushuaia is told, not travelled: DEC-223)', () => {
    expect(PONCHO_SEGMENTS[0].waypoints[0]).toEqual(ESPERANZA);
    const last = PONCHO_SEGMENTS[PONCHO_SEGMENTS.length - 1];
    expect(last.vehicle).toBe('sled');
    expect(last.waypoints[last.waypoints.length - 1]).toEqual(ESPERANZA_PORT);
  });

  it('end each leg exactly where the next one starts', () => {
    for (let i = 1; i < PONCHO_SEGMENTS.length; i++) {
      const before = PONCHO_SEGMENTS[i - 1].waypoints;
      expect(PONCHO_SEGMENTS[i].waypoints[0], `leg ${i}`).toEqual(before[before.length - 1]);
    }
  });

  it.each(CONTRACT.map((vehicle, index) => [index, vehicle] as const))('leg %i (%s) stays on its medium (the ports apart)', (index, vehicle) => {
    const share = shareOnItsMedium(index);
    expect(share, `${vehicle} leg ${index}: ${(share * 100).toFixed(1)} %`).toBeGreaterThanOrEqual(0.98);
  });

  it.each([0, 2, 4])('keep sled leg %i out of the water at every point, ends included', (index) => {
    const wet = profile(index).filter(({ height }) => height <= 0);
    expect(wet.map(({ t }) => t)).toEqual([]);
  });

  it.each([0, 2, 4])('keep sled leg %i at %i m or more over the sea for at least 85 % of it (the coast apart)', (index) => {
    const inner = profile(index).filter(({ t }) => t >= 0.05 && t <= 0.95);
    const high = inner.filter(({ height }) => height >= SLED_MIN_HEIGHT).length / inner.length;
    expect(high, `sled leg ${index}: ${(high * 100).toFixed(1)} % at ${SLED_MIN_HEIGHT} m or more`).toBeGreaterThanOrEqual(0.85);
  });

  it('put both ports on firm ground (the lowest land next to the sea), as the end of a sled leg and the start of a ship leg', () => {
    for (const port of [ESPERANZA_PORT, FILCHNER_PORT]) {
      const p = project(port[0], port[1]);
      const height = heightAt(p.x, p.y, terrain);
      expect(height, `port ${port.join(', ')}`).toBeGreaterThan(0);
      expect(height).toBeLessThan(20);
    }
    for (const [sled, ship] of [[0, 1], [2, 3]] as const) {
      const before = PONCHO_SEGMENTS[sled].waypoints;
      expect(PONCHO_SEGMENTS[ship].waypoints[0]).toEqual(before[before.length - 1]);
    }
  });

  it('start the ship legs and end them at ports that are the same points as the sled ports', () => {
    expect(PONCHO_SEGMENTS[1].waypoints[0]).toEqual(ESPERANZA_PORT);
    expect(PONCHO_SEGMENTS[1].waypoints.at(-1)).toEqual(FILCHNER_PORT);
    expect(PONCHO_SEGMENTS[3].waypoints[0]).toEqual(FILCHNER_PORT);
    expect(PONCHO_SEGMENTS[3].waypoints.at(-1)).toEqual(ESPERANZA_PORT);
  });
});

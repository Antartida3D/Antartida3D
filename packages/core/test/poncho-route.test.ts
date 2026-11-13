import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ESPERANZA, PONCHO_SEGMENTS, USHUAIA, buildCurve, heightAt, parseTerrainMesh, project } from '../src/index.ts';

const buf = readFileSync(join(import.meta.dirname, '../src/assets/terrain-mesh-hi.bin'));
const terrain = parseTerrainMesh(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));

/** Contract of the legs: index -> vehicle (see the comment above PONCHO_SEGMENTS in content/poncho-route.ts). */
const CONTRACT = ['sled', 'ship', 'sled', 'ship', 'sled', 'ship'] as const;

const SAMPLES = 1000;
/** Share of the samples of the leg, without its first and last 5 % (the port, where the coast gives transition values), on its own medium. */
function shareOnItsMedium(index: number): number {
  const leg = PONCHO_SEGMENTS[index];
  const curve = buildCurve(leg.waypoints.map(([lon, lat]) => project(lon, lat)));
  let on = 0;
  let total = 0;
  for (let i = 0; i <= SAMPLES; i++) {
    const t = i / SAMPLES;
    if (t < 0.05 || t > 0.95) continue;
    const p = curve.at(t);
    const height = heightAt(p.x, p.y, terrain);
    total++;
    // By the convention of the app, height <= 0 is sea and > 0 is land or ice (ice shelves count as ice).
    if (leg.vehicle === 'sled' ? height > 0 : height <= 0) on++;
  }
  return on / total;
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

  it('start at Esperanza and end at Ushuaia', () => {
    expect(PONCHO_SEGMENTS[0].waypoints[0]).toEqual(ESPERANZA);
    const last = PONCHO_SEGMENTS[PONCHO_SEGMENTS.length - 1].waypoints;
    expect(last[last.length - 1]).toEqual(USHUAIA);
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
});

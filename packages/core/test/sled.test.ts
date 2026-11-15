import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  SLED_MARGIN, SLED_MAX_PITCH, SLED_MIN_SIZE, easeToward, heightAt, parseTerrainMesh, sightLift, sledFootprintPose, sledPitch,
  sledRideHeight, sledSize, sledTrot, trotRate, vehicleAt, voyageAt, voyageHeading, worldHeight,
} from '../src/index.ts';

const buf = readFileSync(join(import.meta.dirname, '../src/assets/terrain-mesh-hi.bin'));
const terrain = parseTerrainMesh(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
const realGround = (x: number, y: number) => Math.max(0, worldHeight(heightAt(x, y, terrain)));


describe('sled over the relief', () => {
  it('rides on the ground with a margin proportional to its size, and at 0 on the sea level', () => {
    expect(sledRideHeight(2, 0.5)).toBeCloseTo(2 + 0.5 * SLED_MARGIN);
    expect(sledRideHeight(2, 1)).toBeGreaterThan(sledRideHeight(2, 0.5));
    expect(sledRideHeight(0, 0.5)).toBe(0);
    expect(sledRideHeight(-1, 0.5)).toBe(0);
  });

  it('tilts with the slope, limited, and level without a run', () => {
    expect(sledPitch(1, 1, 0.5)).toBe(0);
    expect(sledPitch(1, 1.1, 0.5)).toBeGreaterThan(0);
    expect(sledPitch(1.1, 1, 0.5)).toBeLessThan(0);
    expect(sledPitch(0, 50, 0.5)).toBe(SLED_MAX_PITCH);
    expect(sledPitch(50, 0, 0.5)).toBe(-SLED_MAX_PITCH);
    expect(sledPitch(0, 1, 0)).toBe(0);
  });

  it('trots faster with more pace and not at all when paused or with reduced motion', () => {
    expect(trotRate(0)).toBe(0);
    expect(trotRate(5)).toBeGreaterThan(trotRate(3));
    expect(trotRate(1000)).toBeLessThanOrEqual(9);
    expect(sledTrot(1.2, 1, 0, false)).toBe(0);
    expect(sledTrot(1.2, 1, 4, true)).toBe(0);
    expect(sledTrot(1.2, 1, 4, false)).toBeGreaterThan(0);
    expect(sledTrot(1.2, 2, 4, false)).toBeCloseTo(2 * sledTrot(1.2, 1, 4, false));
  });

  it('eases without overshooting', () => {
    expect(easeToward(0, 10, 0, 8)).toBe(0);
    const mid = easeToward(0, 10, 0.1, 8);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(10);
    expect(easeToward(0, 10, 100, 8)).toBeCloseTo(10);
  });
});

describe('sled footprint over a wall', () => {
  // A wall across the path: flat ground 1 high for x >= 10, 0 before it.
  const wall = (x: number) => (x >= 10 ? 1 : 0);

  it('rides on the highest ground under its length, not only under its middle', () => {
    const size = 2;
    // Middle at x = 9.5: its front reaches x = 10.5, over the wall.
    const pose = sledFootprintPose((x) => wall(x), 9.5, 0, 0, size);
    expect(pose.height).toBeGreaterThan(wall(9.5) + 0.2);
    expect(pose.pitch).toBeGreaterThan(0);
    // Every station of the belly clears the ground.
    for (let u = -0.5; u <= 0.5; u += 0.05) {
      const belly = pose.height + u * size * Math.sin(pose.pitch);
      expect(belly + 1e-9).toBeGreaterThanOrEqual(wall(9.5 + u * size * Math.cos(pose.pitch)));
    }
  });

  it('is the old height, level, on flat ground, and 0 on the sea', () => {
    const flat = sledFootprintPose(() => 3, 0, 0, 1, 2);
    expect(flat.pitch).toBe(0);
    expect(flat.height).toBeCloseTo(sledRideHeight(3, 2));
    expect(sledFootprintPose(() => 0, 0, 0, 0, 2)).toEqual({ height: 0, pitch: 0 });
  });

  it('nose-up on a rising ground in the heading and nose-down looking the other way', () => {
    const ramp = (x: number) => Math.max(0, x * 0.2);
    expect(sledFootprintPose(ramp, 5, 0, 0, 2).pitch).toBeGreaterThan(0);
    expect(sledFootprintPose(ramp, 5, 0, Math.PI, 2).pitch).toBeLessThan(0);
  });
});

describe('camera over a ridge', () => {
  const eye = { x: 0, y: 0, height: 5 };
  const target = { x: 10, y: 0, height: 1 };

  it('does not lift when the line of sight is clear', () => {
    expect(sightLift(() => 0, eye, target, 0.2)).toBe(0);
  });

  it('lifts enough for the line to clear a ridge, and no more', () => {
    const ridge = (x: number) => (Math.abs(x - 4) < 0.5 ? 4 : 0);
    const lift = sightLift((x) => ridge(x), eye, target, 0.2);
    expect(lift).toBeGreaterThan(0);
    // Higher by `lift`, the line is over the ridge top plus margin where it passes it.
    const f = (10 - 4) / 10;
    const line = target.height + (eye.height + lift - target.height) * f;
    expect(line).toBeGreaterThanOrEqual(4 + 0.2 - 1e-9);
    expect(sightLift((x) => ridge(x), { ...eye, height: eye.height + lift }, target, 0.2)).toBeCloseTo(0, 9);
  });

  it('ignores the ground next to the team itself', () => {
    expect(sightLift((x) => (x > 9.5 ? 3 : 0), eye, target, 0.2)).toBe(0);
  });
});

describe('sled team along the real dogs trip', () => {
  const STEPS = 2000;
  const MAX_WALL = 0.15;
  const TRIPS_SIZES = [sledSize(25), sledSize(60), SLED_MIN_SIZE];

  /** Highest ground over the belly, in team lengths, across the footprint, taken denser than the pose's own samples. */
  function worstWall(height: number, pitch: number, x: number, y: number, heading: number, size: number): number {
    let worst = -Infinity;
    for (let i = -10; i <= 10; i++) {
      const u = i / 20;
      for (let j = -2; j <= 2; j++) {
        const side = (j / 2) * 0.15 * size;
        const gx = x + Math.cos(heading) * u * size * Math.cos(pitch) - Math.sin(heading) * side;
        const gy = y + Math.sin(heading) * u * size * Math.cos(pitch) + Math.cos(heading) * side;
        worst = Math.max(worst, (realGround(gx, gy) - (height + u * size * Math.sin(pitch))) / size);
      }
    }
    return worst;
  }

  /** Old rule: the height under the middle only, the pitch from the ground half a length behind and ahead. */
  function oldPose(x: number, y: number, heading: number, size: number): { height: number; pitch: number } {
    const g = (d: number) => realGround(x + Math.cos(heading) * d * size, y + Math.sin(heading) * d * size);
    return { height: sledRideHeight(realGround(x, y), size), pitch: sledPitch(g(-0.5), g(0.5), size) };
  }

  it('never has the belly under the ground inside its footprint, and the walls it used to hit are gone', () => {
    for (const size of TRIPS_SIZES) {
      let sled = 0;
      let oldWalls = 0;
      let newWalls = 0;
      let worstNew = -Infinity;
      let lift = 0;
      let liftMax = 0;
      for (let i = 0; i <= STEPS; i++) {
        const t = i / STEPS;
        if (vehicleAt('dogs', t) !== 'sled') continue;
        const p = voyageAt('dogs', t);
        const heading = voyageHeading('dogs', t);
        sled++;
        const pose = sledFootprintPose(realGround, p.x, p.y, heading, size);
        const old = oldPose(p.x, p.y, heading, size);
        const wallNew = pose.height > 0 ? worstWall(pose.height, pose.pitch, p.x, p.y, heading, size) : -1;
        const wallOld = old.height > 0 ? worstWall(old.height, old.pitch, p.x, p.y, heading, size) : -1;
        if (wallOld > MAX_WALL) oldWalls++;
        if (wallNew > MAX_WALL) newWalls++;
        worstNew = Math.max(worstNew, wallNew);
        lift += pose.height - old.height;
        liftMax = Math.max(liftMax, pose.height - old.height);
      }
      // Measured: the old rule hit a wall in 2.5-3.5 % of the sled steps; the extra lift is a mean of 0.04-0.05 lengths.
      expect(oldWalls / sled).toBeGreaterThan(newWalls / sled);
      expect(liftMax / size).toBeLessThan(0.7);
      expect(sled).toBeGreaterThan(100);
      expect(newWalls).toBe(0);
      expect(worstNew).toBeLessThanOrEqual(0);
    }
  });
});

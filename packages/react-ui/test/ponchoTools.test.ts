import { describe, expect, it } from 'vitest';
// Break the pre-existing stationModels <-> sightingModels -> penguins import cycle in test isolation.
import '../src/voyage/sightingModels.ts';
import { PONCHO_PHASE_PERIOD, ponchoPose, type PersonAction } from '../src/voyage/ponchoPeople.ts';
import { heldTool } from '../src/voyage/ponchoTools.ts';

const PHASES = Array.from({ length: 13 }, (_, i) => (i / 12) * PONCHO_PHASE_PERIOD);

describe('tools held by the people of Poncho', () => {
  it('has none for the actions that carry nothing', () => {
    for (const action of ['stand', 'walk', 'haul', 'cheer'] as const) expect(heldTool(action, ponchoPose(action === 'cheer' ? 'stand' : action, 0))).toBeNull();
  });

  for (const action of ['probe', 'hammer', 'shovel'] as const satisfies readonly PersonAction[]) {
    it(`${action}: finite shaft of a sensible length that does not go under the snow`, () => {
      for (const phase of PHASES) {
        const tool = heldTool(action, ponchoPose(action, phase))!;
        expect(tool).not.toBeNull();
        for (const v of [...tool.a, ...tool.b, ...tool.head]) expect(Number.isFinite(v)).toBe(true);
        const length = Math.hypot(tool.b[0] - tool.a[0], tool.b[1] - tool.a[1], tool.b[2] - tool.a[2]);
        expect(length).toBeGreaterThan(0.25);
        expect(length).toBeLessThan(1.6);
        expect(Math.min(tool.a[1], tool.b[1])).toBeGreaterThanOrEqual(0);
      }
    });
  }

  it('probe and shovel go into the snow ahead of the hands', () => {
    for (const action of ['probe', 'shovel'] as const) {
      const tool = heldTool(action, ponchoPose(action, 1))!;
      expect(tool.b[1]).toBeLessThan(0.05);
      expect(tool.a[1]).toBeGreaterThan(tool.b[1]);
    }
  });
});

describe('scene poses', () => {
  it('has a pose for every action of the scenes, finite and with the arms up for the cheer', async () => {
    const { SCENE_ACTIONS } = await import('@antartida/core');
    const { PERSON_ACTIONS } = await import('../src/voyage/ponchoPeople.ts');
    const { scenePose } = await import('../src/voyage/ponchoTools.ts');
    // The scene's list is the one of the people plus the cheer (core cannot import react-ui).
    expect([...SCENE_ACTIONS].sort()).toEqual([...PERSON_ACTIONS, 'cheer'].sort());
    for (const action of SCENE_ACTIONS) for (const phase of PHASES) {
      expect(Object.values(scenePose(action, phase)).every(Number.isFinite)).toBe(true);
    }
    expect(scenePose('cheer', 0).armL).toBeGreaterThan(2);
  });
});

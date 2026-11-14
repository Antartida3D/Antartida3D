import { describe, expect, it } from 'vitest';
import { CLAIM_FLAG_MODELS } from '../src/map3d/claimFlagModels.ts';

// The broad white stripe must be above the red at the upper hoist.
// Buckinghamshire Flag Protocol (March 2026), p. 4; see the claims source document.
describe('Union Flag orientation, including the Australian and New Zealand cantons', () => {
  for (const country of ['gb', 'au', 'nz'] as const) {
    it(`${country} keeps the counterchanged red saltire upright in all four quarters`, () => {
      const canton = country === 'gb' ? 1 : .5;
      const sample = (u: number, v: number) => {
        const x = .025 + .63 * u * canton;
        const y = .95 - .315 * v * canton;
        return CLAIM_FLAG_MODELS[country].find(([cx, cy, , sx, sy]) =>
          Math.abs(x - cx) < sx / 2 && Math.abs(y - cy) < sy / 2)?.[6];
      };
      for (const [x, y] of [[.2, .24], [.2, .84], [.8, .16], [.8, .76]]) {
        expect(sample(x, y)).toBe(0xc8102e);
      }
      for (const [x, y] of [[.2, .16], [.2, .76], [.8, .24], [.8, .84]]) {
        expect(sample(x, y)).toBe(0xf7fafb);
      }
    });
  }
});

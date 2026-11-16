import { describe, expect, it } from 'vitest';
import { PIN_HEAD_R, PIN_HEAD_Y, pinPath, pinTangent } from '../src/voyage/pinShape.ts';

describe('shape of the pin of a milestone', () => {
  it('has straight sides that touch the round head', () => {
    const { x, y } = pinTangent(PIN_HEAD_R, 0);
    // The point where they meet is on the head...
    expect(Math.hypot(x, y - PIN_HEAD_Y)).toBeCloseTo(PIN_HEAD_R, 10);
    // ...and the side from the tip (0, 0) is at a right angle to the radius there.
    expect(x * x + y * (y - PIN_HEAD_Y)).toBeCloseTo(0, 10);
  });

  it('draws the same outline as an SVG path, with y down and both sides alike', () => {
    const { x, y } = pinTangent(PIN_HEAD_R, 0);
    const n = (v: number) => +v.toFixed(4);
    expect(pinPath(PIN_HEAD_R, 0)).toBe(`M0 0L${n(x)} ${n(-y)}A${PIN_HEAD_R} ${PIN_HEAD_R} 0 1 0 ${n(-x)} ${n(-y)}Z`);
  });
});

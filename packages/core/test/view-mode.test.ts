import { describe, expect, it } from 'vitest';
import { initialViewMode, MAP_2D_ENABLED } from '../src/view-mode.ts';

const base = { webgl: true, saved: null, reduced: false, saveData: false };

describe('initialViewMode', () => {
  it('keeps the 2D map off for now (#227)', () => {
    expect(MAP_2D_ENABLED).toBe(false);
  });

  it('with the 2D map off, starts in 3D whenever there is WebGL', () => {
    expect(initialViewMode(base, false)).toBe('3d');
    expect(initialViewMode({ ...base, saved: '2d' }, false)).toBe('3d');
    expect(initialViewMode({ ...base, reduced: true }, false)).toBe('3d');
    expect(initialViewMode({ ...base, saveData: true }, false)).toBe('3d');
  });

  it('without WebGL always starts in 2D', () => {
    expect(initialViewMode({ ...base, webgl: false }, false)).toBe('2d');
    expect(initialViewMode({ ...base, webgl: false, saved: '3d' }, true)).toBe('2d');
  });

  it('with the 2D map on, follows the saved view, then reduced motion and Save-Data', () => {
    expect(initialViewMode({ ...base, saved: '2d' }, true)).toBe('2d');
    expect(initialViewMode({ ...base, saved: '3d', reduced: true }, true)).toBe('3d');
    expect(initialViewMode({ ...base, reduced: true }, true)).toBe('2d');
    expect(initialViewMode({ ...base, saveData: true }, true)).toBe('2d');
    expect(initialViewMode(base, true)).toBe('3d');
  });
});

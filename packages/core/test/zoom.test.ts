import { describe, expect, it } from 'vitest';
import { cameraZoomAvailability } from '../src/zoom.ts';

describe('camera zoom availability', () => {
  it('only allows moving away from either limit', () => {
    expect(cameraZoomAvailability(25, 25, 800)).toEqual({ canZoomIn: false, canZoomOut: true });
    expect(cameraZoomAvailability(800, 25, 800)).toEqual({ canZoomIn: true, canZoomOut: false });
    expect(cameraZoomAvailability(100, 25, 800)).toEqual({ canZoomIn: true, canZoomOut: true });
  });

  it('tolerates tiny numerical differences at either limit', () => {
    expect(cameraZoomAvailability(25.005, 25, 800).canZoomIn).toBe(false);
    expect(cameraZoomAvailability(799.995, 25, 800).canZoomOut).toBe(false);
    expect(cameraZoomAvailability(25.02, 25, 800).canZoomIn).toBe(true);
    expect(cameraZoomAvailability(799.98, 25, 800).canZoomOut).toBe(true);
  });

  it('follows changed limits at the same camera distance', () => {
    expect(cameraZoomAvailability(25, 15, 800).canZoomIn).toBe(true);
    expect(cameraZoomAvailability(25, 25, 800).canZoomIn).toBe(false);
    expect(cameraZoomAvailability(100, 15, 100).canZoomOut).toBe(false);
    expect(cameraZoomAvailability(100, 15, 800).canZoomOut).toBe(true);
  });

  it('only offers the direction back into range while the camera adjusts', () => {
    expect(cameraZoomAvailability(15, 25, 800)).toEqual({ canZoomIn: false, canZoomOut: true });
    expect(cameraZoomAvailability(900, 25, 800)).toEqual({ canZoomIn: true, canZoomOut: false });
    expect(cameraZoomAvailability(25, 25, 25)).toEqual({ canZoomIn: false, canZoomOut: false });
  });
});

import { describe, expect, it } from 'vitest';
import { Object3D, PerspectiveCamera } from 'three';
import { heldOnScreen } from '../src/voyage/screenEdge.ts';

describe('heldOnScreen (#190)', () => {
  const size = { width: 1000, height: 800 };
  const edge = { side: 100, top: 150, bottom: 200 };
  const hold = heldOnScreen(edge);
  // Looking down the -z axis from the origin.
  const camera = new PerspectiveCamera(40, size.width / size.height, 0.1, 1000);
  camera.updateProjectionMatrix();
  const at = (x: number, y: number, z: number) => {
    const el = new Object3D();
    el.position.set(x, y, z);
    el.updateMatrixWorld();
    return hold(el, camera, size);
  };

  it('leaves a point in view where it is drawn', () => {
    const [x, y] = at(0, 0, -10);
    expect(x).toBeCloseTo(size.width / 2, 6);
    expect(y).toBeCloseTo(size.height / 2, 6);
  });

  it('holds a point out of view at the edge of the screen in its direction, inside the room kept', () => {
    expect(at(100, 0, -10)[0]).toBe(size.width - edge.side);
    expect(at(-100, 0, -10)[0]).toBe(edge.side);
    expect(at(0, 100, -10)[1]).toBe(edge.top);
    expect(at(0, -100, -10)[1]).toBe(size.height - edge.bottom);
  });
});

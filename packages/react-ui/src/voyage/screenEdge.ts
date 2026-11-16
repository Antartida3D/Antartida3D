import { Vector3, type Camera, type Object3D } from 'three';

/** Room kept at the sides, the top and the bottom of the screen, in px. */
export interface ScreenEdge {
  side: number;
  top: number;
  bottom: number;
}

const projected = new Vector3();

/**
 * Screen position of something that must stay findable, for the `calculatePosition` of an `<Html>`.
 * Out of view, like a lighthouse far from the route, it stays at the edge of the screen in its
 * direction, `edge` px inside it, so it can still be seen and opened.
 */
export const heldOnScreen = (edge: ScreenEdge) =>
  (el: Object3D, camera: Camera, size: { width: number; height: number }): number[] => {
    camera.updateMatrixWorld();
    projected.setFromMatrixPosition(el.matrixWorld).project(camera);
    const x = ((projected.x + 1) / 2) * size.width;
    const y = ((1 - projected.y) / 2) * size.height;
    return [
      Math.min(size.width - edge.side, Math.max(edge.side, x)),
      Math.min(size.height - edge.bottom, Math.max(edge.top, y)),
    ];
  };

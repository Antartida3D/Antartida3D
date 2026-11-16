import { CircleGeometry, MeshBasicMaterial, Shape, ShapeGeometry } from 'three';
import { PIN_DOT_R, PIN_HEAD_R as HEAD_R, PIN_HEAD_Y as HEAD_Y, PIN_LINE as LINE, pinTangent } from './pinShape.ts';

/** Height of the center of the round head of a pin, in pin units: where its button goes. */
export { PIN_HEAD_Y } from './pinShape.ts';

/** Outline of a pin: a round head over a point at `tipY`. */
function pinShape(radius: number, tipY: number): ShapeGeometry {
  const { side, x, y } = pinTangent(radius, tipY);
  const pin = new Shape();
  pin.moveTo(0, tipY);
  // The arc does not join itself to the starting point: draw the side up to it.
  pin.lineTo(x, y);
  pin.absarc(0, HEAD_Y, radius, -side, Math.PI + side, false);
  pin.closePath();
  return new ShapeGeometry(pin, 24);
}

/**
 * Map pin that marks a milestone: one unit tall, its point touches the place. Flat, drawn facing
 * the camera, in three layers: ink line, fill and a light dot.
 */
export const buildPinGeometry = () => ({
  line: pinShape(HEAD_R + LINE, -LINE * 2),
  fill: pinShape(HEAD_R, 0),
  dot: new CircleGeometry(PIN_DOT_R, 24).translate(0, HEAD_Y, 0),
});

// Always drawn over the relief: a milestone must be seen coming.
const flat = (color: number) => new MeshBasicMaterial({ color, depthTest: false, depthWrite: false, transparent: true });
/** Colors of the map markers: --ocre while the milestone is unread, --pencil once its card was opened, --ink line, --paper dot. */
export const pinMaterial = { unread: flat(0xc0862f), read: flat(0x5e656c), line: flat(0x1f2a36), dot: flat(0xf3ebdd) };

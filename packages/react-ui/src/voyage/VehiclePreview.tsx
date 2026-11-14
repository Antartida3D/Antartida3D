import type { TransportId } from '@antartida/core';
import { HERCULES_FLIGHT_POLY, HERCULES_SPAN } from './herculesModel.ts';
import { scaled } from './lowPoly.ts';
import { ModelPreview } from './ModelPreview.tsx';
import { VEHICLE_MODELS } from './vehicles.ts';

/**
 * The camera of ModelPreview frames a model one unit across, and the wing of the Hercules is wider
 * than that: it is drawn smaller, as wide as the block model this view was framed with.
 */
const PREVIEW_SPAN = 1.2;
const HERCULES_PREVIEW = scaled(HERCULES_FLIGHT_POLY, PREVIEW_SPAN / HERCULES_SPAN);

/** Small turntable of the picked vehicle, as in a game's vehicle select. */
export function VehiclePreview({ id, reduced }: { id: TransportId; reduced: boolean }) {
  if (id === 'hercules') return <ModelPreview tris={HERCULES_PREVIEW} motion="turn" reduced={reduced} />;
  return <ModelPreview boxes={VEHICLE_MODELS[id]} motion="turn" reduced={reduced} />;
}

import { AMMONITE_BODY_TRIS } from '../fossils/lowPolyFossils.ts';
import { ponchoDogTris } from './ponchoDog.ts';
import { boxShade, scaled, type Tri } from './lowPoly.ts';
import { ModelPreview } from './ModelPreview.tsx';
import { PointPreview } from './PointPreview.tsx';
import { SeaPreview } from './SeaPreview.tsx';
import { VehiclePreview } from './VehiclePreview.tsx';

/** The longest side of a model, so one camera frames them all (a model is one unit across). */
const extent = (tris: readonly Tri[]) => {
  let max = 0;
  for (const [a, b, c] of tris) for (const v of [a, b, c]) for (const n of v) max = Math.max(max, Math.abs(n));
  return max * 2;
};
const PONCHO_PREVIEW = scaled(ponchoDogTris(), 1 / extent(ponchoDogTris()));
const AMMONITE_PREVIEW = scaled(AMMONITE_BODY_TRIS, 1 / extent(AMMONITE_BODY_TRIS));

/**
 * What stands for each expedition in the modal before it, turning like the vehicles of the trip from Ushuaia (#264):
 * the Hercules of the base, the humpback of the sea, the ammonite of the rocks and the penguins of Cerro Nevado and Poncho, the dog.
 * ILLUSTRATIVE: they are drawings, not scale models.
 */
export function IntroPreview({ id, reduced }: { id: string; reduced: boolean }) {
  switch (id) {
    case 'marambio': return <VehiclePreview id="hercules" reduced={reduced} />;
    case 'oceano': return <SeaPreview species="humpback" reduced={reduced} />;
    case 'cerronevado': return <PointPreview id="cerronevado" reduced={reduced} />;
    case 'poncho': return <ModelPreview tris={PONCHO_PREVIEW} shade={boxShade} motion="turn" reduced={reduced} lift={0.1} />;
    case 'fosiles': return <ModelPreview tris={AMMONITE_PREVIEW} shade={boxShade} motion="turn" reduced={reduced} />;
    default: return null;
  }
}

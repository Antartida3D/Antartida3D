import { AMMONITE_BODY_TRIS } from '../fossils/lowPolyFossils.ts';
import { ponchoDogTris } from './ponchoDog.ts';
import { boxShade, resolveRelief, scaled, type Tri } from './lowPoly.ts';
import { MARAMBIO_SITE_POLY } from './marambioSiteModel.ts';
import { ModelPreview } from './ModelPreview.tsx';
import { PointPreview } from './PointPreview.tsx';
import { SeaPreview } from './SeaPreview.tsx';

/** The longest side of a model, so one camera frames them all (a model is one unit across). */
const extent = (tris: readonly Tri[]) => {
  let max = 0;
  for (const [a, b, c] of tris) for (const v of [a, b, c]) for (const n of v) max = Math.max(max, Math.abs(n));
  return max * 2;
};
const PONCHO_PREVIEW = scaled(ponchoDogTris(), 1 / extent(ponchoDogTris()));
const AMMONITE_PREVIEW = scaled(AMMONITE_BODY_TRIS, 1 / extent(AMMONITE_BODY_TRIS));
/**
 * The same maqueta of the base that stands on the map, with the colours of the relief round it. It is flat and the
 * preview is wide, so it is drawn wider than one unit to fill it.
 */
const MARAMBIO_PREVIEW_WIDTH = 1.4;
const MARAMBIO_PREVIEW = scaled(resolveRelief(MARAMBIO_SITE_POLY), MARAMBIO_PREVIEW_WIDTH / extent(MARAMBIO_SITE_POLY));

/**
 * What stands for each expedition in the modal before it, turning like the vehicles of the trip from Ushuaia (#264):
 * the humpback of the sea, the ammonite of the rocks and the penguins of Cerro Nevado and Poncho, the dog. Marambio
 * shows the maqueta of the base that is on the map, and it does not turn (#282).
 * ILLUSTRATIVE: they are drawings, not scale models.
 */
export function IntroPreview({ id, reduced }: { id: string; reduced: boolean }) {
  switch (id) {
    case 'marambio': return <ModelPreview tris={MARAMBIO_PREVIEW} motion="still" reduced={reduced} />;
    case 'oceano': return <SeaPreview species="humpback" reduced={reduced} />;
    case 'cerronevado':
    case 'thwaites':
    case 'vostok':
    case 'polo':
    case 'belgrano':
      return <PointPreview id={id} reduced={reduced} />;
    case 'poncho': return <ModelPreview tris={PONCHO_PREVIEW} shade={boxShade} motion="turn" reduced={reduced} lift={0.1} />;
    case 'fosiles': return <ModelPreview tris={AMMONITE_PREVIEW} shade={boxShade} motion="turn" reduced={reduced} />;
    default: return null;
  }
}

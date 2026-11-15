import { ModelPreview } from '../voyage/ModelPreview.tsx';
import { resolveRelief } from '../voyage/lowPoly.ts';
import { ORCADAS_SITE_POLY } from '../voyage/orcadasSiteModel.ts';

const ORCADAS_PREVIEW_TRIS = resolveRelief(ORCADAS_SITE_POLY);

/** Small turntable of Estación Orcadas on the Laurie Island isthmus, for the intro sheet. */
export function OrcadasSitePreview({ reduced }: { reduced: boolean }) {
  return <ModelPreview tris={ORCADAS_PREVIEW_TRIS} motion="turn" lift={0.08} reduced={reduced} />;
}

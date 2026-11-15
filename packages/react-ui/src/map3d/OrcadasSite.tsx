import { ORCADAS_POINT } from '@antartida/core';
import { buildPolyGeometry, resolveRelief } from '../voyage/lowPoly.ts';
import { ORCADAS_SITE_POLY } from '../voyage/orcadasSiteModel.ts';
import { SiteOnRelief } from './SiteOnRelief.tsx';

export const buildOrcadasSiteGeometry = () => buildPolyGeometry(resolveRelief(ORCADAS_SITE_POLY));

/**
 * Low-poly maqueta of Estación Orcadas on Laurie Island, seated on the ground relief
 * without covering or interfering with the HTML map marker.
 */
export function OrcadasSite({ reduced }: { reduced?: boolean }) {
  return <SiteOnRelief point={ORCADAS_POINT} poly={ORCADAS_SITE_POLY} heading={0.25} sizePerDistance={0.028} minSize={0.2} reduced={reduced} />;
}

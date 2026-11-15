import { MARAMBIO_POINT } from '@antartida/core';
import { buildPolyGeometry, resolveRelief } from '../voyage/lowPoly.ts';
import { MARAMBIO_SITE_FLAT_RADIUS, MARAMBIO_SITE_HEADING, MARAMBIO_SITE_POLY } from '../voyage/marambioSiteModel.ts';
import { SiteOnRelief } from './SiteOnRelief.tsx';

export const buildMarambioSiteGeometry = () => buildPolyGeometry(resolveRelief(MARAMBIO_SITE_POLY));

/**
 * Low-poly maqueta of Base Marambio on its plateau, seated on the relief like the Orcadas one. It is
 * a little larger than that one: the base spreads over a runway and many buildings.
 *
 * While a trip from Ushuaia is on, it is not drawn: the trip lands its own Hércules or Sea King at
 * the base, much larger than the maqueta, and both would stand in the same place.
 */
export function MarambioSite({ reduced, hidden }: { reduced?: boolean; hidden?: boolean }) {
  return (
    <SiteOnRelief
      point={MARAMBIO_POINT}
      poly={MARAMBIO_SITE_POLY}
      heading={MARAMBIO_SITE_HEADING}
      sizePerDistance={0.034}
      minSize={0.24}
      flatRadius={MARAMBIO_SITE_FLAT_RADIUS}
      blendRadius={MARAMBIO_SITE_FLAT_RADIUS + 0.2}
      reduced={reduced}
      hidden={hidden}
    />
  );
}

import type { TransportId, VoyageFact, VoyageSourceCode } from '@antartida/core';
import { PONCHO_PHOTO_SOURCES, VOYAGE_SOURCE_CODES, tripSources, voyageCited } from '@antartida/core';
import { findTransport } from '@antartida/core';
import { Quoted } from '../ui.tsx';
import { Cites } from '../sheet/Cite.tsx';
import type { SourcesContextValue } from '../sheet/SourcesContext.ts';

/** Opens the sources view at one source of the trip. */
export type OpenSources = (code: VoyageSourceCode) => void;

const isDogs = (trip: TransportId) => findTransport(trip).kind === 'dogs';

/**
 * The sources of a trip as the sources view lists them, and how to open it. The trips from Ushuaia
 * list the whole registry; the team of Poncho lists only what it cites, numbered from 1 (`tripSources`).
 */
export const tripSourcesContext = (trip: TransportId | undefined, open: OpenSources): SourcesContextValue => ({
  list: [...(trip ? tripSources(trip) : VOYAGE_SOURCE_CODES).map(voyageCited), ...(trip && isDogs(trip) ? PONCHO_PHOTO_SOURCES : [])],
  open: (id) => open(id as VoyageSourceCode),
});

/** One statement, followed by the numbers of its sources. A source with a page links straight to that page of the document. */
export function Fact({ fact }: { fact: VoyageFact }) {
  return (
    <li className="vfact">
      <span>
        <Quoted text={fact.text} />
        <Cites ids={fact.sources} pages={fact.pages} />
      </span>
    </li>
  );
}

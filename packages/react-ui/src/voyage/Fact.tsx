import { createContext, useContext } from 'react';
import { Quoted } from '../ui.tsx';
import { VOYAGE_SOURCES, citationLabel, tripSourceNumber, voyageSourceNumber, type TransportId, type VoyageFact, type VoyageSourceCode } from '@antartida/core';

/** The trip whose sources list numbers the citations (Poncho lists only what it cites); without it, the global numbering. */
export const TripContext = createContext<TransportId | undefined>(undefined);

/** Opens the sources page at one source. */
export type OpenSources = (code: VoyageSourceCode) => void;

/** One statement, followed by the numbers of its sources. A source with a page links straight to that page of the document. */
export function Fact({ fact, onSource }: { fact: VoyageFact; onSource: OpenSources }) {
  const trip = useContext(TripContext);
  return (
    <li className="vfact">
      <span>
        <Quoted text={fact.text} />
        {fact.sources.map((code) => {
          const number = trip ? tripSourceNumber(trip, code) : voyageSourceNumber(code);
          const page = fact.pages?.[code];
          if (page === undefined) {
            return (
              <button
                key={code}
                type="button"
                className="vref"
                onClick={() => onSource(code)}
                aria-label={`Fuente ${number}: ${VOYAGE_SOURCES[code].org}`}
              >
                [{number}]
              </button>
            );
          }
          return (
            <a
              key={code}
              className="vref"
              href={`${VOYAGE_SOURCES[code].url}#page=${page}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Fuente ${number}, página ${page}: ${VOYAGE_SOURCES[code].org}`}
            >
              [{citationLabel(code, number, page)}]
            </a>
          );
        })}
      </span>
    </li>
  );
}

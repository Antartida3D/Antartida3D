import { VOYAGE_SOURCES, voyageSourceNumber, type VoyageFact, type VoyageSourceCode } from '@antartida/core';

/** Opens the sources page at one source. */
export type OpenSources = (code: VoyageSourceCode) => void;

/** One statement, followed by the numbers of its sources. A source with a page links straight to that page of the document. */
export function Fact({ fact, onSource }: { fact: VoyageFact; onSource: OpenSources }) {
  return (
    <li className="vfact">
      <span>
        {fact.text}
        {fact.sources.map((code) => {
          const number = voyageSourceNumber(code);
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
              [{number} · p. {page}]
            </a>
          );
        })}
      </span>
    </li>
  );
}

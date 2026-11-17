import { useContext } from 'react';
import { sourceNumber } from '@antartida/core';
import { SourcesContext } from './SourcesContext.ts';

/**
 * A citation `[N]` after the text it supports. It opens the sources view at that source; with a
 * `page`, it links straight to that page of the document (`[Libro · p. 9]`).
 */
export function Cite({ id, page }: { id: string; page?: number }) {
  const sources = useContext(SourcesContext);
  const source = sources?.list.find((s) => s.id === id);
  if (!sources || !source) return null;
  const number = sourceNumber(sources.list, id);
  if (page !== undefined && source.url) {
    return (
      <a
        className="vref"
        href={`${source.url}#page=${page}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Fuente ${number}, página ${page}: ${source.org}`}
      >
        [{source.page ?? number} · p. {page}]
      </a>
    );
  }
  return (
    <button type="button" className="vref" onClick={() => sources.open(id)} aria-label={`Fuente ${number}: ${source.org}`}>
      [{number}]
    </button>
  );
}

/** The citations of a statement, one after another. */
export function Cites({ ids, pages }: { ids: readonly string[]; pages?: Readonly<Record<string, number | undefined>> }) {
  return <>{ids.map((id) => <Cite key={id} id={id} page={pages?.[id]} />)}</>;
}

import { panelFacts, type OrcadasFact } from '@antartida/core';
import { Quoted } from '../ui.tsx';
import { MoreFold } from '../sheet/MoreFold.tsx';
import { Cites } from '../sheet/Cite.tsx';
import { KindChip } from './KindChip.tsx';

export function FactCard({ fact }: { fact: OrcadasFact }) {
  return (
    <article className="orc-fact-card">
      <div className="orc-fact-top">
        <KindChip kind={fact.kind} />
        {fact.title && <strong className="orc-fact-title">{fact.title}</strong>}
      </div>
      <p className="orc-fact-text">
        <Quoted text={fact.text} />
        <Cites ids={fact.sourceIds} />
      </p>
    </article>
  );
}

export function FactList({
  facts,
  fold = true,
  summary,
}: {
  facts: readonly OrcadasFact[];
  fold?: boolean;
  /** When set, all panel-filtered facts render inside a single folded block with this summary. */
  summary?: string;
}) {
  if (facts.length === 0) return null;

  if (!fold) {
    return (
      <div className="orc-facts-list">
        {facts.map((fact) => (
          <FactCard key={fact.id} fact={fact} />
        ))}
      </div>
    );
  }

  const { visible, more } = panelFacts(facts);
  if (visible.length === 0 && more.length === 0) return null;

  if (summary) {
    return (
      <MoreFold summary={summary}>
        {[...visible, ...more].map((fact) => (
          <FactCard key={fact.id} fact={fact} />
        ))}
      </MoreFold>
    );
  }

  return (
    <div className="orc-facts-list">
      {visible.map((fact) => (
        <FactCard key={fact.id} fact={fact} />
      ))}
      {more.length > 0 && (
        <MoreFold>
          {more.map((fact) => (
            <FactCard key={fact.id} fact={fact} />
          ))}
        </MoreFold>
      )}
    </div>
  );
}

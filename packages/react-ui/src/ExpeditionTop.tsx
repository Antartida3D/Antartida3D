import type { ReactNode, Ref } from 'react';
import { Icon } from './ui.tsx';

export interface ExpeditionChapter<Id extends string = string> {
  id: Id;
  label: string;
  current: boolean;
  visited?: boolean;
}

/**
 * The header every expedition shares (#297): «Mapa» and its actions on the left, the chapters on
 * the right on a wide screen. It has no bar and no title: the expedition names itself in its panel.
 */
export function ExpeditionTop<Id extends string = string>({ topRef, onMap, actions, tools, chapters, chaptersLabel, onChapter }: {
  topRef?: Ref<HTMLElement>;
  onMap: () => void;
  /** Pills after «Mapa», e.g. «Fuentes». */
  actions?: ReactNode;
  /** The month chip; on a phone at the far right of the row. */
  tools?: ReactNode;
  chapters?: readonly ExpeditionChapter<Id>[];
  chaptersLabel?: string;
  onChapter?: (id: Id) => void;
}) {
  return (
    <header className="orc-top" ref={topRef}>
      <div className="orc-top-r1">
        <button type="button" className="pill orc-top-btn" aria-label="Volver al mapa" onClick={onMap}>{Icon.back}<span>Mapa</span></button>
        {actions}
        {tools && <div className="orc-top-tools">{tools}</div>}
      </div>
      {chapters && (
        <nav className="orc-steps-nav" aria-label={chaptersLabel}>
          <ol className="orc-steps">
            {chapters.map((c, i) => (
              <li key={c.id} className="orc-step-item">
                <button
                  type="button"
                  className={`orc-step-btn${c.current ? ' is-current' : c.visited ? ' is-visited' : ''}`}
                  aria-current={c.current ? 'step' : undefined}
                  aria-label={`${i + 1} ${c.label}`}
                  onClick={() => onChapter?.(c.id)}
                >
                  <span className="orc-step-num" aria-hidden="true">{i + 1}</span><span className="orc-step-name">{c.label}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
      )}
    </header>
  );
}

import type { ReactNode, Ref } from 'react';

/** The one «Saber más» of every modal: a folded block with an arrow that turns when it opens. */
export function MoreFold({ summary = 'Saber más', open, hidden, detailsRef, className = '', children }: {
  summary?: ReactNode;
  open?: boolean;
  hidden?: boolean;
  /** For a fold that the page closes by itself (a new stop of a tour starts folded). */
  detailsRef?: Ref<HTMLDetailsElement>;
  /** Only to place it (margin, width); never its look. */
  className?: string;
  children: ReactNode;
}) {
  return (
    <details className={`sheet-more ${className}`.trim()} open={open} hidden={hidden} ref={detailsRef}>
      <summary>{summary}</summary>
      <div className="sheet-more-body">{children}</div>
    </details>
  );
}

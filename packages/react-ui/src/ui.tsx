import { SVG_DEFS, quoteParts } from '@antartida/core';
import type { ReactNode } from 'react';

export type ChipKind = 'real' | 'sim' | 'art' | 'prov';

export function Chip({ kind, children }: { kind: ChipKind; children: ReactNode }) {
  return <span className={'chip ' + kind}>{children}</span>;
}

/** A text with its “quoted” passages in italics: a quotation keeps its marks and leans (#190). */
export function Quoted({ text }: { text: string }) {
  return <>{quoteParts(text).map((part, i) => (part.quoted ? <em key={i}>{part.text}</em> : part.text))}</>;
}

/** Shared painted filters and gradients, referenced by url(#id) everywhere. */
export function Filters() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <defs dangerouslySetInnerHTML={{ __html: SVG_DEFS }} />
    </svg>
  );
}

export function SvgHtml({ html, className, viewBox, preserveAspectRatio }: {
  html: string;
  className?: string;
  viewBox: string;
  preserveAspectRatio?: string;
}) {
  return (
    <svg
      className={className}
      viewBox={viewBox}
      preserveAspectRatio={preserveAspectRatio}
      aria-hidden="true"
      focusable="false"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

const stroke = { stroke: 'currentColor', strokeLinecap: 'round' as const };

export const Icon = {
  plus: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" {...stroke} strokeWidth="2.4" /></svg>,
  minus: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" {...stroke} strokeWidth="2.4" /></svg>,
  reset: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" {...stroke} strokeWidth="2" />
    </svg>
  ),
  close: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" {...stroke} strokeWidth="2.4" /></svg>,
  legend: <svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M5 12h14M5 17h9" {...stroke} strokeWidth="2" fill="none" /></svg>,
  list: (
    <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 6h12M8 12h12M8 18h12" {...stroke} strokeWidth="2" fill="none" />
      <circle cx="4" cy="6" r="1.5" fill="currentColor" /><circle cx="4" cy="12" r="1.5" fill="currentColor" /><circle cx="4" cy="18" r="1.5" fill="currentColor" />
    </svg>
  ),
  back: (
    <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  next: (
    <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 12h15M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 14 14" aria-hidden="true">
      <path d="M2.5,7.5 L5.8,10.5 L11.5,3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  /** Mouse with its arrows, for the intro letter (#256). */
  mouse: (
    <svg viewBox="0 0 36 24" aria-hidden="true">
      <rect x="12" y="1.5" width="12" height="21" rx="6" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M18 5.5v5" {...stroke} strokeWidth="1.8" />
      <path d="M7 9l-3 3 3 3M29 9l3 3-3 3" fill="none" {...stroke} strokeWidth="1.6" />
    </svg>
  ),
  plusRing: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7.5v9M7.5 12h9" {...stroke} strokeWidth="1.8" />
    </svg>
  ),
  /** Finger that drags and pinches, for the intro letter (#256). */
  hand: (
    <svg viewBox="0 0 28 28" aria-hidden="true">
      <path d="M3 7l-2.5 2.5L3 12M25 7l2.5 2.5L25 12M3 9.5h6M19 9.5h6" fill="none" {...stroke} strokeWidth="1.6" />
      <path d="M11 22.5l-3.2-4.2c-.7-.9-.1-2.1 1-2l2.2.6V9.5a1.5 1.5 0 0 1 3 0v4.6l3.4.8c1.3.3 2.1 1.5 1.8 2.8l-.7 3.3c-.2.9-1 1.5-1.9 1.5H11z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  ),
  doc: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  ),
  sea: (
    <svg viewBox="0 0 14 14" aria-hidden="true">
      <path d="M1.5 5.5 C3.2 4.2 4.8 6.8 6.5 5.5 C8.2 4.2 9.8 6.8 12.5 5.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M2.5 8.8 C4 7.8 5.4 9.8 7 8.8 C8.6 7.8 10 9.8 11.5 8.8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
};

import { SVG_DEFS, richParts } from '@antartida/core';
import { Fragment, type ReactNode } from 'react';

export type ChipKind = 'real' | 'sim' | 'art' | 'prov';

export function Chip({ kind, children }: { kind: ChipKind; children: ReactNode }) {
  return <span className={'chip ' + kind}>{children}</span>;
}

/** A text with its “quoted” passages in italics (a quotation keeps its marks and leans, #190) and its `**bold**` passages in bold. */
export function Quoted({ text }: { text: string }) {
  return (
    <>
      {richParts(text).map((part, i) => {
        const node = part.quoted ? <em>{part.text}</em> : part.text;
        return part.strong ? <strong key={i}>{node}</strong> : <Fragment key={i}>{node}</Fragment>;
      })}
    </>
  );
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
      <path d="M3,7.3 L5.8,10.1 L11,4.1" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  sea: (
    <svg viewBox="0 0 14 14" aria-hidden="true">
      <path d="M1.5 5.5 C3.2 4.2 4.8 6.8 6.5 5.5 C8.2 4.2 9.8 6.8 12.5 5.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M2.5 8.8 C4 7.8 5.4 9.8 7 8.8 C8.6 7.8 10 9.8 11.5 8.8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 14 14" aria-hidden="true">
      <circle cx="7" cy="3.8" r="1.15" fill="currentColor" />
      <path d="M7 6.5v4" fill="none" stroke="currentColor" strokeWidth="2.0" strokeLinecap="round" />
    </svg>
  ),
};

import type { ReactNode } from 'react';
import { Quoted } from '../ui.tsx';

/**
 * The body text of a modal: the first paragraph leads (a «bajada»), `**bold**` weighs, “quotes” lean.
 * `children` go at the end of the last paragraph (the citations).
 */
export function SheetText({ text, children }: { text: string | readonly string[]; children?: ReactNode }) {
  const paragraphs = typeof text === 'string' ? [text] : text;
  return (
    <div className="sheet-text">
      {paragraphs.map((paragraph, i) => (
        <p key={i} className={i === 0 ? 'sheet-lead' : undefined}>
          <Quoted text={paragraph} />
          {i === paragraphs.length - 1 && children}
        </p>
      ))}
    </div>
  );
}

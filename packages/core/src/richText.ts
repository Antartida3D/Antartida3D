import { quoteParts } from './quotes.ts';

/** One run of a text. `strong` marks a passage written between `**` and `**`. */
export interface StrongPart {
  readonly text: string;
  readonly strong: boolean;
}

/** A text cut at its `**bold**` passages, in order. A `*` alone, or a `**` left open, is plain text. */
export function strongParts(text: string): StrongPart[] {
  return text
    .split(/(\*\*[^*]+\*\*)/)
    .map((part, i) => (i % 2 === 1 ? { text: part.slice(2, -2), strong: true } : { text: part, strong: false }))
    .filter((part) => part.text !== '');
}

/** One run of a text with what it is: bold, in quotes, both or neither. */
export interface RichPart extends StrongPart {
  readonly quoted: boolean;
}

/** `strongParts` and `quoteParts` together: quotes inside bold and bold inside quotes both lean and weigh. */
export function richParts(text: string): RichPart[] {
  return strongParts(text).flatMap((s) => quoteParts(s.text).map((q) => ({ text: q.text, strong: s.strong, quoted: q.quoted })));
}

/** The text without its `**` marks: the same words. */
export const plainText = (text: string) => strongParts(text).map((p) => p.text).join('');

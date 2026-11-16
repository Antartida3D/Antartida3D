/** One run of a text. `quoted` marks a passage between “ and ”, with its marks. */
export interface QuotePart {
  readonly text: string;
  readonly quoted: boolean;
}

/**
 * A text cut at its “quoted” passages, in order: the interface sets a quotation in italics (#190).
 * A quote left open is not a passage. The parts joined give back the text.
 */
export function quoteParts(text: string): QuotePart[] {
  return text
    .split(/(“[^”]*”)/)
    .map((part, i) => ({ text: part, quoted: i % 2 === 1 }))
    .filter((part) => part.text !== '');
}

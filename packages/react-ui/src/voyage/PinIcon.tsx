import { PIN_DOT_R, PIN_HEAD_R, PIN_HEAD_Y, PIN_LINE, pinPath } from './pinShape.ts';

const HALF = PIN_HEAD_R + PIN_LINE;
const TOP = PIN_HEAD_Y + HALF;
const LINE_TIP = -PIN_LINE * 2;

/**
 * The pin of a milestone as an icon, drawn like the pin of the map (pins.ts): ink line, fill and a
 * light dot. The fill takes the text color (`currentColor`), set where the icon is used.
 */
export function PinIcon() {
  return (
    <svg className="vpinicon" viewBox={`${-HALF} ${-TOP} ${HALF * 2} ${TOP - LINE_TIP}`} aria-hidden="true" focusable="false">
      <path d={pinPath(HALF, LINE_TIP)} fill="var(--chart-ink)" />
      <path d={pinPath(PIN_HEAD_R, 0)} fill="currentColor" />
      <circle cx="0" cy={-PIN_HEAD_Y} r={PIN_DOT_R} fill="var(--chart-paper)" />
    </svg>
  );
}

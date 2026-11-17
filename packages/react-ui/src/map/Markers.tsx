import type { CSSProperties } from 'react';
import { guideLine, type Marker } from '@antartida/core';
import { Icon } from '../ui.tsx';

/** A press on a marker: `touch` tells a finger (or pen) from a mouse or the keyboard. */
export type MarkerPick = (m: Marker, touch: boolean) => void;

export function MarkerButton({ m, style, shown, onPick }: {
  m: Marker;
  style: CSSProperties;
  /** Its label is in view because it was pressed once. */
  shown: boolean;
  onPick: MarkerPick;
}) {
  return (
    <button
      type="button"
      className={m.cls + (shown ? ' shown' : '')}
      style={style}
      onClick={(e) => {
        const { pointerType } = e.nativeEvent as PointerEvent;
        onPick(m, pointerType === 'touch' || pointerType === 'pen');
      }}
      aria-label={m.aria}
    >
      <span className="dot">
        {m.kind === 'point' && m.pulse && <span className="pulse" />}
        {m.kind === 'point' && m.check && Icon.check}
        {m.kind === 'sea' && Icon.sea}
      </span>
      {m.kind === 'point' && m.next && <span className="mnext" aria-hidden="true">Siguiente</span>}
      {m.kind === 'point' && m.label && (
        <span className="mlabel"><strong>{m.label.title}</strong><span>{m.label.sub}</span></span>
      )}
      {m.kind === 'sea' && m.label && (
        <span className="mlabel"><strong>{m.label.title}</strong><span>{m.label.sub}</span></span>
      )}
    </button>
  );
}

export function Markers({ markers, className, shown, onPick }: {
  markers: Marker[];
  className: string;
  /** Key of the marker whose label is in view after a first press. */
  shown: string | null;
  onPick: MarkerPick;
}) {
  return (
    <div className={className}>
      {/* The lines back to the real places of the fanned-out markers (#238), under every marker. */}
      {markers.map((m) => {
        if (m.kind !== 'point' || (!m.dx && !m.dy)) return null;
        const { length, angle } = guideLine(m.dx, m.dy, 0);
        return <span key={'g:' + m.key} className="guide" aria-hidden="true" style={{ height: length, transform: `translate3d(${m.left}px, ${m.top}px, 0) rotate(${angle}rad)` }} />;
      })}
      {markers.map((m) => <MarkerButton key={m.key} m={m} style={{ transform: `translate3d(${m.left}px, ${m.top}px, 0)` }} shown={m.key === shown} onPick={onPick} />)}
    </div>
  );
}

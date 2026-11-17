import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import type { ZoomAvailability } from '@antartida/core';
import { Icon } from '../ui.tsx';

export function ZoomControls({ availability, mapRef, onZoom, onReset }: {
  availability: ZoomAvailability;
  mapRef: RefObject<HTMLDivElement | null>;
  onZoom: (factor: number) => void;
  onReset: () => void;
}) {
  const closer = useRef<HTMLButtonElement>(null);
  const farther = useRef<HTMLButtonElement>(null);
  const [shown, setShown] = useState(availability);
  const { canZoomIn, canZoomOut } = availability;

  useLayoutEffect(() => {
    // Move focus before applying disabled/visibility: browsers may otherwise blur to the body.
    const active = document.activeElement;
    if (!canZoomIn && active === closer.current) {
      (canZoomOut && !farther.current?.disabled ? farther.current : mapRef.current)?.focus({ preventScroll: true });
    } else if (!canZoomOut && active === farther.current) {
      (canZoomIn && !closer.current?.disabled ? closer.current : mapRef.current)?.focus({ preventScroll: true });
    }
    setShown((previous) => previous.canZoomIn === canZoomIn && previous.canZoomOut === canZoomOut
      ? previous
      : { canZoomIn, canZoomOut });
  }, [canZoomIn, canZoomOut, mapRef]);

  return (
    <div className="zoom">
      <button ref={closer} type="button" className="iconbtn zoom-step" disabled={!shown.canZoomIn}
        onClick={() => onZoom(1.6)} aria-label="Acercar">{Icon.plus}</button>
      <button ref={farther} type="button" className="iconbtn zoom-step" disabled={!shown.canZoomOut}
        onClick={() => onZoom(1 / 1.6)} aria-label="Alejar">{Icon.minus}</button>
      <button type="button" className="iconbtn" onClick={onReset} aria-label="Ver todo el continente">{Icon.reset}</button>
    </div>
  );
}

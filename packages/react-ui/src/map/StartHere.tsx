import { useEffect, useRef } from 'react';
import { startHerePlacement, startHereText, type MapPoint } from '@antartida/core';
import { useMediaQuery } from '../hooks.ts';
import { NARROW_PX } from '../voyage/useVoyage.ts';

/**
 * «Empezá acá» (#256): a ring around the pin of `point` and a card below it with an arrow. A frame
 * loop reads the pin's box, so both follow it while the camera flies. Hidden while it is off screen.
 */
export function StartHere({ point, onDone }: { point: Pick<MapPoint, 'id' | 'title'>; onDone: () => void }) {
  const wide = useMediaQuery(`(min-width: ${NARROW_PX}px)`);
  const ring = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let id = 0;
    const tick = () => {
      id = requestAnimationFrame(tick);
      const root = card.current?.offsetParent as HTMLElement | null;
      const pin = root?.querySelector<HTMLElement>(`.vp [data-key="${point.id}"]`);
      if (!root || !pin || !card.current || !ring.current) return;
      const r = root.getBoundingClientRect();
      const b = pin.getBoundingClientRect();
      const at = { left: b.left + b.width / 2 - r.left, top: b.top + b.height / 2 - r.top };
      const p = startHerePlacement(at, { w: card.current.offsetWidth, h: card.current.offsetHeight }, { vw: r.width, vh: r.height });
      const vis = p.visible ? 'visible' : 'hidden';
      ring.current.style.visibility = card.current.style.visibility = vis;
      ring.current.style.transform = `translate3d(${at.left}px, ${at.top}px, 0) translate(-50%, -50%)`;
      card.current.style.transform = `translate3d(${p.left}px, ${p.top}px, 0)`;
      card.current.style.setProperty('--arrow-x', `${p.arrowX}px`);
    };
    tick();
    return () => cancelAnimationFrame(id);
  }, [point.id]);

  return (
    <>
      <div className="starthere-ring" ref={ring} aria-hidden="true" />
      <div className="starthere" ref={card} role="status">
        <span className="starthere-kicker">Empezá acá</span>
        <b>{point.title}</b>
        <p>{startHereText(point, !wide)}</p>
        <button type="button" className="btn" onClick={onDone}>Entendido</button>
      </div>
    </>
  );
}

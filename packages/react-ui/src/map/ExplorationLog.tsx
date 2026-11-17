import { useState } from 'react';
import { AVAILABLE_COUNT } from '@antartida/core';
import { Icon } from '../ui.tsx';

export function ExplorationLog({ explored }: { explored: readonly string[] }) {
  const text = `${explored.length}/${AVAILABLE_COUNT}`;
  // Only a phone shows the toggle: the log is a small pill that grows to the right.
  const [open, setOpen] = useState(false);
  return (
    <div className={'reg' + (open ? ' open' : '')} role="status" aria-label={`Registro de exploración: ${text} expediciones disponibles`}>
      <small>Registro de exploración</small>
      <b>{text}<span className="unit"> expediciones</span></b>
      <button type="button" className="reg-toggle" aria-expanded={open} aria-label={open ? "Achicar el registro de exploración" : "Ampliar el registro de exploración"} onClick={() => setOpen(!open)}>
        {Icon.back}
      </button>
      <div className="bar"><i style={{ width: `${(100 * explored.length) / AVAILABLE_COUNT}%` }} /></div>
    </div>
  );
}

import { useRef, useState, type ReactNode } from 'react';
import type { FactKind } from '@antartida/core';
import { KindChip } from './orcadas/KindChip.tsx';

/**
 * What the scene is, at the bottom left of every expedition (#297): the kind chip («Reconstrucción
 * ilustrada») with a «?» that opens the note explaining why. `extra` goes over the chip, and
 * `onSources` adds a «Ver fuentes» link at the end of the note.
 */
export function SceneBadge({ kind = 'recon', label = 'Reconstrucción ilustrada', help, extra, onSources, className }: {
  kind?: FactKind;
  label?: string;
  help: ReactNode;
  extra?: ReactNode;
  onSources?: () => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const helpRef = useRef<HTMLButtonElement>(null);
  return (
    <div className={`orc-scene-badge${className ? ` ${className}` : ''}`}>
      <div className="orc-scene-badge-row">
        <KindChip kind={kind} label={label} />
        <button
          type="button"
          className="orc-scene-help-btn"
          ref={helpRef}
          aria-expanded={open}
          aria-label={`Ayuda sobre la ${label.toLowerCase()}`}
          onClick={() => setOpen((v) => !v)}
        >
          ?
        </button>
      </div>
      {extra}
      {open && (
        <div className="orc-scene-help-popover" role="note">
          {help}
          {onSources && (
            <p>
              <button
                type="button"
                className="orc-scene-sources-link"
                onClick={() => {
                  // The link goes away with the note: the focus stays in the page, on its button.
                  helpRef.current?.focus();
                  setOpen(false);
                  onSources();
                }}
              >
                Ver fuentes
              </button>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

import type { ReactNode } from 'react';
import { Icon } from '../ui.tsx';

/** The same top of every modal: a label, the title, the place or question, and «Cerrar» on the right. */
export function SheetHeader({ label, title, titleId, place, onClose, titleFocusable, titleClass }: {
  label?: ReactNode;
  title: ReactNode;
  titleId: string;
  place?: ReactNode;
  onClose?: () => void;
  /** The title can take the focus, so the sheet that opens on it does not scroll to a button further down. */
  titleFocusable?: boolean;
  titleClass?: string;
}) {
  return (
    <header className="sheet-header">
      <div className="sheet-header-text">
        {label && <span className="sheet-label">{label}</span>}
        <h2 id={titleId} className={titleClass} tabIndex={titleFocusable ? -1 : undefined}>{title}</h2>
        {place && <p className="place">{place}</p>}
      </div>
      {onClose && (
        <button type="button" className="iconbtn" onClick={onClose} aria-label="Cerrar">
          {Icon.close}
        </button>
      )}
    </header>
  );
}

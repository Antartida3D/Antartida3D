import { useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { trapTab, useFocusReturn } from '../hooks.ts';
import { Icon } from '../ui.tsx';

/**
 * The photograph of an expedition, big and in the middle of the screen (#309): the modal Rocío made for the archive of Fósiles
 * and Marambio (#7, #207), the one for every photograph of every expedition. It takes the focus (on «Cerrar») and keeps it
 * with Tab; Escape, «Cerrar» or a press on the dark around it close it, and the focus goes back to the photograph that opened
 * it. Keys pressed inside do not reach the screen behind (the arrows and Escape of a diorama). It is not a native modal
 * dialog on purpose: a citation of its caption opens the sources view, and the photograph closes then, so the focus goes
 * back to its thumbnail and from there to the sources. It is drawn on the page
 * itself (a portal to `.app`, which keeps the type of the app), so it stays in the middle of the screen wherever it is opened
 * from: a panel that moves would otherwise hold it inside. `children` is the caption: text, date, credit and citation, as each expedition has them.
 */
export function PhotoModal({ src, alt, title = 'Archivo fotográfico', onClose, children }: {
  src: string;
  alt: string;
  title?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useFocusReturn(true, ref, '.iconbtn');
  return createPortal(
    <div className="photo-modal-scrim" onClick={onClose}>
      <div
        ref={ref}
        className="photo-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Escape') onClose();
          else trapTab(e, ref.current);
        }}
      >
        <div className="photo-modal-head">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="iconbtn" onClick={onClose} aria-label="Cerrar">{Icon.close}</button>
        </div>
        <figure className="photo-modal-figure">
          <img src={src} alt={alt} />
          {/* A citation opens the sources view and closes the photograph, so the sources are not seen over it (#309). */}
          <figcaption onClick={(e) => (e.target as Element).closest('.vref') && onClose()}>{children}</figcaption>
        </figure>
      </div>
    </div>,
    document.querySelector('.app') ?? document.body,
  );
}

import { Icon } from '../ui.tsx';

/**
 * The one «go back» button of a row of `SheetActions`: a square arrow on the left, like the journey from Ushuaia,
 * so the main button takes the rest of the row (#301). The arrow has no text: `label` is its accessible name.
 */
export function BackButton({ onClick, label = 'Atrás' }: { onClick: () => void; label?: string }) {
  return (
    <button type="button" className="btn sheet-back" aria-label={label} title={label} onClick={onClick}>
      {Icon.back}
    </button>
  );
}

import type { ReactNode } from 'react';

/**
 * The one row of buttons of every modal. All `.btn`, the same height and width, across the width of the sheet.
 * Only one is `.btn.primary`: last, on the right on a desktop and at the bottom on a phone.
 */
export function SheetActions({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <div className="sheet-actions" role="group" aria-label={label}>
      {children}
    </div>
  );
}

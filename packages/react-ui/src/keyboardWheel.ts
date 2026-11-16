/** Returns the normal-wheel delta for a Ctrl zoom shortcut, or null for other keys/modifiers. */
export function ctrlZoomWheelDelta(event: Pick<KeyboardEvent, 'key' | 'code' | 'ctrlKey' | 'metaKey' | 'altKey'>): number | null {
  // Keep the browser's own shortcuts when another modifier is present. In particular, Ctrl+Meta
  // is a browser shortcut on platforms that use Meta for page zoom.
  if (!event.ctrlKey || event.metaKey || event.altKey) return null;
  const zoomIn =
    event.key === '+' ||
    event.key === '=' ||
    event.key === 'Add' ||
    event.key === 'NumpadAdd' ||
    event.code === 'NumpadAdd';
  const zoomOut =
    event.key === '-' ||
    event.key === '_' ||
    event.key === 'Subtract' ||
    event.key === 'NumpadSubtract' ||
    event.code === 'NumpadSubtract';
  if (zoomIn) return -100;
  if (zoomOut) return 100;
  return null;
}

/** Sends a normal, modifier-free wheel event from the centre of the supplied viewport/canvas. */
export function dispatchWheelAtCenter(viewport: HTMLElement, deltaY: number): void {
  const target = viewport instanceof HTMLCanvasElement
    ? viewport
    : viewport.querySelector<HTMLCanvasElement>('canvas') ?? viewport;
  const rect = target.getBoundingClientRect();
  target.dispatchEvent(new globalThis.WheelEvent('wheel', {
    bubbles: true,
    cancelable: true,
    clientX: rect.left + rect.width / 2,
    clientY: rect.top + rect.height / 2,
    deltaY,
    deltaMode: 0,
  }));
}

/** Targets whose own keyboard controls must keep their shortcuts. */
export function isFormControlTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement &&
    (target.matches('input, select, textarea, [role="slider"], [contenteditable]') ||
      Boolean(target.closest('input, select, textarea, [role="slider"], [contenteditable]')) ||
      target.isContentEditable);
}

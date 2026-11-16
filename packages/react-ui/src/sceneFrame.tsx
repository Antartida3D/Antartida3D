import { useEffect, useLayoutEffect, useState, type RefObject } from 'react';
import { useThree } from '@react-three/fiber';
import type { PerspectiveCamera } from 'three';

/** How far the view moves so its centre falls in the part of the scene that panels leave free. */
export interface ViewShiftPx {
  x: number;
  y: number;
}

const NO_SHIFT: ViewShiftPx = { x: 0, y: 0 };

/**
 * Lays out a full-screen expedition with the shared top bar and chapter panel (Fósiles, Océano,
 * #209). It writes the height of the top bar, of the bottom sheet and the width the side panel
 * covers as `--scene-top`, `--scene-sheet` and `--scene-side` on the root, so a phone stage sits
 * between the bar and the sheet and the labels on the scene stay clear of both; with a side panel the stage
 * fills the screen and the returned shift centres the view in the free part, left of the panel.
 */
export function useSceneFrame(
  root: RefObject<HTMLElement | null>,
  top: RefObject<HTMLElement | null>,
  panel: RefObject<HTMLElement | null>,
  sidePanel: boolean,
): ViewShiftPx {
  const [shift, setShift] = useState<ViewShiftPx>(NO_SHIFT);
  useEffect(() => {
    const host = root.current;
    const bar = top.current;
    const side = panel.current;
    if (!host || !bar || !side) return;
    const measure = () => {
      const box = host.getBoundingClientRect();
      const barBottom = bar.getBoundingClientRect().bottom - box.top;
      const panelBox = side.getBoundingClientRect();
      host.style.setProperty('--scene-top', `${barBottom}px`);
      host.style.setProperty('--scene-sheet', sidePanel ? '0px' : `${box.bottom - panelBox.top}px`);
      host.style.setProperty('--scene-side', sidePanel ? `${box.right - panelBox.left}px` : '0px');
      const next = sidePanel ? { x: Math.round((box.right - panelBox.left) / 2), y: -Math.round(barBottom / 2) } : NO_SHIFT;
      setShift((s) => (s.x === next.x && s.y === next.y ? s : next));
    };
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    observer.observe(bar);
    observer.observe(side);
    measure();
    return () => observer.disconnect();
  }, [root, top, panel, sidePanel]);
  return shift;
}

/** Inside a Canvas: moves the centre of the view by `shift` pixels without changing its framing. */
export function ViewShift({ shift }: { shift: ViewShiftPx }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  const invalidate = useThree((s) => s.invalidate);
  useLayoutEffect(() => {
    if (shift.x || shift.y) camera.setViewOffset(width, height, shift.x, shift.y, width, height);
    else camera.clearViewOffset();
    invalidate();
  }, [camera, width, height, shift.x, shift.y, invalidate]);
  useLayoutEffect(() => () => camera.clearViewOffset(), [camera]);
  return null;
}

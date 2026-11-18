import { Icon } from '../ui.tsx';

/** Magnifies the phytoplankton of the scene, or takes it back to its real size. */
export function MagnifyButton({ magnified, onToggle, floating = false }: {
  magnified: boolean;
  onToggle: () => void;
  /** Without the 3D scene there is no alga to hang it from: it floats at the corner of the stage. */
  floating?: boolean;
}) {
  return (
    <button type="button" className={`pill marine-magnify${floating ? ' is-floating' : ''}`} aria-pressed={magnified} onClick={onToggle}>
      {magnified ? Icon.reduce : Icon.magnify}<span>{magnified ? 'Volver diminuto' : 'Aumentar tamaño'}</span>
    </button>
  );
}

import { lazy, Suspense, useMemo } from 'react';
import { arrivalMonth, factById, MONTH_NAMES, type ArrivalId } from '@antartida/core';
import { FactList } from './FactList.tsx';
import { KindChip } from './KindChip.tsx';
// Its own chunk: it needs WebGL, which the 2D map does not.
// Its own chunk: it needs WebGL, which the 2D map does not.
const ArrivalPreview = lazy(async () => {
  const [{ ModelPreview }, { VEHICLE_MODELS }, { buildHelicopterTris, buildHelicopterRotorTris }, { shift }, { HELICOPTER_ROTOR_ORIGIN }] =
    await Promise.all([
      import('../voyage/ModelPreview.tsx'),
      import('../voyage/vehicles.ts'),
      import('./lowPolyProps.ts'),
      import('../voyage/lowPoly.ts'),
      import('./stationModels.ts'),
    ]);
  // The same low-poly Sea King that lands on the diorama helipad, rotor on its mast.
  const helicopter = [...buildHelicopterTris(), ...shift(buildHelicopterRotorTris(), ...HELICOPTER_ROTOR_ORIGIN)];
  return {
    default: function ArrivalPreview({ id, reduced }: { id: ArrivalId; reduced: boolean }) {
      return id === 'ship' ? (
        <ModelPreview boxes={VEHICLE_MODELS.irizar} motion="turn" reduced={reduced} />
      ) : (
        <ModelPreview tris={helicopter} motion="turn" reduced={reduced} />
      );
    },
  };
});

const ARRIVAL_OPTIONS: readonly { id: ArrivalId; kind: string; label: string }[] = [
  { id: 'ship', kind: 'Por mar', label: 'Irízar y Zodiac' },
  { id: 'helicopter', kind: 'Por aire', label: 'Helicóptero' },
];
/** Transport selector for the Orcadas intro sheet, modeled on VoyagePanel's Picker. */
export function ArrivalPicker({
  value,
  onChange,
  preview,
  reduced,
}: {
  value: ArrivalId;
  onChange: (id: ArrivalId) => void;
  /** Show the turning 3D model of the picked vehicle (needs WebGL). */
  preview: boolean;
  reduced: boolean;
}) {
  const transportFact = useMemo(() => factById('arrival-transporte'), []);
  return (
    <div className="orc-arrival-picker">
      <div className="vpick" role="group" aria-label="Cómo llegar a Orcadas">
        {ARRIVAL_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className="vopt"
            aria-pressed={opt.id === value}
            onClick={() => onChange(opt.id)}
          >
            <small>{opt.kind}</small>
            <strong>{opt.label}</strong>
          </button>
        ))}
      </div>
      {preview && (
        <Suspense fallback={<div className="vpreview" />}>
          <ArrivalPreview id={value} reduced={reduced} />
        </Suspense>
      )}
      <p className="orc-intro-recon">
        <KindChip kind="recon" label="Reconstrucción ilustrada" />
      </p>
      <p className="vsmall">La expedición arranca en {MONTH_NAMES[arrivalMonth(value) - 1]}, temporada de visitas.</p>
      {transportFact && <FactList facts={[transportFact]} fold={false} />}
    </div>
  );
}

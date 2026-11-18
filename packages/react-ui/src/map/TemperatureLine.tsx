import { formatTemperature, formatTemperatureAge } from '@antartida/core';
import { useCurrentTemperatures } from './useCurrentTemperatures.ts';

/** The current temperature near a point (#22): a model estimate from Open-Meteo, said as such. */
export function TemperatureLine({ pointId }: { pointId: string }) {
  const { status, temperature } = useCurrentTemperatures(pointId);
  if (status === 'idle') return null;

  let text = 'Consultando temperatura…';
  if (status === 'ready' && temperature) {
    const formatted = formatTemperature(temperature.celsius, 'es');
    const age = formatTemperatureAge(temperature.time);
    text = `Temperatura actual estimada en esta zona: ${formatted} · Estimación de modelo (Open-Meteo) · ${age}`;
  } else if (status === 'error') {
    text = 'Temperatura no disponible ahora';
  }

  return (
    <p className="sheet-temp" aria-live="polite">
      {text}
    </p>
  );
}

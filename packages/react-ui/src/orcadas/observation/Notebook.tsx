import { formatTempC } from '../century/centuryData.ts';
import { beaufort, compassPoint, type Reading, type ReadingKind } from '@antartida/core';

export const NOTEBOOK_LABELS: Record<ReadingKind, { title: string; unit: string }> = {
  temp: { title: 'Temperatura (abrigo)', unit: '°C' },
  pressure: { title: 'Presión (barómetro)', unit: 'hPa' },
  wind: { title: 'Viento (anemómetro y veleta)', unit: 'km/h' },
  clouds: { title: 'Nubes (nubosidad)', unit: 'octas' },
};

export function formatRecorded(kind: ReadingKind, val: number, reading: Reading): string {
  switch (kind) {
    case 'temp':
      return formatTempC(val, 1, true);
    case 'pressure':
      return `${val.toFixed(1).replace('.', ',')} hPa`;
    case 'wind': {
      const rumbo = compassPoint(reading.windDirDeg);
      const bf = beaufort(reading.windKmh);
      return `${Math.round(val)} km/h · ${rumbo} (${bf.name})`;
    }
    case 'clouds':
      return `${Math.round(val)}/8 octas`;
  }
}

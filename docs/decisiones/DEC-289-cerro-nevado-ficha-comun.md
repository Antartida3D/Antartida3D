# DEC-289: Pingüinos de Cerro Nevado vuelve a ser un punto de interés con ficha común

```json
{
  "id": "DEC-289",
  "date": "2026-11-18",
  "status": "superseded",
  "issue": 289,
  "supersedes": ["DEC-206"],
  "supersededBy": "DEC-310"
}
```

> Reemplazada por [DEC-310](DEC-310-cerro-nevado-escena-comun.md): Cerro Nevado vuelve a abrir su escena, con la pantalla común de los puntos de interés.

## Decisión

«Pingüinos de Cerro Nevado» (`cerronevado`, `tier: 'C'`) deja de abrir una escena propia tipo expedición y vuelve a abrir su ficha informativa (`PointSheet`) con vista cercana sobre su maqueta en el mapa 3D (`closeUp`), igual que el resto de los puntos de interés.

## Motivo

El punto ya figuraba como punto de interés (`tier: 'C'`) con ficha y fuentes verificadas en `point-details.ts`, pero su comportamiento de apertura tipo expedición generaba inconsistencia con el resto de los puntos de interés.

## Referencias

- [Issue #289](https://github.com/Antartida3D/Antartida3D/issues/289).
- Reemplaza a [DEC-206](DEC-206-escena-de-un-punto-de-interes.md).
- `packages/core/src/content/points.ts`, `packages/react-ui/src/map/MapView.tsx`, `packages/react-ui/src/AntarcticaApp.tsx`.

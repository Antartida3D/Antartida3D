# DEC-289-2: Un solo toque en celular abre el marcador del mapa

```json
{
  "id": "DEC-289-2",
  "date": "2026-11-18",
  "status": "accepted",
  "issue": 289,
  "supersedes": [],
  "supersededBy": null
}
```

## Decisión

Al tocar un marcador en dispositivos táctiles (`touch` o `pen`), `markerPress` abre directamente la ficha o introducción del punto en el primer toque, igual que al hacer clic con el mouse o activar con teclado. Se conserva el uso de `.mk.shown` para la primera visita guiada y la interacción con el resto de la interfaz.

## Motivo

La regla anterior del doble toque obligaba a pulsar dos veces cada punto en celular, generando fricción y dando la sensación de que el primer toque fallaba en comparación con escritorio.

## Referencias

- [Issue #289](https://github.com/Antartida3D/Antartida3D/issues/289).
- Reemplaza el comportamiento de doble toque en celular de la sección «Carteles del mapa cerrados (#54, 12-11-2026)» en [decisiones.md](../decisiones.md).
- `packages/core/src/markers.ts`, `packages/core/test/map.test.ts`, `packages/e2e/tests/touch-zoom.spec.ts`.

# DEC-146: El viaje de Poncho se cuenta en orden; los viajes desde Ushuaia son opcionales

```json
{
  "id": "DEC-146",
  "date": "2026-11-15",
  "status": "accepted",
  "issue": 146,
  "supersedes": [],
  "supersededBy": null
}
```

## Decisión

El viaje de Poncho es una historia con principio y fin: se detiene en cada hito, abre su diorama y no se puede saltear. Los viajes desde Ushuaia siguen con los hitos y preguntas opcionales de #157. La regla está en `storyInOrder` (`packages/core/src/voyage.ts`).

## Motivo

Los hitos de Poncho se apoyan unos en otros (cada gancho anticipa el siguiente) y el diorama de cada parada cuenta la historia en etapas. Saltear uno deja la historia incompleta. En los viajes desde Ushuaia el pasajero elige qué leer.

## Referencias

- [Issue #146](https://github.com/Antartida3D/Antartida3D/issues/146) y [#157](https://github.com/Antartida3D/Antartida3D/issues/157).
- Pedido de la persona que lleva el trabajo, en la conversación del 15 de noviembre de 2026: «Se puede hacer que poncho sea obligatorio y el de que trae main sean opcionales?». Esta cita no representa una revisión posterior del resultado.
- [Diseño de la expedición](../expediciones/poncho-diseno.md).

## Estado de implementación y verificación

Implementado en la rama `9-expedición-poncho`. Pruebas de `@antartida/core` (regla de orden) y e2e del viaje desde Ushuaia (`pnpm exec playwright test voyage`, 8 de 8) pasadas el 15 de noviembre de 2026 antes de la última integración con `main`.

## Actualización de vigencia (16 de noviembre de 2026)

La regla de orden de esta decisión sigue vigente. Lo que cuenta sobre el diorama «en etapas» (una frase por toma, con «Siguiente») quedó reemplazado por [DEC-211](DEC-211-panel-de-poncho-como-fosiles.md): el panel de cada parada sigue el diseño de Fósiles, con una frase por vez y flechas. Además, las paradas ya recorridas se pueden releer y volver a abrir (#214); lo que sigue sin permitirse es saltear una parada que todavía no se recorrió.

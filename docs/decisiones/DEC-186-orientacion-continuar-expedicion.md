# DEC-186: «Continuar» retoma la expedición en el paso donde quedó

```json
{
  "id": "DEC-186",
  "date": "2026-11-16",
  "status": "accepted",
  "issue": 186,
  "supersedes": [],
  "supersededBy": null
}
```

## Decisión

El mapa ofrece «Continuar: <expedición> · <paso>» (por ejemplo «punto 3 de 6») cuando la última expedición abierta no se terminó. Cubre las seis expediciones. Al pulsarlo se abre en ese paso: el punto en Marambio, la parada en Fósiles y en Océano, el capítulo y la parada guiada en Orcadas, y el hito en los viajes de Ushuaia y de Poncho. El viaje retoma con el mismo vehículo, sin pasar por el selector, en el hito ya pasado; no se ofrece si el viaje estaba llegando al final. Los avistajes y los hitos leídos del viaje no se restauran. Orcadas no restaura las lecturas ni las respuestas del capítulo. El punto se guarda en `localStorage` (`antartida:last`, JSON con `id`, `step` y `sub`) cada vez que cambia el paso y se borra al completar la expedición. Abrir una expedición por cualquier otro camino la empieza de cero. Sin storage, el botón no aparece. El botón usa el ocre de los marcadores de expedición, para distinguirse del mar.

El viaje del mapa no cambia: #190 ya oculta el título durante el viaje, puso «Salir» con texto arriba a la derecha y cada tarjeta de hito dice «Hito N de M». Orcadas, Marambio y Fósiles ya tenían título con posición y botón «Mapa» con texto.

Queda fuera la pista de uso permanente («arrastrá para mover»).

## Motivo

La prueba con usuarios del 15 de noviembre de 2026 mostró que se pierden al volver al mapa. Una primera versión retomaba solo la expedición, desde su comienzo. El usuario la descartó el 16 de noviembre de 2026 por no tener sentido: «Continuar» que lleva al inicio no continúa nada. Los pasos ya vivían en estados chicos de cada expedición, así que retomarlos cuesta poco.

## Referencias

- [Issue #186](https://github.com/Antartida3D/Antartida3D/issues/186): ideas de orientación.
- Acuerdo del usuario en la conversación del 16 de noviembre de 2026: se eligen «Dónde estoy», «Volver al mapa visible» y «Continuar donde quedé». Después de ver el botón, pidió que «Continuar» retome el paso exacto («hazlo»).
- Plan: `.agents/plans/plan-orientacion-y-encabezado-3d.md`.

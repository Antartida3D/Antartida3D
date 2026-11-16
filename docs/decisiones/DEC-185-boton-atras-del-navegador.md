# DEC-185: El botón «atrás» del navegador cierra la capa abierta

```json
{
  "id": "DEC-185",
  "date": "2026-11-16",
  "status": "accepted",
  "issue": 185,
  "supersedes": [],
  "supersededBy": null
}
```

## Decisión

Mientras haya una capa abierta (ficha de un punto, lista, intro de Orcadas, viaje desde Ushuaia, detalle de reclamos o una expedición), la app mantiene una sola entrada en el historial del navegador. «Atrás» cierra la capa de arriba y, si quedan otras, vuelve a crear la entrada. En el mapa sin nada abierto, «atrás» sale de la app como siempre. Cerrar con Escape o con los botones quita la entrada sin dejar restos.

La URL no cambia: no hay rutas ni enlaces a una expedición. Dentro de una expedición, «atrás» vuelve al mapa; no cierra los paneles internos de la expedición.

## Motivo

En la prueba con usuarios (15 de noviembre de 2026), quien se confundía y tocaba «atrás» salía de la app, por ejemplo de vuelta al chat donde había abierto el enlace. Una entrada única, en lugar de una por capa, evita entradas sobrantes cuando una capa se cierra por la interfaz.

## Referencias

- [Issue #185](https://github.com/Antartida3D/Antartida3D/issues/185): problema y criterio de terminado.
- `useBackLayer`, en `packages/react-ui/src/hooks.ts`. Pruebas: `packages/e2e/tests/history.spec.ts`.
- [Issue #75](https://github.com/Antartida3D/Antartida3D/issues/75): guía de «qué sigue» y menú de expediciones, fuera de esta decisión.

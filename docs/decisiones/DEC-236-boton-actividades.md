# DEC-236: el botón de la lista de puntos se llama «Actividades»

```json
{
  "id": "DEC-236",
  "date": "2026-11-16",
  "status": "accepted",
  "issue": 236,
  "supersedes": [],
  "supersededBy": null
}
```

## Decisión

El botón del mapa que abre la lista de puntos dice «Actividades», no «Ver como lista». Cambia solo el texto. El ícono, el lugar y el comportamiento quedan igual. El título de la lista sigue siendo «Todos los puntos» y se cierra con «Ver mapa».

El texto vive en un solo lugar, `LIST_BUTTON_LABEL` de `@antartida/core`. El botón (`MapView.tsx`) y las pruebas e2e lo leen de ahí, así que un cambio futuro de nombre toca una sola línea.

## Motivo

A quien pidió el cambio no le gustan las palabras «Ver como lista»: describen la forma de la pantalla y no lo que el visitante encuentra. «Actividades» dice qué hay dentro: las expediciones y los puntos de interés.

## Referencias

- [Issue #236](https://github.com/Antartida3D/Antartida3D/issues/236).
- Pedido del usuario en la tarea del issue #236, el 16 de noviembre de 2026: «No me gusta esa forma de usar esas palabras. Quiero que diga actividades.».
- [`LIST_BUTTON_LABEL`](../../packages/core/src/content/points.ts) y [el botón](../../packages/react-ui/src/map/MapView.tsx).
- El registro histórico de [decisiones.md](../decisiones.md) conserva el nombre anterior del botón: es un antecedente y no se reescribe.

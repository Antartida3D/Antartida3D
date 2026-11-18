# DEC-282: la vista previa de Base Marambio muestra la maqueta del mapa, quieta

```json
{
  "id": "DEC-282",
  "date": "2026-11-17",
  "status": "accepted",
  "issue": 282,
  "supersedes": [],
  "supersededBy": null
}
```

## Decisión

En el modal previo de Base Marambio (`ExpeditionIntro`), la vista previa deja de mostrar el Hércules girando. Muestra la maqueta low-poly de la base que está en el mapa (`MARAMBIO_SITE_POLY`), con los mismos colores del relieve, y no gira (`motion="still"`). Como la maqueta es plana y la vista previa es ancha, se dibuja 1,4 veces más ancha que los demás modelos (`MARAMBIO_PREVIEW_WIDTH` en `IntroPreview.tsx`).

No reemplaza DEC-264: el modal de cada expedición sigue con el mismo formato. Solo cambia el modelo de Marambio y su movimiento. Las demás expediciones siguen con su modelo que gira.

## Motivo

Lo pidió la persona a cargo de la expedición. La maqueta conecta el modal con lo que se ve en el mapa, y la base se presenta como lugar, no como vehículo.

## Referencias

- [DEC-264](DEC-264-modales-normalizados.md), punto 10.
- [Issue #282](https://github.com/Antartida3D/Antartida3D/issues/282). El pedido consta en la sesión de trabajo del 17 de noviembre de 2026.

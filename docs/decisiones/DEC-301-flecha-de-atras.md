# DEC-301: atrás es una flecha y el botón principal ocupa el resto de la fila

```json
{
  "id": "DEC-301",
  "date": "2026-11-18",
  "status": "accepted",
  "issue": 301,
  "supersedes": [],
  "supersededBy": null
}
```

## Decisión

1. En el panel de cada expedición (Orcadas, Marambio, Fósiles, Océano y Poncho), volver al paso anterior es un botón cuadrado de 48 px con la flecha a la izquierda, sin texto visible. El botón principal («Siguiente» o la acción del paso) ocupa todo el ancho que queda. Es el mismo patrón de la barra del viaje desde Ushuaia.
2. El botón tiene una sola definición: `BackButton` (`packages/react-ui/src/sheet/BackButton.tsx`), dentro de `SheetActions`. Su nombre accesible sigue siendo «Atrás» (Océano usa «Volver a la superficie» u «Ocultar el ejemplo» cuando corresponde), así que los lectores de pantalla y las pruebas lo encuentran igual.
3. La fila se acomoda en `sheet.css` (`.sheet-actions:has(> .sheet-back)`). Se quitaron las clases propias de cada expedición: `.orc-btn-back`, `.fossil-prev`, `.marine-prev`, `.poncho-prev` y `.poncho-prev-arrow`.
4. Cada expedición conserva cuándo aparece el botón: se oculta en el primer paso, como antes.
5. La barra del viaje desde Ushuaia conserva su botón de atrás (`.vback`), que se mantiene apretado para retroceder, pero cambia el triángulo relleno «◀» por la misma flecha de contorno (`Icon.back`). Todas las flechas de atrás son iguales: contorno, sin relleno.

Cambia el aspecto descrito en [DEC-211](DEC-211-panel-de-poncho-como-fosiles.md) («Atrás» con flecha y texto) para Poncho; el resto de esa decisión sigue vigente.

## Motivo

Lo pidió quien lleva el issue: en varias pantallas «Atrás» y «Siguiente» eran dos botones de texto del mismo ancho, distintos del viaje desde Ushuaia. Con la flecha, la acción principal se ve primero y es más fácil de tocar en el celular.

## Referencias

- [Issue #301](https://github.com/Antartida3D/Antartida3D/issues/301). El pedido consta en la sesión de trabajo del 18 de noviembre de 2026, con capturas del antes y el después.
- [DEC-234](DEC-234-componentes-de-interfaz.md) y [DEC-264](DEC-264-modales-normalizados.md): componentes y filas de botones con una sola definición.

# DEC-238: marcadores en abanico en lugar de grupos con número

```json
{
  "id": "DEC-238",
  "date": "2026-11-16",
  "status": "accepted",
  "issue": 238,
  "supersedes": ["DEC-7", "DEC-75-2"],
  "supersededBy": null
}
```

## Decisión

El mapa ya no agrupa marcadores en un círculo con número. Cada punto tiene siempre su propio marcador, que se puede tocar directo. Cuando dos o más marcadores se pisan en pantalla (a menos de 60 px, u 80 px en pantallas anchas), se corren lo justo para quedar a esa distancia entre sí, dispuestos en un polígono regular alrededor de su centro, y cada uno lleva una línea fina hasta su lugar real, y su palito sube más cuanto más se corre. Al acercar, el corrimiento baja solo y la línea desaparece cuando ya no hay choque. La regla vive en `fanOffsets` (`packages/core/src/fan.ts`); `buildMarkers` la aplica al mapa 2D y `Map3DLayer` la recalcula en cada cuadro con las posiciones reales de la cámara.

Las coordenadas de los puntos no cambian. Sigue valiendo lo que fijó DEC-7: el punto de Fósiles va en el oeste de la isla James Ross (≈ 64,0° S, 58,05° O) y no se aleja de su lugar real. Base Marambio queda en la isla Marambio. Se quitan la ventana «Puntos en este lugar» y su variante de hoja inferior (DEC-75-2).

## Motivo

El número no dice qué hay adentro, obliga a tocar para descubrirlo y no ayuda a quien visita. Además, Base Marambio, Fósiles y Poncho están a unos 75-90 km entre sí: ni con el zoom al máximo se separaban, así que el grupo era permanente. El abanico los muestra siempre separados sin presentar una ubicación falsa, porque la línea marca dónde está cada uno de verdad.

## Referencias

- [Issue #238](https://github.com/Antartida3D/Antartida3D/issues/238). Quien lleva el issue eligió el abanico con líneas entre cuatro opciones, sin alejar a Fósiles ni cambiar el zoom máximo.
- Pruebas: `packages/core/test/map.test.ts` (corrimientos y separación mínima a cualquier zoom) y `packages/e2e/tests/fossils.spec.ts`.
- [DEC-7](DEC-7-pin-y-grupos-para-elegir.md) y [DEC-75-2](DEC-75-2-selector-de-grupo-como-hoja.md): reemplazadas.

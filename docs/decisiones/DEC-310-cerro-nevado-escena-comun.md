# DEC-310: Pingüinos de Cerro Nevado vuelve a abrir su escena, con la pantalla común de los puntos de interés

```json
{
  "id": "DEC-310",
  "date": "2026-11-18",
  "status": "accepted",
  "issue": 310,
  "supersedes": ["DEC-289"],
  "supersededBy": null
}
```

## Decisión

1. «Pingüinos de Cerro Nevado» (`cerronevado`, `tier: 'C'`) vuelve a abrir su escena propia, la pingüinera de #206, en lugar de la ficha común de [DEC-289](DEC-289-cerro-nevado-ficha-comun.md).
2. Usa la escena común de [DEC-280](DEC-280-escenas-de-puntos-de-interes.md), como Thwaites, Vostok, el Polo Sur, Belgrano II y Testigos de hielo:
   - `CERRO_NEVADO_SCENE` está en `SCENE_POINTS` (`packages/core/src/scene-points.ts`).
   - `CerroNevadoExpedition` monta `ScenePointScreen` con `CerroNevadoScene`, ya armada sobre `PointScene3D`.
   - Tiene el encabezado, el cartel de ubicación y la etiqueta de escena de [DEC-297](DEC-297-encabezado-comun-de-expediciones.md), la temperatura actual (#285) y el botón «Ver de cerca» en su modal de entrada.
3. Sigue siendo un punto de interés: no suma al registro ni se guarda para «Continuar». Sus textos y fuentes son los ya verificados de #206.
4. Erebus queda como el único punto de interés con modelo que abre una ficha con acercamiento.
5. En celular, el cartel de ubicación de las escenas tiene un ancho máximo, para que un lugar largo pase a otra línea y no tape «Mapa» ni «Fuentes».
6. La pantalla común de las escenas usa `BackButton` para «Atrás», la flecha de [DEC-301](DEC-301-flecha-de-atras.md), como las expediciones; #301 no la había alcanzado.

## Motivo

DEC-289 volvió Cerro Nevado a ficha para que fuera coherente con el resto de los puntos de interés. Desde #280, #281 y #286 a #288, los puntos de interés con modelo propio abren su escena, así que la coherencia ahora pide lo contrario. Quien lleva el issue pidió restaurar la pingüinera con el mismo estilo que los puntos nuevos.

## Referencias

- [Issue #310](https://github.com/Antartida3D/Antartida3D/issues/310).
- Reemplaza a [DEC-289](DEC-289-cerro-nevado-ficha-comun.md).
- Pruebas: `packages/e2e/tests/cerronevado.spec.ts`, `packages/core/test/scene-points.test.ts` y `packages/e2e/tests/map3d.spec.ts` (la ficha con acercamiento pasa a Erebus).

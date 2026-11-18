# DEC-286: el Polo Sur abre una escena propia y los reclamos se abren desde su modal de entrada

```json
{
  "id": "DEC-286",
  "date": "2026-11-18",
  "status": "accepted",
  "issue": 286,
  "supersedes": [],
  "supersededBy": null
}
```

## Decisión

1. «El Polo Sur» abre una escena propia sobre la escena común de [DEC-280](DEC-280-escenas-de-puntos-de-interes.md), como Thwaites y Vostok.
   - El escenario es la Estación Amundsen-Scott del modelo del mapa (`POLO`), a escala de escena, sobre la meseta nevada común (`scenepoint/sceneGround.ts`), que también usa Vostok.
   - Las banderas del anillo flamean como en el mapa (`SceneFlags`, con `flagSwing`).
   - Sus tres puntos usan una oración cada uno de la ficha ya verificada, sin datos ni fuentes nuevos.
2. Los reclamos territoriales (#128) se abrían solo desde la ficha del Polo, que deja de existir. El botón «Ver reclamos territoriales» pasa al modal de entrada del Polo (`ExpeditionIntro`, opción `action`), solo en el mapa 3D, entre «Volver al mapa» y «Comenzar expedición».
   - La opción `action` sale de `PointSheet`, porque ningún otro punto la usaba.
   - Mientras el modal de entrada está abierto, el panel de reclamos se oculta, como con una ficha.
   - El modal de entrada no acerca la cámara al Polo como hacía la ficha: al tocar el botón, el mapa ya muestra el continente entero.

## Motivo

Quien lleva el issue pidió llevar la estética de las escenas a los puntos que se veían planos. Para el lugar de los reclamos eligió el modal de entrada entre tres opciones (modal de entrada, dentro de la escena o dejar la ficha del Polo): es el mismo paso que antes daba la ficha.

## Referencias

- [Issue #286](https://github.com/Antartida3D/Antartida3D/issues/286) y [#128](https://github.com/Antartida3D/Antartida3D/issues/128).
- Pruebas: `packages/core/test/scene-points.test.ts`, `packages/react-ui/test/poloScene.test.ts`, `packages/e2e/tests/scene-points.spec.ts` y `packages/e2e/tests/claims.spec.ts`.

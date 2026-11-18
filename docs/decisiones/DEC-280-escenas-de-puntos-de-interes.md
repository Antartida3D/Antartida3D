# DEC-280: escena común para los puntos de interés con escena propia, y Thwaites como el primero

```json
{
  "id": "DEC-280",
  "date": "2026-11-17",
  "status": "accepted",
  "issue": 280,
  "supersedes": [],
  "supersededBy": null
}
```

## Decisión

1. Un punto de interés (`tier: 'C'`) puede abrir una escena propia sin ser una expedición, como hacía Cerro Nevado con [DEC-206](DEC-206-escena-de-un-punto-de-interes.md). No suma al registro, no se guarda para «Continuar» y conserva su marca de «Punto de interés».
2. Antes de la escena se abre el modal de entrada de las expediciones (`ExpeditionIntro`), pero su botón principal dice «Ver de cerca» (`SCENE_START_LABEL`) y no «Comenzar expedición»: es un punto de interés.
3. La lista `SCENE_POINTS` y `isScenePoint` (`packages/core/src/scene-points.ts`) dicen qué puntos abren escena. `AntarcticaApp.tsx` y `MapView.tsx` usan `isScenePoint`.
4. La escena 3D de Cerro Nevado se generaliza y queda como base común:
   - `ScenePointScreen` (`packages/react-ui/src/scenepoint/`): panel, puntos tocables y fuentes, con los componentes de modal de [DEC-264](DEC-264-modales-normalizados.md) y el encabezado, la etiqueta de escena y el cartel de ubicación comunes de [DEC-297](DEC-297-encabezado-comun-de-expediciones.md).
   - `PointScene3D`: lienzo dentro de `CanvasGuard`, cielo, mar, témpanos con su línea de agua, efecto de tinta y cámara con gestos.
   - Cada punto aporta solo su escenario, sus vistas, sus límites de cámara y sus partes que se mueven.
   - Cerro Nevado no está en la lista: desde [DEC-289](DEC-289-cerro-nevado-ficha-comun.md) abre su ficha común. Su escena (`cerronevado/CerroNevadoScene.tsx`) queda armada sobre `PointScene3D`, sin montarse, como la dejó DEC-297.
5. El contenido sigue un solo tipo, `ScenePoint` (`packages/core/src/content/scene-point.ts`).
6. «Glaciares que cambian» (Thwaites) es el primer punto con escena común (`packages/react-ui/src/thwaites/`):
   - Reutiliza el frente del mapa y de la ficha (`thwaitesFront`), a escala de mundo, sobre la misma costa inventada de la ficha.
   - El bloque que se desprende se anima con `calvingPose`, como en el mapa.
   - Sus cuatro puntos reparten las oraciones ya verificadas de la ficha, sin datos ni fuentes nuevos. Una prueba lo controla: el texto de los hechos reales es exactamente la ficha.
   - Se marca como reconstrucción ilustrada: el frente y el hielo están dibujados más altos, el ancho está acortado y los desprendimientos están acelerados.

## Motivo

Quien lleva el issue notó que la toma cercana de los puntos sobre el mapa se veía plana frente a la escena de Cerro Nevado y pidió llevar esa estética a los demás puntos, reutilizando modelos, modales y componentes en lugar de rehacerlos. Una escena común evita copiar la de Cerro Nevado en cada punto.

## Referencias

- [Issue #280](https://github.com/Antartida3D/Antartida3D/issues/280). El siguiente es Vostok ([#281](https://github.com/Antartida3D/Antartida3D/issues/281)).
- Pruebas: `packages/core/test/scene-points.test.ts`, `packages/react-ui/test/thwaitesScene.test.ts` y `packages/e2e/tests/scene-points.spec.ts` (Thwaites y, desde #281, Vostok).

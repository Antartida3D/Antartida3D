# DEC-276: pantalla de carga cartográfica en azul con dato real y acciones de primera visita

```json
{
  "id": "DEC-276",
  "date": "2026-11-17",
  "status": "accepted",
  "issue": 276,
  "supersedes": ["DEC-258"],
  "supersededBy": null
}
```

## Decisión

1. Se restaura la pantalla de carga cartográfica centrada sobre fondo papel (`--paper`, `#F3EBDD`) con la ilustración SVG del continente (`AntarcticaIllustration`, `splitAntarcticaCoastline`) encima de la tarjeta, y se quitan el póster 3D (`Poster.tsx`), sus imágenes `loader-poster-*.webp`, `loader-poster.json`, el script `build-loader-poster.ts` (`pnpm poster`) y las utilidades `posterReveal` / `POSTER_SOLID`.
2. Los acentos naranjas (`--oxide`) de la versión cartográfica anterior pasan a la paleta azul del mapa: `--deep` (`#1E3E5C`) en la silueta y costas de la Antártida, las curvas de nivel, la barra de progreso, los pasos completados, el pulso del paso activo y el botón primario; `--glacier` (`#7FA8C4`) en el relleno suave de las barreras de hielo, el halo costero y el marcador del paso activo; `--oxide` queda solo para el mensaje de error.
3. La ilustración cartográfica se afina respecto de la versión anterior: las barreras de hielo (`ICE_SHELVES_PATH`) dejan de dibujarse con trazo grueso sin relleno (que dejaba un corte vertical en la barrera de Ross) y pasan a relleno glaciar con contorno limpio y cobertura recortada de la costura (`ICE_SHELF_SEAM`), sumando cinco bandas reales de elevación de Bedmap3 (`RELIEF_CONTOURS`, generadas con `build-relief-svg.ts` desde `terrain-mesh-lo.bin`).
4. La tarjeta mantiene un borde único con radio `--chart-radius` y sombra `--chart-shadow`, sin doble marco interior ([DEC-234](DEC-234-componentes-de-interfaz.md)).
5. Se mantienen los textos llanos actuales en los cinco pasos (`LOADER_STEP_TEXT` y `LOADER_STEP_TEXT_2D`), el ritmo de avance (`LOADER_STEP_MS = 450`, `pacedSteps`, fundido `LOADER_FADE_MS = 400`) y el bloque «Mientras tanto · dato real» (`loaderFact`) debajo de los pasos mientras carga.
6. En primera visita (`!loadIntroSeen()`), al terminar la carga, la cabecera, la barra y los cinco pasos completados quedan visibles, y el bloque inferior cambia al título y texto de bienvenida (`READY_CARD`, sin el rótulo visible «Mapa listo») con los botones `Sin guía` (`.btn`) y `Exploración guiada` (`.btn.primary`) para iniciar la guía de [DEC-256](DEC-256-carta-de-presentacion.md).
7. El respaldo automático a 2D sin WebGL o ante fallo del 3D (`unavailable3D`: «Seguimos con el mapa en 2D») se mantiene, mostrando solo la silueta base de costas sin relleno ni «Dato real».

## Motivo

El póster 3D resultó innecesario frente a la ilustración cartográfica vectorial propia de la aplicación, y quien lleva el trabajo pidió recuperar la composición clásica (continente dibujándose arriba y tarjeta centrada con los cinco hitos), pero en azul en vez de naranja y conservando las mejoras funcionales de #256 y #258: textos llanos, ritmo fluido, «Dato real» durante la carga y acceso directo a «Sin guía» / «Exploración guiada» sin tapar los pasos completados.

## Referencias

- [Issue #276](https://github.com/Antartida3D/Antartida3D/issues/276): solicitud y aprobación de previsualizaciones por quien lleva el issue (17-11-2026).
- [DEC-258](DEC-258-pantalla-de-carga.md): pantalla de carga con póster 3D reemplazada por esta decisión.
- [DEC-256](DEC-256-carta-de-presentacion.md): flujo de primera visita y guía de tres pasos.
- [DEC-234](DEC-234-componentes-de-interfaz.md): componentes de interfaz, primario azul y borde simple.
- [Pantalla de carga](../diseno/pantalla-carga.md).

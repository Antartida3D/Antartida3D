# Pantalla de carga

Decisión vigente: [DEC-276](../decisiones/DEC-276-carga-cartografica-azul.md) (reemplaza a [DEC-258](../decisiones/DEC-258-pantalla-de-carga.md)). La primera visita sigue con la guía de [DEC-256](../decisiones/DEC-256-carta-de-presentacion.md).

La pantalla de carga cubre el primer render del mapa con una composición cartográfica sobre papel. Lleva `data-loading-variant="map3d"` cuando se prepara el relieve y `data-loading-variant="map2d"` cuando la vista guardada o el dispositivo empieza en el mapa dibujado. Con el mapa 2D deshabilitado ([DEC-227](../decisiones/DEC-227-mapa-2d-deshabilitado.md)) no hay botón «Ver mapa 2D»: la variante `map2d` aparece solo sin WebGL, y un error de carga del 3D pasa solo al mapa 2D.

## Qué se ve

- **Fondo:** `--paper` (`#F3EBDD`). El `body` y el `theme-color` de `index.html` tienen el mismo color para evitar destellos antes de que monte React.
- **Ilustración SVG** (`loading/LoadingScreen.tsx`): silueta de la Antártida (`ANTARCTICA_PATH`, separada en continente e islas por `splitAntarcticaCoastline`) con contorno azul `--deep` (`#1E3E5C`), barreras de hielo (`ICE_SHELVES_PATH` + `ICE_SHELF_SEAM` recortado sin costura vertical en Ross) y cinco bandas topográficas reales de Bedmap3 (`RELIEF_CONTOURS`, generadas con `pnpm --filter @antartida/core relief-svg` desde `terrain-mesh-lo.bin`) sobre graticulado circular tenue. El relleno y las curvas se revelan desde el centro con el progreso real; es decorativa (`aria-hidden="true"`).
- **Tarjeta** (`loading/LoadingScreen.tsx`): rótulo `Atlas antártico · Vista 3D` (o `Carta 2D`), título `Desplegando la carta austral`, barra con `role="progressbar"`, lista de hitos con textos llanos (`LOADER_STEP_TEXT` o `LOADER_STEP_TEXT_2D`) en `--deep` (`#1E3E5C`) y `--glacier`, y el bloque inferior. Superficie `--chart-surface`, borde único `--chart-rule` con radio `--chart-radius` y sombra `--chart-shadow`.

## Dato real y primera visita

- **Mientras carga:** debajo de los hitos se muestra «Mientras tanto · dato real». `loaderFact(random)` (`core/src/loading.ts`) elige entre `thwaites`, `vostok`, `erebus` y `emperador`, cita la primera oración de la ficha tal cual (`firstSentence`) y nombra todos los organismos de sus fuentes sin repetir más el título de la ficha.
- **Al terminar en primera visita:** la cabecera, la barra al 100 % y los cinco tildes quedan visibles, y el bloque inferior pasa al título y texto de bienvenida (`READY_CARD`, sin mostrar el rótulo «Mapa listo») con los botones `Sin guía` (`.btn`) y `Exploración guiada` (`.btn.primary`) para iniciar la guía de [DEC-256](../decisiones/DEC-256-carta-de-presentacion.md).

## Tiempos

Cada paso real se muestra al menos 450 ms (`LOADER_STEP_MS`; `pacedSteps` lo marca de a uno y nunca adelantado), para que se vea avanzar la barra y la silueta mientras se lee el dato. En visitas siguientes, al terminar el último paso el cargador hace un fundido de 400 ms (`LOADER_FADE_MS`). Con `prefers-reduced-motion: reduce` no hay fundido ni animación de revelado y el cargador se corta directo.

## Fallo del 3D o sin WebGL

Queda solo la silueta base de costas (sin barreras ni relleno), el título «Seguimos con el mapa en 2D» y el texto «El relieve 3D no pudo cargar en este dispositivo. Abrimos el mapa dibujado en su lugar.», con los dos hitos del 2D y sin «Dato real».

## Verificación

El contrato se verifica en `packages/core/test/loading.test.ts` (store, textos, ritmo, `splitAntarcticaCoastline` y `loaderFact`), `packages/core/test/styles.test.ts` (regla 40 y tokens), `packages/e2e/tests/loading.spec.ts` (carga 3D, dato real, fallback 2D, tiempos y movimiento reducido) y `packages/e2e/tests/intro.spec.ts` («Mapa listo» y guía).

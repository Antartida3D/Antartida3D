# Pantalla de carga

Decisión: [DEC-258](../decisiones/DEC-258-pantalla-de-carga.md). La primera visita sigue con la guía de [DEC-256](../decisiones/DEC-256-carta-de-presentacion.md).

La pantalla de carga cubre el primer render del mapa y muestra el mapa que se va a usar dibujándose. Lleva `data-loading-variant="map3d"` cuando se prepara el relieve y `data-loading-variant="map2d"` cuando la vista guardada o el dispositivo empieza en el mapa dibujado. Con el mapa 2D deshabilitado ([DEC-227](../decisiones/DEC-227-mapa-2d-deshabilitado.md)) no hay botón «Ver mapa 2D»: la variante `map2d` aparece solo sin WebGL, y un error de carga del 3D pasa solo al mapa 2D.

## Qué se ve

- **Fondo:** `--deep`, el azul del océano del mapa. El `body` y el `theme-color` de `index.html` tienen el mismo color, para que no haya un destello de papel antes de que monte React.
- **Póster en dos capas** (`loading/Poster.tsx`): el primer cuadro del mapa 3D, sin interfaz. La capa de boceto va en gris (`grayscale`, opacidad 0,2). La capa de color lleva una máscara radial centrada en el Polo Sur, cuyo radio sale de `posterReveal` según el progreso real de los pasos. Una retícula de elipses y meridianos, decorativa, acompaña al polo. Es una imagen de la propia aplicación, no un dato: `alt=""` y `aria-hidden`.
- **Tarjeta** (`loading/LoadingScreen.tsx`): rosa de los vientos, `Antártida por descubrir` y `n de 5`; el paso en lenguaje llano (`LOADER_STEP_TEXT`); una barra con `role="progressbar"`; y «Mientras tanto · dato real». Superficie `--chart-surface`, un solo borde `--chart-rule` y la sombra `--chart-shadow-dark`. Escritorio: abajo a la izquierda, 440 px. Celular: abajo, a ancho completo menos 12 px.
- **Pasos:** en 3D, los cinco hitos reales de `MAP3D_STEPS` (módulo de escena, relieve, océano, tierras, luces). En 2D, dos: inicialización y mapa 2D. El estado se anuncia también en la región viva.

## Dato real

`loaderFact(random)` (`core/src/loading.ts`) elige entre `thwaites`, `vostok`, `erebus` y `emperador`, las fichas que tienen descripción y fuentes verificadas. Muestra la primera oración tal cual (corta en un punto seguido de espacio y mayúscula, así que «3.794 m» no corta) y debajo cita el organismo de cada fuente de la ficha, sin repetir, y el título de la ficha. La oración se apoya en el conjunto de fuentes, por eso se citan todas. Una ficha sin fuentes no es candidata.

## Tiempos

Cada paso real se muestra al menos 450 ms (`LOADER_STEP_MS`; `pacedSteps` lo marca como hecho de a uno y nunca adelantado), para que se vea qué carga la barra, cómo se rellena el mapa y se alcance a leer el dato. Al terminar el último paso el cargador sale sin espera extra y hace un fundido de 400 ms (`LOADER_FADE_MS`). No hay una espera fija después de `ready`. En la primera visita no se cierra: la tarjeta pasa a «Mapa listo», con «Sin guía» y «Exploración guiada» a todo el ancho, y espera a la persona (DEC-256). Con `prefers-reduced-motion: reduce` no hay fundido ni máscara animada: el color llega entero al estar listo y el cargador se corta directo.

## Fallo del 3D o sin WebGL

Queda solo la capa de boceto, el título «Seguimos con el mapa en 2D» y el texto «El relieve 3D no pudo cargar en este dispositivo. Abrimos el mapa dibujado en su lugar.», con la barra de los dos pasos del 2D y `Mapa 2D` arriba a la derecha. Sin «Dato real».

## Cómo regenerar el póster

El póster y la posición del polo se generan con `pnpm poster` (`packages/core/scripts/build-loader-poster.ts`). El script compila la aplicación, abre la vista inicial (`homePose3D`) con Chromium (WebGL por CPU, igual en cualquier máquina), oculta todo menos el `<canvas>` y guarda `packages/core/src/assets/loader-poster-wide.webp` (1440 × 900 a 2x), `loader-poster-tall.webp` (390 × 844 a 3x) y `loader-poster.json` (el polo, en porcentaje). Cada WebP queda en unos 370 KB (apaisado) y 220 KB (vertical): se prioriza la nitidez sobre el peso. Hay que volver a correrlo cuando cambie la vista inicial, el relieve o el estilo pintado del mapa; si no, el póster deja de calzar con el mapa vivo y el fundido lo muestra.

## Verificación

El contrato se verifica en `packages/e2e/tests/loading.spec.ts` (variantes 3D y 2D, movimiento reducido, fallo del 3D, fondo `--deep`, un solo borde y «Dato real» con fuentes) y en `intro.spec.ts` (tarjeta «Mapa listo» y guía), a 390 y 1440 px. La lógica pura tiene sus pruebas en `core/test/loading.test.ts`, `first-visit.test.ts`, `welcome.test.ts` y `guide.test.ts`.

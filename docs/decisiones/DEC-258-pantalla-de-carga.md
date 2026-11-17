# DEC-258: pantalla de carga con el mapa dibujándose

```json
{
  "id": "DEC-258",
  "date": "2026-11-17",
  "status": "superseded",
  "issue": 258,
  "supersedes": [],
  "supersededBy": "DEC-276"
}
```

## Decisión

1. La pantalla de carga muestra el primer cuadro del mapa 3D como un póster en dos capas: un boceto gris y, encima, el color, que crece desde el Polo Sur a medida que terminan los pasos reales de `MAP3D_STEPS`. Una tarjeta chica (abajo a la izquierda en escritorio, abajo a ancho completo en celular) cuenta el paso en lenguaje llano, con `n de 5` y una barra con `role="progressbar"`.
2. El fondo es `--deep` (el azul del océano del mapa), sin `--oxide`, y la tarjeta lleva un solo borde y una sombra sobre fondo oscuro (token `--chart-shadow-dark`). Se quitan el doble marco, la lista de cinco pasos, el rótulo «Atlas antártico», la ilustración SVG y sus utilidades (`AntarcticaIllustration`, `splitAntarcticaCoastline`).
3. El póster es una imagen de la propia aplicación, no un dato: `alt=""` y `aria-hidden`. Lo genera `pnpm poster` (`packages/core/scripts/build-loader-poster.ts`) con la vista inicial `homePose3D`, sin interfaz, en dos WebP de alta resolución (apaisado a 2x y vertical a 3x, de unos 370 y 220 KB) y un JSON con la posición del polo en pantalla. Hay que volver a correrlo cuando cambie la vista inicial, el relieve o el estilo pintado. Se precarga en `index.html` según la orientación; el `body` y el `theme-color` pasan a `--deep`.
4. «Mientras tanto · dato real» (el S04 de #202): `loaderFact` elige, con el azar inyectado, una de las fichas `thwaites`, `vostok`, `erebus` o `emperador`. Muestra la primera oración de su descripción tal cual y cita todos los organismos de las fuentes de la ficha, sin repetir, más el título de la ficha. No se reescribe ni se resume nada, y no se atribuye la oración a una sola fuente.
5. Sin la espera fija de 1.382 ms: cada paso real se muestra al menos 450 ms (`LOADER_STEP_MS`, `pacedSteps`), así que hasta una carga en caché cuenta sus cinco pasos y se ve cómo se rellena el mapa, y al terminar el último el cargador sale sin espera extra, con un fundido de 400 ms. Con movimiento reducido no hay fundido ni máscara animada: el color llega entero al estar listo y el cargador se corta directo.
6. Sin WebGL o con un fallo del 3D queda solo el boceto, con «Seguimos con el mapa en 2D» y los dos pasos del 2D (el S06 de #202). Es el comportamiento de [DEC-227](DEC-227-mapa-2d-deshabilitado.md); solo cambia cómo se cuenta. `data-loading-variant`, la región viva, `map3dLoadingStore`, `CanvasGuard` y `Failed3DNotice` no cambian.
7. En la primera visita la tarjeta pasa a «Mapa listo» y espera a la persona ([DEC-256](DEC-256-carta-de-presentacion.md)). Por eso se borran `usePageSettled` y `settleTracker`: ya nadie espera a que la página se asiente.

## Motivo

La carga anterior cortaba de golpe entre un dibujo plano en papel con contorno naranja y un mapa 3D azul inclinado, tenía doble marco (prohibido por [DEC-234](DEC-234-componentes-de-interfaz.md)), pasos en lenguaje técnico («Compilación inicial WebGL»), una ilustración con el relleno recortado por un círculo y casi dos segundos de espera artificial. Había perdido además el «Dato real» que tuvo antes. Mostrar el mapa que se va a usar, dibujándose, cuenta lo que pasa sin texto técnico y evita el corte: el póster coincide con el mapa vivo que ya está montado detrás.

## Referencias

- [Issue #258](https://github.com/Antartida3D/Antartida3D/issues/258): pantalla de carga nueva.
- [Issue #202](https://github.com/Antartida3D/Antartida3D/issues/202): hallazgos S04 (dato real) y S06 (carga 2D) sobre el cargador anterior.
- [Issue #147](https://github.com/Antartida3D/Antartida3D/issues/147): pantalla de carga cartográfica anterior.
- [Issue #190](https://github.com/Antartida3D/Antartida3D/issues/190): la bienvenida esperaba a que la carga se cerrara.
- [DEC-227](DEC-227-mapa-2d-deshabilitado.md), [DEC-234](DEC-234-componentes-de-interfaz.md) y [DEC-256](DEC-256-carta-de-presentacion.md).
- [Pantalla de carga](../diseno/pantalla-carga.md).

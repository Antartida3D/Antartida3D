# Plan: pantalla de carga nueva (#258) y guía de primera visita (#256)

Rama: la actual (`256-carta-de-presentación-…`), sin ramas nuevas. Los commits de la carga citan #258; los de la guía, #256. El PR lleva `Closes #256` y `Closes #258`.
Fuente de verdad del diseño: `rediseno-carga-y-guia/ESPECIFICACION.md` y sus capturas (`capturas/*.jpg`). Las maquetas HTML son referencia de medidas: se usan los tokens y componentes del proyecto. La carpeta se borra al final, antes del commit, con confirmación de Lk.

## Objetivo y criterio de éxito

1. La carga muestra el mapa dibujándose (póster boceto → color) con una tarjeta chica; fondo `--deep`, sin `--oxide`, sin doble marco, sin espera fija de 1.382 ms.
2. Primera visita (`!loadIntroSeen()`): al terminar, la misma tarjeta pasa a «Mapa listo» con «Sin guía» y «Explorar el mapa». Visitas siguientes: el cargador se cierra solo.
3. «Explorar el mapa» lleva la cámara a `nextExpedition` y empieza una guía de **3 pasos** sobre el mapa: (1) pin, (2) registro, (3) botón naranja (pedido nuevo de Lk). Es un diálogo: foco atrapado, Escape y «atrás» la cierran. Toda salida guarda `antartida:intro`.
4. `IntroLetter` y sus estilos desaparecen; el «?» reabre la guía en el paso 1.
5. «Dato real» con la primera oración tal cual de una ficha con fuentes, citando todas sus fuentes.
6. Fallo del 3D o sin WebGL: solo el boceto y el texto «Seguimos con el mapa en 2D».
7. Movimiento reducido: sin máscara animada ni fundido; la cámara se coloca directo.
8. `pnpm test`, `typecheck`, `build`, `e2e` (390 y 1440), `docs:test` y `docs:check` en verde; sin errores de consola.

## Entorno

- Igual que en `plan-carta-presentacion.md`: `pnpm test`, `pnpm typecheck`, `pnpm build`, e2e con `E2E_GPU=1 E2E_WORKERS=4 E2E_PORT=5113` desde `apps/dibujado`.
- Falla previa en `main`, ajena: `zoom-limits.spec.ts:176` (2D en celular, 2 casos).
- Reglas que aplican: 00 (flujo), 04 (fuente única, código muerto), 05 (storage con `try/catch`, WebGL), 07 (pruebas), 20 (diálogo, movimiento reducido, `transform`), 40 (componentes, sin líneas dobles). `DESIGN.md` y DEC-234.

## Contradicciones y riesgos detectados (spec vs. código)

- **R1. «Ver como lista» ya no existe.** Las capturas 31, 32, 41 y 42 muestran el nombre viejo. Se usa `LIST_BUTTON_LABEL` («Actividades»).
- **R2. «?» y la cámara.** La spec dice que, con `next`, el «?» lleva la cámara a ese pin. Eso invierte D8 del plan anterior («?» nunca mueve la cámara) y mi prueba actual. Se sigue la spec; se actualiza la prueba.
- **R3. La guía tiene 3 pasos, no 2.** La spec describe 2; Lk pidió sumar una caja para el botón naranja. Las acciones finales («Explorar por mi cuenta» / «Empezar en …») pasan al paso 3. Ver «Paso 3».
- **R4. Ancla de pin solo en 3D.** `data-key` existe solo en `Map3DLayer`. Con el mapa 2D (sin WebGL) no hay ancla de pin: el paso 1 usa el acomodo sin ancla (abajo al centro), como ya prevé la spec para un pin fuera de pantalla.
- **R5. Botón naranja oculto en celular horizontal.** `@media (max-height:500px){.btn.next-btn{display:none}}`: ahí el paso 3 va sin ancla.
- **R6. El botón naranja hoy se oculta durante la bienvenida** (`!welcoming`). Propuesta: visible solo desde el paso 3, para no encenderlo antes de explicarlo y respetar las capturas 31 y 32.
- **R7. El cargador ya no se cierra solo en la primera visita.** `map3dLoaderDismissed` se usa también para el aviso de fallo del 3D y se reinicia al volver de 2D a 3D. Se agrega un estado propio de primera visita para que solo el primer cierre espere a la persona.
- **R8. `usePageSettled` y `settleTracker`** (con `SETTLE_*` y sus pruebas) existen solo para la espera de la bienvenida. Con la tarjeta «Mapa listo» la persona decide cuándo seguir, así que quedan sin uso. Regla 04: se borran, salvo que Lk prefiera conservarlos.
- **R9. Hex sueltos en `loading.css`.** El tope del guardián `styles.test.ts` (`HEX_CAP`) puede bajar al reescribir el cargador. Colores nuevos (velo, sombra sobre fondo oscuro) van como tokens en `tokens.css`.
- **R10. «Dato real».** `POINT_DETAILS` trae `desc` y `sources` para `thwaites`, `vostok`, `erebus` y `emperador`. Se muestra la primera oración tal cual (corte en `. ` seguido de mayúscula; «3.794 m» y «(5.ª edición)» no cortan) y todas las `org` de las fuentes sin repetir (el emperador cita 2 veces a AAD). Ficha de origen con el título del punto entre “ ”.
- **R11. Texto del paso 3 (nuevo).** Afirma que «Siguiente: <título>» sugiere un orden y que «Continuar» retoma una expedición a medias. Verificado en el código: `nextExpedition` / `EXPEDITION_ORDER` y la clave `antartida:last` (#186). No se promete nada más.
- **R12. Póster.** Es una imagen de la propia aplicación, no un dato: `alt=""` y `aria-hidden`. Si el póster no calza exacto con el mapa vivo en pantallas raras, el fundido lo disimula (según la spec).

## Qué se borra

- `packages/react-ui/src/map/IntroLetter.tsx`.
- Estilos `.intro*` de `packages/core/src/styles/intro.css` (queda lo de la guía, la tarjeta y el «?»; se renombra a `guide.css`).
- `INTRO_DESKTOP` e `INTRO_PHONE` de `content/intro.ts`: los textos se reparten entre la tarjeta «Mapa listo» y la guía.
- Íconos de `ui.tsx` que queden sin uso: `mouse`, `plusRing`, `hand`, `doc` (se busca cada uno antes).
- Cargador viejo: `AntarcticaIllustration`, `StepCheckIcon`, barra óxido, lista de 5 pasos, rótulo «Atlas antártico», `splitAntarcticaCoastline` y su prueba (solo si no tiene otros usos; regla 04). `ANTARCTICA_PATH` e `ICE_SHELVES_PATH` se conservan si el 2D los usa.
- `usePageSettled`, `settleTracker`, `SETTLE_*` y sus pruebas (R8).
- `packages/e2e/tests/intro.spec.ts` se reescribe entero; en `loading.spec.ts` se borran los casos de la lista de 5 pasos, de la espera de 1.382 ms y del panel centrado.

## Qué se reutiliza (sección «Qué se conserva»)

`INTRO_KEY`, `loadIntroSeen` / `saveIntroSeen`; `trapTab`; `nextExpedition`, `introStartLabel`, `introSuggestion` (se reubican); `startHerePlacement` y el bucle de `StartHere` (base de `GuideStep`); `.starthere-ring`; el «?» (`.help-btn`); `welcomeView`, `welcomeMove`; los íconos de pin (`.intro-pin`) y `rich()` de negritas. No se tocan `fan.ts`, el halo `.mk.next`, el orden de `.leftcol`, la flecha de «Continuar» ni el radio de la leyenda.

## Qué se crea, archivo por archivo

### Core (`@antartida/core`, lógica pura con pruebas)

- `src/first-visit.ts`: `firstVisitStep(state, event)`. Estados: `loading → ready → guide1 → guide2 → guide3 → done`. Eventos: `ready`, `explore`, `skip`, `next`, `back`, `close`, `finish`. Cada salida (`skip`, `close`, `finish`) devuelve `done` con `markSeen: true`. Prueba: todas las transiciones y que ninguna salida olvide marcar la visita como vista.
- `src/loading.ts` (ampliado):
  - `LOADER_STEP_TEXT`: un texto llano por paso de `MAP3D_STEPS` («Preparando el cuaderno», «Levantando el relieve», «Llenando el Océano Austral», «Dibujando las costas», «Encendiendo la luz») y los 2 del 2D.
  - `loaderFact(random)`: elige entre `thwaites`, `vostok`, `erebus` y `emperador` (solo con `desc` y `sources`), devuelve `{ sentence, orgs, title }`. Azar inyectado.
  - `loaderExitDelay(mountedAt, readyAt)`: permanencia mínima de ~1.000 ms desde el montaje; constantes `LOADER_MIN_MS` y `LOADER_FADE_MS` (400).
  - `posterReveal(progress)`: radio del color (de 0 a cubrir la pantalla) para la máscara.
- `src/content/intro.ts` → `content/guide.ts`: textos de «Mapa listo» y de los 3 pasos de la guía (escritorio y celular), con `introSuggestion` y `introStartLabel`.
- `src/welcome.ts`: `startHerePlacement` acepta una caja (`left, top, width, height`) en lugar de un punto y un lado (`below` | `above`), y devuelve el acomodo sin ancla (abajo al centro, sin flecha, `ring: false`) si el ancla no está o está fuera de pantalla. Se borran `SETTLE_*` y `settleTracker`.
- `src/assets/loader-poster.json`: posición del polo en pantalla (%) para escritorio y celular, generado por el script.
- Pruebas: `first-visit.test.ts` (nuevo), `loading.test.ts` (textos, `loaderFact`, `loaderExitDelay`, `posterReveal`), `welcome.test.ts` (placement con caja, `above`, sin ancla; se quitan las de `settleTracker`), `intro.test.ts` → `guide.test.ts`.

### Póster

- Script `scripts/loader-poster/` (paquete nuevo del workspace, con `playwright` ya instalado en el repo): levanta `vite preview`, abre la app con la vista inicial (`homePose3D`), oculta todo menos el `<canvas>`, exporta WebP de escritorio (1440×900) y de celular (390×844 a 2x) a `packages/core/src/assets/loader-poster-{wide,tall}.webp`, y escribe `loader-poster.json`. Se corre con `pnpm poster`. Tamaño objetivo: hasta ~200 KB cada uno (se baja la calidad hasta entrar; si no entra, se reduce la resolución del vertical).
- Precarga en `apps/dibujado/index.html`: dos `<link rel="preload" as="image" media="(orientation: …)">`, como la de `map-paint-768.webp`. `body` background y `theme-color` pasan a `--deep` (#1E3E5C).
- Se documenta en `docs/diseno/pantalla-carga.md` cuándo regenerarlo (cambia `homePose3D`, el relieve o el estilo).

### React UI

- `loading/LoadingScreen.tsx` (reescrito): póster en dos capas (boceto y color con máscara radial al polo, radio según `posterReveal` del progreso real), retícula decorativa opcional, tarjeta con rosa, `n de 5`, h1 con el texto del paso, barra `role="progressbar"` y «Dato real». Estados: progreso, `ready` (visitas siguientes: fundido y salida), `ready` + primera visita («Mapa listo» con «Sin guía» y «Explorar el mapa», foco en la primaria), fallo/2D. Props nuevas: `firstVisit`, `onExplore`, `onSkip`. Se conservan `data-loading-variant`, la región viva y `Ver mapa 2D` (solo con `MAP_2D_ENABLED`).
- `loading/Poster.tsx` (nuevo): las dos capas y la máscara.
- `map/GuideStep.tsx` (nuevo, generaliza `StartHere`): ancla de pin (`.vp [data-key]`), de elemento (`.reg-wrap`, `.btn.next-btn` / `.btn.resume`) o ninguna; aro circular o redondeado (tamaño del elemento + 8 px); `role="dialog"` con nombre; `trapTab`, Escape, `useBackLayer`, foco al título al cambiar de paso, retorno del foco al «?» o al mapa.
- `map/Guide.tsx` (nuevo): los 3 pasos y su contenido (filas con pines, textos de gestos por ancho, texto del registro «en este navegador / celular», caja del botón naranja).
- `map/MapView.tsx`: se quitan `introOpen`, `settled` y `IntroLetter`; recibe `guideStep` y `onGuide` desde `AntarcticaApp`; `welcomeMove` al pasar a `guide1`; el botón naranja se muestra desde `guide3`; «?» abre `guide1` y, si hay `next`, mueve la cámara; pista de gestos oculta mientras la guía está abierta.
- `AntarcticaApp.tsx`: estado `firstVisit` con `firstVisitStep`, `loadIntroSeen` / `saveIntroSeen`; pasa los eventos al cargador y a `MapView`.
- `ui.tsx`: ícono de documento si el paso 2 lo usa; se borran los que queden huérfanos.

### CSS

- `core/src/styles/loading.css`: reescrito (fondo `--deep`, póster, tarjeta con un solo borde y sombra, barra, «Mapa listo», fallo). `guide.css` (renombre de `intro.css`). Tokens nuevos en `tokens.css` solo si hacen falta. Botones solo acomodados (regla 40).

## Orden carga → «Mapa listo» → guía

1. Montaje: póster boceto, tarjeta con el paso real (`MAP3D_STEPS`), barra.
2. `ready` y pasados `LOADER_MIN_MS`:
   - visita siguiente: fundido de 400 ms (corte directo con movimiento reducido) y cierre;
   - primera visita: la tarjeta pasa a «Mapa listo», el color cubre todo; el cargador espera.
3. «Sin guía» / Escape: cierre, `saveIntroSeen()`, queda la pista de gestos.
4. «Explorar el mapa»: cierre, `welcomeMove(next)`, paso 1 junto al pin.
5. Siguiente → paso 2 junto al registro → paso 3 junto al botón naranja.
6. Paso 3: «Explorar por mi cuenta» y `introStartLabel(next)` (abre el punto con `openPoint(next)`); sin `next`, solo «Explorar por mi cuenta» como primaria.

Casos:
- **Sin WebGL / fallo del 3D:** variante 2D, solo boceto, «Seguimos con el mapa en 2D»; la tarjeta «Mapa listo» y la guía también salen en la primera visita (sin ancla de pin, R4).
- **Con `antartida:intro` guardada:** nunca hay «Mapa listo» ni guía; el «?» sigue disponible.
- **Con «Continuar» pendiente:** el paso 3 ancla al botón «Continuar» y su texto cubre ambos casos.

## Paso 3: caja del botón naranja (pedido de Lk)

- Rótulo «Guía · 3 de 3», ancla al botón naranja (arriba del botón en escritorio y celular: `side: 'above'`).
- Texto propuesto: «**Siguiente: <título>** te guía por las expediciones en un orden sugerido. Si dejaste una a medias, **Continuar** te lleva de vuelta donde quedaste.» Sin `next` (las seis hechas): se omite este paso.
- Acciones: «Explorar por mi cuenta» y `introStartLabel(next)`.

## Pasos de implementación

- [x] 1. **Línea base.** `pnpm test && pnpm typecheck && pnpm build` y los e2e de `loading` e `intro`. → verificar: conteos anotados.
  > Línea base: core 694 tests (47 archivos), react-ui 677 (39); typecheck y build en verde; e2e loading+intro: 40 pasan, 6 omitidos.
- [x] 2. **Core puro.** `first-visit.ts`, `loading.ts` (textos, `loaderFact`, `loaderExitDelay`, `posterReveal`), `startHerePlacement` extendido, `content/guide.ts`; borrar `settleTracker`. → verificar: `pnpm --filter @antartida/core test`.
  > Core: 48 archivos, 707 tests en verde. Enmiendas: (a) `startHerePlacement` pasa a `guidePlacement` (y `START_HERE_*` a `GUIDE_*`): ya no hay tarjeta «Empezá acá». (b) Sin evento `back` en `firstVisitStep`: el «atrás» del navegador es `close`; se suma `open` para el «?». (c) `firstVisitStep` recibe `hasNext`: sin siguiente, `guide2` + `next` sale. (d) `posterReveal(progress, size, pole)` devuelve píxeles y recibe el polo en %. (e) `introSuggestion` y `startHereText` se reemplazan por `guidePinText`, `guideRegistryText`, `guideNextText`. (f) `splitAntarcticaCoastline` y su prueba se borran junto con `AntarcticaIllustration` (sin otros usos). El typecheck de `react-ui` queda roto hasta el paso 4-6.
- [x] 3. **Póster.** Script, WebP, JSON, precarga y fondo del `body`. → verificar: tamaños ≤ ~200 KB y el póster calza con el mapa vivo (captura).
- [x] 4. **Cargador.** `LoadingScreen`, `Poster`, `loading.css`; borrar lo viejo. → verificar: capturas a 1440 y 390 contra `10–12`, `20–23`.
- [x] 5. **Primera visita.** Estado en `AntarcticaApp`, tarjeta «Mapa listo», `MapView` sin `IntroLetter`. → verificar: capturas contra `30` y `40`.
- [x] 6. **Guía de 3 pasos.** `GuideStep`, `Guide`, `guide.css`, «?». → verificar: capturas contra `31–32`, `41–42` y el paso 3.
- [x] 7. **E2E.** Reescribir `intro.spec.ts` y actualizar `loading.spec.ts`. → verificar: ambos en verde a 390 y 1440.
  > Enmiendas pasos 3-7: (a) el script del póster vive en `packages/core/scripts/build-loader-poster.ts` (`pnpm poster`), no en un paquete nuevo: core ya trae `sharp`, `playwright` y `tsx` y los demás scripts de generación; evita tocar el lockfile. (b) Clase de la tarjeta `.guidecard` (no `.guide`): `.guide` ya la usa la línea guía de los marcadores en fan.ts. (c) Póster: 79 KB (escritorio) y 48 KB (celular), polo en 49,9 % / 50,1 % y 49,8 % / 50 %. (d) `HEX_CAP` baja de 69 a 45. (e) El paso 3 apila sus botones también en escritorio (con los dos en fila no entraba «Explorar por mi cuenta»). (f) loading+intro e2e: 37 pasan, 5 omitidos (2D apagado).
- [x] 8. **Docs.** DEC-256 reescrita, decisión nueva (#258), `pantalla-carga.md`, README, nota en `decisiones.md` sobre #147 y #190; `docs:test` y `docs:check`. → verificar: ambos en verde.
  > Docs escritos (DEC-256 reescrita, DEC-258 nueva, `pantalla-carga.md`, README, notas en `decisiones.md`); `docs:test` en verde, `docs:check` se corre al final con el cuerpo del PR.
- [x] 9. **Limpieza.** Íconos y código huérfano; revisar `rg` de lo borrado. **Antes del commit y con confirmación de Lk:** borrar `rediseno-carga-y-guia/`.
  > Íconos y `.iconbtn.bare` borrados. La carpeta `rediseno-carga-y-guia/` sigue sin borrar y fuera del commit: falta la confirmación de Lk.
- [x] 10. **Verificación final y revisión.** Suite completa y `code-reviewer`. → verificar: todo en verde y hallazgos resueltos.

## Pruebas

Unitarias (core): `first-visit`, `loading` (textos, `loaderFact` con azar fijo, `loaderExitDelay`, `posterReveal`), `welcome` (placement con caja, `above`, sin ancla), `guide`.

E2E (390 y 1440):
- `loading.spec.ts`: variantes 3D y 2D; sin la espera de 1.382 ms; movimiento reducido; fallo del 3D («Seguimos con el mapa en 2D»); sin `border: double`; el «Dato real» muestra fuentes; el fondo es `--deep`.
- `intro.spec.ts`:
  1. Primera visita → «Mapa listo» → «Sin guía» → vista general → no reaparece al recargar.
  2. «Explorar el mapa» → paso 1 junto al pin → «Siguiente» → paso 2 junto al registro → «Siguiente» → paso 3 junto al botón naranja → «Empezar en Ushuaia» abre la expedición.
  3. Escape y «atrás» en cada paso; foco atrapado y devuelto.
  4. «?» reabre el paso 1.
  5. Con Ushuaia hecha, la guía apunta a la siguiente.
  6. Con seis hechas, no hay paso 3 y solo queda «Explorar por mi cuenta».
  7. Con `antartida:last` válido, el paso 3 ancla a «Continuar».
  8. Sin errores de consola.

## Documentación

DEC-256 reescrita (por qué se descartó la carta modal); decisión nueva #258 en el formato de `control-documentacion.md`; `docs/diseno/pantalla-carga.md` reescrito con resultados de esta rama; README con la declaración de IA; nota en `docs/decisiones.md` sobre #147 y #190. No se comenta en #202: si hace falta, se redacta el texto y se muestra a Lk.

## Fuera de alcance

Tour paso a paso con globos, deslizar entre pasos, sonido, cambios al mapa 2D, y todo lo de «Qué se conserva».

## Preguntas abiertas

Con respuesta por defecto (se siguen salvo que Lk diga otra cosa):

1. Orden de la guía: pin → registro → botón naranja. ¿Está bien, o va antes el botón naranja?
2. Borrar `usePageSettled` / `settleTracker` (R8).
3. «Mapa listo» y la guía también en el caso sin WebGL (sin ancla de pin).
4. «?» mueve la cámara al pin sugerido (R2, según la spec).
5. El botón naranja solo se ve desde el paso 3 (R6).

## Enmiendas posteriores (pedidos de Lk al revisar)

- «Explorar el mapa» pasa a «Exploración guiada».
- Los botones de la tarjeta de carga y de la guía ocupan todo el ancho; en celular los de la tarjeta se apilan.
- El halo `.mk.next` también rodea la expedición de «Continuar» (`buildMarkers` recibe `resume`).
- La carga no espera al final: cada paso se muestra al menos 450 ms (`LOADER_STEP_MS`, `pacedSteps`) y el cargador sale al terminar el último. Reemplaza `LOADER_MIN_MS` y `loaderExitDelay`.
- Póster de mayor resolución (2x apaisado, 3x vertical; 368 y 222 KB).
- Sin anillo de foco en «Exploración guiada» hasta que se usa Tab.
- «Continuar» en celular entra en una línea (15 px).
- `marine.spec.ts` usa `clearStorage` (borraba `antartida:intro` y la tarjeta tapaba «Actividades»).
- Verificación final: core 709, react-ui 677, docs 19; typecheck y build en verde; e2e con GPU y 4 workers: 405 pasan, 61 omitidos y 2 fallan (`zoom-limits.spec.ts:176`, ajeno y presente en `main`); `docs:check` correcto.

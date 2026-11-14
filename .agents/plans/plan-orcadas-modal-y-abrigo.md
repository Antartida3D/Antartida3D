# Plan: Modal antes de empezar Orcadas, puerta del abrigo con sus instrumentos y gestos del mapa en el diorama (#125)

Estado: **aprobado por Lk (14 nov 2026).** Rama `125-orcadas-modal-y-puerta-del-abrigo`, creada desde `main` en `202e9fe` (merge de #126). Issue #125 asignado a Lk.

## Objetivo y criterio de éxito

1. Al tocar Estación Orcadas en el mapa general (marcador 2D, marcador 3D o «Ver como lista»), no se entra directo a la expedición: aparece un BottomSheet con la misma estética que el panel de «Desde Ushuaia». Muestra el título, la pregunta guía, de qué trata la expedición y sus 4 capítulos. Tiene los botones «Comenzar expedición» y «Volver al mapa».
2. «Comenzar expedición» dispara el mismo arranque que hoy (`start` de `AntarcticaApp.tsx`: acercamiento 3D, zambullida o fundido). «Volver al mapa», Escape, deslizar hacia abajo o tocar fuera cierran el panel y devuelven el foco al disparador.
3. En el capítulo Observar, mientras está en pantalla la lectura «Temperatura del abrigo» sin anotar, el abrigo meteorológico del diorama abre la puerta con una animación. Adentro se ven los cuatro instrumentos de 1903: termómetros seco y húmedo, de máxima y de mínima. La puerta se cierra al anotar la lectura o al salir del paso. Con movimiento reducido queda abierta sin animación.
4. Mientras la puerta está abierta, la cámara del diorama usa la toma del abrigo, que ya existe para la parada `obs-abrigo`, para que se vean los instrumentos.
5. El diorama de Orcadas se mueve con los mismos gestos que el mapa 3D general:
   - con mouse, arrastrar con el botón izquierdo desplaza la vista y el derecho la gira;
   - con un dedo, se desplaza la vista;
   - con dos dedos (como en una app de globo): pellizcar acerca, girar los dedos gira la cámara y arrastrar los dos hacia arriba o abajo la inclina.
   Se respetan los límites propios del diorama (distancias, ángulos y caja de `StationScene.tsx:1723-1735`). En celular el movimiento deja de sentirse raro.
6. `pnpm test && pnpm typecheck && pnpm build` y los e2e afectados en verde. Lk aprueba las capturas del panel y del abrigo abierto a 1440 y 390 px.

## Entorno detectado

- Verificación canónica: `pnpm test && pnpm typecheck` (regla 00). Además, `pnpm build` y `pnpm e2e` (Playwright, proyectos `desktop` y `mobile`).
- Tests de un módulo: `pnpm --filter @antartida/react-ui test`, `pnpm --filter @antartida/core test`.
- e2e: `cd packages/e2e && npx playwright test <spec> --project=desktop --project=mobile`. Los de Orcadas tardan (gotcha #84: timeout de 180 s en observación).
- Capturas: Chromium con `--use-angle=vulkan` (gotcha en projectmem). El diorama expone `window.__orcadasCamera` y `window.__orcadasReady`; el mapa expone `window.__cameraControls`.
- Reglas: AGENTS.md, `.agents/rules/project/20-web.md` (teclado, foco, Escape, 390 y 1440 px, tokens CSS), `30-estilo-voxel.md` (low-poly con `buildPolyGeometry(tris, boxShade)` en el diorama, colores con nombre, mínimo de detalle), core 04 (fuente única) y 05 (errores).
- Idioma: código y comentarios en inglés; textos de la interfaz y docs en español rioplatense.

## Supuestos y decisiones

- **D1 (Lk):** el modal es un `BottomSheet` como el `Picker` de `packages/react-ui/src/voyage/VoyagePanel.tsx:75-123`: scrim que cierra, `useFocusReturn` y botones en `.row vactions`.
- **D2 (Lk):** no se comenta en #111 (GiulianoPoeta99, selector Exploración/Quiz). Lk coordina por fuera. El panel nuevo queda como un componente propio y chico, para que #111 pueda montar ahí su selector sin reescribirlo.
- **D3 (Lk):** la puerta se abre solo durante la lectura de temperatura, no en toda la parada del abrigo.
- **D4 (Lk):** el diorama usa los mismos gestos de cámara que el mapa general, sobre todo en celular. Se reutiliza la lógica, no se copia (regla 04).
- **Supuesto S1:** el texto del panel sale de contenido que ya tiene fuente: `ORCADAS_GUIDING_QUESTION`, `CHAPTER_NAMES` y la primera frase del tour de llegada. No se escribe un dato nuevo sin fuente. Si hace falta una frase nueva de presentación, es descriptiva de la actividad (qué se hace en cada capítulo), no un dato científico.
- **Supuesto S2:** el panel se abre desde el mismo lugar por donde hoy se arranca, `openPoint` en `packages/react-ui/src/map/MapView.tsx:347-355` (rama `tier === 'A'`). Cubre así el marcador 2D, el 3D y la lista con un solo cambio.
- **Supuesto S3:** los instrumentos del modelo son ilustrativos (forma y ubicación). Su existencia tiene fuente: `obs-instrumental-1903`, Mossman (1907), en `packages/core/src/content/orcadas.ts:238-245`.
- **Supuesto S4:** la señal «lectura de temperatura en curso» se calcula en `OrcadasExpedition.tsx`. Vale: capítulo `observation`, `guesses.temp` sin anotar y la lectura de temperatura visible en `Observation.tsx`. Llega a la escena como un prop booleano nuevo, `screenOpen`, de `StationScene` a `StationElements`. Hoy `StationElements` no recibe ni el capítulo ni el foco (`StationScene.tsx:145-160` y `:770-781`).

## Fuera de alcance

- El selector Exploración/Quiz (#111).
- Cambiar el SVG del termómetro del panel (`observation/Thermometer.tsx`).
- `scripts/bench/src/browser.ts:44-47` (`openExpedition`) hace clic en «Fósiles», que es tier B, y espera `.exp`: parece roto desde antes. No se toca; se avisa a Lk en el reporte final.

## Blast radius

- La entrada a Orcadas cambia para todos los e2e que hoy entran directo: `orcadas.spec.ts` (`openOrcadasFromMap`, `:16-21`, y el test de aproximación 3D, `:265-287`), `orcadas-observation.spec.ts:18-21`, `orcadas-time.spec.ts:6-9`, `orcadas-century.spec.ts:6-9`, `map3d.spec.ts:53-64` y `no-webgl.spec.ts:56-60`. Todos tienen que pulsar «Comenzar expedición» después del clic.
- `StationScene.tsx`: un prop nuevo y una parte animada nueva en el abrigo. No cambia nada más de la escena.
- Gestos: la lógica de dos dedos de `Map3DLayer.tsx:368-420` (`twoFingers`, sobre `@antartida/core/gestures.ts`) pasa a un hook compartido. El mapa general tiene que seguir igual: e2e `map3d.spec.ts` (botones de zoom, gestos) en verde y `packages/core/test` de gestos sin cambios.
- `lowPolyBuildings.ts`: el abrigo se parte en cuerpo fijo, puerta (con pivote en la bisagra) e instrumentos. La caja envolvente del cuerpo con la puerta cerrada no cambia (fijada en `test/orcadasLowPoly.test.ts`).

## Archivos

- Crear:
  - `packages/react-ui/src/orcadas/OrcadasIntro.tsx`: el panel de inicio.
  - `packages/react-ui/test/screenDoor.test.ts`, o casos nuevos en `test/orcadasLowPoly.test.ts` (ver Tests).
- Modificar:
  - `packages/react-ui/src/map/MapView.tsx`: abrir el panel en lugar de `onStart` directo.
  - `packages/core/src/styles/*.css`, solo si el panel necesita clases propias; reutilizar `.voyage`, `.vactions` y `.place` si alcanzan.
  - `packages/react-ui/src/orcadas/lowPolyBuildings.ts`: partir `buildStevensonScreenTris` en cuerpo, puerta e instrumentos.
  - `packages/react-ui/src/orcadas/StationScene.tsx`: prop `screenOpen`, la puerta animada y los instrumentos.
  - `packages/react-ui/src/orcadas/OrcadasExpedition.tsx`: calcular `screenOpen` y pasarlo.
  - `packages/react-ui/src/map3d/Map3DLayer.tsx`: extraer los gestos a un hook (`packages/react-ui/src/map3d/useMapGestures.ts`, archivo nuevo) y usarlo.
  - `packages/react-ui/src/orcadas/observation/Observation.tsx`, solo si hace falta exponer que la lectura de temperatura está visible (por ejemplo, un callback `onTempActive`).
  - Los e2e del blast radius y uno nuevo para el panel.
  - `README.md`: declaración de IA de #125.

## Pasos

- [ ] 1. Línea base. Correr `pnpm test` (anotar el conteo de core y react-ui), `pnpm typecheck` y los e2e de Orcadas en desktop. → verificar: los conteos anotados en el issue #125.
- [ ] 2. `packages/react-ui/src/orcadas/OrcadasIntro.tsx`: componente `OrcadasIntro({ onStart, onExit })` con `BottomSheet` (`packages/react-ui/src/BottomSheet.tsx`), scrim, `useFocusReturn` y `labelledBy`.
  - Contenido: h2 «Estación Orcadas», la pregunta guía, una frase de qué se hace y la lista de los 4 capítulos con `CHAPTER_NAMES`.
  - Botones «Comenzar expedición» (primario) y «Volver al mapa».
  - Textos nuevos, si los hay: como constante en `packages/core/src/content/orcadas.ts` (fuente única), sin datos sin fuente.
  - → verificar: `pnpm typecheck`.
- [ ] 3. `packages/react-ui/src/map/MapView.tsx:347-355`: en la rama `tier === 'A'`, guardar el punto pendiente y mostrar `OrcadasIntro`. `onStart` del panel llama al `onStart(p)` de hoy; `onExit` lo cierra. Si `AntarcticaApp` tiene `phase !== 'idle'`, el panel no se abre (mismo guard que `start`). → verificar: en `pnpm dev`, al tocar Orcadas en 2D, en 3D y en la lista aparece el panel; «Comenzar» entra igual que antes y Escape lo cierra con el foco devuelto.
- [ ] 4. e2e del panel: un test nuevo en `packages/e2e/tests/orcadas.spec.ts`.
  - Abre el panel desde el marcador y desde la lista, y comprueba el foco atrapado.
  - Escape y «Volver al mapa» cierran el panel y devuelven el foco.
  - «Comenzar expedición» muestra `ORCADAS_GUIDING_QUESTION`.
  - Revisa a 390 px que no haya scroll horizontal.
  - → verificar: `npx playwright test orcadas.spec --project=desktop --project=mobile`.
- [ ] 5. Adaptar los e2e del blast radius: después del clic en Orcadas, pulsar «Comenzar expedición». Si se repite, hacerlo en un helper compartido dentro de `packages/e2e/tests/`. → verificar: `npx playwright test orcadas map3d no-webgl --project=desktop --project=mobile` en verde.
- [ ] 6. `lowPolyBuildings.ts`: partir el abrigo en tres piezas.
  - `buildStevensonScreenTris()` queda como el cuerpo, sin la hoja de la puerta. El hueco de la puerta deja ver el interior: se saca el bloque macizo `SEA_GREY` (`:757-759`) y queda un fondo y piso interior oscuro.
  - `buildStevensonDoorTris()`: la hoja con persianas, bisagras y pasador, con el pivote en la bisagra en el origen.
  - `SCREEN_DOOR_HINGE: Vec3`: dónde va esa bisagra dentro del abrigo.
  - `buildStevensonInstrumentsTris()`: soporte con los termómetros seco y húmedo (verticales; el húmedo con su muselina y su recipiente de agua) y los de máxima y mínima (horizontales). Detalle: bulbos con `lathe`, escala blanca, columna roja o plateada.
  - Colores con nombre en `VOXEL_PALETTE` si hacen falta (regla 30.5).
  - → verificar: `pnpm --filter @antartida/react-ui test` (la caja envolvente del cuerpo más la puerta cerrada sigue igual).
- [ ] 7. Función pura `screenDoorAngle(open: boolean, t: number, reduced: boolean)`, o el patrón de `arrivalRef` con `smooth01` (`StationScene.tsx:762-769`): de 0 a unos 110° en unos 0,8 s, con suavizado; con `reduced`, directo al ángulo final. Va en `lowPolyBuildings.ts` o en un módulo puro chico, para poder probarla. → verificar: test del paso 9.
- [ ] 8. `StationScene.tsx`:
  - Prop nuevo `screenOpen?: boolean` en `StationSceneProps` y en `StationElements`.
  - En el render del elemento `screen` (`:1226-1240`), sumar un grupo con la puerta en `SCREEN_DOOR_HINGE` (que rota en `useFrame`) y el mesh de los instrumentos. Mismo `vehicleMaterial`, geometrías con `buildPolyGeometry(..., boxShade)` y liberadas en el cleanup (`:932-947`).
  - Llamar a `invalidate()` mientras la puerta se mueve (`frameloop="demand"`).
  - Con `screenOpen`, la cámara usa la pose del hotspot del abrigo (`poseForHotspot`, `Hotspots.tsx:145-154`) si todavía no está ahí.
  - → verificar: `pnpm typecheck`.
- [ ] 9. Tests en `packages/react-ui/test/orcadasLowPoly.test.ts`:
  - la puerta y los instrumentos cumplen `POLY_MIN_TRIS` y `POLY_MIN_COLORS` y tienen caras hacia afuera;
  - con la puerta cerrada, cuerpo más puerta conservan la caja envolvente fijada;
  - los instrumentos quedan dentro del abrigo (su caja dentro de la del cuerpo);
  - `screenDoorAngle`: cerrada en 0; abierta al final de la animación; con `reduced`, abierta sin pasos intermedios; cierre de vuelta a 0.
  - → verificar: `pnpm --filter @antartida/react-ui test`.
- [ ] 10. `OrcadasExpedition.tsx` (y `Observation.tsx` si hace falta): calcular `screenOpen` según S4 y pasarlo a `StationScene` (`:420-434`). → verificar: e2e `orcadas-observation.spec.ts` en desktop y mobile, más una aserción nueva de que la cámara del diorama queda en la toma del abrigo durante la lectura (por ejemplo con `window.__orcadasCamera.getTarget`).
- [ ] 11. Capturas en Chromium con `--use-angle=vulkan` a 1440 y 390 px:
  - el panel de inicio desde el mapa 2D y desde el 3D;
  - el abrigo durante la lectura (puerta abierta con los instrumentos);
  - el abrigo después de anotar (puerta cerrada).
  - Mostrárselas a Lk antes del PR.
  - → verificar: aprobación de Lk.
- [ ] 12. Gestos del mapa en el diorama. Delegable a agy en un solo encargo, porque no toca los archivos de los pasos 2 a 10 salvo `StationScene.tsx:1715-1735` y `:1931`.
  - Crear `packages/react-ui/src/map3d/useMapGestures.ts` con un hook `useMapGestures(controlsRef, options)`. Fija `mouseButtons` (izquierdo `SCREEN_PAN`, derecho `ROTATE`) y `touches` (`one: TOUCH_SCREEN_PAN`, `two: NONE`), y conecta los dos dedos como hoy `Map3DLayer.tsx:368-420`, sobre `@antartida/core/gestures.ts`.
  - Las opciones cubren lo que difiere entre el mapa y el diorama (límites de distancia y de inclinación, `invalidate`), sin configuración de más.
  - `Map3DLayer.tsx` pasa a usar el hook, sin cambiar su comportamiento. `StationCameraAndProjection` (`StationScene.tsx:1715-1735`) también lo usa, con sus límites actuales y conservando `dollyToCursor`.
  - → verificar: `pnpm typecheck`; `npx playwright test map3d --project=desktop --project=mobile` en verde; prueba a mano en `pnpm dev` con la emulación táctil de Chromium (un dedo desplaza; dos dedos pellizcan, giran e inclinan) en el mapa y en el diorama.
  - Test: e2e nuevo en `packages/e2e/tests/orcadas.spec.ts`, en el proyecto `mobile`. Un arrastre con un dedo (`page.touchscreen` o eventos de puntero táctiles) cambia el target de `window.__orcadasCamera` sin cambiar su ángulo polar; un pellizco cambia `distance`.
- [ ] 13. `README.md`: entrada de declaración de IA de #125. → verificar: `git diff README.md`.
- [ ] 14. Cierre: `git rebase origin/main`, `pnpm test && pnpm typecheck && pnpm build` y los e2e `orcadas*`, `map3d`, `no-webgl` y `flow` en desktop y mobile. Commit y PR con `Closes #125`; el push lo corre Lk. → verificar: todo en verde y el link del PR.

## Tests nuevos

- `packages/react-ui/test/orcadasLowPoly.test.ts`: detalle y caras de la puerta y de los instrumentos, caja envolvente del abrigo cerrado, instrumentos dentro del abrigo y `screenDoorAngle`.
- `packages/e2e/tests/orcadas.spec.ts`: el panel de inicio (apertura desde el marcador y desde la lista, Escape, «Volver al mapa», foco, «Comenzar expedición», 390 px).
- `packages/e2e/tests/orcadas.spec.ts` (mobile): gestos táctiles del diorama, con un dedo desplaza y el pellizco acerca.
- `packages/e2e/tests/orcadas-observation.spec.ts`: la cámara en la toma del abrigo durante la lectura de temperatura.

## Verificación final

`pnpm test && pnpm typecheck && pnpm build && pnpm e2e`

## Preguntas abiertas: 0

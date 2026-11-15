# Plan: llegada inmersiva a Orcadas, camino entre las casas y detalles vivos del diorama (#135)

Estado: **aprobado y ejecutado.** Rama `135-orcadas-llegada-inmersiva-...`, creada desde `main`. Issue #135 asignado a Lk.

**Requisito previo:** este plan se apoya en el panel de inicio de Orcadas (`OrcadasIntro.tsx`), en la puerta del abrigo y en `useMapGestures`, todo de #125. Antes de empezar, #125 tiene que estar mergeado en `main`. Después: `git fetch && git rebase origin/main`.

## Objetivo y criterio de éxito

1. **Camino:** el camino de ripio entre las casas del diorama se lee como una franja continua, apoyada en el suelo, con bordes irregulares creíbles y sin triángulos sueltos ni escalones. Lo prueba un test de geometría (continuidad y apoyo en el suelo) y lo confirman capturas a 1440 y 390 px aprobadas por Lk.
2. **Elegir cómo llegar:** el panel de inicio ofrece dos llegadas: «Irízar y Zodiac» y «Helicóptero». Se presentan como el selector de transporte de «Desde Ushuaia» (`.vpick`/`.vopt`, vista previa 3D del vehículo con `VehiclePreview` o `ModelPreview`).
3. **Viaje en el mapa:** al tocar «Comenzar expedición», primero se anima en el mapa 3D el tramo con el transporte elegido, hasta la isla Laurie. Recién después viene el acercamiento de cámara y la entrada al diorama (fase `approach` de `AntarcticaApp.tsx`).
4. **Llegada en el diorama:**
   - Con el Zodiac, el bote entra desde la bahía y atraca en la playa, con estela y espuma.
   - Con el helicóptero, la aeronave baja y se posa en el helipuerto, con el rotor girando y nieve levantada.
   - El otro transporte ya está quieto en su lugar. El helicóptero solo está en el helipuerto si el mes lo permite (`helicopterOnPad`, de noviembre a marzo).
   - **D1 (Lk):** el mes del diorama se elige solo según el vehículo. El helicóptero y el Zodiac, que baja del Irízar, llegan en la temporada de visitas, de noviembre a marzo (`arrival-transporte` y `helicopterOnPad`). Si el mes actual está fuera de temporada, la expedición arranca en el mes de temporada más cercano. El panel lo dice en una línea.
5. **Movimiento reducido:** sin viaje animado ni aterrizaje. Se entra directo al diorama, con el transporte elegido ya quieto en su lugar.
6. **Honestidad:** todo lo animado se marca como ilustración, como el resto del diorama («Reconstrucción ilustrada»). Ningún dato sin fuente: lo que se diga del Irízar, del Zodiac y del helicóptero sale de hechos con fuente que ya existen. Por ejemplo `arrival-transporte` en `packages/core/src/content/orcadas.ts`: la llegada en buque o helicóptero, los dos Zodiac y unas 25 visitas por año entre noviembre y marzo.
7. **Detalles inmersivos:** entran las 10 propuestas (D3, Lk, 14 nov 2026), en la línea de la puerta del abrigo.
8. **Verificación:** `pnpm test && pnpm typecheck && pnpm build` y los e2e afectados en verde. Los e2e se corren con la GPU, desde `apps/dibujado`, con `env E2E_GPU=1 E2E_WORKERS=4 E2E_PORT=5113 pnpm exec playwright test -c ../../packages/e2e/playwright.config.ts <specs>`.

## Entorno detectado

- Verificación canónica: `pnpm test && pnpm typecheck` (regla 00); además `pnpm build` y los e2e.
- **e2e:**
  - Se corren desde `apps/dibujado` (o con `pnpm e2e` desde la raíz). Desde `packages/e2e`, el `webServer` de Playwright no arranca.
  - Con `E2E_GPU=1 E2E_WORKERS=4` tardan unos 2 min en vez de 11. Al empezar, la suite imprime qué GPU usa.
- **Capturas:** Chromium con `--use-angle=vulkan`. El mapa expone `window.__cameraControls` y el diorama `window.__orcadasCamera` y `window.__orcadasReady`.
- **Reglas:**
  - `AGENTS.md`.
  - `.agents/rules/project/20-web.md`: teclado, foco, Escape, 390 y 1440 px, movimiento reducido y tokens.
  - `.agents/rules/project/30-estilo-voxel.md`: low-poly con `buildPolyGeometry(tris, boxShade)` en el diorama, colores con nombre, mínimos `POLY_MIN_TRIS` y `POLY_MIN_COLORS`, y nivel de detalle de los témpanos.
  - Core 04 (fuente única), 05 (errores y WebGL) y 15 (bugs como issues).
- **Idioma:** código y comentarios en inglés; textos de la interfaz, docs y commits en español.
- **Diorama:** dibuja a demanda (`frameloop="demand"`).
  - Toda animación llama a `invalidate()` mientras dura.
  - CameraControls no emite `rest` después de un pellizco, así que los e2e esperan a que la pose deje de cambiar (gotcha en projectmem).

## Piezas que ya existen (reutilizar, regla 04)

- **Camino:** `packages/react-ui/src/orcadas/stationModels.ts:501-640`. Colores `PATH_GRAVEL*`, `addGravelRibbon`, `pathZAt` (curva senoidal), `PATH_STEP` 0.34 y `PATH_HALF` 0.25. Se dibuja en `StationScene.tsx:295` («Paths, loose rocks and snow patches»).
- **Zodiac:** ya flota y se balancea en `StationScene.tsx` (~`:876`, `zodiacBottomY`, `BOAT_SCALE`); su modelo está en `orcadas/lowPolyProps.ts`.
- **Helicóptero en el helipuerto:** `showHelicopter={helicopterOnPad(month)}` (`StationScene.tsx` ~`:2183`) y `helicopterOnPad` en `packages/core/src/orcadas.ts:523`.
- **Viaje en el mapa:**
  - `packages/core/src/voyage.ts`: `voyageAt`, `voyageHeading`, `FLIGHT_CRUISE`, `flightClearance` y `transferAt`/`TRANSFER_SECONDS`, que es el salto en helicóptero desde el Irízar.
  - `packages/react-ui/src/voyage/Voyage3D.tsx`, `trail.ts` (estela) y `vehicles.ts` (Irízar, Hércules y helicóptero del viaje, en bloques).
- **Entrada al diorama:** `start` en `packages/react-ui/src/AntarcticaApp.tsx:120-140`, con las fases `approach`, `dive`, `fade` y `ret`.
- **Panel de inicio:** `packages/react-ui/src/orcadas/OrcadasIntro.tsx` (de #125). El selector se modela en el `Picker` de `voyage/VoyagePanel.tsx:75-123`.
- **Animación con suavizado y movimiento reducido:** `screenDoorAngle` y `smooth01` en `orcadas/lowPolyBuildings.ts`; el patrón de prop, `useFrame` e `invalidate` de la puerta del abrigo en `StationScene.tsx`.

## Dueño de la expedición

- **D2 (Lk):** Lk es el responsable de la expedición Orcadas y tiene prioridad sobre sus archivos. #66 y #111 son otros temas y no condicionan este plan.

## Fuera de alcance

- Sonido: Lk lo descartó (decisión de projectmem del 11 nov).
- Cambiar los modelos del viaje de Ushuaia a low-poly.

## Archivos

- **Crear:**
  - `packages/react-ui/src/orcadas/ArrivalPicker.tsx`: el selector de llegada del panel de inicio.
  - `packages/core/src/orcadas-arrival.ts`: lógica pura de la llegada (transporte elegido, qué está quieto y qué llega según el mes, curvas de entrada del Zodiac y de aterrizaje), con su test `packages/core/test/orcadas-arrival.test.ts`.
  - Un e2e nuevo: `packages/e2e/tests/orcadas-arrival.spec.ts`.
- **Modificar:**
  - `orcadas/stationModels.ts`: el camino.
  - `orcadas/StationScene.tsx`: el prop `arrival` y las animaciones de llegada.
  - `orcadas/OrcadasIntro.tsx`, `map/MapView.tsx` y `AntarcticaApp.tsx`: pasar la elección y encadenar viaje, acercamiento y diorama.
  - El módulo de viaje que haga falta (`core/voyage.ts`, `voyage/Voyage3D.tsx` o `voyage/trail.ts`).
  - `packages/core/src/content/orcadas.ts`: solo textos con fuente o descriptivos.
  - Las pruebas de `packages/react-ui/test/`.
  - `README.md`: la declaración de IA.

## Pasos

- [x] 1. **Línea base** (después del rebase sobre `main` con #125). Correr `pnpm test` (anotar los conteos de core y react-ui), `pnpm typecheck` y los e2e `orcadas*`, `map3d` y `flow` con GPU. → verificar: conteos anotados en #135.
- [x] 2. **Camino:** rehacer el trazado en `stationModels.ts`.
  - Una sola franja de triángulos con vértices compartidos a lo largo de una curva suave. Puede reutilizar `pathZAt`, o mejor una spline por puntos de control que pase frente a las puertas de las casas.
  - Ancho con variación leve, bordes con ripio suelto y piedras chicas (las de `chunk`), y cada vértice apoyado en la altura del suelo (`seatY` o la función de altura del terreno), sin flotar ni hundirse.
  - Ramales cortos hasta cada puerta, unidos a la franja sin solaparse. Colores `PATH_GRAVEL*` con variación por tramo, no por triángulo suelto.
  - → verificar: test nuevo en `packages/react-ui/test/` (por ejemplo `orcadasPath.test.ts`) con tres casos:
    - continuidad: cada tramo comparte su borde con el siguiente, sin huecos mayores a ε;
    - apoyo: cada vértice queda a menos de ε de la altura del suelo;
    - ningún triángulo degenerado o vuelto hacia abajo.
  - Capturas a 1440 y 390 px del camino de cerca y de lejos, aprobadas por Lk.
- [x] 3. **Lógica pura de la llegada** en `packages/core/src/orcadas-arrival.ts`:
  - `type ArrivalId = 'ship' | 'helicopter'`;
  - `arrivalMonth(arrival, today)`: el mes de temporada (noviembre a marzo) más cercano al actual, o el actual si ya es de temporada (D1);
  - `arrivalScene(arrival, month)`: qué llega, qué está quieto y si hay helicóptero en el helipuerto;
  - `zodiacApproach(t)` y `helicopterLanding(t)`: posición, rumbo y altura en función del tiempo, con suavizado;
  - `ARRIVAL_SECONDS`;
  - con movimiento reducido, directo a la pose final.
  - → verificar: `pnpm --filter @antartida/core test`, con casos de cada transporte, de `arrivalMonth` con el mes dentro y fuera de temporada (incluido el cambio de año), del inicio y el final de cada curva, y del movimiento reducido.
- [x] 4. **Selector de llegada** (`ArrivalPicker.tsx`) dentro de `OrcadasIntro`.
  - Dos opciones con `aria-pressed` y vista previa 3D del vehículo elegido (solo con WebGL). Debajo, un dato con fuente (`arrival-transporte`) y el rótulo de ilustración.
  - «Comenzar expedición» pasa la llegada elegida a `onStart`.
  - → verificar: `pnpm typecheck` y un e2e de teclado (Tab y Enter eligen; el foco queda atrapado y Escape cierra y devuelve el foco).
- [x] 5. **Viaje en el mapa** antes del acercamiento.
  - Encadenar en `AntarcticaApp.start`: la fase nueva `travel` anima en el mapa 3D el tramo hasta la isla Laurie con el vehículo elegido; después vienen `approach` y la escena.
  - Reutilizar `Voyage3D` o `trail.ts` y las curvas de `core/voyage.ts`.
  - Sin WebGL o con movimiento reducido no hay viaje: se va directo, como hoy.
  - Se puede saltear con un botón «Saltar viaje», alcanzable con teclado.
  - → verificar: e2e en desktop y mobile: con cada transporte se ve el viaje y después el diorama; con movimiento reducido se entra directo.
- [x] 6. **Llegada en el diorama** (`StationScene.tsx`).
  - Prop `arrival`. Durante `ARRIVAL_SECONDS`:
    - con el Zodiac, el bote entra con estela y espuma (efectos de la regla 30.9) y atraca;
    - con el helicóptero, baja con el rotor girando, nieve levantada (partículas de cajas o triángulos, sin texturas) y se posa en el helipuerto.
  - El otro transporte ya está quieto.
  - `invalidate()` mientras dura; geometrías liberadas en el cleanup.
  - La cámara arranca en una toma que muestra la llegada y después vuelve a la toma de entrada.
  - → verificar: `pnpm --filter @antartida/react-ui test` (mínimos de detalle si hay modelos nuevos) y un e2e: al terminar, el transporte elegido queda en su lugar (por ejemplo un `window.__orcadasArrival` de prueba, o la pose de la cámara), y con movimiento reducido no hay animación.
- [x] 7. **Detalles inmersivos:** las 10 propuestas (D3), en tres tandas que se pueden delegar en paralelo porque tocan partes distintas. Cada detalle lleva su test de lógica pura si la tiene, un `invalidate` acotado (sin render continuo cuando nada se mueve), el rótulo de ilustración y su versión con movimiento reducido (quieto o apagado).
  - 7a. Viento y casa: 1 (bandera, veleta y anemómetro según el viento de la lectura), 2 (humo de la chimenea con el mismo viento) y 3 (ventanas encendidas en los meses de pocas horas de luz). El viento sale de una sola función de `core` que usan los tres (regla 04).
  - 7b. Gente y fauna: 4 (el observador camina hasta el abrigo y la puerta se abre cuando llega), 5 (huellas en la nieve), 6 (pingüinos que se apartan cuando llega el Zodiac) y 8 (aves planeando). La 4 encadena con la puerta del abrigo de #125, y la 6 con la llegada del paso 6.
  - 7c. Clima, mar y salida: 7 (nieve o ventisca según el mes), 9 (témpanos que derivan según el mes) y 10 (al salir, el transporte de llegada se va). La 10 reutiliza las curvas del paso 3 al revés.
  - → verificar: `pnpm test`, capturas de cada detalle a 1440 y 390 px, y `pnpm bench` para confirmar que no cae la fluidez del diorama.
- [x] 8. **Capturas** en Chromium con `--use-angle=vulkan` a 1440 y 390 px: el camino, el selector de llegada, el viaje en el mapa y la llegada con cada transporte (en un mes con temporada y en uno sin). Mostrárselas a Lk antes del PR. → verificar: aprobación de Lk.
  > Enmienda (revisión de Lk sobre las capturas, 14-15 nov 2026): el panel de inicio muestra solo la vista 3D del vehículo elegido (se quitó la de la estación); el helicóptero del panel y del viaje es el low-poly del diorama; el viaje sale de la pose final del Irízar del viaje desde Ushuaia (`IRIZAR_ARRIVAL_POSE`), se ve de costado, y el Irízar fondea y despliega el Zodiac por estribor, a escala 1/8; la bandera es una sola malla con el sol completo y usa el viento simulado del día desde el inicio; el observador se rehízo low-poly, camina lo que dura el zoom al abrigo y no aparece en épocas sin la casa; las aves vuelan más rápido; al salir, el transporte gira y se va de frente (`zodiacDeparture`, `helicopterDeparture`) en vez de reproducir la llegada al revés.
- [x] 9. **`README.md`:** la declaración de IA de #135. → verificar: `git diff README.md`.
- [ ] 10. **Cierre:**
  - `git rebase origin/main`, `pnpm test && pnpm typecheck && pnpm build` y los e2e `orcadas*`, `map3d`, `no-webgl` y `flow` con GPU, en desktop y mobile.
  - Commit y PR con `Closes #135`. El push lo corre Lk.
  - → verificar: todo en verde y el link del PR.

## Detalles inmersivos (entran los 10, D3)

Todas son ilustraciones, sin datos nuevos. Las que dependen del tiempo usan la observación simulada del día, que ya está marcada como simulación.

1. **El viento manda:** la bandera flamea, la veleta apunta y las cazoletas del anemómetro giran según la dirección y la fuerza de la lectura de viento del capítulo Observar. Al anotar el viento, el diorama lo muestra.
2. **Humo de la chimenea** de la casa principal (efecto con cajas, regla 30.9), que se inclina con ese mismo viento.
3. **Ventanas encendidas** en los meses de pocas horas de luz, según la tira de meses que ya existe (horas de luz por mes).
4. **Un observador sale a leer el abrigo:** una figura low-poly camina por el camino nuevo desde la casa hasta el abrigo cuando empieza la lectura de temperatura. La puerta se abre cuando llega. Reconstrucción ilustrada.
5. **Huellas en la nieve** sobre el camino y hacia el abrigo, en los meses con nieve.
6. **Pingüinos que se apartan** del camino o de la playa cuando llega el Zodiac, y vuelven después.
7. **Nieve que cae o ventisca suave** en los meses fríos, con densidad según el mes (partículas low-poly, apagadas con movimiento reducido).
8. **Petreles o skúas** planeando sobre la bahía, en una trayectoria lenta.
9. **Hielo marino que se mueve:** los témpanos de la bahía derivan despacio según el mes, apoyados en la simulación de hielo que ya existe.
10. **El helicóptero o el Zodiac se van** al salir de la expedición: la animación de llegada al revés, como cierre.

## Tests nuevos

- `packages/core/test/orcadas-arrival.test.ts`: escena de llegada por transporte y mes, curvas y movimiento reducido.
- `packages/react-ui/test/orcadasPath.test.ts`: continuidad y apoyo del camino.
- `packages/e2e/tests/orcadas-arrival.spec.ts`: selector con teclado, viaje y llegada con cada transporte y entrada directa con movimiento reducido.

## Preguntas abiertas: 0

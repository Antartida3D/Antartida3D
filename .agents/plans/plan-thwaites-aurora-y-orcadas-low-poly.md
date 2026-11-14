# Plan: Pulido de Thwaites y la aurora, y Base Orcadas en low-poly

Estado: **borrador, espera aprobación de Lk.** Viene de #58 (PR de fichas y modelos de puntos). Se ejecuta en una conversación nueva, en ramas nuevas.

## Contexto que el agente necesita (sin la conversación de #58)

- #58 dejó en `main` (cuando se mergee su PR):
  - `packages/react-ui/src/voyage/lowPoly.ts`: triángulos de color plano (`Tri = [a, b, c, color]`), `buildPolyGeometry`, primitivas (`prism`, `lathe`, `extrude`, `block`, `chunk`, `groundField`, `emperor`) y colores del relieve (`reliefColor`, `RELIEF_ICE`, `RELIEF_ROCK`, `resolveRelief`). Prueba: `test/lowPoly.test.ts` (caras hacia afuera).
  - `packages/react-ui/src/voyage/pointModels.ts`: modelos de los puntos sin expedición, la cumbre del Erebus (`erebusSummit`) y el frente de Thwaites (`thwaitesFront`), más las funciones puras de movimiento (`calvingPose`, `auroraRay`, etc.).
  - `packages/react-ui/src/map3d/PointModels.tsx`: los apoya sobre el relieve; el Erebus y Thwaites se construyen desde el relieve real (`ErebusSummitMesh`, `ThwaitesMesh`).
  - `packages/react-ui/src/voyage/icebergs.ts`: témpanos low-poly del mar abierto y su agua (brillo, espuma y ondas con alfa por vértice).
  - Regla `.agents/rules/project/30-estilo-voxel.md`: admite bloques y low-poly, «transición en curso».
- Relieve: exageración ×10 en la Antártida y ×5 en Tierra del Fuego (#110). `worldHeight(m)` convierte metros a unidades del mundo.
- Revisar con capturas: Chromium con `--use-angle=vulkan`. La cámara se mueve desde la página con `window.__cameraControls` y `window.__invalidate`; el punto se abre desde «Ver como lista».

## Choque con una decisión del equipo (resolver antes de la parte C)

- #104 (cerrada el 14 nov 2026, GiulianoPoeta99): «La decisión de producto es mantener los modelos voxel. La migración de estilo no está aprobada». #91 (migrar todo a low-poly) se cerró como `NOT_PLANNED`.
- El PR de #58 ya cambia la regla 30 para admitir low-poly en transición. Pasar Orcadas a low-poly contradice #104.
- **Paso 0 obligatorio de la parte C:** Lk lo acuerda con el equipo y queda escrito en un issue (nuevo, o un comentario en #104 que revierta la decisión). Sin eso, la parte C no se ejecuta. Las partes A y B no dependen de esto.

## Objetivo y criterio de éxito

1. **Thwaites** (A): el frente de hielo sigue exactamente la línea de costa que dibuja el mapa (la tinta de la costa). Nada del modelo queda sobre el mar abierto, salvo témpanos y hielo suelto. No hay franjas ni grietas cruzando la costa. Captura de la toma cercana a 1440 y 390 px aprobada por Lk.
2. **Aurora** (B): de día no se ve como rayas verdes sueltas. Se lee como una cortina tenue, o se saca del mapa. Lk elige con dos capturas.
3. **Orcadas** (C): todos los modelos de la expedición y del sitio del mapa pasan a low-poly, con la misma ubicación, escala, animaciones y significado. Un test cubre el mínimo de detalle. El diorama no pierde fps.
4. `pnpm test && pnpm typecheck && pnpm build` y `pnpm e2e` en verde.

## Parte A: Thwaites

### Diagnóstico (con la captura de Lk del 14 nov)

- `thwaitesFront` traza la costa donde `heightAt > 0`, pero el mapa dibuja la costa desde la máscara de Bedmap3: el canal alfa de `packages/core/src/assets/terrain-relief-*.webp` es una distancia con signo a la costa (`coastSdf = (a * 255 - 32) / 32`, ver `paintedTerrain.glsl.ts:89`). No coinciden. Por eso los muros quedan flotando dentro del gris y las grietas cruzan el agua.
- El gris liso frente al glaciar hay que confirmarlo: puede ser hielo marino pintado por `ocean.glsl.ts` o plataforma flotante del relieve. Medir con un raycast desde la página (`window.__scene`) qué malla está en ese punto antes de decidir.
- Las grietas son quads sueltos, rectos y oscuros: se ven como rayas pegadas.

### Decisión recomendada

Seguir construyendo desde el mapa, pero con la costa del mapa:

1. En `packages/react-ui/src/map3d/`, leer una sola vez el canal alfa de la textura del relieve (la misma que carga `Terrain.tsx`, sin descargar otra) a un `ImageData` con un canvas, y exponer `coastSdfAt(x, y)` (coordenadas del mapa) con interpolación bilineal. Cachearlo en módulo. Sin dependencias nuevas.
2. `thwaitesFront` recibe `coastAt(dx, dz)` (distancia firmada, >0 hielo) en vez de deducir tierra y mar de la altura. Las isolíneas de marching squares se trazan en `coastSdf = 0`. El muro va hacia el lado del mar, su base bajo `y = -0.06` y su tope a la altura del relieve del lado del hielo más `CLIFF_MIN`.
3. Grietas: solo donde `coastSdf > 0.15` (hielo), en arcos paralelos a la costa y cortos. Color `ICE_WALL` mezclado con el relieve (no `CREVASSE` saturado). Que sean bandas hundidas (dos caras inclinadas en V), no quads planos.
4. Hielo suelto y témpanos: solo donde `coastSdf < -0.1`, decreciendo con la distancia. Si el gris resulta ser hielo marino, reducir mucho el hielo suelto y dejar 2 o 3 témpanos tabulares encastrados.
5. Bloque que se desprende: en el tramo de costa más cercano al punto, orientado con la normal de la isolínea.

**Plan B** (si en 1 h la costa no queda limpia): volver a un modelo compacto de punto (`POINT_MODELS.thwaites` con `map`, como Belgrano II): un tramo de frente de 1,2 unidades con acantilado, grietas y 3 témpanos, girado según la normal de la costa medida con `coastSdfAt`, y apoyado con `offset` justo en la costa.

### Pasos

- [ ] A1. Issue nuevo «Thwaites: el frente no sigue la costa del mapa» (asignado a Lk) y rama desde `main`. → verificar: `git branch --show-current` empieza con el número.
- [ ] A2. Raycast del gris frente a Thwaites y anotar qué malla es. → verificar: nota en el issue.
- [ ] A3. `coastSdfAt` en `map3d/` y test unitario puro de la lectura bilineal, con una `ImageData` armada a mano, en `packages/react-ui/test/coast.test.ts`. → verificar: `pnpm --filter @antartida/react-ui test`.
- [ ] A4. `thwaitesFront` con `coastAt` (pasos 2 a 5). Ajustar `test/pointModels.test.ts`: en una costa sintética recta, ninguna cara del acantilado ni las grietas caen del lado del mar, y ningún hielo suelto cae del lado del hielo. → verificar: tests en verde.
- [ ] A5. Capturas de la toma cercana (1440 y 390 px) y de lejos (distancia 60). Mostrárselas a Lk. → verificar: aprobación de Lk.

## Parte B: Aurora de Belgrano II

Hoy son 16 cajas verdes semitransparentes (`AuroraPart` en `PointModels.tsx`, `auroraRay` en `pointModels.ts`). De día se leen como rayas sueltas.

Opciones (armar las dos y que Lk elija con capturas):
- **B1. Cortina continua:** una tira de quads verticales unidos, con alfa por vértice (verde abajo, transparente arriba, como el agua de `icebergs.ts`), mezcla aditiva, opacidad máxima 0,25 y una onda lenta. Solo visible en la toma cercana (`screenPx` del modelo > 120 px).
- **B2. Sacarla del mapa** y dejar la aurora en la ficha («Desde allí se observan abundantes auroras polares», Ejército Argentino, ya citado en `docs/puntos-proximamente-fuentes.md`).

- [ ] B1. Implementar B1 detrás de una constante; capturas de B1 y B2. → verificar: Lk elige.
- [ ] B2. Dejar solo la elegida y borrar el código de la otra. → verificar: `pnpm test && pnpm typecheck`.

## Parte C: Base Orcadas en low-poly (solo si se resolvió el choque con #104)

### Inventario

- `packages/react-ui/src/orcadas/stationModels.ts` (1348 líneas): módulos (`buildModuleBoxes`), Casa Omond (`buildOmondBoxes`), torre de radio, abrigo meteorológico, mástil de viento y veleta, bandera (`FLAG_SEGMENT_BOXES`), bote Zodiac, helipuerto y helicóptero, focas, aves, témpanos (`ICEBERG_*_BOXES`, alias de `SEA_MODELS`), placas de hielo marino y el terreno del diorama.
- `penguins.ts` (789) y `seals.ts` (715): animales armados por partes con poses animadas.
- `StationScene.tsx` (1939): 36 llamadas a `buildBoxGeometry`; animaciones (bandera, veleta, rotor, bote, focas, pingüinos).
- `PenguinColony.tsx`, `Hotspots.tsx` (ubicaciones), `StationFallback.tsx` (2D, no se toca).
- Mapa: `map3d/OrcadasSite.tsx` y `ORCADAS_SITE` en `sightingModels.ts`.
- Pruebas: `test/models.test.ts` (`SCENE_MODELS` con getters de Orcadas) y e2e `orcadas*.spec.ts` (largos; ver gotcha de timeout en #84).

### Enfoque

- Una función por modelo que devuelva `Tri[]`, en un archivo nuevo por grupo para no superar archivos enormes: `orcadas/lowPolyBuildings.ts`, `orcadas/lowPolyAnimals.ts`, `orcadas/lowPolyProps.ts`. Reutilizar `lowPoly.ts` (`prism`, `lathe`, `extrude`, `emperor` como base de los pingüinos).
- Mantener las mismas medidas, pivotes y nombres de partes animadas, para que `StationScene.tsx` solo cambie `buildBoxGeometry(x)` por `buildPolyGeometry(y)`. Las poses de `penguins.ts` y `seals.ts` siguen iguales (mueven partes, no cajas).
- Colores: los de `VOXEL_PALETTE` y los de OSM (`resolveBuildingColour`). No inventar colores de edificios.
- Témpanos del diorama: usar `ICEBERG_TABULAR_POLY` y `ICEBERG_PEAKS_POLY` de `icebergs.ts` y quitar los alias `ICEBERG_*_BOXES`.
- Iluminación: `buildPolyGeometry` sombrea por pendiente con el sol del relieve. Si el diorama usa otro sol, agregar un parámetro de dirección de luz a `buildPolyGeometry` (no duplicar la función).
- Test nuevo `test/orcadasLowPoly.test.ts`: cada modelo tiene ≥ `POLY_MIN_TRIS` caras y ≥ 2 colores, caras hacia afuera (reutilizar la función `inward` de `lowPoly.test.ts`, movida a un helper de test), y los pivotes de las partes animadas siguen en el mismo lugar que en la versión de bloques.

### Pasos (un PR por grupo, para que se revise de a poco)

- [ ] C0. Acuerdo del equipo registrado (ver «Choque»). → verificar: link al issue o comentario.
- [ ] C1. Issue y rama. Línea base: `pnpm test` (conteo), `pnpm bench` (fps del diorama) y capturas de las 4 tomas del recorrido de Orcadas. → verificar: números anotados en el issue.
- [ ] C2. Edificios y estructuras (módulos, Omond, torre, abrigo, mástil, helipuerto, bandera). → verificar: test nuevo, capturas lado a lado y e2e `orcadas.spec.ts` en desktop.
- [ ] C3. Vehículos y utilería (helicóptero con rotor, bote Zodiac, placas de hielo, témpanos). → verificar: ídem.
- [ ] C4. Animales (pingüinos de Adelia y de barbijo, focas de Weddell y elefante, skúa, petrel). Conservar la marca de especie (regla 30.3). → verificar: ídem, y las poses animadas se ven bien en 3 momentos del ciclo.
- [ ] C5. Sitio del mapa (`ORCADAS_SITE`, `OrcadasSite.tsx`) con el mismo apoyo sobre el relieve que los puntos de #58 (`seatOf`/`seatTris`), o reutilizando `PointModels` si alcanza. → verificar: captura a distancia 60 y en la toma cercana.
- [ ] C6. Borrar lo que quede sin uso en `stationModels.ts` y los getters de `SCENE_MODELS`. Actualizar la regla 30 (Orcadas ya en low-poly) y la declaración de IA del README. → verificar: `pnpm typecheck` sin exports huérfanos (buscar con `grep`).
- [ ] C7. `pnpm bench` contra la línea base. Si los fps caen más de 10 %, unir geometrías estáticas en una sola malla por grupo. → verificar: número del bench en el PR.

## Fuera de alcance

- Vehículos del viaje (Irízar, Hércules), Ushuaia y la fauna del mar abierto: siguen en bloques salvo que se pida.
- Contenido y fuentes: no cambian.

## Verificación final

`pnpm test && pnpm typecheck && pnpm build && pnpm e2e`

## Preguntas abiertas: 1

- Parte C: ¿el equipo revierte la decisión de #104 y aprueba pasar Orcadas a low-poly? Lk la resuelve con el equipo antes de C1.

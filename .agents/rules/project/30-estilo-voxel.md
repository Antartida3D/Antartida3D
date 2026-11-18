# 30. Estilo visual: modelos de bloques (voxel) y low-poly

> **Por qué:** Dos estilos de dibujo en el mismo mapa se leen como dos aplicaciones distintas. Un solo estilo y un mínimo de detalle hacen que todo se vea parte del mismo cuaderno.

> **Transición en curso (14 nov 2026, #58):** se admiten los dos estilos, bloques y low-poly. El proyecto está pasando a low-poly y es posible que más adelante se muden todos los modelos. Un modelo nuevo puede hacerse en cualquiera de los dos; uno que se apoya sobre el relieve conviene hacerlo low-poly.
>
> **Low-poly:** lista de triángulos de color plano `[a, b, c, color]` unidos con `buildPolyGeometry` (`packages/react-ui/src/voyage/lowPoly.ts`) y dibujados con `vehicleMaterial`. Sin luces: cada cara recibe un sombreado fijo según el sol del relieve. Las caras del suelo pueden tomar el color del relieve pintado (`RELIEF_ICE`, `RELIEF_ROCK`, `reliefColor`) para que no se distingan del mapa. Mínimo de detalle: `POLY_MIN_TRIS` (60) caras y `POLY_MIN_COLORS` (2) colores, con el mismo rasgo distintivo de la regla 3. Prueba: `packages/react-ui/test/pointModels.test.ts` y `lowPoly.test.ts`. Ejemplos: los puntos sin expedición en `pointModels.ts`, apoyados vértice a vértice sobre el relieve en `map3d/PointModels.tsx`.
>
> **Tamaño de los puntos sin expedición:** de cerca sus modelos low-poly tienen su ancho en el mundo (`PointModel.width`) y se apoyan sobre el relieve; de lejos crecen hasta unos `GROW_PX` px en pantalla (con tope `GROW_MAX`) para que se vean y den ganas de tocarlos. Al tocar el punto la cámara baja a verlos sobre el relieve (`MapPoint.closeUp`). Los témpanos del mar abierto también son low-poly (`icebergs.ts`).
>
> **Base Orcadas en low-poly (#116):** todos los modelos del diorama (edificios, vehículos, hielo y animales: `orcadas/lowPolyBuildings.ts`, `lowPolyProps.ts`, `lowPolyAnimals.ts`) y el sitio del mapa (`voyage/orcadasSiteModel.ts`) son low-poly. En el diorama se dibujan con `buildPolyGeometry(tris, boxShade)`, la luz fija por cara de las cajas, para que convivan con lo que queda en bloques. Nivel de detalle de referencia: los témpanos (`icebergs.ts`), con formas creíbles y contacto con el entorno (agua, espuma, ondas, nieve, apoyo en el suelo). Los témpanos del diorama son los mismos del mapa abierto, con su agua. Pruebas: `test/orcadasLowPoly.test.ts`, `orcadasProps.test.ts`, `orcadasAnimals.test.ts` y `orcadasSite.test.ts`. Siguen en bloques el Puerto Argentino y la fauna del mar abierto.
>
> **Hércules en low-poly (#74):** el C-130 es `voyage/herculesModel.ts`: `HERCULES_FLIGHT_POLY` (en vuelo, tren arriba, eje del fuselaje en `y = 0`) y `HERCULES_PARKED_POLY` (en tierra, ruedas apoyadas en `y = 0`). Una unidad es el largo; el ala mide `HERCULES_SPAN`. `buildVehicleGeometry('hercules')` lo arma con `boxShade` y queda registrado en `VEHICLE_POLY_MODELS` (`vehicles.ts`). El camuflaje y la bandera salen del color de cada cara, no de piezas encimadas. Prueba: `test/hercules.test.ts`.
>
> **Irízar en low-poly (#158):** el rompehielos es `voyage/irizarModel.ts`: `IRIZAR_POLY`, a flote, con la quilla en `y = 0`. Una unidad es el largo. Conserva las medidas de `@antartida/core` que usan el viaje y la llegada a Orcadas: la cubierta de vuelo a `IRIZAR_DECK_TOP` de alto y `IRIZAR_DECK_AFT` detrás del medio, libre para el Sea King, y el ancho con botes `IRIZAR_HALF_BEAM`. `buildVehicleGeometry('irizar')` lo arma con `boxShade` y queda registrado en `VEHICLE_POLY_MODELS`; las vistas previas (`VehiclePreview`, `SeaPreview`, `ArrivalPicker`) usan los mismos triángulos. Sus colores con nombre (`HULL_RED`, `CREAM`, `BLACK`, `DECK`, `LIFEBOAT`) viven en ese archivo y `vehicles.ts` los importa para el Puerto Argentino. Prueba: `test/irizar.test.ts`.
>
> **Desde Ushuaia en low-poly (#314):** la ciudad, el helicóptero del viaje y todos los avistajes son low-poly, cada modelo nuevo en `voyage/poly/` (`SIGHTING_POLY_MODELS` en `sightingModels.ts` los registra y `test/models.test.ts` los cubre). Los colores compartidos están en `voyage/sightingColors.ts`: un modelo de `poly/` importa de ahí y no de `sightingModels.ts`, para no formar un ciclo.
>
> Lo que sigue describe los modelos de bloques; las reglas de medidas, colores con nombre, efectos y `ModelPreview` valen para los dos estilos.

1. Todo animal, vehículo, edificio, personaje u objeto que se dibuje sobre el mapa es un **modelo de bloques**: una lista de cajas `[cx, cy, cz, sx, sy, sz, color]` unidas con `buildBoxGeometry` y dibujadas con `vehicleMaterial`.
   - No: sprites, dibujos planos, texturas pintadas, modelos importados (`.glb`, `.obj`), sombreado con luces.
   - Sí: cajas de color plano; el sombreado va fijo por cara y lo pone `buildBoxGeometry`.
2. Antes de crear un modelo, busca si ya existe uno reutilizable en `packages/react-ui/src/voyage/vehicles.ts` o `sightingModels.ts` (por ejemplo `seal(...)` y `emperorAt(...)`; los low-poly de los avistajes están en `voyage/poly/`).
3. Mínimo de detalle, igual para todos: al menos `VOXEL_MIN_BOXES` cajas (12) y `VOXEL_MIN_COLORS` colores (2). Además, el modelo debe tener el rasgo que lo distingue:
   - animal: ojos y la marca propia de la especie (barbijo, parche blanco, aleta);
   - vehículo: ventanas del puente o de la cabina y un rasgo propio (helicóptero, grúa, motores);
   - edificio: techo, puerta o ventanas.
4. Medidas comunes: una unidad es el largo (o el ancho) del modelo; el frente mira a `+x` en vehículos y animales, y a `+z` en edificios; `y` es arriba y la base apoya en `y = 0`.
5. Usa los colores ya definidos en esos archivos. Un color nuevo se agrega como constante con nombre, no suelto en una caja.
6. Los modelos de escena del mapa abierto (fauna, témpanos, Irízar, Hércules, Ushuaia, Orcadas) mantienen su tamaño en pantalla hasta una distancia de cámara de `MODEL_REFERENCE_DISTANCE` (`placeModelSize` y `seaModelSize`, en `@antartida/core`), para no tapar el mapa al acercarse. Más lejos tienen un **tamaño fijo y exagerado en el mundo**: así, al alejarse se achican y dan sensación de lejanía. Cuando miden menos de `MODEL_MIN_PX` en pantalla (`screenPx`) se ocultan. Solo lo que la cámara sigue en una expedición (vehículo, avistajes) se escala con la distancia. No es un dato: los modelos son ilustraciones con tamaño exagerado.
   - No: `g.scale.setScalar(distance * k)` sin tope, o un tamaño fijo que de cerca llena la pantalla.
   - Sí: `const size = seaModelSize(px, distance)` (o `placeModelSize`) y `g.visible = screenPx(size, distance, height) >= MODEL_MIN_PX`.
7. Todo modelo nuevo se registra en `VEHICLE_MODELS` o `SCENE_MODELS` (o en `VEHICLE_POLY_MODELS` si es un vehículo low-poly), para que la prueba de detalle lo cubra.
8. Para mostrar un modelo dentro de una ficha o panel se usa `ModelPreview` (`packages/react-ui/src/voyage/ModelPreview.tsx`); no se arma otro lienzo.
9. Los efectos (humo, soplido de ballena, estela) no son modelos y no tienen mínimo, pero también se hacen con cajas.

## Guardián
Prueba del mínimo de detalle.

- Prueba: `pnpm --filter @antartida/react-ui test` (`packages/react-ui/test/models.test.ts`). Falla si un modelo registrado tiene menos cajas o colores que el mínimo.
- Documento de diseño: `docs/diseno/estilo-voxel.md`.

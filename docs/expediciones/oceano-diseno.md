# Océano: diseño

Expedición Océano (#8). La pregunta conductora es **«¿Cómo se alimenta la vida que encontramos bajo el hielo?»**. Fuentes en [oceano-fuentes.md](oceano-fuentes.md).

## Recorrido

Tiene 7 capítulos y 12 paradas. Se recorre con un solo botón, siempre en el mismo lugar ([DEC-283](../decisiones/DEC-283-oceano-sin-botones-opcionales.md)). En tres paradas, ese botón primero muestra una segunda vista y después avanza; en la segunda vista, la flecha de atrás vuelve a la primera.

| Nº | Capítulo | Parada | Qué pasa |
|---|---|---|---|
| 1 | Entrar | El hielo es un techo | «Mirar bajo el hielo»: la cámara baja y el texto sigue debajo del hielo |
| 2 | Alimento pequeño | Ver lo diminuto | Lupa opcional colgada de una diatomea: «Aumentar tamaño» / «Volver diminuto» (aumento esquemático) |
| 3 | Alimento pequeño | Encontrar el krill | El enjambre bajo el hielo |
| 4 | Ballenas | La jorobada | Da una vuelta y entra al enjambre con la boca abierta; los tres pasos del trago están en el texto |
| 5 | Ballenas | La minke, entre el hielo | La cámara la sigue: embiste parches de krill y respira en la grieta |
| 6 | Emperador | Del hielo al agua | «Mirar bajo el agua» |
| 7 | Emperador | Volver a respirar | La cámara sigue una inmersión: baja, atrapa un pez y vuelve a respirar |
| 8 | Foca leopardo | Más de una estrategia | Lista de alimentos; en la escena muerde a los peces y chupa el krill |
| 9 | Foca leopardo | Filtrar con dientes | De cerca, el krill entra y el agua sale entre los dientes |
| 10 | Orcas | Una familia, distintas dietas | «Ver un ejemplo documentado» (P06): la ola de las orcas tipo B, vista desde arriba |
| 11 | Conectar | Seguir el alimento | Elegir organismos en la red |
| 12 | Conectar | Lo que vimos bajo el hielo | Cuaderno y «Terminar expedición» |

Solo «Terminar expedición» completa el recorrido. Salir con «Mapa» no lo completa.

## Código

- `packages/core/src/content/marine.ts`: fuentes, capítulos, paradas, organismos, flechas de la red y la descripción en texto de cada escena.
- `packages/core/src/marine-expedition.ts`: estado y reductor puro. Cuenta las paradas sin repetir y conserva lo observado. La parada 1 y el capítulo del emperador empiezan sobre el hielo.
- `packages/react-ui/src/marine/`:
  - `MarineExpedition.tsx`: panel y BottomSheet.
  - `MarineScene.tsx`: escena 3D, cargada aparte.
  - `FoodWeb.tsx`: red en el panel y diagrama SVG sin WebGL.
  - `models.ts`: modelos voxel.
  - `marinePoses.ts`: disposición del hielo y poses puras.
- Estilos en `packages/core/src/styles/marine.css`.
- En el mapa, Océano pasa a «Expedición disponible». Conserva su marcador y coordenadas, y se puede abrir directo con `?expedicion=oceano`.
- No se tocaron `core/src/ocean.ts` ni `map3d/Ocean.tsx`.

## Estilo

- Sigue la segunda iteración de Fósiles y el recorrido de Orcadas:
  - escena low-poly y cámara que acompaña cada parada; cada parada muestra todo su texto de una vez, sin «Saber más» (#283);
  - la interfaz de Orcadas y Marambio (#209): panel flotante en escritorio y BottomSheet en el celular, pie con la flecha de atrás (botón cuadrado) y «Siguiente»; la vista se corre a la parte libre de la escena (`sceneFrame.tsx`). Desde #283 no hay barra de capítulos arriba, el panel de escritorio tiene siempre el mismo alto, la hoja del celular no sube más que su contenido y plegada muestra el título, y la cámara no cambia al plegarla. El cartel de ubicación lleva el pin del mapa;
  - cielo de Orcadas sobre el hielo y efecto de tinta cuando el equipo lo soporta.
- Bajo el hielo hay una cúpula de color de agua, niebla y franjas de luz que bajan por las aberturas reales del hielo: la grieta, el agujero de los emperadores y el borde del hielo. La cara de abajo de los témpanos tiene manchas de algas (D03).
- Modelos low-poly propios, en `marine/lowPolyMarine.ts` (`MARINE_POLY_MODELS`):
  - jorobada con mandíbula y garganta que se mueven, sin separarse del cuerpo, barbas y aletas blancas largas;
  - foca leopardo con cabeza grande, manchas oscuras en garganta, vientre y flancos, y dientes de tres puntas;
  - emperador nadando;
  - krill, dos diatomeas, pez plateado y calamar.
- Un solo modelo por animal ([DEC-283-2](../decisiones/DEC-283-2-un-modelo-por-animal-del-mar.md)): la jorobada (`HUMPBACK_PARTS`) y la foca leopardo (`LEOPARD_PARTS`) de Océano son también las del mapa y su ficha, y la minke de Océano es la del mapa (`MINKE_PARTS`), con aletas grises y el borde de adelante pálido, sin la banda blanca (D04).
- Reutiliza la orca, la foca de Weddell de Orcadas, los témpanos y el emperador de pie con aletas (`emperorWithFlippers`).

## Animación y accesibilidad

- Cómo come cada animal:
  - la jorobada da una vuelta y entra al enjambre con la boca abierta; el krill que toca su boca desaparece y el enjambre se vuelve a juntar mientras ella da la vuelta;
  - la minke embiste tres parches de krill bajo los témpanos (P03: muchas embestidas cortas);
  - el emperador baja a los peces, da media vuelta, atrapa uno con el pico y sube con él;
  - la foca leopardo muerde a los peces con la boca bien abierta y chupa el krill con la boca a medias; de cerca, el krill entra a la boca y el agua sale por los costados, entre los dientes (P04);
  - en el ejemplo de P06, tres orcas tipo B nadan juntas hacia un témpano con una foca de Weddell, se sumergen y la ola barre el hielo. La foca resbala pero no se muestra la captura.
- Las poses son funciones puras del tiempo y tienen pruebas:
  - la minke sube a respirar solo a lo largo de la grieta y embiste solo en los parches de krill, nunca mientras respira;
  - la foca muerde y chupa en cada vuelta, y la succión expulsa el agua con la boca cerrada;
  - en la ola, las orcas siguen bajo el agua y la foca no sale del témpano;
  - el emperador entra y sale por el agujero y respira en la superficie con la cabeza afuera. La cámara de esa parada mira hacia arriba desde debajo del agujero, para que se vea cuando vuelve a respirar;
  - las orcas nadan en agua abierta y no se superponen;
  - el trago de la jorobada sigue su orden.
- Un solo reloj dibuja la escena bajo demanda, como en Orcadas y Fósiles.
- Con movimiento reducido no hay movimiento continuo ni vuelos de cámara: cada parada muestra un cuadro fijo que se entiende (la jorobada con la boca abierta dentro del enjambre, el emperador con el pez en el pico).
- Sin WebGL, o si se pierde el contexto, cada escena se describe en palabras y la red se dibuja en SVG. Todas las paradas e interacciones siguen funcionando.
- La cámara bajo el agua no puede subir por encima de su objetivo, así que no sale del agua.

## Verificación

- Unitarias de `core`: recorrido, límites, visitas sin repetir, red sin flechas inventadas, fuentes y textos.
- Unitarias de `react-ui`: poses, hielo, registro de modelos, el pez del emperador y minke sin banda.
- e2e (`marine.spec.ts`, a 390 y 1440 px):
  - recorrido completo con el botón principal;
  - solo teclado;
  - salir sin completar;
  - movimiento reducido y movimiento permitido;
  - sin WebGL;
  - sin desborde horizontal.
- Las cuentas de expediciones de las e2e salen de `AVAILABLE_COUNT`.

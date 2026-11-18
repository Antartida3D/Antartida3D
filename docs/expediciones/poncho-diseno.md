# Diseño — Expedición Poncho

Diseño de la experiencia «Poncho»: un **viaje sobre el mapa** (el motor de «Desde Ushuaia») en el que el equipo de trineo recorre la vida del perro polar. Contenido: [poncho.md](./poncho.md). Fuentes y licencias: [poncho-fuentes.md](./poncho-fuentes.md). Contrato de datos: `packages/core/src/content/poncho.ts` (`PONCHO_TRANSPORT`, `PONCHO_MILESTONES`, `PONCHO_ACTS`, `PONCHO_LOG`) y el tipo `Milestone` de `content/ushuaia.ts`. Las posiciones están en `content/poncho-route.ts`.

## 1. Idea

Un recorrido por la vida de Poncho, de 1961 a 1978, contado en **tres actos** y **7 paradas** (eran 10: la patrulla «Paralelo 82» se unió al salto en paracaídas, [DEC-221](../decisiones/DEC-221-patrulla-y-paracaidas-en-una-parada.md), y las tres últimas son una sola, «La última proeza y el retiro», [DEC-223](../decisiones/DEC-223-ultima-parada-de-poncho.md)). La persona mantiene apretado «Avanzar» y el equipo se mueve por el mapa; al llegar a una parada se abre su ficha. Entre paradas aparece una línea del **diario de ruta**. No hay preguntas ni puntaje.

Por qué un viaje sobre el mapa y no una escena propia: la historia tiene saltos de lugar (Esperanza, San Martín, Belgrano y otra vez Esperanza) y el mapa los muestra; el traslado final a Ushuaia se cuenta en la última parada, no se recorre; el tramo de cada vehículo (trineo o rompehielos) es un tramo de la ruta (`segment`).

## 2. Recorrido

- **Panel de inicio:** al elegir Poncho se abre un panel con qué es el viaje, el rótulo «Reconstrucción ilustrada», el aviso único de ilustración y el enlace a las fuentes. «Comenzar» empieza el viaje.
- **Tramos:** 0 trineo por la Península, 1 barco a Belgrano, 2 trineo en Belgrano, 3 barco de regreso, 4 trineo en Esperanza, donde termina el viaje. Cada parada abre en su tramo y en su lugar (`anchor` y `place`).
- **Control del ritmo:** mantener «Avanzar» (con tres marchas), retroceder, saltar a la próxima parada. Con la preferencia de movimiento reducido o en el mapa 2D no hay animación: el viaje avanza **de parada en parada**.
- **Orden:** las paradas siguen el orden del libro; el año no baja.
- **Volver atrás (#214):** «Volver al mapa» está siempre visible en el diorama; el avance se guarda y, si se sale desde adentro de una parada, «Continuar» vuelve a entrar a ella. «Atrás» al principio de una parada entra a la anterior completa (escena y panel), en su última frase; «Siguiente» al final de una parada ya leída sigue a la siguiente. La barra de viaje es la de los viajes desde Ushuaia ([DEC-309](../decisiones/DEC-309-barra-de-viaje-como-ushuaia.md)): ofrece la parada donde está el equipo como un chip «Leído · título» que abre su ficha al costado del mapa; el punto del mapa de una parada ya hecha vuelve a entrar a ella completa (escena y panel), y la flecha ◀ (mantener) retrocede por la ruta. Un punto en el mismo lugar que una parada ya leída (en Esperanza: el barco a Belgrano y la última parada) se ve gris hasta que es la parada siguiente. No se puede saltear una parada que todavía no se recorrió (DEC-146).

## 3. Estructura de una ficha

De arriba abajo:

1. **Rótulo de acto** (solo en la primera parada de cada acto): «Acto N · título», en letra chica.
2. **Título** de la parada.
3. **Escena (`essential`)**: dos o tres frases cortas, concretas, con detalles del libro y su cita (`Libro · p. N`).
4. **«Saber más»** (al final de la parada, a pedido): los datos con su fuente y página, desplegados en el mismo panel.
5. **Gancho (`hook`)**: una frase en cursiva, discreta, antes de «Continuar». Abre la curiosidad por lo que viene y no afirma nada nuevo.
6. **Botones:** «Atrás» y «Siguiente»; en la última frase de la parada, «Seguir con Poncho» (o «Terminar el viaje» en la última).

La escena de la parada siguiente empieza con un eco natural del gancho anterior.

## 4. Diario de ruta

Una línea de una frase sobre los controles, con un dato del libro y su cita. Cambia al avanzar el equipo. Es una región `aria-live="polite"`. En los tramos de barco no aparece (el libro dice poco de los perros a bordo; solo hay una línea en el primero). Con movimiento reducido o en el mapa 2D, aparece una línea distinta en cada paso entre paradas. La elige la función pura `logLineAt(kind, t, leg?)` de `packages/core/src/poncho-log.ts`.

## 5. Voz del relato

- **Fiel en hechos, libre en forma.** Mismos hechos y mismo orden que el libro; libertad en el ritmo, los ganchos y la composición.
- Narrador cercano al perro, tercera persona, frases cortas, para todas las edades. Las palabras difíciles se explican en la misma frase.
- **Sin diálogos ni pensamientos de Poncho inventados.** Sin preguntas. Sin fuego (el libro habla de carpas).
- **Sin nombres de personas:** roles («el instructor», «el oficial», «una familia de Ushuaia»). Sí nombres de perros.
- **Los ganchos no llevan datos:** sin cifras, años, nombres propios (salvo «Poncho») ni aproximaciones. La prueba `poncho-content.test.ts` lo exige.

## 6. Simulación marcada en la interfaz

- **Un solo aviso:** «El recorrido y los modelos son una ilustración, no una ruta real.» Se muestra en el panel de inicio y en la página de fuentes, no en cada ficha.
- El trineo, los perros y el paisaje son modelos de bloques (ver `docs/diseno/estilo-voxel.md`): son ilustraciones con tamaño exagerado. La ruta dibujada no es un derrotero real; las fuentes no lo publican.
- Las posiciones de las paradas salen del gazetteer de SCAR o de la Armada cuando están verificadas; las demás son aproximadas y no se presentan como dato.

## 7. Contenido que se muestra siempre

- **Poncho no llegó al Polo Sur:** lo dice la parada `paracaidas`, «De la patrulla al salto en paracaídas» (en «Saber más»: lo alcanzó el grupo de tractores).
- **Licencia pendiente:** hasta que el equipo aporte la evidencia de la autorización del autor (ver `poncho-fuentes.md`, sección 4), los textos van con palabras propias y no se muestran fotos del libro.
- **Créditos y fuentes:** la página de fuentes lista solo lo que el recorrido cita, numerado en orden de primer uso.

## 8. Accesibilidad y teclado

Según `20-web.md`:

- Todo funciona con teclado: «Avanzar» responde a espacio y Enter (mantener), `Esc` cierra la ficha.
- Foco visible; la ficha es un diálogo con título accesible y devuelve el foco al control.
- El diario de ruta es `aria-live="polite"`; el estado del viaje no se anuncia cuadro por cuadro.
- Con `prefers-reduced-motion` o en 2D no hay animación: el viaje avanza de parada en parada.
- Las citas del libro son enlaces con `aria-label` («Fuente 1, página 12: …») que abren la página del PDF en una pestaña nueva.
- Pruebas: unitarias de contenido (`packages/core/test/poncho-content.test.ts`) y E2E con Playwright a 390 y 1440 px; los errores de consola hacen fallar la prueba.

## 9. Fuera de alcance

- Los modelos y el relieve (los trabajan otros issues).
- Aprobar la licencia del texto o las fotos (lo hace el equipo con la evidencia).

## Diorama por etapas y fotos (#146)

- **Un diorama por parada, con el panel de Fósiles (#211).** Cada una de las siete paradas abre una escena a escala humana que ocupa toda la pantalla y, flotando sobre ella, un panel con el mismo diseño que las paradas de Fósiles (lateral en pantallas anchas, una hoja que se abre hacia arriba en el celular). En pantallas anchas y en el celular apaisado, el panel queda anclado abajo y mide lo que su contenido. Crece hacia arriba con cada frase hasta el alto máximo de la pantalla y, pasado ese alto, el contenido hace scroll (#261). La historia aparece por partes: cada «Siguiente» suma una frase (una toma de cámara por frase del `essential`) y la escena muestra algo nuevo; no hay contadores. Al final aparecen el gancho, «Saber más» (se despliega en el mismo panel) y la foto de la parada (se abre en un modal). Los datos de las escenas están en `packages/core/src/poncho-scenes.ts`; una prueba exige que todas las paradas tengan sus tomas. Quien espera respira y se mueve un poco. «Nace Poncho» (#216) se cuenta en la Base Esperanza: un terreno de grava con parches de nieve, una montaña nevada detrás y el mar al frente, que se ve de lejos y al girar la escena (`setting: 'station'`; el mar está del lado -z, solo agua hasta el horizonte), a escala humana, con los perros y las personas de la historia moviéndose delante. La base (#261, `voyage/ponchoBase.ts`) se arma así:
  - Junto a la orilla está la casa principal, con el largo perpendicular al agua y el frente mirando al mar. Tiene dos plantas, balcón de madera, el cartel «BASE ESPERANZA» bajo la cumbrera y planta baja amarilla atrás.
  - Al lado de la casa, un contenedor blanco tiene la bandera argentina pintada en la cara que da al agua. No hay mástil.
  - Una pasarela de madera baja hasta el agua, entre rocas oscuras.
  - Más atrás, en la ladera, hay seis casas de distintos tamaños, repartidas al azar con semilla fija, sin filas y muy separadas.

  En la estación, los modelos se apoyan sobre el suelo tal como se dibuja: ladera incluida y, sobre el mar, el agua. Las piedras sueltas del diorama no caen dentro de las casas (`PonchoProp.clearings`). La escena es una ilustración inspirada en fotos de la base, no un plano. Decisión: [DEC-211](../decisiones/DEC-211-panel-de-poncho-como-fosiles.md).
- **Una parada que cambia de escena (#223).** Una parada puede seguir en otra escena desde una de sus frases (`SceneDef.then`, `sceneStage` en `poncho-scenes.ts`): el escenario se arma de nuevo y la cámara entra a su toma como al empezar una parada. La última parada se cuenta en la Base Esperanza y, en su última frase, pasa al rompehielos de «En rompehielos hacia Belgrano», donde suben solo un hombre y Poncho.
- **Todo es ilustración.** Las posturas, los lugares y los modelos son un dibujo del relato, no un registro; la pantalla lo avisa con «Reconstrucción ilustrada». El helicóptero, el rompehielos y el hotel son modelos genéricos, no un vehículo ni un edificio real identificado.
- **Fotos.** Dos imágenes de las páginas de la Fundación Marambio se muestran cuando la historia llega a ellas (`packages/core/src/content/poncho-photos.ts`): la de «Poncho va al frente» y la de «De la patrulla al salto en paracaídas», que se abren en un modal desde el panel de cada parada. Las páginas no traen autor, fecha ni pie, y no se inventó ninguno. Fuentes y estado de los derechos: sección 4.3 de [poncho-fuentes.md](poncho-fuentes.md). Una parada puede tener más de una foto: «Poncho va al frente» suma una de la Base San Martín en dominio público, con su autor y la licencia (sección 4.6).
- **Orden obligatorio.** El viaje de Poncho es una historia contada en orden: se detiene en cada hito y abre su tarjeta. Los viajes desde Ushuaia mantienen los hitos opcionales de #157 (ver [DEC-146](../decisiones/DEC-146-poncho-en-orden.md)).

# Diseño — Expedición Poncho

Diseño de la experiencia «Poncho»: un **viaje sobre el mapa** (el motor de «Desde Ushuaia») en el que el equipo de trineo recorre la vida del perro polar. Contenido: [poncho.md](./poncho.md). Fuentes y licencias: [poncho-fuentes.md](./poncho-fuentes.md). Contrato de datos: `packages/core/src/content/poncho.ts` (`PONCHO_TRANSPORT`, `PONCHO_MILESTONES`, `PONCHO_ACTS`, `PONCHO_LOG`) y el tipo `Milestone` de `content/ushuaia.ts`. Las posiciones están en `content/poncho-route.ts`.

## 1. Idea

Un recorrido por la vida de Poncho, de 1961 a 1978, contado en **cuatro actos** y **10 paradas**. La persona mantiene apretado «Avanzar» y el equipo se mueve por el mapa; al llegar a una parada se abre su ficha. Entre paradas aparece una línea del **diario de ruta**. No hay preguntas ni puntaje.

Por qué un viaje sobre el mapa y no una escena propia: la historia tiene saltos de lugar (Esperanza, San Martín, Belgrano, Esperanza, Ushuaia) y el mapa los muestra; el tramo de cada vehículo (trineo o rompehielos) es un tramo de la ruta (`segment`).

## 2. Recorrido

- **Panel de inicio:** al elegir Poncho se abre un panel con qué es el viaje, el rótulo «Reconstrucción ilustrada», el aviso único de ilustración y el enlace a las fuentes. «Comenzar» empieza el viaje.
- **Tramos:** 0 trineo por la Península, 1 barco a Belgrano, 2 trineo en Belgrano, 3 barco de regreso, 4 trineo en Esperanza, 5 barco a Ushuaia. Cada parada abre en su tramo y en su lugar (`anchor` y `place`).
- **Control del ritmo:** mantener «Avanzar» (con tres marchas), retroceder, saltar a la próxima parada. Con la preferencia de movimiento reducido o en el mapa 2D no hay animación: el viaje avanza **de parada en parada**.
- **Orden:** las paradas siguen el orden del libro; el año no baja.

## 3. Estructura de una ficha

De arriba abajo:

1. **Rótulo de acto** (solo en la primera parada de cada acto): «Acto N · título», en letra chica.
2. **Título** de la parada.
3. **Escena (`essential`)**: dos o tres frases cortas, concretas, con detalles del libro y su cita (`Libro · p. N`).
4. **«Saber más»** (a pedido): los datos con su fuente y página.
5. **Gancho (`hook`)**: una frase en cursiva, discreta, antes de «Continuar». Abre la curiosidad por lo que viene y no afirma nada nuevo.
6. **Botones:** «Continuar» (o «Partir» en la primera, «Terminar el viaje» en la última) y «Saber más».

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

- **Poncho no llegó al Polo Sur:** lo dice la parada `patrulla-paralelo-82` (en «Saber más»: lo alcanzó el grupo de tractores).
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

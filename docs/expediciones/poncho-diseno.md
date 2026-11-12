# Diseño — Expedición Poncho, Prototipo B

Diseño de la experiencia «Poncho» como **Prototipo B**: una escena propia (no el mapa compartido) con un recorrido continuo en el que el usuario controla el ritmo. Contenido: [poncho.md](./poncho.md). Fuentes y licencias: [poncho-fuentes.md](./poncho-fuentes.md). Contrato de datos: `packages/core/src/content/poncho.ts` (`PonchoMilestone`, `MilestoneKind`, `SourceRef`, `RightsRef`, `MilestoneImage`, `PonchoProgress`).

Este documento es de diseño: no define código. Lo que dice sobre datos se ajusta a los tipos ya existentes y no agrega campos nuevos.

## 1. Idea

Un recorrido por la vida de Poncho, de 1961 a 1978, en una sola escena continua. La persona avanza a su ritmo con un control de progreso (arrastrar, rueda, teclado) y los hitos aparecen cuando el recorrido llega a ellos. Cada hito abre una ficha corta con una fuente y un rótulo que dice qué tipo de contenido es.

Por qué una escena propia y no el mapa común: la vida de Poncho es una historia lineal en el tiempo (un año a la vez) con varios saltos de lugar (Esperanza, San Martín, Belgrano, Ushuaia), y un mapa con todos los puntos a la vez diluiría la secuencia. La escena propia deja al progreso (`PonchoProgress.progress`, de 0 a 1) como único eje.

## 2. Recorrido continuo

- **Control del ritmo:** el usuario manda. No hay animación automática que avance sola. El progreso se mueve con:
  - arrastrar una barra de progreso (pantalla táctil y mouse);
  - la rueda del mouse o el gesto de deslizar sobre la escena;
  - las teclas: flechas izquierda/derecha para avanzar de a poco, `Re Pág` / `Av Pág` o anterior/siguiente para saltar entre hitos, `Inicio` y `Fin` para ir a los extremos.
- **Posición y hito actual:** `progress` (0..1) y `current` (índice en la lista de hitos), según `PonchoProgress`. El hito actual es el último ya alcanzado.
- **Los hitos aparecen a medida que se avanza:** antes de alcanzar un hito solo se ve su marca en la barra, sin texto. Al llegar, el hito se «enciende» y se abre su ficha breve (título, año, lugar, rótulo). Se puede volver atrás sin perder lo visto.
- **Orden y escala:** los hitos se ordenan por `year` y, dentro del año, por fecha (`date`). La barra no es proporcional al tiempo: los 17 hitos se reparten a igual distancia, para que ninguno quede pegado a otro. La barra muestra el año del hito actual.
- **Saltos de lugar:** cuando el recorrido cambia de lugar (por ejemplo de Belgrano a Ushuaia), la escena hace una transición corta y muestra el nombre del lugar. Con la preferencia «reducir movimiento» la transición es un corte simple.
- **Fin del recorrido:** el último hito es `protocolo-madrid` (contexto). Después se muestra una pantalla de cierre con las fuentes y los créditos.

## 3. Escena

- **Escena propia:** una sola vista, con fondo que cambia con el lugar y la época (base antártica, hielo, mar congelado, barrera de hielos, Ushuaia). El detalle visual queda para la implementación.
- **Poncho en la escena:** una figura de Poncho acompaña el recorrido. Es una **ilustración** (`ImageKind` = `ilustracion`) y se rotula como tal. Nunca se presenta como foto.
- **Ninguna simulación se confunde con un dato:** el paisaje, el trineo y los demás perros de la escena son ilustrativos. Las fotos reales, si se usan, van en la ficha con su crédito (ver sección 6) y no dentro de la escena como si fueran el fondo.
- **Mapa de ubicación (opcional):** una miniatura de la Antártida con el punto del hito actual, usando las coordenadas de `poncho-fuentes.md`. Los hitos sin coordenada verificada (`[Fuente a definir]`) **no muestran punto**; la miniatura no los inventa. Ver sección 5.
- **Sin necesidad de WebGL:** el prototipo se puede construir en 2D. Si más adelante se usa 3D y se pierde el contexto WebGL, se vuelve a una vista 2D accesible sin bloquear la interfaz (regla `05-error-handling-and-logging.md`).

## 4. Ficha «Saber más»

Cada hito tiene una ficha con dos niveles.

**Nivel 1 (siempre visible al llegar al hito):**

- Rótulo del tipo de contenido (sección 5).
- Año o fecha, y lugar.
- Título y resumen (campos `year`/`date`/`endDate`, `place`, `title`, `summary`).
- Foto, si hay (con su pie y crédito).

**Nivel 2 («Saber más», se abre a pedido):**

- El texto de «Saber más» de `poncho.md` (datos extra y aclaraciones).
- **La fuente**, siempre: referencia o URL, quién la publica y la fecha de consulta (`SourceRef`). Si la fuente es `pending`, se muestra «Fuente a definir» en lugar de ocultarla.
- Discrepancias entre fuentes, si las hay (por ejemplo, el mes del salto en paracaídas), explicadas en una frase.
- Un enlace a la fuente, que abre en pestaña nueva y avisa que sale del sitio.

Reglas de la ficha:

- Texto corto y claro, apto para todas las edades, en tono pedagógico. Las palabras difíciles se explican en la misma frase («yunta, es decir, la pareja de perros»).
- No se nombra a ninguna persona: se usan los roles («el oficial», «el suboficial»).
- Nunca se muestra el texto «no publicable» listado en `poncho.md`.
- Las frases de superlativo del libro solo se muestran como cita atribuida.

## 5. Rótulo: hecho, reconstrucción, contexto

Cada hito muestra su rótulo, siempre visible, con **texto y forma** (no solo color), para que lo entiendan quienes no distinguen colores y los lectores de pantalla.

| `MilestoneKind` | Texto visible | Explicación de una línea (al tocar el rótulo) |
| :--- | :--- | :--- |
| `hecho` | **Hecho** | «Ocurrió, y tenemos una fuente que lo dice.» |
| `reconstruccion` | **Reconstrucción** | «Es una escena contada por el autor del libro. No es un registro.» |
| `contexto` | **Contexto** | «Ayuda a entender, pero no es un hecho de la vida de Poncho.» |

Reglas:

- El rótulo no se puede ocultar ni minimizar. Se lee en la ficha de nivel 1 y en el título accesible de la barra de progreso.
- Un hito `reconstruccion` nunca usa un tono de afirmación («Poncho salvó a la patrulla»): usa «Según el libro…». Ver `poncho.md`.
- Las **fotos** se rotulan «Foto» con su año y crédito; las **ilustraciones**, «Ilustración». Una ilustración no se coloca junto a un hito como si lo ilustrara fielmente: lleva el texto «Dibujo ilustrativo».
- Las coordenadas se rotulan aparte: «Posición aproximada (fuente: SCAR)» si están verificadas; sin punto si son `[Fuente a definir]`.

## 6. Simulación marcada en la interfaz

Todo lo que se genera o dibuja para la escena y no proviene de un registro se **marca como simulación**:

- **Poncho, el trineo, los demás perros y el paisaje** de la escena: ilustración, con la etiqueta «Dibujo ilustrativo» fija en una esquina de la escena.
- **Movimiento de Poncho:** la animación de la figura no corresponde a un recorrido real, ni a la distancia ni a la velocidad. La barra de progreso es un recurso de la escena, no un mapa de la ruta real.
- **Recorrido del mapa de ubicación:** si se dibuja una línea entre puntos, se rotula «Ruta ilustrativa: no es el recorrido real». Las fuentes no publican las derrotas de las expediciones.
- **Frases en boca de personajes o pensamientos de Poncho** (que el libro cuenta como relato): no se incluyen. Si algún día se incluyen, van entre comillas, con «Según el libro» y el rótulo `reconstruccion`.
- **Una frase fija al pie de la escena:** «Esta es una historia real contada con dibujos. Cada ficha dice si es un hecho, una reconstrucción o un contexto.»

## 7. Contenido que se debe mostrar siempre

- **Poncho no llegó al Polo Sur.** El hito `operacion-90-patrulla-82` y el hito `polo-sur` lo dicen con esas palabras: la patrulla de perros «Paralelo 82» pasó los 83° S y el Polo (10/12/1965) lo alcanzó el grupo motorizado.
- **El Círculo Polar Antártico** no se menciona con la cifra del libro (error): no se publica ningún valor sin fuente.
- **Licencia pendiente:** hasta que el equipo aporte la evidencia de la autorización del autor (ver `poncho-fuentes.md`, sección 4), el prototipo no muestra textos largos copiados del libro ni fotos del libro. Las fotos entran cuando `rights` pase a `documented` con evidencia.
- **Créditos visibles:** una pantalla de créditos con las fuentes (`[P1]`, `[P2]`, `[V1]`–`[V3]`) y los créditos de las fotos tal cual figuran en el libro, sin apellidos de personas.

## 8. Accesibilidad y teclado

Según `20-web.md` (accesibilidad, navegación por teclado) y el estándar del proyecto:

- **Teclado:** todo el recorrido funciona sin mouse. La barra de progreso es un control con el rol de deslizador (`slider`) con valor, mínimo y máximo (por ejemplo, «Hito 5 de 17, 1963, hecho»). Hay una lista de hitos navegable con `Tab` y activable con `Enter`.
- **Foco visible** siempre; la ficha se abre sin quitar el foco al control que la abrió. `Esc` cierra la ficha.
- **Lectores de pantalla:** cuando aparece un hito, una región `aria-live="polite"` anuncia el título y el rótulo («Reconstrucción: la brújula perdida en la bahía Duse»). Las fotos llevan `alt` (campo `alt` de `MilestoneImage`); las ilustraciones, un `alt` que diga «ilustración».
- **Reducir movimiento:** con `prefers-reduced-motion` no hay transiciones animadas ni parallax; el progreso solo cambia el hito.
- **Contraste y tamaño:** textos legibles en 390 px y 1440 px; objetivos táctiles de al menos 44 px.
- **Alternativa en texto:** la lista completa de hitos con su rótulo y su fuente está disponible como lista de texto, para quien no use la escena.
- **Estados de interfaz:** carga, error al cargar una foto (se muestra el pie y el crédito sin la imagen) y sin contenido, todos con un mensaje claro.
- **Pruebas:** E2E con Playwright a 390 y 1440 px que recorren la barra con el teclado, abren una ficha de cada rótulo y comprueban que cada ficha muestra su fuente. Los errores de consola hacen fallar la prueba.

## 9. Relación con el contrato de datos

| Elemento del diseño | Campo en `poncho.ts` |
| :--- | :--- |
| Hito (título, lugar, resumen) | `PonchoMilestone.title`, `place`, `summary` |
| Orden del recorrido | `PonchoMilestone.year` y `date` |
| Hito con duración (expedición) | `date` y `endDate` |
| Rótulo hecho / reconstrucción / contexto | `PonchoMilestone.kind` (`MilestoneKind`) |
| Fuente en la ficha | `PonchoMilestone.source` (`SourceRef`: `verified` con `ref`, `publisher`, `consultedOn`, o `pending`) |
| Foto o ilustración | `PonchoMilestone.images[]` (`MilestoneImage`) con `kind` (`ImageKind`), `caption`, `credit`, `alt`, `rights`, `source` |
| Derechos de una imagen | `MilestoneImage.rights` (`RightsRef`): `pending` mientras falte la evidencia |
| Posición y hito actual | `PonchoProgress.progress`, `current` |

Observaciones sobre lo que el tipo **no** cubre (para decidir en el issue de código, sin implementarlo acá):

- `PonchoMilestone` no tiene campo para coordenadas. Si se quiere la miniatura de ubicación (sección 3), hay que avisar en el issue antes de ampliar el tipo (regla de archivos compartidos de `AGENTS.md`). Mientras tanto, la miniatura es opcional.
- `PonchoMilestone` no tiene campo para «Saber más» ni para discrepancias. Se pueden anexar al `summary` o ampliar el tipo con aviso en el issue.
- Una discrepancia de fecha (por ejemplo, el mes del salto) se refleja con `date` omitido o con el formato `MM/YYYY`; no se elige un mes sin fuente.

## 10. Fuera de alcance de este documento

- Código, modelos 3D, ilustraciones finales y audio.
- Elegir el motor gráfico de la escena.
- Aprobar la licencia del texto o las fotos (lo hace el equipo con la evidencia).

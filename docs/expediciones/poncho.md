# Expedición #9 — Poncho, el perro polar argentino

Contenido de los hitos de la expedición **«Poncho»** (issue #27, Prototipo B). Cuenta la vida de un perro de trineo del Ejército Argentino en la Antártida, entre 1961 y 1978.

- **Fuentes:** cada afirmación lleva su código `[P#]` o `[V#]`, del [catálogo de fuentes](./poncho-fuentes.md). Fecha de consulta: ver ese catálogo.
- **Reglas del eje 2:** un dato sin fuente no se publica; queda como `[Fuente a definir]`. Una reconstrucción nunca se presenta como dato real: cada hito lleva su rótulo (`hecho`, `reconstruccion`, `contexto`, tipo `MilestoneKind` de `packages/core/src/content/poncho.ts`).
- **Personas:** el libro omite los nombres a propósito. Acá se usan roles («el oficial», «el suboficial»). No se nombra a ninguna persona.
- **Revisión:** este texto fue redactado con asistencia de IA a partir de páginas abiertas por agentes. **Quien revise el PR debe abrir las fuentes** y confirmar que dicen lo que se afirma.
- **Licencia:** pendiente. Ver «Licencias y créditos» en [poncho-fuentes.md](./poncho-fuentes.md).

## Rótulos en la interfaz

| Rótulo (`MilestoneKind`) | Qué significa para el visitante | Cuándo se usa |
| :--- | :--- | :--- |
| **Hecho** | Algo que ocurrió, respaldado por la fuente citada. | El hecho figura en la foja de servicios o cronología del libro `[P1]`, o en una fuente oficial. |
| **Reconstrucción** | Una escena contada en el libro con detalles narrados. Es el relato del autor, no un registro. | El episodio solo aparece en un capítulo narrado y no en la cronología ni en otra fuente. |
| **Contexto** | Información de fondo que ayuda a entender, pero no es un hecho de la vida de Poncho. | Historia de la raza, Polo Sur, Protocolo de Madrid. |

Las fotos reales se rotulan «foto»; cualquier dibujo o modelo 3D se rotula «ilustración» (`ImageKind`). Las coordenadas del mapa se rotulan por separado (ver `poncho-diseno.md`).

---

## Hitos (en orden de recorrido)

Cada hito lleva: `id`, fecha, lugar, título, resumen (texto para el visitante), rótulo, fuente y «Saber más».

### 1. `nacimiento` — Nace Poncho

- **Fecha:** 10/04/1961. **Lugar:** Base Esperanza. **Rótulo:** `hecho`.
- **Resumen:** «Poncho nació el 10 de abril de 1961 en la Base Esperanza, en la Antártida. Sus padres también eran perros de trineo del Ejército. Desde cachorro fue juguetón y curioso.»
- **Fuente:** `[P1]` (cronología y cap. I).
- **Saber más:** el libro describe su aspecto: pelaje blanco cremoso con manchas grises y una «máscara» en la cara `[P1]` (cap. I). Esperanza es una base permanente argentina `[V2]`.

### 2. `raza` — Un perro hecho para la Antártida

- **Fecha:** desde 1951 (aprox.). **Lugar:** bases argentinas. **Rótulo:** `contexto`.
- **Resumen:** «Los perros polares argentinos eran una raza que el Ejército fue formando con cruzas de Malamute, Groenlandés y Husky. Eran fuertes y resistentes, y tiraban de los trineos en las patrullas.»
- **Fuente:** `[P1]` (cap. II), `[P2]` (origen en 1951).
- **Saber más:** el libro dice que la raza estaba «en formación» `[P1]` (cap. II). Hay una diferencia de relato sobre cómo y cuándo empezó (ver «Pendientes y discrepancias» en `poncho-fuentes.md`).

### 3. `instruccion` — Aprende a tirar del trineo

- **Fecha:** 1961. **Lugar:** Base Esperanza. **Rótulo:** `hecho`.
- **Resumen:** «Durante su primer año Poncho aprendió a trabajar en equipo. A los seis meses lo ataron por primera vez a un trineo, en la tercera yunta (la tercera pareja de perros). Aprendió voces de mando: "Auk" para ir a la derecha y "Quierr" para ir a la izquierda.»
- **Fuente:** `[P1]` (cronología; cap. III para los seis meses y las voces de mando).
- **Saber más:** el libro cuenta que su primera instrucción incluyó recorrer una línea de postes «en zigzag» `[P1]` (pie de la foto 1).

### 4. `expedicion-invernal-1962` — La Expedición Terrestre Invernal

- **Fecha:** 14/06/1962 a 10/1962 (fines de octubre). Llegada a San Martín: 25/08/1962. **Lugar:** de Base Esperanza a Base San Martín (bahía Margarita), por la Península Antártica. **Rótulo:** `hecho`.
- **Resumen:** «En pleno invierno de 1962 una expedición del Ejército cruzó la Península Antártica con trineos de perros y tractores. Poncho tenía poco más de un año y comenzó como un perro más de la yunta. Al volver, a fines de octubre, ya era perro-guía: el que va adelante y marca el camino.»
- **Fuente:** `[P1]` (cap. IV y cronología).
- **Saber más:** el libro dice que Esperanza y San Martín están a unos 800 km en línea recta y que el viaje de ida y vuelta pasó los 2.000 km `[P1]` (cap. IV). Las bases son de la Armada: fundación de Esperanza el 17/12/1952 y de San Martín el 21/03/1951; San Martín estuvo desactivada entre febrero de 1960 y marzo de 1976 `[V2]`, lo que concuerda con que el libro la describa «desocupada» en 1962.
- **Nota para el equipo:** el libro dice que se cruzó «el Círculo Polar Antártico (en la latitud 60 grados Sur)» `[P1]`. **Es un error del libro y no se copia**: el Círculo Polar Antártico está cerca de los 66,5° S (los 60° S son el límite del Tratado Antártico). Ver «Pendientes y discrepancias».

### 5. `grietas` — El olfato que encuentra grietas

- **Fecha:** durante la expedición de 1962 y después (sin fecha puntual). **Lugar:** hielo de la Península Antártica. **Rótulo:** `reconstruccion`.
- **Resumen:** «Las grietas ocultas bajo la nieve son uno de los mayores peligros de la Antártida. Según el relato, Poncho iba olfateando el suelo y avisaba al conductor cuando había una. Así los trineos de perros las evitaban.»
- **Fuente:** `[P1]` (cap. V, relato narrado; el propio libro dice «según se dice, las detectaban mediante el olfato» en el cap. I).
- **Saber más:** es la descripción del autor de una conducta típica del perro-guía, no una medición. No hay otra fuente.

### 6. `refugio-san-nicolas` — Materiales para un refugio

- **Fecha:** 1963. **Lugar:** zona de Base Esperanza. **Rótulo:** `hecho`.
- **Resumen:** «Desde 1963 Poncho fue siempre perro-guía. Ese año encabezó el transporte de materiales para construir el refugio San Nicolás.»
- **Fuente:** `[P1]` (cronología).
- **Saber más:** la cronología enumera otras patrullas de 1963 y estima más de 1.500 km recorridos ese año `[P1]`.

### 7. `traslado-belgrano` — Rumbo a Belgrano

- **Fecha:** 12/1964 (diciembre). **Lugar:** de Base Esperanza a Base General Belgrano. **Rótulo:** `hecho`.
- **Resumen:** «A fines de 1964 Poncho fue trasladado a la Base General Belgrano, mucho más al sur, sobre la barrera de hielo. Se preparaba la primera marcha terrestre argentina al Polo Sur.»
- **Fuente:** `[P1]` (cronología y cap. VII).
- **Saber más:** estos traslados se hacían con ayuda del rompehielos `[P1]` (cap. VII).

### 8. `operacion-90-patrulla-82` — La patrulla «Paralelo 82»

- **Fecha:** salida de Belgrano 26/10/1965; el grupo motorizado se separa de la patrulla de perros el 18/11/1965. **Lugar:** desde Base General Belgrano hacia los nunataks Santa Fe. **Rótulo:** `hecho`.
- **Resumen:** «En 1965 el Ejército Argentino organizó la "Operación 90", la primera expedición terrestre argentina al Polo Sur. Poncho no fue hasta el Polo: guió una patrulla de trineos de perros, la "Paralelo 82", que exploró el terreno por delante del grupo motorizado. Hizo tareas de cartografía y geología y llegó más allá de los 83° de latitud Sur.»
- **Fuente:** `[P1]` (cronología y cap. VII). La salida (26/10/1965) y la llegada del grupo motorizado al Polo (10/12/1965) las confirma una fuente oficial `[V1]`.
- **Saber más:** el libro cuenta que fueron «los primeros perros y los primeros hombres en recorrer esa región del planeta en trineo» `[P1]` (cap. VII). Esa frase es del autor y no se verificó en otra fuente: en la interfaz va como cita del libro, no como récord.
- **Coordenadas:** pico Santa Fe, 82°03' S, 41°20' O (aprox.) `[V3]`. El libro no da la posición exacta del límite de los 83° S.

### 9. `polo-sur` — El Polo Sur, alcanzado por el grupo motorizado

- **Fecha:** 10/12/1965 (llegada al Polo); 31/12/1965 (regreso a Belgrano). **Lugar:** Polo Sur geográfico (90° S). **Rótulo:** `contexto`.
- **Resumen:** «El 10 de diciembre de 1965 el grupo de tractores de la Operación 90 llegó al Polo Sur. Fueron 66 días de marcha. Poncho no estuvo allí: su patrulla se había separado antes y siguió explorando.»
- **Fuente:** `[V1]` (fecha, salida, regreso y 66 días); `[P1]` (cap. VII, que además dice casi 3.000 km).
- **Saber más:** la fuente oficial dice que el Ejército Argentino llegó al Polo «el 10 de diciembre de 1965» `[V1]`. No se nombra a los integrantes.

### 10. `barranco` — El barranco frente al pico Santa Fe

- **Fecha:** después del 18/11/1965 (cuando la patrulla de perros ya iba sola; sin día exacto). **Lugar:** frente al pico Santa Fe. **Rótulo:** `reconstruccion`.
- **Resumen:** «Según el libro, el trineo de Poncho desapareció de pronto tras un filo de nieve: había un barranco de unos 200 metros. Los hombres quedaron aferrados a unas rocas mientras Poncho, sentado, comía nieve. Con una orden tranquila, Poncho tiró hacia arriba y sacaron el trineo.»
- **Fuente:** `[P1]` (cap. VII, anécdota narrada; no aparece en la cronología).
- **Saber más:** es una anécdota del autor, contada con detalles de ánimo. No hay otra fuente ni fecha exacta.

### 11. `ae-205` — El rescate del avión AE-205

- **Fecha:** fines de 09/1965 (accidente); 1968 (recuperación de los restos). **Lugar:** al sudeste de Base General Belgrano. **Rótulo:** `hecho`.
- **Resumen:** «A fines de septiembre de 1965 un pequeño avión Cessna, el "AE-205", tuvo que aterrizar de emergencia por una nevada tan blanca que no dejaba ver el horizonte. Los cuatro tripulantes sobrevivieron. Una patrulla de dos hombres y siete perros, con Poncho al frente, salió a buscarlos y los encontró al cuarto día. En 1968 Poncho volvió al lugar para ayudar a recuperar partes del avión.»
- **Fuente:** `[P1]` (cap. VIII; cronología para el rescate y 1968).
- **Saber más:** el libro dice que el avión fue reparado, volvió a volar y hoy está en un museo `[P1]` (cap. VIII; el museo no se nombra y no se verificó). Hasta que se aclare, no se publica qué museo.

### 12. `paracaidas` — Poncho paracaidista

- **Fecha:** enero de 1966 (según el cap. IX); la cronología dice «en verano» `[P1]`. **Lugar:** a unos 30 km al sur de Base General Belgrano. **Rótulo:** `hecho`.
- **Resumen:** «En un ejercicio de rescate, Poncho saltó en paracaídas desde un helicóptero del rompehielos San Martín, junto a otros dos perros y dos oficiales. El salto fue parte del entrenamiento para rescates en el hielo.»
- **Fuente:** `[P1]` (cronología y cap. IX).
- **Saber más:** el libro compara este salto con perros paracaidistas de la Segunda Guerra y de otras épocas `[P1]` (cap. IX). Esas comparaciones no se verificaron y no se publican.
- **Discrepancia de fecha:** ver «Pendientes y discrepancias». Mientras tanto, el hito se muestra como «verano de 1966» sin mes.

### 13. `filchner` — Hacia la barrera de hielos Filchner

- **Fecha:** 1966 (patrulla a la estación Shackleton: febrero según el cap. VI, primavera según la cronología); expedición a la barrera Filchner: noviembre de 1966. **Lugar:** de Base General Belgrano a caleta Jardinero; costa de la barrera de hielos Filchner. **Rótulo:** `hecho`.
- **Resumen:** «En 1966 Poncho participó en una patrulla de reconocimiento y después en la expedición a la barrera de hielos Filchner. Esta vez los perros viajaron como pasajeros sobre trineos arrastrados por tractores. Cuando el terreno se volvía peligroso por las grietas, los bajaban y volvían a trabajar adelante, como guías.»
- **Fuente:** `[P1]` (cap. VI y cronología). Las fotos de 1966 llevan el crédito del libro.
- **Saber más:** el libro dice que en total los hombres de Belgrano recorrieron casi 7.000 km en esa campaña `[P1]` (cap. VI); la cifra no se verificó.
- **Discrepancia de fecha:** ver «Pendientes y discrepancias».
- **Coordenadas:** barrera de hielos Filchner, 79° S, 40° O (punto aproximado de la entidad, no un punto exacto) `[V3]`; cabo Adams 75°02' S, 62°20' O y península Bowman 74°49' S, 62°16' O `[V3]`. Caleta Jardinero: `[Fuente a definir]`.

### 14. `duse` — La brújula perdida en la bahía Duse

- **Fecha:** 08/1967 (agosto). **Lugar:** bahía Duse, regreso a Base Esperanza. **Rótulo:** `reconstruccion`.
- **Resumen:** «Según el libro, en agosto de 1967 una ventisca sorprendió a una patrulla que volvía a Esperanza. La brújula se cayó y se perdió en la nieve. Sin instrumentos y sin ver nada, la patrulla siguió a Poncho, que la llevó hasta las luces de la base.»
- **Fuente:** `[P1]` (cap. X, relato narrado). La cronología solo dice que en 1967 hubo una campaña invernal con paradas en refugios.
- **Saber más:** no hay otra fuente del episodio. La bahía Duse está en el extremo de la Península Antártica, cerca de Esperanza `[V3]`.
- **Coordenadas:** bahía Duse, 63°30' S, 57°20' O `[V3]`.
- **Nota:** otra página del mismo sitio ubica un accidente de trineo en 1956 cerca de la bahía «Dusse» `[P2]`. El libro no lo cuenta así y no se verificó: **no se publica**.

### 15. `ushuaia` — Un retiro en Ushuaia

- **Fecha:** 1973 (traslado); 1976 (accidente); 1977/78 (paseos). **Lugar:** de la Antártida a Ushuaia. **Rótulo:** `hecho`.
- **Resumen:** «En 1973, ya veterano, Poncho dejó la Antártida a bordo del rompehielos San Martín y llegó a Ushuaia. Lo recibió una familia de la ciudad que tenía un hotel llamado "Antártida". En 1976 sufrió un accidente y, aunque un veterinario aconsejó sacrificarlo, la familia se negó. En 1977 y 1978 volvió a tirar de un trineo, esta vez con niños fueguinos, y participó en desfiles.»
- **Fuente:** `[P1]` (cronología y cap. XII).
- **Saber más:** la cronología dice que lo «recibe la familia» de ese hotel `[P1]`. Se omite el apellido a propósito.
- **Coordenadas / lugar:** Ushuaia (ciudad): `[Fuente a definir]` para el punto exacto del hotel (el libro lo llama «desaparecido» `[P1]`; no se verificó).

### 16. `muerte` — El final de Poncho

- **Fecha:** primavera de 1978 (sin día). **Lugar:** Ushuaia. **Rótulo:** `hecho`.
- **Resumen:** «En la primavera de 1978 Poncho murió en Ushuaia, con casi 18 años: una edad muy larga para un perro de trineo. Alguien intentó conservar su cuerpo, pero la taxidermia no prosperó.»
- **Fuente:** `[P1]` (cronología y cap. XII).
- **Saber más:** el libro cuenta que la noticia se publicó en 1979 en un periódico territorial y en un diario de Buenos Aires `[P1]` (cronología). Esas publicaciones no se consultaron.

### 17. `protocolo-madrid` — Los perros dejan la Antártida

- **Fecha:** 1991 (Protocolo de Madrid); retiro entre 1991 y 1994 (ver discrepancia). **Lugar:** bases antárticas argentinas. **Rótulo:** `contexto`.
- **Resumen:** «En 1991 los países del Tratado Antártico firmaron el Protocolo de Madrid, que protege el ambiente de la Antártida. Una de sus normas pide no tener animales no nativos, como los perros. La Argentina retiró sus perros polares base por base, y esa raza ya no existe en la Antártida.»
- **Fuente:** `[P1]` («Palabras finales»); `[P2]` (retiro 1991–1993). La fecha límite exacta del Protocolo: `[Fuente a definir]` (ver «Pendientes»).
- **Saber más:** el libro cuenta que los perros fueron a destacamentos de Gendarmería (Mendoza, Neuquén, Ushuaia) y que muchos murieron poco después `[P1]`. Una página del mismo sitio ubica los últimos 13 perros de Esperanza en febrero de 1993 `[P2]`.

---

## Resumen de rótulos

| Hito | Rótulo |
| :--- | :--- |
| `nacimiento` | hecho |
| `raza` | contexto |
| `instruccion` | hecho |
| `expedicion-invernal-1962` | hecho |
| `grietas` | reconstruccion |
| `refugio-san-nicolas` | hecho |
| `traslado-belgrano` | hecho |
| `operacion-90-patrulla-82` | hecho |
| `polo-sur` | contexto |
| `barranco` | reconstruccion |
| `ae-205` | hecho |
| `paracaidas` | hecho |
| `filchner` | hecho |
| `duse` | reconstruccion |
| `ushuaia` | hecho |
| `muerte` | hecho |
| `protocolo-madrid` | contexto |

## Texto no publicable (no pasar a la interfaz)

- Los nombres de personas (el libro los omite a propósito).
- «Círculo Polar Antártico a 60° S» (error del libro).
- El accidente de 1956 en bahía «Dusse» `[P2]`, sin verificar.
- Las comparaciones con perros paracaidistas de la Segunda Guerra y los demás datos de relleno del cap. IX.
- Frases de superlativo («el mejor», «el más recordado») salvo como cita atribuida al libro.

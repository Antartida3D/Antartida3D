# Catálogo de fuentes — Expedición #9: Poncho

Fuentes citadas en [poncho.md](./poncho.md), conforme a las reglas del eje 2 de `AGENTS.md`: referencia o URL, organismo o autor que la publica y fecha de consulta (formato DD/MM/YYYY).

- **Estado (issue #145):** el recorrido tiene 10 paradas en cuatro actos, con ganchos y diario de ruta. Cada dato del libro lleva su página del PDF (`pages`) y la cita abre esa página. Lo que sigue se actualizó con el contenido real; las páginas de la sección 2 se volvieron a verificar contra el PDF (`pdftotext` por página) el 15/11/2026. Los **ganchos** y el texto de unión no afirman nada y no llevan fuente.
- **Fechas de consulta:**
  - `11/11/2026`: consulta inicial del equipo de `[P1]` y `[P2]`.
  - `12/11/2026`: segunda lectura de `[P1]` y `[P2]` y verificación contra fuentes oficiales `[V1]`–`[V3]` (agente de IA, issue #27).
- **Cómo se verificó:** el agente descargó el PDF de `[P1]` y lo leyó en texto completo (cronología y capítulos I a XII); abrió `[P2]`, `[V1]` y `[V2]`; y consultó el gazetteer de SCAR (`[V3]`) por su API pública. Cada dato de `poncho.md` se contrastó con ese texto. Esto **no reemplaza la revisión humana**: quien revise el PR debe abrir cada fuente y confirmar que dice lo que el contenido afirma.
- **Prioridad:** fuentes primarias (organismos oficiales, gazetteer científico) para fechas de hitos y lugares; el libro y el artículo de la Fundación Marambio son fuentes secundarias y son la única fuente de la vida de Poncho.
- **Sin nombres propios:** el libro omite los nombres de las personas a propósito y este catálogo tampoco los usa (salvo el autor del libro y el de la nota, que son autores de las fuentes, y el crédito fotográfico del libro).

## 1. Catálogo de fuentes

| Código | Tipo | Autor / organismo | Documento | URL o referencia | Consulta |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **[P1]** | secundaria (libro) | Emilio Urruty (periodista y escritor, Ushuaia). Edición de la Comisión Organizadora del Año Polar Internacional Tierra del Fuego (decreto provincial 1304/06). Transcripción: Fundación Marambio | *Poncho. La legendaria vida de un perro polar argentino*, diciembre de 2009. Cita la foja de servicios y testimonios | Página: https://www.marambio.aq/poncho.html. Texto completo: https://www.marambio.aq/pdf/poncho.pdf (25 págs.) | 11/11/2026 y 12/11/2026 |
| **[P2]** | secundaria (artículo) | Mayor (EA) EDB Carlos Alberto Montenegro; publicado por la Fundación Marambio (campo «FUENTE» de la página) | «El perro polar argentino» | https://www.marambio.aq/perropolar.html | 11/11/2026 y 12/11/2026 |
| **[V1]** | primaria (organismo oficial) | Cancillería — Dirección Nacional del Antártico | Línea histórica 1957-1990 (entrada «Operación 90: expedición terrestre al Polo Sur (10 de diciembre de 1965)») | https://cancilleria.gob.ar/es/iniciativas/dna/historia-y-patrimonio/linea-historica/1957-1990 | 12/11/2026 |
| **[V2]** | primaria (organismo oficial) | Armada Argentina | Bases antárticas permanentes (coordenadas y fechas de fundación de Esperanza, San Martín y Belgrano II) | https://www.argentina.gob.ar/armada/antartida/bases-permanentes | 12/11/2026 |
| **[V3]** | primaria (gazetteer científico) | SCAR (Scientific Committee on Antarctic Research) — Composite Gazetteer of Antarctica, servido por el Australian Antarctic Data Centre | Entradas con topónimo y coordenadas (ver sección 3). Los puntos marcados `ARG` son los aportados por Argentina | Buscador: https://placenames.aq/. API consultada: https://placenames.aq/api/place_names | 12/11/2026 |

Una fuente que dice lo que el contenido afirma **no es lo mismo** que una fuente que lo prueba: `[P1]` es un libro divulgativo, no un documento del Ejército. El libro cita la foja de servicios, pero no la reproduce; no se pudo abrir la foja.

## 2. Dato → fuente

Las páginas son las del PDF de `[P1]` (25 págs.). Los códigos de la interfaz son `P1` (libro), `P2`, `P3` (SCAR, equivale a `[V3]`), `O2` (equivale a `[V2]`) y `O12` (equivale a `[V1]`).

| Dato (parada o línea del diario) | Fuente | Estado |
| :--- | :--- | :--- |
| `nacimiento`: nace el 10/04/1961 en Esperanza; abrigos naranjas; cachorro más juguetón; instrucción con arneses, trineos y voces de mando | `[P1]` p. 5 (cronología en p. 4) | Solo libro |
| `nacimiento`: padres Coca y Flecha; raza creada por el Ejército; seis meses en las yuntas; cincha, «Auk», «Quierr», slalom | `[P1]` p. 4, 6, 8, 9 | Solo libro |
| Raza activa hacia 1951; Esperanza fundada el 17/12/1952 | `[P2]` p. 7 (libro); `[V2]` | Esperanza verificada en `[V2]` |
| `expedicion-invernal-1962`: olfateo, zigzag, bastones y piquetas, grieta | `[P1]` p. 12 (también p. 6, 9) | Solo libro. Relato narrado |
| `poncho-perro-guia`: puesto Número 1 en el regreso desde San Martín, un año y medio, costumbre de mirar al conductor; llegada a San Martín el 25/08/1962 | `[P1]` p. 12 y 10 | Solo libro. San Martín (fundación y desactivación): `[V2]` |
| `rumbo-a-belgrano`: 12/1964, rompehielos, otros perros, preparativos de la marcha al Polo | `[P1]` p. 14 | Solo libro |
| `rescate-ae-205`: avión caído, patrulla de dos hombres y siete perros, cuarto día; Cessna 185B; 1968 | `[P1]` p. 17 y 18 | Solo libro |
| `patrulla-paralelo-82`: líder de la patrulla, separación del 18/11/1965, montañas Santa Fe, más allá de los 83° S | `[P1]` p. 15 | Solo libro |
| `patrulla-paralelo-82`: salida del 26/10/1965; Polo el 10/12/1965 en 66 días; Poncho no llegó | `[V1]`; `[P1]` p. 17 | Verificado en `[V1]` |
| `patrulla-paralelo-82`: barranco de unos 200 m frente al pico Santa Fe | `[P1]` p. 16 | Solo libro. Relato narrado |
| `paracaidas`: salto, descenso, aterrizaje y rescate de una patrulla perdida | `[P1]` p. 19; Pato, Bucky, arnés, S-55: p. 18 | Solo libro. Discrepancia de mes (sección 5.2) |
| `brujula-perdida`: ventisca, doce kilómetros, brújula hundida, dos horas a ciegas, luces de la base | `[P1]` p. 20 (p. 19 para la bahía Duse) | Solo libro. Relato narrado |
| `adios-a-la-antartida`: «No trabajó», excepción por su prestigio, rompehielos a Ushuaia; traslado de 1973 | `[P1]` p. 21 y 5 | Solo libro |
| `ushuaia`: años plácidos, casi 18 años, mañana de primavera de 1978; accidente de 1976; taxidermia | `[P1]` p. 22 (p. 21 y 5 para el resto) | Solo libro |
| Diario de ruta: once perros, 30–45 kg, 40–50 km en más de seis horas, canto, perros que anticipan tormentas, 40 km/h | `[P1]` p. 12 | Solo libro |
| Diario de ruta: perros bajo uno o dos metros de nieve, autonomía de 20 días, pemmican | `[P1]` p. 10 | Solo libro |
| Diario de ruta: perros elegidos por su servicio en 1962 | `[P1]` p. 14 | Solo libro |
| Diario de ruta: carne de foca y pelaje | `[P1]` p. 25 (pie de la foto de tapa) | Solo libro |
| Coordenadas (Esperanza, San Martín, nunataks Foca, bahía Duse, pico Santa Fe) | `[V2]` y `[V3]` (ver sección 3) | Verificado. Belgrano I y varios otros: `[Fuente a definir]` |

El recorrido dibujado sobre el mapa es una ilustración (aviso único del recorrido): las posiciones de las paradas son aproximadas y no un derrotero real.

## 3. Coordenadas de los hitos

Las coordenadas salen del gazetteer de SCAR `[V3]` o de la Armada `[V2]`. Formato `[lon, lat]` (WGS84, grados decimales), el mismo orden que usa el resto del proyecto. Consulta: 12/11/2026.

| Lugar (hito) | `[lon, lat]` | Fuente exacta | Estado |
| :--- | :--- | :--- | :--- |
| Base Esperanza (`nacimiento`, `brujula-perdida`) | `[-57.00, -63.40]` | `[V2]`: 63°24' S 57°00' O. `[V3]`, entrada «Esperanza Station» (registro COMNAP): `[-56.996111, -63.394722]` | Verificado |
| Base San Martín (`expedicion-invernal-1962`) | `[-67.10, -68.13]` | `[V2]`: 68°08' S 67°07' O. `[V3]`, «San Martín Station»: `[-67.103333, -68.129444]` | Verificado |
| Bahía Margarita (`expedicion-invernal-1962`) | `[-68.0, -68.5]` | `[V3]`, «Margarita, bahía» (gazetteer ARG) | Verificado |
| Bahía Duse (`brujula-perdida`) | `[-57.333333, -63.5]` | `[V3]`, «Duse, bahía» (gazetteer ARG). Otros gazetteers difieren hasta unos 0,1° en latitud (por ejemplo `[-57.25, -63.566667]`) | Verificado, aproximado |
| Pico Santa Fe (`patrulla-paralelo-82`) | `[-41.333333, -82.05]` | `[V3]`, «Santa Fe, pico» (gazetteer ARG) | Verificado (el libro habla de «nunataks Santa Fe», un cordón; el gazetteer ubica el pico) |
| Cordillera Diamante (contexto de la patrulla) | `[-48.5, -82.666667]` | `[V3]`, «Diamante, cordillera» (gazetteer ARG) | Verificado |
| Barrera de hielos Filchner (ya no es una parada) | `[-40, -79]` | `[V3]`, «Filchner, barrera de hielos» (gazetteer ARG). Es un punto central de una entidad muy grande | Verificado, muy aproximado |
| Cabo Adams (ya no es una parada) | `[-62.333333, -75.033333]` | `[V3]`, «Adams, cabo» (gazetteer ARG) | Verificado |
| Península Bowman (ya no es una parada) | `[-62.266667, -74.816667]` | `[V3]`, «Bowman, península» (gazetteer ARG) | Verificado |
| Nunataks Foca (Base Teniente Matienzo, contexto de 1962) | `[-60.25, -65.066667]` | `[V3]`, «Foca, nunataks» (gazetteer ARG) | Verificado; la base Matienzo no figura con coordenada argentina propia en lo consultado |
| Base General Belgrano (Belgrano I) (`rumbo-a-belgrano`, `rescate-ae-205`, `paracaidas`) | `[Fuente a definir]` | Ver sección 5: los registros de `[V3]` se contradicen | Pendiente |
| Polo Sur (ya no es una parada) | `[0, -90]` | Definición geográfica (90° S); no es un dato de gazetteer | No requiere fuente |
| Sitio del accidente del AE-205 (`rescate-ae-205`) | `[Fuente a definir]` | El libro dice «al sudeste de la Base General Belgrano» sin coordenada | Pendiente |
| Caleta Jardinero (ya no es una parada) | `[Fuente a definir]` | No se encontró en `[V3]` | Pendiente |
| Caleta Carretera (`expedicion-invernal-1962`) | `[Fuente a definir]` | No se encontró en `[V3]` | Pendiente |
| Refugio Cristo Redentor (`brujula-perdida`) | `[Fuente a definir]` | `[V3]` solo lo trae en el gazetteer ruso: `[-57.366667, -63.55]`. No se toma como dato argentino | Pendiente |
| Ushuaia, hotel «Antártida» (`ushuaia`) | `[Fuente a definir]` | Ushuaia está fuera de lo consultado (gazetteer antártico); el hotel está «desaparecido» según `[P1]` | Pendiente |

**Licencia del gazetteer `[V3]`:** no se verificó. Antes de copiar coordenadas a archivos del repo, `[Fuente a definir]` (condiciones de uso de SCAR/AADC). Una coordenada es un dato; aun así, se anota para que lo confirme quien revise.

## 4. Licencias y créditos

### 4.1. Texto del libro y del artículo

| Recurso | Licencia declarada en la página | Autorización | Estado |
| :--- | :--- | :--- | :--- |
| Texto de `[P1]` (Urruty / Comisión Organizadora del Año Polar Internacional Tierra del Fuego; transcripción en el sitio de la Fundación Marambio) | **Ninguna.** Ni la página ni el PDF declaran licencia, derechos ni copyright (se buscó «derechos», «copyright», «©», «ISBN»: no hay) | Autorización del autor: **evidencia pendiente de aportar por el equipo** | **Pendiente.** No se puede afirmar que esté documentada |
| Texto de `[P2]` (Mayor Montenegro, publicado por la Fundación Marambio) | **Ninguna.** La página solo muestra el crédito «FUENTE» | Sin dato | **Pendiente** |

Qué hace el contenido mientras tanto:

- Los textos de `poncho.md` están **escritos con palabras propias** a partir de los hechos; no copian párrafos del libro. Los hechos no tienen autor, pero la redacción del libro sí.
- Se citan frases literales solo si son breves y entre comillas (por ejemplo, «los primeros perros y los primeros hombres…»), con atribución al libro.
- En el tipo `RightsRef` del código, el texto debe quedar `{ status: 'pending' }` hasta que el equipo aporte la evidencia. Cuando la haya, se podrá pasar a `{ status: 'documented', terms: ..., grantedBy: ... }` con la prueba (carta, correo, mensaje) guardada y enlazada.

### 4.2. Fotos y créditos (tal cual figuran en el libro `[P1]`)

El libro lista las fotos con su pie y su crédito. La transcripción en PDF contiene los pies pero solo una imagen incrustada (en escala de grises); **no se verificó que las fotos estén en el sitio**. El archivo de cada foto: `[Fuente a definir]`.

| Foto | Pie (resumen) | Crédito en el libro | Tipo (`ImageKind`) | Año | Derechos |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Tapa | Volviendo del mar de Weddell, cerca de la Base Belgrano, con carne fresca de foca para los perros | «Gentileza: Oscar Sosa» | `foto` | 12/1966 | Pendiente |
| 1 | Cachorros de perro polar en una base argentina de los años 60 | «Foto de archivo, Ejército Argentino» | `foto` | década de 1960 (sin año exacto) | Pendiente |
| 2 | Sobre el mar congelado, en la bahía Duse (1963) | «Gentileza: Oscar Sosa» | `foto` | 1963 | Pendiente |
| 3 | Poncho en un campamento de la zona de caleta Jardinero (1966) | «Gentileza: Oscar Sosa» | `foto` | 1966 | Pendiente |
| 4 | Poncho en caleta Jardinero, con un tractor Sno-cat 743-A detrás (1966) | «Gentileza: Oscar Sosa» | `foto` | 1966 | Pendiente |
| 5 | Remolque-jaula que transporta a la jauría durante el cruce de la barrera Filchner (1966) | «Gentileza: Oscar Sosa» | `foto` | 1966 | Pendiente |
| 6 | Poncho en el jardín del hotel «Antártida», en Ushuaia, mediados de los años 70 | «Gentileza: [familia de Ushuaia, nombrada en el libro]» | `foto` | mediados de la década de 1970 | Pendiente |

Notas:

- **Oscar Sosa:** su nombre se conserva solo como crédito fotográfico, tal como lo escribe el libro. Los agradecimientos del libro dicen que las fotografías las «ofreció para esta publicación» `[P1]`. **Eso no es una licencia ni una autorización para reutilizarlas en otra obra** y no se afirma como tal.
- **Foto 6:** el libro nombra a la familia; en nuestro material el crédito se escribe «Gentileza: una familia de Ushuaia». **El apellido no se publica.** El crédito completo está en el libro y, si hace falta, se le consulta a quien aporte la autorización.
- **Foto 1 (Ejército Argentino):** no se sabe qué licencia o régimen tiene. Pendiente.
- **Fotos de 1966 y de 1963:** el libro las ubica por año, pero no dice el día. No se infiere.
- **Ninguna imagen se genera con IA ni se presenta como foto sin serlo.** Si se usa una ilustración o un modelo 3D, se rotula «ilustración».

### 4.3. Fuentes oficiales y gazetteer

| Recurso | Licencia | Estado |
| :--- | :--- | :--- |
| `[V1]`, `[V2]` (páginas de organismos oficiales argentinos) | No se verificó una licencia explícita. Solo se toman fechas y coordenadas, citando la fuente | Pendiente de revisar |
| `[V3]` (SCAR / AADC) | No se verificó | Pendiente de revisar |

## 5. Pendientes y discrepancias

Las paradas de Filchner, el Polo Sur, el Protocolo de Madrid y la raza ya no están en el recorrido (quedaron como datos de «Saber más» o se quitaron); sus discrepancias se conservan abajo como registro.

Cada punto indica qué se sabe, qué no y cómo queda en la interfaz. **No se resolvió ninguna discrepancia por intuición.**

### 5.1. Licencia y autorización (bloquea la publicación de textos largos y de las fotos)

- **Autorización del autor — evidencia pendiente de aportar por el equipo.** El equipo informa que el autor dio permiso; no hay evidencia a la vista. Ninguna página fuente declara licencia. Sin evidencia, `rights` queda `pending` en todas las fotos y hay que mantener los textos con palabras propias.
- **Fotos:** autorización de las personas y de la institución que figuran en los créditos (sección 4.2): pendiente.
- **Condiciones de uso del gazetteer de SCAR:** sin verificar.

### 5.2. Discrepancias entre fuentes

| Tema | Qué dice cada fuente | Cómo queda |
| :--- | :--- | :--- |
| **Fecha del salto en paracaídas** | Cronología de `[P1]`: «en verano» de 1966. Cap. IX de `[P1]`: «un luminoso día de enero de 1966» | En la interfaz: «verano de 1966». El mes (enero) se muestra solo si el equipo confirma en la foja de servicios |
| **Fecha de la patrulla a Shackleton (1966)** | Cap. VI: febrero de 1966. Cronología: primavera de 1966 | Se muestra solo «1966». La patrulla a la barrera Filchner (noviembre de 1966) no tiene conflicto |
| **Año/fecha del retiro de los perros** | `[P1]`: el acuerdo ordenaba retirarlos «antes de abril de 1994» y «hacia el otoño del ’94 ya no quedaban». `[P2]`: retiro «1991–1993»; los últimos 13 perros salieron de Esperanza en febrero de 1993 | **Pueden no contradecirse** (Esperanza no tiene por qué ser la última base), pero no se pudo confirmar. En la interfaz: «entre 1991 y 1994» |
| **Fecha límite del Protocolo de Madrid** | `[P1]` dice «antes de abril de 1994». Se buscó el texto del Anexo II en fuentes secundarias (la Universidad de Oregón y notas periodísticas lo citan como «1 de abril de 1994») pero **no se pudo abrir el texto oficial** de la Secretaría del Tratado Antártico | `[Fuente a definir]` para la fecha exacta. No se publica el día |
| **Círculo Polar Antártico** | `[P1]` (cap. IV) lo ubica en «la latitud 60 grados Sur». Es un error: el Círculo Polar Antártico está cerca de los 66,5° S; los 60° S son el límite del Tratado Antártico | **No se copia.** No hay fuente oficial abierta en esta sesión para el 66,5° S: la cifra de este renglón es conocimiento general y queda como `[Fuente a definir]` si se llegara a publicar |
| **Accidente de 1956 en bahía «Dusse»** | `[P2]`: el 1 de octubre de 1956 un trineo de Esperanza cayó a una grieta cerca de la bahía «Dusse» y se perdieron tres perros. `[P1]` no lo menciona: no hay «1956» en todo el texto del libro | **No verificado. No se publica** |
| **Belgrano I: coordenadas** | `[V3]` trae «General Belgrano /Arg./» (gazetteer ruso) en `[-38.066667, -77.716667]` y «Belgrano Station (historical)» (registro USA/COMNAP) en `[-34.626944, -77.88]`, que está casi sobre Belgrano II. El registro COMNAP dice que la estación original abrió en 1955 `[V3]`; `[V2]` solo cita Belgrano II (77°52' S 34°37' O) y dice que Belgrano I se deterioró «por efecto de la presión» del hielo | `[Fuente a definir]`. Los dos registros no coinciden, y el segundo parece copiar la posición de Belgrano II |
| **Fundación de Esperanza** | `[V2]`: 17/12/1952. El registro COMNAP en `[V3]` dice «opened in 1952» | Concuerdan |
| **Frases del libro sin respaldo** | «Los primeros perros y los primeros hombres en recorrer esa región en trineo» (cap. VII); «casi 7.000 km en 1966» (cap. VI); «más de 1.000, 1.500, 500 km» por año (cronología) | Solo con atribución al libro; no como récord ni como dato verificado |

### 5.3. Datos solo en el libro (sin fuente primaria localizada)

- Toda la vida de Poncho (nacimiento, expediciones, AE-205, paracaídas, Filchner, bahía Duse, Ushuaia, muerte): la única fuente es `[P1]`, que dice apoyarse en la foja de servicios del Ejército y en testimonios. **La foja de servicios no está disponible.** `[Fuente a definir]` para el documento del Ejército que la respalde.
- La «Expedición Terrestre Invernal Antártica de 1962» y la patrulla «Paralelo 82» no figuran en `[V1]`. Se buscaron en la línea histórica de la Cancillería y no aparecen.
- El accidente del AE-205: no se encontró en las fuentes oficiales abiertas. Se anota solo como relato del libro.
- Los museos, la ubicación actual del Cessna y el destino de los restos de Poncho: sin verificar; no se publican.

### 5.4. Qué se pudo confirmar contra fuentes primarias y qué no

| Confirmado en fuente primaria | No confirmado |
| :--- | :--- |
| Operación 90: salida 26/10/1965, Polo 10/12/1965, regreso 31/12/1965, 66 días `[V1]` | Que Poncho estuvo en la patrulla «Paralelo 82» (solo `[P1]`) |
| Fundación de Esperanza (17/12/1952) y San Martín (21/03/1951); coordenadas; San Martín inactiva 02/1960–03/1976 `[V2]` | Fechas exactas de las expediciones de 1962, 1963, 1966 y 1967 (solo `[P1]`) |
| Coordenadas de bahía Margarita, bahía Duse, pico Santa Fe, barrera Filchner, cabo Adams y península Bowman `[V3]` | Coordenadas de Belgrano I, caleta Jardinero, caleta Carretera y el sitio del AE-205 |
| | Fecha límite del retiro de los perros en el texto del Protocolo de Madrid |
| | Licencia de todo el contenido y de las fotos |

### 5.5. Seguimiento

- Quien revise el PR debe abrir `[P1]`, `[P2]`, `[V1]`, `[V2]` y `[V3]` y confirmar lo que figura arriba.
- Cuando el equipo aporte la evidencia de la autorización del autor, anotar dónde se guarda y actualizar las tablas 4.1 y 4.2.
- Antes de la entrega, resolver las fechas con discrepancia o mostrarlas con el nivel de detalle que se indica en la sección 5.2.

### 4.3. Fotos de la página de la Fundación Marambio (15 nov 2026)

Dos imágenes tomadas de las páginas de `[P1]` se muestran en dos paradas (`packages/core/src/content/poncho-photos.ts`). Ninguna trae pie, autor ni fecha en la página, y no se inventó ninguno. Derechos: **pendientes** (se mantiene visible en la tarjeta).

| Archivo | Origen | Parada |
|---|---|---|
| `poncho-pagina.jpg` | `https://www.marambio.aq/images/poncho1.jpg` (página «Poncho») | «Poncho va al frente» |
| `perros-trineo.jpg` | `https://www.marambio.aq/galeria/fauna/perros/PERROS04.jpg` (página «El perro polar»); es ilustrativa, no de esa patrulla | «La patrulla Paralelo 82» |

Consultadas el 2026-11-15. No se usó el retrato del autor que también está en la página.

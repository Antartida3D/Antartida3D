# Fuentes y contenido verificado: puntos «Próximamente» y «Ampliación prevista»

Registro de las descripciones y fuentes de los puntos sin expedición del mapa (`tier: 'C'` y `tier: 'B'`). El texto que muestra la app está en [`packages/core/src/content/point-details.ts`](../packages/core/src/content/point-details.ts); este documento guarda, para cada oración, la cita textual que la sostiene.

- **Fecha de consulta:** 13 nov 2026 (issue #58). Reemplaza el borrador del 12 nov 2026 (#71).
- **Cómo se verificó:** cada fuente se abrió y se buscó la cita literal en el texto de la página o del PDF. Una oración sin cita encontrada se quitó.
- **Revisión humana:** quien revise el PR abre las fuentes y confirma que dicen lo que afirma la ficha (regla del eje 2 en `AGENTS.md`).
- **Investigación con IA:** las fuentes las buscaron agentes de IA (Gemini 4 Hydrogen, en Antigravity). Claude comprobó cada cita contra la página y redactó los textos finales.

## Correcciones respecto del borrador del 12 nov

Estas frases del borrador no figuraban en las fuentes citadas y se quitaron o se reescribieron:

| Punto | Borrador | Corrección |
|---|---|---|
| `vostok` | «casi 4.000 m de hielo»; calor geotérmico y analogía con Europa sin fuente | 3.700 a 4.200 m (PMC3960894); calor y presión (PMC4685968, NSF); Europa (NASA) |
| `thwaites` | «el flujo se duplicó por el ingreso de agua cálida» | Son dos hechos separados (NASA): el hielo que fluye se duplicó; el agua cálida derrite desde abajo |
| `polo` | fecha sin fuente; «Jorge Edgar» y «Jorge Edgardo» | Fecha del Decreto 181/2006; nombre según el decreto y Cancillería (la Ley 19.659 dice «Jorge Edgardo») |
| `oceano` | krill, algas y circulación sin fuente | AAD (krill y algas) y SCAR (Agua de Fondo Antártica) |
| `emperador` | «más de dos meses sin alimentarse» | 4 meses de ayuno del macho (AAD) |
| `fosiles` | bosques templados sin fuente; PDF de CONICET Digital sin texto extraíble | Maderas del Eoceno (CONICET Bicyt) y IUGS |

Las páginas de BAS (`bas.ac.uk`) responden con un desafío anti-robots (HTTP 202 sin contenido). No se pudieron leer y no se usan.

---

## `polo` — El Polo Sur

> En el Polo Sur geográfico (90° S), sobre el hielo a unos 2.835 m de altura, funciona desde 1956 la Estación Amundsen-Scott, con estudios de astronomía, meteorología y glaciología, entre otros. Su edificio elevado se puede levantar para no quedar enterrado por la nieve, y allí funciona IceCube, un enorme detector de neutrinos dentro del hielo. El 10 de diciembre de 1965 llegó al Polo la Operación 90, la primera expedición terrestre argentina, comandada por Jorge Edgar Leal.

| Oración | Fuente | Cita |
|---|---|---|
| 1 | [NSF · Amundsen-Scott South Pole Station](https://www.nsf.gov/od/opp/ail/amundson-scott-south-pole-station) | "Sits atop the Antarctic ice sheet at an elevation of approximately 2,835 meters" / "Opened in 1956 as part of Operation Deep Freeze" / "The station supports scientific studies in astronomy, astrophysics, aeronomy, [...] meteorology, [...] and glaciology." |
| 2 | [NSF · Science on the Ice (PDF)](https://nsf-gov-resources.nsf.gov/files/NSF-Science-on-the-Ice-fifth-edition.pdf) | "The new station was constructed using a modular design that can be raised to prevent burial in drifting snow." |
| 2 | [NSF · Amundsen-Scott South Pole Station](https://www.nsf.gov/od/opp/ail/amundson-scott-south-pole-station) | "a massive in-ice neutrino detector, the IceCube South Pole Neutrino Observatory" |
| 3 | [Decreto 181/2006 · InfoLEG](https://www.argentina.gob.ar/normativa/nacional/norma-114203/actualizacion) | "la primera expedición terrestre argentina que alcanzó el Polo Sur, el 10 de diciembre de 1965" / "D. Jorge Edgar LEAL" |
| 3 | [Cancillería · Base Belgrano II](https://cancilleria.gob.ar/es/iniciativas/dna/antartida-argentina/bases/belgrano-ii) | "la Operación 90 del Ejército Argentino, la Primera Expedición Terrestre Argentina que alcanzó el Polo Sur Geográfico ese mismo año, comandada por el entonces Coronel Jorge Edgar Leal" |

## `testigos` — Testigos de hielo

> Cuando la nieve se compacta y se vuelve hielo, el aire que quedaba entre los cristales queda encerrado en burbujas: son muestras de la atmósfera de otras épocas. En el Domo C, el proyecto europeo EPICA perforó hasta 3.260 m y obtuvo un registro de unos 800.000 años. En 2025, Beyond EPICA llegó a la roca a 2.800 m en Little Dome C, con hielo que guarda un registro continuo del clima de hasta 1,2 millones de años.

| Oración | Fuente | Cita |
|---|---|---|
| 1 | [NASA Earth Observatory · Paleoclimatology: The Ice Core Record](https://science.nasa.gov/earth/earth-observatory/paleoclimatology-the-ice-core-record/) | "the space between the crystals is eventually sealed off, trapping a small sample of the atmosphere in newly formed ice." |
| 1 | [NSF · Science on the Ice (PDF)](https://nsf-gov-resources.nsf.gov/files/NSF-Science-on-the-Ice-fifth-edition.pdf) | "The air within this ice is sealed into bubbles" |
| 2 | [AWI · Two EPICA ice cores revealing 800,000 years of climate history](https://epic.awi.de/id/eprint/18400/) | "The first core from Dome C reached a depth of 3260 m covering a time period of about 800,000 years." |
| 3 | [Beyond EPICA · comunicado 2025 (PDF)](https://www.beyondepica.eu/fileadmin/user_upload/www.beyondepica.eu/user_upload/Beyond_EPICA_upload/Clara/New_Events/Press_Release/PR_Antarctica_Beyond_Epica_bedrock_4th_drilling_campaign_2025.pdf) | "reaching the depth of 2,800 meters—where the Antarctic ice sheet meets the bedrock." / "showing a continuous record of the history of our climate as far back as 1.2 million years" |

## `vostok` — Un lago bajo el hielo

> El Lago Vostok es el mayor lago bajo el hielo de la Antártida: cubre 15.690 km², tiene hasta 510 m de profundidad y está debajo de 3.700 a 4.200 m de hielo. Sigue líquido porque el hielo aísla del frío el calor que llega desde la roca, y la presión baja el punto de fusión del agua. Podría guardar ecosistemas aislados durante millones de años, y su estudio ayuda a pensar si hay vida bajo el hielo de Europa, una luna de Júpiter.

| Oración | Fuente | Cita |
|---|---|---|
| 1 | [PMC3960894 · Ecology of Subglacial Lake Vostok](https://pmc.ncbi.nlm.nih.gov/articles/PMC3960894/) | "the largest of which is Lake Vostok" / "covers an area (15,690 km2)" / "maximum depth = 510 m" / "It lies beneath 3,700 to 4,200 m of ice" |
| 2 | [PMC4685968 · Recent advances in understanding Antarctic subglacial lakes](https://pmc.ncbi.nlm.nih.gov/articles/PMC4685968/) | "Subglacial lakes exist because ice is a particularly good thermal insulator. With only background levels of geothermal heating, if the ice is sufficiently thick, the temperature at the bed can reach the pressure melting value." |
| 2 | [NSF · Science on the Ice (PDF)](https://nsf-gov-resources.nsf.gov/files/NSF-Science-on-the-Ice-fifth-edition.pdf) | "geothermal heating balances the heat loss to the ice surface and vertical pressure causes the melting point of water to be below 32° F." |
| 3 | [NASA Earth Observatory · Newly Discovered Antarctic Lakes](https://science.nasa.gov/earth/earth-observatory/newly-discovered-antarctic-lakes-6258/) | "may contain unique ecosystems isolated from the outside world for tens of millions of years" / "life could exist in an ice-covered ocean that some scientists believe exists on Jupiter's moon Europa." |

## `erebus` — Volcán en el hielo

> Con 3.794 m de altura en la Isla de Ross, el Monte Erebus es el volcán activo más austral del planeta. Sus laderas están cubiertas de glaciares, pero en su cráter hay un lago de lava activo desde por lo menos 1972, que cada tanto lanza bombas de lava sobre el borde. De su cumbre salen con regularidad columnas de gas y vapor. El vapor de sus fumarolas abre cuevas bajo el hielo y, al congelarse, forma chimeneas huecas de hielo de hasta 10 m.

| Oración | Fuente | Cita |
|---|---|---|
| 1 | [NASA Earth Observatory · Erebus Breaks Through](https://science.nasa.gov/earth/earth-observatory/erebus-breaks-through-152134/) | "Mount Erebus, the world's southernmost active volcano" / "one of several volcanoes forming Ross Island" / "At 3,794 meters (12,450 feet) above sea level" |
| 2 | [NASA Photojournal · Mt. Erebus, Antarctica](https://science.nasa.gov/photojournal/mt-erebus-antarctica/) | "The glacier-covered volcano" / "Continuous lava-lake activity with minor explosions, punctuated by occasional larger strombolian explosions that eject bombs onto the crater rim, has been documented since 1972" |
| 3 | [NASA Earth Observatory · Mount Erebus, Antarctica](https://science.nasa.gov/earth/earth-observatory/mount-erebus-antarctica-87444/) | "It regularly emits plumes of gas and steam, and occasionally spits out rock (bombs) in strombolian eruptions." |
| 4 | [LPI · The Ice Towers of Mt. Erebus (PDF)](https://www.lpi.usra.edu/meetings/sixthmars2003/pdf/3105.pdf) | "On Mount Erebus, a similar hollow ice chimney forms, up to 10m high" / "Under some towers is a grotto – a cave like hollow under the perpetual ice" |

Para la animación (no aparece en la ficha): USAP registra «two to six Strombolian eruptions daily» ([2002-2003 Science Planning Summaries, PDF](https://www.usap.gov/scienceSupport/documents/2002-2003%20Science%20Planning%20Summaries.pdf)).

## `thwaites` — Glaciares que cambian

> El Glaciar Thwaites, en la Antártida Occidental, es el más ancho de la Tierra: unos 120 km. Cada año pierde unos 50.000 millones de toneladas de hielo más de lo que recibe como nieve, y el hielo que fluye al mar se duplicó en tres décadas. Agua de mar unos grados más cálida que el punto de congelación derrite su plataforma flotante desde abajo. Si colapsara por completo, el nivel del mar subiría unos 65 cm.

| Oración | Fuente | Cita |
|---|---|---|
| 1 | [ITGC · Thwaites Glacier Facts](https://thwaitesglacier.org/about/facts) | "Thwaites is the widest glacier on Earth, at ~120 km (~80 miles) wide." |
| 2 | [ITGC · Thwaites Glacier Facts](https://thwaitesglacier.org/about/facts) | "Annually Thwaites is losing about 50 billion tons of ice more than it is receiving in snowfall." |
| 2 | [NASA Earth Observatory · Thwaites Glacier Transformed](https://science.nasa.gov/earth/earth-observatory/thwaites-glacier-transformed-146247/) | "the amount of ice flowing from Thwaites—and contributing to sea level rise—has doubled in the span of three decades." |
| 3 | [NASA Earth Observatory · Thwaites Glacier Transformed](https://science.nasa.gov/earth/earth-observatory/thwaites-glacier-transformed-146247/) | "Seawater that is a few degrees above freezing is melting the ice shelf from below." |
| 4 | [ITGC · Thwaites Glacier Facts](https://thwaitesglacier.org/about/facts) | "If Thwaites Glacier was to collapse entirely, global sea levels would increase by 65 cm (25 in)" |

## `belgrano` — Base Belgrano II

> La Base Belgrano II se inauguró el 5 de febrero de 1979 sobre roca firme, en el nunatak Bertrab, al sur del Mar de Weddell. Es la base más austral de la Argentina, a 1.300 km del Polo Sur. Tiene cuatro meses de noche polar, vientos fuertes y temperaturas de hasta -54 °C, y se abastece una vez por año, sobre todo con el rompehielos Almirante Irízar. De noche se ven abundantes auroras polares. En el Laboratorio Belgrano (LABEL), científicos del Instituto Antártico Argentino estudian el ozono, el magnetismo, el clima y los sismos.

| Oración | Fuente | Cita |
|---|---|---|
| 1 | [Cancillería · Base Belgrano II](https://cancilleria.gob.ar/es/iniciativas/dna/antartida-argentina/bases/belgrano-ii) | "La Base Belgrano II fue inaugurada el 5 de febrero de 1979 sobre el nunatak Bertrab en la Bahía Vahsel, al sur del mar de Weddell." |
| 1 | [Comando Conjunto Antártico · Historia](https://www.argentina.gob.ar/informacion-sobre-el-comando-conjunto-antartico/historia-de-las-fuerzas-armadas-en-la-antartida) | "no sobre la barrera de hielos sino sobre roca viva, en el Nunatak Bertrab." |
| 2 | [Cancillería · Base Belgrano II](https://cancilleria.gob.ar/es/iniciativas/dna/antartida-argentina/bases/belgrano-ii) | "En la actualidad la Base Belgrano II es la más austral de las bases argentinas" |
| 2 | [Ejército Argentino · Base Belgrano II](https://www.argentina.gob.ar/ejercito/antartida/base-belgrano2) | "Se encuentra a 1300 km del Polo Sur" |
| 3 | [Cancillería · Base Belgrano II](https://cancilleria.gob.ar/es/iniciativas/dna/antartida-argentina/bases/belgrano-ii) | "cuatro de noche polar. Se trata de una zona de fuertes vientos con temperaturas constantemente negativas que llegan hasta los -54˚C." |
| 3 | [Ministerio de Defensa · 47° aniversario](https://www.argentina.gob.ar/noticias/47deg-aniversario-de-la-base-conjunta-antartica-belgrano-2) | "El abastecimiento logístico se realiza una vez al año, principalmente mediante el rompehielos ARA "Almirante Irízar"" |
| 4 | [Ejército Argentino · Base Belgrano II](https://www.argentina.gob.ar/ejercito/antartida/base-belgrano2) | "Desde allí, durante la noche, se observan abundantes "auroras polares"." |
| 5 | [Ejército Argentino · Base Belgrano II](https://www.argentina.gob.ar/ejercito/antartida/base-belgrano2) | "Al contar con el Laboratorio Belgrano (LABEL) del Instituto Antártico Argentino" |
| 5 | [Cancillería · Base Belgrano II](https://cancilleria.gob.ar/es/iniciativas/dna/antartida-argentina/bases/belgrano-ii) | "científicos del IAA que en el LABEL realizan estudios de ozono, magnetismo, meteorología, glaciología, biología terrestre, geodesia y sismología" |

La aurora ya no se dibuja en el mapa 3D (#117): de día se leía como rayas verdes sueltas. Queda solo en la ficha (cita revisada el 14 de noviembre de 2026).

## `emperador` — Colonias de pingüino emperador

> El pingüino emperador es el único animal que se reproduce en el invierno antártico, sobre el hielo marino fijo a la costa. Solo el macho incuba el huevo sobre sus patas: cuando nace el pichón lleva unos 4 meses de ayuno. Para resistir el frío se agrupan y se turnan los lugares más abrigados, lo que reduce hasta un 50 % la pérdida de calor. Desde satélites se ubican sus colonias por las manchas de guano sobre el hielo, también en la Tierra de la Reina Maud.

| Oración | Fuente | Cita |
|---|---|---|
| 1 | [AAD · Emperor penguin](https://www.antarctica.gov.au/about-antarctica/animals/penguins/emperor-penguin/) | "Emperor penguins are the only animals that breed during the Antarctic winter." / "Most colonies are situated on the fast-ice" |
| 2 | [AAD · Emperor penguin breeding cycle](https://www.antarctica.gov.au/about-antarctica/animals/penguins/emperor-penguin/breeding-cycle/) | "gives the egg to her partner who carefully puts it on his feet" / "by the time the chicks appear, their fathers have fasted for 4 months!" |
| 3 | [AAD · Emperor penguin](https://www.antarctica.gov.au/about-antarctica/animals/penguins/emperor-penguin/) | "Huddling cuts the heat loss by as much as 50%" / "taking turns to occupy the warmest and coldest positions in the huddle." |
| 4 | [NASA Earth Observatory · A Changing World for Emperor Penguins](https://science.nasa.gov/earth/earth-observatory/a-changing-world-for-emperor-penguins/) | "researchers identify colonies from the guano stains that accumulate where thousands of birds congregate on the ice." |
| 4 | [Antarctic Science · Four unreported emperor penguin colonies discovered by satellite](https://www.cambridge.org/core/journals/antarctic-science/article/four-unreported-emperor-penguin-colonies-discovered-by-satellite/20956FD3E80F3604C21D0E2AA80FEF9B) | "The first of the four sites is on the northern side of the Lazarev Ice Shelf [...] on the Dronning Maud Land coast" |

## `cerronevado` — Pingüinos de Cerro Nevado (#206)

> Frente a la costa sur de la isla Cerro Nevado, sobre el hielo marino fijo, está la colonia de pingüino emperador más al norte que se conoce. La descubrieron científicos del Instituto Antártico Argentino desde un avión Twin Otter, el 20 de julio de 1997. Desde 2013 la estudian en campañas de agosto y septiembre: salen de Base Marambio, a unos 65 km, cruzan el hielo en motos de nieve y trineos, y acampan junto a un témpano. Según el año, los censos publicados van de 1.200 a unas 4.000 parejas. Está en una zona donde el clima cambia rápido: por eso seguirla es clave.

Consulta: 17 nov 2026. Las tres fuentes son PDF que se descargaron y se leyeron completos.

| Oración | Fuente | Cita |
|---|---|---|
| 1 | [Coria y Montalti 2000 · Marine Ornithology 28: 119-120](https://www.marineornithology.org/PDF/28_2/28_2_5.pdf) | "The colony is located at 64°32'S, 57°26'W on level sea ice approximately 500 m from the south coast of Snow Hill Island" |
| 1 | [Schiel et al. 2019 · Marine Ornithology 47: 189-192](https://www.marineornithology.org/PDF/47_2/47_2_189-192.pdf) | "The northernmost known Emperor Penguin Aptenodytes forsteri colony is located on the fast ice at the southeastern coast of Snow Hill Island" |
| 2 | [Coria y Montalti 2000](https://www.marineornithology.org/PDF/28_2/28_2_5.pdf) | Autores del "Instituto Antartico Argentino"; "This colony was discovered on a Twin-Otter aeroplane flight at 300 m on 20 July 1997" |
| 3 | [IAA · Pingüino emperador (M. M. Libertelli)](https://cancilleria.gob.ar/userfiles/ut/pinguinoemperador.pdf) | "se debe programar la campaña científica durante los meses de agosto y septiembre" / "nuestro país comenzó en el 2013 el estudio de la colonia de Cerro Nevado, situada a unos 65 km al sur de Base Marambio" / "Durante 4 horas se recorre con motos de nieve y trineos el trayecto hasta Cerro Nevado" / epígrafe de foto: "Campamento realizado sobre el pack marino a 300 metros de la colonia, protegido por témpano." |
| 4 | [Schiel et al. 2019](https://www.marineornithology.org/PDF/47_2/47_2_189-192.pdf) | "counts conducted in 2004, 2009, and 2013, ranging from 1 200–4 000 breeding pairs" (el censo de 2018 da "at least 2 700 breeding pairs", dentro del rango) |
| 5 | [Schiel et al. 2019](https://www.marineornithology.org/PDF/47_2/47_2_189-192.pdf) | "in an area strongly influenced by recent climatic developments" / "Therefore, monitoring this Snow Hill colony is crucial." |
| 5 | [IAA · Pingüino emperador](https://cancilleria.gob.ar/userfiles/ut/pinguinoemperador.pdf) | "se encuentra en una de las regiones del mundo donde los efectos del cambio climático global son más evidentes" |

**Discrepancias resueltas:** Coria y Montalti (los descubridores) ubican la colonia a unos 500 m de la costa sur; Schiel et al. dicen «costa sureste». La ficha dice «costa sur», como la fuente original y el IAA («al sur de la Isla Cerro Nevado»). El punto del mapa usa las coordenadas de Coria y Montalti (64°32′ S, 57°26′ O).

**Pendientes (no se publican):**
- Transmisores satelitales en adultos (IAA, Global Penguin Society, Aves Argentinas): solo en notas de prensa (Perfil; Noticias Ambientales, 31 oct 2026). [Fuente a definir]: comunicado del IAA o de la Dirección Nacional del Antártico.
- Superficie del sitio: 214 ha según BirdLife International (citado por Schiel et al.); la ficha de BirdLife no se abrió en esta verificación.
- Cruceros que salen de Ushuaia: ninguna fuente leída lo dice. Schiel et al. y el IAA sí registran visitas turísticas en helicóptero; la ficha no las menciona.
- Dieta de esta colonia: el IAA nombra kril, peces y calamar como presas de la especie, no medidas en Cerro Nevado.

**Cómo se dibujó el hielo (#206, consulta 17 nov 2026):** el hielo fijo es hielo marino agarrado a la costa que no se mueve con el viento ni las corrientes ([NSIDC · Cryosphere glossary: fast ice](https://nsidc.org/learn/cryosphere-glossary/fast-ice)): en el modelo es una planicie delgada desde la costa, no un témpano. La colonia va a lo largo de su borde, en lo plano (Schiel et al.: "distributed over an area of approximately three kilometers in length and a few hundred meters in width, along the edge of the fast ice" / "Almost all penguins were observed on level areas"), y delante hay una franja angosta de hielo suelto ("the narrow pack ice belt in front of the fast ice") con pichones sobre témpanos.

**El modelo del mapa y de la ficha es una ilustración:** la cantidad de pingüinos, el témpano con la guardería de pichones (Schiel et al.: "a crèche of 144 chicks seen on the lee side of an iceberg") y el campamento no son un conteo ni un plano del sitio. El saludo con la aleta del emperador de adelante, en el mapa, es un recurso de la ilustración, no un comportamiento de la especie.

## `fosiles` — Fósiles

**Nota del 14 nov 2026 (#74):** la ficha «Fósiles» salió del mapa. En su lugar, sobre la Isla Marambio, está el punto «Base Marambio» ([`docs/expediciones/base-marambio.md`](expediciones/base-marambio.md)), y la expedición de fósiles va a vivir en otro lugar. El texto ya no está en `point-details.ts`; la descripción y sus fuentes verificadas se conservan acá para esa expedición.

> La Isla Marambio tiene laderas sin hielo con fósiles de plantas, invertebrados y vertebrados. Sus maderas fósiles muestran que en el Eoceno crecían allí bosques de coníferas, en un clima templado. Cerca de la Base Marambio, un investigador del CONICET halló en 2018 al reptil marino Marambionectes molinai, de unos 67 millones de años. De la misma época es el ave buceadora Pujatopouli soberana, que nadaba en un mar mucho más templado que el actual.

| Oración | Fuente | Cita |
|---|---|---|
| 1 | [IUGS Geoheritage · K-Pg transition at Seymour (Marambio) Island](https://iugs-geoheritage.org/geoheritage_sites/cretaceous-paleogene-k-pg-transition-at-seymour-marambio-island-antarctica/) | "little surface cover and ice-free [...] a rare combination of fossils from many different groups (invertebrates, vertebrates, plants, microfossils, etc.)" |
| 2 | [CONICET Bicyt · Fossil woods from La Meseta Formation](https://bicyt.conicet.gov.ar/fichas/produccion/11775307) | "the Early-Middle Eocene forest canopy in the Marambio (Seymour) Island area was dominated by gymnosperms, mainly Podocarpaceae" / "Both, the growth rings and the present taxa suggest temperate climates." |
| 3 | [CONICET · nota 136847](https://www.conicet.gov.ar/web-accesible/?nota_id=136847) | "el investigador del CONICET José O'Gorman tropezó con un bulto semienterrado cerca de la Base Marambio [...] Era febrero de 2018" / "se le calcula una antigüedad de poco más de 67 millones de años" / "El nuevo espécimen fue bautizado Marambionectes molinai" |
| 4 | [CONICET La Plata · Pujatopouli soberana](https://laplata.conicet.gov.ar/reportan-el-hallazgo-de-un-nuevo-genero-y-especie-de-ave-buceadora-que-habito-la-antartida-hace-67-millones-de-anos/) | "ave buceadora que habitó la Antártida hace 67 millones de años" / "Los fósiles fueron recuperados en la isla Marambio" / "en un mar que era mucho más templado que el que conocemos ahora" |

## `oceano` — Océano

> **Ya no se muestra en la app.** Océano pasó a ser expedición (#8): al tocar el punto se abre la expedición, no esta ficha, y se quitaron el texto de `point-details.ts` y el modelo de la ficha (`oceano` en `pointModels.ts`). Queda registrado acá con sus fuentes.

> Bajo el hielo marino viven microalgas que alimentan al krill en invierno y primavera, y casi todos los animales grandes de la Antártida dependen del krill. En el Mar de Weddell, el agua muy fría y salada se hunde hasta el fondo: es el Agua de Fondo Antártica, que ayuda a mover la circulación de todo el océano. Esa agua lleva oxígeno a las profundidades y guarda carbono lejos de la atmósfera durante siglos. Bajo el hielo fijo vive la foca de Weddell, que mantiene abiertos sus respiraderos raspando el hielo con los dientes.

| Oración | Fuente | Cita |
|---|---|---|
| 1 | [AAD · Sea ice algae put spring in krill growth](https://www.antarctica.gov.au/news/2008/sea-ice-algae-put-spring-in-krill-growth/) | "Antarctic krill [...] that feed on ice algae during winter and spring" |
| 1 | [AAD · Antarctic krill](https://www.antarctica.gov.au/about-antarctica/animals/krill/) | "Most of the larger Antarctic animals (seals, whales, seabirds, fish and squid) depend on Antarctic krill, directly or indirectly." |
| 2 | [SCAR · Antarctic Bottom Water](https://environments.aq/resources/antarctic-bottom-water-how-it-contributes-to-the-global-ocean-circulation/) | "extremely cold and salty water becomes dense enough to sink to the ocean floor" / "helps drive the global ocean circulation" / "AABW forms in four primary regions, the Weddell Sea, [...]" |
| 3 | [SCAR · Antarctic Bottom Water](https://environments.aq/resources/antarctic-bottom-water-how-it-contributes-to-the-global-ocean-circulation/) | "It transports oxygen to the deep sea, stores carbon away from the atmosphere for centuries" |
| 4 | [AAD · Weddell seal](https://www.antarctica.gov.au/about-antarctica/animals/seals/weddell-seal/) | "Because Weddell seals breath air and live under the fast-ice" / "use their canine and incisor teeth to rasp open the new ice" |

## `poncho` — Poncho

Tiene desarrollo y fuentes propias en sus ramas (#9 y #26 a #33). Su ficha sigue provisional hasta que se consoliden en `main`.

# DEC-211: El panel de cada parada de Poncho sigue el diseño de las paradas de Fósiles

```json
{
  "id": "DEC-211",
  "date": "2026-11-16",
  "status": "accepted",
  "issue": 211,
  "supersedes": [],
  "supersededBy": null
}
```

## Decisión

El panel de cada parada de Poncho usa el mismo diseño que las paradas de Fósiles (`.orc-panel`, compartido con Orcadas y Océano): un panel lateral en pantallas anchas y una hoja que se abre hacia arriba en el celular. Cuenta **una frase por vez** (acto y hito, título, la frase con su fuente), con «Saber más» desplegable en el mismo panel (`<details>`, sin modal en el medio) y dos flechas abajo: «‹» (atrás) y «›» (siguiente). La escena de al lado muestra algo nuevo en cada frase y la cámara va a su toma. La foto de la parada se abre en un modal, como las del archivo de Fósiles.

Las flechas recorren toda la historia: pasada la última frase de un hito, «›» sigue el viaje (o va al hito siguiente si ya se lo había leído); antes de la primera, «‹» **entra al hito anterior completo, en su última frase**. «Volver al mapa» está siempre visible. Si se sale al mapa estando dentro de un hito, «Continuar» vuelve a entrar a ese hito. La barra de viaje no ofrece texto aparte: tiene un botón «‹ Hito N» que entra al hito donde está el equipo.

Reemplaza el modo de contar de [DEC-146](DEC-146-poncho-en-orden.md) (una frase por toma con «Siguiente» y «Saber más» solo en la última). El orden obligatorio del viaje de DEC-146 sigue vigente.

## Motivo

Quien probó el recorrido lo encontró confuso en tres versiones: con «Siguiente» (se hacía largo y no se entendía), con todo el texto junto (la escena y el texto corrían por separado) y con un reproductor con subtítulos (pausa y «Ver de nuevo» no tenían sentido). Lo que sí resultó cómodo para conocer una historia es el panel de las paradas de Fósiles, así que se adopta tal cual en lugar de diseñar uno propio.

## Referencias

- [Issue #211](https://github.com/Antartida3D/Antartida3D/issues/211); contexto en [#146](https://github.com/Antartida3D/Antartida3D/issues/146), [#212](https://github.com/Antartida3D/Antartida3D/issues/212) y [#214](https://github.com/Antartida3D/Antartida3D/issues/214).
- Pedido de la persona que lleva el trabajo, en la conversación del 16 de noviembre de 2026: seguir «ese mismo diseño» de Fósiles, con «Siguiente» y «Atrás» (de preferencia flechas), «Saber más» desplegable, y volver adentro del hito al ir atrás. Esta cita no representa una revisión posterior del resultado.
- [Diseño de la expedición](../expediciones/poncho-diseno.md).

## Estado de implementación y verificación

Implementado en la rama del issue #211. Pruebas de `@antartida/core` y e2e (`packages/e2e/tests/poncho-diorama.spec.ts` y `poncho-map.spec.ts`) a 390 y 1440 px pasadas el 16 de noviembre de 2026. Pendientes en otros issues: que cada hito defina sus escenas (#215 a #225) y los puntos tocables (#228).

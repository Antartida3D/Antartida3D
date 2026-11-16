# DEC-75: orden sugerido de expediciones

```json
{
  "id": "DEC-75",
  "date": "2026-11-16",
  "status": "accepted",
  "issue": 75,
  "supersedes": [],
  "supersededBy": null
}
```

## Decisión

El mapa sugiere un orden para las seis expediciones, sin bloquear ninguna: Desde Ushuaia, Base Marambio, Fósiles, Poncho, Estación Orcadas, Océano. Vive en `EXPEDITION_ORDER` (`core/src/expedition-order.ts`) y una prueba exige que cubra exactamente las expediciones de nivel A.

- **«Siguiente» es la primera del orden que todavía no está explorada** (`nextExpedition`), no la que sigue a la última terminada. Los ids desconocidos se ignoran.
- **Marcador:** el de la sugerida lleva la etiqueta «Siguiente» y es el único que late. El grupo que la contiene también la anuncia. Funciona igual en 2D y 3D porque ambas vistas dibujan `MarkerButton`.
- **Botón «Siguiente: X»** abajo a la izquierda, en el lugar de «Continuar». «Continuar» gana, y no aparece durante la bienvenida, un viaje o una transición.
- **Tarjeta al volver:** reemplaza al aviso temporal. Muestra el registro de exploración, la siguiente sugerida con su pregunta guía y el botón principal con el nombre de la expedición (sin «Empezar:», que ya dice el texto de arriba). Al terminar Marambio ofrece además el viaje a Orcadas en el Irízar. No se cierra sola: tiene botones, y un cierre automático no da tiempo a leerla ni a llegar con teclado. Se cierra con «Quedarme en el mapa», Escape, arrastrándola hacia abajo, con «atrás» o al abrir otra capa.
- **No tapa el marcador sugerido:** si queda bajo la tarjeta o fuera de pantalla, el mapa se desplaza (sin cambiar el zoom) para dejarlo en la zona libre.
- **Lista:** el grupo «Expediciones» es una lista numerada en el orden sugerido.

## Motivo

La prueba con usuarios mostró que no se sabe por dónde seguir. El orden es geográfico: el viaje desde Ushuaia termina en Marambio, Fósiles está en la isla vecina, Poncho empieza en la misma Península, Orcadas se alcanza con el Irízar y Océano queda al final. Es una sugerencia: todas se pueden abrir en cualquier orden.

## Referencias

- [Issue #75](https://github.com/Antartida3D/Antartida3D/issues/75).
- Plan: `.agents/plans/plan-orden-sugerido-expediciones.md`.
- Complementa la bienvenida de #115 y «Continuar» de DEC-186.

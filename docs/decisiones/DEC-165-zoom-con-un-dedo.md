# DEC-165: Zoom con un dedo en el celular

```json
{
  "id": "DEC-165",
  "date": "2026-11-15",
  "status": "proposed",
  "issue": 165,
  "supersedes": [],
  "supersededBy": null
}
```

## Decisión

En el celular, el mapa suma los dos gestos de zoom con un dedo de los mapas de celular, en el mapa 2D, en el relieve 3D y en los dioramas que usan los mismos gestos (Orcadas y Marambio):

- **Doble toque:** acerca un paso (×2, `DOUBLE_TAP_ZOOM`) alrededor del punto tocado: ese punto del mapa queda bajo el dedo. Con movimiento reducido, el paso es inmediato, sin animación.
- **Doble toque con el segundo toque apoyado:** arrastrar hacia arriba acerca y hacia abajo aleja, de forma continua. 150 px de arrastre duplican o reducen a la mitad la escala (`TAP_DRAG_DOUBLING_PX`); la escala sigue una curva exponencial, así que subir y bajar lo mismo deja la vista como estaba. Mientras dura, el dedo no mueve el mapa. Si el segundo toque se suelta sin moverse, vale como un doble toque.

Umbrales, en `core/src/gestures.ts`:

- Entre que se levanta el primer toque y se apoya el segundo: hasta 300 ms (`DOUBLE_TAP_MS`).
- Entre los dos toques: hasta 50 px (`DOUBLE_TAP_PX`).
- Un dedo que se mueve menos de 10 px sigue tocando, no arrastrando (`TAP_MOVE_PX`, igual que el arranque del gesto de dos dedos).
- El primer toque dura hasta 300 ms (`TAP_MAX_MS`); una presión más larga no inicia un doble toque.

Respeta los topes de zoom de cada vista: `MIN_K` y `MAX_K` en 2D, y `cc.minDistance` y `cc.maxDistance` de la cámara en 3D, los mismos que usan la rueda, el pellizco y los botones (#127).

**Marcadores (#54):** los toques sobre un marcador no cuentan para el doble toque: el primero muestra el cartel y el segundo abre el punto, como antes. Un doble toque sobre el mapa no abre el marcador que el navegador tenga cerca: si el navegador manda el segundo toque a un marcador próximo, ese toque se descarta como si fuera un arrastre.

## Motivo

El issue pide los dos gestos de zoom con un dedo que se usan en los mapas de celular; hasta ahora el zoom en el celular era solo con pellizco y con los botones. Los umbrales son cortos para que dos toques sueltos no se tomen por un doble toque, y el paso ×2 se eligió como un salto claro, sin perder de vista el lugar. En 3D, cámara y mira se acercan juntas al punto del suelo bajo el dedo, así que la vista no gira ni se inclina. Cerca del horizonte ese punto queda muy lejos: se limita a 4 veces la distancia de la cámara, para que el zoom no arrastre la vista de golpe.

## Referencias

- [Issue #165](https://github.com/Antartida3D/Antartida3D/issues/165): pedido y alcance, escrito por quien lleva el issue.
- Los valores de los umbrales y la sensibilidad del arrastre los eligió el agente que implementó el cambio; quedan como propuesta hasta que los confirme quien lleva el issue al revisar el PR.
- Antecedente: gestos con dos dedos (#46), sección «Gestos con dos dedos, como en una app de globo» de [decisiones.md](../decisiones.md). Este registro los complementa; no los reemplaza.
- [Tecnologías, «La cámara y los gestos»](../tecnologias.md).

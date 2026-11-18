# DEC-297: encabezado común de expediciones y botones solos a todo el ancho

```json
{
  "id": "DEC-297",
  "date": "2026-11-18",
  "status": "accepted",
  "issue": 297,
  "supersedes": [],
  "supersededBy": null
}
```

## Decisión

1. Océano, Orcadas, Fósiles y Marambio dibujan su encabezado con un solo componente, `ExpeditionTop` (`packages/react-ui/src/ExpeditionTop.tsx`). Ningún otro archivo repite el marcado `<header className="orc-top">`.
2. El encabezado es el de Océano tras [DEC-283](DEC-283-oceano-sin-botones-opcionales.md): sin barra, sin borde ni fondo y sin título. «Mapa» y sus acciones van a la izquierda y, en escritorio, los capítulos a la derecha. La pregunta guía ya aparece en la primera parada del panel, en la introducción o en «Responder»; la región de la expedición conserva su nombre accesible.
3. «Fuentes» es una acción opcional del componente. Orcadas, Fósiles y Marambio la conservan; Océano sigue sin ella. *Reemplazado por [DEC-327](DEC-327-menos-ayudas-en-expediciones.md): ninguna expedición la usa.*
4. En celular vertical no se ven los capítulos en ninguna expedición: «Siguiente» y «Atrás» del panel recorren las paradas. Saltar directo a un capítulo queda en escritorio y en celular horizontal.
5. El selector de mes de Orcadas y Marambio es siempre un chip en la fila de «Mapa», también en escritorio. Al tocarlo se despliega la tira de 12 meses, la leyenda y «Saber más». En escritorio la tarjeta de 380 px no entra en la fila, así que cambiar el mes cuesta un clic más.
6. «Continuar» en celular pasa a dos líneas si el título no entra.
7. Todo botón que queda solo en una barra, un panel o un modal ocupa todo el ancho de su contenedor, en celular y en escritorio. Quedan fuera los botones redondos de escena, las píldoras, los chips y los botones que comparten fila con un título.
8. Se quitó el borde izquierdo de acento de la sección tocada de Fósiles (`.fossil-interaction`), según [DEC-283-3](DEC-283-3-sin-borde-izquierdo-pintado.md).

9. El cartel de ubicación de la escena es un solo componente, `SceneLocation` (`packages/react-ui/src/SceneLocation.tsx`), con el diseño de Océano: pin ocre y dos líneas, abajo a la izquierda en escritorio, en la fila de «Mapa» (a la derecha) en celular vertical y junto al panel en celular horizontal. Lo usan Océano y Fósiles. En Fósiles, en escritorio, queda sobre la etiqueta de reconstrucción (`--scene-location-bottom`); su botón de restablecer pasa a la esquina izquierda en celular horizontal. La nota manuscrita de una parada también es una sola (`.scene-found`) y el pie de la imagen sin 3D de Fósiles lleva el mismo borde punteado que el de Océano.
10. El encabezado vive en la capa 12, sobre los puntos de interés (11): el desplegable del mes sale de él y debe taparlos.
11. Al salir de un viaje desde Ushuaia, la cámara 3D vuelve a la vista general del mapa en vez de quedarse sobre el barco.
12. Se borró `CerroNevadoExpedition.tsx`: Cerro Nevado ya es una ficha y nada lo montaba. Quedan sin uso `CerroNevadoScene.tsx`, `colonyScene.ts` y las reglas `.cn` de `marambio.css`.
13. Los e2e de Océano que fallaban en `main` estaban desactualizados desde #283: tres paradas muestran una segunda vista antes de avanzar, y los tests contaban una pulsación por parada.
14. La etiqueta de la escena («Reconstrucción ilustrada» con su «?» que explica el porqué) es un solo componente, `SceneBadge` (`packages/react-ui/src/SceneBadge.tsx`), abajo a la izquierda en Océano, Fósiles, Orcadas, Marambio, Poncho y el viaje desde Ushuaia. Se quitaron el cartel «Arrastrá para mirar alrededor» de Fósiles y el de «Dibujo para ver la escena…» de Poncho: su texto pasó al «?». En el viaje desde Ushuaia la etiqueta queda sobre la barra en celular y en la esquina inferior izquierda en escritorio. Fósiles sin 3D muestra «Fotografía de archivo» con el mismo componente. *Reemplazado por [DEC-327](DEC-327-menos-ayudas-en-expediciones.md): se quitó la etiqueta y el componente.*
15. La leyenda del mapa arranca cerrada también en un celular horizontal (alto de 500 px o menos): abierta tapaba el marcador sugerido. Esto arregla el test `expedition-order:271`, que fallaba en `main` en 844×390.

## Motivo

Lo pidió quien lleva el issue: cada expedición tenía un encabezado distinto, el selector de mes tapaba la escena y los botones solos quedaban a medias o cortados.

## Referencias

- [Issue #297](https://github.com/Antartida3D/Antartida3D/issues/297). El pedido consta en la sesión de trabajo del 18 de noviembre de 2026.
- [DEC-283](DEC-283-oceano-sin-botones-opcionales.md): la barra sin fondo de Océano.
- [DEC-234](DEC-234-componentes-de-interfaz.md): componentes de interfaz con una sola definición.

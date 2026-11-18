# DEC-327: sin etiqueta de escena, sin «Fuentes» en el encabezado y sin «Saber más» en los capítulos cortos

```json
{
  "id": "DEC-327",
  "date": "2026-11-18",
  "status": "accepted",
  "issue": 327,
  "supersedes": [],
  "supersededBy": null
}
```

## Decisión

1. Ninguna expedición muestra la etiqueta de escena («Reconstrucción ilustrada» o «Fotografía de archivo») con su botón «?». Se borró el componente `SceneBadge` y sus estilos. Ya no aparece en Océano, Fósiles, Orcadas, Marambio, Poncho, el viaje desde Ushuaia ni las escenas de los puntos de interés. Esto reemplaza el punto 14 de [DEC-297](DEC-297-encabezado-comun-de-expediciones.md).
2. El encabezado `ExpeditionTop` no lleva el botón «Fuentes» en Orcadas, Fósiles, Marambio ni en las escenas de los puntos de interés. Las fuentes se abren desde las citas `[N]`, que muestran la lista completa con la fuente tocada resaltada. Esto reemplaza el punto 3 de DEC-297. La acción `actions` del componente sigue disponible.
3. El botón «Ver una ventisca» de Marambio estaba dentro de la etiqueta. Se queda solo, en la misma esquina inferior izquierda. El cartel de ubicación (`SceneLocation`) de Océano, Fósiles y las escenas de puntos de interés ya no deja en escritorio el lugar de la etiqueta debajo: baja a 24 px del borde, como en las demás pantallas. En celular, el de las escenas de puntos de interés ya no reserva el lugar de «Fuentes» en la fila de «Mapa».
4. Las cuatro paradas de «Llegar» de Orcadas no tienen «Saber más» porque su texto es corto. Las demás paradas lo conservan. Los datos que solo vivían en ese «Saber más» (`arrival-coordenadas` y `arrival-elevacion`) se quitaron del contenido.
5. En Fósiles, las paradas de «Llegar» y de «Dinosaurio» no tienen «Saber más». El campo `more` de una parada pasó a ser opcional.
6. Al volver al mapa 3D desde una expedición, la pantalla de carga se muestra otra vez mientras el lienzo 3D vuelve a cargar el relieve, el océano, las tierras y los shaders. El paso del código («chunk») queda hecho, porque ya está en memoria.
7. En Fósiles, tocar la cita de una foto cerraba la foto y no abría las fuentes: la foto y las fuentes compartían un mismo estado y el cierre de la foto pisaba la apertura de las fuentes. La foto ahora tiene su propio estado, como en Marambio y Poncho, los otros usos de `PhotoModal`.

## Motivo

Lo pidió quien lleva el issue: en esos capítulos el texto es poco y el pliegue no suma, y la etiqueta y el botón «Fuentes» recargaban la escena y el encabezado. Al volver de una expedición el mapa se veía cargar desde cero.

Sin la etiqueta, la interfaz deja de decir en cada escena que es una reconstrucción. Siguen marcando qué es cada cosa el cartel de ubicación (por ejemplo «Mar de Weddell · escena ilustrativa»), las notas de las paradas («Forma y movimiento ilustrativos»), los chips de tipo de dato en los paneles y las introducciones de cada expedición. La regla de no presentar una simulación como dato real (`AGENTS.md`) la revisa quien revisa el PR.

## Referencias

- [Issue #327](https://github.com/Antartida3D/Antartida3D/issues/327). El pedido consta en la sesión de trabajo del 18 de noviembre de 2026.
- [DEC-297](DEC-297-encabezado-comun-de-expediciones.md): encabezado común y etiqueta de escena.
- [DEC-264](DEC-264-modales-normalizados.md): «Saber más» con `MoreFold` y citas `[N]`.

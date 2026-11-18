# DEC-283-2: un solo modelo low-poly por animal del mar

```json
{
  "id": "DEC-283-2",
  "date": "2026-11-18",
  "status": "accepted",
  "issue": 283,
  "supersedes": [],
  "supersededBy": null
}
```

## Decisión

La jorobada, la minke antártica y la foca leopardo tienen un solo modelo low-poly cada una. Lo usan la expedición Océano, el mapa abierto y la ficha de «Vida en el mar».

- **Jorobada:** es la de Océano, en `marine/lowPolyMarine.ts`. Su garganta es una sola piel desde el mentón hasta el ombligo y no se separa del cuerpo (#205). `HUMPBACK_PARTS` la corta en cuerpo, cola y aletas para que el mapa la anime. Se borró la jorobada anterior del mapa.
- **Minke antártica:** es `MINKE_PARTS`, en `voyage/whalePolyModels.ts`. Es fina, con hocico en V, aleta dorsal alta y manchas claras en los flancos. Sus aletas son grises con el borde de adelante pálido, sin la banda blanca de la minke común y de la enana. NOAA Fisheries describe así la aleta de la minke antártica. Océano ya no tiene una minke propia con mandíbula: la escena muestra las embestidas, no la boca abierta.
- **Foca leopardo:** es `LEOPARD_PARTS`, en `marine/lowPolyMarine.ts`. Tiene cuerpo largo, cabeza grande de reptil, boca ancha con caninos y dientes de atrás de tres puntas, y manchas oscuras en garganta, vientre y flancos. En el mapa y en la ficha reemplaza a la foca de Weddell, que estaba en el punto de la foca leopardo.

Las ayudas de forma de la jorobada (`skin`, `orient`, `fromOutline`, `sectionAt`, `topAt`, `sideAt`) pasaron a `voyage/lowPoly.ts`, para que las usen los tres modelos sin importación circular. Son ilustraciones: las formas y las manchas son interpretadas.

## Motivo

Quien lleva el issue vio que la ficha mostraba una jorobada distinta a la de la expedición, una minke y una foca leopardo que no se parecían al animal real, y modelos repetidos. Un solo modelo hace que el mapa, la ficha y la expedición muestren el mismo animal.

## Referencias

- [Issue #283](https://github.com/Antartida3D/Antartida3D/issues/283). El pedido consta en la sesión de trabajo del 18 de noviembre de 2026.
- [Issue #205](https://github.com/Antartida3D/Antartida3D/issues/205): la garganta de la jorobada se separaba del cuerpo.
- NOAA Fisheries, «Minke Whale», https://www.fisheries.noaa.gov/species/minke-whale, consultada el 18 de noviembre de 2026: aleta de la minke antártica «usually solid gray with a white leading edge».
- [Estilo de modelos](../diseno/estilo-voxel.md).

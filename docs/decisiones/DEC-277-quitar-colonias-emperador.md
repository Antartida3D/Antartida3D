# DEC-277: quitar el punto «Colonias de pingüino emperador»

```json
{
  "id": "DEC-277",
  "date": "2026-11-17",
  "status": "accepted",
  "issue": 277,
  "supersedes": ["DEC-276"],
  "supersededBy": null
}
```

## Decisión

1. Se quita del mapa el punto de interés `emperador` («Colonias de pingüino emperador», costa de Tierra de la Reina Maud), con su ficha, su modelo low-poly (`EMPERADOR`, `EMPEROR_HUDDLE`) y el giro de la ronda (`huddleTurn`, `HuddlePart`).
2. El pingüino emperador sigue en la app a través de **Pingüinos de Cerro Nevado** (#206), que tiene escena propia, y de la expedición Océano. El modelo `emperor()` de `lowPoly.ts` no cambia.
3. «Mientras tanto · dato real» de la pantalla de carga ([DEC-276](DEC-276-carga-cartografica-azul.md), punto 5) elige ahora entre `thwaites`, `vostok`, `erebus` y `cerronevado`. Cerro Nevado tiene descripción y fuentes verificadas. El resto de DEC-276 sigue vigente.

## Motivo

El punto repetía el tema de Cerro Nevado, que tiene más contenido y su propia escena. Visto de cerca, el modelo quedaba plano al lado de la estética del resto de la app. Las citas de su ficha se conservan en `docs/puntos-proximamente-fuentes.md` como registro.

## Referencias

- [Issue #277](https://github.com/Antartida3D/Antartida3D/issues/277): la quita la pidió quien lleva el issue.
- Pruebas: `packages/core/test/points.test.ts` y `packages/core/test/loading.test.ts`.

# DEC-206: Un punto de interés puede abrir una escena propia sin ser una expedición

```json
{
  "id": "DEC-206",
  "date": "2026-11-17",
  "status": "accepted",
  "issue": 206,
  "supersedes": [],
  "supersededBy": null
}
```

## Decisión

El punto «Pingüinos de Cerro Nevado» sigue siendo un punto de interés (`tier: 'C'`), pero al tocarlo no abre su ficha: la cámara baja hasta la colonia y se abre una escena propia, como las de las expediciones, con cuatro puntos para visitar, sus textos y fuentes (`packages/react-ui/src/cerronevado/`, contenido en `packages/core/src/content/cerro-nevado.ts`).

Esa escena no es una expedición: no suma al registro de exploración, no se guarda para «Continuar» y el punto conserva su marca de «Punto de interés». En `AntarcticaApp.tsx` se abre por el mismo camino que las expediciones (`EXPEDITIONS`), y el id `CERRO_NEVADO_ID` lo excluye de `lastExpedition` y de `complete`.

## Motivo

Quien lleva el issue pidió que el punto haga «el zoom completo al hielo de los pingüinos, así como lo hacen las expediciones» y que se vea con el nivel de detalle de los dioramas. Convertirlo en expedición cambiaría el total del registro («0/6») y el orden sugerido, que el equipo ya fijó. Una escena propia da la experiencia pedida sin tocar esas reglas.

## Referencias

- [Issue #206](https://github.com/Antartida3D/Antartida3D/issues/206).
- Fuentes de cada texto: `docs/puntos-proximamente-fuentes.md`, sección `cerronevado`.
- Pruebas: `packages/core/test/cerro-nevado.test.ts`, `packages/react-ui/test/cerroNevado.test.ts` y `packages/e2e/tests/cerronevado.spec.ts` (abre la escena, recorre los cuatro puntos y al salir el registro sigue en 0 y no aparece «Continuar»).

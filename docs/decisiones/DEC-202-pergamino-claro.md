# DEC-202: «Pergamino claro» y carga cartográfica

```json
{
  "id": "DEC-202",
  "date": "2026-11-16",
  "status": "accepted",
  "issue": 202,
  "supersedes": [],
  "supersededBy": null
}
```

## Decisión

Se aprueba la dirección visual «Pergamino claro» para la UI cartográfica y la pantalla de carga compartida. Los paneles flotantes usan un radio de **13 px** y los botones rectangulares un radio de **9 px**. Los círculos, chips, gráficos, separadores y superficies pegadas al borde conservan la geometría que comunica su función.

La pantalla de carga comunica los hitos de preparación 2D y 3D, ofrece una salida a la vista 2D y respeta `prefers-reduced-motion`. La viñeta, la rosa y las líneas son decoración cartográfica: no representan relieve, mediciones ni datos geográficos nuevos. La decisión conserva el comportamiento existente y la lógica de «Continuar» integrada desde #186; no agrega contratos de modal, foco o aislamiento del fondo.

La normalización posterior de hover, selección, foco y deshabilitado se registra en [DEC-202-2](DEC-202-2-estados-controles.md). Complementa esta dirección visual y conserva sus radios y contrato de carga.

## Motivo

La dirección fue aprobada para el issue #202 después de revisar la ficha «Océano» y su extensión al resto de la UI. El soporte marfil, la tinta neutra, los filetes y la textura tenue mantienen la lectura editorial, mientras que los radios 13/9 establecen una regla común sin borrar las excepciones semánticas. El contrato de carga hace visible qué mapa está disponible y permite continuar con 2D cuando el relieve 3D todavía no está listo.

## Referencias

- [Issue #202](https://github.com/Antartida3D/Antartida3D/issues/202): aprobación y alcance de la dirección visual y la carga cartográfica.
- [DESIGN.md](../../DESIGN.md): tokens, paleta y sistema visual.
- [Plan de migración de UI](../diseno/plan-migracion-ui.md): inventario, implementación y límites de validación.
- [Pantalla de carga cartográfica](../diseno/pantalla-carga.md): contrato de los estados 2D/3D.
- [Commit de código integrado `3a27b73`](https://github.com/Antartida3D/Antartida3D/commit/3a27b73): implementación documentada por esta decisión.
- [DEC-186: «Continuar» retoma la expedición](DEC-186-orientacion-continuar-expedicion.md): decisión anterior preservada por la base de esta entrega; no se reemplaza ni se atribuye a este PR.

# DEC-283-3: sin borde izquierdo pintado como acento

```json
{
  "id": "DEC-283-3",
  "date": "2026-11-18",
  "status": "accepted",
  "issue": 283,
  "supersedes": [],
  "supersededBy": null
}
```

## Decisión

Queda prohibido el borde izquierdo de color como acento en una caja, una cita o una lista, con los demás lados sin borde. La regla está en la sección «Estilo visual» de `AGENTS.md`. Para separar o destacar se usan los componentes de `packages/core/src/styles/components.css` o espacio. En Océano se quitaron los que había.

## Motivo

Lo pidió quien lleva el issue: ese borde no marca nada que se entienda y ensucia la lectura.

## Referencias

- [Issue #283](https://github.com/Antartida3D/Antartida3D/issues/283). El pedido consta en la sesión de trabajo del 17 de noviembre de 2026.
- `AGENTS.md`, sección «Estilo visual».
- [DEC-234](DEC-234-componentes-de-interfaz.md): componentes de interfaz con una sola definición.

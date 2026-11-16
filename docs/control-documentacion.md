# Control de documentación por PR

Cada PR declara su impacto documental. Un cambio está completo cuando la documentación afectada describe el resultado y las decisiones anteriores que modifica quedan explícitamente reemplazadas. La regla se aplica al equipo y a sus agentes.

Este control se incorpora en el [issue #109](https://github.com/Antartida3D/Antartida3D/issues/109). Su decisión está en [DEC-109](decisiones/DEC-109-control-documentacion.md). El registro histórico permanece en [decisiones.md](decisiones.md); su revisión completa queda fuera de este cambio.

## Qué registrar

| Cambio | Registro exigido |
|---|---|
| Comportamiento visible, instalación o uso | Actualizar los documentos que lo describen en el mismo PR. |
| Decisión de arquitectura, diseño, alcance o proceso | Crear un registro breve en `docs/decisiones/`, con motivos y referencias. |
| Información científica o recurso de terceros | Actualizar las fuentes, fecha de consulta y licencia cuando corresponda. |
| Arreglo interno sin impacto documental | Justificarlo en el PR; otra persona revisa la excepción. |

Revisar lo ya documentado antes de cambiar el código. Si una explicación deja de ser cierta, corregirla en el mismo PR; agregar una nota al final no sustituye esa corrección. El autor prepara la documentación y quien revisa contrasta el resultado con el cambio. Las ideas exploratorias conservan el estado de propuesta hasta que haya una decisión humana explícita.

## Declaración del PR

La [plantilla](../.github/PULL_REQUEST_TEMPLATE.md) incluye un bloque JSON entre los marcadores `documentation:start` y `documentation:end`. Debe existir una sola declaración.

| Campo | Contenido |
|---|---|
| `impact` | `updated` si se actualizó documentación; `none` si no hay impacto. El valor inicial `pending` falla. |
| `documents` | Rutas Markdown desde la raíz, existentes y modificadas en el PR. |
| `decisions` | IDs de todas las decisiones nuevas o modificadas, incluidos los registros reemplazados. Puede estar vacío si no se tomó una decisión. |
| `reason` | Explicación del impacto o justificación de la excepción. No dejar vacía ni con un marcador para completar. |

Con `none`, ambas listas quedan vacías. Una declaración correcta en formato no acredita por sí sola que la excepción sea válida: la aprueba otra persona al revisar el PR. No se exige una entrada de decisión por cada commit ni por cada arreglo.

## Formato de las decisiones nuevas

Un archivo por decisión, con nombre como `docs/decisiones/DEC-109-control-documentacion.md`. El ID usa el número de issue; si hay varias decisiones en ese issue, usar `DEC-109-2`, `DEC-109-3`, etc. Incluir metadatos JSON y secciones `Decisión`, `Motivo` y `Referencias`, con contenido real.

```json
{
  "id": "DEC-109",
  "date": "2026-11-14",
  "status": "accepted",
  "issue": 109,
  "supersedes": [],
  "supersededBy": null
}
```

El ejemplo corresponde a DEC-109; cada registro nuevo usa su propio issue y fecha. Los estados son:

- `proposed`: alternativa pendiente de acuerdo.
- `accepted`: decisión acordada. Indicar en Referencias dónde consta el acuerdo.
- `superseded`: decisión que otra reemplazó; `supersededBy` apunta al nuevo ID.
- `rejected`: propuesta descartada, con su motivo.

Al aceptar una decisión que reemplaza a otra, la nueva lista el ID anterior en `supersedes`; la anterior pasa a `superseded` y apunta a la nueva. El control exige ambos extremos y rechaza ciclos, identificadores duplicados y registros eliminados. Una propuesta puede anticipar qué reemplazaría sin cambiar aún la vigencia de la decisión anterior. Las decisiones aceptadas no se convierten después en propuestas o descartes: se conserva el registro y se crea el reemplazo.

No inventar un ID ni una aprobación para antecedentes del documento histórico. Si una decisión nueva cambia uno de esos antecedentes, citar su sección y marcarla como reemplazada en el mismo PR. Los campos de reemplazo entre IDs solo se usan para registros que ya existen en el formato nuevo. La revisión humana confirma las referencias al historial anterior.

## Comprobación local

Guardar el cuerpo que se usará en el PR en un archivo fuera del repositorio, por ejemplo `/tmp/antartida-pr.md`, y ejecutar desde la raíz:

```sh
pnpm docs:test
pnpm docs:check --body-file /tmp/antartida-pr.md --base origin/main
```

También se puede usar Node directamente, sin instalar dependencias:

```sh
node --test scripts/docs/check.test.mjs
node scripts/docs/check.mjs --body-file /tmp/antartida-pr.md --base origin/main
```

Por defecto se incluye el árbol de trabajo y sus archivos nuevos no ignorados. Para revisar un commit exacto, agregar `--head <sha>`. En la comprobación local se compara con el ancestro común de la base y la rama. En GitHub, el workflow compara la base actual del evento con `GITHUB_SHA`, el commit integrado que dejó `actions/checkout` en el árbol; así detecta destinos borrados por `main` y no atribuye al PR decisiones que ya estaban en la base.

## Comprobación en GitHub

El [workflow](../.github/workflows/documentacion.yml) crea la comprobación **Impacto documental** en cada apertura, reapertura, actualización del código o edición del PR, y al marcarlo listo para revisión. Corre también en borradores y no usa filtros por archivos. Ejecuta las pruebas del validador y lee el cuerpo del PR desde el JSON del evento, sin interpolarlo en comandos. Solo necesita permiso de lectura del repositorio, no instala dependencias del proyecto y no usa secretos.

Para hacerla obligatoria, un administrador debe, después de integrar el workflow y comprobar su primera ejecución:

1. Configurar una regla para `main` que exija PR y al menos una aprobación de otra persona.
2. Exigir la comprobación **Impacto documental**, seleccionando GitHub Actions como origen.
3. Invalidar aprobaciones anteriores cuando cambie el código revisado y restringir las excepciones a las reglas según la política del equipo.
4. Confirmar con un PR de prueba que una declaración ausente bloquea la integración y una declaración válida permite continuar la revisión.

Guardar el archivo YAML no activa por sí solo esa protección. Hasta que se configure y se pruebe el requisito remoto, el control está preparado para ejecutarse, pero no se debe afirmar que bloquea merges. Referencia: [protección de ramas de GitHub](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches), GitHub Docs, consultado el 14 de noviembre de 2026.

## Alcance de la verificación

El control valida estructura, fechas, relaciones de reemplazo, documentos declarados y enlaces locales Markdown simples, imágenes y definiciones de enlaces de referencia. Detecta enlaces nuevos inválidos y destinos que este PR elimina, incluso si quien los enlaza no cambia. Ignora los bloques de código, las URLs externas y las anclas de sección; no interpreta todo CommonMark ni valida contenido científico. Los enlaces que ya estaban rotos en la base no bloquean PRs ajenos a esa deuda.

La revisión humana confirma la coherencia entre código y documentos, la aprobación de decisiones, la autenticidad de las fuentes y las excepciones sin impacto. Revisar especialmente cambios al propio workflow o validador: el control automático no puede sustituir la revisión de sus reglas.

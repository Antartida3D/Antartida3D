# DEC-7-2: El material de consulta de la familia Olivero no se sube al repositorio

```json
{
  "id": "DEC-7-2",
  "date": "2026-11-16",
  "status": "accepted",
  "issue": 7,
  "supersedes": [],
  "supersededBy": null
}
```

## Decisión

La carpeta `Documentation/` (publicaciones científicas, números de La Lupa, la presentación de Eduardo Olivero y fotos familiares) queda solo en la computadora de quien la usa y está en `.gitignore`. Al repositorio llegan únicamente las fotos elegidas, convertidas y con su crédito, y las citas y referencias de `docs/expediciones/fosiles-fuentes.md`.

## Motivo

El repositorio es público. Las publicaciones tienen derechos de autor y el documento de fuentes ya indicaba que esas copias están «fuera del repo» y no se redistribuyen. Las fotos familiares están autorizadas para el proyecto, no la carpeta completa. Además, la carpeta pesa 309 MB y quedaría para siempre en el historial de git de todo el equipo.

## Referencias

- [Issue #7](https://github.com/Antartida3D/Antartida3D/issues/7) y [PR #195](https://github.com/Antartida3D/Antartida3D/pull/195): quien lleva el issue acordó dejarla local; se quitó del historial de la rama antes del PR.
- `docs/expediciones/fosiles-fuentes.md`: qué se consultó de cada material y con qué permiso.

# Investigación low-poly archivada

Estado al 14 de noviembre de 2026: se conserva el estilo voxel en Antartida3D. Esta prueba queda archivada como referencia para una posible revisión futura; no se integra en la aplicación ni establece una migración pendiente.

## Archivo completo

- [Descargar modelos, informes y mediciones](concepto-pinguino-lowpoly-archivado-2026-11-14.zip).
- [SHA-256 del ZIP](concepto-pinguino-lowpoly-archivado-2026-11-14.zip.sha256).
- [Issue de conservación #104](https://github.com/Roolivero/Antartida3D/issues/104).

El ZIP conserva sin cambios los 40 archivos producidos por la tarea de investigación, incluido su manifiesto de integridad. Para consultarlo, extraerlo y abrir `pinguino-lowpoly/ARCHIVADO.md`, que contiene la decisión original y enlaces relativos a los materiales.

Incluye las escenas de Blender, modelos GLB, la comparación visual, referencias, informes de rendimiento y optimización, resultados crudos, scripts y verificaciones. Los archivos de la prueba se preservan como registro histórico: las recomendaciones exploratorias que contienen no sustituyen la decisión de mantener voxels.

## Resultado de la exploración

La prueba comparó el pingüino voxel actual con una propuesta low-poly y una versión optimizada. El voxel siguió siendo más rápido en las mediciones aisladas; la optimización redujo el costo del low-poly respecto de su primera versión. Los informes detallan el protocolo, el equipo y las diferencias de geometría, materiales, peso y tiempo de dibujo. No se trata de una comparación universal entre estilos ni de una medición de FPS del juego completo.

El código de referencia de la investigación corresponde al commit `19b3a7b5d564d38588c757e1db1524d707c8819a`, registrado dentro del paquete en `benchmark/source-provenance.json`. Las mediciones se conservan tal como se obtuvieron; no se repitieron para este archivo.

## Recuperación futura

1. Verificar el ZIP con `sha256sum -c concepto-pinguino-lowpoly-archivado-2026-11-14.zip.sha256`.
2. Extraer el paquete y consultar `pinguino-lowpoly/ARCHIVADO.md`.
3. Dentro de `pinguino-lowpoly`, verificar los archivos con `sha256sum -c MANIFEST-SHA256.txt`.
4. Antes de ejecutar scripts, revisar las rutas absolutas al equipo original y las dependencias registradas en los informes. Para retomar el concepto, abrir una investigación nueva y medirlo dentro de la aplicación.

Los originales se guardaron fuera del repositorio durante la exploración. Sus referencias a esa ubicación describen el contexto original; este commit conserva una copia íntegra del paquete en Git.

## Procedencia y asistencia de IA

El modelado, la optimización, los informes y su conservación se realizaron con asistencia de Codex y Blender MCP. Los modelos son propuestas estilizadas, no reconstrucciones científicas medidas. Las fotografías citadas se consultaron como referencia visual y no se incluyen ni se redistribuyen en el paquete. Sus créditos, fechas de consulta y el estado de las licencias están registrados en `Referencias.txt`; la licencia de distribución del modelo propio queda pendiente de decisión del proyecto.

Esta rama se conserva como archivo. No se abre un PR ni se realiza un merge a `main`.

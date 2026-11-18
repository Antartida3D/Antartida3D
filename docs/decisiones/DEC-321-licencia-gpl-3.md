# DEC-321: el proyecto se publica con la licencia GPL versión 3

```json
{
  "id": "DEC-321",
  "date": "2026-11-18",
  "status": "accepted",
  "issue": 321,
  "supersedes": [],
  "supersededBy": null
}
```

## Decisión

1. El código y el material propio del repositorio se publican con la Licencia Pública General de GNU, versión 3 (`GPL-3.0-only`). El texto oficial está en el archivo `LICENSE` de la raíz, sin cambios.
2. El titular de los derechos es el Equipo DOT ENV: las personas que figuran en «Integrantes» del `README.md`.
3. El material propio es el código fuente, los textos de la aplicación, los modelos de bloques y low-poly, las ilustraciones y la documentación.
4. La licencia no cubre el material de terceros. La sección «Licencia» del `README.md` lista las exclusiones:
   - los datos y recursos de terceros, que conservan su licencia y su atribución;
   - las fotografías del archivo de E. B. Olivero, autorizadas por la familia solo para este proyecto;
   - las fotografías de la expedición Poncho, con autorización pendiente;
   - las librerías y las tipografías, que mantienen su licencia.
5. No se agrega una licencia Creative Commons separada para los contenidos, ni un encabezado de licencia en cada archivo fuente.

## Motivo

El repositorio es público y no tenía licencia. Sin licencia, nadie puede reutilizar el proyecto de forma legal, y eso contradice el eje «Ciencia y Conocimiento Abierto».

El equipo quería publicar el proyecto y, al mismo tiempo, evitar que otra persona se lo apropie. Se compararon tres opciones:

- **Sin licencia:** protege todo, pero no permite reutilizar nada y no cumple «licencia abierta».
- **MIT:** permite todo, incluso cerrar el código y venderlo. Solo exige conservar el aviso de autoría.
- **GPL versión 3:** permite usar, modificar y redistribuir, pero obliga a publicar las versiones modificadas con la misma licencia. Nadie puede tomar el proyecto y cerrarlo.

Se eligió la GPL versión 3 porque es la única de las tres que es abierta y además impide la apropiación. Las librerías del proyecto tienen licencia MIT y las tipografías tienen la SIL Open Font License 1.1; las dos son compatibles con la GPL versión 3.

Se usa «solo la versión 3» (`GPL-3.0-only`) y no «versión 3 o posterior», para que el equipo decida de forma explícita si adopta una versión futura.

## Referencias

- [Issue #321](https://github.com/Antartida3D/Antartida3D/issues/321). La persona que lleva el issue eligió la licencia en la sesión de trabajo del 18 de noviembre de 2026, después de comparar las tres opciones. El resto del equipo confirma el acuerdo en la revisión del PR, porque las cinco personas son coautoras.
- Bases de la hackatón SoberaníaTech, publicadas por la organización (AITF). URL: [https://soberaniatech.com.ar/bases](https://soberaniatech.com.ar/bases). Fecha de consulta: 18 de noviembre de 2026.
  - Cláusula 8.3: el criterio «Accesibilidad, apertura y documentación» (10 puntos) evalúa «Diseño accesible, licencia abierta, README completo, reutilizable».
  - Cláusula 9.1: «La autoría de cada proyecto corresponde a los integrantes de su equipo, conforme a la Ley 11.723.»
  - Cláusula 9.3: «Se recomienda publicar el código con licencias libres (por ejemplo GPL-3.0 o MIT)».
- Texto de la licencia: Free Software Foundation, [https://www.gnu.org/licenses/gpl-3.0.txt](https://www.gnu.org/licenses/gpl-3.0.txt). Se obtuvo el 18 de noviembre de 2026 desde la API de licencias de GitHub (`licenses/gpl-3.0`), porque la descarga directa desde gnu.org falló.
- Permisos de las fotografías: [`docs/expediciones/fosiles-fuentes.md`](../expediciones/fosiles-fuentes.md), [`docs/expediciones/base-marambio.md`](../expediciones/base-marambio.md) y [`docs/expediciones/poncho-fuentes.md`](../expediciones/poncho-fuentes.md).

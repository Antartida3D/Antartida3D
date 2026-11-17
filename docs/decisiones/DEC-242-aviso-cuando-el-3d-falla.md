# DEC-242: cuando el 3D falla, un aviso en vez de la página en blanco

```json
{
  "id": "DEC-242",
  "date": "2026-11-16",
  "status": "accepted",
  "issue": 242,
  "supersedes": [],
  "supersededBy": null
}
```

## Decisión

1. Todo lienzo 3D va dentro de `CanvasGuard` (`packages/react-ui/src/CanvasGuard.tsx`). Son siete: el mapa, la vista previa de modelos, el diorama de Poncho, Fósiles, Océano, Marambio y Orcadas. Si un lienzo no puede dibujar, la guarda lo quita y el resto de la aplicación sigue montado.
2. Cada pantalla pasa al respaldo que ya tenía:
   - mapa: informa el error en `map3dLoadingStore` y la aplicación pasa sola al mapa 2D (DEC-227);
   - Orcadas y Marambio: el dibujo;
   - Fósiles: las fotografías; Océano: el texto y el diagrama;
   - diorama de Poncho: la tarjeta común del hito;
   - vista previa de un modelo: el recuadro queda vacío.
3. La aplicación muestra un aviso (`Failed3DNotice`, `role="alert"`) que dice que el 3D no se pudo mostrar y qué hacer: recargar la página, o probar con otro navegador o dispositivo. Tiene dos botones, «Entendido» y «Recargar la página» (el primario, a la derecha). No bloquea la interfaz. Con el foco en el aviso, Escape también lo cierra.
4. El aviso aparece una vez por carga de página, ante cualquiera de estos casos: un lienzo que falla, o un error de carga del mapa 3D (malla, texturas, módulo o pérdida del contexto WebGL). En el mapa espera a que se cierre la pantalla de carga, que ya muestra el error mientras está abierta.
5. El texto del aviso no nombra el mapa 2D. Dice «la aplicación sigue con una vista más simple», para que siga siendo cierto si el mapa 2D se quita.

## Motivo

El 16 de noviembre de 2026 se reprodujo una página totalmente en blanco: el navegador rechazó el contexto WebGL después de que la aplicación arrancó, el lienzo lanzó un error al montarse y, como no había ningún límite de errores, React desmontó toda la aplicación. La comprobación `canUseWebGL()` del arranque no cubre ese caso, porque en ese momento WebGL sí funcionaba.

El respaldo a 2D solo no alcanza: el equipo evalúa quitar el mapa 2D, y hasta ahora la falla solo se explicaba si la persona tocaba «Relieve 3D · apagado». Por eso el aviso se muestra solo.

## Pendiente

- Si se quita el mapa 2D, definir qué muestra el mapa cuando el 3D falla y revisar la frase «Puedes continuar con el mapa 2D» de la pantalla de carga y la nota de «Relieve 3D · apagado».
- No se investigó por qué el Chrome de prueba con placa de video pierde el contexto a 1440 px.

## Referencias

- [Issue #242](https://github.com/Antartida3D/Antartida3D/issues/242): reproducción, causa y criterios de aceptación.
- [DEC-227](DEC-227-mapa-2d-deshabilitado.md): el mapa 2D como respaldo automático. Sigue vigente; esta decisión le suma el aviso.
- Regla `.agents/rules/core/05-error-handling-and-logging.md`, punto 3.
- Prueba: `packages/e2e/tests/webgl-failure.spec.ts`.

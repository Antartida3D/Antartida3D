# DEC-331: caché larga de `/assets/` y Web Analytics de Vercel

```json
{
  "id": "DEC-331",
  "date": "2026-11-18",
  "status": "accepted",
  "issue": 331,
  "supersedes": [],
  "supersededBy": null
}
```

## Decisión

1. `vercel.json`, en la raíz del repositorio, manda `Cache-Control: public, max-age=31536000, immutable` en todo `/assets/`. Esa es la carpeta donde Vite deja el JS, el CSS, las texturas, las mallas y las fuentes, con un hash en el nombre. `index.html` conserva el valor por defecto de Vercel (`public, max-age=0, must-revalidate`), así que un deploy nuevo se ve en la siguiente carga.
2. El sitio usa Web Analytics de Vercel, con el fragmento HTML de la documentación y sin instalar `@vercel/analytics`. Un plugin de `apps/dibujado/vite.config.ts` agrega el script a `index.html` solo cuando el build corre en Vercel (`VERCEL=1`).

## Motivo

- La aplicación es estática y Vercel la sirve desde su CDN, así que el plan Hobby no limita cómputo. Pesan el tamaño de cada visita (unos 15 MB en escritorio, unos 5 a 6 MB en celular) y la red del lugar cuando muchas personas entran a la vez.
- Con `max-age=0`, el navegador vuelve a consultar cada archivo de `/assets/` en cada visita. Como el nombre cambia con el contenido, guardarlos un año no deja versiones viejas. Las recargas y las visitas repetidas ya no consultan la red, y bajan los pedidos a la CDN, que el plan Hobby limita a 1.000.000 por mes. La primera visita pesa lo mismo.
- Web Analytics permite saber cuántas personas entran durante la presentación. El plan Hobby incluye 50.000 eventos por mes.
- El script de Analytics solo existe en los deploys de Vercel. En `pnpm preview`, y por lo tanto en los e2e, el pedido fallaría, y los e2e fallan ante cualquier error de consola (regla 05). Por eso el build local no lo incluye.
- Con el fragmento HTML no hace falta ninguna dependencia nueva. La documentación aclara que ese fragmento no registra cambios de ruta. La aplicación no cambia de URL al navegar (`history.pushState` se usa con la misma URL para el botón atrás), así que se cuenta una visita por carga.

## Referencias

- [Issue #331](https://github.com/Antartida3D/Antartida3D/issues/331). Quien lleva el issue pidió los cambios el 18 de noviembre de 2026 y activó Web Analytics en el panel de Vercel.
- Vercel, «Hobby Plan». URL: [https://vercel.com/docs/plans/hobby](https://vercel.com/docs/plans/hobby). Fecha de consulta: 18 de noviembre de 2026. Límites incluidos: 100 GB de Fast Data Transfer, 1.000.000 de CDN Requests y 50.000 eventos de Web Analytics por mes.
- Vercel, «Cache-Control headers». URL: [https://vercel.com/docs/caching/cache-control-headers](https://vercel.com/docs/caching/cache-control-headers). Fecha de consulta: 18 de noviembre de 2026. Valor por defecto `public, max-age=0, must-revalidate`, y `max-age=31536000, immutable` recomendado para archivos con hash.
- Vercel, «Static Configuration with vercel.json», sección `headers`. URL: [https://vercel.com/docs/project-configuration/vercel-json](https://vercel.com/docs/project-configuration/vercel-json). Fecha de consulta: 18 de noviembre de 2026. Ejemplo con `"source": "/assets/(.*)"`.
- Vercel, «Getting started with Vercel Web Analytics». URL: [https://vercel.com/docs/analytics/quickstart](https://vercel.com/docs/analytics/quickstart). Fecha de consulta: 18 de noviembre de 2026. Fragmento HTML («no route support») y rutas `/_vercel/insights/*`, que se agregan después del siguiente deploy.
- Vercel, «System environment variables». URL: [https://vercel.com/docs/environment-variables/system-environment-variables](https://vercel.com/docs/environment-variables/system-environment-variables). Fecha de consulta: 18 de noviembre de 2026. `VERCEL=1` en los deploys.
- Configuración del proyecto `antartida3d` en Vercel (`vercel project inspect`, 18 de noviembre de 2026): Root Directory `.`, salida `apps/dibujado/dist`. Por eso `vercel.json` va en la raíz.

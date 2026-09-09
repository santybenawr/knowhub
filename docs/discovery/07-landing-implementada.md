# Landing de prelanzamiento — implementación y validación

**Fecha:** 8 de septiembre de 2026. **Rama:** `codex/knowhub-discovery-landing`.

## Decisión y autorización

El propietario autorizó construir y publicar en Vercel y aclaró que la app no tiene URL pública: busca generar expectativa antes de su lanzamiento. Se implementó la enmienda de la spec 0009. La presentación utiliza «Explorar demo», «Próximamente» y ninguna fecha, precio, lista de espera o registro simulado.

## Implementación real

- Campaña oscura en violeta y ámbar, Inter y logo existente. La paleta está acotada a marketing; no escribe la preferencia de tema del usuario.
- Hero con escultura original de cristal y elementos flotantes. Entradas por scroll nativo, pausa, reducción dinámica de movimiento y pausa con pestaña oculta o escena fuera de pantalla.
- Tres entradas de conocimiento: documentos, notas y reuniones. Demo explícitamente ficticia del Proyecto Omega: pregunta, respuesta, cita y fragmento 01:38 de Santiago. Sin IA en vivo ni audio simulado.
- FAQ con HTML `details` utilizable sin JavaScript. Alternativa `noscript` de la respuesta y fuente, y narrativa presente en HTML.
- Componentes compartidos de marketing en la app y una entrada de exportación estática en `marketing/`. Los servidores, datos, autenticación y funciones privadas no se modifican.
- Documentos legales específicos de la presentación; los borradores legales del servicio permanecen intactos.

## Evidencia de validación

| Control | Resultado |
| --- | --- |
| `pnpm verify` | Correcto: lint, tipos, 150 pruebas en 18 archivos y build completo de la app. |
| `pnpm build:landing` | Correcto: `/`, `/privacy`, `/terms`, 404 y assets estáticos. |
| Lint y tipos después de añadir los E2E | Correctos. |
| 4 nuevos E2E de landing | Preparados y ejecutados, pero Chromium no pudo iniciar. Los cuatro fallan a 0 ms por `MachPortRendezvousServer: Permission denied (1100)`, antes de evaluar el sitio. No se presentan como aprobados. |
| Navegador integrado | Pregunta → respuesta → cita; foco sobre el título del fragmento; reinicio; pausa (`animation-play-state: paused`); apertura de FAQ; navegación a privacidad, términos y regreso al inicio. |
| Responsive | Sin desbordamiento horizontal observado en 320, 390, 768 y 1440 px. |
| Consola del navegador integrado | Sin errores ni advertencias observados durante la revisión. |
| HTML exportado | Un H1; alternativa noscript; sin enlaces de cuenta/ingreso; sin video ni endpoints de aplicación. |
| Git | `git diff --check` correcto. La rama remota permanecía en `aa18d022` al comprobarla. |

Los resultados corresponden a esta implementación local, no a transcripción o proveedores reales. La validación de movimiento reducido dinámico, JavaScript desactivado y zoom 200% está cubierta por código y casos preparados; no se presenta como una prueba completa de navegador ejecutada.

## Peso y rendimiento

Exportación inicial: 50 archivos, aproximadamente 1,40 MB en disco para todas las rutas. Imagen hero: 54.800 bytes. JS inicial, incluido el runtime de Next/React: aproximadamente 198 KB gzip. CSS inicial: aproximadamente 17 KB gzip. Los valores exactos se guardan con la entrega.

No se instaló un motor de animación ni una biblioteca nueva. El presupuesto propuesto de 40 KB de JS adicional requiere comparación contra un build base equivalente: no confundirlo con los 198 KB del runtime completo. No se ejecutó Lighthouse con tres condiciones móviles controladas, por lo que no se certifican LCP, CLS o INP. El INP de campo requerirá tráfico real.

## Arte y procedencia

Una generación original con `image_gen__imagegen`, 8 de septiembre de 2026. Imagen cuadrada 1254 × 1254; escultura de tres lóbulos de vidrio ahumado, iluminación violeta y pequeño reflejo ámbar, sin texto ni datos privados. Se optimizó a WebP de 960 × 960. No se utilizó Higgsfield en esta ejecución ni se incluyó material de terceros.

## Publicación

Publicada en **https://knowhub-prelaunch.vercel.app** el 8 de septiembre de 2026, en el proyecto `knowhub-prelaunch` del equipo `Sacramented`. Tras renovar la sesión, el propietario indicó continuar. Vercel confirmó `READY` para el despliegue `dpl_A2DPV7HqPHYNnB2jUcKv7zVqL13o`.

Verificación sin credenciales: portada, privacidad, términos, fuentes, imagen y scripts responden 200; `/signup` y `/api/health` responden 404 como corresponde a esta presentación sin backend. El HTML y los assets coinciden con la exportación local, salvo el runtime Turbopack al que Vercel añade su bootstrap de Toolbar (439 caracteres, condicionado a la cookie de activación `__vercel_toolbar=1`). Se verificó que el contenido original completo permanece como prefijo.

En el navegador público se comprobó pregunta → respuesta → cita con la tecla Enter; el foco llega a «Aquí quedó la decisión», con fuente de Santiago en 01:38. Sin errores ni advertencias de consola observados.

## Conexión GitHub → Vercel — 2026-09-09

El repositorio privado existente `santybenawr/knowhub` quedó conectado al proyecto Vercel. Se subió la rama `codex/knowhub-discovery-landing` y se seleccionó como producción. `main` mantiene `aa18d022367c55c903f6caa8e9b90b485217829f`. La guía `marketing/README.md` registra los ajustes efectivos: raíz `marketing`, acceso al código compartido, instalación con Corepack/pnpm y salida estática `out`.

Prueba completa: el push de `015f3ede36cfae091dc43b1cf6da8153bc1eeee9` produjo automáticamente `dpl_2mYnkpA22yAwivRZn84h4jdmbjCJ` (`source: git`, `target: production`, `READY`). Vercel asignó `knowhub-prelaunch.vercel.app` a ese despliegue. Se verificaron HTTP 200 en portada, legales, imagen, icono, CSS y scripts; H1 único, CTA y cabeceras de seguridad conservados; `/signup` y `/api/health` devuelven 404. El filtro de ramas se comprobó con la rama de producción, `main`, otra rama y ausencia de rama.

Esta ampliación cambia configuración de publicación y documentación, sin alterar interfaz ni código de la app. La compilación remota pasó; no se repitieron las suites de lógica ni E2E por este cambio. Los límites de validación anteriores permanecen documentados.

## Reversión y mantenimiento

Revertir los cambios de marketing mediante Git no requiere operaciones sobre la base de datos. Para editar contenido, usar los componentes compartidos y ejecutar `pnpm build:landing`. La entrada pública importa los mismos componentes; no es una copia independiente de la landing. Ver `marketing/README.md`.

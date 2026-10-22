# KnowHub: demo pública académica

## Alcance

La aplicación completa sigue en `src/`. `demo-web/` es un recorrido interactivo estático con el mismo diseño y ejemplos ficticios, destinado a la exposición. No es el despliegue del backend ni una prueba de proveedores de IA reales.

- Inicio, biblioteca, filtros, proyectos y búsqueda de texto.
- Crear, editar, asignar y borrar notas de la sesión.
- Añadir copias de un documento y una reunión de ejemplo.
- Resumen preparado, decisiones, pendientes con casillas y navegación a fragmentos de la transcripción.
- Consultas por palabras clave con citas literales y abstención cuando no hay suficiente coincidencia. No hay comprensión semántica ni validación de hechos externos.
- Alias ficticio, tema claro/oscuro, guía y reinicio.
- Estado versionado y validado con Zod en `sessionStorage`. No se envían notas o preguntas a un servidor. Cerrar una pestaña normalmente termina la sesión; una restauración del navegador puede recuperarla. El reinicio elimina los cambios explícitamente.

Los ejemplos de fechas y participantes están preparados para el 20 de octubre de 2026; no son transcripciones de personas reales. Las funciones de cuenta, miembros, audio, archivos reales, IA y facturación requieren el backend y no están habilitadas aquí.

## Archivos

- `demo-web/app/`: navegación, pantallas, estilos y metadatos.
- `demo-web/lib/data.ts`: ejemplos, esquema y recuperación de fragmentos.
- `demo-web/lib/store.ts`: sesión, persistencia y reinicio.
- `demo-web/vercel.json`: cabeceras y configuración estática.
- `scripts/build-demo-web.mjs`: compilación aislada y preparación de la exportación.
- `scripts/serve-demo-web.mjs`: servidor local para revisar la exportación.
- `demo-web/e2e/demo.spec.ts`: recorridos en escritorio y móvil.
- `tests/unit/public-demo.test.ts`: evidencia, abstención, ámbito y validación de sesión.

## Compilar y verificar

Desde la raíz del repositorio:

```sh
npm run build:demo:web
npm run lint
npm run typecheck
npm test
npm run test:demo:web
```

No se requiere `.env`. La compilación usa los paquetes existentes. El servidor local de pruebas usa Node para evitar los bloqueos de descargas paralelas observados con el servidor básico de Python. El contenido interactivo espera a la inicialización del cliente antes de mostrarse.

## Publicar

El proyecto de destino es `sacramented/knowhub-demo-mvp`; no usar el proyecto `knowhub-prelaunch` de la landing. El artefacto a publicar es exclusivamente `demo-web/out/`.

```sh
npm run build:demo:web
vercel link --yes --project knowhub-demo-mvp --scope sacramented --cwd demo-web
npm run build:demo:web
vercel project inspect --scope sacramented --cwd demo-web/out
vercel deploy --prod --yes --scope sacramented --cwd demo-web/out
```

El enlace de Vercel puede crear un `.env.local` con un token de desarrollo. No debe copiarse al sitio. El script conserva solamente el identificador de proyecto de `.vercel/project.json`, elimina un `.env.local` en la exportación si existe y genera `.vercelignore` para excluir `.env*`, `.vercel` y `.git`.

Verificar el alias público sin cookies ni credenciales, y ejecutar:

```sh
DEMO_BASE_URL=https://knowhub-demo-mvp.vercel.app npm run test:demo:web
```

## Recorrido recomendado

1. Abrir el inicio y «Explorar reunión».
2. Entrar en «Decisiones» y «Ver fuente · 01:38».
3. Marcar una tarea en «Pendientes».
4. Preguntar «¿Qué proveedor vamos a seleccionar?» y abrir una fuente.
5. Preguntar «¿Cuál es la temperatura de Neptuno?» y comprobar la abstención.
6. Crear una nota ficticia y localizarla en «Buscar».
7. Pulsar «Reiniciar demo» para volver al ejemplo inicial.

## Publicación verificada — 20 de octubre de 2026

- URL pública: https://knowhub-demo-mvp.vercel.app
- Despliegue: `dpl_HgfJCL1znH7R7xEPB4Pp7LSouNGJ`, estado `READY`, alias de producción asignado.
- HTTP 200 sin autenticación. `.env.local` y `.vercel/project.json` devuelven 404. CSP, Permissions-Policy y noindex presentes.
- Lint, TypeScript, compilación estática y `git diff --check`: correctos. Suite general: 211 pruebas en 26 archivos. Tras ajustar el orden de evidencia, las 4 pruebas específicas de la demo volvieron a pasar.
- Recorrido local de escritorio y móvil: 10/10 pruebas correctas. En la última ejecución contra el alias público: 8/10 correctas; dos casos de escritorio no llegaron a ejecutar sus interacciones porque la carga inicial agotó el tiempo disponible (uno esperando la pantalla inicial; otro esperando la carga de la URL). En una comprobación independiente HTTPS también se observó un timeout de conexión. No se afirma que la suite remota pasó completa.
- Revisión manual de la versión final publicada: inicio, consulta del proveedor con evidencia literal, fuente 01:38 y navegación a la transcripción. Consola sin errores ni advertencias durante ese recorrido.
- La carga de audio, cuentas, miembros, archivos personales, pagos y proveedores reales quedan fuera de esta demo por diseño.

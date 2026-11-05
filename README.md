# KnowHub

**Transforma información en conocimiento.**

KnowHub captura lo que lees, escribes y escuchas, y lo convierte en conocimiento
que puedes recuperar cuando lo necesitas — siempre con la fuente a un clic.

---

## Overview

KnowHub organiza documentos, notas y transcripciones de reuniones en una
biblioteca consultable, con respuestas enlazadas a sus fuentes.

La **beta pública** se publicó en
[knowhub-app-sacramented.vercel.app](https://knowhub-app-sacramented.vercel.app).
Su alcance actual es registro abierto, cuentas personales, archivos de hasta
4 MiB, notas y transcripciones pegadas. Usa respuestas extractivas por palabras;
**no tiene IA externa, transcripción de audio, correos ni pagos activados**.

La revisión del 05/11/2026 añade correcciones operativas, guía de registro y
ayuda en `/help`. El estado de validación, la incidencia remota y la publicación
de esta revisión se registran en [la auditoría actual](docs/mvp-audit-2026-11-05.md).
El [registro del lanzamiento inicial](docs/public-beta-launch.md) conserva la
evidencia de octubre; no acredita por sí solo la disponibilidad actual.

## MVP de presentación · septiembre de 2026

Para preparar una demo local aislada: `npm run demo:prepare` y después `npm run demo`.
Abrir `http://127.0.0.1:3010/login` con `demo@knowhub.test` / `knowhub-demo-2026`.
Usa datos ficticios, PGlite y almacenamiento propios dentro de `.data/presentation`.
Los proveedores de IA/transcripción son mock explícitos: subir audio en ese perfil
produce una transcripción de ejemplo, no reconoce lo dicho en el archivo.
La importación de transcripciones conserva el texto aportado por el usuario.
Las respuestas locales seleccionan frases por palabras compartidas con la pregunta.
Si no hay coincidencias, se abstienen: este perfil no comprende sinónimos o paráfrasis
como un modelo de IA conectado. Las citas permiten revisar el texto, pero no
garantizan por sí solas que un fragmento responda completamente a la pregunta.

Ver [auditoría, limitaciones y guion de demo](docs/mvp-audit-2026-09-22.md).
Suscripciones y App Store siguen pendientes. La beta con cuentas, la landing y
esta demo de presentación son entornos independientes.

## Features

### Beta pública con cuentas

- Documentos PDF con texto, DOCX, TXT y Markdown, con límite de 4 MiB.
- Notas con autoguardado y reuniones mediante transcripción pegada.
- Biblioteca, proyectos, filtros combinables y consultas con citas.
- Respuestas extractivas, sin comprensión semántica de un proveedor externo.
- Perfil, apariencia clara/oscura y navegación móvil.

La revisión actual incorpora guía de uso, formatos visibles en la biblioteca,
lectura de TXT en codificaciones habituales, guardado protegido al navegar,
actualización del procesamiento e historial de conversaciones reabrible.
La validación remota de esa revisión sigue el estado de la auditoría actual.

### Capacidades del repositorio fuera del perfil beta

El código también contiene grabación mediante `MediaRecorder`, subida de audio,
adaptadores de IA y transcripción, búsqueda vectorial y workspaces con roles.
Con proveedores locales, audio y respuestas usan ejemplos o reglas explícitas;
la presencia de estos módulos **no significa que los servicios reales estén
configurados o validados**. La beta bloquea grabación/subida de audio e invitaciones.

El procesamiento conserva las fuentes y enlaza decisiones y pendientes a su
evidencia. La identificación de hablantes y los tiempos reales dependen del
proveedor o del texto importado; no se inventan responsables ni fechas.

## Architecture

Monolito modular sobre Next.js 16 (App Router) y PostgreSQL.

```
Documentos ─┐
Notas ──────┼──→ chunks + embeddings ──→ Búsqueda híbrida ──→ RAG ──→ Respuesta + citas
Reuniones ──┘                                                            │
                                                                         └─→ fuente original
```

El desarrollo sigue **Spec-Driven Development**: primero se acuerda qué debe
hacer el producto y por qué, después cómo, después se implementa. Ver
[`specs/README.md`](specs/README.md) y la
[constitución del proyecto](.specify/constitution.md).

Detalle en [`docs/architecture.md`](docs/architecture.md),
[`docs/database.md`](docs/database.md), [`docs/ai.md`](docs/ai.md) y
[`docs/security.md`](docs/security.md).

## Requirements

- Node.js 20.11 o superior (probado en Node 26)
- pnpm 10 o superior
- Nada más. Sin Docker, sin PostgreSQL instalado, sin credenciales.

## Installation

```bash
pnpm install
pnpm db:migrate
pnpm dev
```

Abre la URL que imprime la terminal (por defecto http://localhost:3000) y crea
una cuenta. Para fijar otro puerto:

```bash
PORT=3010 pnpm dev
```

El puerto no está fijado en los scripts a propósito: hacerlo impide que cualquier
herramienta asigne uno libre, y provoca choques cuando hay varios proyectos
corriendo.

Para arrancar con datos de ejemplo:

```bash
ENABLE_DEMO_DATA=true pnpm db:seed
```

Crea la cuenta `demo@knowhub.test` / `knowhub-demo-2026` con un workspace
"Universidad", dos proyectos, dos documentos, una nota y una reunión con
transcripción, decisiones y pendientes ya procesados.

## Environment

Todo es opcional. Con un `.env` vacío KnowHub arranca contra una base de datos
PostgreSQL embebida, almacenamiento local privado y los proveedores locales de
IA. Copia [`.env.example`](.env.example) y completa solo lo que quieras mover a
un servicio real.

Las variables críticas:

| Variable | Efecto |
| --- | --- |
| `DATABASE_URL` | Sin definir: PGlite embebido. Definida: tu PostgreSQL. |
| `AUTH_SECRET` | **Obligatoria en producción** (mínimo 32 caracteres). |
| `OPENAI_API_KEY` | Credencial para IA real; `AI_PROVIDER=mock` mantiene el proveedor local. |
| `TRANSCRIPTION_API_KEY` | Credencial de transcripción; si falta, puede usar `OPENAI_API_KEY`. El proveedor explícito tiene prioridad. |
| `STORAGE_PROVIDER` | `local`, `supabase` o `vercel-blob`; la beta usa Blob privado. |
| `NEXT_PUBLIC_KNOWHUB_BETA` | `true` activa el alcance limitado de la beta al compilar y ejecutar. |
| `DATABASE_AUTO_MIGRATE` | `true` aplica migraciones al iniciar; `false` exige aplicarlas previamente. |
| `ENABLE_DEMO_DATA` | Habilita `pnpm db:seed`. Nunca en producción. |

Nunca expongas al navegador `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`,
`TRANSCRIPTION_API_KEY`, `BLOB_READ_WRITE_TOKEN` ni `STRIPE_SECRET_KEY`.

## Database

PostgreSQL con la extensión `vector`. El esquema vive en
`src/server/db/schema.ts`; las migraciones son módulos TypeScript en
`src/server/db/migrations/`. Se aplican en el primer acceso cuando
`DATABASE_AUTO_MIGRATE=true`; con `false`, el arranque comprueba que ya estén aplicadas.

Sin `DATABASE_URL`, KnowHub usa [PGlite](https://pglite.dev): PostgreSQL real
compilado a WASM, con pgvector y búsqueda de texto completo. No es un mock —
es el mismo SQL y las mismas migraciones que en producción.

Para producción (Supabase o cualquier PostgreSQL 15+):

```bash
DATABASE_URL=postgresql://... pnpm db:migrate
```

La migración `0002_rls` activa Row Level Security y solo se aplica sobre
PostgreSQL real.

## Storage

El audio y los documentos son **privados**. El proveedor local guarda los
archivos fuera de `public/` y los sirve por `/api/storage/[...path]` validando
una firma HMAC con expiración. `SupabaseStorageProvider` usa las URLs firmadas
de Supabase. La beta usa `VercelBlobStorageProvider` sobre un almacén privado.
Las URLs se emiten solo después de verificar pertenencia al workspace y nunca
se persisten como enlaces públicos permanentes.

## Authentication

Registro con nombre, correo y contraseña. Las contraseñas se derivan con scrypt;
las sesiones son opacas y se guardan hasheadas en la base de datos. Al registrarse
se crea automáticamente el workspace personal, en una sola transacción.

La recuperación de contraseña genera un token de un solo uso válido por una hora.
KnowHub no incluye transporte de correo: en desarrollo el enlace se muestra en
pantalla, y en producción debes conectar tu propio servicio de envío.

## Documents

Subida con arrastrar y soltar, validación por *magic bytes* (no por la extensión
ni por el MIME declarado), límite de tamaño configurable. El pipeline extrae el
texto, lo divide en fragmentos preservando la página, genera un resumen y crea
los embeddings. Un PDF escaneado sin capa de texto se rechaza explícitamente:
KnowHub todavía no hace OCR. TXT/Markdown admiten UTF-8, UTF-16 con BOM y
Windows-1252; el contenido binario se rechaza. La biblioteca distingue el formato
y permite combinarlo con el proyecto. Cambiar la extensión no convierte el archivo.

## Notes

Editor con autoguardado. Cada nota se divide e indexa igual que un documento, así
que aparece en la búsqueda y puede citarse en una respuesta. Las notas con solo
título también se indexan; las vacías no quedan esperando un trabajo inexistente.
La navegación por enlaces internos espera el guardado pendiente y el navegador
avisa al cerrar con cambios sin guardar. Las ediciones durante indexación se
agrupan en un trabajo posterior, sin reemplazar el índice con una versión obsoleta.

## Meetings

En la **beta pública**, se crean reuniones pegando una transcripción. Fuera de
ese perfil, el repositorio ofrece tres entradas:

1. **Grabar** desde el navegador.
2. **Subir** una grabación existente.
3. **Importar** una transcripción en texto.

La tercera conserva el texto aportado y puede funcionar sin proveedores externos.
Si no hay tiempos en la transcripción, no representan posiciones reales de audio.
La pantalla consulta el progreso y actualiza los resultados al terminar. Un
reintento de importación reutiliza la reunión ya creada.

### Recording

`getUserMedia` + `MediaRecorder`, con detección del contenedor soportado por el
navegador y captura por fragmentos (`timeslice`), para no mantener horas de audio
en memoria. La lógica vive en una máquina de estados pura
(`src/features/meetings/recording/recorder-machine.ts`) que se prueba sin
hardware. Si el navegador no soporta grabar, la interfaz ofrece subir o importar
en lugar de dejar un botón roto.

Antes de la primera grabación se muestra un aviso: la responsabilidad de obtener
las autorizaciones de los participantes es de quien graba.

### Transcription

`TranscriptionProvider` con adaptador Whisper. Los segmentos guardan
`start_seconds` y `end_seconds` reales. La diarización depende del proveedor:
cuando no la ofrece, la transcripción funciona igual y los hablantes quedan sin
identificar — nunca se inventan.

## AI

`AIProvider` con adaptador OpenAI (texto, salida estructurada validada con Zod,
streaming y embeddings). El análisis de reunión exige que cada decisión,
pendiente y punto clave referencie los segmentos que lo sustentan; los ids que no
existen en la transcripción se descartan antes de guardar.

Sin credenciales se usa un proveedor local determinista: las respuestas son
extractivas sobre la evidencia realmente recuperada y el análisis se obtiene por
reglas sobre la transcripción real. No inventa contenido, y la aplicación lo dice
en pantalla. En producción hay que activarlo explícitamente con `AI_PROVIDER=mock`.

## RAG

```
Pregunta → embedding → búsqueda híbrida (70% semántica / 30% palabras)
  → filtro por workspace → deduplicación → umbral → diversidad
  → contexto acotado → generación → citas
```

Si no hay evidencia suficiente, KnowHub lo dice en lugar de responder con
conocimiento externo. Las conversaciones guardadas se reabren con sus citas;
si su recurso de origen se elimina, el historial sigue siendo consultable pero
la conversación no se amplía silenciosamente a toda la biblioteca.

## Testing

```bash
pnpm test        # Unitarias e integración, sin red ni credenciales
pnpm test:e2e    # Recorridos de navegador con datos aislados
pnpm test:beta   # Perfil beta aislado; KNOWHUB_BETA_URL permite apuntar a remoto
```

Las pruebas de integración corren contra un PostgreSQL en memoria con pgvector,
así que ejercitan el SQL real, incluidas la búsqueda híbrida y las restricciones.

Cubren, entre otros: aislamiento multi-tenant, resistencia a inyección de
prompts, fallos de transcripción/análisis/embeddings, idempotencia del pipeline,
validación de archivos por contenido, permisos por rol y límites de plan.

## Build

```bash
pnpm verify   # lint + typecheck + test + build
```

## Deployment

Para actualizar la beta existente, seguir [public-beta-launch](docs/public-beta-launch.md):
verificar `sacramented/knowhub-app`, reutilizar PostgreSQL y Blob privados,
configurar variables sin exponer secretos, aplicar migraciones pendientes y
preparar un despliegue de producción sin asignar el dominio. Validar primero
registro, persistencia, archivos y aislamiento; promover solo después.

No ejecutar `db:seed` ni `db:reset` en producción. La revisión del 05/11/2026
no añade migraciones. Los resultados de compilación local no sustituyen la
comprobación de la conexión real ni el recorrido remoto.

## Known limitations

- **Grabación en segundo plano en móvil**: no está garantizada. Si se bloquea la
  pantalla o se cambia de aplicación, el navegador puede suspender la captura.
  KnowHub lo advierte durante la grabación en lugar de fingir lo contrario.
- **Diarización**: depende del proveedor de transcripción. Whisper no la ofrece,
  así que los segmentos llegan sin hablante en lugar de con uno inventado.
- **OCR**: un PDF escaneado sin capa de texto se rechaza. No está en el MVP.
- **Correo**: no hay transporte configurado. Recuperación e invitaciones están
  deshabilitadas en la beta; los enlaces en pantalla corresponden al desarrollo.
- **Facturación**: la abstracción existe, pero sin credenciales de Stripe la
  aplicación simplemente no ofrece pagos. No se simulan cobros.
- **Búsqueda multiidioma**: el índice de texto completo usa la configuración
  `spanish`. El contenido mayoritariamente en inglés se indexa con el stemmer
  español.
- **Transcripción en tiempo real** y **asistente durante la reunión**: fuera del
  alcance del MVP; la arquitectura los permite después.
- **Privacidad y términos**: `/privacy` y `/terms` son borradores técnicos y
  requieren revisión jurídica antes de producción.

### Demo pública interactiva (sin servicios externos)

`demo-web/` contiene una exportación estática independiente para compartir el MVP académico. Reutiliza el logo, los botones y los colores de KnowHub. Incluye biblioteca, notas editables, proyectos, búsqueda, consultas con fragmentos y una reunión ficticia con decisiones, pendientes y transcripción. No necesita iniciar sesión.

```bash
npm run build:demo:web
node scripts/serve-demo-web.mjs
# http://127.0.0.1:3012
npm run test:demo:web
```

Los datos iniciales son ficticios. Las ediciones se guardan en `sessionStorage` de cada visitante, sobreviven a una recarga y se pueden restaurar desde «Reiniciar demo». No hay sincronización, cuentas reales, carga de archivos personales, grabación, servicios de IA ni pagos en esta versión. Las consultas buscan coincidencias léxicas y citan texto literal; los resúmenes y las transcripciones están preparados. El navegador puede restaurar su sesión al reabrirse: usar «Reiniciar demo» para borrar explícitamente los cambios.

Se publica **solo `demo-web/out/`**, como proyecto de Vercel `knowhub-demo-mvp`, separado de la landing y del backend del MVP. La configuración aplica CSP y bloquea cámara, micrófono, geolocalización e indexación. El script de compilación excluye archivos `.env*`; no hay que copiar secretos ni bases de datos al sitio. Ver `docs/public-demo.md` para el procedimiento y las pruebas.

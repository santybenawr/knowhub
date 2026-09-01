# KnowHub

**Transforma información en conocimiento.**

KnowHub captura lo que lees, escribes y escuchas, y lo convierte en conocimiento
que puedes recuperar cuando lo necesitas — siempre con la fuente a un clic.

---

## Overview

Guardar información no significa recordarla. KnowHub toma documentos, notas y
grabaciones de reuniones y los convierte en una biblioteca consultable: busca por
palabras o por significado, pregunta en lenguaje natural, y vuelve a la página
del documento o al segundo exacto del audio donde se dijo.

La función insignia son las **reuniones**: grabas, y KnowHub transcribe, separa
hablantes cuando el proveedor lo permite, marca los tiempos, extrae decisiones y
pendientes, y deja todo enlazado a su evidencia.

## Features

**Captura**
- Grabación de reuniones desde el navegador (`MediaRecorder`, con pausa/reanudar)
- Subida de grabaciones existentes (webm, m4a, mp3, wav, ogg, mp4)
- Importación de transcripciones en texto (con o sin marcas de tiempo)
- Documentos: PDF, DOCX, Markdown y texto plano
- Notas con autoguardado

**Comprensión**
- Transcripción con segmentos y timestamps reales
- Renombrado de hablantes sin tocar la transcripción original
- Análisis de reunión: resumen, temas, decisiones, pendientes, preguntas abiertas
- Responsable y fecha **solo si se dijeron** — nunca inventados

**Recuperación**
- Búsqueda híbrida: full-text de PostgreSQL + similitud vectorial (pgvector)
- Preguntar a KnowHub sobre todo el workspace, un proyecto, un documento o una reunión
- Respuestas en streaming, con citas numeradas
- Cada cita abre su evidencia: la página del documento o el audio en el segundo citado
- Contenido relacionado por similitud semántica

**Organización y equipo**
- Workspaces (personal, equipo, educación, empresa) con roles OWNER/ADMIN/MEMBER/VIEWER
- Proyectos que agrupan documentos, notas y reuniones
- Invitaciones por enlace, uso por plan, registro de auditoría
- Modo claro / oscuro / sistema, PWA instalable, diseño móvil propio

## Architecture

Monolito modular sobre Next.js 16 (App Router) y PostgreSQL.

```
Documentos ─┐
Notas ──────┼──→ chunks + embeddings ──→ Búsqueda híbrida ──→ RAG ──→ Respuesta + citas
Reuniones ──┘                                                            │
                                                                         └─→ audio en el segundo citado
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
| `OPENAI_API_KEY` | Activa el proveedor de IA real (análisis, embeddings, respuestas). |
| `TRANSCRIPTION_API_KEY` | Activa la transcripción real. Si falta, usa `OPENAI_API_KEY`. |
| `STORAGE_PROVIDER` | `local` (por defecto) o `supabase`. |
| `ENABLE_DEMO_DATA` | Habilita `pnpm db:seed`. Nunca en producción. |

Nunca expongas al navegador `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`,
`TRANSCRIPTION_API_KEY` ni `STRIPE_SECRET_KEY`.

## Database

PostgreSQL con la extensión `vector`. El esquema vive en
`src/server/db/schema.ts`; las migraciones son módulos TypeScript en
`src/server/db/migrations/` y se aplican solas en el primer acceso.

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
de Supabase. En ambos casos la URL se emite solo después de verificar la
pertenencia al workspace, y nunca se persiste.

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
KnowHub todavía no hace OCR.

## Notes

Editor con autoguardado. Cada nota se divide e indexa igual que un documento, así
que aparece en la búsqueda y puede citarse en una respuesta.

## Meetings

Tres formas de crear una reunión:

1. **Grabar** desde el navegador.
2. **Subir** una grabación existente.
3. **Importar** una transcripción en texto.

La tercera no requiere ningún proveedor externo y ejecuta el mismo pipeline
completo, incluidos hablantes, timestamps, análisis e indexación.

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
conocimiento externo.

## Testing

```bash
pnpm test        # 150 pruebas: unitarias e integración, sin red ni credenciales
pnpm test:e2e    # 5 flujos end-to-end con Playwright
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

1. Provisiona PostgreSQL 15+ con la extensión `vector` (Supabase sirve).
2. Define `DATABASE_URL`, `AUTH_SECRET` y `NEXT_PUBLIC_APP_URL` (https).
3. Define `OPENAI_API_KEY` y `TRANSCRIPTION_API_KEY` para los proveedores reales.
4. Para almacenamiento gestionado: `STORAGE_PROVIDER=supabase` y crea el bucket
   **privado** indicado en `SUPABASE_STORAGE_BUCKET`.
5. `pnpm build` y despliega (Vercel u otro host de Node).

Las migraciones se aplican solas en el primer arranque.

## Known limitations

- **Grabación en segundo plano en móvil**: no está garantizada. Si se bloquea la
  pantalla o se cambia de aplicación, el navegador puede suspender la captura.
  KnowHub lo advierte durante la grabación en lugar de fingir lo contrario.
- **Diarización**: depende del proveedor de transcripción. Whisper no la ofrece,
  así que los segmentos llegan sin hablante en lugar de con uno inventado.
- **OCR**: un PDF escaneado sin capa de texto se rechaza. No está en el MVP.
- **Correo**: no hay transporte configurado. Los enlaces de recuperación e
  invitación se entregan en pantalla para que tú los compartas.
- **Facturación**: la abstracción existe, pero sin credenciales de Stripe la
  aplicación simplemente no ofrece pagos. No se simulan cobros.
- **Búsqueda multiidioma**: el índice de texto completo usa la configuración
  `spanish`. El contenido mayoritariamente en inglés se indexa con el stemmer
  español.
- **Transcripción en tiempo real** y **asistente durante la reunión**: fuera del
  alcance del MVP; la arquitectura los permite después.
- **Privacidad y términos**: `/privacy` y `/terms` son borradores técnicos y
  requieren revisión jurídica antes de producción.

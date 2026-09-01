# CHECKPOINT — KnowHub

> Última actualización: **21 ago 2026**
> Estado: **MVP completo y verificado.** SDD adoptado. Listo para la siguiente función.

Este archivo existe para retomar el proyecto en una sesión nueva sin perder
contexto. Si algo aquí contradice al código, gana el código — y hay que
corregir este archivo.

---

## 1. Qué es y dónde está

**KnowHub** — plataforma SaaS de conocimiento y memoria de reuniones. Captura
documentos, notas y grabaciones; transcribe, analiza, indexa y responde preguntas
en lenguaje natural **con citas que enlazan al segundo exacto del audio o a la
página del documento**.

| | |
| --- | --- |
| Repositorio | `/Users/macbook/Documents/knowhub` |
| Paquetes para compartir | `/Users/macbook/Documents/knowhub-releases/` |
| Origen | Prompt maestro en `~/Downloads/writing-block.md` (216 secciones) |
| Cuenta demo | `demo@knowhub.test` / `knowhub-demo-2026` |

**La sesión de Claude Code debe abrirse con `knowhub/` como raíz**, no desde
`Documents/`. Si no, los slash commands de SDD y `.claude/launch.json` no se
resuelven.

---

## 2. Estado verificado

Todo esto se ejecutó y pasó, no es una estimación:

```
lint          limpio
typecheck     limpio
test          150 pruebas en 18 archivos — todas pasan
test:e2e      5 flujos Playwright — todos pasan
build         producción limpia, 30 rutas
```

Árbol de git limpio. Último commit: `54f6d8a`.

### Lo que funciona de punta a punta

Auth y workspaces · proyectos y biblioteca unificada · documentos (PDF/DOCX/MD/TXT)
· notas con autoguardado · reuniones por los tres caminos (grabar, subir, importar
transcripción) · transcripción con timestamps · análisis con evidencia ·
búsqueda híbrida · Ask con streaming y citas navegables · aislamiento
multi-tenant · modo claro/oscuro · responsive móvil propio · PWA.

---

## 3. Cómo retomar

```bash
cd /Users/macbook/Documents/knowhub
pnpm install
pnpm db:migrate
pnpm dev                      # arranca en :3000 — ver nota de puerto abajo
```

Datos de ejemplo (una reunión ya procesada con decisiones y pendientes):

```bash
ENABLE_DEMO_DATA=true pnpm db:seed
```

Verificación completa antes de dar algo por terminado:

```bash
pnpm verify                   # lint + typecheck + test + build
pnpm test:e2e                 # levanta su propio servidor en :3011
```

---

## 4. Cómo trabajamos ahora: SDD

**Ninguna línea de código antes de una spec aprobada.**

```
/spec <descripción>  →  specs/NNNN-nombre/spec.md   (el qué y el porqué)
        ↓ apruebas
/plan NNNN           →  plan.md                     (el cómo, y qué se descartó)
        ↓ apruebas
/tasks NNNN          →  tasks.md                    (pasos verificables)
        ↓ apruebas
/implement NNNN      →  código + pruebas
```

- **`.specify/constitution.md` es vinculante.** Diez principios; cada uno cita la
  prueba que falla si se rompe. Toda spec se evalúa contra ella.
- **`specs/0001`–`0008` son retroactivas**: fijan el contrato observable del MVP
  y enlazan cada requisito a su código y su prueba. No llevan `plan.md` ni
  `tasks.md` a propósito (reconstruir hacia atrás una deliberación que no ocurrió
  sería ficción).
- **La siguiente spec es la `0009`** y va con la tríada completa.
- Si al implementar la spec resulta imposible o contradictoria: **parar y
  corregir la spec**, nunca reinterpretarla en silencio.

Los comandos viven en `.claude/commands/` y están versionados con el repo, así
que viajan en el zip de código.

---

## 5. Mapa del código

```
src/app/          rutas: (marketing) (auth) (dashboard) api/
src/components/   ui/ primitivos · shared/ compuestos
src/features/     módulos de cliente — meetings/recording vive aquí
src/server/       toda la lógica de servidor; jamás importada desde un Client Component
src/config/       env, planes, ajustes de búsqueda
src/lib/          helpers puros (time, text, crypto, errors)
src/validations/  esquemas Zod compartidos
```

Documentación de fondo: [`CLAUDE.md`](CLAUDE.md) (memoria operativa),
[`docs/architecture.md`](docs/architecture.md),
[`docs/database.md`](docs/database.md), [`docs/ai.md`](docs/ai.md),
[`docs/security.md`](docs/security.md).

---

## 6. Decisiones cerradas — no re-litigar

Estas ya se discutieron y se implementaron. Cambiarlas es una enmienda, no una
preferencia:

| Decisión | Por qué |
| --- | --- |
| **PGlite embebido** cuando no hay `DATABASE_URL` | PostgreSQL real en WASM con pgvector: la app corre entera sin servicios externos, con el mismo SQL y las mismas migraciones que producción. No es un mock |
| **Proveedores locales deterministas** para IA y transcripción | La app arranca sin credenciales. Son extractivos, no fabrican. En producción exigen `AI_PROVIDER=mock` explícito |
| **Migraciones como módulos TypeScript** | Se empaquetan con el build del servidor; corren igual en todos los entornos |
| **FTS con configuración `spanish`** | Elimina stopwords y lematiza. Con `simple`, una pregunta natural no coincide con nada |
| **Auth local (scrypt + sesiones opacas)** | Sin dependencia de Supabase para arrancar; la frontera queda lista para cambiarlo |
| **Monolito modular** | Las fronteras que importan son interfaces de proveedor, no saltos de red |
| **Sin `-p` fijo en los scripts** | El flag sobrescribía `PORT` e impedía asignar puerto libre |

---

## 7. Trampas encontradas — esto es lo que costó caro

Seis bugs reales que aparecieron construyendo y que **volverían a aparecer** si
alguien toca esas zonas sin saberlo:

1. **`\b` no reconoce vocales acentuadas en JavaScript.** `contactaré\b` nunca
   coincide: la posición tras "é" queda entre dos caracteres no-palabra. Los
   patrones de extracción usan lookarounds Unicode (`src/server/ai/mock.ts`).

2. **`..` pasa una validación ingenua de nombre de archivo** (los puntos son
   legales). Traversal real; se rechaza explícitamente en
   `src/server/storage/paths.ts`.

3. **Drizzle emite columnas sin calificar dentro de plantillas `sql`.**
   `${notes.projectId} = ${projects.id}` se convierte en
   `"project_id" = "id"`, se resuelve contra la tabla interna y **devuelve cero
   en silencio**. Las subconsultas correlacionadas se escriben con alias
   literales (`src/server/projects/index.ts`, `src/server/meetings/service.ts`).

4. **`plainto_tsquery` exige TODOS los términos.** Una pregunta natural nunca
   coincide porque una palabra no aparece literalmente. La consulta se convierte
   en un OR de lexemas (`src/server/search/index.ts`).

5. **`1 + Math.log(count)` es negativo para pesos fraccionarios.** Los n-gramas
   pesan 0.25 → componentes negativas → coseno negativo contra documentos que sí
   contienen los términos. Se usa `Math.log1p`
   (`src/server/ai/local-embedding.ts`).

6. **Una promesa suelta muere con la respuesta en producción.** Los trabajos en
   segundo plano se entregan a `after()` de Next. En desarrollo no se
   manifestaba; apareció al empaquetar la build (`src/server/jobs/index.ts`).

Además, al empaquetar: **Next no traza PGlite, su extensión pgvector ni unpdf**
(assets WASM/tarball no analizables estáticamente), y **algunos paquetes llegan
parciales** (`@swc/helpers` sin su build ESM). Resuelto en
`scripts/complete-store.mjs`.

---

## 8. Paquetes distribuibles

En `/Users/macbook/Documents/knowhub-releases/`:

| Archivo | Para qué |
| --- | --- |
| `knowhub-app-20260821-mac-linux-windows.zip` (88 MB) | Socios: descomprimir y doble clic en `start.command` / `start.bat`. Solo requiere Node 20+. Sin instalar, sin compilar, sin credenciales |
| `knowhub-source-20260821.zip` (387 KB) | Desarrollo: `pnpm install && pnpm db:migrate && pnpm dev` |

Ambos verificados desde carpeta limpia. Regenerar:

```bash
./scripts/package-standalone.sh        # ejecutable
git archive --format=zip --prefix=knowhub/ -o ../knowhub-releases/knowhub-source-$(date +%Y%m%d).zip HEAD
```

El paquete ejecutable **fija `PORT=3010` en sus lanzadores**, así que el cambio
de puerto del desarrollo no lo afecta.

---

## 9. Pendientes reales

Ordenados por lo que bloquea producción:

1. **Revisión jurídica** de `/privacy` y `/terms`. Son borradores técnicos y lo
   dicen en la propia página.
2. **Transporte de correo.** Hoy los enlaces de recuperación e invitación se
   muestran en pantalla. Es honesto, pero no escala.
3. **Iconos PWA reales.** `public/icon-192.png` y `icon-512.png` son marcadores
   de posición de 1×1 px.
4. **Desplegar**: `DATABASE_URL` + `AUTH_SECRET` + `NEXT_PUBLIC_APP_URL` (https)
   + `OPENAI_API_KEY`. Las migraciones se aplican solas al arrancar.

### Limitaciones asumidas (no son bugs)

- Grabación en segundo plano en móvil no garantizada — la app lo advierte.
- Diarización depende del proveedor; Whisper no la ofrece.
- Sin OCR: un PDF escaneado se rechaza explicando por qué.
- El proveedor local de transcripción **no decodifica audio**: devuelve un guion
  de ejemplo y la interfaz lo dice. Para contenido real sin credenciales, la vía
  es **Importar transcripción**.
- FTS con un solo idioma (español).

---

## 10. Entorno

| | |
| --- | --- |
| Node | 26.3.0 |
| pnpm | 11.5.3 (**nunca mezclar con npm/yarn**) |
| Next.js | 16.3.1 (App Router, Turbopack) |
| React | 19.2.8 · TypeScript 5.9.3 |
| PGlite | 0.5.5 + `@electric-sql/pglite-pgvector` 0.0.6 (pgvector 0.8.1) |

### Nota de puerto

`pnpm dev` arranca en **:3000** por defecto (el estándar de Next). Para fijar
otro:

```bash
PORT=3010 pnpm dev
```

No hay `-p` en los scripts a propósito: sobrescribía `PORT` e impedía que
cualquier herramienta asignara un puerto libre. El usuario tiene otros proyectos
en 3000–3006, así que **conviene usar `PORT=3010`** para evitar choques.

`.claude/launch.json` usa `autoPort: true`.

---

## 11. Convenciones

- Comentarios explican **por qué**, no qué.
- Errores de servidor son `AppError`; los route handlers los traducen.
- Server Actions devuelven `ActionResult<T>`, nunca lanzan a través del RSC.
- Texto de interfaz en español neutro. Código, comentarios e identificadores en
  inglés.
- Las pruebas describen comportamiento de producto, no implementación.
- Nunca eliminar una prueba válida para conseguir verde.

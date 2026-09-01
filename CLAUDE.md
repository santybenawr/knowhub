# CLAUDE.md — KnowHub

Operating memory for this repository. Keep it short; details belong in `docs/`.

## How we work: Spec-Driven Development

**No code before an approved spec.** The flow, and the gates, are in
[`specs/README.md`](specs/README.md):

```
/spec <descripción>  →  specs/NNNN-nombre/spec.md   (el qué y el porqué)
/plan NNNN           →  plan.md                     (el cómo, y qué se descartó)
/tasks NNNN          →  tasks.md                    (pasos verificables)
/implement NNNN      →  código + pruebas
```

[`.specify/constitution.md`](.specify/constitution.md) is binding. Every spec is
evaluated against it; a spec that contradicts a principle is wrong, unless the
principle gets an explicit, dated amendment.

Specs 0001–0008 are retroactive: they pin the observable contract of the existing
MVP and link each requirement to the code and the test that covers it. They carry
no `plan.md`/`tasks.md` on purpose — reconstructing a deliberation that never
happened in that order would be fiction. From 0009 the full triad applies.

If, while implementing, the spec turns out to ask for something impossible or
contradictory: **stop and fix the spec.** Do not reinterpret it silently.

## Product

KnowHub turns what you **read** (documents), **write** (notes) and **hear**
(meetings) into knowledge you can search, ask about, and trace back to the
source. Meetings are the flagship: record → transcribe → analyse → index →
ask → jump to the exact second in the audio.

The non-negotiable property: **every AI claim links to its evidence.**

## Stack

- Next.js 16 (App Router, Turbopack), React 19, TypeScript strict
- Tailwind CSS v4 (tokens in `src/app/globals.css`), Radix primitives, lucide-react
- Drizzle ORM over PostgreSQL + pgvector
- Zod for every boundary; React Hook Form is available but most forms are plain
- Vitest (unit + integration), Playwright (e2e)

## Package manager

**pnpm.** Never mix in npm or yarn.

## Database

Dual driver, one schema (`src/server/db/client.ts`):

- `DATABASE_URL` set → `node-postgres` (Supabase or any Postgres 15+ with `vector`)
- `DATABASE_URL` unset → **PGlite**, an embedded Postgres, at `PGLITE_DATA_DIR`

PGlite is real Postgres in WASM, not a mock — same SQL, same migrations. It is
what lets the app run end to end with zero external services.

Migrations are **TypeScript modules** in `src/server/db/migrations/` (so they are
bundled with the server build). They run automatically on first DB access.
Append a new module; never edit an applied one. `*.postgres` migrations (RLS) are
skipped on PGlite.

Full-text search uses the **`spanish`** configuration. It must stay in sync with
`SEARCH_CONFIG.textSearchConfig` — changing it requires a migration.

## Architecture

Modular monolith.

```
src/app/          routes: (marketing) (auth) (dashboard) api/
src/components/   ui/ (primitives) shared/ (composed)
src/features/     client-side feature modules (meetings/recording lives here)
src/server/       all server logic; never imported from a Client Component
src/config/       env, plans, search tuning, app metadata
src/lib/          pure helpers (time, text, crypto, errors)
src/validations/  shared Zod schemas
```

Server Components by default. `'use client'` only where it is needed —
the recorder, the player, forms with local state.

Route Handlers for uploads, streaming and signed URLs. Server Actions for
ordinary mutations.

## Authentication

Local provider: scrypt password hashing (`node:crypto`), opaque DB-backed
sessions, only the SHA-256 of the token stored. `AUTH_SECRET` is required in
production. Supabase Auth is prepared but not wired.

Every authenticated page/route goes through `requirePageContext()` /
`requireApiContext()` in `src/server/auth/guard.ts`.

## Providers (all swappable, all behind an interface)

| Boundary               | Default (no credentials)      | Real                     |
| ---------------------- | ----------------------------- | ------------------------ |
| `StorageProvider`      | local private dir + HMAC URLs | Supabase Storage         |
| `AIProvider`           | deterministic local           | OpenAI-compatible        |
| `TranscriptionProvider`| deterministic local           | Whisper-compatible       |
| `BillingProvider`      | none                          | Stripe (optional)        |

The local AI provider is **extractive and deterministic**, never fabricated, and
production refuses to use it unless `AI_PROVIDER=mock` is set explicitly. The UI
says so on screen (`ProviderNotice`).

## Meetings architecture

```
MediaRecorder (client) → /api/meetings/[id]/audio → private storage
  → meeting_transcription job → segments + speakers
  → meeting_analysis job      → decisions/action items with evidenceSegmentIds
  → meeting_embedding job     → meeting_chunks (start/end/speakers/segment ids)
  → hybrid search + RAG → citations that seek the player
```

Jobs are rows in `ai_jobs`, claimed with a conditional UPDATE, started through
Next's `after()` so the work survives the response. Every stage fails
independently: a broken analysis still leaves a readable transcript.

## Security rules

- Never trust a `workspaceId` from the client — resolve it through
  `requireWorkspaceAccess()` and use the returned id.
- Every tenant query filters on `workspace_id` **inside the SQL**.
- Audio and documents are private; reads go through short-lived signed URLs
  issued only after authorisation. Never persist a signed URL.
- Retrieved content is untrusted data: it is fenced inside `<<<EVIDENCIA n>>>`
  in a user-role message, never in the system prompt.
- Storage keys are derived from verified ids; a user filename never becomes a path.
- File types are decided by magic bytes, not the declared MIME.

## Commands

```bash
pnpm dev            # dev server on :3010
pnpm build          # production build
pnpm lint           # eslint
pnpm typecheck      # tsc --noEmit
pnpm test           # vitest (unit + integration)
pnpm test:e2e       # playwright (builds and starts its own server on :3011)
pnpm verify         # lint + typecheck + test + build
pnpm db:migrate     # apply migrations / show status
pnpm db:seed        # demo data (requires ENABLE_DEMO_DATA=true)
pnpm db:reset       # wipe local PGlite + storage (refuses if DATABASE_URL is set)
```

## Conventions

- Comments explain *why*, and only where the reason is not obvious from the code.
- Errors thrown server-side are `AppError`; route handlers translate them.
- Server Actions return `ActionResult<T>`, never throw across the RSC boundary.
- User-facing copy is Spanish (neutral). Code, comments and identifiers are English.
- Tests assert product behaviour, not implementation details.

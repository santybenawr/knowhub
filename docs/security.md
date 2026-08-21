# Security

## Multi-tenancy

A workspace is the tenancy boundary. Every private resource belongs to exactly
one, and every tenant-scoped table carries `workspace_id`.

**A `workspaceId` from the client is never trusted.** It is a *request*, resolved
against real memberships:

```
Authenticated user → membership lookup → role → permission → verified workspaceId
```

`requireWorkspaceAccess()` returns the verified id, and callers use that. Every
resource helper (`requireMeetingAccess`, `requireDocumentAccess`,
`requireNoteAccess`) resolves the resource's own workspace first and then runs
the same check, so a resource id from a URL grants nothing on its own.

Non-members get **404, not 403**. A "forbidden" response would confirm that the
id exists, which is a probing oracle.

Queries never rely on the caller having filtered correctly: the `workspace_id`
predicate is inside the SQL, including both arms of hybrid search.

### Tested

`tests/integration/tenant-isolation.test.ts` gives user B every real id belonging
to user A — meeting, document, note, project, workspace — and asserts that every
path refuses: direct access, service-layer reads with a forged workspace id,
signed-URL issuance, transcript rows, analysis, search results and Ask. An
end-to-end test repeats it through HTTP with two browser contexts.

## Roles

| | OWNER | ADMIN | MEMBER | VIEWER |
| --- | --- | --- | --- | --- |
| Read content | ✓ | ✓ | ✓ | ✓ |
| Search | ✓ | ✓ | ✓ | ✓ |
| Create / edit content | ✓ | ✓ | ✓ | |
| Record meetings, use AI | ✓ | ✓ | ✓ | |
| Delete content | ✓ | ✓ | | |
| Manage members | ✓ | ✓ | | |
| Billing, delete workspace | ✓ | | | |

Permissions are checked on the server, at the entry point. A member may only
assign a role strictly below their own, and the owner's role cannot be changed —
that would orphan the workspace.

## Row Level Security

Migration `0002_rls` enables and **forces** RLS on every tenant table, with a
single policy shape driven by `knowhub_is_member(workspace_id)`. Conversations
and messages are additionally scoped to their owning user.

It is a second line of defence. KnowHub's own server connects with the service
role and bypasses RLS by design; the policies protect any direct or PostgREST
access to the same database. The migration is skipped on the embedded PGlite
database, which is single-user and has no `auth` schema.

## Authentication

- **Passwords**: scrypt (`node:crypto`), 16-byte random salt, 64-byte key. No
  native addon to keep patched.
- **Sessions**: opaque random tokens in an httpOnly cookie; only the SHA-256 is
  stored, so a database dump cannot be replayed as a login. Revocation is a
  `DELETE`. Expired rows are cleaned opportunistically.
- **`Secure` flag**: derived from the scheme in `NEXT_PUBLIC_APP_URL`, not from
  `NODE_ENV`. A `Secure` cookie is never sent over plain HTTP, so keying it on
  `NODE_ENV` silently breaks sign-in for a production build behind an HTTP
  origin. Serving over HTTP in production logs a warning.
- **`AUTH_SECRET`**: required in production. The app refuses to boot without it
  rather than signing with an ephemeral key.
- **Login**: identical message and a real hash comparison whether or not the
  address exists, so response time does not enumerate accounts.
- **Password reset**: single-use token, hashed at rest, one-hour expiry. An
  unknown address returns success without issuing anything.

## Private files

Audio and documents are private, always.

- Storage keys are derived server-side from verified ids. A user-supplied
  filename never becomes part of a path.
- Every path segment is validated; `.` and `..` are rejected explicitly (they
  pass a naive filename character class).
- The local provider writes outside `public/` with mode `0600`, and resolves each
  path back to the root to prove it did not escape.
- Reads go through short-lived signed URLs, issued **only after** the workspace
  check. Signed URLs are never persisted — only `audio_storage_path` is stored.
- `/api/storage/[...path]` verifies an HMAC signature and expiry before serving,
  with `X-Content-Type-Options: nosniff`.

## Upload validation

The declared MIME type is a hint, never the decision:

- Binary formats are confirmed by magic bytes (`%PDF`, `PK\x03\x04`, EBML, RIFF,
  `ftyp`, `OggS`, ID3).
- Text is confirmed by decoding and rejecting control characters.
- The stored MIME is the detected one.
- A file whose bytes contradict its extension is rejected.
- Size caps are enforced before the bytes are read into a service.

## Prompt injection

Retrieved content is untrusted data. See [`ai.md`](ai.md#prompt-injection) — the
short version is that system rules live only in a `system` message, evidence is
fenced inside a `user` message, and the prompt says explicitly that fenced
content is quotable material and never an instruction.

## Rate limiting

Fixed-window, database-backed (`rate_limits`), incremented atomically so
concurrent requests cannot both read a stale count.

Covered: login, signup, password reset, document upload, meeting create, audio
upload, transcription, re-analysis, search, ask.

`RATE_LIMIT_MULTIPLIER` scales every limit. It exists because load tests and
end-to-end suites drive the whole app from a single address — exactly what the
limiter is built to stop. Keep it at `1` in production.

## Secrets

`SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `TRANSCRIPTION_API_KEY` and
`STRIPE_SECRET_KEY` are server-only. `src/config/env.ts` separates the server
schema from the handful of `NEXT_PUBLIC_*` values, and no server module is
importable from a Client Component (`assertServerOnly` fails loudly if one is).

Provider error bodies can echo prompt content, so they are logged server-side and
never returned to the client. Route handlers translate `AppError` into a status
and a human message; anything else becomes a generic 500.

## HTTP headers

Set in `next.config.ts`:

- `Content-Security-Policy` — `default-src 'self'`, `object-src 'none'`,
  `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`. Fonts are
  self-hosted by `next/font`, so no external origin is allowed. The dev build
  additionally permits the HMR websocket.
- `Permissions-Policy: microphone=(self), camera=(), geolocation=(), payment=()`
- `X-Content-Type-Options: nosniff`, `Referrer-Policy:
  strict-origin-when-cross-origin`, `X-Frame-Options: DENY`
- `Strict-Transport-Security` in production

## Audit logging

Sensitive actions are recorded in `audit_logs`: workspace created/deleted, member
invited/removed, role changed, document/meeting deleted, meeting audio
deleted/downloaded, password reset requested/completed.

Metadata is limited to identifiers, counts and flags. **Audio, transcripts and
document bodies never reach this table.** Audit writes are wrapped so a logging
failure can never break the operation it was recording.

## Analytics

`analytics_events` stores event names and numeric/enum properties only. Titles,
transcripts, questions and file names are private content and are never sent.

## Deletion

Deleting a meeting from the UI is a soft delete: it leaves the library, and the
audio and transcript survive. A separate, explicitly-labelled permanent delete
removes the storage object plus every derived row — transcript segments,
speakers, chunks, embeddings, analysis and the citations that referenced them
(by cascade).

## Data protection (Colombia)

Designed with the principles of Ley 1581 de 2012 in mind: authorisation,
purpose, security, confidentiality, and the rights of access, rectification and
deletion. Concretely: private storage, RLS, workspace authorisation, expiring
signed URLs, per-resource deletion, account deletion, and audit logs.

Recording carries a consent notice before a user's first recording, stating that
obtaining the participants' authorisation is their responsibility. KnowHub does
not obtain consent on anyone's behalf.

**This is engineering, not a compliance certification.** `/privacy` and `/terms`
are technical drafts and say so on the page; both need legal review before
production.

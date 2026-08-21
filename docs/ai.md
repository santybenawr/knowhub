# AI

Every AI capability sits behind an interface. Nothing above
`src/server/ai` or `src/server/transcription` knows which vendor is answering.

## Providers

```ts
interface AIProvider {
  generateText(input): Promise<GenerateTextResult>
  generateStructuredOutput<T>(input): Promise<StructuredResult<T>>
  streamText(input): AsyncIterable<string>
  createEmbedding(texts: string[]): Promise<EmbeddingResult>
}

interface TranscriptionProvider {
  transcribe(input): Promise<TranscriptionResult>
}
```

`TranscriptionProvider` stays separate from `AIProvider` even when one vendor
serves both: they fail differently, they are billed differently, and a
deployment may well want Whisper for audio and something else for reasoning.

| Provider | Real adapter | Local implementation |
| --- | --- | --- |
| AI | OpenAI-compatible REST | deterministic extractive |
| Transcription | Whisper-compatible REST | deterministic fixture |

The OpenAI adapters use `fetch` rather than the SDK. The surface needed is four
calls, and `OPENAI_BASE_URL` then points at any compatible gateway with no
further changes.

### The local providers

They exist so the whole product runs, and is testable in CI, with no credentials
and no network. They are **not** stubs that return canned answers:

- **Embeddings** are a real vector space built by feature hashing over unigrams,
  bigrams and character 4-grams. Similar wording lands close together, so
  semantic retrieval is genuinely exercised.
- **Answers** are extractive over the evidence that retrieval actually returned,
  with real citation markers pointing at real chunks.
- **Meeting analysis** is rule-based extraction over the real transcript, and it
  is as conservative as the model is required to be: an unclaimed task gets
  `responsible: null`.

The one thing the local transcription provider cannot do is decode audio. It
returns a fixed, clearly-fictional script with `isMock: true`, and every meeting
produced that way carries a banner saying so. For a *real* transcript without a
provider, use "Importar transcripción" — that path is not a mock.

Production refuses to fall back. Without `OPENAI_API_KEY` it raises a
configuration error unless `AI_PROVIDER=mock` is set explicitly, so extractive
stubs can never be served as if they were a model.

## Document ingestion

```
Upload → validate (magic bytes) → store (private) → parse → normalise
       → chunk (page-aware) → summarise → embed → ready
```

`DocumentParser` implementations: `PdfParser` (unpdf), `DocxParser` (mammoth),
`MarkdownParser`, `TextParser`. Markdown is resolved before plain text, since a
`.md` file matches both and the markdown parser strips syntax the other would
index as noise.

A scanned PDF with no text layer raises "no contiene texto seleccionable"
instead of being indexed as an empty document. OCR is out of scope.

## Meeting transcription

The provider returns a normalised result:

```ts
type TranscriptionResult = {
  text: string
  language?: string
  durationSeconds?: number
  segments: Array<{ id, start, end, text, speakerId?, confidence? }>
  speakerNames?: Record<string, string>
}
```

### Diarization

Only when the provider offers it. Whisper does not, so
`supportsDiarization = false` and segments arrive with no speaker rather than
with an invented one. The UI then shows "Hablante 1", which is a position, not
an identity.

An imported transcript is the exception: it often labels speakers by name, and
those names are carried through because the *source* stated them.

### Speaker renaming

`SPEAKER_00 → "Santiago"` is stored in `meeting_speakers`, resolved at read
time. The transcript rows never change, so the rename is reversible and survives
re-processing.

## Chunking

| Content | Strategy |
| --- | --- |
| Documents | ~1200 chars, split on paragraph then sentence, 150-char overlap, page preserved |
| Notes | Same, with the title prepended (it carries a lot of retrieval signal) |
| Meetings | Consecutive segments grouped to ~900 chars |

Meeting chunks keep `start_seconds`, `end_seconds`, `speaker_keys` and
`segment_ids`. Losing those would make a citation a link to "somewhere in a
43-minute recording", which is not evidence.

The overlap exists so an answer that straddles a boundary is still retrievable.

## Hybrid search

Two independent arms, fused:

```
score = 0.7 × semantic + 0.3 × keyword
```

**Keyword arm.** The query is turned into an OR of its lexemes rather than passed
through `plainto_tsquery`, which ANDs everything. People ask questions, and a
single absent word would otherwise sink the whole match. `ts_rank_cd` does the
discriminating, and `spanish` stopword removal keeps filler words from matching.

**Semantic arm.** `1 - (embedding <=> query)`, cosine similarity from pgvector.

The arms are normalised differently, on purpose:

- `ts_rank_cd` has no absolute meaning — its magnitude depends on the query and
  the document — so keyword scores are scaled against the best hit in the set.
- Cosine similarity is already absolute in `[-1,1]`, so it is used directly.
  Rescaling it per result set would normalise a single weak match up to 1.

Both arms filter on `workspace_id` inside the SQL, so a bug in a caller cannot
widen a search beyond the tenant.

Tuning lives in `src/config/search.ts`. Nothing is hardcoded at a call site.

## RAG

```
Pregunta
  → embedding
  → recuperación híbrida (limitada al workspace)
  → deduplicación por huella de contenido
  → umbral de relevancia
  → diversidad (máx. 4 fragmentos por recurso)
  → presupuesto de contexto (12 fragmentos, 14k caracteres)
  → generación
  → citas
```

### Context budget

The whole library is never sent to the model. Caps: chunk count, characters per
chunk, total characters, and how many chunks a single resource may contribute —
so one long meeting cannot crowd out everything else in the workspace.

### Citations

An answer is post-processed to keep only the sources it actually referenced.
Listing every retrieved chunk would make the citation list look authoritative
when half of it went unused. If the model cited nothing, the full set is kept so
the user can still check the reasoning.

Each citation resolves to a link:

| Kind | Link |
| --- | --- |
| Meeting | `/meetings/{id}?t={start}` — the player opens at that second |
| Document | `/documents/{id}?chunk={chunkId}` — scrolls to and highlights the excerpt |
| Note | `/notes/{id}` |

### No evidence, no answer

Below the relevance threshold, KnowHub returns:

> No encontré suficiente información en tu biblioteca para responder con seguridad.

It never falls back to the model's own knowledge. A confident answer sourced
from training data would be indistinguishable, to the user, from one sourced
from their library — and that is the whole trust proposition.

## Meeting analysis

Structured output validated with Zod (`meetingAnalysisSchema`). Decisions,
action items, key points, open questions and dates each carry
`evidenceSegmentIds`.

Two guards against invention:

1. **Nullable by contract.** `responsible` and `deadline` are nullable, and the
   UI renders "Responsable no especificado" / "Sin fecha definida". The model is
   never put in a position where it has to fill a required field.
2. **Evidence pruning.** After validation, any segment id that does not exist in
   the transcript is dropped, so a citation can never point at a segment that
   was made up.

## Prompt injection

Documents and transcripts are **untrusted data**. The defence is structural, not
a filter:

- System rules live in a `system` message and nothing else is ever placed there.
- Retrieved content goes in a `user` message, fenced in
  `<<<EVIDENCIA n>>> … <<<FIN EVIDENCIA n>>>`.
- The system prompt states, explicitly, that anything inside those fences is
  material to quote and never an instruction — including text that says
  "ignora las instrucciones anteriores".

A document cannot reach the system role no matter what it contains.
`tests/integration/prompt-safety.test.ts` asserts that structure, and asserts it
against a hostile note stored in a real workspace.

All prompts live in `src/server/ai/prompts/`.

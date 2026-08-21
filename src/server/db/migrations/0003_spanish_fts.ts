export const id = "0003_spanish_fts"
export const postgresOnly = false
export const sql = `-- Switch full-text search from the 'simple' configuration to 'spanish'.
--
-- 'simple' indexes every token verbatim: no stopword removal and no stemming.
-- That makes natural-language questions behave badly. A question like
-- "¿Qué decidimos sobre el proveedor?" lexes to {que, decidimos, sobre, el,
-- proveedor}; matching those with OR means an unrelated query such as
-- "receta de cocina" still matches any text containing "de", and matching them
-- with AND means the question fails entirely because "decidimos" never appears
-- literally.
--
-- The 'spanish' configuration drops stopwords and stems, so the same question
-- reduces to {decid, proveedor} and matches the sentence "vamos a seleccionar
-- el proveedor" on a real term. It ships with every standard PostgreSQL build.
--
-- Known limitation: PostgreSQL applies one configuration per column, so
-- predominantly English content is stemmed by the Spanish stemmer. For a
-- Spanish-first product that is the right trade; per-language columns would be
-- the next step if that changes.
--
-- Dropping and re-adding a STORED generated column recomputes it for every
-- existing row, so no backfill is needed.

ALTER TABLE document_chunks DROP COLUMN IF EXISTS search_vector;
ALTER TABLE document_chunks
  ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('spanish', coalesce(content, ''))) STORED;
CREATE INDEX IF NOT EXISTS document_chunks_fts_idx ON document_chunks USING gin (search_vector);

ALTER TABLE note_chunks DROP COLUMN IF EXISTS search_vector;
ALTER TABLE note_chunks
  ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('spanish', coalesce(content, ''))) STORED;
CREATE INDEX IF NOT EXISTS note_chunks_fts_idx ON note_chunks USING gin (search_vector);

ALTER TABLE meeting_chunks DROP COLUMN IF EXISTS search_vector;
ALTER TABLE meeting_chunks
  ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('spanish', coalesce(content, ''))) STORED;
CREATE INDEX IF NOT EXISTS meeting_chunks_fts_idx ON meeting_chunks USING gin (search_vector);
`

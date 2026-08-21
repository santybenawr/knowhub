export const id = "0001_vector_indexes"
export const postgresOnly = false
export const sql = `-- Approximate-nearest-neighbour indexes for pgvector.
--
-- Wrapped in exception handlers because the available index access methods
-- depend on the pgvector build (HNSW needs >= 0.5.0). Without them retrieval
-- still works via exact scan, only slower, so a missing method must not fail
-- the migration.

DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx
    ON document_chunks USING hnsw (embedding vector_cosine_ops);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'skipping hnsw index on document_chunks: %', SQLERRM;
END $$;

DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS note_chunks_embedding_idx
    ON note_chunks USING hnsw (embedding vector_cosine_ops);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'skipping hnsw index on note_chunks: %', SQLERRM;
END $$;

DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS meeting_chunks_embedding_idx
    ON meeting_chunks USING hnsw (embedding vector_cosine_ops);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'skipping hnsw index on meeting_chunks: %', SQLERRM;
END $$;
`

export const id = "0000_init"
export const postgresOnly = false
export const sql = `-- KnowHub initial schema.
-- Written by hand (rather than generated) so pgvector, full-text search and
-- RLS live alongside the tables they belong to. tests/integration/schema.test.ts
-- asserts this stays in sync with src/server/db/schema.ts.

CREATE EXTENSION IF NOT EXISTS vector;

-- ------------------------------------------------------------------ users
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  name text NOT NULL,
  avatar_url text,
  timezone text NOT NULL DEFAULT 'America/Bogota',
  email_verified_at timestamptz,
  onboarding_completed_at timestamptz,
  onboarding_purpose text,
  theme_preference text NOT NULL DEFAULT 'system',
  recording_consent_at timestamptz,
  last_workspace_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_theme_check CHECK (theme_preference IN ('light','dark','system'))
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (lower(email));

CREATE TABLE IF NOT EXISTS user_credentials (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  password_hash text NOT NULL,
  password_reset_token_hash text,
  password_reset_expires_at timestamptz,
  email_verification_token_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  user_agent text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS sessions_token_hash_unique ON sessions (token_hash);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id);

-- ------------------------------------------------------------- workspaces
CREATE TABLE IF NOT EXISTS workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  type text NOT NULL DEFAULT 'personal',
  plan text NOT NULL DEFAULT 'free',
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  billing_customer_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT workspaces_type_check CHECK (type IN ('personal','team','education','business')),
  CONSTRAINT workspaces_plan_check CHECK (plan IN ('free','pro','team'))
);
CREATE UNIQUE INDEX IF NOT EXISTS workspaces_slug_unique ON workspaces (slug);
CREATE INDEX IF NOT EXISTS workspaces_owner_idx ON workspaces (owner_id);

CREATE TABLE IF NOT EXISTS workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'MEMBER',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workspace_members_role_check CHECK (role IN ('OWNER','ADMIN','MEMBER','VIEWER'))
);
CREATE UNIQUE INDEX IF NOT EXISTS workspace_members_unique ON workspace_members (workspace_id, user_id);
CREATE INDEX IF NOT EXISTS workspace_members_user_idx ON workspace_members (user_id);

CREATE TABLE IF NOT EXISTS workspace_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'MEMBER',
  token_hash text NOT NULL,
  invited_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS workspace_invitations_token_unique ON workspace_invitations (token_hash);
CREATE INDEX IF NOT EXISTS workspace_invitations_ws_idx ON workspace_invitations (workspace_id);

-- --------------------------------------------------------------- projects
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  icon text NOT NULL DEFAULT '📁',
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS projects_workspace_idx ON projects (workspace_id, deleted_at);

-- -------------------------------------------------------------- documents
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  title text NOT NULL,
  description text,
  summary text,
  topics jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_type text NOT NULL DEFAULT 'upload',
  mime_type text NOT NULL,
  original_filename text,
  storage_path text,
  file_size bigint NOT NULL DEFAULT 0,
  page_count integer,
  language text,
  processing_status text NOT NULL DEFAULT 'pending',
  processing_error text,
  embedding_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT documents_processing_status_check CHECK (processing_status IN ('pending','processing','completed','failed')),
  CONSTRAINT documents_embedding_status_check CHECK (embedding_status IN ('pending','processing','completed','failed')),
  CONSTRAINT documents_source_type_check CHECK (source_type IN ('upload','manual','web'))
);
CREATE INDEX IF NOT EXISTS documents_workspace_idx ON documents (workspace_id, deleted_at);
CREATE INDEX IF NOT EXISTS documents_project_idx ON documents (project_id);

CREATE TABLE IF NOT EXISTS document_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  content text NOT NULL,
  chunk_index integer NOT NULL,
  page_number integer,
  section_title text,
  token_count integer,
  embedding vector(1536),
  search_vector tsvector GENERATED ALWAYS AS (to_tsvector('simple', coalesce(content, ''))) STORED,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS document_chunks_unique ON document_chunks (document_id, chunk_index);
CREATE INDEX IF NOT EXISTS document_chunks_workspace_idx ON document_chunks (workspace_id);
CREATE INDEX IF NOT EXISTS document_chunks_fts_idx ON document_chunks USING gin (search_vector);

-- ------------------------------------------------------------------ notes
CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  summary text,
  embedding_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT notes_embedding_status_check CHECK (embedding_status IN ('pending','processing','completed','failed'))
);
CREATE INDEX IF NOT EXISTS notes_workspace_idx ON notes (workspace_id, deleted_at);
CREATE INDEX IF NOT EXISTS notes_project_idx ON notes (project_id);

CREATE TABLE IF NOT EXISTS note_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  content text NOT NULL,
  chunk_index integer NOT NULL,
  token_count integer,
  embedding vector(1536),
  search_vector tsvector GENERATED ALWAYS AS (to_tsvector('simple', coalesce(content, ''))) STORED,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS note_chunks_unique ON note_chunks (note_id, chunk_index);
CREATE INDEX IF NOT EXISTS note_chunks_workspace_idx ON note_chunks (workspace_id);
CREATE INDEX IF NOT EXISTS note_chunks_fts_idx ON note_chunks USING gin (search_vector);

-- --------------------------------------------------------------- meetings
CREATE TABLE IF NOT EXISTS meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  title text NOT NULL,
  description text,
  source text NOT NULL DEFAULT 'recording',
  meeting_date timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer,
  status text NOT NULL DEFAULT 'draft',
  audio_storage_path text,
  audio_mime_type text,
  audio_size_bytes bigint,
  transcription_status text NOT NULL DEFAULT 'pending',
  analysis_status text NOT NULL DEFAULT 'pending',
  embedding_status text NOT NULL DEFAULT 'pending',
  transcription_error text,
  analysis_error text,
  embedding_error text,
  language text,
  participants_hint jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT meetings_status_check CHECK (status IN ('draft','recording','uploading','processing','ready','failed')),
  CONSTRAINT meetings_transcription_status_check CHECK (transcription_status IN ('pending','processing','completed','failed')),
  CONSTRAINT meetings_analysis_status_check CHECK (analysis_status IN ('pending','processing','completed','failed')),
  CONSTRAINT meetings_embedding_status_check CHECK (embedding_status IN ('pending','processing','completed','failed')),
  CONSTRAINT meetings_source_check CHECK (source IN ('recording','upload','transcript_import')),
  CONSTRAINT meetings_duration_check CHECK (duration_seconds IS NULL OR duration_seconds >= 0)
);
CREATE INDEX IF NOT EXISTS meetings_workspace_idx ON meetings (workspace_id, deleted_at);
CREATE INDEX IF NOT EXISTS meetings_project_idx ON meetings (project_id);

CREATE TABLE IF NOT EXISTS meeting_speakers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  speaker_key text NOT NULL,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS meeting_speakers_unique ON meeting_speakers (meeting_id, speaker_key);

CREATE TABLE IF NOT EXISTS meeting_transcript_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  segment_index integer NOT NULL,
  speaker_key text,
  start_seconds double precision NOT NULL,
  end_seconds double precision NOT NULL,
  text text NOT NULL,
  edited_text text,
  confidence real,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT meeting_segments_time_check CHECK (end_seconds >= start_seconds)
);
CREATE UNIQUE INDEX IF NOT EXISTS meeting_segments_unique ON meeting_transcript_segments (meeting_id, segment_index);
CREATE INDEX IF NOT EXISTS meeting_segments_workspace_idx ON meeting_transcript_segments (workspace_id);

CREATE TABLE IF NOT EXISTS meeting_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL,
  content text NOT NULL,
  start_seconds double precision NOT NULL,
  end_seconds double precision NOT NULL,
  speaker_keys jsonb NOT NULL DEFAULT '[]'::jsonb,
  segment_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  token_count integer,
  embedding vector(1536),
  search_vector tsvector GENERATED ALWAYS AS (to_tsvector('simple', coalesce(content, ''))) STORED,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS meeting_chunks_unique ON meeting_chunks (meeting_id, chunk_index);
CREATE INDEX IF NOT EXISTS meeting_chunks_workspace_idx ON meeting_chunks (workspace_id);
CREATE INDEX IF NOT EXISTS meeting_chunks_fts_idx ON meeting_chunks USING gin (search_vector);

CREATE TABLE IF NOT EXISTS meeting_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  summary text NOT NULL DEFAULT '',
  topics jsonb NOT NULL DEFAULT '[]'::jsonb,
  participants jsonb NOT NULL DEFAULT '[]'::jsonb,
  decisions jsonb NOT NULL DEFAULT '[]'::jsonb,
  action_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  key_points jsonb NOT NULL DEFAULT '[]'::jsonb,
  open_questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  important_dates jsonb NOT NULL DEFAULT '[]'::jsonb,
  suggested_questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  model_used text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS meeting_analysis_unique ON meeting_analysis (meeting_id);

-- ---------------------------------------------------------- conversations
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  meeting_id uuid REFERENCES meetings(id) ON DELETE CASCADE,
  note_id uuid REFERENCES notes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Nueva conversación',
  scope text NOT NULL DEFAULT 'workspace',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT conversations_scope_check CHECK (scope IN ('workspace','project','document','meeting','note'))
);
CREATE INDEX IF NOT EXISTS conversations_workspace_user_idx ON conversations (workspace_id, user_id, deleted_at);

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT messages_role_check CHECK (role IN ('user','assistant','system'))
);
CREATE INDEX IF NOT EXISTS messages_conversation_idx ON messages (conversation_id, created_at);

CREATE TABLE IF NOT EXISTS message_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  citation_index integer NOT NULL,
  document_chunk_id uuid REFERENCES document_chunks(id) ON DELETE CASCADE,
  note_chunk_id uuid REFERENCES note_chunks(id) ON DELETE CASCADE,
  meeting_chunk_id uuid REFERENCES meeting_chunks(id) ON DELETE CASCADE,
  relevance_score double precision NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT message_sources_exactly_one_check CHECK (
    (CASE WHEN document_chunk_id IS NOT NULL THEN 1 ELSE 0 END)
  + (CASE WHEN note_chunk_id IS NOT NULL THEN 1 ELSE 0 END)
  + (CASE WHEN meeting_chunk_id IS NOT NULL THEN 1 ELSE 0 END) = 1
  )
);
CREATE INDEX IF NOT EXISTS message_sources_message_idx ON message_sources (message_id);

-- ------------------------------------------------------------------- jobs
CREATE TABLE IF NOT EXISTS ai_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  resource_type text NOT NULL,
  resource_id uuid NOT NULL,
  type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempt_count integer NOT NULL DEFAULT 0,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  CONSTRAINT ai_jobs_status_check CHECK (status IN ('pending','processing','completed','failed')),
  CONSTRAINT ai_jobs_resource_type_check CHECK (resource_type IN ('document','note','meeting'))
);
CREATE INDEX IF NOT EXISTS ai_jobs_resource_idx ON ai_jobs (resource_type, resource_id);
CREATE INDEX IF NOT EXISTS ai_jobs_status_idx ON ai_jobs (status, created_at);

-- ------------------------------------------------------------------ usage
CREATE TABLE IF NOT EXISTS usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  type text NOT NULL,
  quantity double precision NOT NULL DEFAULT 1,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS usage_events_workspace_idx ON usage_events (workspace_id, type, created_at);

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource_type text,
  resource_id uuid,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_logs_workspace_idx ON audit_logs (workspace_id, created_at);

CREATE TABLE IF NOT EXISTS rate_limits (
  bucket text NOT NULL,
  window_start timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, window_start)
);

CREATE TABLE IF NOT EXISTS analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  name text NOT NULL,
  properties jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS analytics_events_name_idx ON analytics_events (name, created_at);
`

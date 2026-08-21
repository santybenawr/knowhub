export const id = "0002_rls"
export const postgresOnly = true
export const sql = `-- Row Level Security (section 40).
--
-- Applied only on a managed Postgres (Supabase), where requests may reach the
-- database under the end user role. It is a second line of defence: the
-- application layer already scopes every query by workspace (see
-- src/server/permissions). The embedded PGlite dev database is single-user and
-- has no auth schema, so the migrator skips this file there.
--
-- KnowHub's own server connects with the service role and bypasses RLS by
-- design; these policies protect any direct or PostgREST access.

CREATE OR REPLACE FUNCTION knowhub_is_member(ws uuid) RETURNS boolean AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members m
    WHERE m.workspace_id = ws AND m.user_id = auth.uid()
  );
$fn$ LANGUAGE sql STABLE SECURITY DEFINER;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'workspaces','workspace_members','workspace_invitations','projects',
    'documents','document_chunks','notes','note_chunks',
    'meetings','meeting_speakers','meeting_transcript_segments',
    'meeting_chunks','meeting_analysis',
    'conversations','messages','message_sources',
    'ai_jobs','usage_events','audit_logs','analytics_events'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

DO $$
DECLARE t text;
BEGIN
  -- Every tenant table carries workspace_id, so one policy shape covers them.
  FOREACH t IN ARRAY ARRAY[
    'workspace_members','workspace_invitations','projects',
    'documents','document_chunks','notes','note_chunks',
    'meetings','meeting_speakers','meeting_transcript_segments',
    'meeting_chunks','meeting_analysis',
    'ai_jobs','usage_events','analytics_events'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_member_access', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I USING (knowhub_is_member(workspace_id)) WITH CHECK (knowhub_is_member(workspace_id))',
      t || '_member_access', t
    );
  END LOOP;
END $$;

DROP POLICY IF EXISTS workspaces_member_access ON workspaces;
CREATE POLICY workspaces_member_access ON workspaces
  USING (knowhub_is_member(id)) WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS conversations_owner_access ON conversations;
CREATE POLICY conversations_owner_access ON conversations
  USING (user_id = auth.uid() AND knowhub_is_member(workspace_id))
  WITH CHECK (user_id = auth.uid() AND knowhub_is_member(workspace_id));

DROP POLICY IF EXISTS messages_owner_access ON messages;
CREATE POLICY messages_owner_access ON messages
  USING (EXISTS (SELECT 1 FROM conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid()));

DROP POLICY IF EXISTS message_sources_owner_access ON message_sources;
CREATE POLICY message_sources_owner_access ON message_sources
  USING (EXISTS (
    SELECT 1 FROM messages m JOIN conversations c ON c.id = m.conversation_id
    WHERE m.id = message_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (
    SELECT 1 FROM messages m JOIN conversations c ON c.id = m.conversation_id
    WHERE m.id = message_id AND c.user_id = auth.uid()));

DROP POLICY IF EXISTS audit_logs_member_read ON audit_logs;
CREATE POLICY audit_logs_member_read ON audit_logs FOR SELECT
  USING (workspace_id IS NOT NULL AND knowhub_is_member(workspace_id));
`

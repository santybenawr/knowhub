export const id = '0004_private_app_tables'
export const postgresOnly = true
export const sql = `
-- App sessions are verified by KnowHub's server, not by PostgREST. In particular,
-- credentials and sessions must never inherit Supabase's public API grants.
DO $$
DECLARE table_name text; role_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'users', 'user_credentials', 'sessions', 'workspaces', 'workspace_members',
    'workspace_invitations', 'projects', 'documents', 'document_chunks', 'notes',
    'note_chunks', 'meetings', 'meeting_speakers', 'meeting_transcript_segments',
    'meeting_chunks', 'meeting_analysis', 'conversations', 'messages',
    'message_sources', 'ai_jobs', 'usage_events', 'audit_logs', 'rate_limits',
    'analytics_events', '__knowhub_migrations'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC', table_name);
    FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
        EXECUTE format('REVOKE ALL ON TABLE public.%I FROM %I', table_name, role_name);
      END IF;
    END LOOP;
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.knowhub_is_member(uuid) FROM PUBLIC;
`

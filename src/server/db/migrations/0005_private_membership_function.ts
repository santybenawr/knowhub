export const id = '0005_private_membership_function'
export const postgresOnly = true
export const sql = `
-- Supabase may grant API roles EXECUTE explicitly, in addition to PUBLIC.
-- Keep the legacy RLS helper internal and resolve every object unambiguously.
CREATE OR REPLACE FUNCTION public.knowhub_is_member(ws uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members m
    WHERE m.workspace_id = ws AND m.user_id = auth.uid()
  );
$fn$;
REVOKE ALL ON FUNCTION public.knowhub_is_member(uuid) FROM PUBLIC;
DO $$
DECLARE role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('REVOKE ALL ON FUNCTION public.knowhub_is_member(uuid) FROM %I', role_name);
    END IF;
  END LOOP;
END $$;
`

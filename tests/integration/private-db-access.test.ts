import { afterAll, expect, it } from 'vitest'
import { closeDb, getDbHandle } from '@/server/db/client'
import { sql as rls } from '@/server/db/migrations/0002_rls'
import { sql as privateTables } from '@/server/db/migrations/0004_private_app_tables'
import { sql as privateMembership } from '@/server/db/migrations/0005_private_membership_function'

afterAll(closeDb)

it('denies direct API roles access to credentials, sessions and tenant tables', async () => {
  const handle = await getDbHandle()
  // Model the managed provider's roles and grants in isolated embedded Postgres.
  await handle.exec(`
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS 'SELECT NULL::uuid';
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    GRANT USAGE ON SCHEMA public TO anon, authenticated;
    GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
  `)
  await handle.exec(rls)
  await handle.exec('GRANT EXECUTE ON FUNCTION public.knowhub_is_member(uuid) TO anon, authenticated')
  await handle.exec(privateTables)
  await handle.exec(privateMembership)
  for (const role of ['anon', 'authenticated']) {
    await handle.exec(`SET ROLE ${role}`)
    try {
      await expect(handle.raw("SELECT public.knowhub_is_member('00000000-0000-0000-0000-000000000000')")).rejects.toThrow(/permission denied/)
      for (const table of ['users', 'user_credentials', 'sessions', 'documents', 'notes', 'meetings', '__knowhub_migrations']) {
        await expect(handle.raw(`SELECT * FROM ${table} LIMIT 1`)).rejects.toThrow(/permission denied/)
      }
    } finally {
      await handle.exec('RESET ROLE')
    }
  }
  await expect(handle.raw('SELECT count(*) FROM users')).resolves.toBeTruthy()
})

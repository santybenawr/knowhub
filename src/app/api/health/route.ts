import { NextResponse } from 'next/server'
import { getProviderStatus } from '@/config/env'
import { getDbHandle } from '@/server/db/client'

export const dynamic = 'force-dynamic'

/** Liveness probe. Reports which providers are active without leaking secrets. */
export async function GET() {
  try {
    const handle = await getDbHandle()
    await handle.raw('SELECT 1')
    return NextResponse.json({ status: 'ok', providers: getProviderStatus() })
  } catch (err) {
    console.error('[knowhub] health check failed', err)
    return NextResponse.json({ status: 'degraded' }, { status: 503 })
  }
}

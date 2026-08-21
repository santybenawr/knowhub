import { NextResponse, type NextRequest } from 'next/server'
import { requireApiContext } from '@/server/auth/guard'
import { assertProjectInWorkspace } from '@/server/permissions'
import { createDocumentFromUpload } from '@/server/documents'
import { enforceRateLimit } from '@/server/rate-limit'
import { errorResponse, unauthorizedResponse } from '@/server/http'
import { validation } from '@/lib/errors'
import { getServerEnv } from '@/config/env'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

/** §52 — Document upload. */
export async function POST(request: NextRequest) {
  try {
    const context = await requireApiContext('content:create')
    if (!context) return unauthorizedResponse()

    await enforceRateLimit('documentUpload', context.access.userId)

    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) throw validation('Falta el archivo.')

    const maxBytes = getServerEnv().MAX_UPLOAD_MB * 1024 * 1024
    if (file.size > maxBytes) {
      throw validation(`El archivo supera el máximo de ${getServerEnv().MAX_UPLOAD_MB} MB.`)
    }

    const projectIdRaw = form.get('projectId')
    const projectId = await assertProjectInWorkspace(
      typeof projectIdRaw === 'string' && projectIdRaw !== '' ? projectIdRaw : null,
      context.access.workspaceId,
    )

    const titleRaw = form.get('title')

    const { documentId } = await createDocumentFromUpload({
      access: context.access,
      buffer: Buffer.from(await file.arrayBuffer()),
      filename: file.name,
      declaredMime: file.type,
      title: typeof titleRaw === 'string' ? titleRaw : null,
      projectId,
    })

    return NextResponse.json({ ok: true, documentId })
  } catch (err) {
    return errorResponse(err)
  }
}

'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requirePageContext } from '@/server/auth/guard'
import { requireDocumentAccess } from '@/server/permissions'
import { softDeleteDocument } from '@/server/documents'
import { enqueueAndRun } from '@/server/jobs'
import { enforceRateLimit } from '@/server/rate-limit'
import { fail, ok, type ActionResult } from '@/lib/action-result'
import { toUserMessage } from '@/lib/errors'

export async function reprocessDocumentAction(documentId: string): Promise<ActionResult<undefined>> {
  try {
    const { user } = await requirePageContext()
    const access = await requireDocumentAccess(user.id, documentId, 'content:edit')
    await enforceRateLimit('reanalyze', access.userId)
    await enqueueAndRun({
      workspaceId: access.workspaceId,
      resourceType: 'document',
      resourceId: documentId,
      type: 'document_processing',
    })
    revalidatePath(`/documents/${documentId}`)
    return ok()
  } catch (err) {
    return fail(toUserMessage(err))
  }
}

export async function deleteDocumentAction(documentId: string): Promise<ActionResult<undefined>> {
  try {
    const { user } = await requirePageContext()
    const access = await requireDocumentAccess(user.id, documentId, 'content:delete')
    await softDeleteDocument(documentId, access)
  } catch (err) {
    return fail(toUserMessage(err))
  }
  revalidatePath('/library')
  redirect('/library')
}

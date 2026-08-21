'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requirePageContext } from '@/server/auth/guard'
import { assertProjectInWorkspace, requireNoteAccess } from '@/server/permissions'
import { createNote, softDeleteNote, updateNote } from '@/server/notes'
import { fail, ok, type ActionResult } from '@/lib/action-result'
import { toUserMessage } from '@/lib/errors'

export async function createNoteAction(input: {
  title: string
  content: string
  projectId?: string | null
  tags?: string[]
}): Promise<ActionResult<{ noteId: string }>> {
  try {
    const { access } = await requirePageContext('content:create')
    const projectId = await assertProjectInWorkspace(input.projectId ?? null, access.workspaceId)
    const noteId = await createNote({
      access,
      title: input.title,
      content: input.content,
      projectId,
      tags: input.tags ?? [],
    })
    revalidatePath('/library')
    return ok({ noteId })
  } catch (err) {
    return fail(toUserMessage(err))
  }
}

/** §55 — Autosave target. Called on a debounce from the editor. */
export async function updateNoteAction(input: {
  noteId: string
  title?: string
  content?: string
  projectId?: string | null
  tags?: string[]
}): Promise<ActionResult<undefined>> {
  try {
    const { user } = await requirePageContext()
    const access = await requireNoteAccess(user.id, input.noteId, 'content:edit')
    const projectId =
      input.projectId === undefined
        ? undefined
        : await assertProjectInWorkspace(input.projectId, access.workspaceId)

    await updateNote({
      access,
      noteId: input.noteId,
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.content !== undefined ? { content: input.content } : {}),
      ...(projectId !== undefined ? { projectId } : {}),
      ...(input.tags !== undefined ? { tags: input.tags } : {}),
    })
    return ok()
  } catch (err) {
    return fail(toUserMessage(err))
  }
}

export async function deleteNoteAction(noteId: string): Promise<ActionResult<undefined>> {
  try {
    const { user } = await requirePageContext()
    const access = await requireNoteAccess(user.id, noteId, 'content:delete')
    await softDeleteNote(noteId, access)
  } catch (err) {
    return fail(toUserMessage(err))
  }
  revalidatePath('/library')
  redirect('/library')
}

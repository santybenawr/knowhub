'use server'

import { revalidatePath } from 'next/cache'
import { requirePageContext } from '@/server/auth/guard'
import { createProject, deleteProject, updateProject } from '@/server/projects'
import { fail, ok, type ActionResult } from '@/lib/action-result'
import { toUserMessage } from '@/lib/errors'

export async function createProjectAction(input: {
  name: string
  description?: string
  icon?: string
}): Promise<ActionResult<{ projectId: string }>> {
  try {
    const { access } = await requirePageContext('content:create')
    if (!input.name.trim()) return fail('Ingresa un nombre para el proyecto.')
    const projectId = await createProject({
      access,
      name: input.name,
      description: input.description ?? null,
      icon: input.icon ?? null,
    })
    revalidatePath('/projects')
    revalidatePath('/', 'layout')
    return ok({ projectId })
  } catch (err) {
    return fail(toUserMessage(err))
  }
}

export async function updateProjectAction(input: {
  projectId: string
  name?: string
  description?: string | null
  icon?: string | null
  archived?: boolean
}): Promise<ActionResult<undefined>> {
  try {
    const { access } = await requirePageContext('content:edit')
    await updateProject({ access, ...input })
    revalidatePath('/projects')
    revalidatePath('/', 'layout')
    return ok()
  } catch (err) {
    return fail(toUserMessage(err))
  }
}

export async function deleteProjectAction(projectId: string): Promise<ActionResult<undefined>> {
  try {
    const { access } = await requirePageContext('content:delete')
    await deleteProject(projectId, access)
    revalidatePath('/projects')
    revalidatePath('/', 'layout')
    return ok()
  } catch (err) {
    return fail(toUserMessage(err))
  }
}

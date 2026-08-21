import type { Metadata } from 'next'
import { requirePageContext } from '@/server/auth/guard'
import { listProjects } from '@/server/projects'
import { NoteEditor } from '@/features/notes/note-editor'
import { createNoteAction, updateNoteAction } from '../actions'

export const metadata: Metadata = { title: 'Nueva nota' }

export default async function NewNotePage() {
  const { access } = await requirePageContext('content:create')
  const projects = await listProjects(access.workspaceId)

  return (
    <div className="mx-auto max-w-3xl">
      <NoteEditor
        noteId={null}
        initialTitle=""
        initialContent=""
        initialProjectId={null}
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        onCreate={createNoteAction}
        onUpdate={updateNoteAction}
      />
    </div>
  )
}

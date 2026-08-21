import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requirePageContext } from '@/server/auth/guard'
import { requireNoteAccess } from '@/server/permissions'
import { getNote } from '@/server/notes'
import { listProjects } from '@/server/projects'
import { findRelated } from '@/server/search'
import { NoteEditor } from '@/features/notes/note-editor'
import { RelatedKnowledge } from '@/components/shared/related-knowledge'
import { Badge } from '@/components/ui/badge'
import { deleteNoteAction, updateNoteAction } from '../actions'

type Params = { params: Promise<{ noteId: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  try {
    const { user } = await requirePageContext()
    const { noteId } = await params
    const access = await requireNoteAccess(user.id, noteId)
    const note = await getNote(noteId, access.workspaceId)
    return { title: note.title || 'Nota' }
  } catch {
    return { title: 'Nota' }
  }
}

export default async function NotePage({ params }: Params) {
  const { user } = await requirePageContext()
  const { noteId } = await params

  let access
  try {
    access = await requireNoteAccess(user.id, noteId)
  } catch {
    notFound()
  }

  const [note, projects, related] = await Promise.all([
    getNote(noteId, access.workspaceId),
    listProjects(access.workspaceId),
    findRelated({ workspaceId: access.workspaceId, kind: 'note', resourceId: noteId }),
  ])

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <NoteEditor
        noteId={note.id}
        initialTitle={note.title}
        initialContent={note.content}
        initialProjectId={note.projectId}
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        onUpdate={updateNoteAction}
        onDelete={deleteNoteAction}
      />

      {note.embeddingStatus !== 'completed' ? (
        <Badge tone={note.embeddingStatus === 'failed' ? 'record' : 'warning'}>
          {note.embeddingStatus === 'failed'
            ? 'No pudimos indexar esta nota para búsqueda'
            : 'Indexando para búsqueda…'}
        </Badge>
      ) : null}

      <RelatedKnowledge items={related} />
    </div>
  )
}

import { registerJobHandlers } from '@/server/jobs'
import { embedDocument, processDocument } from '@/server/documents'
import { indexNote } from '@/server/notes'
import { analyzeMeeting, indexMeeting, transcribeMeeting } from '@/server/meetings/pipeline'

/**
 * Wires job types to their handlers. Imported for its side effect from the
 * entry points that can enqueue work, so a handler is always registered by the
 * time the runner picks the job up.
 */
let registered = false

export function ensureJobHandlers(): void {
  if (registered) return
  registered = true
  registerJobHandlers({
    document_processing: ({ resourceId }) => processDocument(resourceId),
    document_embedding: ({ resourceId }) => embedDocument(resourceId),
    note_embedding: ({ resourceId }) => indexNote(resourceId),
    meeting_transcription: ({ resourceId }) => transcribeMeeting(resourceId),
    meeting_analysis: ({ resourceId }) => analyzeMeeting(resourceId),
    meeting_embedding: ({ resourceId }) => indexMeeting(resourceId),
  })
}

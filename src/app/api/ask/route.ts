import { type NextRequest } from 'next/server'
import { z } from 'zod'
import { requireApiContext } from '@/server/auth/guard'
import { assertProjectInWorkspace, requireDocumentAccess, requireMeetingAccess, requireNoteAccess } from '@/server/permissions'
import { getAIProvider } from '@/server/ai'
import { keepCitedOnly, retrieveContext, type Citation, type RagScope } from '@/server/ai/rag'
import { NO_EVIDENCE_ANSWER } from '@/server/ai/prompts'
import {
  appendMessage,
  createConversation,
  getConversation,
  getRecentHistory,
  saveCitations,
} from '@/server/conversations'
import { getMeeting } from '@/server/meetings'
import { getDocument } from '@/server/documents'
import { getNote } from '@/server/notes'
import { getProject } from '@/server/projects'
import { enforceRateLimit } from '@/server/rate-limit'
import { recordUsage } from '@/server/usage'
import { trackEvent } from '@/server/analytics'
import { errorResponse, unauthorizedResponse } from '@/server/http'
import { checkLimit, getPlanLimits } from '@/config/plans'
import { limitExceeded, validation } from '@/lib/errors'
import { getUsageSummary } from '@/server/usage'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 120

const bodySchema = z.object({
  question: z.string().trim().min(2, 'Escribe una pregunta.').max(2000),
  conversationId: z.string().uuid().optional(),
  scope: z.discriminatedUnion('type', [
    z.object({ type: z.literal('workspace') }),
    z.object({ type: z.literal('project'), projectId: z.string().uuid() }),
    z.object({ type: z.literal('document'), documentId: z.string().uuid() }),
    z.object({ type: z.literal('note'), noteId: z.string().uuid() }),
    z.object({ type: z.literal('meeting'), meetingId: z.string().uuid() }),
  ]),
})

/**
 * §102/§110/§117 — Ask KnowHub.
 *
 * Streams NDJSON frames so the client can show retrieval and generation as they
 * happen: `status` → `citations` → many `delta` → `done`. Citations are sent
 * *before* the text so the sources are on screen while the answer is still
 * being written, which is what makes them feel like evidence rather than a
 * footnote.
 *
 * The scope is re-verified server-side against real workspace membership; a
 * meeting id in the request body grants nothing on its own (§16).
 */
export async function POST(request: NextRequest) {
  try {
    const context = await requireApiContext('ai:use')
    if (!context) return unauthorizedResponse()

    await enforceRateLimit('ask', context.access.userId)

    const parsed = bodySchema.safeParse(await request.json())
    if (!parsed.success) {
      throw validation(parsed.error.issues[0]?.message ?? 'Solicitud inválida.')
    }
    const { question, scope: rawScope } = parsed.data

    const usage = await getUsageSummary(context.access.workspaceId, context.access.plan)
    const limitCheck = checkLimit(getPlanLimits(context.access.plan), 'maxAiQueriesPerMonth', usage.aiQueries)
    if (!limitCheck.allowed) throw limitExceeded(limitCheck.reason)

    const scope = await resolveScope(rawScope, context.access.userId, context.access.workspaceId)

    const conversationId =
      parsed.data.conversationId ??
      (await createConversation({
        access: context.access,
        scope: rawScope.type,
        title: question,
        projectId: rawScope.type === 'project' ? rawScope.projectId : null,
        documentId: rawScope.type === 'document' ? rawScope.documentId : null,
        meetingId: rawScope.type === 'meeting' ? rawScope.meetingId : null,
        noteId: rawScope.type === 'note' ? rawScope.noteId : null,
      }))

    // Verify an explicitly-supplied conversation belongs to this caller.
    if (parsed.data.conversationId) {
      await getConversation(parsed.data.conversationId, context.access)
    }

    const history = await getRecentHistory(conversationId)
    await appendMessage({
      conversationId,
      workspaceId: context.access.workspaceId,
      role: 'user',
      content: question,
    })

    await recordUsage(context.access.workspaceId, 'ai_query', 1, { userId: context.access.userId })
    await trackEvent(
      rawScope.type === 'meeting' ? 'meeting_question_sent' : 'ai_question_sent',
      context.access,
      { scope: rawScope.type },
    )

    const encoder = new TextEncoder()
    const frame = (payload: unknown) => encoder.encode(`${JSON.stringify(payload)}\n`)

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let answer = ''
        let citations: Citation[] = []
        try {
          controller.enqueue(frame({ type: 'status', value: 'searching' }))

          const retrieved = await retrieveContext({
            workspaceId: context.access.workspaceId,
            question,
            scope,
            history,
          })

          if (!retrieved.hasEvidence) {
            // §114 — no evidence means no answer, not a guess from memory.
            answer = NO_EVIDENCE_ANSWER
            controller.enqueue(frame({ type: 'citations', value: [] }))
            controller.enqueue(frame({ type: 'delta', value: answer }))
          } else {
            citations = retrieved.citations
            controller.enqueue(frame({ type: 'citations', value: citations }))
            controller.enqueue(frame({ type: 'status', value: 'generating' }))

            const provider = getAIProvider()
            for await (const delta of provider.streamText({
              messages: retrieved.messages,
              temperature: 0.1,
            })) {
              answer += delta
              controller.enqueue(frame({ type: 'delta', value: delta }))
            }
            answer = answer.trim() || NO_EVIDENCE_ANSWER
            citations = keepCitedOnly(answer, citations)
            // Re-send the pruned set so the UI lists only what was cited.
            controller.enqueue(frame({ type: 'citations', value: citations }))
          }

          const messageId = await appendMessage({
            conversationId,
            workspaceId: context.access.workspaceId,
            role: 'assistant',
            content: answer,
          })
          await saveCitations({
            messageId,
            workspaceId: context.access.workspaceId,
            citations,
          })

          controller.enqueue(frame({ type: 'done', conversationId }))
        } catch (err) {
          console.error('[knowhub] ask stream failed', err)
          controller.enqueue(
            frame({
              type: 'error',
              value: 'No pudimos completar la respuesta. Intenta de nuevo.',
            }),
          )
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'Cache-Control': 'no-store, no-transform',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (err) {
    return errorResponse(err)
  }
}

/**
 * Turns the requested scope into a verified one. Each branch loads the resource
 * through a permission check, so an id the caller cannot access fails here
 * rather than silently widening or narrowing the search.
 */
async function resolveScope(
  scope: z.infer<typeof bodySchema>['scope'],
  userId: string,
  workspaceId: string,
): Promise<RagScope> {
  switch (scope.type) {
    case 'project': {
      await assertProjectInWorkspace(scope.projectId, workspaceId)
      const project = await getProject(scope.projectId, workspaceId)
      return { type: 'project', projectId: project.id, projectName: project.name }
    }
    case 'document': {
      const access = await requireDocumentAccess(userId, scope.documentId)
      const document = await getDocument(scope.documentId, access.workspaceId)
      return { type: 'document', documentId: document.id, title: document.title }
    }
    case 'note': {
      const access = await requireNoteAccess(userId, scope.noteId)
      const note = await getNote(scope.noteId, access.workspaceId)
      return { type: 'note', noteId: note.id, title: note.title || 'Nota sin título' }
    }
    case 'meeting': {
      const access = await requireMeetingAccess(userId, scope.meetingId)
      const meeting = await getMeeting(scope.meetingId, access.workspaceId)
      return { type: 'meeting', meetingId: meeting.id, title: meeting.title }
    }
    default:
      return { type: 'workspace' }
  }
}

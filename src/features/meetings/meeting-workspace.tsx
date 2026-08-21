'use client'

import * as React from 'react'
import { AlertTriangle, CalendarClock, CheckCircle2, CircleHelp, ListTodo, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StageList, type StageState } from '@/components/ui/status'
import { formatTimestamp } from '@/lib/time'
import type { ActionResult } from '@/lib/action-result'
import { AskPanel } from '@/features/ask/ask-panel'
import type { CitationView } from '@/features/ask/citations'
import { AudioPlayer, type AudioPlayerHandle } from './audio-player'
import { TranscriptView, type TranscriptSegmentView } from './transcript-view'

export type MeetingAnalysisView = {
  summary: string
  topics: string[]
  participants: string[]
  decisions: Array<{ text: string; evidenceSegmentIds: string[] }>
  actionItems: Array<{
    task: string
    responsible: string | null
    deadline: string | null
    evidenceSegmentIds: string[]
  }>
  keyPoints: Array<{ text: string; evidenceSegmentIds: string[] }>
  openQuestions: Array<{ text: string; evidenceSegmentIds: string[] }>
  importantDates: Array<{ text: string; date: string | null; evidenceSegmentIds: string[] }>
  suggestedQuestions: string[]
}

type Props = {
  meetingId: string
  audioUrl: string | null
  durationSeconds: number | null
  startAt: number | null
  segments: TranscriptSegmentView[]
  speakers: Array<{ speakerKey: string; displayName: string }>
  analysis: MeetingAnalysisView | null
  statuses: {
    transcription: StageState
    analysis: StageState
    embedding: StageState
    transcriptionError: string | null
    analysisError: string | null
  }
  transcriptionIsMock: boolean
  onRenameSpeaker: (input: {
    meetingId: string
    speakerKey: string
    displayName: string
  }) => Promise<ActionResult<undefined>>
  onRetryStage: (input: {
    meetingId: string
    stage: 'transcription' | 'analysis' | 'embedding'
  }) => Promise<ActionResult<undefined>>
}

/**
 * §94–§100 — Meeting page.
 *
 * The player is the shared anchor: every timestamp, decision and citation on
 * this page seeks it rather than navigating, so verifying a claim costs one
 * click and never loses your place (§6).
 */
export function MeetingWorkspace({
  meetingId,
  audioUrl,
  durationSeconds,
  startAt,
  segments,
  speakers,
  analysis,
  statuses,
  transcriptionIsMock,
  onRenameSpeaker,
  onRetryStage,
}: Props) {
  const playerRef = React.useRef<AudioPlayerHandle>(null)
  const [currentTime, setCurrentTime] = React.useState(0)
  const [tab, setTab] = React.useState(analysis ? 'resumen' : 'transcripcion')

  const segmentById = React.useMemo(
    () => new Map(segments.map((segment) => [segment.id, segment])),
    [segments],
  )

  const seekTo = React.useCallback((seconds: number) => {
    playerRef.current?.seekTo(seconds)
    setCurrentTime(seconds)
  }, [])

  /** §186 — jump to the first segment that supports an insight. */
  const seekToEvidence = React.useCallback(
    (segmentIds: string[]) => {
      for (const id of segmentIds) {
        const segment = segmentById.get(id)
        if (segment) {
          seekTo(segment.startSeconds)
          return
        }
      }
    },
    [seekTo, segmentById],
  )

  const onCitationClick = React.useCallback(
    (citation: CitationView) => {
      if (citation.startSeconds !== null) {
        seekTo(citation.startSeconds)
        setTab('transcripcion')
      }
    },
    [seekTo],
  )

  const stillProcessing =
    statuses.transcription === 'processing' ||
    statuses.transcription === 'pending' ||
    statuses.analysis === 'processing'

  return (
    <div className="space-y-5">
      {audioUrl ? (
        <AudioPlayer
          ref={playerRef}
          src={audioUrl}
          durationHint={durationSeconds}
          startAt={startAt}
          onTimeUpdate={setCurrentTime}
        />
      ) : null}

      {transcriptionIsMock ? (
        <Notice tone="warning" icon={<AlertTriangle className="size-4 text-warning" />}>
          <strong className="font-semibold">Transcripción de desarrollo.</strong> No hay proveedor de
          transcripción configurado, así que este texto proviene del proveedor local y no corresponde al
          audio. Configura <code className="font-mono text-xs">TRANSCRIPTION_API_KEY</code> o importa la
          transcripción real.
        </Notice>
      ) : null}

      {statuses.transcription === 'failed' ? (
        <Notice tone="record" icon={<AlertTriangle className="size-4 text-record" />}>
          <div className="space-y-2">
            <p>
              <strong className="font-semibold">No pudimos transcribir esta reunión.</strong> El audio
              sigue guardado y puedes escucharlo.
            </p>
            {statuses.transcriptionError ? (
              <p className="text-xs text-ink-muted">{statuses.transcriptionError}</p>
            ) : null}
            <RetryButton meetingId={meetingId} stage="transcription" onRetry={onRetryStage}>
              Intentar nuevamente
            </RetryButton>
          </div>
        </Notice>
      ) : null}

      {statuses.transcription === 'completed' && statuses.analysis === 'failed' ? (
        <Notice tone="warning" icon={<AlertTriangle className="size-4 text-warning" />}>
          <div className="space-y-2">
            <p>La transcripción está lista, pero no pudimos generar el análisis.</p>
            <RetryButton meetingId={meetingId} stage="analysis" onRetry={onRetryStage}>
              Volver a analizar
            </RetryButton>
          </div>
        </Notice>
      ) : null}

      {statuses.embedding === 'failed' ? (
        <Notice tone="warning" icon={<AlertTriangle className="size-4 text-warning" />}>
          <div className="space-y-2">
            <p>La reunión está disponible, pero la búsqueda inteligente aún no está lista.</p>
            <RetryButton meetingId={meetingId} stage="embedding" onRetry={onRetryStage}>
              Reintentar indexación
            </RetryButton>
          </div>
        </Notice>
      ) : null}

      {stillProcessing ? (
        <div className="surface-card p-5">
          <h2 className="mb-3 text-sm font-semibold text-ink">Procesando la reunión</h2>
          <StageList
            stages={[
              { label: 'Grabación guardada', state: 'completed' },
              { label: 'Transcribiendo', state: statuses.transcription },
              { label: 'Analizando contenido', state: statuses.analysis },
              { label: 'Preparando búsqueda', state: statuses.embedding },
            ]}
          />
          <p className="mt-4 text-xs text-ink-muted">
            Puedes seguir usando KnowHub mientras tanto. Te avisamos cuando esté lista.
          </p>
        </div>
      ) : null}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="decisiones">
            Decisiones
            {analysis?.decisions.length ? (
              <span className="ml-1.5 text-xs text-ink-faint">{analysis.decisions.length}</span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="pendientes">
            Pendientes
            {analysis?.actionItems.length ? (
              <span className="ml-1.5 text-xs text-ink-faint">{analysis.actionItems.length}</span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="transcripcion">Transcripción</TabsTrigger>
          <TabsTrigger value="preguntar">Preguntar</TabsTrigger>
        </TabsList>

        <TabsContent value="resumen">
          <SummaryTab analysis={analysis} onSeekEvidence={seekToEvidence} segmentById={segmentById} />
        </TabsContent>

        <TabsContent value="decisiones">
          <DecisionsTab analysis={analysis} onSeekEvidence={seekToEvidence} segmentById={segmentById} />
        </TabsContent>

        <TabsContent value="pendientes">
          <ActionItemsTab analysis={analysis} onSeekEvidence={seekToEvidence} segmentById={segmentById} />
        </TabsContent>

        <TabsContent value="transcripcion">
          <TranscriptView
            segments={segments}
            speakers={speakers}
            currentTime={currentTime}
            onSeek={seekTo}
            onRenameSpeaker={(speakerKey, displayName) =>
              onRenameSpeaker({ meetingId, speakerKey, displayName })
            }
          />
        </TabsContent>

        <TabsContent value="preguntar">
          <AskPanel
            scope={{ type: 'meeting', meetingId }}
            placeholder="Pregunta algo sobre esta reunión..."
            suggestions={
              analysis?.suggestedQuestions?.length
                ? analysis.suggestedQuestions
                : ['¿Qué decisiones tomamos?', '¿Quién tiene pendientes?', '¿Qué se dijo sobre presupuesto?']
            }
            onCitationClick={onCitationClick}
            emptyTitle="Pregunta sobre esta reunión"
            emptyDescription="Respondemos solo con lo que se dijo, y te llevamos al minuto exacto."
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function SummaryTab({
  analysis,
  onSeekEvidence,
  segmentById,
}: {
  analysis: MeetingAnalysisView | null
  onSeekEvidence: (ids: string[]) => void
  segmentById: Map<string, TranscriptSegmentView>
}) {
  if (!analysis) {
    return <p className="text-sm text-ink-muted">El análisis todavía no está disponible.</p>
  }

  return (
    <div className="space-y-6">
      {analysis.summary ? (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-ink">Resumen</h2>
          <p className="leading-relaxed text-ink-muted">{analysis.summary}</p>
        </section>
      ) : null}

      {analysis.participants.length > 0 ? (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-ink">Personas</h2>
          <div className="flex flex-wrap gap-1.5">
            {analysis.participants.map((person) => (
              <Badge key={person}>{person}</Badge>
            ))}
          </div>
        </section>
      ) : null}

      {analysis.topics.length > 0 ? (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-ink">Temas</h2>
          <div className="flex flex-wrap gap-1.5">
            {analysis.topics.map((topic) => (
              <Badge key={topic} tone="brand">
                {topic}
              </Badge>
            ))}
          </div>
        </section>
      ) : null}

      {analysis.keyPoints.length > 0 ? (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-ink">Puntos clave</h2>
          <ul className="space-y-2">
            {analysis.keyPoints.map((point, i) => (
              <li key={i} className="rounded-lg border border-border-subtle bg-surface p-3">
                <p className="text-sm text-ink">{point.text}</p>
                <EvidenceButton
                  ids={point.evidenceSegmentIds}
                  onSeek={onSeekEvidence}
                  segmentById={segmentById}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {analysis.openQuestions.length > 0 ? (
        <section>
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink">
            <CircleHelp className="size-4 text-ink-faint" aria-hidden /> Preguntas abiertas
          </h2>
          <ul className="space-y-2">
            {analysis.openQuestions.map((question, i) => (
              <li key={i} className="rounded-lg border border-border-subtle bg-surface p-3">
                <p className="text-sm text-ink">{question.text}</p>
                <EvidenceButton
                  ids={question.evidenceSegmentIds}
                  onSeek={onSeekEvidence}
                  segmentById={segmentById}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {analysis.importantDates.length > 0 ? (
        <section>
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink">
            <CalendarClock className="size-4 text-ink-faint" aria-hidden /> Fechas mencionadas
          </h2>
          <ul className="space-y-2">
            {analysis.importantDates.map((item, i) => (
              <li key={i} className="rounded-lg border border-border-subtle bg-surface p-3">
                <p className="text-sm text-ink">{item.text}</p>
                <EvidenceButton
                  ids={item.evidenceSegmentIds}
                  onSeek={onSeekEvidence}
                  segmentById={segmentById}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

function DecisionsTab({
  analysis,
  onSeekEvidence,
  segmentById,
}: {
  analysis: MeetingAnalysisView | null
  onSeekEvidence: (ids: string[]) => void
  segmentById: Map<string, TranscriptSegmentView>
}) {
  if (!analysis) return <p className="text-sm text-ink-muted">El análisis todavía no está disponible.</p>
  if (analysis.decisions.length === 0) {
    return (
      <p className="text-sm text-ink-muted">
        No identificamos decisiones explícitas en esta reunión.
      </p>
    )
  }

  return (
    <ul className="space-y-3">
      {analysis.decisions.map((decision, i) => (
        <li key={i} className="flex items-start gap-3 rounded-card border border-border-subtle bg-surface p-4">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-positive" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-ink">{decision.text}</p>
            <EvidenceButton
              ids={decision.evidenceSegmentIds}
              onSeek={onSeekEvidence}
              segmentById={segmentById}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

function ActionItemsTab({
  analysis,
  onSeekEvidence,
  segmentById,
}: {
  analysis: MeetingAnalysisView | null
  onSeekEvidence: (ids: string[]) => void
  segmentById: Map<string, TranscriptSegmentView>
}) {
  if (!analysis) return <p className="text-sm text-ink-muted">El análisis todavía no está disponible.</p>
  if (analysis.actionItems.length === 0) {
    return <p className="text-sm text-ink-muted">No identificamos pendientes en esta reunión.</p>
  }

  return (
    <ul className="space-y-3">
      {analysis.actionItems.map((item, i) => (
        <li key={i} className="flex items-start gap-3 rounded-card border border-border-subtle bg-surface p-4">
          <ListTodo className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-ink">{item.task}</p>
            {/* §93/§98 — absence is stated, never filled in. */}
            <p className="mt-1 text-xs text-ink-muted">
              {item.responsible ? (
                <>
                  Responsable: <span className="font-medium text-ink">{item.responsible}</span>
                </>
              ) : (
                <span className="italic">Responsable no especificado</span>
              )}
              {' · '}
              {item.deadline ? (
                <>
                  Fecha: <span className="font-medium text-ink">{item.deadline}</span>
                </>
              ) : (
                <span className="italic">Sin fecha definida</span>
              )}
            </p>
            <EvidenceButton
              ids={item.evidenceSegmentIds}
              onSeek={onSeekEvidence}
              segmentById={segmentById}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

/** §97/§186 — "Fuente · 23:41", clickable, derived from a real segment. */
function EvidenceButton({
  ids,
  onSeek,
  segmentById,
}: {
  ids: string[]
  onSeek: (ids: string[]) => void
  segmentById?: Map<string, TranscriptSegmentView>
}) {
  if (ids.length === 0) return null
  const first = segmentById && ids[0] ? segmentById.get(ids[0]) : undefined

  return (
    <button
      type="button"
      onClick={() => onSeek(ids)}
      className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-brand-soft px-2 py-1 font-mono text-xs text-brand-ink transition-opacity hover:opacity-80"
    >
      Fuente
      {first ? <span>· {formatTimestamp(first.startSeconds)}</span> : null}
    </button>
  )
}

function RetryButton({
  meetingId,
  stage,
  onRetry,
  children,
}: {
  meetingId: string
  stage: 'transcription' | 'analysis' | 'embedding'
  onRetry: (input: { meetingId: string; stage: 'transcription' | 'analysis' | 'embedding' }) => Promise<ActionResult<undefined>>
  children: React.ReactNode
}) {
  const [pending, startTransition] = React.useTransition()
  return (
    <Button
      size="sm"
      variant="secondary"
      loading={pending}
      onClick={() => startTransition(() => void onRetry({ meetingId, stage }))}
    >
      <RefreshCw /> {children}
    </Button>
  )
}

function Notice({
  tone,
  icon,
  children,
}: {
  tone: 'warning' | 'record'
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div
      className={
        tone === 'record'
          ? 'flex items-start gap-3 rounded-card border border-record/40 bg-record-soft p-4 text-sm text-ink'
          : 'flex items-start gap-3 rounded-card border border-warning/40 bg-warning-soft p-4 text-sm text-ink'
      }
      role="alert"
    >
      <span className="mt-0.5 shrink-0" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

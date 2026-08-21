import { sql } from 'drizzle-orm'
import {
  bigint,
  check,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  vector,
} from 'drizzle-orm/pg-core'

/**
 * KnowHub data model (§18–§38).
 *
 * Conventions:
 *  - every tenant-scoped row carries `workspaceId` so a single predicate can
 *    enforce isolation in queries *and* in RLS policies;
 *  - user-visible resources are soft-deleted (`deletedAt`) and hard-deleted
 *    only through an explicit purge path (§126);
 *  - status columns are `text` + CHECK constraints rather than PG enums, so
 *    adding a state is a one-line migration.
 */

/** Embedding width. Changing this requires a migration + re-embedding. */
export const EMBEDDING_DIMENSIONS = 1536

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}

/* ------------------------------------------------------------------ users */

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    name: text('name').notNull(),
    avatarUrl: text('avatar_url'),
    timezone: text('timezone').notNull().default('America/Bogota'),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    onboardingCompletedAt: timestamp('onboarding_completed_at', { withTimezone: true }),
    onboardingPurpose: text('onboarding_purpose'),
    themePreference: text('theme_preference').notNull().default('system'),
    recordingConsentAt: timestamp('recording_consent_at', { withTimezone: true }),
    lastWorkspaceId: uuid('last_workspace_id'),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('users_email_unique').on(sql`lower(${t.email})`),
    check('users_theme_check', sql`${t.themePreference} in ('light','dark','system')`),
  ],
)

/** Local auth provider credentials. Empty when an external IdP owns the user. */
export const userCredentials = pgTable('user_credentials', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  passwordHash: text('password_hash').notNull(),
  passwordResetTokenHash: text('password_reset_token_hash'),
  passwordResetExpiresAt: timestamp('password_reset_expires_at', { withTimezone: true }),
  emailVerificationTokenHash: text('email_verification_token_hash'),
  ...timestamps,
})

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    userAgent: text('user_agent'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('sessions_token_hash_unique').on(t.tokenHash),
    index('sessions_user_idx').on(t.userId),
  ],
)

/* ------------------------------------------------------------- workspaces */

export type WorkspaceType = 'personal' | 'team' | 'education' | 'business'
export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'

export const workspaces = pgTable(
  'workspaces',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    type: text('type').$type<WorkspaceType>().notNull().default('personal'),
    plan: text('plan').notNull().default('free'),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    billingCustomerId: text('billing_customer_id'),
    ...timestamps,
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('workspaces_slug_unique').on(t.slug),
    index('workspaces_owner_idx').on(t.ownerId),
    check('workspaces_type_check', sql`${t.type} in ('personal','team','education','business')`),
    check('workspaces_plan_check', sql`${t.plan} in ('free','pro','team')`),
  ],
)

export const workspaceMembers = pgTable(
  'workspace_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role').$type<WorkspaceRole>().notNull().default('MEMBER'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('workspace_members_unique').on(t.workspaceId, t.userId),
    index('workspace_members_user_idx').on(t.userId),
    check('workspace_members_role_check', sql`${t.role} in ('OWNER','ADMIN','MEMBER','VIEWER')`),
  ],
)

export const workspaceInvitations = pgTable(
  'workspace_invitations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    role: text('role').$type<WorkspaceRole>().notNull().default('MEMBER'),
    tokenHash: text('token_hash').notNull(),
    invitedBy: uuid('invited_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('workspace_invitations_token_unique').on(t.tokenHash),
    index('workspace_invitations_ws_idx').on(t.workspaceId),
  ],
)

/* --------------------------------------------------------------- projects */

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    icon: text('icon').notNull().default('📁'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    ...timestamps,
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [index('projects_workspace_idx').on(t.workspaceId, t.deletedAt)],
)

/* -------------------------------------------------------------- documents */

export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed'
export type DocumentSourceType = 'upload' | 'manual' | 'web'

export const documents = pgTable(
  'documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    title: text('title').notNull(),
    description: text('description'),
    summary: text('summary'),
    topics: jsonb('topics').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    sourceType: text('source_type').$type<DocumentSourceType>().notNull().default('upload'),
    mimeType: text('mime_type').notNull(),
    originalFilename: text('original_filename'),
    storagePath: text('storage_path'),
    fileSize: bigint('file_size', { mode: 'number' }).notNull().default(0),
    pageCount: integer('page_count'),
    language: text('language'),
    processingStatus: text('processing_status').$type<ProcessingStatus>().notNull().default('pending'),
    processingError: text('processing_error'),
    embeddingStatus: text('embedding_status').$type<ProcessingStatus>().notNull().default('pending'),
    ...timestamps,
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    index('documents_workspace_idx').on(t.workspaceId, t.deletedAt),
    index('documents_project_idx').on(t.projectId),
    check(
      'documents_processing_status_check',
      sql`${t.processingStatus} in ('pending','processing','completed','failed')`,
    ),
    check(
      'documents_embedding_status_check',
      sql`${t.embeddingStatus} in ('pending','processing','completed','failed')`,
    ),
    check('documents_source_type_check', sql`${t.sourceType} in ('upload','manual','web')`),
  ],
)

export const documentChunks = pgTable(
  'document_chunks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    documentId: uuid('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    chunkIndex: integer('chunk_index').notNull(),
    pageNumber: integer('page_number'),
    sectionTitle: text('section_title'),
    tokenCount: integer('token_count'),
    embedding: vector('embedding', { dimensions: EMBEDDING_DIMENSIONS }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('document_chunks_unique').on(t.documentId, t.chunkIndex),
    index('document_chunks_workspace_idx').on(t.workspaceId),
  ],
)

/* ------------------------------------------------------------------ notes */

export const notes = pgTable(
  'notes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    title: text('title').notNull().default(''),
    content: text('content').notNull().default(''),
    tags: jsonb('tags').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    summary: text('summary'),
    embeddingStatus: text('embedding_status').$type<ProcessingStatus>().notNull().default('pending'),
    ...timestamps,
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    index('notes_workspace_idx').on(t.workspaceId, t.deletedAt),
    index('notes_project_idx').on(t.projectId),
    check(
      'notes_embedding_status_check',
      sql`${t.embeddingStatus} in ('pending','processing','completed','failed')`,
    ),
  ],
)

export const noteChunks = pgTable(
  'note_chunks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    noteId: uuid('note_id')
      .notNull()
      .references(() => notes.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    chunkIndex: integer('chunk_index').notNull(),
    tokenCount: integer('token_count'),
    embedding: vector('embedding', { dimensions: EMBEDDING_DIMENSIONS }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('note_chunks_unique').on(t.noteId, t.chunkIndex),
    index('note_chunks_workspace_idx').on(t.workspaceId),
  ],
)

/* --------------------------------------------------------------- meetings */

export type MeetingStatus = 'draft' | 'recording' | 'uploading' | 'processing' | 'ready' | 'failed'
export type MeetingSource = 'recording' | 'upload' | 'transcript_import'

export const meetings = pgTable(
  'meetings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    title: text('title').notNull(),
    description: text('description'),
    source: text('source').$type<MeetingSource>().notNull().default('recording'),
    meetingDate: timestamp('meeting_date', { withTimezone: true }).notNull().defaultNow(),
    startedAt: timestamp('started_at', { withTimezone: true }),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    durationSeconds: integer('duration_seconds'),
    status: text('status').$type<MeetingStatus>().notNull().default('draft'),
    audioStoragePath: text('audio_storage_path'),
    audioMimeType: text('audio_mime_type'),
    audioSizeBytes: bigint('audio_size_bytes', { mode: 'number' }),
    transcriptionStatus: text('transcription_status').$type<ProcessingStatus>().notNull().default('pending'),
    analysisStatus: text('analysis_status').$type<ProcessingStatus>().notNull().default('pending'),
    embeddingStatus: text('embedding_status').$type<ProcessingStatus>().notNull().default('pending'),
    transcriptionError: text('transcription_error'),
    analysisError: text('analysis_error'),
    embeddingError: text('embedding_error'),
    language: text('language'),
    participantsHint: jsonb('participants_hint').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    ...timestamps,
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    index('meetings_workspace_idx').on(t.workspaceId, t.deletedAt),
    index('meetings_project_idx').on(t.projectId),
    check(
      'meetings_status_check',
      sql`${t.status} in ('draft','recording','uploading','processing','ready','failed')`,
    ),
    check(
      'meetings_transcription_status_check',
      sql`${t.transcriptionStatus} in ('pending','processing','completed','failed')`,
    ),
    check(
      'meetings_analysis_status_check',
      sql`${t.analysisStatus} in ('pending','processing','completed','failed')`,
    ),
    check(
      'meetings_embedding_status_check',
      sql`${t.embeddingStatus} in ('pending','processing','completed','failed')`,
    ),
    check('meetings_source_check', sql`${t.source} in ('recording','upload','transcript_import')`),
    check('meetings_duration_check', sql`${t.durationSeconds} is null or ${t.durationSeconds} >= 0`),
  ],
)

export const meetingSpeakers = pgTable(
  'meeting_speakers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    meetingId: uuid('meeting_id')
      .notNull()
      .references(() => meetings.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    speakerKey: text('speaker_key').notNull(),
    displayName: text('display_name'),
    ...timestamps,
  },
  (t) => [uniqueIndex('meeting_speakers_unique').on(t.meetingId, t.speakerKey)],
)

export const meetingTranscriptSegments = pgTable(
  'meeting_transcript_segments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    meetingId: uuid('meeting_id')
      .notNull()
      .references(() => meetings.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    segmentIndex: integer('segment_index').notNull(),
    speakerKey: text('speaker_key'),
    startSeconds: doublePrecision('start_seconds').notNull(),
    endSeconds: doublePrecision('end_seconds').notNull(),
    text: text('text').notNull(),
    editedText: text('edited_text'),
    confidence: real('confidence'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('meeting_segments_unique').on(t.meetingId, t.segmentIndex),
    index('meeting_segments_workspace_idx').on(t.workspaceId),
    check('meeting_segments_time_check', sql`${t.endSeconds} >= ${t.startSeconds}`),
  ],
)

export const meetingChunks = pgTable(
  'meeting_chunks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    meetingId: uuid('meeting_id')
      .notNull()
      .references(() => meetings.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    chunkIndex: integer('chunk_index').notNull(),
    content: text('content').notNull(),
    startSeconds: doublePrecision('start_seconds').notNull(),
    endSeconds: doublePrecision('end_seconds').notNull(),
    speakerKeys: jsonb('speaker_keys').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    segmentIds: jsonb('segment_ids').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    tokenCount: integer('token_count'),
    embedding: vector('embedding', { dimensions: EMBEDDING_DIMENSIONS }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('meeting_chunks_unique').on(t.meetingId, t.chunkIndex),
    index('meeting_chunks_workspace_idx').on(t.workspaceId),
  ],
)

export const meetingAnalysis = pgTable(
  'meeting_analysis',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    meetingId: uuid('meeting_id')
      .notNull()
      .references(() => meetings.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    summary: text('summary').notNull().default(''),
    topics: jsonb('topics').$type<unknown>().notNull().default(sql`'[]'::jsonb`),
    participants: jsonb('participants').$type<unknown>().notNull().default(sql`'[]'::jsonb`),
    decisions: jsonb('decisions').$type<unknown>().notNull().default(sql`'[]'::jsonb`),
    actionItems: jsonb('action_items').$type<unknown>().notNull().default(sql`'[]'::jsonb`),
    keyPoints: jsonb('key_points').$type<unknown>().notNull().default(sql`'[]'::jsonb`),
    openQuestions: jsonb('open_questions').$type<unknown>().notNull().default(sql`'[]'::jsonb`),
    importantDates: jsonb('important_dates').$type<unknown>().notNull().default(sql`'[]'::jsonb`),
    suggestedQuestions: jsonb('suggested_questions').$type<unknown>().notNull().default(sql`'[]'::jsonb`),
    modelUsed: text('model_used'),
    ...timestamps,
  },
  (t) => [uniqueIndex('meeting_analysis_unique').on(t.meetingId)],
)

/* ----------------------------------------------------- conversations / AI */

export type ConversationScope = 'workspace' | 'project' | 'document' | 'meeting' | 'note'

export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
    documentId: uuid('document_id').references(() => documents.id, { onDelete: 'cascade' }),
    meetingId: uuid('meeting_id').references(() => meetings.id, { onDelete: 'cascade' }),
    noteId: uuid('note_id').references(() => notes.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull().default('Nueva conversación'),
    scope: text('scope').$type<ConversationScope>().notNull().default('workspace'),
    ...timestamps,
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    index('conversations_workspace_user_idx').on(t.workspaceId, t.userId, t.deletedAt),
    check(
      'conversations_scope_check',
      sql`${t.scope} in ('workspace','project','document','meeting','note')`,
    ),
  ],
)

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    role: text('role').$type<'user' | 'assistant' | 'system'>().notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('messages_conversation_idx').on(t.conversationId, t.createdAt),
    check('messages_role_check', sql`${t.role} in ('user','assistant','system')`),
  ],
)

/**
 * §35 — Citations. Polymorphic but *typed*: exactly one of the three FK
 * columns is populated, enforced by a CHECK. This keeps referential integrity
 * (cascading deletes remove stale citations) without a generic id column.
 */
export const messageSources = pgTable(
  'message_sources',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    messageId: uuid('message_id')
      .notNull()
      .references(() => messages.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    citationIndex: integer('citation_index').notNull(),
    documentChunkId: uuid('document_chunk_id').references(() => documentChunks.id, { onDelete: 'cascade' }),
    noteChunkId: uuid('note_chunk_id').references(() => noteChunks.id, { onDelete: 'cascade' }),
    meetingChunkId: uuid('meeting_chunk_id').references(() => meetingChunks.id, { onDelete: 'cascade' }),
    relevanceScore: doublePrecision('relevance_score').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('message_sources_message_idx').on(t.messageId),
    check(
      'message_sources_exactly_one_check',
      sql`(case when ${t.documentChunkId} is not null then 1 else 0 end
         + case when ${t.noteChunkId} is not null then 1 else 0 end
         + case when ${t.meetingChunkId} is not null then 1 else 0 end) = 1`,
    ),
  ],
)

/* ------------------------------------------------------------------- jobs */

export type JobType =
  | 'document_processing'
  | 'document_embedding'
  | 'note_embedding'
  | 'meeting_transcription'
  | 'meeting_analysis'
  | 'meeting_embedding'

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed'

export const aiJobs = pgTable(
  'ai_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    resourceType: text('resource_type').$type<'document' | 'note' | 'meeting'>().notNull(),
    resourceId: uuid('resource_id').notNull(),
    type: text('type').$type<JobType>().notNull(),
    status: text('status').$type<JobStatus>().notNull().default('pending'),
    attemptCount: integer('attempt_count').notNull().default(0),
    error: text('error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (t) => [
    index('ai_jobs_resource_idx').on(t.resourceType, t.resourceId),
    index('ai_jobs_status_idx').on(t.status, t.createdAt),
    check('ai_jobs_status_check', sql`${t.status} in ('pending','processing','completed','failed')`),
    check('ai_jobs_resource_type_check', sql`${t.resourceType} in ('document','note','meeting')`),
  ],
)

/* ----------------------------------------------------------------- usage  */

export const usageEvents = pgTable(
  'usage_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    type: text('type').notNull(),
    quantity: doublePrecision('quantity').notNull().default(1),
    metadata: jsonb('metadata').$type<Record<string, string | number | boolean>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('usage_events_workspace_idx').on(t.workspaceId, t.type, t.createdAt)],
)

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'set null' }),
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
    action: text('action').notNull(),
    resourceType: text('resource_type'),
    resourceId: uuid('resource_id'),
    /** Never store audio or transcript bodies here (§38). */
    metadata: jsonb('metadata').$type<Record<string, string | number | boolean | null>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('audit_logs_workspace_idx').on(t.workspaceId, t.createdAt)],
)

/** §132 — DB-backed fixed-window rate limiting. No extra infrastructure. */
export const rateLimits = pgTable(
  'rate_limits',
  {
    bucket: text('bucket').notNull(),
    windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
    count: integer('count').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.bucket, t.windowStart] })],
)

export const analyticsEvents = pgTable(
  'analytics_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    name: text('name').notNull(),
    /** Numeric/enum properties only — never private content (§143). */
    properties: jsonb('properties').$type<Record<string, string | number | boolean>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('analytics_events_name_idx').on(t.name, t.createdAt)],
)

export const schema = {
  users,
  userCredentials,
  sessions,
  workspaces,
  workspaceMembers,
  workspaceInvitations,
  projects,
  documents,
  documentChunks,
  notes,
  noteChunks,
  meetings,
  meetingSpeakers,
  meetingTranscriptSegments,
  meetingChunks,
  meetingAnalysis,
  conversations,
  messages,
  messageSources,
  aiJobs,
  usageEvents,
  auditLogs,
  rateLimits,
  analyticsEvents,
}

export type User = typeof users.$inferSelect
export type Workspace = typeof workspaces.$inferSelect
export type WorkspaceMember = typeof workspaceMembers.$inferSelect
export type Project = typeof projects.$inferSelect
export type Document = typeof documents.$inferSelect
export type DocumentChunk = typeof documentChunks.$inferSelect
export type Note = typeof notes.$inferSelect
export type NoteChunk = typeof noteChunks.$inferSelect
export type Meeting = typeof meetings.$inferSelect
export type MeetingSpeaker = typeof meetingSpeakers.$inferSelect
export type TranscriptSegment = typeof meetingTranscriptSegments.$inferSelect
export type MeetingChunk = typeof meetingChunks.$inferSelect
export type MeetingAnalysisRow = typeof meetingAnalysis.$inferSelect
export type Conversation = typeof conversations.$inferSelect
export type Message = typeof messages.$inferSelect
export type AiJob = typeof aiJobs.$inferSelect

import type { JobType } from '@/server/db/schema'

export type JobContext = {
  jobId: string
  workspaceId: string
  resourceId: string
  attempt: number
}

export type JobHandler = (ctx: JobContext) => Promise<void>

export type JobRegistry = Partial<Record<JobType, JobHandler>>

/**
 * §139/§140 — Plan limits live in one place. Prices are deliberately absent:
 * commercial pricing is a business decision, not something to invent.
 */
export type PlanId = 'free' | 'pro' | 'team'

export type PlanLimits = {
  id: PlanId
  label: string
  maxDocuments: number
  maxStorageBytes: number
  maxAiQueriesPerMonth: number
  meetingMinutesPerMonth: number
  maxMeetingDurationMinutes: number
  maxAudioUploadBytes: number
  maxMembers: number
}

const MB = 1024 * 1024
const GB = 1024 * MB

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: {
    id: 'free',
    label: 'Free',
    maxDocuments: 50,
    maxStorageBytes: 1 * GB,
    maxAiQueriesPerMonth: 100,
    meetingMinutesPerMonth: 120,
    maxMeetingDurationMinutes: 60,
    maxAudioUploadBytes: 200 * MB,
    maxMembers: 1,
  },
  pro: {
    id: 'pro',
    label: 'Pro',
    maxDocuments: 1000,
    maxStorageBytes: 25 * GB,
    maxAiQueriesPerMonth: 2000,
    meetingMinutesPerMonth: 1500,
    maxMeetingDurationMinutes: 240,
    maxAudioUploadBytes: 500 * MB,
    maxMembers: 3,
  },
  team: {
    id: 'team',
    label: 'Team',
    maxDocuments: 10000,
    maxStorageBytes: 250 * GB,
    maxAiQueriesPerMonth: 20000,
    meetingMinutesPerMonth: 10000,
    maxMeetingDurationMinutes: 480,
    maxAudioUploadBytes: 2 * GB,
    maxMembers: 50,
  },
}

export function getPlanLimits(plan: PlanId | string | null | undefined): PlanLimits {
  if (plan === 'pro' || plan === 'team') return PLAN_LIMITS[plan]
  return PLAN_LIMITS.free
}

export type LimitCheck = { allowed: true } | { allowed: false; reason: string }

export function checkLimit(
  limits: PlanLimits,
  key: keyof Omit<PlanLimits, 'id' | 'label'>,
  currentValue: number,
  increment = 1,
): LimitCheck {
  const max = limits[key]
  if (currentValue + increment <= max) return { allowed: true }
  return {
    allowed: false,
    reason: `Alcanzaste el límite de tu plan ${limits.label} para ${LIMIT_LABELS[key]}.`,
  }
}

const LIMIT_LABELS: Record<keyof Omit<PlanLimits, 'id' | 'label'>, string> = {
  maxDocuments: 'documentos',
  maxStorageBytes: 'almacenamiento',
  maxAiQueriesPerMonth: 'consultas de IA',
  meetingMinutesPerMonth: 'minutos de reuniones',
  maxMeetingDurationMinutes: 'duración de reunión',
  maxAudioUploadBytes: 'tamaño de audio',
  maxMembers: 'miembros del workspace',
}

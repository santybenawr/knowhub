'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
} from '@/validations/auth'
import {
  createPasswordResetToken,
  login as loginUser,
  resetPassword as resetUserPassword,
  signup as signupUser,
} from '@/server/auth/service'
import { createSession, destroySession } from '@/server/auth/session'
import { enforceRateLimit } from '@/server/rate-limit'
import { trackEvent } from '@/server/analytics'
import { fail, ok, type ActionResult } from '@/lib/action-result'
import { toUserMessage } from '@/lib/errors'
import { ensureJobHandlers } from '@/server/jobs/register'

ensureJobHandlers()

/**
 * Auth server actions.
 *
 * Rate limiting is keyed on the client address so a single origin cannot
 * brute-force credentials (§132). Validation errors come back as field errors
 * rather than thrown, so the form can render them inline.
 */

async function clientKey(): Promise<string> {
  const list = await headers()
  const forwarded = list.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || list.get('x-real-ip') || 'unknown'
}

function fieldErrorsOf(error: z.ZodError): Record<string, string[]> {
  const result: Record<string, string[]> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'form'
    ;(result[key] ??= []).push(issue.message)
  }
  return result
}

export async function signupAction(
  _prev: ActionResult<undefined> | null,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  const parsed = signupSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  })
  if (!parsed.success) {
    return fail('Revisa los datos del formulario.', fieldErrorsOf(parsed.error))
  }

  try {
    await enforceRateLimit('signup', await clientKey())
    const { userId, workspaceId } = await signupUser(parsed.data)
    const list = await headers()
    await createSession(userId, list.get('user-agent'))
    await trackEvent('signup_completed', { userId, workspaceId })
  } catch (err) {
    return fail(toUserMessage(err))
  }

  redirect('/onboarding')
}

export async function loginAction(
  _prev: ActionResult<undefined> | null,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return fail('Revisa los datos del formulario.', fieldErrorsOf(parsed.error))
  }

  try {
    await enforceRateLimit('login', await clientKey())
    const { userId } = await loginUser(parsed.data)
    const list = await headers()
    await createSession(userId, list.get('user-agent'))
  } catch (err) {
    return fail(toUserMessage(err))
  }

  redirect('/dashboard')
}

export async function logoutAction(): Promise<void> {
  await destroySession()
  redirect('/login')
}

/**
 * Always reports success, whether or not the address exists: telling an
 * anonymous caller which emails are registered is an account-enumeration leak.
 * The reset link is returned only in development, where no mail transport
 * exists — never in production.
 */
export async function forgotPasswordAction(
  _prev: ActionResult<{ devLink?: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ devLink?: string }>> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get('email') })
  if (!parsed.success) return fail('Ingresa un correo válido.', fieldErrorsOf(parsed.error))

  try {
    await enforceRateLimit('passwordReset', await clientKey())
    const token = await createPasswordResetToken(parsed.data.email)
    if (token && process.env.NODE_ENV !== 'production') {
      return ok({ devLink: `/reset-password?token=${token}` })
    }
  } catch (err) {
    return fail(toUserMessage(err))
  }

  return ok({})
}

export async function resetPasswordAction(
  _prev: ActionResult<undefined> | null,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get('token'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  })
  if (!parsed.success) {
    return fail('Revisa los datos del formulario.', fieldErrorsOf(parsed.error))
  }

  try {
    await resetUserPassword(parsed.data.token, parsed.data.password)
  } catch (err) {
    return fail(toUserMessage(err))
  }

  redirect('/login?reset=1')
}

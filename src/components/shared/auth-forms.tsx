'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import type { ActionResult } from '@/lib/action-result'
import {
  forgotPasswordAction,
  loginAction,
  resetPasswordAction,
  signupAction,
} from '@/app/(auth)/actions'

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="lg" className="w-full" loading={pending}>
      {children}
    </Button>
  )
}

function FormError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <div
      className="flex items-start gap-2 rounded-lg border border-record/40 bg-record-soft p-3 text-sm text-ink"
      role="alert"
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-record" aria-hidden />
      <span>{message}</span>
    </div>
  )
}

function errorsFor(state: ActionResult<unknown> | null, field: string): string[] | undefined {
  if (!state || state.ok) return undefined
  return state.fieldErrors?.[field]
}

export function SignupForm() {
  const [state, action] = useActionState<ActionResult<undefined> | null, FormData>(signupAction, null)

  return (
    <form action={action} className="space-y-4" noValidate>
      {state && !state.ok ? <FormError message={state.error} /> : null}

      <Field label="Nombre" htmlFor="name" errors={errorsFor(state, 'name')}>
        <Input id="name" name="name" autoComplete="name" required placeholder="Santiago Rojas" />
      </Field>

      <Field label="Correo" htmlFor="email" errors={errorsFor(state, 'email')}>
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="tu@correo.com" />
      </Field>

      <Field
        label="Contraseña"
        htmlFor="password"
        hint="Mínimo 10 caracteres, con al menos una letra y un número."
        errors={errorsFor(state, 'password')}
      >
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </Field>

      <Field label="Confirmar contraseña" htmlFor="confirmPassword" errors={errorsFor(state, 'confirmPassword')}>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
        />
      </Field>

      <SubmitButton>Crear cuenta</SubmitButton>

      <p className="text-center text-sm text-ink-muted">
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="font-medium text-brand hover:underline">
          Inicia sesión
        </Link>
      </p>
    </form>
  )
}

export function LoginForm({ resetDone }: { resetDone?: boolean }) {
  const [state, action] = useActionState<ActionResult<undefined> | null, FormData>(loginAction, null)

  return (
    <form action={action} className="space-y-4" noValidate>
      {resetDone ? (
        <div className="flex items-start gap-2 rounded-lg border border-positive/40 bg-positive-soft p-3 text-sm text-ink">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-positive" aria-hidden />
          <span>Tu contraseña se actualizó. Ya puedes iniciar sesión.</span>
        </div>
      ) : null}

      {state && !state.ok ? <FormError message={state.error} /> : null}

      <Field label="Correo" htmlFor="email" errors={errorsFor(state, 'email')}>
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="tu@correo.com" />
      </Field>

      <Field label="Contraseña" htmlFor="password" errors={errorsFor(state, 'password')}>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>

      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-sm text-ink-muted hover:text-ink hover:underline">
          ¿Olvidaste tu contraseña?
        </Link>
      </div>

      <SubmitButton>Iniciar sesión</SubmitButton>

      <p className="text-center text-sm text-ink-muted">
        ¿No tienes cuenta?{' '}
        <Link href="/signup" className="font-medium text-brand hover:underline">
          Empezar gratis
        </Link>
      </p>
    </form>
  )
}

export function ForgotPasswordForm() {
  const [state, action] = useActionState<ActionResult<{ devLink?: string }> | null, FormData>(
    forgotPasswordAction,
    null,
  )

  if (state?.ok) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-2 rounded-lg border border-positive/40 bg-positive-soft p-3 text-sm text-ink">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-positive" aria-hidden />
          <span>
            Si existe una cuenta con ese correo, generamos un enlace de recuperación válido por una hora.
          </span>
        </div>

        {state.data.devLink ? (
          <div className="rounded-lg border border-border-strong bg-surface-muted p-3 text-sm">
            <p className="font-medium text-ink">Entorno de desarrollo</p>
            <p className="mt-1 text-ink-muted">
              No hay servicio de correo configurado, así que el enlace se muestra aquí:
            </p>
            <Link href={state.data.devLink} className="mt-2 block break-all font-mono text-xs text-brand hover:underline">
              {state.data.devLink}
            </Link>
          </div>
        ) : null}

        <Link href="/login" className="block text-center text-sm text-brand hover:underline">
          Volver a iniciar sesión
        </Link>
      </div>
    )
  }

  return (
    <form action={action} className="space-y-4" noValidate>
      {state && !state.ok ? <FormError message={state.error} /> : null}
      <Field label="Correo" htmlFor="email" errors={errorsFor(state, 'email')}>
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="tu@correo.com" />
      </Field>
      <SubmitButton>Enviar enlace</SubmitButton>
      <Link href="/login" className="block text-center text-sm text-ink-muted hover:text-ink hover:underline">
        Volver
      </Link>
    </form>
  )
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState<ActionResult<undefined> | null, FormData>(
    resetPasswordAction,
    null,
  )

  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="token" value={token} />
      {state && !state.ok ? <FormError message={state.error} /> : null}

      <Field
        label="Nueva contraseña"
        htmlFor="password"
        hint="Mínimo 10 caracteres, con al menos una letra y un número."
        errors={errorsFor(state, 'password')}
      >
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </Field>

      <Field label="Confirmar contraseña" htmlFor="confirmPassword" errors={errorsFor(state, 'confirmPassword')}>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
        />
      </Field>

      <SubmitButton>Actualizar contraseña</SubmitButton>
    </form>
  )
}

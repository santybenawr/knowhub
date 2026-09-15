import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { forbidden, unauthenticated } from '@/lib/errors'

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(), getCurrentUser: vi.fn(), accept: vi.fn(), setCookie: vi.fn(),
  redirect: vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`) }),
}))
vi.mock('@/server/auth/session', () => ({ requireUser: mocks.requireUser, getCurrentUser: mocks.getCurrentUser }))
vi.mock('@/server/workspaces', () => ({ acceptInvitation: mocks.accept }))
vi.mock('next/headers', () => ({ cookies: async () => ({ set: mocks.setCookie }) }))
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }))
vi.mock('@/server/auth/guard', () => ({ WORKSPACE_COOKIE: 'knowhub_workspace' }))

import { acceptInvitationAction } from '@/app/(dashboard)/invitations/[token]/actions'
import InvitationPage from '@/app/(dashboard)/invitations/[token]/page'

beforeEach(() => {
  vi.resetAllMocks()
  mocks.requireUser.mockResolvedValue({ id: 'session-user', email: 'invitee@knowhub.test' })
  mocks.getCurrentUser.mockResolvedValue({ id: 'session-user', email: 'invitee@knowhub.test' })
  mocks.accept.mockResolvedValue('invited-workspace')
  mocks.redirect.mockImplementation((url: string) => { throw new Error(`REDIRECT:${url}`) })
})

describe('invitation request boundary', () => {
  it('renders a confirmation without consuming the invitation or writing cookies', async () => {
    const page = await InvitationPage({ params: Promise.resolve({ token: 'valid-token' }) })
    const html = renderToStaticMarkup(page)
    expect(html).toContain('Aceptar invitación')
    expect(html).toContain('invitee@knowhub.test')
    expect(mocks.accept).not.toHaveBeenCalled()
    expect(mocks.setCookie).not.toHaveBeenCalled()
  })

  it('requires login when the invitation page is opened anonymously', async () => {
    mocks.getCurrentUser.mockResolvedValue(null)
    await expect(InvitationPage({ params: Promise.resolve({ token: 'valid-token' }) }))
      .rejects.toThrow('REDIRECT:/login?next=%2Finvitations%2Fvalid-token')
    expect(mocks.accept).not.toHaveBeenCalled()
  })

  it('re-authenticates the action even if the page was already rendered', async () => {
    mocks.requireUser.mockRejectedValue(unauthenticated())
    expect(await acceptInvitationAction('valid-token')).toEqual({ ok: false, error: 'Necesitas iniciar sesión.' })
    expect(mocks.accept).not.toHaveBeenCalled()
    expect(mocks.setCookie).not.toHaveBeenCalled()
  })

  it.each(['', 'a'.repeat(129), '../bad-token'])('rejects malformed input: %s', async (token) => {
    expect(await acceptInvitationAction(token)).toMatchObject({ ok: false })
    expect(mocks.accept).not.toHaveBeenCalled()
  })

  it('does not set an active workspace when the account is rejected', async () => {
    mocks.accept.mockRejectedValue(forbidden('Correo incorrecto.'))
    expect(await acceptInvitationAction('valid-token')).toEqual({ ok: false, error: 'Correo incorrecto.' })
    expect(mocks.setCookie).not.toHaveBeenCalled()
    expect(mocks.redirect).not.toHaveBeenCalled()
  })

  it('uses the session identity and activates the accepted workspace before redirecting', async () => {
    await expect(acceptInvitationAction('valid-token')).rejects.toThrow('REDIRECT:/dashboard')
    expect(mocks.accept).toHaveBeenCalledWith('valid-token', 'session-user')
    expect(mocks.setCookie).toHaveBeenCalledWith('knowhub_workspace', 'invited-workspace', expect.objectContaining({
      httpOnly: true, sameSite: 'lax', path: '/',
    }))
  })

  it('does not expose unexpected provider or database errors', async () => {
    mocks.accept.mockRejectedValue(new Error('private database detail'))
    expect(await acceptInvitationAction('valid-token')).toEqual({
      ok: false, error: 'Ocurrió un error inesperado. Intenta de nuevo.',
    })
    expect(mocks.setCookie).not.toHaveBeenCalled()
  })
})

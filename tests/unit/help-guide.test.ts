import { afterEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { GettingStartedGuide } from '@/components/shared/getting-started-guide'
import HelpPage from '@/app/(dashboard)/help/page'

afterEach(() => vi.unstubAllEnvs())

describe('help matches available capabilities', () => {
  it('teaches the beta upload limit, save state, combined filters and source verification', () => {
    vi.stubEnv('NEXT_PUBLIC_KNOWHUB_BETA', 'true')
    const html = renderToStaticMarkup(createElement(GettingStartedGuide))
    expect(html).toContain('4 MB')
    expect(html).toContain('PDF, DOCX, TXT o Markdown')
    expect(html).toContain('Guardado')
    expect(html).toContain('procesamiento')
    expect(html).toContain('combinar el tipo de recurso')
    expect(html).toContain('Abre las citas')
    expect(html).toContain('IA externa ni transcripción de audio')
    expect(html).not.toContain('Grabar reunión')
  })

  it('explains unsupported formats and links to actual app destinations without creating content', () => {
    vi.stubEnv('NEXT_PUBLIC_KNOWHUB_BETA', 'true')
    const html = renderToStaticMarkup(createElement(HelpPage))
    for (const path of ['/notes/new', '/library?upload=1', '/meetings/new', '/projects', '/search', '/ask', '/profile']) {
      expect(html).toContain(`href="${path}"`)
    }
    expect(html).toContain('PDF escaneados')
    expect(html).toContain('Cambiar la extensión no convierte el formato')
    expect(html).toContain('Todos los proyectos')
    expect(html).toContain('la recuperación por correo y las invitaciones todavía no están disponibles')
  })

  it('uses the configured local document limit outside the public beta', () => {
    vi.stubEnv('NEXT_PUBLIC_KNOWHUB_BETA', 'false')
    const html = renderToStaticMarkup(createElement(GettingStartedGuide))
    expect(html).toContain('25 MB')
    expect(html).not.toContain('Esta beta')
  })
})

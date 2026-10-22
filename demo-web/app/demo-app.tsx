'use client'
import { useEffect, useState, useSyncExternalStore } from 'react'
import {
  BookOpen,
  ChevronDown,
  FolderKanban,
  House,
  Library as LibraryIcon,
  Menu,
  Moon,
  RotateCcw,
  Search,
  Settings,
  Sparkles,
  Sun,
  UserRound,
  X,
} from 'lucide-react'
import { Logo } from '@/components/shared/logo'
import { Button } from '@/components/ui/button'
import { Ask, Dashboard, Heading, Library, ResourceList } from './components'
import { NewResource, ResourceView } from './resource-view'
import {
  getServerSnapshot,
  getSnapshot,
  getReady,
  getServerReady,
  getStorageWarning,
  initialize,
  reset,
  subscribe,
  update,
} from '../lib/store'
import type { DemoState } from '../lib/data'

const navigation = [
  { path: '/dashboard', label: 'Inicio', icon: House },
  { path: '/library', label: 'Biblioteca', icon: LibraryIcon },
  { path: '/ask', label: 'Preguntar', icon: Sparkles },
  { path: '/search', label: 'Buscar', icon: Search },
  { path: '/projects', label: 'Proyectos', icon: FolderKanban },
]
function subscribeRoute(onChange: () => void) {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}
function getRoute() {
  return window.location.hash.slice(1) || '/dashboard'
}
function serverRoute() {
  return '/dashboard'
}
function Projects({ state }: { state: DemoState }) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  function add() {
    const value = name.trim()
    if (state.projects.some((p) => p.toLowerCase() === value.toLowerCase())) {
      setError('Ya existe un proyecto con ese nombre.')
      return
    }
    if (state.projects.length >= 30) {
      setError('Puedes crear hasta 30 proyectos en esta demo.')
      return
    }
    update((s) => ({ ...s, projects: [...s.projects, value] }))
    setName('')
    setError('')
  }
  return (
    <>
      <Heading
        title="Proyectos"
        description="Agrupa documentos, notas y reuniones alrededor de un mismo tema."
      />
      <form
        className="demo-card mb-7 flex flex-wrap items-end gap-3 p-5"
        onSubmit={(e) => {
          e.preventDefault()
          add()
        }}
      >
        <label className="min-w-0 flex-1">
          <span className="demo-label">Nombre del nuevo proyecto</span>
          <input
            value={name}
            maxLength={80}
            required
            className="demo-field"
            placeholder="Proyecto de prueba"
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <Button type="submit" disabled={!name.trim()}>
          Crear proyecto
        </Button>
        {error && (
          <p className="w-full text-sm text-record" role="alert">
            {error}
          </p>
        )}
      </form>
      <div className="grid gap-4 sm:grid-cols-2">
        {state.projects.map((p) => (
          <a
            key={p}
            href={`#/project/${encodeURIComponent(p)}`}
            className="demo-card demo-card-hover p-6"
          >
            <FolderKanban className="mb-4 size-6 text-brand-ink" aria-hidden />
            <h2 className="break-words font-semibold">{p}</h2>
            <p className="mt-2 text-sm text-ink-muted">
              {state.resources.filter((r) => r.project === p).length} recursos
            </p>
          </a>
        ))}
      </div>
    </>
  )
}
function Preferences({
  state,
  profile = false,
}: {
  state: DemoState
  profile?: boolean
}) {
  return (
    <>
      <Heading
        title={profile ? 'Tu perfil de demo' : 'Configuración'}
        description="Explora las preferencias del espacio de ejemplo."
      />
      <div className="demo-card max-w-2xl space-y-6 p-6">
        <label className="block">
          <span className="demo-label">
            Nombre visible (usa un alias ficticio)
          </span>
          <input
            className="demo-field"
            maxLength={80}
            value={state.name}
            onChange={(e) =>
              update((s) => ({ ...s, name: e.target.value || 'Visitante' }))
            }
          />
        </label>
        <div>
          <p className="demo-label">Apariencia</p>
          <div className="flex gap-3">
            <Button
              variant={state.dark ? 'outline' : 'primary'}
              aria-pressed={!state.dark}
              onClick={() => update((s) => ({ ...s, dark: false }))}
            >
              <Sun />
              Claro
            </Button>
            <Button
              variant={state.dark ? 'primary' : 'outline'}
              aria-pressed={state.dark}
              onClick={() => update((s) => ({ ...s, dark: true }))}
            >
              <Moon />
              Oscuro
            </Button>
          </div>
        </div>
        <div className="border-t border-border-subtle pt-5">
          <h2 className="font-medium">Universidad · espacio de ejemplo</h2>
          <p className="mt-2 text-sm leading-6 text-ink-muted">
            {state.resources.length} recursos y {state.projects.length}{' '}
            proyectos. Las consultas usan coincidencias de texto, los resúmenes
            están preparados y las transcripciones son ficticias.
          </p>
          <p className="mt-3 text-sm leading-6 text-ink-muted">
            Esta demo pública no crea cuentas ni envía invitaciones. La
            grabación, la carga de archivos personales, los servicios de IA y
            los pagos requieren la aplicación conectada a sus servicios reales.
          </p>
        </div>
      </div>
    </>
  )
}
function Guide() {
  const steps = [
    [
      '#/library',
      '1. Reúne tu información',
      'Abre Modelo Canvas para revisar su resumen y contenido. Filtra por tipo o proyecto.',
    ],
    [
      '#/new-note',
      '2. Captura una idea',
      'Crea una nota ficticia, escribe y vuelve a la biblioteca. Se conserva en esta sesión.',
    ],
    [
      '#/resource/reunion-emprendimiento',
      '3. Convierte la reunión en acciones',
      'Revisa el resumen, abre Decisiones y pulsa Ver fuente. Marca un pendiente como completado.',
    ],
    [
      '#/ask',
      '4. Pregunta y comprueba',
      'Prueba «¿Qué proveedor vamos a seleccionar?». Después pregunta por Neptuno para ver la falta de evidencia.',
    ],
    [
      '#/projects',
      '5. Organiza por proyecto',
      'Crea un proyecto de prueba y asígnalo a una nota. Usa Buscar para encontrar su contenido.',
    ],
  ]
  return (
    <>
      <Heading
        eyebrow="Recorrido de 3 a 5 minutos"
        title="Explora KnowHub"
        description="Un espacio para organizar información y recuperar lo importante con sus fuentes."
      />
      <div className="max-w-3xl space-y-4">
        {steps.map(([href, title, text]) => (
          <a
            key={href}
            href={href}
            className="demo-card demo-card-hover block p-5"
          >
            <h2 className="font-semibold">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-ink-muted">{text}</p>
          </a>
        ))}
        <p className="rounded-lg bg-brand-soft p-4 text-sm leading-6">
          Esta es una demostración interactiva del MVP con datos ficticios. Los
          cambios son privados a esta sesión del navegador; no se comparten con
          otros visitantes ni se guardan en un servidor. Puedes restaurar el
          ejemplo con «Reiniciar demo».
        </p>
      </div>
    </>
  )
}
function RouteView({ route, state }: { route: string; state: DemoState }) {
  const [path = '/dashboard', query = ''] = route.split('?')
  const params = new URLSearchParams(query)
  if (path === '/dashboard') return <Dashboard state={state} />
  if (path === '/library') return <Library state={state} />
  if (path === '/search') return <Library state={state} searchMode />
  if (path === '/ask')
    return <Ask resources={state.resources} projects={state.projects} />
  if (path === '/projects') return <Projects state={state} />
  if (path === '/guide') return <Guide />
  if (path === '/settings' || path === '/profile')
    return <Preferences state={state} profile={path === '/profile'} />
  if (['/new-note', '/new-meeting', '/add-document'].includes(path))
    return (
      <NewResource
        state={state}
        kind={
          path === '/new-note'
            ? 'note'
            : path === '/new-meeting'
              ? 'meeting'
              : 'document'
        }
      />
    )
  if (path.startsWith('/project/')) {
    let project = ''
    try {
      project = decodeURIComponent(path.slice('/project/'.length))
    } catch {
      /* An invalid route falls through to the missing-resource view. */
    }
    if (state.projects.includes(project))
      return <Library state={state} project={project} />
  }
  if (path.startsWith('/resource/')) {
    const resource = state.resources.find(
      (r) => `/resource/${encodeURIComponent(r.id)}` === path,
    )
    if (resource)
      return (
        <ResourceView
          key={route}
          resource={resource}
          state={state}
          params={params}
        />
      )
  }
  return (
    <>
      <Heading
        title="Este recurso no está en tu sesión"
        description="Puede haberse eliminado o pertenecer a la sesión de otra persona. Puedes seguir con los ejemplos de la biblioteca."
      />
      <ResourceList resources={state.resources} />
    </>
  )
}
export function DemoApp() {
  const ready = useSyncExternalStore(subscribe, getReady, getServerReady)
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const route = useSyncExternalStore(subscribeRoute, getRoute, serverRoute)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  useEffect(() => {
    initialize()
  }, [])
  useEffect(() => {
    document.documentElement.classList.toggle('dark', state.dark)
  }, [state.dark])
  useEffect(() => {
    const listener = () => {
      setMenuOpen(false)
      document.getElementById('main')?.focus()
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', listener)
    return () => window.removeEventListener('hashchange', listener)
  }, [])
  const path = route.split('?')[0]
  const storageWarning = getStorageWarning()
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <a
        href="#main"
        className="skip-link"
        onClick={(e) => {
          e.preventDefault()
          document.getElementById('main')?.focus()
        }}
      >
        Ir al contenido
      </a>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border-subtle bg-surface px-4 lg:hidden">
        <a href="#/dashboard" className="flex items-center gap-2 font-semibold">
          <Logo className="size-8" />
          KnowHub
        </a>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={menuOpen}
          aria-controls="sidebar"
        >
          {menuOpen ? <X /> : <Menu />}
        </Button>
      </header>
      {menuOpen && (
        <button
          className="fixed inset-0 top-16 z-30 bg-black/30 lg:hidden"
          aria-label="Cerrar navegación"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside
        id="sidebar"
        className={`fixed bottom-0 left-0 top-16 z-40 w-64 flex-col border-r border-border-subtle bg-surface p-4 lg:top-0 lg:flex ${menuOpen ? 'flex' : 'hidden'}`}
      >
        <a
          href="#/dashboard"
          className="mb-7 mt-2 hidden items-center gap-3 px-2 text-xl font-semibold tracking-tight lg:flex"
        >
          <Logo className="size-9" />
          KnowHub
        </a>
        <div className="mb-5 flex items-center gap-3 rounded-lg border border-border-subtle p-3">
          <span className="flex size-8 items-center justify-center rounded bg-brand-soft text-sm font-semibold text-brand-ink">
            U
          </span>
          <div className="flex-1">
            <p className="text-sm font-medium">Universidad</p>
            <p className="mt-0.5 text-[11px] text-ink-muted">
              Espacio de demostración
            </p>
          </div>
          <ChevronDown className="size-3 text-ink-faint" aria-hidden />
        </div>
        <nav aria-label="Navegación principal" className="space-y-1">
          {navigation.map((item) => (
            <a
              key={item.path}
              href={`#${item.path}`}
              className="demo-nav"
              aria-current={path === item.path ? 'page' : undefined}
            >
              <item.icon className="size-4" aria-hidden />
              {item.label}
            </a>
          ))}
        </nav>
        <div className="mt-7 min-h-0 flex-1 overflow-auto">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-ink-faint">
            Tus proyectos
          </p>
          {state.projects.map((p) => (
            <a
              key={p}
              href={`#/project/${encodeURIComponent(p)}`}
              className="demo-nav"
            >
              <FolderKanban className="size-4 shrink-0" aria-hidden />
              <span className="truncate">{p}</span>
            </a>
          ))}
        </div>
        <nav
          className="mt-4 space-y-1 border-t border-border-subtle pt-3"
          aria-label="Preferencias"
        >
          <a href="#/guide" className="demo-nav">
            <BookOpen className="size-4" />
            Guía de la demo
          </a>
          <a href="#/settings" className="demo-nav">
            <Settings className="size-4" />
            Configuración
          </a>
          <a href="#/profile" className="demo-nav">
            <UserRound className="size-4" />
            <span className="truncate">{state.name}</span>
          </a>
        </nav>
      </aside>
      <div className="lg:pl-64">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle bg-brand-soft px-4 py-3 sm:px-6">
          <p className="text-xs leading-5 text-brand-ink">
            <strong>Demo interactiva</strong> · Datos ficticios · Cambios solo
            en tu sesión
          </p>
          <button
            className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-ink underline underline-offset-4"
            onClick={() => setConfirmReset(!confirmReset)}
          >
            <RotateCcw className="size-3.5" />
            Reiniciar demo
          </button>
        </div>
        {confirmReset && (
          <div className="flex flex-wrap items-center gap-3 border-b border-border-subtle bg-surface p-4">
            <p className="mr-auto text-sm">
              Se borrarán tus cambios de prueba y volverán los ejemplos
              iniciales.
            </p>
            <Button variant="ghost" onClick={() => setConfirmReset(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                reset()
                setConfirmReset(false)
                window.location.hash = '/dashboard'
              }}
            >
              Restaurar ejemplos
            </Button>
          </div>
        )}
        {storageWarning && (
          <p role="alert" className="bg-warning-soft p-4 text-sm">
            {storageWarning}
          </p>
        )}
        <main
          id="main"
          aria-busy={!ready}
          tabIndex={-1}
          className="mx-auto max-w-6xl px-4 pb-28 pt-7 outline-none sm:px-7 sm:pt-9 lg:pb-12"
        >
          {ready ? (
            <RouteView key={path} route={route} state={state} />
          ) : (
            <p role="status" className="text-sm text-ink-muted">
              Preparando tu espacio de demostración…
            </p>
          )}
        </main>
        <footer className="px-5 pb-24 text-center text-xs text-ink-faint lg:pb-6">
          KnowHub · MVP académico ·{' '}
          <a href="#/guide" className="underline underline-offset-4">
            Qué puedes probar
          </a>
        </footer>
      </div>
      <nav
        aria-label="Navegación móvil"
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-border-subtle bg-surface px-2 pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {navigation.map((item) => (
          <a
            key={item.path}
            href={`#${item.path}`}
            className={`flex min-h-16 flex-col items-center justify-center gap-1 text-[10px] ${path === item.path ? 'text-brand-ink' : 'text-ink-muted'}`}
            aria-current={path === item.path ? 'page' : undefined}
          >
            <item.icon className="size-5" aria-hidden />
            {item.label}
          </a>
        ))}
      </nav>
    </div>
  )
}

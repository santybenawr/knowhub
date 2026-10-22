'use client'
import { useEffect, useState } from 'react'
import { ArrowLeft, Check, FileText, Mic, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Ask, Heading } from './components'
import {
  canvasExample,
  meetingExample,
  resourceHref,
  type DemoState,
  type Resource,
} from '../lib/data'
import { update } from '../lib/store'

function patchResource(id: string, patch: Partial<Resource>) {
  update((state) => ({
    ...state,
    resources: state.resources.map((r) =>
      r.id === id ? { ...r, ...patch } : r,
    ),
  }))
}
export function NewResource({
  kind,
  state,
}: {
  kind: Resource['kind']
  state: DemoState
}) {
  const [title, setTitle] = useState(
    kind === 'note'
      ? ''
      : kind === 'meeting'
        ? 'Reunión de prueba'
        : 'Documento de prueba',
  )
  const [project, setProject] = useState(state.projects[0] ?? '')
  const atLimit = state.resources.length >= 100
  const name =
    kind === 'note'
      ? 'Crear nota'
      : kind === 'meeting'
        ? 'Nueva reunión'
        : 'Añadir documento'
  function create() {
    const id = crypto.randomUUID()
    const example =
      kind === 'meeting'
        ? meetingExample
        : kind === 'document'
          ? canvasExample
          : { kind, content: '', summary: '' }
    const resource: Resource = {
      ...structuredClone(example),
      id,
      title: title.trim() || 'Nota sin título',
      project,
    }
    update((s) => ({ ...s, resources: [resource, ...s.resources] }))
    window.location.hash = resourceHref(resource).slice(1)
  }
  return (
    <div className="mx-auto max-w-2xl">
      <Heading
        title={name}
        description={
          kind === 'note'
            ? 'Escribe una idea ficticia y prueba cómo se organiza en tu biblioteca.'
            : 'Explora el flujo con contenido de ejemplo ya preparado.'
        }
      />
      <form
        className="demo-card space-y-5 p-6"
        onSubmit={(e) => {
          e.preventDefault()
          create()
        }}
      >
        <label className="block">
          <span className="demo-label">Título</span>
          <input
            className="demo-field"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={160}
            placeholder="Una idea para la exposición"
            required
          />
        </label>
        <label className="block">
          <span className="demo-label">Proyecto</span>
          <select
            className="demo-field"
            value={project}
            onChange={(e) => setProject(e.target.value)}
          >
            <option value="">Sin proyecto</option>
            {state.projects.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
        {kind !== 'note' && (
          <div className="rounded-lg border border-dashed border-border-strong bg-surface-muted p-5">
            <div className="mb-3 flex items-center gap-2 font-medium">
              {kind === 'meeting' ? (
                <Mic className="size-5" aria-hidden />
              ) : (
                <FileText className="size-5" aria-hidden />
              )}
              {kind === 'meeting'
                ? 'Transcripción de ejemplo'
                : 'Documento de ejemplo'}
            </div>
            <p className="text-sm leading-6 text-ink-muted">
              {kind === 'meeting'
                ? 'Incluye participantes ficticios, decisiones, pendientes y marcas de tiempo. En esta versión pública no se graba audio ni se transcriben archivos.'
                : 'Usaremos el contenido ficticio de Modelo Canvas para mostrar el resumen, la lectura y las consultas. La carga de archivos personales no está habilitada.'}
            </p>
          </div>
        )}
        <p className="text-xs leading-5 text-ink-muted">
          Usa únicamente información ficticia. Los cambios se conservan en la
          sesión de este navegador y puedes borrarlos con «Reiniciar demo».
        </p>
        {atLimit && (
          <p role="alert" className="text-sm text-record">
            Alcanzaste el límite de 100 recursos. Reinicia la demo para volver a
            empezar.
          </p>
        )}
        <Button type="submit" disabled={atLimit || !title.trim()}>
          <Plus />
          {kind === 'note' ? 'Crear nota' : 'Usar ejemplo'}
        </Button>
      </form>
    </div>
  )
}
export function ResourceView({
  resource,
  state,
  params,
}: {
  resource: Resource
  state: DemoState
  params: URLSearchParams
}) {
  const initialTab =
    params.get('tab') ?? (resource.kind === 'note' ? 'contenido' : 'resumen')
  const [tab, setTab] = useState(initialTab)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const source = params.get('source')
  const tabs =
    resource.kind === 'meeting'
      ? [
          ['resumen', 'Resumen'],
          ['decisiones', 'Decisiones'],
          ['pendientes', 'Pendientes'],
          ['transcripcion', 'Transcripción'],
          ['preguntar', 'Preguntar'],
        ]
      : resource.kind === 'note'
        ? [
            ['contenido', 'Contenido'],
            ['preguntar', 'Preguntar'],
          ]
        : [
            ['resumen', 'Resumen'],
            ['contenido', 'Contenido'],
            ['preguntar', 'Preguntar'],
          ]
  useEffect(() => {
    if (source !== null && tab === 'transcripcion')
      document
        .getElementById(`source-${source}`)
        ?.scrollIntoView({ block: 'center' })
  }, [source, tab])
  return (
    <>
      <a
        className="mb-5 inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink"
        href="#/library"
      >
        <ArrowLeft className="size-4" />
        Volver a la biblioteca
      </a>
      <Heading
        eyebrow={`${resource.kind === 'meeting' ? 'Reunión' : resource.kind === 'note' ? 'Nota' : 'Documento'} · ${resource.project || 'Sin proyecto'}`}
        title={resource.title || 'Nota sin título'}
        description={
          resource.kind === 'meeting'
            ? 'Ejemplo ficticio · 20 oct 2026 · Santiago, Laura y Andrés'
            : undefined
        }
        action={
          <Button
            variant="ghost"
            onClick={() => setConfirmDelete(!confirmDelete)}
            aria-label="Eliminar recurso"
          >
            <Trash2 />
          </Button>
        }
      />
      {confirmDelete && (
        <div className="demo-card mb-5 flex flex-wrap items-center gap-3 p-4">
          <p className="mr-auto text-sm">
            ¿Eliminar este recurso de tu sesión de demo?
          </p>
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              update((s) => ({
                ...s,
                resources: s.resources.filter((r) => r.id !== resource.id),
              }))
              window.location.hash = '/library'
            }}
          >
            Eliminar de esta sesión
          </Button>
        </div>
      )}
      <div
        className="mb-6 flex gap-1 overflow-x-auto border-b border-border-subtle"
        role="tablist"
        aria-label="Contenido del recurso"
        onKeyDown={(e) => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key))
            return
          e.preventDefault()
          const buttons = Array.from(
            e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
          )
          const current = buttons.indexOf(e.target as HTMLButtonElement)
          const next =
            e.key === 'Home'
              ? 0
              : e.key === 'End'
                ? buttons.length - 1
                : (current +
                    (e.key === 'ArrowRight' ? 1 : -1) +
                    buttons.length) %
                  buttons.length
          buttons[next]?.focus()
          buttons[next]?.click()
        }}
      >
        {tabs.map(([id, label]) => (
          <button
            key={id}
            role="tab"
            tabIndex={tab === id ? 0 : -1}
            aria-selected={tab === id}
            aria-controls={`panel-${id}`}
            id={`tab-${id}`}
            className={`shrink-0 border-b-2 px-4 py-3 text-sm ${tab === id ? 'border-brand font-medium text-brand-ink' : 'border-transparent text-ink-muted hover:text-ink'}`}
            onClick={() => setTab(id!)}
          >
            {label}
          </button>
        ))}
      </div>
      <section
        role="tabpanel"
        id={`panel-${tab}`}
        aria-labelledby={`tab-${tab}`}
        tabIndex={0}
      >
        {tab === 'resumen' && (
          <div className="demo-card max-w-4xl p-6">
            <h2 className="mb-4 font-semibold">Resumen del ejemplo</h2>
            <p className="demo-body text-sm">{resource.summary}</p>
            {resource.kind === 'meeting' && (
              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  onClick={() => setTab('decisiones')}
                  className="rounded-lg bg-brand-soft p-4 text-left"
                >
                  <span className="text-2xl font-semibold text-brand-ink">
                    {resource.decisions?.length ?? 0}
                  </span>
                  <span className="mt-1 block text-sm">Decisiones</span>
                </button>
                <button
                  onClick={() => setTab('pendientes')}
                  className="rounded-lg bg-surface-muted p-4 text-left"
                >
                  <span className="text-2xl font-semibold">
                    {resource.tasks?.filter((t) => !t.done).length ?? 0}
                  </span>
                  <span className="mt-1 block text-sm">Pendientes</span>
                </button>
              </div>
            )}
            <p className="mt-6 text-xs text-ink-muted">
              Resumen preparado para esta demostración; no se generó con IA en
              línea.
            </p>
          </div>
        )}
        {tab === 'contenido' &&
          (resource.kind === 'note' ? (
            <div className="demo-card space-y-4 p-5">
              <label className="block">
                <span className="demo-label">Título de la nota</span>
                <input
                  className="demo-field"
                  maxLength={160}
                  value={resource.title}
                  onChange={(e) =>
                    patchResource(resource.id, { title: e.target.value })
                  }
                />
              </label>
              <label className="block">
                <span className="demo-label">Proyecto de la nota</span>
                <select
                  className="demo-field"
                  value={resource.project}
                  onChange={(e) =>
                    patchResource(resource.id, { project: e.target.value })
                  }
                >
                  <option value="">Sin proyecto</option>
                  {state.projects.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="demo-label">Contenido de la nota</span>
                <textarea
                  className="demo-field min-h-64 leading-7"
                  maxLength={20000}
                  value={resource.content}
                  placeholder="Escribe una idea ficticia…"
                  onChange={(e) =>
                    patchResource(resource.id, { content: e.target.value })
                  }
                />
              </label>
              <p className="flex items-center gap-2 text-xs text-ink-muted">
                <Check className="size-4" />
                Cambios en tu sesión · {resource.content.length}/20.000
                caracteres
              </p>
            </div>
          ) : (
            <article className="demo-card max-w-4xl p-6">
              <h2 className="mb-4 font-semibold">Contenido del documento</h2>
              <p className="demo-body text-sm">{resource.content}</p>
            </article>
          ))}
        {tab === 'decisiones' && (
          <div className="space-y-4">
            {resource.decisions?.map((decision, i) => (
              <article key={i} className="demo-card p-5">
                <span className="text-xs font-medium uppercase tracking-wide text-brand-ink">
                  Decisión {i + 1}
                </span>
                <h2 className="mt-2 font-medium">{decision.text}</h2>
                <a
                  className="demo-link mt-3 inline-block text-sm"
                  href={resourceHref(resource, decision.source)}
                >
                  Ver fuente · {resource.segments?.[decision.source]?.time}
                </a>
              </article>
            ))}
          </div>
        )}
        {tab === 'pendientes' && (
          <div className="space-y-3">
            {resource.tasks?.map((task, i) => (
              <article className="demo-card flex gap-3 p-5" key={i}>
                <input
                  type="checkbox"
                  className="mt-1 size-5 shrink-0 accent-brand"
                  checked={task.done}
                  aria-label={`Completar: ${task.text}`}
                  onChange={(e) =>
                    patchResource(resource.id, {
                      tasks: resource.tasks?.map((t, n) =>
                        n === i ? { ...t, done: e.target.checked } : t,
                      ),
                    })
                  }
                />
                <div>
                  <h2
                    className={`text-sm font-medium ${task.done ? 'line-through text-ink-muted' : ''}`}
                  >
                    {task.text}
                  </h2>
                  <p className="mt-2 text-xs text-ink-muted">
                    {task.owner} · {task.due}
                  </p>
                  <a
                    href={resourceHref(resource, task.source)}
                    className="demo-link mt-3 inline-block text-xs"
                  >
                    Ver fuente · {resource.segments?.[task.source]?.time}
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
        {tab === 'transcripcion' && (
          <div className="space-y-4">
            <p className="mb-5 text-sm text-ink-muted">
              Texto ficticio con marcas de tiempo. Este ejemplo no contiene una
              grabación de audio.
            </p>
            {resource.segments?.map((segment, i) => (
              <article
                id={`source-${i}`}
                className={`demo-card scroll-mt-28 p-5 ${String(i) === source ? 'source-active' : ''}`}
                key={i}
              >
                <div className="mb-2 flex items-center gap-3">
                  <span className="rounded bg-brand-soft px-2 py-1 font-mono text-xs text-brand-ink">
                    {segment.time}
                  </span>
                  <h2 className="text-sm font-semibold">{segment.speaker}</h2>
                </div>
                <p className="text-sm leading-7">{segment.text}</p>
              </article>
            ))}
          </div>
        )}
        {tab === 'preguntar' && (
          <Ask
            resources={state.resources}
            projects={state.projects}
            fixedResource={resource}
          />
        )}
      </section>
    </>
  )
}

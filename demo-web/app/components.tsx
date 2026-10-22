'use client'
import { useState } from 'react'
import {
  ArrowRight,
  FileText,
  FolderKanban,
  Mic,
  Search,
  Sparkles,
  StickyNote,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  findEvidence,
  kindLabels,
  resourceHref,
  resourceText,
  type DemoState,
  type Resource,
  type Evidence,
} from '../lib/data'

export const icons = { document: FileText, note: StickyNote, meeting: Mic }
export function Heading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-brand-ink">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  )
}
export function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="demo-card p-10 text-center">
      <Search className="mx-auto mb-3 size-6 text-ink-faint" aria-hidden />
      <h2 className="font-medium">{title}</h2>
      <p className="mt-2 text-sm text-ink-muted">{text}</p>
    </div>
  )
}
export function ResourceList({ resources }: { resources: Resource[] }) {
  if (!resources.length)
    return (
      <Empty
        title="No hay recursos aquí todavía"
        text="Prueba otro filtro o añade un ejemplo desde el inicio."
      />
    )
  return (
    <div className="demo-card divide-y divide-border-subtle overflow-hidden">
      {resources.map((resource) => {
        const Icon = icons[resource.kind]
        return (
          <a
            key={resource.id}
            href={resourceHref(resource)}
            className="flex items-center gap-3 px-4 py-4 hover:bg-surface-muted sm:px-5"
          >
            <span className="rounded-lg bg-brand-soft p-2.5 text-brand-ink">
              <Icon className="size-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">
                {resource.title || 'Nota sin título'}
              </span>
              <span className="mt-1 block text-xs text-ink-muted">
                {kindLabels[resource.kind]} ·{' '}
                {resource.project || 'Sin proyecto'}
              </span>
            </span>
            <ArrowRight
              className="size-4 shrink-0 text-ink-faint"
              aria-hidden
            />
          </a>
        )
      })}
    </div>
  )
}
export function Dashboard({ state }: { state: DemoState }) {
  const actions = [
    {
      href: '#/add-document',
      icon: FileText,
      title: 'Añadir documento',
      text: 'Explora un archivo de ejemplo.',
    },
    {
      href: '#/new-note',
      icon: StickyNote,
      title: 'Crear nota',
      text: 'Guarda una idea de prueba.',
    },
    {
      href: '#/new-meeting',
      icon: Mic,
      title: 'Nueva reunión',
      text: 'Usa una transcripción ficticia.',
    },
    {
      href: '#/ask',
      icon: Sparkles,
      title: 'Preguntar',
      text: 'Encuentra respuestas con fuentes.',
    },
  ]
  return (
    <>
      <Heading
        eyebrow="Tu espacio de conocimiento"
        title={`Hola, ${state.name}`}
        description="Tus documentos, ideas y reuniones, conectados en un solo lugar."
      />
      <section
        className="demo-card mb-7 flex flex-wrap items-center justify-between gap-5 bg-brand-soft p-5 sm:p-6"
        aria-label="Recorrido recomendado"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-ink">
            Empieza por aquí
          </p>
          <h2 className="mt-2 text-lg font-semibold">
            De una reunión a una decisión con evidencia.
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Abre el ejemplo, revisa los pendientes y consulta la fuente.
          </p>
        </div>
        <Button asChild>
          <a href="#/resource/reunion-emprendimiento">
            Explorar reunión <ArrowRight />
          </a>
        </Button>
      </section>
      <div className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {actions.map((a) => (
          <a
            className="demo-card demo-card-hover p-5"
            href={a.href}
            key={a.href}
          >
            <a.icon className="mb-4 size-5 text-brand-ink" aria-hidden />
            <h2 className="font-medium">{a.title}</h2>
            <p className="mt-2 text-xs leading-5 text-ink-muted">{a.text}</p>
          </a>
        ))}
      </div>
      <div className="grid gap-7 xl:grid-cols-[1.8fr_1fr]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Tu biblioteca</h2>
            <a href="#/library" className="demo-link text-sm">
              Ver todo
            </a>
          </div>
          <ResourceList resources={state.resources.slice(0, 5)} />
        </section>
        <section>
          <h2 className="mb-3 font-semibold">Proyectos</h2>
          <div className="space-y-3">
            {state.projects.slice(0, 4).map((p) => (
              <a
                className="demo-card demo-card-hover flex items-center gap-3 p-4"
                key={p}
                href={`#/project/${encodeURIComponent(p)}`}
              >
                <FolderKanban className="size-5 text-brand-ink" aria-hidden />
                <div>
                  <p className="text-sm font-medium">{p}</p>
                  <p className="mt-1 text-xs text-ink-muted">
                    {state.resources.filter((r) => r.project === p).length}{' '}
                    recursos
                  </p>
                </div>
              </a>
            ))}
          </div>
          <p className="mt-4 text-xs leading-5 text-ink-muted">
            Espacio ficticio: Universidad. Cada visitante explora su propia
            sesión.
          </p>
        </section>
      </div>
    </>
  )
}
export function Library({
  state,
  project,
  searchMode = false,
}: {
  state: DemoState
  project?: string
  searchMode?: boolean
}) {
  const [kind, setKind] = useState('all')
  const [projectFilter, setProjectFilter] = useState(project ?? '')
  const [query, setQuery] = useState('')
  const normalize = (v: string) =>
    v
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
  const filtered = state.resources.filter(
    (r) =>
      (kind === 'all' || r.kind === kind) &&
      (!projectFilter || r.project === projectFilter) &&
      (!query.trim() ||
        normalize(resourceText(r)).includes(normalize(query.trim()))),
  )
  return (
    <>
      <Heading
        title={
          project ?? (searchMode ? 'Buscar en tu conocimiento' : 'Biblioteca')
        }
        description={
          searchMode
            ? 'Encuentra palabras o frases dentro de documentos, notas y transcripciones.'
            : 'Todo lo que guardas, organizado por tipo y proyecto.'
        }
        action={
          <Button asChild variant="outline">
            <a href="#/new-note">Crear nota</a>
          </Button>
        }
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
        <label>
          <span className="demo-label">Buscar</span>
          <input
            className="demo-field"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Prueba: proveedor B"
            type="search"
          />
        </label>
        <label>
          <span className="demo-label">Tipo de recurso</span>
          <select
            className="demo-field"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            <option value="all">Todos los tipos</option>
            {Object.entries(kindLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="demo-label">Proyecto</span>
          <select
            className="demo-field"
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
          >
            <option value="">Todos los proyectos</option>
            {state.projects.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
      </div>
      <p className="mb-3 text-xs text-ink-muted" aria-live="polite">
        {filtered.length} recursos encontrados
      </p>
      <ResourceList resources={filtered} />
    </>
  )
}
export function Ask({
  resources,
  projects,
  fixedResource,
}: {
  resources: Resource[]
  projects: string[]
  fixedResource?: Resource
}) {
  const [question, setQuestion] = useState('')
  const [scope, setScope] = useState('')
  const [result, setResult] = useState<{
    question: string
    hits: Evidence[]
  } | null>(null)
  function ask(value: string) {
    if (!value.trim()) return
    const candidates = fixedResource
      ? [fixedResource]
      : resources.filter((r) => !scope || r.project === scope)
    setQuestion(value)
    setResult({ question: value, hits: findEvidence(value, candidates) })
  }
  const suggestions =
    fixedResource?.kind === 'document'
      ? [
          '¿Qué es el modelo Canvas?',
          '¿Cuáles son las funciones del proceso administrativo?',
        ]
      : [
          '¿Qué proveedor vamos a seleccionar?',
          '¿Cuál es la temperatura de Neptuno?',
        ]
  return (
    <div className="mx-auto max-w-3xl">
      {!fixedResource && (
        <Heading
          eyebrow="Respuestas con evidencia"
          title="Pregúntale a tu conocimiento"
          description="Consulta el contenido de tu biblioteca y vuelve a la fuente para comprobarlo."
        />
      )}
      <div className="mb-5 rounded-lg border border-border-subtle bg-surface-muted p-3 text-xs leading-5 text-ink-muted">
        <strong className="text-ink">Consulta de demostración.</strong> Busca
        coincidencias de palabras y muestra fragmentos literales. No utiliza un
        servicio de IA. Si no encuentra evidencia suficiente, lo indica.
      </div>
      <form
        className="demo-card p-5"
        onSubmit={(e) => {
          e.preventDefault()
          ask(question)
        }}
      >
        {!fixedResource && (
          <label className="mb-4 block">
            <span className="demo-label">Consultar en</span>
            <select
              className="demo-field"
              value={scope}
              onChange={(e) => {
                setScope(e.target.value)
                setResult(null)
              }}
            >
              <option value="">Todo el espacio</option>
              {projects.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
        )}
        <label>
          <span className="demo-label">Tu pregunta</span>
          <textarea
            className="demo-field min-h-28 resize-y"
            placeholder="¿Qué proveedor vamos a seleccionar?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={500}
            required
          />
        </label>
        <div className="mt-3 flex justify-end">
          <Button type="submit" disabled={!question.trim()}>
            <Sparkles />
            Consultar fuentes
          </Button>
        </div>
      </form>
      <div className="my-4 flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button
            key={s}
            className="rounded-full border border-border-subtle px-3 py-2 text-xs text-ink-muted hover:bg-surface-muted"
            onClick={() => ask(s)}
          >
            {s}
          </button>
        ))}
      </div>
      {result && (
        <section
          className="demo-card mt-6 p-5 sm:p-6"
          aria-live="polite"
          aria-label="Resultado de la consulta"
        >
          <h2 className="mb-4 font-semibold">{result.question}</h2>
          {result.hits.length ? (
            <>
              <p className="mb-4 text-sm text-ink-muted">
                Encontré estos fragmentos relacionados en tus fuentes:
              </p>
              <div className="space-y-5">
                {result.hits.map((hit, i) => (
                  <div key={`${hit.resource.id}-${hit.segment ?? i}`}>
                    <blockquote className="border-l-2 border-brand pl-4 text-sm leading-7">
                      {hit.text}
                    </blockquote>
                    <a
                      className="demo-link mt-2 inline-block text-xs"
                      href={resourceHref(hit.resource, hit.segment)}
                    >
                      Fuente {i + 1}: {hit.resource.title}
                      {hit.segment !== undefined
                        ? ` · ${hit.resource.segments?.[hit.segment]?.time}`
                        : ''}
                    </a>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="font-medium">
                No encontré evidencia suficiente en las fuentes seleccionadas.
              </p>
              <p className="mt-2 text-sm leading-6 text-ink-muted">
                Prueba una pregunta sobre el contenido disponible o cambia el
                proyecto. Esta demo no completa las respuestas con información
                externa.
              </p>
            </>
          )}
        </section>
      )}
    </div>
  )
}

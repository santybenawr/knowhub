import Link from 'next/link'
import {
  ArrowRight,
  FileText,
  Link2,
  Mic,
  NotebookPen,
  Quote,
  Search,
  Sparkles,
} from 'lucide-react'
import { APP } from '@/config/app'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

/** §46/§47 — Public landing. */
export default function LandingPage() {
  return (
    <>
      <section className="mx-auto w-full max-w-6xl px-5 pb-16 pt-14 sm:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <Badge tone="brand" className="mb-6">
            <Sparkles className="size-3.5" />
            Documentos, notas y reuniones en un solo lugar
          </Badge>
          <h1 className="text-balance text-4xl font-bold leading-[1.1] tracking-tight text-ink sm:text-5xl md:text-6xl">
            Tu información no debería desaparecer cuando termina una reunión o una clase.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-ink-muted">
            {APP.name} organiza documentos, notas y reuniones para ayudarte a encontrar exactamente lo
            que necesitas cuando lo necesitas.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/signup">
                Empezar gratis <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="#como-funciona">Ver cómo funciona</Link>
            </Button>
          </div>
        </div>

        <div className="mx-auto mt-16 grid max-w-4xl gap-4 sm:grid-cols-3">
          {[
            { icon: FileText, title: 'Lo que lees', body: 'Sube PDF, Word, Markdown o texto.' },
            { icon: NotebookPen, title: 'Lo que escribes', body: 'Crea notas que se indexan solas.' },
            { icon: Mic, title: 'Lo que escuchas', body: 'Graba reuniones y recupera cada momento.' },
          ].map((item) => (
            <div key={item.title} className="surface-card p-5">
              <item.icon className="size-5 text-brand" aria-hidden />
              <h2 className="mt-3 font-semibold text-ink">{item.title}</h2>
              <p className="mt-1 text-sm text-ink-muted">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* §5 — the concrete moment the product exists for. */}
      <section className="border-y border-border-subtle bg-surface-muted/50">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-5 py-16 lg:grid-cols-2">
          <div>
            <h2 className="text-balance text-3xl font-bold tracking-tight text-ink">
              Graba y deja de tomar notas a toda velocidad.
            </h2>
            <p className="mt-4 text-ink-muted">
              {APP.name} transcribe la reunión, separa a los participantes cuando el proveedor lo
              permite, marca los tiempos y extrae decisiones y pendientes. Cada dato queda enlazado al
              segundo exacto del audio.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {[
                'Decisiones con su fuente en la grabación',
                'Pendientes con responsable y fecha, solo si se dijeron',
                'Preguntas en lenguaje natural sobre cualquier reunión',
              ].map((line) => (
                <li key={line} className="flex items-start gap-2.5">
                  <Link2 className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                  <span className="text-ink-muted">{line}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="surface-card overflow-hidden p-0">
            <div className="border-b border-border-subtle bg-surface px-5 py-3 text-sm font-medium text-ink">
              Reunión Proyecto Omega
            </div>
            <div className="space-y-4 p-5 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Decisión</p>
                <p className="mt-1 text-ink">Seleccionar el proveedor B.</p>
                <p className="mt-1 font-mono text-xs text-brand">Fuente · 23:41</p>
              </div>
              <div className="border-t border-border-subtle pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Pendiente</p>
                <p className="mt-1 text-ink">Contactar al proveedor B.</p>
                <p className="mt-0.5 text-xs text-ink-muted">Responsable: Laura · Fecha: 21 ago</p>
                <p className="mt-1 font-mono text-xs text-brand">Fuente · 24:03</p>
              </div>
              <div className="rounded-lg bg-brand-soft p-4">
                <p className="flex items-center gap-1.5 text-xs font-medium text-brand-ink">
                  <Quote className="size-3.5" /> ¿Qué decidimos sobre el proveedor?
                </p>
                <p className="mt-2 text-ink">
                  Se decidió seleccionar al proveedor B. <span className="font-medium text-brand-ink">[1]</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="como-funciona" className="mx-auto w-full max-w-6xl px-5 py-16 scroll-mt-20">
        <h2 className="text-center text-3xl font-bold tracking-tight text-ink">Cómo funciona</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: Mic,
              title: 'Captura',
              body: 'Sube documentos, crea notas o graba reuniones.',
            },
            {
              icon: Sparkles,
              title: `${APP.name} entiende`,
              body: 'La IA procesa y organiza la información.',
            },
            {
              icon: Link2,
              title: `${APP.name} conecta`,
              body: 'Encuentra relaciones entre tus recursos.',
            },
            {
              icon: Search,
              title: 'Recupera',
              body: 'Pregunta en lenguaje natural y vuelve a la fuente original.',
            },
          ].map((step, index) => (
            <div key={step.title} className="surface-card p-5">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand-ink">
                  {index + 1}
                </span>
                <step.icon className="size-4 text-ink-faint" aria-hidden />
              </div>
              <h3 className="mt-3 font-semibold text-ink">{step.title}</h3>
              <p className="mt-1 text-sm text-ink-muted">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-5 pb-20 text-center">
        <h2 className="text-balance text-3xl font-bold tracking-tight text-ink">
          Todo lo que sabes, cuando lo necesitas.
        </h2>
        <p className="mt-4 text-balance text-ink-muted">{APP.description}</p>
        <Button asChild size="lg" className="mt-8">
          <Link href="/signup">
            Crear mi cuenta <ArrowRight className="size-4" />
          </Link>
        </Button>
      </section>
    </>
  )
}

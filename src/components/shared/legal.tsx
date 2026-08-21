import { AlertTriangle } from 'lucide-react'

export function LegalPage({
  title,
  updatedAt,
  children,
}: {
  title: string
  updatedAt: string
  children: React.ReactNode
}) {
  return (
    <article className="mx-auto w-full max-w-3xl px-5 py-14">
      <h1 className="text-3xl font-bold tracking-tight text-ink">{title}</h1>
      <p className="mt-2 text-sm text-ink-faint">Última actualización: {updatedAt}</p>
      <div className="mt-8 space-y-5 text-sm leading-relaxed text-ink-muted [&_h2]:mt-8 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">
        {children}
      </div>
    </article>
  )
}

/**
 * §137/§138 — These documents are drafts written by engineers. Saying so on the
 * page is more useful than a comment nobody reads.
 */
export function LegalNotice() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning-soft p-4">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
      <p className="text-sm text-ink">
        <strong className="font-semibold">Borrador pendiente de revisión legal.</strong> Este texto es una
        base técnica y no constituye asesoría jurídica. Debe ser revisado y aprobado por un abogado antes
        de poner el servicio en producción.
      </p>
    </div>
  )
}

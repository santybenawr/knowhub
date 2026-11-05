import { FileText, Search, BookOpenCheck } from 'lucide-react'
import { documentUploadLimitMb, isPublicBeta } from '@/lib/release'

/** Shared introduction: registration and the help page teach the same workflow. */
export function GettingStartedGuide() {
  return (
    <div className="space-y-4">
      <ol className="space-y-3">
        <li className="flex gap-3 rounded-lg bg-surface-muted p-3">
          <FileText className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
          <div>
            <h3 className="font-medium text-ink">1. Guarda algo que quieras recordar</h3>
            <p className="mt-1 text-sm text-ink-muted">
              Crea una nota y espera a ver «Guardado», sube un PDF, DOCX, TXT o Markdown
              de hasta {documentUploadLimitMb()} MB, o pega la transcripción de una reunión.
              Espera a que termine el procesamiento antes de consultar ese contenido.
            </p>
          </div>
        </li>
        <li className="flex gap-3 rounded-lg bg-surface-muted p-3">
          <Search className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
          <div>
            <h3 className="font-medium text-ink">2. Encuéntralo en tu biblioteca</h3>
            <p className="mt-1 text-sm text-ink-muted">
              Agrupa tu contenido en proyectos. Puedes combinar el tipo de recurso y
              el proyecto para filtrar, o buscar palabras que aparezcan en el texto.
              Si no ves algo, quita los filtros y vuelve a buscar.
            </p>
          </div>
        </li>
        <li className="flex gap-3 rounded-lg bg-surface-muted p-3">
          <BookOpenCheck className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
          <div>
            <h3 className="font-medium text-ink">3. Pregunta y comprueba la fuente</h3>
            <p className="mt-1 text-sm text-ink-muted">
              En Preguntar, escribe una pregunta sobre lo que guardaste. Abre las
              citas de la respuesta para revisar el documento, la nota o la reunión
              de origen. Sin información suficiente, KnowHub te lo indicará.
            </p>
          </div>
        </li>
      </ol>
      {isPublicBeta() ? (
        <p className="rounded-lg border border-brand/25 bg-brand-soft p-3 text-sm text-brand-ink">
          Esta beta busca fragmentos de tu contenido por palabras. Todavía no tiene
          IA externa ni transcripción de audio: para reuniones, pega una transcripción.
        </p>
      ) : null}
    </div>
  )
}

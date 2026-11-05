import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, BookOpen, FileText, FolderKanban, NotebookPen, Search, MessageSquare, ListChecks } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GettingStartedGuide } from '@/components/shared/getting-started-guide'
import { documentUploadLimitMb, isPublicBeta } from '@/lib/release'

export const metadata: Metadata = { title: 'Ayuda y guía' }

export default function HelpPage() {
  const beta = isPublicBeta()

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <BookOpen className="size-6" aria-hidden />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Ayuda y guía</h1>
        <p className="mt-2 text-sm text-ink-muted">
          De tu primer archivo a una respuesta con fuentes. Vuelve aquí cuando lo necesites;
          esta guía no cambia tus datos.
        </p>
      </header>

      <section aria-labelledby="primeros-pasos" className="surface-card p-5 sm:p-6">
        <h2 id="primeros-pasos" className="mb-4 text-lg font-semibold text-ink">Tus primeros pasos</h2>
        <GettingStartedGuide />
        <Button asChild className="mt-5">
          <Link href="/notes/new">Crear mi primera nota <ArrowRight className="size-4" /></Link>
        </Button>
      </section>

      <section aria-labelledby="como-usar" className="space-y-3">
        <h2 id="como-usar" className="text-lg font-semibold text-ink">Cómo usar cada función</h2>
        <GuideSection icon={NotebookPen} title="Notas" href="/notes/new" action="Crear una nota">
          Escribe un título, elige un proyecto si quieres y añade tu texto. Los cambios
          se guardan automáticamente: espera a ver «Guardado» antes de cerrar la pestaña.
          Encontrarás tus notas en Biblioteca, con el filtro Notas.
        </GuideSection>
        <GuideSection icon={FileText} title="Documentos" href="/library?upload=1" action="Subir un documento">
          Admite PDF con texto seleccionable, Word (.docx), texto plano (.txt) y Markdown (.md),
          hasta {documentUploadLimitMb()} MB por archivo. Un archivo .doc antiguo debe convertirse
          a .docx. Los PDF escaneados o las fotografías necesitan convertirse a texto antes de
          subirlos. Espera a que termine el procesamiento; si aparece un error, abre el documento
          para revisar el motivo y la opción de reintentar. Puedes consultar el contenido y abrir
          el archivo original desde su ficha.
        </GuideSection>
        <GuideSection icon={ListChecks} title="Reuniones" href="/meetings/new" action="Crear una reunión">
          Añade un título y pega una transcripción con suficiente contenido en Importar
          transcripción. Puede incluir nombres de hablantes y tiempos, por ejemplo
          «00:15 Ana: Entregamos el informe el viernes». Después del procesamiento, abre
          Transcripción para leer el texto y revisa el resumen, los acuerdos y las tareas
          junto con sus fuentes. {beta ? 'En esta beta no se puede grabar ni subir audio.' : 'Si usas un proveedor de transcripción de ejemplo, el audio no se convierte en texto real; importa el texto para conservar lo que se dijo.'}
        </GuideSection>
        <GuideSection icon={FolderKanban} title="Proyectos y filtros" href="/projects" action="Ver proyectos">
          Un proyecto reúne documentos, notas y reuniones de un tema. Asígnalo al crear
          o editar contenido. En Biblioteca, los filtros se combinan: Notas y un proyecto
          muestran solo las notas de ese proyecto. Para ampliar la vista, elige Todos y
          Todos los proyectos. En Documentos también puedes filtrar por PDF, DOCX, TXT
          o Markdown; cada tarjeta muestra su formato. Usa Quitar filtros si una combinación
          no devuelve resultados. Filtrar no borra ni mueve tu información.
        </GuideSection>
        <GuideSection icon={Search} title="Buscar" href="/search" action="Buscar en mi contenido">
          Escribe una palabra o frase que recuerdes del contenido, selecciona el tipo y
          el proyecto si los conoces, y pulsa Buscar. Abre un resultado para leer su fuente.
          Si no aparece lo esperado, prueba una palabra más concreta y elimina los filtros.
          Un archivo aún en procesamiento puede tardar en aparecer en la búsqueda.
        </GuideSection>
        <GuideSection icon={MessageSquare} title="Preguntar y revisar citas" href="/ask" action="Hacer una pregunta">
          Primero guarda contenido. Después pregunta algo sobre él, por ejemplo «¿Cuándo
          entregamos el informe?». Puedes limitar la consulta a un proyecto o una fuente.
          Abre cada cita para comprobar la respuesta en su contexto. Si no hay evidencia
          suficiente, reformula con palabras del texto o añade la información que falta.
          Puedes volver a abrir una conversación desde Conversaciones recientes y continuarla.
          {beta ? ' Las respuestas actuales seleccionan fragmentos; no funcionan como un chat de IA general.' : ''}
        </GuideSection>
      </section>

      <section aria-labelledby="dudas" className="surface-card p-5 sm:p-6">
        <h2 id="dudas" className="mb-4 text-lg font-semibold text-ink">Si algo no sale como esperabas</h2>
        <div className="space-y-3">
          <details className="rounded-lg border border-border-subtle p-3">
            <summary className="cursor-pointer font-medium text-ink">No encuentro un archivo o una nota</summary>
            <p className="mt-2 text-sm text-ink-muted">
              Comprueba que estás en el espacio correcto. En Biblioteca, quita los filtros
              de tipo y proyecto. Si acabas de subir un archivo, revisa si sigue procesándose.
              En una nota, confirma que el último cambio llegó a mostrar «Guardado».
            </p>
          </details>
          <details className="rounded-lg border border-border-subtle p-3">
            <summary className="cursor-pointer font-medium text-ink">Mi archivo no se puede leer</summary>
            <p className="mt-2 text-sm text-ink-muted">
              Verifica que se abre correctamente en tu dispositivo, que tiene texto y que
              no supera {documentUploadLimitMb()} MB. Cambiar la extensión no convierte el formato:
              utiliza Guardar como o Exportar en la aplicación original. En TXT, exportar
              como UTF-8 suele evitar problemas con caracteres.
            </p>
          </details>
          <details className="rounded-lg border border-border-subtle p-3">
            <summary className="cursor-pointer font-medium text-ink">¿Dónde veo mi cuenta y sus límites?</summary>
            <p className="mt-2 text-sm text-ink-muted">
              En Inicio puedes consultar el uso de tu cuenta. En{' '}
              <Link href="/profile" className="text-brand underline">Perfil</Link> puedes
              editar tus datos, cambiar la apariencia y cerrar sesión.
              {beta ? ' Guarda tu contraseña: la recuperación por correo y las invitaciones todavía no están disponibles en esta beta.' : ''}
            </p>
          </details>
        </div>
      </section>
    </div>
  )
}

function GuideSection({ icon: Icon, title, href, action, children }: {
  icon: typeof BookOpen
  title: string
  href: string
  action: string
  children: React.ReactNode
}) {
  return (
    <article className="surface-card p-5">
      <h3 className="flex items-center gap-2 font-semibold text-ink">
        <Icon className="size-4 text-brand" aria-hidden /> {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">{children}</p>
      <Link href={href} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
        {action} <ArrowRight className="size-3.5" aria-hidden />
      </Link>
    </article>
  )
}

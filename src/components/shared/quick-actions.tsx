import Link from 'next/link'
import { FileText, Mic, NotebookPen, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * §45/§50 — The four things KnowHub is for. Recording leads because it is the
 * one capture path that otherwise never happens.
 */
const ACTIONS = [
  {
    href: '/meetings/new',
    label: 'Grabar reunión',
    description: 'Captura la conversación',
    icon: Mic,
    featured: true,
  },
  { href: '/library?upload=1', label: 'Subir documento', description: 'PDF, Word, texto', icon: FileText },
  { href: '/notes/new', label: 'Crear nota', description: 'Escribe una idea', icon: NotebookPen },
  { href: '/ask', label: 'Preguntar a KnowHub', description: 'En lenguaje natural', icon: Sparkles },
]

export function QuickActions({ className }: { className?: string }) {
  return (
    <div className={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-4', className)}>
      {ACTIONS.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className={cn(
            'group flex flex-col gap-2 rounded-card border p-4 transition-colors',
            action.featured
              ? 'border-brand/30 bg-brand-soft hover:border-brand/60'
              : 'border-border-subtle bg-surface hover:border-border-strong',
          )}
        >
          <action.icon
            className={cn('size-5', action.featured ? 'text-brand' : 'text-ink-faint')}
            aria-hidden
          />
          <div>
            <p className={cn('font-medium', action.featured ? 'text-brand-ink' : 'text-ink')}>
              {action.label}
            </p>
            <p className="text-xs text-ink-muted">{action.description}</p>
          </div>
        </Link>
      ))}
    </div>
  )
}

'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Field, Input, Textarea } from '@/components/ui/field'
import type { ActionResult } from '@/lib/action-result'

const ICONS = ['📁', '📚', '💼', '🔬', '🎓', '🚀', '💡', '📊']

export function NewProjectDialog({
  onCreate,
}: {
  onCreate: (input: {
    name: string
    description?: string
    icon?: string
  }) => Promise<ActionResult<{ projectId: string }>>
}) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [icon, setIcon] = React.useState(ICONS[0] ?? '📁')
  const [error, setError] = React.useState<string | null>(null)
  const [pending, startTransition] = React.useTransition()

  const submit = () => {
    setError(null)
    startTransition(async () => {
      const result = await onCreate({ name, description, icon })
      if (!result.ok) {
        setError(result.error)
        return
      }
      setOpen(false)
      setName('')
      setDescription('')
      router.push(`/projects/${result.data.projectId}`)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus /> Nuevo proyecto
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo proyecto</DialogTitle>
          <DialogDescription>Agrupa recursos de un mismo tema.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="mb-1.5 text-sm font-medium text-ink">Icono</p>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Icono del proyecto">
              {ICONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={icon === option}
                  onClick={() => setIcon(option)}
                  className={`rounded-lg border p-2 text-xl transition-colors ${
                    icon === option ? 'border-brand bg-brand-soft' : 'border-border-subtle hover:border-border-strong'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <Field label="Nombre" htmlFor="project-name">
            <Input
              id="project-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Proyecto Omega"
              autoFocus
            />
          </Field>

          <Field label="Descripción" htmlFor="project-description" hint="Opcional.">
            <Textarea
              id="project-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
            />
          </Field>

          {error ? (
            <p className="text-sm text-record" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} loading={pending} disabled={!name.trim()}>
            Crear proyecto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

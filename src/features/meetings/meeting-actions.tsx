'use client'

import * as React from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { MoreHorizontal, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { ActionResult } from '@/lib/action-result'

/** §126 — Delete offers both levels, and is explicit about which is reversible. */
export function MeetingActions({
  meetingId,
  onDelete,
}: {
  meetingId: string
  onDelete: (meetingId: string, permanent?: boolean) => Promise<ActionResult<undefined>>
}) {
  const [open, setOpen] = React.useState(false)
  const [permanent, setPermanent] = React.useState(false)
  const [pending, startTransition] = React.useTransition()

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button variant="ghost" size="icon" aria-label="Más acciones">
            <MoreHorizontal />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={6}
            className="z-50 w-56 rounded-lg border border-border-subtle bg-surface p-1 shadow-lg"
          >
            <DropdownMenu.Item
              onSelect={() => {
                setPermanent(false)
                setOpen(true)
              }}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-ink-muted outline-none data-[highlighted]:bg-surface-muted"
            >
              <Trash2 className="size-3.5" aria-hidden />
              Eliminar reunión
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onSelect={() => {
                setPermanent(true)
                setOpen(true)
              }}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-record outline-none data-[highlighted]:bg-record-soft"
            >
              <Trash2 className="size-3.5" aria-hidden />
              Eliminar definitivamente
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {permanent ? '¿Eliminar definitivamente?' : '¿Eliminar esta reunión?'}
            </DialogTitle>
            <DialogDescription>
              {permanent
                ? 'Se borrarán el audio, la transcripción, el análisis y los índices de búsqueda. Esta acción no se puede deshacer.'
                : 'La reunión saldrá de tu biblioteca. El audio y la transcripción se conservan y pueden restaurarse.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant={permanent ? 'record' : 'danger'}
              loading={pending}
              onClick={() => startTransition(() => void onDelete(meetingId, permanent))}
            >
              {permanent ? 'Eliminar definitivamente' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

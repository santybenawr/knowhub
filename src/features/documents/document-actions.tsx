'use client'

import * as React from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { MoreHorizontal, RefreshCw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import type { ActionResult } from '@/lib/action-result'

export function DocumentActions({
  documentId,
  onReprocess,
  onDelete,
}: {
  documentId: string
  onReprocess: (documentId: string) => Promise<ActionResult<undefined>>
  onDelete: (documentId: string) => Promise<ActionResult<undefined>>
}) {
  const { notify } = useToast()
  const [confirm, setConfirm] = React.useState(false)
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
            className="z-50 w-52 rounded-lg border border-border-subtle bg-surface p-1 shadow-lg"
          >
            <DropdownMenu.Item
              onSelect={() =>
                startTransition(async () => {
                  const result = await onReprocess(documentId)
                  notify(
                    result.ok ? 'Reprocesando el documento…' : result.error,
                    result.ok ? 'info' : 'error',
                  )
                })
              }
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-ink-muted outline-none data-[highlighted]:bg-surface-muted"
            >
              <RefreshCw className="size-3.5" aria-hidden />
              Volver a procesar
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onSelect={() => setConfirm(true)}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-record outline-none data-[highlighted]:bg-record-soft"
            >
              <Trash2 className="size-3.5" aria-hidden />
              Eliminar documento
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Eliminar este documento?</DialogTitle>
            <DialogDescription>
              Saldrá de tu biblioteca y de los resultados de búsqueda.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              loading={pending}
              onClick={() => startTransition(() => void onDelete(documentId))}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

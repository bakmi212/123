'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { Button } from '@/components/ui/button'

import { Loader2 } from 'lucide-react'

import { UpdateItem } from './types'

interface UpdateDeleteDialogProps {
  open: boolean
  selected: UpdateItem | null
  deleting: boolean

  onOpenChange: (open: boolean) => void
  onDelete: () => void
}

export function UpdateDeleteDialog({
  open,
  selected,
  deleting,
  onOpenChange,
  onDelete,
}: UpdateDeleteDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent>

        <DialogHeader>

          <DialogTitle>
            Delete Update
          </DialogTitle>

          <DialogDescription>
            This action cannot be undone.
          </DialogDescription>

        </DialogHeader>

        <div className="space-y-4">

          <p>
            Are you sure you want to delete this update?
          </p>

          {selected && (
            <div className="rounded-lg border p-4">

              <div className="space-y-1">

                <p className="font-semibold">
                  {selected.products?.name ?? "-"}
                </p>

                <p className="text-sm">
                  {selected.version}
                </p>

                <p className="text-sm text-muted-foreground">
                  {selected.title}
                </p>

              </div>

            </div>
          )}

        </div>

        <DialogFooter>

          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>

          <Button
            variant="destructive"
            disabled={deleting}
            onClick={onDelete}
          >
            {deleting && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}

            Delete Update
          </Button>

        </DialogFooter>

      </DialogContent>
    </Dialog>
  )
}

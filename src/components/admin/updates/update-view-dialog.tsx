'use client'

import { Label } from '@/components/ui/label'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { Button } from '@/components/ui/button'

import { UpdateItem } from './types'

interface UpdateViewDialogProps {
  open: boolean
  selected: UpdateItem | null

  onOpenChange: (open: boolean) => void

  renderTypeBadge: (
    type: UpdateItem['type']
  ) => React.ReactNode

  renderStatusBadge: (
    status: UpdateItem['status']
  ) => React.ReactNode
}

export function UpdateViewDialog({
  open,
  selected,
  onOpenChange,
  renderTypeBadge,
  renderStatusBadge,
}: UpdateViewDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Update Details
          </DialogTitle>

          <DialogDescription>
            View application update information.
          </DialogDescription>
        </DialogHeader>

        {selected && (
          <div className="space-y-6">

            <div>
              <Label>Product</Label>

              <p className="mt-1 font-medium">
                {selected.products?.name ?? "-"}
              </p>
            </div>

            <div>
              <Label>Version</Label>

              <p className="mt-1 font-medium">
                {selected.version}
              </p>
            </div>

            <div>
              <Label>Title</Label>

              <p className="mt-1 font-medium">
                {selected.title}
              </p>
            </div>

            <div>
              <Label>Description</Label>

              <div className="mt-1 whitespace-pre-wrap rounded-md border p-4 text-sm">
                {selected.description}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">

              <div>
                <Label>Type</Label>

                <div className="mt-2">
                  {renderTypeBadge(selected.type)}
                </div>
              </div>

              <div>
                <Label>Status</Label>

                <div className="mt-2">
                  {renderStatusBadge(selected.status)}
                </div>
              </div>

              <div>
                <Label>Published</Label>

                <p className="mt-2">
                  {selected.published ? "Yes" : "No"}
                </p>
              </div>

            </div>

            <DialogFooter>
              <Button
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
            </DialogFooter>

          </div>
        )}

      </DialogContent>
    </Dialog>
  )
}

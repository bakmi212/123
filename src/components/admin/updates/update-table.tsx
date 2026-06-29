'use client'

import { Eye, Pencil, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'

import { UpdateItem } from './types'

interface UpdateTableProps {
  updates: UpdateItem[]

  renderTypeBadge: (
    type: UpdateItem['type']
  ) => React.ReactNode

  renderStatusBadge: (
    status: UpdateItem['status']
  ) => React.ReactNode

  onView: (item: UpdateItem) => void
  onEdit: (item: UpdateItem) => void
  onDelete: (item: UpdateItem) => void
}

export function UpdateTable({
  updates,
  renderTypeBadge,
  renderStatusBadge,
  onView,
  onEdit,
  onDelete,
}: UpdateTableProps) {
  return (
    <div className="overflow-x-auto">

      {/* table dipindahkan step berikutnya */}

    </div>
  )
}

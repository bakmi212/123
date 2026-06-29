'use client'

import {
  Eye,
  Pencil,
  Trash2,
} from 'lucide-react'

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

      <table className="w-full">

        <thead>

          <tr className="border-b">

            <th className="px-4 py-3 text-left">
              Product
            </th>

            <th className="px-4 py-3 text-left">
              Version
            </th>

            <th className="px-4 py-3 text-left">
              Title
            </th>

            <th className="px-4 py-3 text-center">
              Type
            </th>

            <th className="px-4 py-3 text-center">
              Status
            </th>

            <th className="px-4 py-3 text-center">
              Published
            </th>

            <th className="px-4 py-3 text-center">
              Created
            </th>

            <th className="px-4 py-3 text-center">
              Action
            </th>

          </tr>

        </thead>

        <tbody>

          {updates.map((item) => (

            <tr
              key={item.id}
              className="border-b hover:bg-muted/50"
            >

              <td className="px-4 py-4">
                {item.products?.name ?? "-"}
              </td>

              <td className="px-4 py-4 font-medium">
                {item.version}
              </td>

              <td className="px-4 py-4">
                {item.title}
              </td>

              <td className="px-4 py-4 text-center">
                {renderTypeBadge(item.type)}
              </td>

              <td className="px-4 py-4 text-center">
                {renderStatusBadge(item.status)}
              </td>

              <td className="px-4 py-4 text-center">
                {item.published ? "Yes" : "No"}
              </td>

              <td className="px-4 py-4 text-center">
                {new Date(item.created_at).toLocaleDateString()}
              </td>

              <td className="px-4 py-4">

                <div className="flex justify-center gap-2">

                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => onView(item)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>

                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => onEdit(item)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>

                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={() => onDelete(item)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>

                </div>

              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>
  )
}

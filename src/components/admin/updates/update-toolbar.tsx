'use client'

import { Search, RefreshCw, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface UpdateToolbarProps {
  search: string
  onSearchChange: (value: string) => void
  onRefresh: () => void
}

export function UpdateToolbar({
  search,
  onSearchChange,
  onRefresh,
}: UpdateToolbarProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row">

      <div className="relative flex-1">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />

        <Input
          className="pl-10"
          placeholder="Search product, version, title..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <Button
        variant="outline"
        onClick={onRefresh}
      >
        <RefreshCw className="mr-2 h-4 w-4" />
        Refresh
      </Button>

    </div>
  )
}

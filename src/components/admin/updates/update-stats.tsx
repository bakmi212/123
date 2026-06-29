'use client'

import {
  Card,
  CardContent,
} from '@/components/ui/card'

interface UpdateStatsProps {
  total: number
  published: number
  draft: number

  latestApp: string
  latestVersion: string
}

export function UpdateStats({
  total,
  published,
  draft,
  latestApp,
  latestVersion,
}: UpdateStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-4">

      <Card>
        <CardContent className="pt-6">
          <div className="text-3xl font-bold">
            {total}
          </div>

          <p className="text-sm text-muted-foreground">
            Total Updates
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="text-3xl font-bold text-green-600">
            {published}
          </div>

          <p className="text-sm text-muted-foreground">
            Published
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="text-3xl font-bold text-yellow-500">
            {draft}
          </div>

          <p className="text-sm text-muted-foreground">
            Draft
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="text-xl font-bold text-blue-600">
            {latestApp}
          </div>
          
          <p className="mt-1 text-sm">
            {latestVersion}
          </p>
          
          <p className="text-xs text-muted-foreground">
            Latest App
          </p>
        </CardContent>
      </Card>

    </div>
  )
}

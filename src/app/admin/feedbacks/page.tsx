'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Loader2, Search } from 'lucide-react'

interface Feedback {

  id: string

  category: string

  title: string

  description: string

  license_key: string

  app_version: string

  status: string

  created_at: string

}

export default function FeedbackPage() {

  const supabase = createBrowserClient()

  const [loading, setLoading] = useState(true)

  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])

  const [search, setSearch] = useState('')

  async function fetchFeedbacks() {

    setLoading(true)

    const { data } = await supabase

      .from('feedbacks')

      .select('*')

      .order('created_at', {

        ascending: false,

      })

    setFeedbacks(data ?? [])

    setLoading(false)

  }

  useEffect(() => {

    fetchFeedbacks()

  }, [])

  const filtered = feedbacks.filter((item) =>

    item.title

      .toLowerCase()

      .includes(search.toLowerCase())

  )

  if (loading) {

    return (

      <div className="flex justify-center py-12">

        <Loader2 className="h-8 w-8 animate-spin"/>

      </div>

    )

  }

  return (

    <div className="space-y-6">

      <div className="flex items-center justify-between">

        <div>

          <h1 className="text-3xl font-bold">

            Feedback Manager

          </h1>

          <p className="text-muted-foreground">

            Manage user suggestions and bug reports.

          </p>

        </div>

      </div>

      <Card>

        <CardHeader>

          <CardTitle>

            All Feedback

          </CardTitle>

        </CardHeader>

        <CardContent>

          <div className="relative mb-5">

            <Search className="absolute left-3 top-3 h-4 w-4"/>

            <Input

              className="pl-10"

              placeholder="Search feedback..."

              value={search}

              onChange={(e)=>

                setSearch(e.target.value)

              }

            />

          </div>

          <div className="overflow-x-auto">

            <table className="w-full">

              <thead>

                <tr className="border-b">

                  <th className="px-4 py-3 text-left">

                    Category

                  </th>

                  <th className="px-4 py-3 text-left">

                    Title

                  </th>

                  <th className="px-4 py-3 text-left">

                    License

                  </th>

                  <th className="px-4 py-3 text-center">

                    Version

                  </th>

                  <th className="px-4 py-3 text-center">

                    Status

                  </th>

                  <th className="px-4 py-3 text-center">

                    Date

                  </th>

                </tr>

              </thead>

              <tbody>

                {filtered.map((item)=>(

                  <tr

                    key={item.id}

                    className="border-b hover:bg-muted/40"

                  >

                    <td className="px-4 py-4">

                      {item.category}

                    </td>

                    <td className="px-4 py-4">

                      {item.title}

                    </td>

                    <td className="px-4 py-4">

                      {item.license_key}

                    </td>

                    <td className="px-4 py-4 text-center">

                      {item.app_version}

                    </td>

                    <td className="px-4 py-4 text-center">

                      <Badge>

                        {item.status}

                      </Badge>

                    </td>

                    <td className="px-4 py-4 text-center">

                      {

                        new Date(

                          item.created_at

                        ).toLocaleDateString()

                      }

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        </CardContent>

      </Card>

    </div>

  )

}

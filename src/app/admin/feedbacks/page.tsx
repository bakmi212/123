'use client'

import { useEffect, useState } from 'react'

import {
  Loader2,
  Search,
  Eye,
} from 'lucide-react'

import { toast } from 'sonner'

import { createBrowserClient } from '@/lib/supabase/client'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

import { Badge } from '@/components/ui/badge'

import { Button } from '@/components/ui/button'

import { Input } from '@/components/ui/input'

import { Label } from '@/components/ui/label'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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

  const [saving, setSaving] = useState(false)

  const [feedbacks, setFeedbacks] =
    useState<Feedback[]>([])

  const [search, setSearch] =
    useState('')

  const [selectedFeedback, setSelectedFeedback] =
    useState<Feedback | null>(null)

  const [dialogOpen, setDialogOpen] =
    useState(false)

  const [status, setStatus] =
    useState('Open')

  useEffect(() => {

    fetchFeedbacks()

  }, [])

  async function fetchFeedbacks() {

    setLoading(true)

    const { data, error } = await supabase

      .from('feedbacks')

      .select('*')

      .order(

        'created_at',

        {

          ascending: false,

        }

      )

    if (error) {

      toast.error(error.message)

    }

    setFeedbacks(data ?? [])

    setLoading(false)

  }

  function openFeedback(

    feedback: Feedback

  ) {

    setSelectedFeedback(feedback)

    setStatus(feedback.status)

    setDialogOpen(true)

  }

  async function saveStatus() {

    if (!selectedFeedback)

      return

    setSaving(true)

    const { error } = await supabase

      .from('feedbacks')

      .update({

        status,

      })

      .eq(

        'id',

        selectedFeedback.id

      )

    if (error) {

      toast.error(error.message)

    }

    else {

      toast.success(

        'Status updated.'

      )

      await fetchFeedbacks()

      setDialogOpen(false)

    }

    setSaving(false)

  }

  const filteredFeedbacks =

    feedbacks.filter((item) => {

      const keyword =

        search.toLowerCase()

      return (

        item.title

          .toLowerCase()

          .includes(keyword)

        ||

        item.category

          .toLowerCase()

          .includes(keyword)

        ||

        item.license_key

          .toLowerCase()

          .includes(keyword)

      )

    })

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

            Manage suggestions, bug reports and feature requests.

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

          <div className="relative mb-6">

            <Search className="absolute left-3 top-3 h-4 w-4"/>

            <Input

              className="pl-10"

              placeholder="Search feedback..."

              value={search}

              onChange={(e)=>

                setSearch(

                  e.target.value

                )

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

                  <th className="px-4 py-3 text-center">

                    Action

                  </th>

                </tr>

              </thead>

              <tbody>

                {

                  filteredFeedbacks.length === 0

                  ?

                  (

                    <tr>

                      <td

                        colSpan={7}

                        className="py-12 text-center text-muted-foreground"

                      >

                        No feedback found.

                      </td>

                    </tr>

                  )

                  :

                  (

                    filteredFeedbacks.map((item) => (

                      <tr

                        key={item.id}

                        className="border-b hover:bg-muted/40"

                      >

                        <td className="px-4 py-4">

                          {item.category}

                        </td>

                        <td className="px-4 py-4 font-medium">

                          {item.title}

                        </td>

                        <td className="px-4 py-4">

                          {item.license_key}

                        </td>

                        <td className="px-4 py-4 text-center">

                          {item.app_version}

                        </td>

                        <td className="px-4 py-4 text-center">

                          <Badge

                            variant={

                              item.status === 'Closed'

                              ? 'default'

                              : item.status === 'In Progress'

                              ? 'secondary'

                              : 'outline'

                            }

                          >

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

                        <td className="px-4 py-4">

                          <div className="flex justify-center">

                            <Button

                              size="sm"

                              variant="outline"

                              onClick={() =>

                                openFeedback(item)

                              }

                            >

                              <Eye className="mr-1 h-3 w-3"/>

                              View

                            </Button>

                          </div>

                        </td>

                      </tr>

                    ))

                  )

                }

              </tbody>

            </table>

          </div>

        </CardContent>

      </Card>
            <Dialog

        open={dialogOpen}

        onOpenChange={setDialogOpen}

      >

        <DialogContent className="sm:max-w-xl">

          <DialogHeader>

            <DialogTitle>

              Feedback Detail

            </DialogTitle>

            <DialogDescription>

              Review user feedback and update its status.

            </DialogDescription>

          </DialogHeader>

          {

            selectedFeedback && (

              <div className="space-y-5">

                <div>

                  <Label>

                    Title

                  </Label>

                  <p className="mt-1">

                    {selectedFeedback.title}

                  </p>

                </div>

                <div>

                  <Label>

                    Category

                  </Label>

                  <p className="mt-1">

                    {selectedFeedback.category}

                  </p>

                </div>

                <div>

                  <Label>

                    License Key

                  </Label>

                  <p className="mt-1">

                    {selectedFeedback.license_key}

                  </p>

                </div>

                <div>

                  <Label>

                    App Version

                  </Label>

                  <p className="mt-1">

                    {selectedFeedback.app_version}

                  </p>

                </div>

                <div>

                  <Label>

                    Description

                  </Label>

                  <div className="mt-2 rounded-lg border p-4 whitespace-pre-wrap text-sm">

                    {selectedFeedback.description}

                  </div>

                </div>

                <div>

                  <Label>

                    Status

                  </Label>

                  <Select

                    value={status}

                    onValueChange={setStatus}

                  >

                    <SelectTrigger className="mt-2">

                      <SelectValue />

                    </SelectTrigger>

                    <SelectContent>

                      <SelectItem value="Open">

                        Open

                      </SelectItem>

                      <SelectItem value="In Progress">

                        In Progress

                      </SelectItem>

                      <SelectItem value="Closed">

                        Closed

                      </SelectItem>

                    </SelectContent>

                  </Select>

                </div>

              </div>

            )

          }

          <DialogFooter>

            <Button

              variant="outline"

              onClick={() =>

                setDialogOpen(false)

              }

            >

              Close

            </Button>

            <Button

              disabled={saving}

              onClick={saveStatus}

            >

              {

                saving && (

                  <Loader2 className="mr-2 h-4 w-4 animate-spin"/>

                )

              }

              Save Status

            </Button>

          </DialogFooter>

        </DialogContent>

      </Dialog>

    </div>

  )

}

'use client'

import { useEffect, useState } from 'react'

import {
  Loader2,
  Search,
  Eye,
  Trash2,
  MessageSquare,
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

import { Select } from '@/components/ui/select'

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

  const [deleting, setDeleting] = useState(false)

  const [feedbacks, setFeedbacks] =
    useState<Feedback[]>([])

  const [search, setSearch] =
    useState('')

  const [categoryFilter, setCategoryFilter] =
    useState('All')

  const [selectedFeedback, setSelectedFeedback] =
    useState<Feedback | null>(null)

  const [dialogOpen, setDialogOpen] =
    useState(false)

  const [deleteDialogOpen, setDeleteDialogOpen] =
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
    item: Feedback
  ) {

    setSelectedFeedback(item)

    setStatus(item.status)

    setDialogOpen(true)

  }

  function openDelete(
    item: Feedback
  ) {

    setSelectedFeedback(item)

    setDeleteDialogOpen(true)

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

  async function deleteFeedback() {

    if (!selectedFeedback)
      return

    setDeleting(true)

    const { error } = await supabase

      .from('feedbacks')

      .delete()

      .eq(
        'id',
        selectedFeedback.id
      )

    if (error) {

      toast.error(error.message)

    }

    else {

      toast.success(
        'Feedback deleted.'
      )

      await fetchFeedbacks()

      setDeleteDialogOpen(false)

      setSelectedFeedback(null)

    }

    setDeleting(false)

  }
    const filteredFeedbacks =

    feedbacks.filter((item) => {

      const keyword =

        search.toLowerCase()

      const matchSearch =

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

      const matchCategory =

        categoryFilter === 'All'

        ||

        item.category === categoryFilter

      return (

        matchSearch

        &&

        matchCategory

      )

    })

  const total =

    feedbacks.length

  const openCount =

    feedbacks.filter(

      f =>

      f.status === 'Open'

    ).length

  const progressCount =

    feedbacks.filter(

      f =>

      f.status === 'In Progress'

    ).length

  const closedCount =

    feedbacks.filter(

      f =>

      f.status === 'Closed'

    ).length

  if (loading) {

    return (

      <div className="flex justify-center py-12">

        <Loader2 className="h-8 w-8 animate-spin"/>

      </div>

    )

  }

  return (

    <div className="space-y-6">

      <div>

        <h1 className="text-3xl font-bold">

          Feedback Manager

        </h1>

        <p className="text-muted-foreground">

          Manage user suggestions, bug reports and feature requests.

        </p>

      </div>

      <div className="grid gap-4 md:grid-cols-4">

        <Card>

          <CardContent className="pt-6">

            <div className="text-2xl font-bold">

              {total}

            </div>

            <p className="text-sm text-muted-foreground">

              Total Feedback

            </p>

          </CardContent>

        </Card>

        <Card>

          <CardContent className="pt-6">

            <div className="text-2xl font-bold text-blue-600">

              {openCount}

            </div>

            <p className="text-sm text-muted-foreground">

              Open

            </p>

          </CardContent>

        </Card>

        <Card>

          <CardContent className="pt-6">

            <div className="text-2xl font-bold text-yellow-600">

              {progressCount}

            </div>

            <p className="text-sm text-muted-foreground">

              In Progress

            </p>

          </CardContent>

        </Card>

        <Card>

          <CardContent className="pt-6">

            <div className="text-2xl font-bold text-green-600">

              {closedCount}

            </div>

            <p className="text-sm text-muted-foreground">

              Closed

            </p>

          </CardContent>

        </Card>

      </div>

      <Card>

        <CardHeader>

          <CardTitle>

            All Feedback

          </CardTitle>

        </CardHeader>

        <CardContent>

          <div className="mb-6 flex flex-col gap-4 md:flex-row">

            <div className="relative flex-1">

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

            <Select

              <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="All">All Categories</option>
                <option value="Suggestion">Suggestion</option>
                <option value="Bug">Bug</option>
                <option value="Feature Request">Feature Request</option>
                <option value="Other">Other</option>
              </Select>

              <SelectTrigger className="w-full md:w-56">

                <SelectValue/>

              </SelectTrigger>

              <SelectContent>

                <SelectItem value="All">

                  All Categories

                </SelectItem>

                <SelectItem value="Suggestion">

                  Suggestion

                </SelectItem>

                <SelectItem value="Bug">

                  Bug

                </SelectItem>

                <SelectItem value="Feature Request">

                  Feature Request

                </SelectItem>

                <SelectItem value="Other">

                  Other

                </SelectItem>

              </SelectContent>

            </Select>

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

                        className="py-12"

                      >

                        <div className="flex flex-col items-center justify-center text-center">

                          <MessageSquare className="mb-3 h-12 w-12 text-muted-foreground"/>

                          <h3 className="font-semibold">

                            No Feedback Found

                          </h3>

                          <p className="text-sm text-muted-foreground">

                            There are no feedback matching your search.

                          </p>

                        </div>

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

                          {

                            item.status === 'Open'

                            ?

                            (

                              <Badge className="bg-blue-600 hover:bg-blue-600">

                                Open

                              </Badge>

                            )

                            :

                            item.status === 'In Progress'

                            ?

                            (

                              <Badge className="bg-yellow-500 hover:bg-yellow-500">

                                In Progress

                              </Badge>

                            )

                            :

                            (

                              <Badge className="bg-green-600 hover:bg-green-600">

                                Closed

                              </Badge>

                            )

                          }

                        </td>

                        <td className="px-4 py-4 text-center">

                          {

                            new Date(

                              item.created_at

                            ).toLocaleDateString()

                          }

                        </td>

                        <td className="px-4 py-4">

                          <div className="flex justify-center gap-2">

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

                            <Button

                              size="sm"

                              variant="destructive"

                              onClick={() =>

                                openDelete(item)

                              }

                            >

                              <Trash2 className="mr-1 h-3 w-3"/>

                              Delete

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

                  <p className="mt-1 font-medium">

                    {selectedFeedback.title}

                  </p>

                </div>

                <div className="grid grid-cols-2 gap-4">

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

                      App Version

                    </Label>

                    <p className="mt-1">

                      {selectedFeedback.app_version}

                    </p>

                  </div>

                </div>

                <div>

                  <Label>

                    License Key

                  </Label>

                  <p className="mt-1 break-all">

                    {selectedFeedback.license_key}

                  </p>

                </div>

                <div>

                  <Label>

                    Description

                  </Label>

                  <div className="mt-2 rounded-lg border bg-muted/30 p-4 whitespace-pre-wrap text-sm">

                    {selectedFeedback.description}

                  </div>

                </div>

                <div>

                  <Label>

                    Status

                  </Label>

                  <Select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Closed">Closed</option>
                  </Select>

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
            <Dialog

        open={deleteDialogOpen}

        onOpenChange={setDeleteDialogOpen}

      >

        <DialogContent>

          <DialogHeader>

            <DialogTitle>

              Delete Feedback

            </DialogTitle>

            <DialogDescription>

              This action cannot be undone.

            </DialogDescription>

          </DialogHeader>

          {

            selectedFeedback && (

              <div className="rounded-lg border bg-muted/30 p-4">

                <p className="font-semibold">

                  {selectedFeedback.title}

                </p>

                <p className="mt-2 text-sm text-muted-foreground">

                  {selectedFeedback.category}

                </p>

                <p className="mt-1 text-sm text-muted-foreground break-all">

                  {selectedFeedback.license_key}

                </p>

              </div>

            )

          }

          <DialogFooter>

            <Button

              variant="outline"

              onClick={() => {

                setDeleteDialogOpen(false)

                setSelectedFeedback(null)

              }}

            >

              Cancel

            </Button>

            <Button

              variant="destructive"

              disabled={deleting}

              onClick={deleteFeedback}

            >

              {

                deleting && (

                  <Loader2 className="mr-2 h-4 w-4 animate-spin"/>

                )

              }

              Delete Feedback

            </Button>

          </DialogFooter>

        </DialogContent>

      </Dialog>
          </div>

  )

}

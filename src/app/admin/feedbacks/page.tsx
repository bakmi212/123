'use client'

import { useEffect, useMemo, useState } from 'react'

import { createBrowserClient } from '@/lib/supabase/client'

import { toast } from 'sonner'

import {
  Loader2,
  Search,
} from 'lucide-react'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

import {
  Button,
} from '@/components/ui/button'

import {
  Badge,
} from '@/components/ui/badge'

import {
  Input,
} from '@/components/ui/input'

import {
  Label,
} from '@/components/ui/label'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Feedback {

  id: string

  app_id: string
  app_name: string

  category: string

  message: string

  name: string
  email: string

  license_key: string

  app_version: string

  is_read: boolean

  created_at: string

}

export default function FeedbackPage() {

  const supabase = createBrowserClient()

  const [loading, setLoading] = useState(true)

  const [deleting, setDeleting] = useState(false)

  const [feedbacks, setFeedbacks] =
    useState<Feedback[]>([])

  const [search, setSearch] =
    useState('')

  const [appFilter, setAppFilter] =
    useState('All Apps')

  const [dialogOpen, setDialogOpen] =
    useState(false)

  const [selectedFeedback, setSelectedFeedback] =
    useState<Feedback | null>(null)

  useEffect(() => {

    fetchFeedbacks()

  }, [])

  async function fetchFeedbacks() {

    setLoading(true)

    const { data, error } = await supabase
      .from('feedbacks')
      .select('*')
      .order('created_at', { ascending: false })
    
    console.log('ERROR', error)
    console.log('DATA', data)
    
    if (error) {
      toast.error(error.message)
    } else {
      setFeedbacks(data ?? [])
    }

    setLoading(false)

  }

  async function markAsRead(id: string) {

    const { error } = await supabase
  
      .from('feedbacks')
  
      .update({
  
        is_read: true,
  
      })
  
      .eq('id', id)
  
    if (!error) {
  
      setFeedbacks((prev) =>
  
        prev.map((item) =>
  
          item.id === id
  
            ? {
  
                ...item,
  
                is_read: true,
  
              }
  
            : item
  
        )
  
      )
  
      setSelectedFeedback((prev) =>
  
        prev && prev.id === id
  
          ? {
  
              ...prev,
  
              is_read: true,
  
            }
  
          : prev
  
      )
  
    }
  
  }

  async function openFeedback(item: Feedback) {

    setSelectedFeedback(item)

    setDialogOpen(true)

    if (!item.is_read) {

      await markAsRead(item.id)

    }

  }

  async function deleteFeedback() {

    if (!selectedFeedback) return

    setDeleting(true)

    const { error } = await supabase

      .from('feedbacks')

      .delete()

      .eq('id', selectedFeedback.id)

    if (error) {

      toast.error(error.message)

    } else {

      toast.success('Feedback deleted.')

      setDialogOpen(false)

      setSelectedFeedback(null)

      fetchFeedbacks()

    }

    setDeleting(false)

  }

  const appOptions = useMemo(() => {

    return [

      'All Apps',

      ...new Set(

        feedbacks.map(

          (item) => item.app_name

        )

      ),

    ]

  }, [feedbacks])

  const filteredFeedbacks = feedbacks.filter(

    (item) => {

      const keyword =

        search.toLowerCase()

      const matchSearch =

        item.message

          .toLowerCase()

          .includes(keyword)

        ||

        item.category

          .toLowerCase()

          .includes(keyword)

        ||

        item.app_name

          .toLowerCase()

          .includes(keyword)

      const matchApp =

        appFilter === 'All Apps'

        ||

        item.app_name === appFilter

      return (

        matchSearch &&

        matchApp

      )

    }

  )

  if (loading) {

    return (

      <div className="flex justify-center py-20">

        <Loader2 className="h-8 w-8 animate-spin" />

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
    
        Manage user feedback from all applications.
    
      </p>
    
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
    
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
    
            <Input
    
              className="pl-10"
    
              placeholder="Search feedback..."
    
              value={search}
    
              onChange={(e) =>
    
                setSearch(
    
                  e.target.value
    
                )
    
              }
    
            />
    
          </div>
    
          <select
    
            value={appFilter}
    
            onChange={(e) =>
    
              setAppFilter(
    
                e.target.value
    
              )
    
            }
    
            className="h-10 rounded-md border bg-background px-3 md:w-60"
    
          >
    
            {appOptions.map((app) => (
    
              <option
    
                key={app}
    
                value={app}
    
              >
    
                {app}
    
              </option>
    
            ))}
    
          </select>
    
        </div>
    
        <div className="overflow-x-auto">
    
          <table className="w-full">
    
            <thead>
    
              <tr className="border-b">
    
                <th className="px-4 py-3 text-left">
    
                  App
    
                </th>
    
                <th className="px-4 py-3 text-left">
    
                  Type
    
                </th>
    
                <th className="px-4 py-3 text-center">
    
                  Read
    
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
    
              {filteredFeedbacks.length === 0 ? (
    
                <tr>
    
                  <td
    
                    colSpan={5}
    
                    className="py-16 text-center text-muted-foreground"
    
                  >
    
                    No feedback found.
    
                  </td>
    
                </tr>
    
              ) : (
    
                filteredFeedbacks.map((item) => (
    
                  <tr
    
                    key={item.id}
    
                    className="border-b hover:bg-muted/40"
    
                  >
    
                    <td className="px-4 py-4 font-medium">
    
                      {item.app_name}
    
                    </td>
    
                    <td className="px-4 py-4">
    
                      {item.category}
    
                    </td>
    
                    <td className="px-4 py-4 text-center">
    
                      <Badge
    
                        className={
    
                          item.is_read
    
                            ? 'bg-green-600'
    
                            : 'bg-red-600'
    
                        }
    
                      >
    
                        {
    
                          item.is_read
    
                            ? 'Read'
    
                            : 'Unread'
    
                        }
    
                      </Badge>
    
                    </td>
    
                    <td className="px-4 py-4 text-center">
    
                      {
    
                        new Date(
    
                          item.created_at
    
                        ).toLocaleDateString()
    
                      }
    
                    </td>
    
                    <td className="px-4 py-4 text-center">
    
                      <Button
    
                        size="sm"
    
                        variant="outline"
    
                        onClick={() =>
    
                          openFeedback(item)
    
                        }
    
                      >
    
                        View
    
                      </Button>
    
                    </td>
    
                  </tr>
    
                ))
    
              )}
    
            </tbody>
    
          </table>
    
        </div>
    
      </CardContent>
    
    </Card>
    <Dialog

      open={dialogOpen}
    
      onOpenChange={setDialogOpen}
    
    >
    
      <DialogContent className="sm:max-w-2xl">
    
        <DialogHeader>
    
          <DialogTitle>
    
            Feedback Detail
    
          </DialogTitle>
    
          <DialogDescription>
    
            Review user feedback.
    
          </DialogDescription>
    
        </DialogHeader>
    
        {selectedFeedback && (
    
          <div className="space-y-5">
    
            <div className="grid grid-cols-2 gap-4">
    
              <div>
    
                <Label>
    
                  Application
    
                </Label>
    
                <p className="mt-1">
    
                  {selectedFeedback.app_name}
    
                </p>
    
              </div>
    
              <div>
    
                <Label>
    
                  Type
    
                </Label>
    
                <p className="mt-1">
    
                  {selectedFeedback.category}
    
                </p>
    
              </div>
    
            </div>
    
            <div className="grid grid-cols-2 gap-4">
    
              <div>
    
                <Label>
    
                  Version
    
                </Label>
    
                <p className="mt-1">
    
                  {selectedFeedback.app_version}
    
                </p>
    
              </div>
    
              <div>
    
                <Label>
    
                  Date
    
                </Label>
    
                <p className="mt-1">
    
                  {
    
                    new Date(
    
                      selectedFeedback.created_at
    
                    ).toLocaleString()
    
                  }
    
                </p>
    
              </div>
    
            </div>
    
            <div>
    
              <Label>
    
                License
    
              </Label>
    
              <p className="mt-1 break-all">
    
                {selectedFeedback.license_key}
    
              </p>
    
            </div>
    
            <div className="grid grid-cols-2 gap-4">
    
              <div>
    
                <Label>
    
                  Name
    
                </Label>
    
                <p className="mt-1">
    
                  {selectedFeedback.name || '-'}
    
                </p>
    
              </div>
    
              <div>
    
                <Label>
    
                  Email
    
                </Label>
    
                <p className="mt-1 break-all">
    
                  {selectedFeedback.email || '-'}
    
                </p>
    
              </div>
    
            </div>
    
            <div>
    
              <Label>
    
                Message
    
              </Label>
    
              <div className="mt-2 rounded-lg border p-4 whitespace-pre-wrap">
    
                {selectedFeedback.message}
    
              </div>
    
            </div>
    
          </div>
    
        )}
    
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
    
            variant="destructive"
    
            disabled={deleting}
    
            onClick={deleteFeedback}
    
          >
    
            {deleting && (
    
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
    
            )}
    
            Delete
    
          </Button>
    
        </DialogFooter>
    
      </DialogContent>
    
    </Dialog>
        </div>

    )
  
  }

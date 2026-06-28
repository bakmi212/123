'use client'

import { useEffect, useState } from 'react'

import { createBrowserClient } from '@/lib/supabase/client'

import { toast } from 'sonner'

import {

  Loader2,

  Search,

  Plus,

  Pencil,

  Trash2,

  Download,

} from 'lucide-react'

import {

  Card,

  CardContent,

  CardHeader,

  CardTitle,

} from '@/components/ui/card'

import { Button } from '@/components/ui/button'

import { Input } from '@/components/ui/input'

import { Label } from '@/components/ui/label'

import { Badge } from '@/components/ui/badge'

import { Select } from '@/components/ui/select'

import {

  Dialog,

  DialogContent,

  DialogDescription,

  DialogFooter,

  DialogHeader,

  DialogTitle,

} from '@/components/ui/dialog'

interface AppUpdate {

  id: string

  version: string

  minimum_version: string

  download_url: string

  changelog: string

  force_update: boolean

  published: boolean

  created_at: string

}

const defaultForm = {

  version: '',

  minimum_version: '',

  download_url: '',

  changelog: '',

  force_update: false,

  published: true,

}

export default function UpdatesPage() {

  const supabase = createBrowserClient()

  const [loading, setLoading] = useState(true)

  const [saving, setSaving] = useState(false)

  const [updates, setUpdates] =

    useState<AppUpdate[]>([])

  const [search, setSearch] =

    useState('')

  const [selected, setSelected] =

    useState<AppUpdate | null>(null)

  const [form, setForm] =

    useState(defaultForm)

  const [addOpen, setAddOpen] =

    useState(false)

  const [editOpen, setEditOpen] =

    useState(false)

  const [deleteOpen, setDeleteOpen] =

    useState(false)

  useEffect(() => {

    fetchUpdates()

  }, [])

  async function fetchUpdates() {

    setLoading(true)

    const { data, error } = await supabase

      .from('app_updates')

      .select('*')

      .order('created_at', {

        ascending: false,

      })

    if (error) {

      toast.error(error.message)

    }

    setUpdates(data ?? [])

    setLoading(false)

  }

  function resetForm() {

    setForm(defaultForm)

    setSelected(null)

  }

  function openAdd() {

    resetForm()

    setAddOpen(true)

  }

  function openEdit(item: AppUpdate) {

    setSelected(item)

    setForm({

      version: item.version,

      minimum_version: item.minimum_version,

      download_url: item.download_url,

      changelog: item.changelog,

      force_update: item.force_update,

      published: item.published,

    })

    setEditOpen(true)

  }

  function openDelete(item: AppUpdate) {

    setSelected(item)

    setDeleteOpen(true)

  }

  const filtered =

    updates.filter((item) =>

      item.version

        .toLowerCase()

        .includes(

          search.toLowerCase()

        )

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

            App Updates

          </h1>

          <p className="text-muted-foreground">

            Manage desktop application releases.

          </p>

        </div>

        <Button onClick={openAdd}>

          <Plus className="mr-2 h-4 w-4"/>

          Add Update

        </Button>

      </div>

      <div className="grid gap-4 md:grid-cols-4">

        <Card>

          <CardContent className="pt-6">

            <div className="text-2xl font-bold">

              {updates.length}

            </div>

            <p className="text-sm text-muted-foreground">

              Total Releases

            </p>

          </CardContent>

        </Card>

        <Card>

          <CardContent className="pt-6">

            <div className="text-2xl font-bold">

              {

                updates.find(

                  x => x.published

                )?.version ?? '-'

              }

            </div>

            <p className="text-sm text-muted-foreground">

              Latest Version

            </p>

          </CardContent>

        </Card>

        <Card>

          <CardContent className="pt-6">

            <div className="text-2xl font-bold">

              {

                updates.filter(

                  x => x.force_update

                ).length

              }

            </div>

            <p className="text-sm text-muted-foreground">

              Force Update

            </p>

          </CardContent>

        </Card>

        <Card>

          <CardContent className="pt-6">

            <div className="text-2xl font-bold">

              {

                updates.filter(

                  x => x.published

                ).length

              }

            </div>

            <p className="text-sm text-muted-foreground">

              Published

            </p>

          </CardContent>

        </Card>

      </div>

      <Card>

        <CardHeader>

          <CardTitle>

            Releases

          </CardTitle>

        </CardHeader>

        <CardContent>

          <div className="relative mb-6">

            <Search className="absolute left-3 top-3 h-4 w-4"/>

            <Input

              className="pl-10"

              placeholder="Search version..."

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

                    Version

                  </th>

                  <th className="px-4 py-3 text-center">

                    Minimum

                  </th>

                  <th className="px-4 py-3 text-center">

                    Force

                  </th>

                  <th className="px-4 py-3 text-center">

                    Published

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

                  filtered.length === 0

                  ?

                  (

                    <tr>

                      <td

                        colSpan={6}

                        className="py-12 text-center text-muted-foreground"

                      >

                        No releases found.

                      </td>

                    </tr>

                  )

                  :

                  (

                    filtered.map((item)=>(

                      <tr

                        key={item.id}

                        className="border-b hover:bg-muted/40"

                      >

                        <td className="px-4 py-4 font-medium">

                          {item.version}

                        </td>

                        <td className="px-4 py-4 text-center">

                          {item.minimum_version}

                        </td>

                        <td className="px-4 py-4 text-center">

                          {

                            item.force_update

                            ?

                            <Badge>

                              Yes

                            </Badge>

                            :

                            <Badge variant="outline">

                              No

                            </Badge>

                          }

                        </td>

                        <td className="px-4 py-4 text-center">

                          {

                            item.published

                            ?

                            <Badge>

                              Published

                            </Badge>

                            :

                            <Badge variant="outline">

                              Draft

                            </Badge>

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

                              onClick={()=>

                                openEdit(item)

                              }

                            >

                              <Pencil className="mr-1 h-3 w-3"/>

                              Edit

                            </Button>

                            <Button

                              size="sm"

                              variant="destructive"

                              onClick={()=>

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
      async function createUpdate() {
  if (!form.version.trim()) {
    toast.error('Version is required.')
    return
  }

  if (!form.title.trim()) {
    toast.error('Title is required.')
    return
  }

  if (!form.description.trim()) {
    toast.error('Description is required.')
    return
  }

  setSaving(true)

  const { error } = await supabase
    .from('updates')
    .insert({
      version: form.version,
      title: form.title,
      description: form.description,
      type: form.type,
      status: form.status,
      published: form.published,
    })

  setSaving(false)

  if (error) {
    toast.error(error.message)
    return
  }

  toast.success('Update created.')

  setCreateDialog(false)

  resetForm()

  fetchUpdates()
}

async function updateUpdate() {
  if (!selected) return

  if (!form.version.trim()) {
    toast.error('Version is required.')
    return
  }

  if (!form.title.trim()) {
    toast.error('Title is required.')
    return
  }

  if (!form.description.trim()) {
    toast.error('Description is required.')
    return
  }

  setSaving(true)

  const { error } = await supabase
    .from('updates')
    .update({
      version: form.version,
      title: form.title,
      description: form.description,
      type: form.type,
      status: form.status,
      published: form.published,
    })
    .eq('id', selected.id)

  setSaving(false)

  if (error) {
    toast.error(error.message)
    return
  }

  toast.success('Update updated.')

  setEditDialog(false)

  resetForm()

  fetchUpdates()
}
async function deleteUpdate() {

  if (!selected) return

  setDeleting(true)

  const { error } = await supabase

    .from('updates')

    .delete()

    .eq('id', selected.id)

  setDeleting(false)

  if (error) {

    toast.error(error.message)

    return

  }

  toast.success('Update deleted.')

  setDeleteDialog(false)

  resetForm()

  fetchUpdates()

}
<Dialog
  open={viewDialog}
  onOpenChange={setViewDialog}
>

  <DialogContent className="sm:max-w-2xl">

    <DialogHeader>

      <DialogTitle>

        Update Detail

      </DialogTitle>

      <DialogDescription>

        View changelog information.

      </DialogDescription>

    </DialogHeader>

    {selected && (

      <div className="space-y-6">

        <div>

          <Label>Version</Label>

          <p className="mt-2 font-semibold">

            {selected.version}

          </p>

        </div>

        <div>

          <Label>Title</Label>

          <p className="mt-2 font-semibold">

            {selected.title}

          </p>

        </div>

        <div className="grid grid-cols-2 gap-5">

          <div>

            <Label>Type</Label>

            <div className="mt-2">

              <Badge>

                {selected.type}

              </Badge>

            </div>

          </div>

          <div>

            <Label>Status</Label>

            <div className="mt-2">

              <Badge
                className={
                  selected.status === 'Published'
                    ? 'bg-green-600'
                    : 'bg-yellow-500'
                }
              >

                {selected.status}

              </Badge>

            </div>

          </div>

        </div>

        <div>

          <Label>Description</Label>

          <div className="mt-2 rounded-lg border p-4 whitespace-pre-wrap">

            {selected.description}

          </div>

        </div>

        <div className="grid grid-cols-2 gap-5">

          <div>

            <Label>Published</Label>

            <p className="mt-2">

              {selected.published ? 'Yes' : 'No'}

            </p>

          </div>

          <div>

            <Label>Created</Label>

            <p className="mt-2">

              {new Date(
                selected.created_at
              ).toLocaleString()}

            </p>

          </div>

        </div>

      </div>

    )}

    <DialogFooter>

      <Button
        variant="outline"
        onClick={() => setViewDialog(false)}
      >

        Close

      </Button>

      {selected && (

        <Button
          onClick={() => {

            setViewDialog(false)

            openEdit(selected)

          }}
        >

          <Pencil className="mr-2 h-4 w-4" />

          Edit

        </Button>

      )}

    </DialogFooter>

  </DialogContent>

</Dialog>
<Dialog
  open={deleteDialog}
  onOpenChange={setDeleteDialog}
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

    {selected && (

      <div className="rounded-lg border bg-muted/40 p-4 space-y-3">

        <div>

          <p className="font-semibold">

            {selected.version}

          </p>

          <p className="text-muted-foreground">

            {selected.title}

          </p>

        </div>

        <Badge>

          {selected.type}

        </Badge>

      </div>

    )}

    <DialogFooter>

      <Button
        variant="outline"
        onClick={() => {

          setDeleteDialog(false)

          resetForm()

        }}
      >

        Cancel

      </Button>

      <Button
        variant="destructive"
        disabled={deleting}
        onClick={deleteUpdate}
      >

        {deleting && (

          <Loader2 className="mr-2 h-4 w-4 animate-spin" />

        )}

        Delete

      </Button>

    </DialogFooter>

  </DialogContent>

</Dialog>


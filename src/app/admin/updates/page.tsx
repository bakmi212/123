
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { createBrowserClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Search,
  RefreshCw,
  Rocket,
} from 'lucide-react'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

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

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

interface Product {
  id: string
  name: string
  slug: string
}

interface UpdateItem {
  id: string

  product_id: string

  products: Product | null

  version: string
  title: string
  description: string

  type:
    | 'Feature'
    | 'Improvement'
    | 'Bug Fix'
    | 'Security'

  status:
    | 'Draft'
    | 'Published'

  published: boolean

  created_at: string
  updated_at: string
}

const formSchema = z.object({
  product_id: z.string().uuid("Product is required"),

  version: z.string().min(1, "Version is required"),
  title: z.string().min(3, "Title is required"),
  description: z.string().min(10, "Description is required"),

  type: z.enum([
    "Feature",
    "Improvement",
    "Bug Fix",
    "Security",
  ]),

  status: z.enum([
    "Draft",
    "Published",
  ]),

  published: z.boolean(),
})

type FormValues = z.infer<typeof formSchema>

export default function UpdatesPage() {

  const supabase = useMemo(
    () => createBrowserClient(),
    []
  )

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [updates, setUpdates] =
    useState<UpdateItem[]>([])

  const [selected, setSelected] =
    useState<UpdateItem | null>(null)

  const [search, setSearch] =
    useState('')

  const [createOpen, setCreateOpen] =
    useState(false)

  const [editOpen, setEditOpen] =
    useState(false)

  const [viewOpen, setViewOpen] =
    useState(false)

  const [deleteOpen, setDeleteOpen] =
    useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  
    defaultValues: {
      product_id: "",
  
      version: "",
      title: "",
      description: "",
  
      type: "Feature",
      status: "Draft",
      published: false,
    },
  })

  const resetForm = () => {

    form.reset({
      product_id: "",
    
      version: '',
      title: '',
      description: '',
      type: 'Feature',
      status: 'Draft',
      published: false,
    })

    setSelected(null)

  }

  const fetchUpdates = useCallback(async () => {

    setLoading(true)

    const { data, error } = await supabase

      .from("updates")
      .select(`
        *,
        products (
          id,
          name,
          slug
        )
      `)

      .order('created_at', {
        ascending: false,
      })

    if (error) {

      toast.error(error.message)

      setLoading(false)

      return

    }

    setUpdates(data ?? [])

    setLoading(false)

  }, [supabase])

  useEffect(() => {

    fetchUpdates()

    const channel = supabase

      .channel('updates-admin')

      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'updates',
        },
        () => {

          fetchUpdates()

        }
      )

      .subscribe()

    return () => {

      supabase.removeChannel(channel)

    }

  }, [fetchUpdates, supabase])

  const filteredUpdates = updates.filter((item) => {
    const keyword = search.toLowerCase()
  
    return (
      item.products?.name
        ?.toLowerCase()
        .includes(keyword) ||
  
      item.version
        .toLowerCase()
        .includes(keyword) ||
  
      item.title
        .toLowerCase()
        .includes(keyword) ||
  
      item.description
        .toLowerCase()
        .includes(keyword)
    )
  })

  const totalUpdates = updates.length

  const publishedUpdates = updates.filter(

    (item) => item.published

  ).length

  const draftUpdates = updates.filter(

    (item) => !item.published

  ).length

  const latestVersion =

    updates.length > 0

      ? updates[0].version

      : '-'

  function renderTypeBadge(

    type: UpdateItem['type']

  ) {

    switch (type) {

      case 'Feature':

        return (

          <Badge>

            🚀 Feature

          </Badge>

        )

      case 'Improvement':

        return (

          <Badge variant="secondary">

            ⚡ Improvement

          </Badge>

        )

      case 'Bug Fix':

        return (

          <Badge className="bg-orange-500">

            🐞 Bug Fix

          </Badge>

        )

      case 'Security':

        return (

          <Badge className="bg-red-600">

            🔒 Security

          </Badge>

        )

    }

  }

  function renderStatusBadge(

    status: UpdateItem['status']

  ) {

    return status === 'Published'

      ? (

        <Badge className="bg-green-600">

          Published

        </Badge>

      )

      : (

        <Badge className="bg-yellow-500">

          Draft

        </Badge>

      )

  }

  function openCreate() {

    resetForm()

    setCreateOpen(true)

  }

  function openEdit(item: UpdateItem) {

    setSelected(item)

    form.reset({
      product_id: item.product_id,
    
      version: item.version,
      title: item.title,
      description: item.description,
      type: item.type,
      status: item.status,
      published: item.published,
    })

    setEditOpen(true)

  }

  function openView(item: UpdateItem) {

    setSelected(item)

    setViewOpen(true)

  }

  function openDelete(item: UpdateItem) {

    setSelected(item)

    setDeleteOpen(true)

  }

  async function onCreate(values: FormValues) {

    setSaving(true)

    const { error } = await supabase

      .from('updates')

      .insert({
        product_id: values.product_id,
      
        version: values.version,
        title: values.title,
        description: values.description,
        type: values.type,
        status: values.status,
        published: values.published,
      })

    setSaving(false)

    if (error) {

      toast.error(error.message)

      return

    }

    toast.success('Update created successfully.')

    setCreateOpen(false)

    resetForm()

    await fetchUpdates()

  }

  async function onUpdate(values: FormValues) {

    if (!selected) return

    setSaving(true)

    const { error } = await supabase

      .from('updates')

      .update({
        product_id: values.product_id,
      
        version: values.version,
        title: values.title,
        description: values.description,
        type: values.type,
        status: values.status,
        published: values.published,
      
        updated_at: new Date().toISOString(),
      })

      .eq('id', selected.id)

    setSaving(false)

    if (error) {

      toast.error(error.message)

      return

    }

    toast.success('Update updated successfully.')

    setEditOpen(false)

    resetForm()

    await fetchUpdates()

  }

  async function onDelete() {

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

    toast.success('Update deleted successfully.')

    setDeleteOpen(false)

    resetForm()

    await fetchUpdates()

  }

  if (loading) {

    return (

      <div className="flex justify-center py-20">

        <Loader2 className="h-8 w-8 animate-spin" />

      </div>

    )

  }

  return (

    <div className="space-y-6">

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

        <div>

          <h1 className="text-3xl font-bold">

            Updates Manager

          </h1>

          <p className="text-muted-foreground">

            Manage application changelog and releases.

          </p>

        </div>

        <Button onClick={openCreate}>

          <Plus className="mr-2 h-4 w-4" />

          New Update

        </Button>

      </div>

      <div className="grid gap-4 md:grid-cols-4">

        <Card>

          <CardContent className="pt-6">

            <div className="text-3xl font-bold">

              {totalUpdates}

            </div>

            <p className="text-sm text-muted-foreground">

              Total Updates

            </p>

          </CardContent>

        </Card>

        <Card>

          <CardContent className="pt-6">

            <div className="text-3xl font-bold text-green-600">

              {publishedUpdates}

            </div>

            <p className="text-sm text-muted-foreground">

              Published

            </p>

          </CardContent>

        </Card>

        <Card>

          <CardContent className="pt-6">

            <div className="text-3xl font-bold text-yellow-500">

              {draftUpdates}

            </div>

            <p className="text-sm text-muted-foreground">

              Draft

            </p>

          </CardContent>

        </Card>

        <Card>

          <CardContent className="pt-6">

            <div className="text-3xl font-bold text-blue-600">

              {latestVersion}

            </div>

            <p className="text-sm text-muted-foreground">

              Latest Version

            </p>

          </CardContent>

        </Card>

      </div>
      <Card>

        <CardHeader>

          <CardTitle>

            Application Updates

          </CardTitle>

        </CardHeader>

        <CardContent>

          <div className="mb-6 flex flex-col gap-4 md:flex-row">

            <div className="relative flex-1">

              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />

              <Input
                className="pl-10"
                placeholder="Search version, title or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

            </div>

            <Button
              variant="outline"
              onClick={fetchUpdates}
            >

              <RefreshCw className="mr-2 h-4 w-4" />

              Refresh

            </Button>

          </div>

          {filteredUpdates.length === 0 ? (

            <div className="flex flex-col items-center justify-center py-16 text-center">

              <Rocket className="mb-4 h-12 w-12 text-muted-foreground" />

              <h3 className="text-lg font-semibold">

                No Updates Found

              </h3>

              <p className="mt-2 text-sm text-muted-foreground">

                Create your first application update.

              </p>

              <Button
                className="mt-6"
                onClick={openCreate}
              >

                <Plus className="mr-2 h-4 w-4" />

                Create Update

              </Button>

            </div>

          ) : (

            <div className="overflow-x-auto">

              <table className="w-full">

                <thead>

                  <tr className="border-b">

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

                  {filteredUpdates.map((item) => (

                    <tr
                      key={item.id}
                      className="border-b hover:bg-muted/50"
                    >

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

                        {item.published ? 'Yes' : 'No'}

                      </td>

                      <td className="px-4 py-4 text-center">

                        {new Date(
                          item.created_at
                        ).toLocaleDateString()}

                      </td>

                      <td className="px-4 py-4">

                        <div className="flex justify-center gap-2">

                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => openView(item)}
                          >

                            <Eye className="h-4 w-4" />

                          </Button>

                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => openEdit(item)}
                          >

                            <Pencil className="h-4 w-4" />

                          </Button>

                          <Button
                            size="icon"
                            variant="destructive"
                            onClick={() => openDelete(item)}
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

          )}

        </CardContent>

      </Card>
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open)

          if (!open) {

            resetForm()

          }
        }}
      >

        <DialogContent className="sm:max-w-2xl">

          <DialogHeader>

            <DialogTitle>

              Create Update

            </DialogTitle>

            <DialogDescription>

              Create a new application update.

            </DialogDescription>

          </DialogHeader>

          <Form {...form}>

            <form
              onSubmit={form.handleSubmit(onCreate)}
              className="space-y-6"
            >

              <FormField
                control={form.control}
                name="version"
                render={({ field }) => (

                  <FormItem>

                    <FormLabel>

                      Version

                    </FormLabel>

                    <FormControl>

                      <Input
                        placeholder="v2.0.0"
                        {...field}
                      />

                    </FormControl>

                    <FormMessage />

                  </FormItem>

                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (

                  <FormItem>

                    <FormLabel>

                      Title

                    </FormLabel>

                    <FormControl>

                      <Input
                        placeholder="Update title"
                        {...field}
                      />

                    </FormControl>

                    <FormMessage />

                  </FormItem>

                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (

                  <FormItem>

                    <FormLabel>

                      Description

                    </FormLabel>

                    <FormControl>

                      <Textarea
                        rows={6}
                        placeholder="Write update description..."
                        {...field}
                      />

                    </FormControl>

                    <FormMessage />

                  </FormItem>

                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
  
                    <FormItem>
  
                      <FormLabel>
  
                        Type
  
                      </FormLabel>
  
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
  
                        <FormControl>
  
                          <SelectTrigger>
  
                            <SelectValue />
  
                          </SelectTrigger>
  
                        </FormControl>
  
                        <SelectContent>
  
                          <SelectItem value="Feature">
  
                            🚀 Feature
  
                          </SelectItem>
  
                          <SelectItem value="Improvement">
  
                            ⚡ Improvement
  
                          </SelectItem>
  
                          <SelectItem value="Bug Fix">
  
                            🐞 Bug Fix
  
                          </SelectItem>
  
                          <SelectItem value="Security">
  
                            🔒 Security
  
                          </SelectItem>
  
                        </SelectContent>
  
                      </Select>
  
                      <FormMessage />
  
                    </FormItem>
  
                  )}
                />
  
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
  
                    <FormItem>
  
                      <FormLabel>
  
                        Status
  
                      </FormLabel>
  
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
  
                        <FormControl>
  
                          <SelectTrigger>
  
                            <SelectValue />
  
                          </SelectTrigger>
  
                        </FormControl>
  
                        <SelectContent>
  
                          <SelectItem value="Draft">
  
                            Draft
  
                          </SelectItem>
  
                          <SelectItem value="Published">
  
                            Published
  
                          </SelectItem>
  
                        </SelectContent>
  
                      </Select>
  
                      <FormMessage />
  
                    </FormItem>
  
                  )}
                />
  
                </div>
  
                <FormField
                  control={form.control}
                  name="published"
                  render={({ field }) => (
  
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
  
                      <div>
  
                        <FormLabel>
  
                          Publish
  
                        </FormLabel>
  
                        <p className="text-sm text-muted-foreground">
  
                          Publish this update immediately.
  
                        </p>
  
                      </div>
  
                      <FormControl>
  
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
  
                      </FormControl>
  
                    </FormItem>
  
                  )}
                />
                <DialogFooter>
  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setCreateOpen(false)
                      resetForm()
                    }}
                  >
  
                    Cancel
  
                  </Button>
  
                  <Button
                    type="submit"
                    disabled={saving}
                  >
  
                    {saving && (
  
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
  
                    )}
  
                    Create Update
  
                  </Button>
  
                </DialogFooter>
  
              </form>
  
            </Form>
  
          </DialogContent>
  
        </Dialog>
        <Dialog
          open={editOpen}
          onOpenChange={(open) => {
            setEditOpen(open)
  
            if (!open) {
              resetForm()
            }
          }}
        >
  
          <DialogContent className="sm:max-w-2xl">
  
            <DialogHeader>
  
              <DialogTitle>
  
                Edit Update
  
              </DialogTitle>
  
              <DialogDescription>
  
                Update release information.
  
              </DialogDescription>
  
            </DialogHeader>
  
            <Form {...form}>
  
              <form
                onSubmit={form.handleSubmit(onUpdate)}
                className="space-y-6"
              >
  
                <FormField
                  control={form.control}
                  name="version"
                  render={({ field }) => (
  
                    <FormItem>
  
                      <FormLabel>
  
                        Version
  
                      </FormLabel>
  
                      <FormControl>
  
                        <Input {...field} />
  
                      </FormControl>
  
                      <FormMessage />
  
                    </FormItem>
  
                  )}
                />
  
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
  
                    <FormItem>
  
                      <FormLabel>
  
                        Title
  
                      </FormLabel>
  
                      <FormControl>
  
                        <Input {...field} />
  
                      </FormControl>
  
                      <FormMessage />
  
                    </FormItem>
  
                  )}
                />
  
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
  
                    <FormItem>
  
                      <FormLabel>
  
                        Description
  
                      </FormLabel>
  
                      <FormControl>
  
                        <Textarea
                          rows={6}
                          {...field}
                        />
  
                      </FormControl>
  
                      <FormMessage />
  
                    </FormItem>
  
                  )}
                />

                              <div className="grid gap-4 md:grid-cols-2">

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (

                    <FormItem>

                      <FormLabel>

                        Type

                      </FormLabel>

                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >

                        <FormControl>

                          <SelectTrigger>

                            <SelectValue />

                          </SelectTrigger>

                        </FormControl>

                        <SelectContent>

                          <SelectItem value="Feature">

                            🚀 Feature

                          </SelectItem>

                          <SelectItem value="Improvement">

                            ⚡ Improvement

                          </SelectItem>

                          <SelectItem value="Bug Fix">

                            🐞 Bug Fix

                          </SelectItem>

                          <SelectItem value="Security">

                            🔒 Security

                          </SelectItem>

                        </SelectContent>

                      </Select>

                      <FormMessage />

                    </FormItem>

                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (

                    <FormItem>

                      <FormLabel>

                        Status

                      </FormLabel>

                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >

                        <FormControl>

                          <SelectTrigger>

                            <SelectValue />

                          </SelectTrigger>

                        </FormControl>

                        <SelectContent>

                          <SelectItem value="Draft">

                            Draft

                          </SelectItem>

                          <SelectItem value="Published">

                            Published

                          </SelectItem>

                        </SelectContent>

                      </Select>

                      <FormMessage />

                    </FormItem>

                  )}
                />

              </div>

              <FormField
                control={form.control}
                name="published"
                render={({ field }) => (

                  <FormItem className="flex items-center justify-between rounded-lg border p-4">

                    <div>

                      <FormLabel>

                        Publish

                      </FormLabel>

                      <p className="text-sm text-muted-foreground">

                        Publish this update immediately.

                      </p>

                    </div>

                    <FormControl>

                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />

                    </FormControl>

                  </FormItem>

                )}
              />
  
                <DialogFooter>
  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditOpen(false)}
                  >
  
                    Cancel
  
                  </Button>
  
                  <Button
                    type="submit"
                    disabled={saving}
                  >
  
                    {saving && (
  
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
  
                    )}
  
                    Save Changes
  
                  </Button>
  
                </DialogFooter>
  
              </form>
  
            </Form>
  
          </DialogContent>
  
        </Dialog>
        <Dialog
        open={viewOpen}
        onOpenChange={setViewOpen}
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

                <Label>

                  Version

                </Label>

                <p className="mt-1 font-medium">

                  {selected.version}

                </p>

              </div>

              <div>

                <Label>

                  Title

                </Label>

                <p className="mt-1 font-medium">

                  {selected.title}

                </p>

              </div>

              <div>

                <Label>

                  Description

                </Label>

                <div className="mt-1 whitespace-pre-wrap rounded-md border p-4 text-sm">

                  {selected.description}

                </div>

              </div>

              <div className="grid gap-4 md:grid-cols-3">

                <div>

                  <Label>

                    Type

                  </Label>

                  <div className="mt-2">

                    {renderTypeBadge(selected.type)}

                  </div>

                </div>

                <div>

                  <Label>

                    Status

                  </Label>

                  <div className="mt-2">

                    {renderStatusBadge(selected.status)}

                  </div>

                </div>

                <div>

                  <Label>

                    Published

                  </Label>

                  <p className="mt-2">

                    {selected.published ? 'Yes' : 'No'}

                  </p>

                </div>

              </div>

              <DialogFooter>

                <Button
                  onClick={() => setViewOpen(false)}
                >

                  Close

                </Button>

              </DialogFooter>

            </div>

          )}

        </DialogContent>

      </Dialog>
      <Dialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
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

          <div className="space-y-4">

            <p>

              Are you sure you want to delete this update?

            </p>

            {selected && (

              <div className="rounded-lg border p-4">

                <p className="font-semibold">

                  {selected.version}

                </p>

                <p className="text-sm text-muted-foreground">

                  {selected.title}

                </p>

              </div>

            )}

          </div>

          <DialogFooter>

            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
            >

              Cancel

            </Button>

            <Button
              variant="destructive"
              disabled={deleting}
              onClick={onDelete}
            >

              {deleting && (

                <Loader2 className="mr-2 h-4 w-4 animate-spin" />

              )}

              Delete Update

            </Button>

          </DialogFooter>

        </DialogContent>

      </Dialog>

    </div>

  )

}
                      



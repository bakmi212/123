
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
  Rocket,
} from 'lucide-react'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

import { UpdateStats } from '@/components/admin/updates/update-stats'
import { UpdateToolbar } from '@/components/admin/updates/update-toolbar'
import { UpdateViewDialog } from '@/components/admin/updates/update-view-dialog'
import { UpdateDeleteDialog } from '@/components/admin/updates/update-delete-dialog'
import { UpdateFormDialog } from '@/components/admin/updates/update-form-dialog'
import { UpdateTable } from '@/components/admin/updates/update-table'


import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

import {
  Product,
  UpdateItem,
} from '@/components/admin/updates/types'

const formSchema = z.object({
  product_id: z.string().uuid("Product is required"),

  version: z.string().min(1, "Version is required"),
  title: z.string().min(3, "Title is required"),
  description: z.string().min(10, "Description is required"),

  platform: z.enum([
    "desktop",
    "mobile",
  ]),
  
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
  
  const [products, setProducts] =
    useState<Product[]>([])
  const [selectedFile, setSelectedFile] =
  useState<File | null>(null)

  const fetchProducts = useCallback(async () => {
    const { data, error } = await supabase
      .from("products")
     .select(`
        id,
        name,
        slug,
        github_repo
      `)
      .order("name")
  
    if (error) {
      toast.error(error.message)
      return
    }
  
    setProducts(data ?? [])
  }, [supabase])

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
    
      platform: "desktop",
    
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
    
      platform: "desktop",
    
      version: "",
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
    fetchProducts()
  
    const channel = supabase
      .channel("updates-admin")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "updates",
        },
        () => {
          fetchUpdates()
        }
      )
      .subscribe()

    return () => {

      supabase.removeChannel(channel)

    }

  }, [fetchUpdates, fetchProducts, supabase])

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
    
      platform: item.platform,
    
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

    const product = products.find(
      (p) => p.id === values.product_id
    )
    
    if (!product?.github_repo) {
      toast.error("GitHub repository not configured")
    
      return
    }
    
    const formData = new FormData();

    formData.append("product_id", values.product_id);
    formData.append("version", values.version);
    formData.append("title", values.title);
    formData.append("description", values.description);
    formData.append("draft", "false");
    formData.append("prerelease", "false");
    
    if (selectedFile) {
      formData.append("file", selectedFile);
    }
    
    const publishResponse = await fetch(
      "/api/github/publish",
      {
        method: "POST",
        body: formData,
      }
    );
    
    const publishResult =
      await publishResponse.json();
    
    if (!publishResult.success) {
      console.error(publishResult);
    
      toast.error(
        publishResult.message ??
          "Failed to create GitHub Release"
      );
    
      setSaving(false);
    
      return;
    }

    setSaving(false);

    toast.success(
      "Release published successfully."
    );
    
    setCreateOpen(false);
    
    resetForm();
    
    setSelectedFile(null);
    
    await fetchUpdates();
    }

  async function onUpdate(values: FormValues) {

    if (!selected) return

    setSaving(true);

    const { error } = await supabase
      .from("updates")
      .update({
        product_id: values.product_id,
    
        platform: values.platform,
    
        version: values.version,
        title: values.title,
        description: values.description,
        type: values.type,
        status: values.status,
        published: values.published,
    
        updated_at: new Date().toISOString(),
      })
      .eq("id", selected.id);
    
    setSaving(false);
    
    if (error) {
      toast.error(error.message);
    
      return;
    }
    
    toast.success(
      "Update updated successfully."
    );
    
    setEditOpen(false);
    
    resetForm();
    
    await fetchUpdates();
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

      <UpdateStats
        total={totalUpdates}
        published={publishedUpdates}
        draft={draftUpdates}
        latestApp={updates[0]?.products?.name ?? "-"}
        latestVersion={latestVersion}
      />
      <Card>

        <CardHeader>

          <CardTitle>

            Application Updates

          </CardTitle>

        </CardHeader>

        <CardContent>

          <UpdateToolbar
            search={search}
            onSearchChange={setSearch}
            onRefresh={fetchUpdates}
          />

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

            <UpdateTable
              updates={filteredUpdates}
              renderTypeBadge={renderTypeBadge}
              renderStatusBadge={renderStatusBadge}
              onView={openView}
              onEdit={openEdit}
              onDelete={openDelete}
            />

          )}

        </CardContent>

      </Card>
      <UpdateFormDialog
        open={createOpen}
        mode="create"
        title="Create Update"
        description="Create a new application update."
        form={form}
        products={products}
        selectedFile={selectedFile}
        setSelectedFile={setSelectedFile}
        saving={saving}
        onOpenChange={(open) => {
          setCreateOpen(open)
      
          if (!open) {
            resetForm()
          }
        }}
        onSubmit={onCreate}
      />
        <UpdateFormDialog
          open={editOpen}
          mode="edit"
          title="Edit Update"
          description="Update release information."
          form={form}
          products={products}
          selectedFile={selectedFile}
          setSelectedFile={setSelectedFile}
          saving={saving}
          onOpenChange={(open) => {
            setEditOpen(open)
        
            if (!open) {
              resetForm()
            }
          }}
          onSubmit={onUpdate}
        />
       <UpdateViewDialog
        open={viewOpen}
        selected={selected}
        onOpenChange={setViewOpen}
        renderTypeBadge={renderTypeBadge}
        renderStatusBadge={renderStatusBadge}
      />
      <UpdateDeleteDialog
        open={deleteOpen}
        selected={selected}
        deleting={deleting}
        onOpenChange={setDeleteOpen}
        onDelete={onDelete}
      />

    </div>

  )

}
                      



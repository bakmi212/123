'use client'

import { useEffect, useRef, useState } from 'react'

import {
  Loader2,
  Plus,
  Edit,
  Trash2,
  Image as ImageIcon,
  X,
} from 'lucide-react'

import { toast } from 'sonner'

import { createBrowserClient } from '@/lib/supabase/client'

import {
  uploadBannerImage,
  deleteBannerImage,
  validateBannerImage,
} from '@/lib/supabase/storage'

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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

interface Banner {

  id: string

  title: string | null

  image_url: string

  button_url: string

  duration: number

  sort_order: number

  is_active: boolean

  created_at: string

}

export default function AdminBannerPage() {

  const supabase = createBrowserClient()

  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)

  const [saving, setSaving] = useState(false)

  const [uploading, setUploading] = useState(false)

  const [deleting, setDeleting] = useState(false)

  const [banners, setBanners] = useState<Banner[]>([])

  const [addDialogOpen, setAddDialogOpen] = useState(false)

  const [editDialogOpen, setEditDialogOpen] = useState(false)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const [selectedBanner, setSelectedBanner] =
    useState<Banner | null>(null)

  const [form, setForm] = useState({

    title: '',

    image_url: '',

    button_url: '',

    duration: 5,

    sort_order: 1,

    is_active: true,

  })

  useEffect(() => {

    fetchBanners()

  }, [])

  async function fetchBanners() {

    setLoading(true)

    const { data } = await supabase

      .from('banners')

      .select('*')

      .order('sort_order')

    setBanners(data ?? [])

    setLoading(false)

  }

  function resetForm() {

    setForm({

      title: '',

      image_url: '',

      button_url: '',

      duration: 5,

      sort_order: banners.length + 1,

      is_active: true,

    })

  }

  async function handleImageUpload(

    e: React.ChangeEvent<HTMLInputElement>

  ) {

    const file = e.target.files?.[0]

    if (!file)
      return

    const validate = validateBannerImage(file)

    if (!validate.valid) {

      toast.error(validate.error)

      return

    }

    setUploading(true)

    const image = await uploadBannerImage(

      file,

      crypto.randomUUID()

    )

    if (!image) {

      toast.error('Upload failed')

      setUploading(false)

      return

    }

    setForm({

      ...form,

      image_url: image,

    })

    toast.success('Banner uploaded')

    setUploading(false)

    if (fileInputRef.current)

      fileInputRef.current.value = ''

  }

  async function removeImage() {

    if (form.image_url) {

      await deleteBannerImage(

        form.image_url

      )

    }

    setForm({

      ...form,

      image_url: '',

    })

  }
    async function handleAdd() {

    if (!form.image_url) {

      toast.error('Banner image is required')

      return

    }

    if (!form.button_url.trim()) {

      toast.error('Button URL is required')

      return

    }

    setSaving(true)

    const { error } = await supabase

      .from('banners')

      .insert({

        title:

          form.title || null,

        image_url:

          form.image_url,

        button_url:

          form.button_url,

        duration:

          form.duration,

        sort_order:

          form.sort_order,

        is_active:

          form.is_active,

      })

    if (error) {

      toast.error(error.message)

    }

    else {

      toast.success(

        'Banner created.'

      )

      setAddDialogOpen(false)

      resetForm()

      fetchBanners()

    }

    setSaving(false)

  }

  async function handleEdit() {

    if (!selectedBanner)
      return

    if (!form.image_url) {

      toast.error('Banner image is required')

      return

    }

    if (!form.button_url.trim()) {

      toast.error('Button URL is required')

      return

    }

    setSaving(true)

    const { error } = await supabase

      .from('banners')

      .update({

        title:

          form.title || null,

        image_url:

          form.image_url,

        button_url:

          form.button_url,

        duration:

          form.duration,

        sort_order:

          form.sort_order,

        is_active:

          form.is_active,

      })

      .eq(

        'id',

        selectedBanner.id

      )

    if (error) {

      toast.error(error.message)

    }

    else {

      toast.success(

        'Banner updated.'

      )

      setEditDialogOpen(false)

      setSelectedBanner(null)

      resetForm()

      fetchBanners()

    }

    setSaving(false)

  }

  async function handleDelete() {

    if (!selectedBanner)
      return

    setDeleting(true)

    if (selectedBanner.image_url) {

      await deleteBannerImage(

        selectedBanner.image_url

      )

    }

    const { error } = await supabase

      .from('banners')

      .delete()

      .eq(

        'id',

        selectedBanner.id

      )

    if (error) {

      toast.error(error.message)

    }

    else {

      toast.success(

        'Banner deleted.'

      )

      setDeleteDialogOpen(false)

      setSelectedBanner(null)

      fetchBanners()

    }

    setDeleting(false)

  }

  function openEdit(

    banner: Banner

  ) {

    setSelectedBanner(banner)

    setForm({

      title:

        banner.title ?? '',

      image_url:

        banner.image_url,

      button_url:

        banner.button_url,

      duration:

        banner.duration,

      sort_order:

        banner.sort_order,

      is_active:

        banner.is_active,

    })

    setEditDialogOpen(true)

  }

  function openDelete(

    banner: Banner

  ) {

    setSelectedBanner(banner)

    setDeleteDialogOpen(true)

  }
    function renderForm() {

    return (

      <div className="space-y-4">

        <div className="space-y-2">

          <Label>

            Banner Image *

          </Label>

          {

            form.image_url ? (

              <div className="relative inline-block">

                <img

                  src={form.image_url}

                  alt="Banner"

                  className="h-44 w-full rounded-lg border object-cover"

                />

                <button

                  type="button"

                  onClick={removeImage}

                  className="absolute right-2 top-2 rounded-full bg-black/60 p-2 text-white"

                >

                  <X className="h-4 w-4"/>

                </button>

              </div>

            ) : (

              <label className="flex h-44 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed">

                {

                  uploading

                  ?

                  <Loader2 className="h-8 w-8 animate-spin"/>

                  :

                  <ImageIcon className="h-8 w-8"/>

                }

                <span className="mt-3 text-sm">

                  {

                    uploading

                    ?

                    'Uploading...'

                    :

                    'Click to upload banner'

                  }

                </span>

                <input

                  ref={fileInputRef}

                  type="file"

                  accept="image/jpeg,image/png,image/webp,image/gif"

                  className="hidden"

                  onChange={handleImageUpload}

                />

              </label>

            )

          }

        </div>

        <div className="space-y-2">

          <Label>

            Title

          </Label>

          <Input

            value={form.title}

            onChange={(e)=>

              setForm({

                ...form,

                title:e.target.value

              })

            }

          />

        </div>

        <div className="space-y-2">

          <Label>

            Button URL *

          </Label>

          <Input

            placeholder="https://..."

            value={form.button_url}

            onChange={(e)=>

              setForm({

                ...form,

                button_url:e.target.value

              })

            }

          />

        </div>

        <div className="grid grid-cols-2 gap-4">

          <div className="space-y-2">

            <Label>

              Duration (Second)

            </Label>

            <Input

              type="number"

              min={1}

              value={form.duration}

              onChange={(e)=>

                setForm({

                  ...form,

                  duration:Number(e.target.value)

                })

              }

            />

          </div>

          <div className="space-y-2">

            <Label>

              Sort Order

            </Label>

            <Input

              type="number"

              min={1}

              value={form.sort_order}

              onChange={(e)=>

                setForm({

                  ...form,

                  sort_order:Number(e.target.value)

                })

              }

            />

          </div>

        </div>

        <div className="flex items-center gap-2">

          <input

            id="active"

            type="checkbox"

            checked={form.is_active}

            onChange={(e)=>

              setForm({

                ...form,

                is_active:e.target.checked

              })

            }

          />

          <Label htmlFor="active">

            Active

          </Label>

        </div>

      </div>

    )

  }
    if (loading) {

    return (

      <div className="flex justify-center py-12">

        <Loader2 className="h-8 w-8 animate-spin" />

      </div>

    )

  }

  return (

    <div className="space-y-6">

      <div className="flex items-center justify-between">

        <div>

          <h1 className="text-3xl font-bold">

            Banner Manager

          </h1>

          <p className="text-muted-foreground">

            Manage dashboard carousel banners.

          </p>

        </div>

        <Button

          onClick={() => {

            resetForm()

            setAddDialogOpen(true)

          }}

        >

          <Plus className="mr-2 h-4 w-4"/>

          Add Banner

        </Button>

      </div>

      <Card>

        <CardHeader>

          <CardTitle>

            All Banners

          </CardTitle>

        </CardHeader>

        <CardContent className="p-0">

          <div className="overflow-x-auto">

            <table className="w-full">

              <thead>

                <tr className="border-b">

                  <th className="px-4 py-3 text-left">

                    Preview

                  </th>

                  <th className="px-4 py-3 text-left">

                    URL

                  </th>

                  <th className="px-4 py-3 text-center">

                    Duration

                  </th>

                  <th className="px-4 py-3 text-center">

                    Order

                  </th>

                  <th className="px-4 py-3 text-center">

                    Status

                  </th>

                  <th className="px-4 py-3 text-center">

                    Actions

                  </th>

                </tr>

              </thead>

              <tbody>

                {

                  banners.map((banner) => (

                    <tr

                      key={banner.id}

                      className="border-b hover:bg-muted/40"

                    >

                      <td className="px-4 py-4">

                        <img

                          src={banner.image_url}

                          alt="Banner"

                          className="h-24 w-48 rounded-lg border object-cover"

                        />

                      </td>

                      <td className="px-4 py-4">

                        <div className="max-w-sm truncate">

                          {banner.button_url}

                        </div>

                      </td>

                      <td className="px-4 py-4 text-center">

                        {banner.duration}s

                      </td>

                      <td className="px-4 py-4 text-center">

                        {banner.sort_order}

                      </td>

                      <td className="px-4 py-4 text-center">

                        {

                          banner.is_active

                          ?

                          <Badge>

                            Active

                          </Badge>

                          :

                          <Badge variant="secondary">

                            Disabled

                          </Badge>

                        }

                      </td>

                      <td className="px-4 py-4">

                        <div className="flex justify-center gap-2">

                          <Button

                            size="sm"

                            variant="outline"

                            onClick={()=>

                              openEdit(banner)

                            }

                          >

                            <Edit className="mr-1 h-3 w-3"/>

                            Edit

                          </Button>

                          <Button

                            size="sm"

                            variant="destructive"

                            onClick={()=>

                              openDelete(banner)

                            }

                          >

                            <Trash2 className="mr-1 h-3 w-3"/>

                            Delete

                          </Button>

                        </div>

                      </td>

                    </tr>

                  ))

                }

              </tbody>

            </table>

          </div>

        </CardContent>

      </Card>
            <Dialog

        open={addDialogOpen}

        onOpenChange={setAddDialogOpen}

      >

        <DialogContent className="sm:max-w-xl">

          <DialogHeader>

            <DialogTitle>

              Add Banner

            </DialogTitle>

            <DialogDescription>

              Create new dashboard banner.

            </DialogDescription>

          </DialogHeader>

          {renderForm()}

          <DialogFooter>

            <Button

              variant="outline"

              onClick={()=>

                setAddDialogOpen(false)

              }

            >

              Cancel

            </Button>

            <Button

              disabled={saving}

              onClick={handleAdd}

            >

              {

                saving &&

                <Loader2 className="mr-2 h-4 w-4 animate-spin"/>

              }

              Save

            </Button>

          </DialogFooter>

        </DialogContent>

      </Dialog>

      <Dialog

        open={editDialogOpen}

        onOpenChange={setEditDialogOpen}

      >

        <DialogContent className="sm:max-w-xl">

          <DialogHeader>

            <DialogTitle>

              Edit Banner

            </DialogTitle>

            <DialogDescription>

              Update banner information.

            </DialogDescription>

          </DialogHeader>

          {renderForm()}

          <DialogFooter>

            <Button

              variant="outline"

              onClick={()=>

                setEditDialogOpen(false)

              }

            >

              Cancel

            </Button>

            <Button

              disabled={saving}

              onClick={handleEdit}

            >

              {

                saving &&

                <Loader2 className="mr-2 h-4 w-4 animate-spin"/>

              }

              Save Changes

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

              Delete Banner

            </DialogTitle>

            <DialogDescription>

              Are you sure you want to delete this banner?

            </DialogDescription>

          </DialogHeader>

          <DialogFooter>

            <Button

              variant="outline"

              onClick={()=>

                setDeleteDialogOpen(false)

              }

            >

              Cancel

            </Button>

            <Button

              variant="destructive"

              disabled={deleting}

              onClick={handleDelete}

            >

              {

                deleting &&

                <Loader2 className="mr-2 h-4 w-4 animate-spin"/>

              }

              Delete

            </Button>

          </DialogFooter>

        </DialogContent>

      </Dialog>

    </div>

  )

}

'use client'

import { useEffect, useMemo, useState } from 'react'

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

import { createBrowserClient } from '@/lib/supabase/client'

import { toast } from 'sonner'

import {
  Ban,
  CheckCircle,
  Copy,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react'

const supabase = createBrowserClient()

type LicenseStatus =
  | 'available'
  | 'active'
  | 'suspended'
  | 'expired'
  | 'revoked'

interface License {
  id: string

  license_key: string

  status: LicenseStatus

  device_count: number

  user_id: string | null

  product_id: string

  activated_at: string | null

  expires_at: string | null

  created_at: string

  max_devices: number

  notes: string | null

  user: {
    email: string
  } | null

  product: {
    name: string
  } | null
}

interface Profile {
  id: string

  user_id: string

  email: string
}

interface Product {
  id: string

  name: string
}

const STATUS_COLORS: Record<LicenseStatus, string> = {
  available: 'bg-blue-50 text-blue-700 border-blue-200',
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  suspended: 'bg-amber-50 text-amber-700 border-amber-200',
  expired: 'bg-slate-100 text-slate-700 border-slate-200',
  revoked: 'bg-red-50 text-red-700 border-red-200',
}

const FILTERS: Array<{
  label: string
  value: 'all' | LicenseStatus
}> = [
  {
    label: 'All',
    value: 'all',
  },
  {
    label: 'Available',
    value: 'available',
  },
  {
    label: 'Active',
    value: 'active',
  },
  {
    label: 'Suspended',
    value: 'suspended',
  },
  {
    label: 'Expired',
    value: 'expired',
  },
  {
    label: 'Revoked',
    value: 'revoked',
  },
]

function generateLicenseKey() {
  const chars =
    'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

  const part = () =>
    Array.from(
      { length: 4 },
      () =>
        chars[
          Math.floor(
            Math.random() * chars.length
          )
        ]
    ).join('')

  return `TFPRO-${part()}-${part()}-${part()}`
}

function formatDate(
  value: string | null
) {
  if (!value) return 'Lifetime'

  return new Date(value).toLocaleDateString(
    'id-ID',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }
  )
}

export default function AdminLicensesPage() {
  const [loading, setLoading] =
    useState(true)

  const [licenses, setLicenses] =
    useState<License[]>([])

  const [profiles, setProfiles] =
    useState<Profile[]>([])

  const [products, setProducts] =
    useState<Product[]>([])

  const [search, setSearch] =
    useState('')

  const [filter, setFilter] =
    useState<'all' | LicenseStatus>('all')

  const [showModal, setShowModal] =
    useState(false)

  const [actionLoading, setActionLoading] =
    useState<string | null>(null)

  const [deleteConfirm, setDeleteConfirm] =
    useState<string | null>(null)

  const [form, setForm] = useState({
    assignCustomer: true,

    user_id: '',

    product_id: '',

    license_key: generateLicenseKey(),

    lifetime: true,

    expires_at: '',

    max_devices: 2,

    notes: '',
  })
  
    const fetchLicenses = async () => {
  setLoading(true)

  const [
	  { data: licenseData, error },
	  { data: profileData },
	  { data: productData },
	  { data: deviceData },
	] = await Promise.all([
	
	  supabase
	    .from("licenses")
	    .select("*")
	    .order("created_at", {
	      ascending: false,
	    }),
	
	  supabase
	    .from("profiles")
	    .select("user_id,email"),
	
	  supabase
	    .from("products")
	    .select("id,name"),
	
	  supabase
	    .from("license_devices")
	    .select("license_id"),
	
	])

  if (error) {
    toast.error(error.message)
    setLoading(false)
    return
  }

  const rows: License[] = (licenseData ?? []).map((item: any) => ({
    id: item.id,
    license_key: item.license_key,
    status: item.status,
    user_id: item.user_id,
    product_id: item.product_id,
    activated_at: item.activated_at,
    expires_at: item.expires_at ?? item.expiry_date,
    created_at: item.created_at,
    max_devices: item.max_devices ?? item.max_activations ?? 1,
    notes: item.notes,

    user:
      profileData?.find(
        p => p.user_id === item.user_id
      ) ?? null,

    product:
      productData?.find(
        p => p.id === item.product_id
      ) ?? null,

    device_count:
    deviceData?.filter(
        d =>
            d.license_id === item.id
    ).length ?? 0,
	  
  }))

  setLicenses(rows)

  setLoading(false)
}

  const fetchProfiles = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id,user_id,email')
      .order('email')

    setProfiles(data ?? [])
  }

  const fetchProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('id,name')
      .order('name')

    setProducts(data ?? [])
  }

  const loadData = async () => {
    await Promise.all([
      fetchLicenses(),
      fetchProfiles(),
      fetchProducts(),
    ])
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredLicenses =
    useMemo(() => {
      return licenses.filter((item) => {
        const statusMatch =
          filter === 'all'
            ? true
            : item.status === filter

        const keyword =
          search.toLowerCase()

        const searchMatch =
          keyword.length === 0 ||
          item.license_key
            .toLowerCase()
            .includes(keyword) ||
          item.user?.email
            ?.toLowerCase()
            .includes(keyword) ||
          item.product?.name
            ?.toLowerCase()
            .includes(keyword)

        return (
          statusMatch &&
          searchMatch
        )
      })
    }, [
      licenses,
      filter,
      search,
    ])
	
	  const resetForm = () => {
    setForm({
      assignCustomer: true,
      user_id: '',
      product_id: '',
      license_key: generateLicenseKey(),
      lifetime: true,
      expires_at: '',
      max_devices: 2,
      notes: '',
    })
  }

  const openModal = () => {
    resetForm()
    setShowModal(true)
  }

  const copyLicense = async (key: string) => {
    await navigator.clipboard.writeText(key)
    toast.success('License berhasil disalin')
  }

  const regenerateLicense = () => {
    setForm((prev) => ({
      ...prev,
      license_key: generateLicenseKey(),
    }))
  }

  const saveLicense = async () => {
    if (!form.product_id) {
      toast.error('Produk wajib dipilih')
      return
    }

    if (form.assignCustomer && !form.user_id) {
      toast.error('Customer wajib dipilih')
      return
    }

    if (!form.license_key.trim()) {
      toast.error('License Key wajib diisi')
      return
    }

    const { data: duplicate } = await supabase
      .from('licenses')
      .select('id')
      .eq('license_key', form.license_key)
      .maybeSingle()

    if (duplicate) {
      toast.error('License Key sudah digunakan')
      return
    }

    let customerId: string | null = null

    if (form.assignCustomer) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('id', form.user_id)
        .single()

      if (!profile) {
        toast.error('Customer tidak ditemukan')
        return
      }

      customerId = profile.user_id
    }

    const { error } = await supabase
      .from('licenses')
      .insert({
        user_id: customerId,
        product_id: form.product_id,
        license_key: form.license_key,
        status: form.assignCustomer
          ? 'active'
          : 'available',
        activated_at: form.assignCustomer
          ? new Date().toISOString()
          : null,
        expires_at: form.lifetime
  ? null
  : new Date(form.expires_at).toISOString(),

expiry_date: form.lifetime
  ? null
  : new Date(form.expires_at).toISOString(),

max_devices: form.max_devices,

max_activations: form.max_devices,
        notes: form.notes,
        purchase_date:
          new Date().toISOString(),
      })

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Lisensi berhasil dibuat')

    setShowModal(false)

    fetchLicenses()
  }
  
    const updateStatus = async (
    id: string,
    status: LicenseStatus
  ) => {
    setActionLoading(id)

    const payload = {
	  status,
	  updated_at: new Date().toISOString(),
	  activated_at:
	    status === 'active'
	      ? new Date().toISOString()
	      : null,
	  last_used_at:
	    status === 'active'
	      ? new Date().toISOString()
	      : null,
	}

    const { error } = await supabase
      .from('licenses')
      .update(payload)
      .eq('id', id)

    setActionLoading(null)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Status berhasil diperbarui')

    fetchLicenses()
  }

  const regenerateLicenseRow =
    async (license: License) => {
      setActionLoading(
        `${license.id}-regen`
      )

      const { error } =
        await supabase
          .from('licenses')
          .update({
            license_key:
              generateLicenseKey(),
            updated_at:
              new Date().toISOString(),
          })
          .eq('id', license.id)

      setActionLoading(null)

      if (error) {
        toast.error(error.message)
        return
      }

      toast.success(
        'License berhasil digenerate ulang'
      )

      fetchLicenses()
    }

  const deleteLicense = async (
    id: string
  ) => {
    const { error } =
      await supabase
        .from('licenses')
        .delete()
        .eq('id', id)

    if (error) {
      toast.error(error.message)
      return
    }

    setDeleteConfirm(null)

    toast.success(
      'Lisensi berhasil dihapus'
    )

    fetchLicenses()
  }
  
    if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">

      {/* HEADER */}

      <div className="flex items-center justify-between">

        <div>

          <h1 className="text-2xl font-semibold">
            License Management
          </h1>

          <p className="text-sm text-slate-500 mt-1">
            {licenses.length} License
          </p>

        </div>

        <Button
          onClick={openModal}
        >
          <Plus className="h-4 w-4 mr-2" />
          Tambah Lisensi
        </Button>

      </div>
	  
	        {/* TOOLBAR */}

      <Card>

        <CardContent className="pt-6">

          <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">

            <div className="relative w-full lg:max-w-md">

              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />

              <Input
                className="pl-10"
                placeholder="Cari License, Customer atau Produk..."
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
              />

            </div>

            <div className="flex flex-wrap gap-2">

              {FILTERS.map((item) => (

                <Button
                  key={item.value}
                  size="sm"
                  variant={
                    filter === item.value
                      ? 'default'
                      : 'outline'
                  }
                  onClick={() =>
                    setFilter(item.value)
                  }
                >
                  {item.label}
                </Button>

              ))}

            </div>

          </div>

        </CardContent>

      </Card>

      {/* TABLE */}

      <Card>

        <CardContent className="p-0">

          {filteredLicenses.length === 0 ? (

            <div className="py-20 text-center text-slate-400">

              Tidak ada data lisensi.

            </div>

          ) : (

            <div className="overflow-x-auto">

              <table className="w-full">

                <thead>

                  <tr className="border-b bg-slate-50">

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">
                      License
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">
                      Customer
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">
                      Product
                    </th>

                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase">
                      Device
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">
                      Expired
                    </th>

                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase">
                      Status
                    </th>

                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase">
                      Action
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {filteredLicenses.map((license) => (
				  
				  <tr
  key={license.id}
  className="border-b hover:bg-slate-50"
>

  <td className="px-4 py-3">

    <div className="flex items-center gap-2">

      <span className="font-mono text-xs">
        {license.license_key}
      </span>

      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7"
        onClick={() =>
          copyLicense(
            license.license_key
          )
        }
      >
        <Copy className="h-3 w-3" />
      </Button>

    </div>

  </td>

  <td className="px-4 py-3 text-sm">

    {license.user?.email ?? (
      <span className="text-blue-600">
        Available
      </span>
    )}

  </td>

  <td className="px-4 py-3 text-sm">

    {license.product?.name ?? '-'}

  </td>

  <td className="px-4 py-3 text-center text-sm">

    {license.device_count} / {license.max_devices}

  </td>

  <td className="px-4 py-3 text-sm">

    {formatDate(
      license.expires_at
    )}

  </td>

  <td className="px-4 py-3 text-center">

    <Badge
      className={
        STATUS_COLORS[
          license.status
        ]
      }
    >
      {license.status}
    </Badge>

  </td>

  <td className="px-4 py-3">

    <div className="flex justify-center gap-1 flex-wrap">

      {license.status !==
        'active' && (
        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8"
          disabled={
            actionLoading ===
            license.id
          }
          onClick={() =>
            updateStatus(
              license.id,
              'active'
            )
          }
        >
          <CheckCircle className="h-4 w-4" />
        </Button>
      )}

      {license.status ===
        'active' && (
        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8"
          disabled={
            actionLoading ===
            license.id
          }
          onClick={() =>
            updateStatus(
              license.id,
              'suspended'
            )
          }
        >
          <Ban className="h-4 w-4" />
        </Button>
      )}

      <Button
        size="icon"
        variant="outline"
        className="h-8 w-8"
        onClick={() =>
          regenerateLicenseRow(
            license
          )
        }
      >
        <RefreshCw className="h-4 w-4" />
      </Button>

      {deleteConfirm ===
      license.id ? (
        <>

          <Button
            size="sm"
            variant="destructive"
            onClick={() =>
              deleteLicense(
                license.id
              )
            }
          >
            Ya
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setDeleteConfirm(
                null
              )
            }
          >
            Batal
          </Button>

        </>
      ) : (
        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8"
          onClick={() =>
            setDeleteConfirm(
              license.id
            )
          }
        >
          <Trash2 className="h-4 w-4 text-red-600" />
        </Button>
      )}

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

      {/* ADD LICENSE MODAL */}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">

          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">

            <div className="mb-5 flex items-center justify-between">

              <h2 className="text-lg font-semibold">
                Tambah Lisensi
              </h2>

              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  setShowModal(false)
                }
              >
                <X className="h-5 w-5" />
              </Button>

            </div>

            <div className="space-y-4">

              <div className="flex items-center gap-2">

                <input
                  type="checkbox"
                  checked={form.assignCustomer}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      assignCustomer:
                        e.target.checked,
                    }))
                  }
                />

                <Label>
                  Assign ke Customer
                </Label>

              </div>

              {form.assignCustomer && (

                <div>

                  <Label>
                    Customer
                  </Label>

                  <select
                    className="mt-1 w-full rounded-md border px-3 py-2"
                    value={form.user_id}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        user_id:
                          e.target.value,
                      }))
                    }
                  >

                    <option value="">
                      Pilih Customer
                    </option>

                    {profiles.map(
                      (profile) => (
                        <option
                          key={profile.id}
                          value={profile.id}
                        >
                          {profile.email}
                        </option>
                      )
                    )}

                  </select>

                </div>

              )}

              <div>

                <Label>
                  Produk
                </Label>

                <select
                  className="mt-1 w-full rounded-md border px-3 py-2"
                  value={form.product_id}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      product_id:
                        e.target.value,
                    }))
                  }
                >

                  <option value="">
                    Pilih Produk
                  </option>

                  {products.map(
                    (product) => (
                      <option
                        key={product.id}
                        value={product.id}
                      >
                        {product.name}
                      </option>
                    )
                  )}

                </select>

              </div>

              <div>

                <Label>
                  License Key
                </Label>

                <div className="mt-1 flex gap-2">

                  <Input
                    value={
                      form.license_key
                    }
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        license_key:
                          e.target.value,
                      }))
                    }
                  />

                  <Button
                    variant="outline"
                    onClick={
                      regenerateLicense
                    }
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>

                </div>

              </div>
			  
			                <div className="flex items-center gap-2">

                <input
                  type="checkbox"
                  checked={form.lifetime}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      lifetime: e.target.checked,
                    }))
                  }
                />

                <Label>
                  Lifetime License
                </Label>

              </div>

              {!form.lifetime && (

                <div>

                  <Label>
                    Expired Date
                  </Label>

                  <Input
                    className="mt-1"
                    type="date"
                    value={form.expires_at}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        expires_at: e.target.value,
                      }))
                    }
                  />

                </div>

              )}

              <div>

                <Label>
                  Max Device
                </Label>

                <Input
                  className="mt-1"
                  type="number"
                  min={1}
                  value={form.max_devices}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      max_devices: Number(
                        e.target.value
                      ),
                    }))
                  }
                />

              </div>

              <div>

                <Label>
                  Notes
                </Label>

                <Input
                  className="mt-1"
                  placeholder="Catatan (opsional)"
                  value={form.notes}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      notes: e.target.value,
                    }))
                  }
                />

              </div>

            </div>

            <div className="mt-6 flex justify-end gap-2">

              <Button
                variant="outline"
                onClick={() =>
                  setShowModal(false)
                }
              >
                Batal
              </Button>

              <Button
                onClick={saveLicense}
              >
                Simpan Lisensi
              </Button>

            </div>

          </div>

        </div>
      )}

    </div>
  )
}

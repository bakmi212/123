'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createBrowserClient } from '@/lib/supabase/client'
import {
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

interface Product {
  id: string
  slug: string
  name: string
  short_description: string | null
  image_url: string |null
  is_featured: boolean
  status: string
  category_id: string | null
}

function ProductsList() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  const [search, setSearch] = useState(
    searchParams.get('search') || ''
  )

  const [category, setCategory] = useState(
    searchParams.get('category') || ''
  )

  const [categories, setCategories] = useState<
    { id: string; name: string; slug: string }[]
  >([])

  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = 12

  const supabase = createBrowserClient()

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true)

      let query = supabase
        .from('products')
        .select('*', { count: 'exact' })
        .in('status', ['active', 'sold_out', 'coming_soon'])

      if (search) {
        query = query.ilike('name', `%${search}%`)
      }

      if (category) {
        const { data: cat } = await supabase
          .from('categories')
          .select('id')
          .eq('slug', category)
          .single()

        if (cat) query = query.eq('category_id', cat.id)
      }

      const { data, count } = await query
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1)

      setProducts((data as Product[]) || [])
      setTotal(count || 0)
      setLoading(false)
    }

    const fetchCategories = async () => {
      const { data } = await supabase
        .from('categories')
        .select('id,name,slug')
        .eq('is_active', true)

      setCategories(data || [])
    }

    fetchProducts()
    fetchCategories()
  }, [page, search, category])

  const totalPages = Math.ceil(total / pageSize)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()

    const params = new URLSearchParams()

    if (search) params.set('search', search)
    if (category) params.set('category', category)

    params.set('page', '1')

    router.push(`/products?${params.toString()}`)
  }

  const goToPage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())

    params.set('page', newPage.toString())

    router.push(`/products?${params.toString()}`)
  }

  return (
    <div className="py-12">
      <div className="container mx-auto px-4">

        {/* Heading */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-slate-700">
            Produk terbaru yang baru ditambahkan
          </h2>
        </div>

        {/* Search */}
        <div className="flex flex-col md:flex-row gap-4 mb-10">

          <form
            onSubmit={handleSearch}
            className="flex-1 flex gap-3"
          >
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

              <Input
                placeholder="Cari produk..."
                className="pl-10 rounded-full h-12"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <Button className="rounded-full px-8">
              Cari
            </Button>
          </form>

          <select
            value={category}
            className="rounded-full border px-5 h-12"
            onChange={(e) => {
              setCategory(e.target.value)

              const params = new URLSearchParams(
                searchParams.toString()
              )

              if (e.target.value)
                params.set('category', e.target.value)
              else params.delete('category')

              params.set('page', '1')

              router.push(`/products?${params.toString()}`)
            }}
          >
            <option value="">Semua Kategori</option>

            {categories.map((cat) => (
              <option key={cat.id} value={cat.slug}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin h-8 w-8" />
          </div>
        ) : (

          <>
            {/* Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-7">

              {products.map((product) => (

                <Link
                  href={`/products/${product.slug}`}
                  key={product.id}
                >
                  <Card className="group overflow-hidden rounded-3xl border bg-white hover:shadow-xl transition-all duration-300 hover:-translate-y-2">

                    <div className="relative aspect-[16/10] overflow-hidden">

                      <img
                        src={
                          product.image_url ||
                          "/placeholder.png"
                        }
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />

                      <Badge className="absolute right-4 top-4 rounded-full bg-violet-600 text-white">
                        NEW
                      </Badge>

                    </div>

                    <CardContent className="p-5 space-y-4">

                      <Badge
                        variant="outline"
                        className="rounded-full border-violet-400 text-violet-600"
                      >
                        Digital
                      </Badge>

                      <h3 className="text-xl font-semibold group-hover:text-violet-600 transition">
                        {product.name}
                      </h3>

                      <p className="text-gray-500 line-clamp-2">
                        {product.short_description ||
                          'Belum ada deskripsi produk.'}
                      </p>

                    </CardContent>

                  </Card>
                </Link>

              ))}

            </div>

            {/* Pagination */}

            {totalPages > 1 && (

              <div className="flex justify-center items-center gap-4 mt-12">

                <Button
                  variant="outline"
                  size="icon"
                  disabled={page <= 1}
                  onClick={() => goToPage(page - 1)}
                >
                  <ChevronLeft size={18} />
                </Button>

                <span className="text-gray-500">
                  {page} / {totalPages}
                </span>

                <Button
                  variant="outline"
                  size="icon"
                  disabled={page >= totalPages}
                  onClick={() => goToPage(page + 1)}
                >
                  <ChevronRight size={18} />
                </Button>

              </div>

            )}

          </>
        )}

      </div>
    </div>
  )
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <ProductsList />
    </Suspense>
  )
}

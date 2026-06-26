import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ShoppingBag } from 'lucide-react'
import { createServerClient } from '@/lib/supabase/server'

export default async function CategoriesPage() {
  const supabase = await createServerClient()

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('name')

  // Ambil jumlah produk tiap kategori
  const { data: products } = await supabase
    .from('products')
    .select('category_id')
    .eq('status', 'active')

  const countMap = new Map<string, number>()

  ;(products || []).forEach((p: any) => {
    countMap.set(
      p.category_id,
      (countMap.get(p.category_id) || 0) + 1
    )
  })

  return (
    <div className="py-16">

      {/* Header */}
      <section className="container mx-auto px-4 mb-12">
        <div className="text-center">
          <Badge
            variant="outline"
            className="mb-4 border-violet-300 text-violet-600"
          >
            Categories
          </Badge>

          <h1 className="text-4xl md:text-5xl font-bold mb-5">
            Browse by Category
          </h1>

          <p className="text-muted-foreground max-w-2xl mx-auto">
            Explore our curated collection of digital products organized by category.
          </p>
        </div>
      </section>

      {/* Grid */}
      <section className="container mx-auto px-4">

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-7">

          {(categories || []).map((category: any) => (

            <Link
              key={category.id}
              href={`/categories/${category.slug}`}
              className="group"
            >

              <Card className="overflow-hidden rounded-3xl border bg-white hover:shadow-xl transition-all duration-300 hover:-translate-y-2">

                {/* Image */}

                <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">

                  {category.image_url ? (
                    <img
                      src={category.image_url}
                      alt={category.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag className="h-14 w-14 text-slate-300" />
                    </div>
                  )}

                  <Badge className="absolute top-3 right-3 bg-violet-600">
                    Category
                  </Badge>

                </div>

                {/* Content */}

                <CardContent className="p-5 space-y-3">

                  <Badge
                    variant="outline"
                    className="rounded-full border-violet-400 text-violet-600"
                  >
                    {countMap.get(category.id) || 0} Produk
                  </Badge>

                  <h3 className="text-xl font-semibold group-hover:text-violet-600 transition">
                    {category.name}
                  </h3>

                  <p className="text-gray-500 line-clamp-2">
                    {category.description || 'Belum ada deskripsi kategori.'}
                  </p>

                </CardContent>

              </Card>

            </Link>

          ))}

        </div>

      </section>

    </div>
  )
}

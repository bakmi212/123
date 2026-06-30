'use client'

import { useEffect, useState } from 'react'

import { createBrowserClient } from '@/lib/supabase/client'

interface Product {

  id: string

  name: string

  slug: string

  image_url: string | null

}

interface Props {

  allProducts: boolean

  selected: string[]

  onAllChange: (value: boolean) => void

  onChange: (products: string[]) => void

}

export default function ProductSelector({

  allProducts,

  selected,

  onAllChange,

  onChange,

}: Props) {

  const supabase = createBrowserClient()

  const [loading, setLoading] = useState(true)

  const [products, setProducts] = useState<Product[]>([])

  useEffect(() => {

    loadProducts()

  }, [])

  async function loadProducts() {

    const { data } = await supabase

      .from('products')

      .select('id,name,slug,image_url')

      .eq('is_active', true)

      .order('sort_order')

    setProducts(data ?? [])

    setLoading(false)

  }

  function toggleProduct(id: string) {

    if (selected.includes(id)) {

      onChange(

        selected.filter(x => x !== id)

      )

      return

    }

    onChange([

      ...selected,

      id

    ])

  }

  return (

    <div className="space-y-4">

      <div className="flex items-center gap-3">

        <input

          id="all-products"

          type="checkbox"

          checked={allProducts}

          onChange={(e)=>

            onAllChange(

              e.target.checked

            )

          }

        />

        <label

          htmlFor="all-products"

          className="text-sm font-medium"

        >

          All Products

        </label>

      </div>

      {

        !allProducts && (

          <div className="rounded-lg border">

            {

              loading

              ?

              <div className="p-4 text-sm text-muted-foreground">

                Loading products...

              </div>

              :

              products.map(product => (

                <label

                  key={product.id}

                  className="flex cursor-pointer items-center gap-3 border-b px-4 py-3 last:border-0"

                >

                  <input

                    type="checkbox"

                    checked={

                      selected.includes(product.id)

                    }

                    onChange={()=>

                      toggleProduct(

                        product.id

                      )

                    }

                  />

                  {

                    product.image_url && (

                      <img

                        src={product.image_url}

                        className="h-8 w-8 rounded object-cover"

                      />

                    )

                  }

                  <div>

                    <div className="font-medium">

                      {product.name}

                    </div>

                    <div className="text-xs text-muted-foreground">

                      {product.slug}

                    </div>

                  </div>

                </label>

              ))

            }

          </div>

        )

      }

    </div>

  )

}

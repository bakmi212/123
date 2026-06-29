export interface Product {
  id: string
  name: string
  slug: string
}

export interface UpdateItem {
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

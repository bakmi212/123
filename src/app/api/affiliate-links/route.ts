import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function generateShortCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) { try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {} }
      }
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check affiliate membership
  const { data: affiliate } = await supabase
    .from('affiliates')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!affiliate) return NextResponse.json({ error: 'Not an affiliate' }, { status: 403 })

  // Fetch all affiliate-enabled products
  const { data: products } = await supabase
    .from('products')
    .select('id, name, slug, image_url, commission_type, commission_value')
    .eq('affiliate_enabled', true)
    .eq('is_active', true)
    .order('name')

  if (!products || products.length === 0) {
    return NextResponse.json({ links: [] })
  }

  // Fetch existing links for this user
  const { data: existingLinks } = await supabase
    .from('affiliate_links')
    .select('*')
    .eq('user_id', user.id)

  const existingMap = new Map((existingLinks || []).map(l => [l.product_id, l]))

  // Generate missing links
  const missing = products.filter(p => !existingMap.has(p.id))

  for (const product of missing) {
    let code = generateShortCode()
    // Retry on collision (extremely rare)
    for (let i = 0; i < 5; i++) {
      const { error } = await supabase.from('affiliate_links').insert({
        user_id: user.id,
        product_id: product.id,
        short_code: code,
      })
      if (!error) break
      code = generateShortCode()
    }
  }

  // Re-fetch all links for this user
  const { data: allLinks } = await supabase
    .from('affiliate_links')
    .select('*')
    .eq('user_id', user.id)

  const linkMap = new Map((allLinks || []).map(l => [l.product_id, l]))

  const result = products.map(product => ({
    product_id: product.id,
    product_name: product.name,
    product_slug: product.slug,
    product_image: product.image_url,
    commission_type: product.commission_type,
    commission_value: product.commission_value,
    link: linkMap.get(product.id) || null,
  }))

  return NextResponse.json({ links: result })
}

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shortCode: string }> }
) {
  const { shortCode } = await params
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(list: { name: string; value: string; options?: any }[]) {
          try { list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
        },
      },
    }
  )

  // Look up the link
  const { data: link } = await supabase
    .from('affiliate_links')
    .select('id, product_id')
    .eq('short_code', shortCode)
    .single()

  if (!link) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Increment clicks via SECURITY DEFINER RPC (bypasses RLS)
  const { data: result } = await supabase
    .rpc('increment_affiliate_link_clicks', { p_short_code: shortCode })

  const row = Array.isArray(result) ? result[0] : result
  const productSlug = row?.product_slug

  // Redirect to product page
  const redirectUrl = productSlug
    ? new URL(`/products/${productSlug}`, request.url)
    : new URL('/', request.url)

  const response = NextResponse.redirect(redirectUrl)

  // Store affiliate link id for conversion attribution (30 days)
  response.cookies.set('aff_link', link.id, {
    maxAge: 30 * 24 * 60 * 60,
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
  })

  return response
}

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { sendNewOrderEmail, sendAdminNewOrderEmail } from '@/lib/email'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function formatIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll(cookiesToSet: { name: string; value: string; options: any }[]) { try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {} } } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { product_id, quantity = 1 } = body

  if (!product_id) return NextResponse.json({ error: 'Product ID required' }, { status: 400 })

  const { data: product } = await supabase.from('products').select('*').eq('id', product_id).single()
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

  const totalAmount = product.price * quantity

  const { data: order, error: orderError } = await supabase.from('orders').insert({
    user_id: user.id, order_number: `ORD-${Date.now()}`, total_amount: totalAmount, status: 'pending', payment_method: 'midtrans',
  }).select().single()

  if (orderError) return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })

  await supabase.from('order_items').insert({ order_id: order.id, product_id: product.id, quantity, price: product.price })

  // Send notifications and emails via service client
  const db = getServiceClient()

  // Get user email
  const { data: profile } = await db.from('profiles').select('email').eq('user_id', user.id).single()
  const userEmail = profile?.email || user.email || ''

  // Create notification - New Order
  await db.from('notifications').insert({
    user_id: user.id,
    type: 'order',
    title: 'New Order Created',
    message: `Your order ${order.order_number} for ${product.name} has been created. Total: ${formatIDR(totalAmount)}`,
    data: { order_id: order.id, product_name: product.name, amount: totalAmount },
  })

  // Send new order email to user
  if (userEmail) {
    await sendNewOrderEmail(userEmail, order.order_number, totalAmount, product.name)
  }

  // Notify all admins
  const { data: admins } = await db.from('profiles').select('user_id, email').in('role', ['admin'])
  for (const admin of admins || []) {
    await db.from('notifications').insert({
      user_id: admin.user_id,
      type: 'order',
      title: 'New Order',
      message: `New order ${order.order_number} from ${userEmail}. Total: ${formatIDR(totalAmount)}`,
      data: { order_id: order.id, amount: totalAmount },
    })
    if (admin.email) {
      await sendAdminNewOrderEmail(admin.email, order.order_number, totalAmount, userEmail)
    }
  }

  return NextResponse.json({ redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/products`, order_id: order.id })
}

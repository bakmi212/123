import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPaymentSubmittedEmail, sendAdminNewPaymentProofEmail } from '@/lib/email'

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
  const db = getServiceClient()
  const { order_id, proof_url } = await request.json()

  if (!order_id || !proof_url) {
    return NextResponse.json({ error: 'Missing order_id or proof_url' }, { status: 400 })
  }

  // Fetch order
  const { data: order, error } = await db
    .from('orders')
    .select('id, user_id, order_number, total_amount, payment_status, billing_email')
    .eq('id', order_id)
    .single()

  if (error || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  // Get user email
  const { data: profile } = await db
    .from('profiles')
    .select('email')
    .eq('user_id', order.user_id)
    .single()
  const userEmail = profile?.email || order.billing_email

  // Create notification - Payment Submitted
  await db.from('notifications').insert({
    user_id: order.user_id,
    type: 'payment',
    title: 'Payment Submitted',
    message: `Your payment for order ${order.order_number} has been submitted and is awaiting verification.`,
    data: { order_id: order.id, amount: order.total_amount },
  })

  // Send payment submitted email to user
  if (userEmail) {
    await sendPaymentSubmittedEmail(userEmail, order.order_number, order.total_amount)
  }

  // Notify all admins
  const { data: admins } = await db
    .from('profiles')
    .select('user_id, email')
    .in('role', ['admin'])

  for (const admin of admins || []) {
    await db.from('notifications').insert({
      user_id: admin.user_id,
      type: 'payment',
      title: 'New Payment Proof',
      message: `Payment proof uploaded for order ${order.order_number}. Amount: ${formatIDR(order.total_amount)}`,
      data: { order_id: order.id, amount: order.total_amount },
    })

    if (admin.email && userEmail) {
      await sendAdminNewPaymentProofEmail(admin.email, order.order_number, userEmail)
    }
  }

  return NextResponse.json({ success: true })
}

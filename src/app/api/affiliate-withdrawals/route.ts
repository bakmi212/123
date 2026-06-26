import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendWithdrawalRequestedEmail, sendAdminNewWithdrawalRequestEmail } from '@/lib/email'

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
  const body = await request.json()
  const { affiliate_id, amount, bank_name, account_number, account_holder } = body

  if (!affiliate_id || !amount || !bank_name || !account_number || !account_holder) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (amount <= 0) {
    return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 })
  }

  // Get affiliate record
  const { data: affiliate, error: affErr } = await db
    .from('affiliates')
    .select('id, user_id, total_earnings, status')
    .eq('id', affiliate_id)
    .single()

  if (affErr || !affiliate) {
    return NextResponse.json({ error: 'Affiliate not found' }, { status: 404 })
  }

  if (affiliate.status !== 'active') {
    return NextResponse.json({ error: 'Affiliate account is not active' }, { status: 403 })
  }

  // Calculate available balance: total_earnings minus sum of all non-rejected withdrawals
  const { data: existingWithdrawals } = await db
    .from('affiliate_withdrawals')
    .select('amount, status')
    .eq('affiliate_id', affiliate_id)
    .neq('status', 'rejected')

  const withdrawnAmount = (existingWithdrawals || []).reduce((sum: number, w: any) => sum + Number(w.amount), 0)
  const availableBalance = Number(affiliate.total_earnings || 0) - withdrawnAmount

  if (amount > availableBalance) {
    return NextResponse.json({
      error: `Insufficient balance. Available: ${formatIDR(availableBalance)}`,
    }, { status: 400 })
  }

  // Create withdrawal request
  const { data: withdrawal, error: insertErr } = await db
    .from('affiliate_withdrawals')
    .insert({
      affiliate_id: affiliate_id,
      amount: amount,
      bank_name: bank_name,
      account_number: account_number,
      account_holder: account_holder,
      status: 'pending',
      requested_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (insertErr) {
    console.error('[withdrawals] insert error:', insertErr.message)
    return NextResponse.json({ error: 'Failed to create withdrawal request' }, { status: 500 })
  }

  // Get affiliate user email
  const { data: affProfile } = await db
    .from('profiles')
    .select('email')
    .eq('user_id', affiliate.user_id)
    .single()

  // Send notification to affiliate
  await db.from('notifications').insert({
    user_id: affiliate.user_id,
    type: 'affiliate',
    title: 'Withdrawal Requested',
    message: `Your withdrawal request for ${formatIDR(amount)} is pending review.`,
    data: { withdrawal_id: withdrawal.id, amount },
  })

  // Send email to affiliate
  if (affProfile?.email) {
    await sendWithdrawalRequestedEmail(affProfile.email, amount, bank_name, account_number)
  }

  // Notify all admins
  const { data: admins } = await db
    .from('profiles')
    .select('user_id, email')
    .in('role', ['admin'])

  for (const admin of admins || []) {
    await db.from('notifications').insert({
      user_id: admin.user_id,
      type: 'affiliate',
      title: 'New Withdrawal Request',
      message: `A withdrawal request for ${formatIDR(amount)} requires review.`,
      data: { withdrawal_id: withdrawal.id, affiliate_id, amount },
    })

    if (admin.email && affProfile?.email) {
      await sendAdminNewWithdrawalRequestEmail(admin.email, affProfile.email, amount)
    }
  }

  return NextResponse.json({ success: true, withdrawal })
}

export async function GET(request: NextRequest) {
  const db = getServiceClient()
  const { searchParams } = new URL(request.url)
  const affiliate_id = searchParams.get('affiliate_id')

  if (!affiliate_id) {
    return NextResponse.json({ error: 'Missing affiliate_id' }, { status: 400 })
  }

  const { data: withdrawals, error } = await db
    .from('affiliate_withdrawals')
    .select('*')
    .eq('affiliate_id', affiliate_id)
    .order('requested_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ withdrawals })
}

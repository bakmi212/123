import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  sendWithdrawalApprovedEmail,
  sendWithdrawalRejectedEmail,
  sendWithdrawalPaidEmail,
} from '@/lib/email'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function formatIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
}

export async function GET(request: NextRequest) {
  const db = getServiceClient()
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')

  let query = db
    .from('affiliate_withdrawals')
    .select(`
      *,
      affiliate:affiliates(
        id,
        user_id,
        referral_code,
        status,
        profile:profiles(email, full_name)
      )
    `)
    .order('requested_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data: withdrawals, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const formatted = (withdrawals || []).map((w: any) => ({
    ...w,
    affiliate_email: w.affiliate?.profile?.[0]?.email || w.affiliate?.profile?.email || null,
    affiliate_name: w.affiliate?.profile?.[0]?.full_name || w.affiliate?.profile?.full_name || null,
  }))

  return NextResponse.json({ withdrawals: formatted })
}

export async function PATCH(request: NextRequest) {
  const db = getServiceClient()
  const body = await request.json()
  const { withdrawal_id, action, amount, admin_notes, transfer_proof_url, rejection_reason, processed_by } = body

  if (!withdrawal_id || !action) {
    return NextResponse.json({ error: 'Missing withdrawal_id or action' }, { status: 400 })
  }

  const { data: withdrawal, error: fetchErr } = await db
    .from('affiliate_withdrawals')
    .select(`
      *,
      affiliate:affiliates(
        id,
        user_id,
        total_earnings,
        profile:profiles(email, full_name)
      )
    `)
    .eq('id', withdrawal_id)
    .single()

  if (fetchErr || !withdrawal) {
    return NextResponse.json({ error: 'Withdrawal not found' }, { status: 404 })
  }

  const now = new Date().toISOString()
  const affiliateEmail = withdrawal.affiliate?.profile?.[0]?.email || withdrawal.affiliate?.profile?.email
  const affiliateUserId = withdrawal.affiliate?.user_id

  const updates: Record<string, any> = {
    updated_at: now,
    processed_by: processed_by || null,
    processed_at: now,
  }

  if (admin_notes !== undefined) updates.admin_notes = admin_notes
  if (rejection_reason !== undefined) updates.rejection_reason = rejection_reason

  if (action === 'approve') {
    updates.status = 'approved'
    updates.approved_at = now
  } else if (action === 'reject') {
    updates.status = 'rejected'
    updates.rejection_reason = rejection_reason || admin_notes || null
  } else if (action === 'edit_amount') {
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }
    updates.amount = amount
  } else if (action === 'upload_proof') {
    if (!transfer_proof_url) {
      return NextResponse.json({ error: 'Missing transfer_proof_url' }, { status: 400 })
    }
    updates.transfer_proof_url = transfer_proof_url
  } else if (action === 'mark_paid') {
    updates.status = 'paid'
    updates.paid_at = now
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const { error: updateErr } = await db
    .from('affiliate_withdrawals')
    .update(updates)
    .eq('id', withdrawal_id)

  if (updateErr) {
    console.error('[admin/withdrawals] update error:', updateErr.message)
    return NextResponse.json({ error: 'Failed to update withdrawal' }, { status: 500 })
  }

  // Send notifications and emails based on action
  if (action === 'approve' && affiliateUserId) {
    await db.from('notifications').insert({
      user_id: affiliateUserId,
      type: 'affiliate',
      title: 'Withdrawal Approved',
      message: `Your withdrawal request for ${formatIDR(Number(withdrawal.amount))} has been approved. Payment is being processed.`,
      data: { withdrawal_id, amount: withdrawal.amount },
    })
    if (affiliateEmail) {
      await sendWithdrawalApprovedEmail(affiliateEmail, Number(withdrawal.amount))
    }
  } else if (action === 'reject' && affiliateUserId) {
    await db.from('notifications').insert({
      user_id: affiliateUserId,
      type: 'affiliate',
      title: 'Withdrawal Rejected',
      message: `Your withdrawal request for ${formatIDR(Number(withdrawal.amount))} has been rejected.`,
      data: { withdrawal_id, amount: withdrawal.amount, reason: rejection_reason },
    })
    if (affiliateEmail) {
      await sendWithdrawalRejectedEmail(affiliateEmail, Number(withdrawal.amount), rejection_reason)
    }
  } else if (action === 'mark_paid' && affiliateUserId) {
    // Move amount from available balance to paid commission
    // Update affiliate's total_earnings by deducting the paid amount
    const currentEarnings = Number(withdrawal.affiliate?.total_earnings || 0)
    const paidAmount = Number(withdrawal.amount)

    await db
      .from('affiliates')
      .update({
        total_earnings: Math.max(0, currentEarnings - paidAmount),
        updated_at: now,
      })
      .eq('id', withdrawal.affiliate_id)

    // Mark related commissions as paid (proportional - mark oldest pending as paid)
    const { data: pendingCommissions } = await db
      .from('affiliate_commissions')
      .select('id, amount, status')
      .eq('affiliate_id', withdrawal.affiliate_id)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    let remaining = paidAmount
    for (const comm of pendingCommissions || []) {
      if (remaining <= 0) break
      await db
        .from('affiliate_commissions')
        .update({ status: 'paid', paid_at: now })
        .eq('id', comm.id)
      remaining -= Number(comm.amount)
    }

    // Create notification
    await db.from('notifications').insert({
      user_id: affiliateUserId,
      type: 'affiliate',
      title: 'Withdrawal Paid',
      message: `Your withdrawal of ${formatIDR(paidAmount)} has been completed. The transfer has been sent to your bank account.`,
      data: { withdrawal_id, amount: paidAmount, transfer_proof_url: withdrawal.transfer_proof_url },
    })

    // Send email
    if (affiliateEmail) {
      await sendWithdrawalPaidEmail(affiliateEmail, paidAmount, withdrawal.transfer_proof_url || undefined)
    }
  }

  // Fetch updated record
  const { data: updated } = await db
    .from('affiliate_withdrawals')
    .select('*')
    .eq('id', withdrawal_id)
    .single()

  return NextResponse.json({ success: true, withdrawal: updated })
}

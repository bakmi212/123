import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  sendPaymentApprovedEmail,
  sendPaymentRejectedEmail,
  sendOrderCompletedEmail,
  sendLicenseDeliveryEmail,
  sendAffiliateCommissionEmail,
} from '@/lib/email'

// Uses service role key — bypasses RLS for admin operations
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function generateLicenseKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const seg = () => Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `${seg()}-${seg()}-${seg()}`
}

function formatIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { order_id, payment_status, order_status } = body

  if (!order_id) {
    return NextResponse.json({ error: 'Missing order_id' }, { status: 400 })
  }

  const db = getServiceClient()

  // 1. Fetch current order with product info
  const { data: order, error: fetchErr } = await db
    .from('orders')
    .select(`
      id, user_id, total_amount, payment_status, order_status, status,
      affiliate_id, product_id, license_key, product_download_url,
      billing_name, billing_email, order_number
    `)
    .eq('id', order_id)
    .single()

  if (fetchErr || !order) {
    return NextResponse.json({ error: fetchErr?.message || 'Order not found' }, { status: 404 })
  }

  // Get user profile for email
  const { data: profile } = await db
    .from('profiles')
    .select('email, full_name')
    .eq('user_id', order.user_id)
    .single()
  const userEmail = profile?.email || order.billing_email

  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  }

  if (payment_status !== undefined) updates.payment_status = payment_status
  if (order_status !== undefined) {
    updates.order_status = order_status
    updates.status = order_status
  }

  // Auto set order to processing when payment becomes paid
  if (payment_status === 'paid' && (order.order_status === 'pending' || order.status === 'pending')) {
    updates.order_status = 'processing'
    updates.status = 'processing'
  }

  const isCompletingOrder =
    (order_status === 'completed') &&
    (order.order_status !== 'completed') &&
    (order.status !== 'completed')

  const isPaid = (payment_status === 'paid') || (order.payment_status === 'paid')
  const canFulfill = isCompletingOrder && isPaid

  // 2. Handle Completed logic before saving
  let licenseKey: string | null = order.license_key || null
  let downloadUrl: string | null = order.product_download_url || null

  // Handle payment status changes - send notifications
  if (payment_status === 'paid' && order.payment_status !== 'paid') {
    // Payment approved
    await db.from('notifications').insert({
      user_id: order.user_id,
      type: 'payment',
      title: 'Payment Approved',
      message: `Your payment for order ${order.order_number} has been approved. Amount: ${formatIDR(order.total_amount)}`,
      data: { order_id: order.id, amount: order.total_amount },
    })
    if (userEmail) {
      await sendPaymentApprovedEmail(userEmail, order.order_number, order.total_amount)
    }
  } else if (payment_status === 'rejected' && order.payment_status !== 'rejected') {
    // Payment rejected
    await db.from('notifications').insert({
      user_id: order.user_id,
      type: 'payment',
      title: 'Payment Rejected',
      message: `Your payment for order ${order.order_number} has been rejected. Please re-upload proof or contact support.`,
      data: { order_id: order.id },
    })
    if (userEmail) {
      await sendPaymentRejectedEmail(userEmail, order.order_number)
    }
  }

  if (canFulfill && order.product_id) {
    const { data: product } = await db
      .from('products')
      .select('id, name, license_enabled, enable_license, license_duration, custom_license_days, license_limit, download_url, download_file, commission_type, commission_value')
      .eq('id', order.product_id)
      .single()

    if (product) {
      // Generate license key if product has license enabled
      const hasLicense = product.license_enabled || product.enable_license
      if (hasLicense && !licenseKey) {
        // Check if license already exists for this order
        const { data: existingLicense } = await db.from('licenses')
          .select('license_key')
          .eq('user_id', order.user_id)
          .eq('product_id', order.product_id)
          .eq('order_id', order_id)
          .single()

        if (existingLicense) {
          licenseKey = existingLicense.license_key
        } else {
          licenseKey = generateLicenseKey()
          updates.license_key = licenseKey

          // Calculate expiry based on product's license_duration
          let expiresAt: string | null = null
          const now = new Date()

          if (product.license_duration) {
            switch (product.license_duration) {
              case '30_days':
                expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
                break
              case '90_days':
                expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString()
                break
              case '180_days':
                expiresAt = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString()
                break
              case '1_year':
                expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString()
                break
              case 'custom':
                if (product.custom_license_days && product.custom_license_days > 0) {
                  expiresAt = new Date(now.getTime() + product.custom_license_days * 24 * 60 * 60 * 1000).toISOString()
                }
                break
            }
          }

          // Save to licenses table with full product configuration
          if (order.user_id) {
            await db.from('licenses').insert({
              user_id: order.user_id,
              product_id: order.product_id,
              order_id: order_id,
              license_key: licenseKey,
              status: 'active',
              activated_at: now.toISOString(),
              expires_at: expiresAt,
              purchase_date: now.toISOString(),
              max_activations: product.license_limit || 1,
              activations_count: 0,
            })

            // Also save to user_licenses for backward compatibility
            await db.from('user_licenses').upsert({
              user_id: order.user_id,
              product_id: order.product_id,
              license_key: licenseKey,
              status: 'active',
              expires_at: expiresAt,
            }, { onConflict: 'user_id,product_id' })

            // Notification - License Generated
            await db.from('notifications').insert({
              user_id: order.user_id,
              type: 'license',
              title: 'License Generated',
              message: `Your license for ${product.name} has been generated.`,
              data: { license_key: licenseKey, product_id: order.product_id, product_name: product.name },
            })

            // Send license email
            if (userEmail) {
              await sendLicenseDeliveryEmail(userEmail, product.name, licenseKey, expiresAt)
            }
          }
        }
      }

      // Capture download URL
      const prodDownload = product.download_url || product.download_file
      if (prodDownload && !downloadUrl) {
        downloadUrl = prodDownload
        updates.product_download_url = downloadUrl
      }

      // Affiliate commission
      if (order.affiliate_id) {
        await processAffiliateCommission(db, order, product)
      }
    }

    // Notification - Order Completed
    await db.from('notifications').insert({
      user_id: order.user_id,
      type: 'order',
      title: 'Order Completed',
      message: `Your order ${order.order_number} has been completed. You can now access your purchases.`,
      data: { order_id: order.id },
    })

    // Notification - Download Available
    await db.from('notifications').insert({
      user_id: order.user_id,
      type: 'download',
      title: 'Download Available',
      message: `Your order ${order.order_number} is now available for download.`,
      data: { order_id: order.id },
    })

    // Send order completed email
    if (userEmail && product) {
      await sendOrderCompletedEmail(userEmail, order.order_number, product.name, order.total_amount)
    }

    updates.completed_at = new Date().toISOString()
  }

  // 3. Persist update
  const { error: updateErr } = await db
    .from('orders')
    .update(updates)
    .eq('id', order_id)

  if (updateErr) {
    console.error('[orders/update] DB update failed:', updateErr.message)
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  // 4. Return full updated order
  const { data: updated } = await db
    .from('orders')
    .select('*')
    .eq('id', order_id)
    .single()

  return NextResponse.json({
    success: true,
    order: updated,
    license_key: licenseKey,
    download_url: downloadUrl,
  })
}

async function processAffiliateCommission(
  db: ReturnType<typeof createClient>,
  order: any,
  product: any
) {
  try {
    // Check if commission already recorded (UNIQUE order_id)
    const { data: existing } = await db
      .from('affiliate_commissions')
      .select('id')
      .eq('order_id', order.id)
      .single()

    if (existing) return // Already processed — no duplicates

    // Get affiliate
    const { data: affiliate } = await db
      .from('affiliates')
      .select('id, user_id, commission_rate, commission_type, total_earnings, total_referrals')
      .eq('id', order.affiliate_id)
      .single()

    if (!affiliate) return

    // Calculate commission: product-level takes priority over affiliate-level
    let commissionAmount = 0
    const commType = product.commission_type || affiliate.commission_type || 'percentage'
    const commValue = product.commission_value ?? affiliate.commission_rate ?? 0

    if (commType === 'percentage') {
      commissionAmount = Number(order.total_amount) * (Number(commValue) / 100)
    } else {
      commissionAmount = Number(commValue)
    }

    // Insert commission record
    const { error: commErr } = await db
      .from('affiliate_commissions')
      .insert({
        affiliate_id: affiliate.id,
        order_id: order.id,
        product_id: order.product_id,
        commission_type: commType,
        commission_rate: commValue,
        amount: commissionAmount,
        status: 'pending',
      })

    if (commErr) {
      // Unique violation = already exists, skip
      if (commErr.code === '23505') return
      console.error('[affiliate_commission] insert error:', commErr.message)
      return
    }

    // Update affiliate totals
    await db
      .from('affiliates')
      .update({
        total_earnings: Number(affiliate.total_earnings || 0) + commissionAmount,
        total_referrals: Number(affiliate.total_referrals || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', affiliate.id)

    // Get affiliate email for notification
    const { data: affProfile } = await db
      .from('profiles')
      .select('email')
      .eq('user_id', affiliate.user_id)
      .single()

    if (affProfile?.email) {
      // Create notification for affiliate
      await db.from('notifications').insert({
        user_id: affiliate.user_id,
        type: 'affiliate',
        title: 'New Commission Earned!',
        message: `You earned ${formatIDR(commissionAmount)} from order ${order.order_number}`,
        data: { order_id: order.id, commission_amount: commissionAmount },
      })

      // Send email
      await sendAffiliateCommissionEmail(affProfile.email, product.name, commissionAmount, order.total_amount)
    }

    // Update affiliate_links conversion + earnings for this product
    const { data: affLink } = await db
      .from('affiliate_links')
      .select('id, conversions, earnings')
      .eq('user_id', affiliate.user_id)
      .eq('product_id', order.product_id)
      .single()

    if (affLink) {
      await db
        .from('affiliate_links')
        .update({
          conversions: Number(affLink.conversions || 0) + 1,
          earnings: Number(affLink.earnings || 0) + commissionAmount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', affLink.id)
    }
  } catch (e) {
    console.error('[affiliate_commission] unexpected error:', e)
  }
}

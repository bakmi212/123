import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  sendPaymentApprovedEmail,
  sendLicenseDeliveryEmail,
  sendOrderCompletedEmail,
  sendAffiliateCommissionEmail,
  sendPaymentSubmittedEmail,
} from '@/lib/email'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  const supabase = getServiceClient()
  const body = await request.json()
  const { order_id, status, transaction_id, payment_method, amount } = body

  if (!order_id) return NextResponse.json({ error: 'Missing order_id' }, { status: 400 })

  // Find the order with affiliate info
  const { data: order } = await supabase
    .from('orders')
    .select(`
      *,
      order_items(product_id, price, quantity, product:products(name)),
      affiliate:affiliates(
        id,
        user_id,
        referral_code,
        commission_rate,
        commission_type,
        status,
        profiles(full_name, email)
      )
    `)
    .eq('id', order_id)
    .single()
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  // Get user email
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('user_id', order.user_id)
    .single()
  const userEmail = profile?.email || order.billing_email

  if (status === 'success' || status === 'paid' || status === 'settlement') {
    // Update order status
    await supabase.from('orders').update({
      payment_status: 'paid',
      payment_id: transaction_id,
      payment_method: payment_method || order.payment_method,
      updated_at: new Date().toISOString(),
    }).eq('id', order_id)

    // Create transaction record
    await supabase.from('transactions').insert({
      user_id: order.user_id,
      order_id: order.id,
      amount: amount || order.total_amount,
      payment_method: payment_method || order.payment_method,
      status: 'completed',
      transaction_id: transaction_id || `TXN-${Date.now()}`,
    })

    // Create notification - Payment Approved
    await supabase.from('notifications').insert({
      user_id: order.user_id,
      type: 'payment',
      title: 'Payment Approved',
      message: `Your payment for order ${order.order_number} has been approved. Amount: ${formatIDR(order.total_amount)}`,
      data: { order_id: order.id, amount: order.total_amount },
    })

    // Send payment approved email
    if (userEmail) {
      await sendPaymentApprovedEmail(userEmail, order.order_number, order.total_amount)
    }

    // Handle affiliate commission
    if (order.affiliate_id && order.affiliate) {
      const affiliate = order.affiliate

      // Calculate commission
      let commission = 0
      const commissionRate = affiliate.commission_rate || 0.10
      const commissionType = affiliate.commission_type || 'percentage'

      if (commissionType === 'percentage') {
        commission = order.total_amount * commissionRate
      } else {
        commission = commissionRate
      }

      // Update order with commission
      await supabase.from('orders').update({
        commission_amount: commission,
        commission_status: 'pending'
      }).eq('id', order_id)

      // Create or update referral
      const { data: existingRef } = await supabase
        .from('referrals')
        .select('id')
        .eq('affiliate_id', order.affiliate_id)
        .eq('referred_user_id', order.user_id)
        .single()

      if (!existingRef) {
        await supabase.from('referrals').insert({
          affiliate_id: order.affiliate_id,
          referred_user_id: order.user_id,
          referral_code: affiliate.referral_code,
          status: 'converted',
          commission_amount: commission,
          commission_status: 'pending',
          click_id: order.click_id,
          source: order.referral_source,
          url: order.referral_url
        })
      } else {
        await supabase.from('referrals').update({
          status: 'converted',
          commission_amount: commission,
          commission_status: 'pending'
        }).eq('id', existingRef.id)
      }

      // Update affiliate totals
      await supabase.from('affiliates').update({
        total_referrals: (affiliate.total_referrals || 0) + 1,
        total_earnings: (affiliate.total_earnings || 0) + commission
      }).eq('id', order.affiliate_id)

      // Get affiliate user email for notification
      const { data: affProfile } = await supabase
        .from('profiles')
        .select('email')
        .eq('user_id', affiliate.user_id)
        .single()

      if (affProfile?.email) {
        // Create notification for affiliate
        await supabase.from('notifications').insert({
          user_id: affiliate.user_id,
          type: 'affiliate',
          title: 'New Commission Earned!',
          message: `You earned ${formatIDR(commission)} from order ${order.order_number}`,
          data: { order_id: order.id, commission_amount: commission },
        })

        // Send email
        const productName = order.order_items?.[0]?.product?.name || 'Product'
        await sendAffiliateCommissionEmail(affProfile.email, productName, commission, order.total_amount)
      }

      // Update affiliate_links conversions and earnings per product
      for (const item of order.order_items || []) {
        const { data: prod } = await supabase
          .from('products')
          .select('commission_type, commission_value')
          .eq('id', item.product_id)
          .single()

        let productCommission = 0
        if (prod?.commission_type === 'percentage' && prod?.commission_value) {
          productCommission = (item.price * item.quantity) * (prod.commission_value / 100)
        } else if (prod?.commission_value) {
          productCommission = prod.commission_value
        }

        const { data: affLink } = await supabase
          .from('affiliate_links')
          .select('id, conversions, earnings')
          .eq('user_id', affiliate.user_id)
          .eq('product_id', item.product_id)
          .single()

        if (affLink) {
          await supabase.from('affiliate_links').update({
            conversions: affLink.conversions + 1,
            earnings: affLink.earnings + productCommission,
            updated_at: new Date().toISOString(),
          }).eq('id', affLink.id)
        }
      }
    }

    // Grant user products
    for (const item of order.order_items || []) {
      await supabase.from('user_products').insert({
        user_id: order.user_id,
        product_id: item.product_id,
      }).then(() => {}) // ignore duplicates

      // Generate license if enabled
      const { data: product } = await supabase.from('products').select('license_enabled, enable_license, license_type, license_duration, custom_license_days, license_limit, name').eq('id', item.product_id).single()
      const hasLicense = product?.license_enabled || product?.enable_license
      if (hasLicense) {
        // Check if license already exists
        const { data: existingLicense } = await supabase.from('licenses')
          .select('id')
          .eq('user_id', order.user_id)
          .eq('product_id', item.product_id)
          .single()

        if (!existingLicense) {
          const licenseKey = generateLicenseKey()
          let expiresAt = null
          const now = new Date()

          // Calculate expiry based on product's license_duration
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

          // Insert into licenses table with product configuration
          await supabase.from('licenses').insert({
            user_id: order.user_id,
            product_id: item.product_id,
            order_id: order.id,
            license_key: licenseKey,
            status: 'active',
            activated_at: now.toISOString(),
            expires_at: expiresAt,
            purchase_date: now.toISOString(),
            max_activations: product.license_limit || 1,
            activations_count: 0,
          })

          // Also insert into user_licenses for backward compatibility
          await supabase.from('user_licenses').insert({
            user_id: order.user_id,
            product_id: item.product_id,
            license_key: licenseKey,
            status: 'active',
            expires_at: expiresAt,
          }).then(() => {})

          // Update order with license key
          await supabase.from('orders').update({ license_key: licenseKey }).eq('id', order.id)

          // Create notification - License Generated
          await supabase.from('notifications').insert({
            user_id: order.user_id,
            type: 'license',
            title: 'License Generated',
            message: `Your license for ${product.name} has been generated.`,
            data: { license_key: licenseKey, product_id: item.product_id },
          })

          // Send license email
          if (userEmail) {
            await sendLicenseDeliveryEmail(userEmail, product.name, licenseKey, expiresAt)
          }
        }
      }
    }

    // Create notification - Download Available
    await supabase.from('notifications').insert({
      user_id: order.user_id,
      type: 'download',
      title: 'Download Available',
      message: `Your order ${order.order_number} is now available for download.`,
      data: { order_id: order.id },
    })

    // Create notification - Order Completed
    await supabase.from('notifications').insert({
      user_id: order.user_id,
      type: 'order',
      title: 'Order Completed',
      message: `Your order ${order.order_number} has been completed. You can now access your purchases.`,
      data: { order_id: order.id },
    })

    // Send order completed email
    if (userEmail) {
      const productName = order.order_items?.[0]?.product?.name || 'Product'
      await sendOrderCompletedEmail(userEmail, order.order_number, productName, order.total_amount)
    }

    // Create activity log
    await supabase.from('activity_logs').insert({
      user_id: order.user_id,
      action: 'order_paid',
      details: { order_id: order.id, amount: order.total_amount },
    })
  } else if (status === 'pending' || status === 'pending_verification') {
    // Payment submitted - awaiting verification
    await supabase.from('orders').update({
      payment_status: 'pending_verification',
      updated_at: new Date().toISOString(),
    }).eq('id', order_id)

    // Create notification
    await supabase.from('notifications').insert({
      user_id: order.user_id,
      type: 'payment',
      title: 'Payment Submitted',
      message: `Your payment for order ${order.order_number} has been submitted and is awaiting verification.`,
      data: { order_id: order.id },
    })

    if (userEmail) {
      await sendPaymentSubmittedEmail(userEmail, order.order_number, order.total_amount)
    }
  }

  return NextResponse.json({ success: true })
}

function generateLicenseKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const segments = 4
  const segmentLength = 4
  return Array.from({ length: segments }, () =>
    Array.from({ length: segmentLength }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  ).join('-')
}

function formatIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
}

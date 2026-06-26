// Email utility using Resend API
// Handles: Registration, Order, Payment, License, Download, Affiliate notifications

interface EmailPayload {
  to: string | string[]
  subject: string
  html: string
}

interface EmailLog {
  recipient: string
  subject: string
  status: 'success' | 'failed'
  error_message: string | null
  created_at: string
}

// Log email to database for tracking
async function logEmail(log: EmailLog) {
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    await supabase.from('email_logs').insert({
      recipient: log.recipient,
      subject: log.subject,
      status: log.status,
      error_message: log.error_message,
      created_at: log.created_at,
    })
  } catch (e) {
    console.error('[Email] Failed to log email:', e)
  }
}

// Send email via Resend API
export async function sendEmail(payload: EmailPayload): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  const recipients = Array.isArray(payload.to) ? payload.to : [payload.to]
  const recipientStr = recipients.join(', ')

  if (!apiKey) {
    console.warn('[Email] RESEND_API_KEY not configured - skipping email')
    await logEmail({
      recipient: recipientStr,
      subject: payload.subject,
      status: 'failed',
      error_message: 'RESEND_API_KEY not configured',
      created_at: new Date().toISOString(),
    })
    return { success: false, error: 'RESEND_API_KEY not configured' }
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.NEXT_PUBLIC_APP_NAME || 'SaaS Platform' + ' <noreply@' + (process.env.EMAIL_DOMAIN || 'resend.dev') + '>',
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      const errorMsg = data.message || JSON.stringify(data)
      console.error('[Email] Failed to send:', errorMsg)
      await logEmail({
        recipient: recipientStr,
        subject: payload.subject,
        status: 'failed',
        error_message: errorMsg,
        created_at: new Date().toISOString(),
      })
      return { success: false, error: errorMsg }
    }

    console.log('[Email] Sent successfully to:', recipientStr)
    await logEmail({
      recipient: recipientStr,
      subject: payload.subject,
      status: 'success',
      error_message: null,
      created_at: new Date().toISOString(),
    })
    return { success: true }
  } catch (error: any) {
    const errorMsg = error.message || 'Unknown error'
    console.error('[Email] Error:', errorMsg)
    await logEmail({
      recipient: recipientStr,
      subject: payload.subject,
      status: 'failed',
      error_message: errorMsg,
      created_at: new Date().toISOString(),
    })
    return { success: false, error: errorMsg }
  }
}

// Email templates
function formatIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
}

export async function sendRegistrationEmail(email: string, name: string) {
  return sendEmail({
    to: email,
    subject: 'Welcome to ' + (process.env.NEXT_PUBLIC_APP_NAME || 'SaaS Platform'),
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1e293b;">Welcome, ${name}!</h1>
        <p style="color: #64748b;">Thank you for registering. Your account has been created successfully.</p>
        <p style="color: #64748b;">You can now log in and start exploring our products.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 16px;">Go to Dashboard</a>
      </div>
    `,
  })
}

export async function sendEmailVerification(email: string, verificationUrl: string) {
  return sendEmail({
    to: email,
    subject: 'Verify Your Email Address',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1e293b;">Verify Your Email</h1>
        <p style="color: #64748b;">Please click the link below to verify your email address.</p>
        <a href="${verificationUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 16px;">Verify Email</a>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 16px;">This link will expire in 24 hours.</p>
      </div>
    `,
  })
}

export async function sendNewOrderEmail(email: string, orderNumber: string, total: number, productName: string) {
  return sendEmail({
    to: email,
    subject: 'Order Received - ' + orderNumber,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1e293b;">Order Received</h1>
        <p style="color: #64748b;">Your order has been received and is pending payment.</p>
        <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0; color: #475569;"><strong>Order:</strong> ${orderNumber}</p>
          <p style="margin: 8px 0 0; color: #475569;"><strong>Product:</strong> ${productName}</p>
          <p style="margin: 8px 0 0; color: #475569;"><strong>Total:</strong> ${formatIDR(total)}</p>
        </div>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/orders" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">View Order</a>
      </div>
    `,
  })
}

export async function sendPaymentSubmittedEmail(email: string, orderNumber: string, total: number) {
  return sendEmail({
    to: email,
    subject: 'Payment Submitted - ' + orderNumber,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1e293b;">Payment Submitted</h1>
        <p style="color: #64748b;">Your payment proof has been submitted and is awaiting verification.</p>
        <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0; color: #92400e;"><strong>Order:</strong> ${orderNumber}</p>
          <p style="margin: 8px 0 0; color: #92400e;"><strong>Total:</strong> ${formatIDR(total)}</p>
          <p style="margin: 8px 0 0; color: #92400e;"><strong>Status:</strong> Pending Verification</p>
        </div>
        <p style="color: #64748b;">We will review your payment and notify you once it's approved.</p>
      </div>
    `,
  })
}

export async function sendPaymentApprovedEmail(email: string, orderNumber: string, total: number) {
  return sendEmail({
    to: email,
    subject: 'Payment Approved - ' + orderNumber,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1e293b;">Payment Approved</h1>
        <div style="background: #d1fae5; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0; color: #065f46;"><strong>Order:</strong> ${orderNumber}</p>
          <p style="margin: 8px 0 0; color: #065f46;"><strong>Total:</strong> ${formatIDR(total)}</p>
          <p style="margin: 8px 0 0; color: #065f46;"><strong>Status:</strong> Payment Approved</p>
        </div>
        <p style="color: #64748b;">Your order is now being processed. You will receive another email when it's completed.</p>
      </div>
    `,
  })
}

export async function sendPaymentRejectedEmail(email: string, orderNumber: string, reason?: string) {
  return sendEmail({
    to: email,
    subject: 'Payment Rejected - ' + orderNumber,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #dc2626;">Payment Rejected</h1>
        <div style="background: #fee2e2; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0; color: #991b1b;"><strong>Order:</strong> ${orderNumber}</p>
          <p style="margin: 8px 0 0; color: #991b1b;"><strong>Status:</strong> Payment Rejected</p>
          ${reason ? `<p style="margin: 8px 0 0; color: #991b1b;"><strong>Reason:</strong> ${reason}</p>` : ''}
        </div>
        <p style="color: #64748b;">Please re-upload your payment proof or contact support.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/orders" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">View Orders</a>
      </div>
    `,
  })
}

export async function sendOrderCompletedEmail(email: string, orderNumber: string, productName: string, total: number) {
  return sendEmail({
    to: email,
    subject: 'Order Completed - ' + orderNumber,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #059669;">Order Completed!</h1>
        <div style="background: #d1fae5; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0; color: #065f46;"><strong>Order:</strong> ${orderNumber}</p>
          <p style="margin: 8px 0 0; color: #065f46;"><strong>Product:</strong> ${productName}</p>
          <p style="margin: 8px 0 0; color: #065f46;"><strong>Total:</strong> ${formatIDR(total)}</p>
        </div>
        <p style="color: #64748b;">Your order has been completed. You can now access your product.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/downloads" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Access Downloads</a>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/licenses" style="display: inline-block; background: #9333ea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-left: 8px;">View Licenses</a>
      </div>
    `,
  })
}

export async function sendLicenseDeliveryEmail(email: string, productName: string, licenseKey: string, expiresAt?: string | null) {
  return sendEmail({
    to: email,
    subject: 'Your License Key - ' + productName,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #7c3aed;">Your License Key</h1>
        <p style="color: #64748b;">Here is your license key for <strong>${productName}</strong>:</p>
        <div style="background: #f5f3ff; border: 2px dashed #7c3aed; padding: 20px; border-radius: 8px; margin: 16px 0; text-align: center;">
          <code style="font-size: 24px; font-family: monospace; color: #5b21b6;">${licenseKey}</code>
        </div>
        ${expiresAt ? `<p style="color: #64748b;"><strong>Expires:</strong> ${new Date(expiresAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>` : '<p style="color: #64748b;"><strong>Validity:</strong> Lifetime</p>'}
        <p style="color: #64748b; margin-top: 16px;">Copy this license key and use it to activate your product.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/licenses" style="display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 16px;">Manage Licenses</a>
      </div>
    `,
  })
}

export async function sendDownloadDeliveryEmail(email: string, productName: string, downloadUrl: string) {
  return sendEmail({
    to: email,
    subject: 'Download Ready - ' + productName,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #ea580c;">Your Download is Ready</h1>
        <p style="color: #64748b;"><strong>${productName}</strong> is available for download.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/downloads" style="display: inline-block; background: #ea580c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 16px;">Access Downloads</a>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 16px;">The download link is available in your dashboard.</p>
      </div>
    `,
  })
}

export async function sendAffiliateCommissionEmail(email: string, productName: string, commissionAmount: number, orderTotal: number) {
  return sendEmail({
    to: email,
    subject: 'New Commission Earned!',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #059669;">Commission Earned!</h1>
        <p style="color: #64748b;">Congratulations! You earned a commission from a referral.</p>
        <div style="background: #d1fae5; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0; color: #065f46;"><strong>Product:</strong> ${productName}</p>
          <p style="margin: 8px 0 0; color: #065f46;"><strong>Order Total:</strong> ${formatIDR(orderTotal)}</p>
          <p style="margin: 8px 0 0; color: #065f46; font-size: 20px;"><strong>Your Commission:</strong> ${formatIDR(commissionAmount)}</p>
        </div>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/affiliate" style="display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">View Dashboard</a>
      </div>
    `,
  })
}

export async function sendAffiliateActivatedEmail(email: string, referralCode: string) {
  return sendEmail({
    to: email,
    subject: 'Affiliate Account Activated',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #059669;">Affiliate Account Activated!</h1>
        <p style="color: #64748b;">Your affiliate account has been activated. You can now start earning commissions by promoting products.</p>
        <div style="background: #d1fae5; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0; color: #065f46;"><strong>Your Referral Code:</strong> ${referralCode}</p>
        </div>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/affiliate" style="display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Go to Affiliate Dashboard</a>
      </div>
    `,
  })
}

export async function sendWithdrawalRequestedEmail(email: string, amount: number, bankName: string, accountNumber: string) {
  return sendEmail({
    to: email,
    subject: 'Withdrawal Request Received',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1e293b;">Withdrawal Request Received</h1>
        <p style="color: #64748b;">Your withdrawal request has been received and is pending review.</p>
        <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0; color: #475569;"><strong>Amount:</strong> ${formatIDR(amount)}</p>
          <p style="margin: 8px 0 0; color: #475569;"><strong>Bank:</strong> ${bankName}</p>
          <p style="margin: 8px 0 0; color: #475569;"><strong>Account:</strong> ${accountNumber}</p>
          <p style="margin: 8px 0 0; color: #475569;"><strong>Status:</strong> Pending</p>
        </div>
        <p style="color: #64748b;">We will process your request and notify you once it's approved.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/affiliate" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">View Affiliate Dashboard</a>
      </div>
    `,
  })
}

export async function sendWithdrawalApprovedEmail(email: string, amount: number) {
  return sendEmail({
    to: email,
    subject: 'Withdrawal Approved',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #059669;">Withdrawal Approved</h1>
        <p style="color: #64748b;">Your withdrawal request has been approved. Payment is being processed.</p>
        <div style="background: #d1fae5; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0; color: #065f46;"><strong>Amount:</strong> ${formatIDR(amount)}</p>
          <p style="margin: 8px 0 0; color: #065f46;"><strong>Status:</strong> Approved - Processing Payment</p>
        </div>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/affiliate" style="display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">View Affiliate Dashboard</a>
      </div>
    `,
  })
}

export async function sendWithdrawalRejectedEmail(email: string, amount: number, reason?: string) {
  return sendEmail({
    to: email,
    subject: 'Withdrawal Rejected',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #dc2626;">Withdrawal Rejected</h1>
        <p style="color: #64748b;">Your withdrawal request has been rejected.</p>
        <div style="background: #fee2e2; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0; color: #991b1b;"><strong>Amount:</strong> ${formatIDR(amount)}</p>
          <p style="margin: 8px 0 0; color: #991b1b;"><strong>Status:</strong> Rejected</p>
          ${reason ? `<p style="margin: 8px 0 0; color: #991b1b;"><strong>Reason:</strong> ${reason}</p>` : ''}
        </div>
        <p style="color: #64748b;">Please contact support if you have questions.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/affiliate" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">View Affiliate Dashboard</a>
      </div>
    `,
  })
}

export async function sendWithdrawalPaidEmail(email: string, amount: number, transferProofUrl?: string) {
  return sendEmail({
    to: email,
    subject: 'Withdrawal Paid - Transfer Completed',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #059669;">Withdrawal Paid!</h1>
        <p style="color: #64748b;">Your withdrawal has been completed. The transfer has been sent to your bank account.</p>
        <div style="background: #d1fae5; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0; color: #065f46;"><strong>Amount:</strong> ${formatIDR(amount)}</p>
          <p style="margin: 8px 0 0; color: #065f46;"><strong>Status:</strong> Paid</p>
        </div>
        ${transferProofUrl ? `<p style="color: #64748b;"><a href="${transferProofUrl}" style="color: #2563eb;">View Transfer Proof</a></p>` : ''}
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/affiliate" style="display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">View Affiliate Dashboard</a>
      </div>
    `,
  })
}

export async function sendAdminNewOrderEmail(email: string, orderNumber: string, total: number, customerEmail: string) {
  return sendEmail({
    to: email,
    subject: '[Admin] New Order - ' + orderNumber,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1e293b;">New Order Received</h1>
        <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0; color: #475569;"><strong>Order:</strong> ${orderNumber}</p>
          <p style="margin: 8px 0 0; color: #475569;"><strong>Customer:</strong> ${customerEmail}</p>
          <p style="margin: 8px 0 0; color: #475569;"><strong>Total:</strong> ${formatIDR(total)}</p>
        </div>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/orders" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">View Orders</a>
      </div>
    `,
  })
}

export async function sendAdminNewPaymentProofEmail(email: string, orderNumber: string, customerEmail: string) {
  return sendEmail({
    to: email,
    subject: '[Admin] New Payment Proof - ' + orderNumber,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1e293b;">New Payment Proof Uploaded</h1>
        <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0; color: #92400e;"><strong>Order:</strong> ${orderNumber}</p>
          <p style="margin: 8px 0 0; color: #92400e;"><strong>Customer:</strong> ${customerEmail}</p>
        </div>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/payments" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Review Payment</a>
      </div>
    `,
  })
}

export async function sendAdminNewAffiliateEmail(email: string, affiliateEmail: string, referralCode: string) {
  return sendEmail({
    to: email,
    subject: '[Admin] New Affiliate Registration',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1e293b;">New Affiliate Registration</h1>
        <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0; color: #475569;"><strong>Affiliate:</strong> ${affiliateEmail}</p>
          <p style="margin: 8px 0 0; color: #475569;"><strong>Referral Code:</strong> ${referralCode}</p>
        </div>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/affiliates" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">View Affiliates</a>
      </div>
    `,
  })
}

export async function sendAdminNewWithdrawalRequestEmail(email: string, affiliateEmail: string, amount: number) {
  return sendEmail({
    to: email,
    subject: '[Admin] New Withdrawal Request',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1e293b;">New Withdrawal Request</h1>
        <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0; color: #475569;"><strong>Affiliate:</strong> ${affiliateEmail}</p>
          <p style="margin: 8px 0 0; color: #475569;"><strong>Amount:</strong> ${formatIDR(amount)}</p>
        </div>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/affiliates" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Review Withdrawals</a>
      </div>
    `,
  })
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendRegistrationEmail, sendEmailVerification, sendAdminNewAffiliateEmail } from '@/lib/email'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  const db = getServiceClient()
  const { user_id, email, full_name, is_admin } = await request.json()

  if (!user_id || !email) {
    return NextResponse.json({ error: 'Missing user_id or email' }, { status: 400 })
  }

  // Send registration notification
  await db.from('notifications').insert({
    user_id,
    type: 'system',
    title: 'Welcome to the platform!',
    message: `Hello ${full_name || email}, your account has been created successfully. Start exploring our products today.`,
    data: { email },
  })

  // Send registration email
  await sendRegistrationEmail(email, full_name || email)

  // Send email verification notification
  await db.from('notifications').insert({
    user_id,
    type: 'system',
    title: 'Verify Your Email',
    message: 'Please verify your email address to secure your account.',
    data: {},
  })

  await sendEmailVerification(email, `${process.env.NEXT_PUBLIC_APP_URL}/auth/login`)

  // Notify admins of new registration
  if (!is_admin) {
    const { data: admins } = await db
      .from('profiles')
      .select('user_id, email')
      .in('role', ['admin'])

    for (const admin of admins || []) {
      await db.from('notifications').insert({
        user_id: admin.user_id,
        type: 'system',
        title: 'New User Registration',
        message: `A new user has registered: ${email}`,
        data: { new_user_id: user_id, email },
      })
    }
  }

  return NextResponse.json({ success: true })
}

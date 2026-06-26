'use client'

import { useState, Suspense } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { createBrowserClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo')
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({ fullName: '', email: '', password: '' })

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.password.length < 6) { toast.error('Password must be at least 6 characters'); return }
    setLoading(true)
    const supabase = createBrowserClient()

    const { data, error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: { data: { full_name: formData.fullName }, emailRedirectTo: `${window.location.origin}/auth/callback` },
    })

    if (error) { toast.error(error.message); setLoading(false); return }

    if (data.user) {
      const { data: roleData } = await supabase.from('roles').select('id').eq('name', 'customer').single()
      const isAdmin = formData.email.toLowerCase() === 'admin@gmail.com'
      let roleId = roleData?.id

      if (isAdmin) {
        const { data: adminRole } = await supabase.from('roles').select('id').eq('name', 'admin').single()
        roleId = adminRole?.id
      }

      if (!roleId) {
        const { data: allRoles } = await supabase.from('roles').select('id, name')
        roleId = allRoles?.find(r => r.name === (isAdmin ? 'admin' : 'customer'))?.id || allRoles?.[0]?.id
      }

      await supabase.from('profiles').insert({
        user_id: data.user.id,
        email: formData.email,
        full_name: formData.fullName,
      })

      await supabase.from('user_roles').insert({
        user_id: data.user.id,
        role_id: roleId,
      })

      // Send registration email + notification via API
      try {
        await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: data.user.id,
            email: formData.email,
            full_name: formData.fullName,
            is_admin: isAdmin,
          }),
        })
      } catch (e) {
        console.error('Registration email failed:', e)
      }

      if (data.session) {
        toast.success('Account created! Redirecting...')
        if (redirectTo) {
          router.push(decodeURIComponent(redirectTo))
        } else {
          router.push('/dashboard')
        }
      } else {
        toast.success('Account created! Please check your email to verify.')
        if (redirectTo) {
          router.push(`/auth/login?redirectTo=${redirectTo}`)
        } else {
          router.push('/auth/login')
        }
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-center mb-4">
            <Image
              src="/logo.png"
              alt="Lumintusuite"
              width={72}
              height={72}
              priority
              className="object-contain"
            />
          </div>
        
          <CardTitle className="text-3xl font-bold">
            Create an account
          </CardTitle>
        
          <CardDescription className="text-base">
            Enter your details to create your account.
          </CardDescription>
        
        </CardHeader>
        <form onSubmit={handleRegister}>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label htmlFor="fullName">Full Name</Label><Input id="fullName" type="text" placeholder="John Doe" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} required disabled={loading} /></div>
            <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" placeholder="name@example.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required disabled={loading} /></div>
            <div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" type="password" placeholder="Create a password (min 6 characters)" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required disabled={loading} /></div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create Account</Button>
            <p className="text-sm text-muted-foreground text-center">Already have an account? <Link href={redirectTo ? `/auth/login?redirectTo=${redirectTo}` : '/auth/login'} className="text-primary hover:underline font-medium">Sign in</Link></p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <RegisterForm />
    </Suspense>
  )
}
